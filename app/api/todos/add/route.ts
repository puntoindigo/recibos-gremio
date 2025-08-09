// /app/api/todos/add/route.ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { appendUnique } from '@/lib/todosCsv';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { archivo, legajo, periodo, codigos } = body || {};

    if (!archivo || !legajo || !periodo || !codigos) {
      return NextResponse.json(
        { ok: false, error: 'Faltan campos: archivo, legajo, periodo, codigos' },
        { status: 400 }
      );
    }

    const fecha = new Date().toISOString();
    const codigos_json = JSON.stringify(codigos);

    const { created } = await appendUnique({
      fecha,
      archivo: String(archivo),
      legajo: String(legajo),
      periodo: String(periodo),
      codigos_json,
    });

    return NextResponse.json({ ok: true, created });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Error' }, { status: 500 });
  }
}