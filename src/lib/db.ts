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
