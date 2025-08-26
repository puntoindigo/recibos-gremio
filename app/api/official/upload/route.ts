import { NextResponse } from 'next/server';
import { promises as fs } from 'node:fs';
import path from 'node:path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BASE_DIR = path.join(process.cwd(), 'uploads', 'oficial');

function safe(s: string): string {
  return s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w.\-]/g, '');
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get('file');
    const empresa = String(form.get('empresa') || '').trim();
    const periodo = String(form.get('periodo') || '').trim();

    if (!file || typeof (file as File).arrayBuffer !== 'function') {
      return NextResponse.json({ error: 'Falta archivo' }, { status: 400 });
    }
    if (!empresa || !periodo) {
      return NextResponse.json({ error: 'Faltan filtros (empresa y período)' }, { status: 400 });
    }

    const ab = await (file as File).arrayBuffer();
    const dir = path.join(BASE_DIR, safe(empresa));
    await fs.mkdir(dir, { recursive: true });
    const dest = path.join(dir, safe(periodo) + '.xlsx');
    await fs.writeFile(dest, Buffer.from(ab));

    // pequeño manifest
    const manifestPath = path.join(dir, 'index.json');
    let idx: Record<string, { file: string; uploadedAt: number }> = {};
    try { idx = JSON.parse(await fs.readFile(manifestPath, 'utf8')); } catch {}
    idx[periodo] = { file: path.basename(dest), uploadedAt: Date.now() };
    await fs.writeFile(manifestPath, JSON.stringify(idx, null, 2));

    return NextResponse.json({ ok: true, file: path.basename(dest) });
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : 'Error guardando oficial';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}