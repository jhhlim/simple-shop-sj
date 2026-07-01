import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { getDb } from "./db";

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

export function findUserById(id: string): DbUser | undefined {
  return getDb().prepare("SELECT * FROM users WHERE id = ?").get(id) as DbUser | undefined;
}

export function findUserByUsernameOrEmail(login: string): DbUser | undefined {
  const value = login.trim().toLowerCase();
  return getDb()
    .prepare("SELECT * FROM users WHERE lower(username) = ? OR lower(email) = ?")
    .get(value, value) as DbUser | undefined;
}

export function findUserByEmail(email: string): DbUser | undefined {
  return getDb()
    .prepare("SELECT * FROM users WHERE lower(email) = ?")
    .get(email.trim().toLowerCase()) as DbUser | undefined;
}

export function findUserByGoogleId(googleId: string): DbUser | undefined {
  return getDb()
    .prepare("SELECT * FROM users WHERE google_id = ?")
    .get(googleId) as DbUser | undefined;
}

export function findUserByUsername(username: string): DbUser | undefined {
  return getDb()
    .prepare("SELECT * FROM users WHERE lower(username) = ?")
    .get(username.trim().toLowerCase()) as DbUser | undefined;
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

  getDb()
    .prepare(
      `INSERT INTO users (id, username, email, password_hash, name, google_id, created_at)
       VALUES (@id, @username, @email, @password_hash, @name, @google_id, @created_at)`
    )
    .run(user);

  return user;
}

export function createOrLinkGoogleUser(input: {
  email: string;
  name?: string | null;
  googleId: string;
}): DbUser {
  const db = getDb();
  const email = input.email.trim().toLowerCase();

  const byGoogle = findUserByGoogleId(input.googleId);
  if (byGoogle) return byGoogle;

  const byEmail = findUserByEmail(email);
  if (byEmail) {
    db.prepare("UPDATE users SET google_id = ?, name = COALESCE(name, ?) WHERE id = ?").run(
      input.googleId,
      input.name || byEmail.name,
      byEmail.id
    );
    return findUserById(byEmail.id)!;
  }

  const baseUsername = email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 20);
  let username = baseUsername || `user_${input.googleId.slice(0, 8)}`;
  let suffix = 1;
  while (findUserByUsername(username)) {
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

  db.prepare(
    `INSERT INTO users (id, username, email, password_hash, name, google_id, created_at)
     VALUES (@id, @username, @email, @password_hash, @name, @google_id, @created_at)`
  ).run(user);

  return user;
}

export function validateRegistration(input: {
  username: string;
  email: string;
  password: string;
}): string | null {
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
  if (findUserByUsername(username)) return "Username is already taken";
  if (findUserByEmail(email)) return "Email is already registered";
  return null;
}
