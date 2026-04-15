import { createClient, type Client } from "@libsql/client";

let client: Client | null = null;
let schemaReady: Promise<void> | null = null;

function makeClient(): Client {
  return createClient({
    url: process.env.TURSO_DATABASE_URL ?? "file:bookclub.db",
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
}

async function initSchema(db: Client) {
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE COLLATE NOCASE,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS suggestions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ol_key TEXT NOT NULL,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      description TEXT,
      cover_url TEXT,
      suggested_by INTEGER NOT NULL REFERENCES users(id),
      month INTEGER NOT NULL,
      year INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(ol_key, month, year)
    );

    CREATE TABLE IF NOT EXISTS votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      suggestion_id INTEGER NOT NULL REFERENCES suggestions(id),
      month INTEGER NOT NULL,
      year INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, month, year)
    );

    CREATE TABLE IF NOT EXISTS monthly_winners (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      suggestion_id INTEGER NOT NULL REFERENCES suggestions(id),
      month INTEGER NOT NULL,
      year INTEGER NOT NULL,
      vote_count INTEGER NOT NULL DEFAULT 0,
      UNIQUE(month, year)
    );

    CREATE TABLE IF NOT EXISTS reading_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      month INTEGER NOT NULL,
      year INTEGER NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Migration: add is_admin column if it doesn't exist yet
  try {
    await db.execute("ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0");
  } catch {
    // column already exists
  }

  // Ensure the admin account is flagged
  await db.execute({
    sql: "UPDATE users SET is_admin = 1 WHERE email = ?",
    args: ["rawaidakhtar@gmail.com"],
  });
}

export async function getDb(): Promise<Client> {
  if (!client) {
    client = makeClient();
    schemaReady = initSchema(client);
  }
  await schemaReady;
  return client;
}
