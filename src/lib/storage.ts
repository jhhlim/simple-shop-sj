export const STORAGE_ERROR_MESSAGE =
  "Store database is not configured. In Vercel, open your project → Storage → Create Database (Postgres), connect it to this app, then redeploy.";

export function isVercelRuntime(): boolean {
  return process.env.VERCEL === "1";
}

export function assertCanPersistData(): void {
  const hasPostgres = Boolean(
    process.env.POSTGRES_URL?.trim() ||
      process.env.POSTGRES_PRISMA_URL?.trim() ||
      process.env.POSTGRES_URL_NON_POOLING?.trim() ||
      process.env.DATABASE_URL?.trim()
  );
  if (hasPostgres) return;
  if (isVercelRuntime()) {
    throw new Error(STORAGE_ERROR_MESSAGE);
  }
}
