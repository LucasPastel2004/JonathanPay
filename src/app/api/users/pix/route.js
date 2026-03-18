import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const { userName, pixKey } = await request.json();

    if (!userName) return NextResponse.json({ error: "Usuário é obrigatório" }, { status: 400 });

    const { rowCount } = await sql`
      UPDATE users 
      SET pix_key = ${pixKey || null} 
      WHERE name ILIKE ${userName}
    `;

    if (rowCount === 0) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    return NextResponse.json({ success: true, pixKey });
  } catch (error) {
    console.error("Pix Key API Error:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}
