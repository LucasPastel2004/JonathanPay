import { NextResponse } from 'next/server';

function formatPixField(id, value) {
  const len = String(value.length).padStart(2, '0');
  return `${id}${len}${value}`;
}

function crc16(payload) {
  let crc = 0xFFFF;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc = crc << 1;
      }
    }
  }
  return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
}

function generatePixPayload(key, amount, name, city) {
  // Limpa o nome para evitar caracteres especiais que quebram o EMV
  const safeName = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9 ]/g, "").substring(0, 25) || "Usuario";
  const safeCity = city.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9 ]/g, "").substring(0, 15) || "Sao Paulo";

  const payloadKey = formatPixField('01', key);
  const gui = formatPixField('00', 'br.gov.bcb.pix');
  const accountInfo = formatPixField('26', gui + payloadKey);
  const mCategoryCode = formatPixField('52', '0000');
  const currency = formatPixField('53', '986');
  const amountField = amount ? formatPixField('54', amount) : '';
  const country = formatPixField('58', 'BR');
  const merchantName = formatPixField('59', safeName);
  const merchantCity = formatPixField('60', safeCity);
  const txIdField = formatPixField('62', formatPixField('05', '***'));
  
  const payload = '000201' + accountInfo + mCategoryCode + currency + amountField + country + merchantName + merchantCity + txIdField + '6304';
  
  return payload + crc16(payload);
}

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
    const rawPixString = generatePixPayload(chave, valor, nome, cidade || 'SaoPaulo');
    return NextResponse.json({
      brcode: rawPixString
    });
  } catch (error) {
    console.error("PIX Native Generator Error:", error);
    return NextResponse.json({ error: "Falha na geração do payload PIX" }, { status: 500 });
  }
}
