import { ensureSchema, asRows, getSql, isPostgresEnabled } from "./pg";
import { assertCanPersistData } from "./storage";

export type Coupon = {
  code: string;
  percentOff: number;
  active: boolean;
};

export type ValidCoupon = {
  code: string;
  percentOff: number;
};

const FALLBACK_COUPONS: Record<string, number> = {
  OFF10: 10,
};

export async function listCoupons(): Promise<Coupon[]> {
  if (isPostgresEnabled()) {
    await ensureSchema();
    const rows = asRows<{ code: string; percent_off: number; active: boolean }>(
      await getSql()`
        SELECT code, percent_off, active FROM coupons ORDER BY code ASC
      `
    );
    return rows.map((r) => ({
      code: r.code,
      percentOff: Number(r.percent_off),
      active: Boolean(r.active),
    }));
  }

  return Object.entries(FALLBACK_COUPONS).map(([code, percentOff]) => ({
    code,
    percentOff,
    active: true,
  }));
}

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

export async function createCoupon(input: {
  code: string;
  percentOff: number;
  active?: boolean;
}): Promise<Coupon> {
  const code = input.code.trim().toUpperCase();
  const percentOff = Math.min(100, Math.max(1, Math.floor(input.percentOff)));
  const active = input.active ?? true;

  if (isPostgresEnabled()) {
    await ensureSchema();
    const existing = asRows<{ code: string }>(
      await getSql()`SELECT code FROM coupons WHERE upper(code) = ${code} LIMIT 1`
    );
    if (existing[0]) throw new Error("Coupon already exists");

    await getSql()`
      INSERT INTO coupons (code, percent_off, active)
      VALUES (${code}, ${percentOff}, ${active})
    `;
    return { code, percentOff, active };
  }

  assertCanPersistData();
  if (FALLBACK_COUPONS[code]) throw new Error("Coupon already exists");
  FALLBACK_COUPONS[code] = percentOff;
  return { code, percentOff, active };
}

export async function updateCoupon(
  code: string,
  input: { percentOff?: number; active?: boolean }
): Promise<Coupon | null> {
  const normalized = code.trim().toUpperCase();

  if (isPostgresEnabled()) {
    await ensureSchema();
    const existing = asRows<{ code: string; percent_off: number; active: boolean }>(
      await getSql()`SELECT code, percent_off, active FROM coupons WHERE code = ${normalized}`
    );
    if (!existing[0]) return null;

    const percentOff =
      input.percentOff != null
        ? Math.min(100, Math.max(1, Math.floor(input.percentOff)))
        : Number(existing[0].percent_off);
    const active = input.active ?? Boolean(existing[0].active);

    await getSql()`
      UPDATE coupons SET percent_off = ${percentOff}, active = ${active} WHERE code = ${normalized}
    `;
    return { code: normalized, percentOff, active };
  }

  if (!FALLBACK_COUPONS[normalized]) return null;
  if (input.percentOff != null) {
    FALLBACK_COUPONS[normalized] = Math.min(100, Math.max(1, Math.floor(input.percentOff)));
  }
  return {
    code: normalized,
    percentOff: FALLBACK_COUPONS[normalized],
    active: input.active ?? true,
  };
}

export async function deleteCoupon(code: string): Promise<boolean> {
  const normalized = code.trim().toUpperCase();

  if (isPostgresEnabled()) {
    await ensureSchema();
    const rows = asRows<{ code: string }>(
      await getSql()`DELETE FROM coupons WHERE code = ${normalized} RETURNING code`
    );
    return rows.length > 0;
  }

  if (!FALLBACK_COUPONS[normalized]) return false;
  delete FALLBACK_COUPONS[normalized];
  return true;
}
