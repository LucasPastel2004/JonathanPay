import { sql, db as vercelDb } from '@vercel/postgres';
import { NextResponse } from 'next/server';

// GET /api/groups?userId=123
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: "Missing userId parameter" }, { status: 400 });
  }

  try {
    // Buscar grupos que o userId faz parte
    const { rows: userGroups } = await sql`
      SELECT g.* FROM groups g
      JOIN group_members gm ON g.id = gm.group_id
      WHERE gm.user_id = ${userId}
      ORDER BY g.created_at DESC
    `;

    // Para cada grupo, anexar quantidade de membros ou membros diretamente
    for (let g of userGroups) {
      const { rows: members } = await sql`
        SELECT u.name FROM users u
        JOIN group_members gm ON u.id = gm.user_id
        WHERE gm.group_id = ${g.id}
      `;
      g.membersList = members.map(m => m.name);
      g.members = g.membersList.length; // Dashboard UI compat
      g.total = 0; 
    }

    return NextResponse.json(userGroups);
  } catch (error) {
    console.error("Groups API Error:", error);
    return NextResponse.json({ error: "Failed to load groups" }, { status: 500 });
  }
}

// POST /api/groups
export async function POST(request) {
  const client = await vercelDb.connect();
  
  try {
    const { name, ownerId, participants } = await request.json();

    if (!name || !ownerId) {
      return NextResponse.json({ error: "Name and ownerId are required" }, { status: 400 });
    }

    const groupId = "grp_" + Date.now();

    await client.sql`BEGIN`;
    
    // 1. Criar grupo
    await client.sql`
      INSERT INTO groups (id, name) VALUES (${groupId}, ${name})
    `;
    
    // 2. Inserir dono
    await client.sql`
      INSERT INTO group_members (group_id, user_id) VALUES (${groupId}, ${ownerId})
    `;

    // 3. Inserir convidados 
    if (participants && Array.isArray(participants)) {
      for (const pName of participants) {
        if (!pName.trim()) continue;
        
        // Find if user exists
        const { rows: existingUserRows } = await client.sql`
          SELECT id FROM users WHERE name ILIKE ${pName.trim()} LIMIT 1
        `;
        
        let targetId;
        if (existingUserRows.length > 0) {
          targetId = existingUserRows[0].id;
        } else {
          targetId = "usr_" + Date.now() + Math.floor(Math.random() * 1000);
          await client.sql`
            INSERT INTO users (id, name) VALUES (${targetId}, ${pName.trim()})
          `;
        }
        
        // Insert into group explicitly catching duplicates simply via ON CONFLICT
        await client.sql`
          INSERT INTO group_members (group_id, user_id) 
          VALUES (${groupId}, ${targetId})
          ON CONFLICT (group_id, user_id) DO NOTHING
        `;
      }
    }

    await client.sql`COMMIT`;

    const { rows: newGroupRows } = await sql`
      SELECT * FROM groups WHERE id = ${groupId} LIMIT 1
    `;

    return NextResponse.json(newGroupRows[0], { status: 201 });
  } catch (error) {
    await client.sql`ROLLBACK`;
    console.error("Groups POST Error:", error);
    return NextResponse.json({ error: "Failed to create group" }, { status: 500 });
  } finally {
    client.release();
  }
}
