// /app/api/todos/route.ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { readTodos, readCsvText } from '@/lib/todosCsv';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format');

    if (format === 'csv') {
      const csv = await readCsvText();
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="todos.csv"',
          'Cache-Control': 'no-store',
        },
      });
    }

    const rows = await readTodos();
    return NextResponse.json({ ok: true, rows });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Error' }, { status: 500 });
  }
}