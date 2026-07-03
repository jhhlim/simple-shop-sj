import { randomBytes } from "crypto";
import { getDb } from "./db";
import { asRows, ensureSchema, getSql, isPostgresEnabled } from "./pg";

export type AuthTokenType = "verify_email" | "reset_password";

export type AuthToken = {
  id: string;
  user_id: string;
  type: AuthTokenType;
  token: string;
  expires_at: string;
  created_at: string;
};

function newTokenValue(): string {
  return randomBytes(32).toString("hex");
}

export async function createAuthToken(
  userId: string,
  type: AuthTokenType,
  expiresInHours: number
): Promise<string> {
  const token = newTokenValue();
  const now = new Date();
  const expires = new Date(now.getTime() + expiresInHours * 60 * 60 * 1000);
  const row = {
    id: randomBytes(16).toString("hex"),
    user_id: userId,
    type,
    token,
    expires_at: expires.toISOString(),
    created_at: now.toISOString(),
  };

  if (isPostgresEnabled()) {
    await ensureSchema();
    await getSql()`
      DELETE FROM auth_tokens WHERE user_id = ${userId} AND type = ${type}
    `;
    await getSql()`
      INSERT INTO auth_tokens (id, user_id, type, token, expires_at, created_at)
      VALUES (
        ${row.id},
        ${row.user_id},
        ${row.type},
        ${row.token},
        ${row.expires_at},
        ${row.created_at}
      )
    `;
    return token;
  }

  const db = getDb();
  db.prepare(`DELETE FROM auth_tokens WHERE user_id = ? AND type = ?`).run(userId, type);
  db.prepare(
    `INSERT INTO auth_tokens (id, user_id, type, token, expires_at, created_at)
     VALUES (@id, @user_id, @type, @token, @expires_at, @created_at)`
  ).run(row);

  return token;
}

export async function findValidAuthToken(
  token: string,
  type: AuthTokenType
): Promise<AuthToken | null> {
  if (!token.trim()) return null;
  const now = new Date().toISOString();

  if (isPostgresEnabled()) {
    await ensureSchema();
    const rows = asRows<AuthToken>(
      await getSql()`
        SELECT id, user_id, type, token, expires_at, created_at
        FROM auth_tokens
        WHERE token = ${token} AND type = ${type} AND expires_at > ${now}
        LIMIT 1
      `
    );
    return rows[0] ?? null;
  }

  const row = getDb()
    .prepare(
      `SELECT id, user_id, type, token, expires_at, created_at
       FROM auth_tokens
       WHERE token = ? AND type = ? AND expires_at > ?
       LIMIT 1`
    )
    .get(token, type, now) as AuthToken | undefined;
  return row ?? null;
}

export async function consumeAuthToken(token: string, type: AuthTokenType): Promise<void> {
  if (isPostgresEnabled()) {
    await ensureSchema();
    await getSql()`
      DELETE FROM auth_tokens WHERE token = ${token} AND type = ${type}
    `;
    return;
  }
  getDb().prepare(`DELETE FROM auth_tokens WHERE token = ? AND type = ?`).run(token, type);
}
