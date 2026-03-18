import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  const unwrappedParams = await params;
  const groupId = unwrappedParams.id;
  
  if (!groupId) {
    return NextResponse.json({ error: "Id do grupo nao informado" }, { status: 400 });
  }

  try {
    // 1. Group Data
    const { rows: groupRows } = await sql`SELECT * FROM groups WHERE id = ${groupId} LIMIT 1`;
    if (groupRows.length === 0) {
      return NextResponse.json({ error: "Grupo não encontrado" }, { status: 404 });
    }
    const group = groupRows[0];

    // 2. Members
    const { rows: membersList } = await sql`
      SELECT u.id, u.name, u.pix_key
      FROM users u
      JOIN group_members gm ON u.id = gm.user_id
      WHERE gm.group_id = ${groupId}
    `;

    // 3. Items with basic data
    const { rows: itemsList } = await sql`
      SELECT i.id, i.name, i.price, i.created_at, u.name as paid_by
      FROM items i
      JOIN users u ON i.paid_by_id = u.id
      WHERE i.group_id = ${groupId}
      ORDER BY i.created_at ASC
    `;

    // 4. Item Consumers (quem consumiu o quê)
    const { rows: itemsConsumersPairs } = await sql`
      SELECT ic.item_id, u.name as consumer_name
      FROM item_consumers ic
      JOIN users u ON ic.user_id = u.id
      WHERE ic.item_id IN (SELECT id FROM items WHERE group_id = ${groupId})
    `;

    // Mapping consumers inside items
    itemsList.forEach(item => {
      item.splitAmong = itemsConsumersPairs
        .filter(pair => pair.item_id === item.id)
        .map(pair => pair.consumer_name);
    });

    // Formatting as the Frontend expects
    const responseData = {
      id: group.id,
      name: group.name,
      membersList: membersList.map(m => m.name),
      membersFull: membersList,
      memberPixKeys: membersList.reduce((acc, curr) => {
        if (curr.pix_key) acc[curr.name] = curr.pix_key;
        return acc;
      }, {}),
      cart: itemsList.map(i => ({
         id: i.id,
         name: i.name,
         // Postgres returns numeric types as strings sometimes depending on driver configs
         price: parseFloat(i.price) || 0, 
         paidBy: i.paid_by,
         splitAmong: i.splitAmong
      }))
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Groups Detail API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to load group detail" }, { status: 500 });
  }
}
