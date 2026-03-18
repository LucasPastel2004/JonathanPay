import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const nome = searchParams.get('nome');
  const cidade = searchParams.get('cidade');
  const valor = searchParams.get('valor');
  const chave = searchParams.get('chave');

  if (!nome || !valor || !chave) {
    return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
  }

  try {
    const url = `https://gerarqrcodepix.com.br/api/v1?nome=${encodeURIComponent(nome)}&cidade=${encodeURIComponent(cidade || 'SaoPaulo')}&valor=${encodeURIComponent(valor)}&chave=${encodeURIComponent(chave)}`;
    const res = await fetch(url);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("PIX Proxy Error:", error);
    return NextResponse.json({ error: "Falha na geração do PIX" }, { status: 500 });
  }
}
