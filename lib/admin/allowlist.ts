export const ADMIN_EMAIL = "4808enterprises@gmail.com";

export function isAllowedAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === ADMIN_EMAIL;
}
