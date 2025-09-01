import { NextResponse } from 'next/server';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { Buffer } from 'node:buffer';
import { upsertArchivoEnTodos } from '@/lib/todos';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEST_DIR = path.join(process.cwd(), process.env.PUBLIC_RECIBOS_DIR || 'public/recibos');

function sanitizeName(name: string) {
  const base = name.replace(/[/\\]/g, '');
  const cleaned = base.replace(/[^\w.\- ]+/g, '');
  return cleaned || 'archivo.pdf';
}

async function ensureUniqueFilePath(dir: string, fileName: string) {
  const { name, ext } = path.parse(fileName);
  let candidate = path.join(dir, fileName);
  let i = 1;
  for (;;) {
    try {
      await fs.access(candidate); // existe
      candidate = path.join(dir, `${name}-${i}${ext}`);
      i++;
    } catch {
      return candidate; // no existe
    }
  }
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'Falta "file"' }, { status: 400 });

    const type = file.type || 'application/octet-stream';
    if (type !== 'application/pdf') {
      return NextResponse.json({ error: 'Solo se permiten PDFs' }, { status: 415 });
    }

    // --- guardar el PDF en /public/recibos ---
    const rawName = file.name || 'recibo.pdf';
    const safeName = sanitizeName(rawName);
    
    await fs.mkdir(DEST_DIR, { recursive: true });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const destPath = await ensureUniqueFilePath(DEST_DIR, safeName);
    await fs.writeFile(destPath, buffer);

    const finalName = path.basename(destPath);
    const link = `/recibos/${encodeURIComponent(finalName)}`;

    // --- metadatos opcionales para actualizar todos.csv ---
    // Podés mandar cualquiera de estos campos en el form:
    // - key (formato: LEGAJO||mm/yyyy)
    // - legajo y periodo (mm/yyyy)
    const key = (form.get('key') || '').toString().trim();
    const legajo = (form.get('legajo') || '').toString().trim();
    const periodo = (form.get('periodo') || '').toString().trim();

    let csvResult: { updated: boolean; reason?: string; key?: string } = { updated: false, reason: 'Sin key/legajo/periodo, no se actualiza CSV' };

    if (key || (legajo && periodo)) {
      csvResult = await upsertArchivoEnTodos({
        key,
        legajo,
        periodo,
        archivo: { name: finalName, id: finalName, link }
      });
    }

    return NextResponse.json({
      id: finalName,
      name: finalName,
      link,
      csv: csvResult
    });
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : 'Upload error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
