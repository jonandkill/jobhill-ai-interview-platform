function readPublicEnv(value: unknown): string {
  return String(value ?? "").trim();
}

const businessEmail = readPublicEnv(import.meta.env.VITE_BUSINESS_EMAIL);

export const PUBLIC_BUSINESS_INFO = Object.freeze({
  name: readPublicEnv(import.meta.env.VITE_BUSINESS_NAME) || "JOB HILL",
  representative: readPublicEnv(import.meta.env.VITE_BUSINESS_REPRESENTATIVE),
  businessNumber: readPublicEnv(import.meta.env.VITE_BUSINESS_REGISTRATION_NUMBER),
  salesNumber: readPublicEnv(import.meta.env.VITE_BUSINESS_SALES_NUMBER),
  jobInfoNumber: readPublicEnv(import.meta.env.VITE_JOB_INFO_NUMBER),
  address: readPublicEnv(import.meta.env.VITE_BUSINESS_ADDRESS),
  phone: readPublicEnv(import.meta.env.VITE_BUSINESS_PHONE),
  email: businessEmail,
  supportEmail: readPublicEnv(import.meta.env.VITE_SUPPORT_EMAIL) || businessEmail,
  supportHours: readPublicEnv(import.meta.env.VITE_SUPPORT_HOURS) || "평일 11~18시",
});

export function displayBusinessValue(value: string): string {
  return value || "운영 배포 전 설정 필요";
}
