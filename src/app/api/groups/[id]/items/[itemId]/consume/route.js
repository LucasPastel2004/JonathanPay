import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function PUT(request, { params }) {
  const unwrappedParams = await params;
  const itemId = unwrappedParams.itemId;
  
  try {
    const { userName } = await request.json();

    if (!itemId || !userName) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    // Find User
    const { rows: users } = await sql`
      SELECT id FROM users WHERE name ILIKE ${userName} LIMIT 1
    `;
    if (users.length === 0) return NextResponse.json({ error: "User not found" }, { status: 404 });
    const user = users[0];

    // Find if already consumed
    const { rows: existing } = await sql`
      SELECT * FROM item_consumers WHERE item_id = ${itemId} AND user_id = ${user.id} LIMIT 1
    `;

    if (existing.length > 0) {
      // Remove connection
      await sql`DELETE FROM item_consumers WHERE item_id = ${itemId} AND user_id = ${user.id}`;
    } else {
      // Add connection
      await sql`INSERT INTO item_consumers (item_id, user_id) VALUES (${itemId}, ${user.id})`;
    }

    return NextResponse.json({ success: true, added: existing.length === 0 });
  } catch (error) {
    console.error("Consume Item API Error:", error);
    return NextResponse.json({ error: "Failed to toggle consume" }, { status: 500 });
  }
}
