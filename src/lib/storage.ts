export const STORAGE_ERROR_MESSAGE =
  "Database not configured on Vercel. Add Neon: vercel.com/marketplace/neon → Install → connect to this project, OR set DATABASE_URL in Settings → Environment Variables, then Redeploy.";

export function isVercelRuntime(): boolean {
  return process.env.VERCEL === "1";
}

export function assertCanPersistData(): void {
  const hasPostgres = Boolean(
    process.env.POSTGRES_URL?.trim() ||
      process.env.POSTGRES_PRISMA_URL?.trim() ||
      process.env.POSTGRES_URL_NON_POOLING?.trim() ||
      process.env.DATABASE_URL?.trim() ||
      process.env.DATABASE_URL_UNPOOLED?.trim()
  );
  if (hasPostgres) return;
  if (isVercelRuntime()) {
    throw new Error(STORAGE_ERROR_MESSAGE);
  }
}
