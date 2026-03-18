import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { name, email } = await request.json();

    if (!name) {
      return NextResponse.json({ error: "O nome é obrigatório" }, { status: 400 });
    }

    // Tentar encontrar o usuário pelo nome (simulação simples de login, Case Insensitive no Postgres)
    const { rows: existingUsers } = await sql`
      SELECT * FROM users WHERE name ILIKE ${name} LIMIT 1
    `;

    if (existingUsers.length > 0) {
      return NextResponse.json(existingUsers[0]);
    }

    // Criar novo usuário se não existir
    const newId = "usr_" + Date.now();
    await sql`
      INSERT INTO users (id, name, email, pix_key)
      VALUES (${newId}, ${name}, ${email || null}, null)
    `;

    const { rows: newUsers } = await sql`
      SELECT * FROM users WHERE id = ${newId}
    `;

    return NextResponse.json(newUsers[0], { status: 201 });

  } catch (error) {
    console.error("Auth API Error:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}
