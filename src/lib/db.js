const Database = require('better-sqlite3');
import path from 'path';

// Define the path to the database file
// In Next.js, process.cwd() points to the root of the project
const dbPath = path.join(process.cwd(), 'splitbill.db');

let db;

try {
  // Initialize the database connection (creates the file if it doesn't exist)
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL'); // Performance improvement

  // Execute initialization script to create tables if they don't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      pix_key TEXT
    );

    CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS group_members (
      group_id TEXT,
      user_id TEXT,
      PRIMARY KEY (group_id, user_id),
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      paid_by_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
      FOREIGN KEY (paid_by_id) REFERENCES users(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS item_consumers (
      item_id TEXT,
      user_id TEXT,
      PRIMARY KEY (item_id, user_id),
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
  
  console.log("Database initialized successfully at", dbPath);
} catch (error) {
  console.error("Failed to initialize database:", error);
}

export default db;
