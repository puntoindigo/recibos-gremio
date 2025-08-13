// app/api/cleanup/route.ts
import { NextResponse } from 'next/server';
import { promises as fs } from 'node:fs';
import path from 'node:path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEST_DIR = path.join(process.cwd(), process.env.PUBLIC_RECIBOS_DIR || 'public/recibos');

async function listFiles(dir: string) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries.filter(e => e.isFile()).map(e => path.join(dir, e.name));
  } catch {
    return [];
  }
}

export async function POST() {
  try {
    await fs.mkdir(DEST_DIR, { recursive: true });
    const files = await listFiles(DEST_DIR);

    let deleted = 0;
    const errors: string[] = [];

    for (const abs of files) {
      // por seguridad, solo borramos PDFs
      if (!/\.pdf$/i.test(abs)) continue;
      try {
        await fs.unlink(abs);
        deleted++;
      } catch (e: any) {
        errors.push(`${path.basename(abs)}: ${e?.message || 'error'}`);
      }
    }

    return NextResponse.json({
      ok: true,
      dir: DEST_DIR,
      deleted,
      kept: files.length - deleted,
      errors,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'cleanup error' }, { status: 500 });
  }
}
