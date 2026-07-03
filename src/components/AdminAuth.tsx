"use client";

import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export function useAdminGate() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.replace(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
      return;
    }
    if (!session.user.isAdmin) {
      router.replace("/");
    }
  }, [session, status, router, pathname]);

  return {
    ready: status !== "loading" && !!session?.user?.isAdmin,
    session,
  };
}
