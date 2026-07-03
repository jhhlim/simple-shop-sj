import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { getDb } from "./db";
import { ensureSchema, asRows, getSql, isPostgresEnabled } from "./pg";
import { assertCanPersistData } from "./storage";
import { isDuplicateUserError, UserConflictError } from "./user-errors";

export type DbUser = {
  id: string;
  username: string | null;
  email: string | null;
  password_hash: string | null;
  name: string | null;
  google_id: string | null;
  email_verified: boolean;
  created_at: string;
};

const SALT_ROUNDS = 12;

function mapUser(row: Record<string, unknown>): DbUser {
  return {
    id: String(row.id),
    username: row.username != null ? String(row.username) : null,
    email: row.email != null ? String(row.email) : null,
    password_hash: row.password_hash != null ? String(row.password_hash) : null,
    name: row.name != null ? String(row.name) : null,
    google_id: row.google_id != null ? String(row.google_id) : null,
    email_verified: Boolean(row.email_verified),
    created_at: String(row.created_at),
  };
}

export async function findUserById(id: string): Promise<DbUser | undefined> {
  if (isPostgresEnabled()) {
    await ensureSchema();
    const rows = asRows<Record<string, unknown>>(
      await getSql()`SELECT * FROM users WHERE id = ${id} LIMIT 1`
    );
    return rows[0] ? mapUser(rows[0]) : undefined;
  }
  const row = getDb().prepare("SELECT * FROM users WHERE id = ?").get(id) as
    | Record<string, unknown>
    | undefined;
  return row ? mapUser(row) : undefined;
}

export async function findUserByUsernameOrEmail(login: string): Promise<DbUser | undefined> {
  const value = login.trim().toLowerCase();
  if (isPostgresEnabled()) {
    await ensureSchema();
    const rows = asRows<Record<string, unknown>>(
      await getSql()`
      SELECT * FROM users
      WHERE lower(username) = ${value} OR lower(email) = ${value}
      LIMIT 1
    `
    );
    return rows[0] ? mapUser(rows[0]) : undefined;
  }
  const row = getDb()
    .prepare("SELECT * FROM users WHERE lower(username) = ? OR lower(email) = ?")
    .get(value, value) as Record<string, unknown> | undefined;
  return row ? mapUser(row) : undefined;
}

export async function findUserByEmail(email: string): Promise<DbUser | undefined> {
  const value = email.trim().toLowerCase();
  if (isPostgresEnabled()) {
    await ensureSchema();
    const rows = asRows<Record<string, unknown>>(
      await getSql()`SELECT * FROM users WHERE lower(email) = ${value} LIMIT 1`
    );
    return rows[0] ? mapUser(rows[0]) : undefined;
  }
  const row = getDb()
    .prepare("SELECT * FROM users WHERE lower(email) = ?")
    .get(value) as Record<string, unknown> | undefined;
  return row ? mapUser(row) : undefined;
}

export async function findUserByGoogleId(googleId: string): Promise<DbUser | undefined> {
  if (isPostgresEnabled()) {
    await ensureSchema();
    const rows = asRows<Record<string, unknown>>(
      await getSql()`SELECT * FROM users WHERE google_id = ${googleId} LIMIT 1`
    );
    return rows[0] ? mapUser(rows[0]) : undefined;
  }
  const row = getDb()
    .prepare("SELECT * FROM users WHERE google_id = ?")
    .get(googleId) as Record<string, unknown> | undefined;
  return row ? mapUser(row) : undefined;
}

export async function findUserByUsername(username: string): Promise<DbUser | undefined> {
  const value = username.trim().toLowerCase();
  if (isPostgresEnabled()) {
    await ensureSchema();
    const rows = asRows<Record<string, unknown>>(
      await getSql()`SELECT * FROM users WHERE lower(username) = ${value} LIMIT 1`
    );
    return rows[0] ? mapUser(rows[0]) : undefined;
  }
  const row = getDb()
    .prepare("SELECT * FROM users WHERE lower(username) = ?")
    .get(value) as Record<string, unknown> | undefined;
  return row ? mapUser(row) : undefined;
}

export async function verifyPassword(user: DbUser, password: string): Promise<boolean> {
  if (!user.password_hash) return false;
  return bcrypt.compare(password, user.password_hash);
}

async function insertUser(user: DbUser): Promise<void> {
  if (isPostgresEnabled()) {
    await ensureSchema();
    await getSql()`
      INSERT INTO users (
        id, username, email, password_hash, name, google_id, email_verified, created_at
      )
      VALUES (
        ${user.id},
        ${user.username},
        ${user.email},
        ${user.password_hash},
        ${user.name},
        ${user.google_id},
        ${user.email_verified},
        ${user.created_at}
      )
    `;
    return;
  }

  assertCanPersistData();
  getDb()
    .prepare(
      `INSERT INTO users (
        id, username, email, password_hash, name, google_id, email_verified, created_at
      )
       VALUES (
        @id, @username, @email, @password_hash, @name, @google_id, @email_verified, @created_at
      )`
    )
    .run({
      ...user,
      email_verified: user.email_verified ? 1 : 0,
    });
}

export async function createUserWithPassword(input: {
  username: string;
  email: string;
  password: string;
}): Promise<DbUser> {
  const username = input.username.trim().toLowerCase();
  const email = input.email.trim().toLowerCase();
  const password_hash = await bcrypt.hash(input.password, SALT_ROUNDS);
  const user: DbUser = {
    id: randomUUID(),
    username,
    email,
    password_hash,
    name: username,
    google_id: null,
    email_verified: false,
    created_at: new Date().toISOString(),
  };

  try {
    await insertUser(user);
  } catch (err) {
    if (isDuplicateUserError(err)) {
      throw new UserConflictError("Username or email is already registered");
    }
    throw err;
  }

  return user;
}

export async function createOrLinkGoogleUser(input: {
  email: string;
  name?: string | null;
  googleId: string;
}): Promise<DbUser> {
  const email = input.email.trim().toLowerCase();

  const byGoogle = await findUserByGoogleId(input.googleId);
  if (byGoogle) return byGoogle;

  const byEmail = await findUserByEmail(email);
  if (byEmail) {
    if (isPostgresEnabled()) {
      await ensureSchema();
      await getSql()`
        UPDATE users
        SET
          google_id = ${input.googleId},
          name = COALESCE(name, ${input.name || byEmail.name}),
          email_verified = TRUE
        WHERE id = ${byEmail.id}
      `;
    } else {
      getDb()
        .prepare(
          "UPDATE users SET google_id = ?, name = COALESCE(name, ?), email_verified = 1 WHERE id = ?"
        )
        .run(input.googleId, input.name || byEmail.name, byEmail.id);
    }
    return (await findUserById(byEmail.id))!;
  }

  const baseUsername = email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 20);
  let username = (baseUsername || `user_${input.googleId.slice(0, 8)}`).toLowerCase();
  let suffix = 1;
  while (await findUserByUsername(username)) {
    username = `${baseUsername}_${suffix++}`.toLowerCase();
  }

  const user: DbUser = {
    id: randomUUID(),
    username,
    email,
    password_hash: null,
    name: input.name || username,
    google_id: input.googleId,
    email_verified: true,
    created_at: new Date().toISOString(),
  };

  try {
    await insertUser(user);
  } catch (err) {
    if (isDuplicateUserError(err)) {
      throw new UserConflictError("Could not create Google account — email may already be in use");
    }
    throw err;
  }

  return user;
}

export async function markEmailVerified(userId: string): Promise<void> {
  if (isPostgresEnabled()) {
    await ensureSchema();
    await getSql()`UPDATE users SET email_verified = TRUE WHERE id = ${userId}`;
    return;
  }
  getDb().prepare(`UPDATE users SET email_verified = 1 WHERE id = ?`).run(userId);
}

export async function updatePassword(userId: string, password: string): Promise<void> {
  const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
  if (isPostgresEnabled()) {
    await ensureSchema();
    await getSql()`UPDATE users SET password_hash = ${password_hash} WHERE id = ${userId}`;
    return;
  }
  getDb().prepare(`UPDATE users SET password_hash = ? WHERE id = ?`).run(password_hash, userId);
}

export async function validateRegistration(input: {
  username: string;
  email: string;
  password: string;
}): Promise<string | null> {
  const username = input.username.trim().toLowerCase();
  const email = input.email.trim().toLowerCase();
  const password = input.password;

  if (username.length < 3 || username.length > 30) {
    return "Username must be 3–30 characters";
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return "Username can only contain letters, numbers, and underscores";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "Enter a valid email address";
  }
  if (password.length < 8) {
    return "Password must be at least 8 characters";
  }
  if (await findUserByUsername(username)) return "Username is already taken";
  if (await findUserByEmail(email)) return "Email is already registered";
  return null;
}
