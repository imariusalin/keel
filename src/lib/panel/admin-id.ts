/** Internal Better Auth email for the default `admin` username. */
export const DEFAULT_ADMIN_EMAIL = "admin@keel.local";
export const LOCAL_ADMIN_DOMAIN = "keel.local";

export function toAuthEmail(raw: string): string {
  const value = raw.trim().toLowerCase();
  if (!value) return "";
  if (value.includes("@")) return value;
  return `${value}@${LOCAL_ADMIN_DOMAIN}`;
}

export function displayUsername(email: string | null | undefined): string {
  if (!email) return "admin";
  const suffix = `@${LOCAL_ADMIN_DOMAIN}`;
  if (email.endsWith(suffix)) return email.slice(0, -suffix.length) || "admin";
  return email;
}

export function loginEmails(raw: string, hostname?: string): string[] {
  const value = raw.trim().toLowerCase();
  if (!value) return [];
  if (value.includes("@")) return [value];
  const emails = [toAuthEmail(value)];
  if (hostname) {
    const host = hostname.includes(".") ? hostname : `${hostname}.local`;
    const legacy = `${value}@${host}`;
    if (!emails.includes(legacy)) emails.push(legacy);
  }
  return emails;
}
