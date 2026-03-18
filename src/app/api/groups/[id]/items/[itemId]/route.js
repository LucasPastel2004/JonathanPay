import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function DELETE(request, { params }) {
  const unwrappedParams = await params;
  const itemId = unwrappedParams.itemId;
  
  try {
    if (!itemId) return NextResponse.json({ error: "Item ID missing" }, { status: 400 });

    // Verify
    const { rows: items } = await sql`SELECT id FROM items WHERE id = ${itemId} LIMIT 1`;
    if (items.length === 0) return NextResponse.json({ error: "Item not found" }, { status: 404 });

    // Postgres FOREIGN KEY ON DELETE CASCADE will handle item_consumers
    await sql`DELETE FROM items WHERE id = ${itemId}`;

    return NextResponse.json({ success: true, message: "Item removed" });
  } catch (error) {
    console.error("Delete Item API Error:", error);
    return NextResponse.json({ error: "Failed to delete item" }, { status: 500 });
  }
}
