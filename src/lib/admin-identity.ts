export function getAdminUsername(): string {
  return (process.env.ADMIN_USERNAME || "admin").trim().toLowerCase();
}

export function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD || "change-me";
}

export function isAdminUsername(username: string | null | undefined): boolean {
  if (!username) return false;
  return username.trim().toLowerCase() === getAdminUsername();
}
