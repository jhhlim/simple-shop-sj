import { auth } from "@/auth";
import { isAdminUsername } from "@/lib/admin-identity";

export { getAdminPassword, getAdminUsername, isAdminUsername } from "@/lib/admin-identity";

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
