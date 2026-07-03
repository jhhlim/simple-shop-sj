import { auth } from "@/auth";

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

export async function requireAdmin(): Promise<Response | null> {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Sign in required" }, { status: 401 });
  }
  if (!session.user.isAdmin) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}
