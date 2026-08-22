export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  oAuthPortalUrl: process.env.OAUTH_PORTAL_URL ?? process.env.VITE_OAUTH_PORTAL_URL ?? "",
  appBaseUrl: process.env.APP_BASE_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  stripePublishableKey: process.env.VITE_STRIPE_PUBLISHABLE_KEY ?? "",
  tossSecretKey: process.env.TOSS_SECRET_KEY ?? "",
  schedulerSecret: process.env.SCHEDULER_SECRET ?? "",
  businessName: process.env.BUSINESS_NAME ?? "",
  businessRepresentative: process.env.BUSINESS_REPRESENTATIVE ?? "",
  businessRegistrationNumber: process.env.BUSINESS_REGISTRATION_NUMBER ?? "",
  businessAddress: process.env.BUSINESS_ADDRESS ?? "",
  businessPhone: process.env.BUSINESS_PHONE ?? "",
  businessEmail: process.env.BUSINESS_EMAIL ?? "",
  // 키움페이 결제 연동 (통합API 방식)
  kiwoompayMode: process.env.KIWOOMPAY_MODE ?? "test", // "test" | "production"
  kiwoompayApiUrl: process.env.KIWOOMPAY_MODE === "production" 
    ? "https://api.kiwoompay.co.kr/pay/ready" 
    : "https://apitest.kiwoompay.co.kr/pay/ready",
  kiwoompayAuthKey: process.env.KIWOOMPAY_AUTH_KEY ?? "", // Authorization 헤더용 결제연동키
  kiwoompayMerchantId: process.env.KIWOOMPAY_MERCHANT_ID ?? "", // CPID
  kiwoompayWebhookKey: process.env.KIWOOMPAY_WEBHOOK_KEY ?? "",
};

export function validateRuntimeConfiguration() {
  if (!ENV.isProduction) return;

  const errors: string[] = [];
  if (!ENV.databaseUrl) errors.push("DATABASE_URL is required");
  if (ENV.cookieSecret.length < 32) errors.push("JWT_SECRET must contain at least 32 characters");
  if (!ENV.appId) errors.push("VITE_APP_ID is required");
  if (!ENV.oAuthServerUrl) errors.push("OAUTH_SERVER_URL is required");
  if (!ENV.oAuthPortalUrl) errors.push("OAUTH_PORTAL_URL is required");
  try {
    if (new URL(ENV.appBaseUrl).protocol !== "https:") errors.push("APP_BASE_URL must use HTTPS");
  } catch {
    errors.push("APP_BASE_URL must be an absolute HTTPS URL");
  }

  if (errors.length > 0) {
    throw new Error(`Invalid production configuration:\n- ${errors.join("\n- ")}`);
  }
}
