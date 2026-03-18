import { db } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function POST(request, { params }) {
  const groupId = params.id;
  const client = await db.connect();
  
  try {
    const { name, price, paidByName, consumersNames } = await request.json();

    if (!name || isNaN(price) || !paidByName || !consumersNames || consumersNames.length === 0) {
      return NextResponse.json({ error: "Invalid item data" }, { status: 400 });
    }

    const itemId = "itm_" + Date.now();

    await client.sql`BEGIN`;
    
    // Find the ID of the user who paid
    const { rows: payers } = await client.sql`
      SELECT id FROM users WHERE name ILIKE ${paidByName} LIMIT 1
    `;
    if (payers.length === 0) throw new Error("Payer not found");

    await client.sql`
      INSERT INTO items (id, group_id, name, price, paid_by_id) 
      VALUES (${itemId}, ${groupId}, ${name}, ${price}, ${payers[0].id})
    `;

    // Insert consumers
    for (const cName of consumersNames) {
        const { rows: consumers } = await client.sql`
          SELECT id FROM users WHERE name ILIKE ${cName} LIMIT 1
        `;
        if (consumers.length > 0) {
          await client.sql`
            INSERT INTO item_consumers (item_id, user_id) 
            VALUES (${itemId}, ${consumers[0].id})
            ON CONFLICT (item_id, user_id) DO NOTHING
          `;
        }
    }
    
    await client.sql`COMMIT`;

    return NextResponse.json({ success: true, itemId: itemId }, { status: 201 });
  } catch (error) {
    await client.sql`ROLLBACK`;
    console.error("Add Item API Error:", error);
    return NextResponse.json({ error: error.message || "Failed to add item" }, { status: 500 });
  } finally {
    client.release();
  }
}
