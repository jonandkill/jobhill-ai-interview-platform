import { COOKIE_NAME, SESSION_MAX_AGE_MS } from "@shared/const";
import { parse as parseCookieHeader } from "cookie";
import { randomBytes, timingSafeEqual } from "crypto";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";
import { sdk } from "./sdk";

const OAUTH_STATE_COOKIE = "oauth_state";
const OAUTH_STATE_MAX_AGE_MS = 10 * 60 * 1000;

type OAuthState = {
  redirectUri: string;
  returnTo: string;
  nonce: string;
  issuedAt: number;
};

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

function safeReturnPath(value: string | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\r\n]/.test(value)) {
    return "/interview";
  }
  return value;
}

function publicOrigin(req: Request): string {
  if (ENV.appBaseUrl) return new URL(ENV.appBaseUrl).origin;
  if (ENV.isProduction) {
    throw new Error("APP_BASE_URL must be configured in production");
  }
  return `${req.protocol}://${req.get("host")}`;
}

function encodeState(state: OAuthState): string {
  return Buffer.from(JSON.stringify(state), "utf8").toString("base64url");
}

function decodeState(value: string): OAuthState {
  const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as OAuthState;
  if (
    !parsed ||
    typeof parsed.redirectUri !== "string" ||
    typeof parsed.returnTo !== "string" ||
    typeof parsed.nonce !== "string" ||
    typeof parsed.issuedAt !== "number"
  ) {
    throw new Error("Invalid OAuth state");
  }
  return parsed;
}

function stateMatches(expected: string | undefined, received: string): boolean {
  if (!expected || expected.length !== received.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/start", (req: Request, res: Response) => {
    if (!ENV.oAuthPortalUrl || !ENV.appId) {
      res.status(503).json({ error: "로그인 서비스 설정이 필요합니다." });
      return;
    }

    const redirectUri = `${publicOrigin(req)}/api/oauth/callback`;
    const state = encodeState({
      redirectUri,
      returnTo: safeReturnPath(getQueryParam(req, "returnTo")),
      nonce: randomBytes(24).toString("base64url"),
      issuedAt: Date.now(),
    });
    const cookieOptions = getSessionCookieOptions(req);
    res.cookie(OAUTH_STATE_COOKIE, state, {
      ...cookieOptions,
      path: "/api/oauth",
      maxAge: OAUTH_STATE_MAX_AGE_MS,
    });

    const portalUrl = new URL("app-auth", `${ENV.oAuthPortalUrl.replace(/\/+$/, "")}/`);
    portalUrl.searchParams.set("appId", ENV.appId);
    portalUrl.searchParams.set("redirectUri", redirectUri);
    portalUrl.searchParams.set("state", state);
    portalUrl.searchParams.set("type", "signIn");
    res.redirect(302, portalUrl.toString());
  });

  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    const cookies = parseCookieHeader(req.headers.cookie || "");

    if (!code || !state || !stateMatches(cookies[OAUTH_STATE_COOKIE], state)) {
      res.status(400).json({ error: "유효하지 않거나 만료된 로그인 요청입니다." });
      return;
    }

    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(OAUTH_STATE_COOKIE, { ...cookieOptions, path: "/api/oauth" });

    try {
      const decodedState = decodeState(state);
      if (Date.now() - decodedState.issuedAt > OAUTH_STATE_MAX_AGE_MS) {
        res.status(400).json({ error: "로그인 요청이 만료되었습니다." });
        return;
      }

      const expectedRedirectUri = `${publicOrigin(req)}/api/oauth/callback`;
      if (decodedState.redirectUri !== expectedRedirectUri) {
        res.status(400).json({ error: "로그인 리디렉션 주소가 일치하지 않습니다." });
        return;
      }

      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || userInfo.openId,
        expiresInMs: SESSION_MAX_AGE_MS,
      });

      res.cookie(COOKIE_NAME, sessionToken, {
        ...getSessionCookieOptions(req),
        maxAge: SESSION_MAX_AGE_MS,
      });
      res.redirect(302, safeReturnPath(decodedState.returnTo));
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}
