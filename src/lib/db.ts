import Database from "better-sqlite3";
import path from "path";

const globalForDb = globalThis as unknown as { shopDb?: Database.Database };

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE,
      email TEXT UNIQUE,
      password_hash TEXT,
      name TEXT,
      google_id TEXT UNIQUE,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cart_items (
      user_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      PRIMARY KEY (user_id, product_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

    CREATE TABLE IF NOT EXISTS auth_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS auth_tokens_user_type_idx ON auth_tokens (user_id, type);
  `);

  try {
    db.exec(`ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0`);
  } catch {
    // column already exists
  }

  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower ON users(lower(username));
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users(lower(email));
  `);
}

export function getDb(): Database.Database {
  if (!globalForDb.shopDb) {
    const dbPath = path.join(process.cwd(), "data", "shop.db");
    globalForDb.shopDb = new Database(dbPath);
    globalForDb.shopDb.pragma("journal_mode = WAL");
    globalForDb.shopDb.pragma("foreign_keys = ON");
    initSchema(globalForDb.shopDb);
  }
  return globalForDb.shopDb;
}
