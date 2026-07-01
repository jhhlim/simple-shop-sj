import { ensureSchema, asRows, getSql, isPostgresEnabled } from "./pg";

export type ValidCoupon = {
  code: string;
  percentOff: number;
};

const FALLBACK_COUPONS: Record<string, number> = {
  OFF10: 10,
};

export async function validateCoupon(rawCode: string): Promise<ValidCoupon | null> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return null;

  if (isPostgresEnabled()) {
    await ensureSchema();
    const sql = getSql();
    const rows = asRows<{ code: string; percent_off: number }>(
      await sql`
      SELECT code, percent_off
      FROM coupons
      WHERE upper(code) = ${code} AND active = TRUE
      LIMIT 1
    `
    );
    const row = rows[0];
    if (!row) return null;
    return { code: row.code, percentOff: Number(row.percent_off) };
  }

  const percentOff = FALLBACK_COUPONS[code];
  if (!percentOff) return null;
  return { code, percentOff };
}
