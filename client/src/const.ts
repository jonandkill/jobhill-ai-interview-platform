export { COOKIE_NAME, SESSION_MAX_AGE_MS } from "@shared/const";

// Generate login URL at runtime so redirect URI reflects the current origin.
// returnTo 파라미터로 로그인 후 돌아갈 페이지를 지정할 수 있음
export const getLoginUrl = (returnTo?: string) => {
  const returnPath = returnTo?.startsWith("/") ? returnTo : "/interview";
  return `/api/oauth/start?returnTo=${encodeURIComponent(returnPath)}`;
};
