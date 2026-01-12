// app/api/nfc-card/route.ts
// Endpoint API para recibir UID de tarjetas NFC desde el script Node.js

import { NextRequest, NextResponse } from 'next/server';

// Almacenar el último UID leído en memoria (en producción usar Redis o DB)
let lastCardData: { uid: string; timestamp: string } | null = null;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { uid, timestamp } = body;

    if (!uid) {
      return NextResponse.json(
        { error: 'UID requerido' },
        { status: 400 }
      );
    }

    // Almacenar el último UID leído
    lastCardData = {
      uid: String(uid),
      timestamp: timestamp || new Date().toISOString()
    };

    console.log('📱 Tarjeta recibida:', lastCardData);

    return NextResponse.json({
      success: true,
      uid: lastCardData.uid,
      timestamp: lastCardData.timestamp
    });
  } catch (error) {
    console.error('Error procesando tarjeta NFC:', error);
    return NextResponse.json(
      { error: 'Error procesando tarjeta' },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Endpoint para obtener el último UID leído (polling)
  return NextResponse.json({
    success: true,
    card: lastCardData,
    timestamp: new Date().toISOString()
  });
}

