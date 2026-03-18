import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Tenta criar as tabelas do PostgreSQL na infra da Vercel
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        pix_key VARCHAR(255)
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS groups (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS group_members (
        group_id VARCHAR(255),
        user_id VARCHAR(255),
        PRIMARY KEY (group_id, user_id),
        FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS items (
        id VARCHAR(255) PRIMARY KEY,
        group_id VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        price NUMERIC(10,2) NOT NULL,
        paid_by_id VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
        FOREIGN KEY (paid_by_id) REFERENCES users(id) ON DELETE RESTRICT
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS item_consumers (
        item_id VARCHAR(255),
        user_id VARCHAR(255),
        PRIMARY KEY (item_id, user_id),
        FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `;

    return NextResponse.json({ success: true, message: "Database tables created perfectly in Vercel Postgres" });
  } catch (error) {
    console.error("Vercel DB Init Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
