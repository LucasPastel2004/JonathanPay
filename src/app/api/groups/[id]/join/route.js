import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function POST(request, { params }) {
  const groupId = params.id;
  
  try {
    const { userId } = await request.json();

    if (!groupId || !userId) {
      return NextResponse.json({ error: "groupId and userId are required" }, { status: 400 });
    }

    // Verify if group exists
    const { rows: groupRows } = await sql`SELECT id FROM groups WHERE id = ${groupId} LIMIT 1`;
    if (groupRows.length === 0) return NextResponse.json({ error: "Group not found" }, { status: 404 });

    // Join
    await sql`
      INSERT INTO group_members (group_id, user_id) 
      VALUES (${groupId}, ${userId})
      ON CONFLICT (group_id, user_id) DO NOTHING
    `;

    return NextResponse.json({ success: true, message: "Joined successfully" });
  } catch (error) {
    console.error("Groups Join API Error:", error);
    return NextResponse.json({ error: "Failed to join group" }, { status: 500 });
  }
}
