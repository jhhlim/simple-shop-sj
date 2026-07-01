import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { getDb } from "./db";
import { ensureSchema, asRows, getSql, isPostgresEnabled } from "./pg";

export type DbUser = {
  id: string;
  username: string | null;
  email: string | null;
  password_hash: string | null;
  name: string | null;
  google_id: string | null;
  created_at: string;
};

const SALT_ROUNDS = 12;

function mapUser(row: Record<string, unknown>): DbUser {
  return row as DbUser;
}

export async function findUserById(id: string): Promise<DbUser | undefined> {
  if (isPostgresEnabled()) {
    await ensureSchema();
    const rows = asRows<Record<string, unknown>>(
      await getSql()`SELECT * FROM users WHERE id = ${id} LIMIT 1`
    );
    return rows[0] ? mapUser(rows[0] as Record<string, unknown>) : undefined;
  }
  return getDb().prepare("SELECT * FROM users WHERE id = ?").get(id) as DbUser | undefined;
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
    return rows[0] ? mapUser(rows[0] as Record<string, unknown>) : undefined;
  }
  return getDb()
    .prepare("SELECT * FROM users WHERE lower(username) = ? OR lower(email) = ?")
    .get(value, value) as DbUser | undefined;
}

export async function findUserByEmail(email: string): Promise<DbUser | undefined> {
  const value = email.trim().toLowerCase();
  if (isPostgresEnabled()) {
    await ensureSchema();
    const rows = asRows<Record<string, unknown>>(
      await getSql()`SELECT * FROM users WHERE lower(email) = ${value} LIMIT 1`
    );
    return rows[0] ? mapUser(rows[0] as Record<string, unknown>) : undefined;
  }
  return getDb()
    .prepare("SELECT * FROM users WHERE lower(email) = ?")
    .get(value) as DbUser | undefined;
}

export async function findUserByGoogleId(googleId: string): Promise<DbUser | undefined> {
  if (isPostgresEnabled()) {
    await ensureSchema();
    const rows = asRows<Record<string, unknown>>(
      await getSql()`SELECT * FROM users WHERE google_id = ${googleId} LIMIT 1`
    );
    return rows[0] ? mapUser(rows[0] as Record<string, unknown>) : undefined;
  }
  return getDb()
    .prepare("SELECT * FROM users WHERE google_id = ?")
    .get(googleId) as DbUser | undefined;
}

export async function findUserByUsername(username: string): Promise<DbUser | undefined> {
  const value = username.trim().toLowerCase();
  if (isPostgresEnabled()) {
    await ensureSchema();
    const rows = asRows<Record<string, unknown>>(
      await getSql()`SELECT * FROM users WHERE lower(username) = ${value} LIMIT 1`
    );
    return rows[0] ? mapUser(rows[0] as Record<string, unknown>) : undefined;
  }
  return getDb()
    .prepare("SELECT * FROM users WHERE lower(username) = ?")
    .get(value) as DbUser | undefined;
}

export async function verifyPassword(user: DbUser, password: string): Promise<boolean> {
  if (!user.password_hash) return false;
  return bcrypt.compare(password, user.password_hash);
}

export async function createUserWithPassword(input: {
  username: string;
  email: string;
  password: string;
  name?: string;
}): Promise<DbUser> {
  const password_hash = await bcrypt.hash(input.password, SALT_ROUNDS);
  const user: DbUser = {
    id: randomUUID(),
    username: input.username.trim(),
    email: input.email.trim().toLowerCase(),
    password_hash,
    name: input.name?.trim() || input.username.trim(),
    google_id: null,
    created_at: new Date().toISOString(),
  };

  if (isPostgresEnabled()) {
    await ensureSchema();
    await getSql()`
      INSERT INTO users (id, username, email, password_hash, name, google_id, created_at)
      VALUES (
        ${user.id},
        ${user.username},
        ${user.email},
        ${user.password_hash},
        ${user.name},
        ${user.google_id},
        ${user.created_at}
      )
    `;
    return user;
  }

  getDb()
    .prepare(
      `INSERT INTO users (id, username, email, password_hash, name, google_id, created_at)
       VALUES (@id, @username, @email, @password_hash, @name, @google_id, @created_at)`
    )
    .run(user);

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
        SET google_id = ${input.googleId}, name = COALESCE(name, ${input.name || byEmail.name})
        WHERE id = ${byEmail.id}
      `;
    } else {
      getDb()
        .prepare("UPDATE users SET google_id = ?, name = COALESCE(name, ?) WHERE id = ?")
        .run(input.googleId, input.name || byEmail.name, byEmail.id);
    }
    return (await findUserById(byEmail.id))!;
  }

  const baseUsername = email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 20);
  let username = baseUsername || `user_${input.googleId.slice(0, 8)}`;
  let suffix = 1;
  while (await findUserByUsername(username)) {
    username = `${baseUsername}_${suffix++}`;
  }

  const user: DbUser = {
    id: randomUUID(),
    username,
    email,
    password_hash: null,
    name: input.name || username,
    google_id: input.googleId,
    created_at: new Date().toISOString(),
  };

  if (isPostgresEnabled()) {
    await ensureSchema();
    await getSql()`
      INSERT INTO users (id, username, email, password_hash, name, google_id, created_at)
      VALUES (
        ${user.id},
        ${user.username},
        ${user.email},
        ${user.password_hash},
        ${user.name},
        ${user.google_id},
        ${user.created_at}
      )
    `;
    return user;
  }

  getDb()
    .prepare(
      `INSERT INTO users (id, username, email, password_hash, name, google_id, created_at)
       VALUES (@id, @username, @email, @password_hash, @name, @google_id, @created_at)`
    )
    .run(user);

  return user;
}

export async function validateRegistration(input: {
  username: string;
  email: string;
  password: string;
}): Promise<string | null> {
  const username = input.username.trim();
  const email = input.email.trim();
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
