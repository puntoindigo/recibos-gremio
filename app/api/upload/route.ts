// app/api/upload/route.ts
import { NextResponse } from "next/server";
import path from "node:path";
import { promises as fs } from "node:fs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BASE_DIR = path.join(process.cwd(), "uploads", "recibos");

function sanitize(name: string): string {
  const n = name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  return n.replace(/[^\w.\-]+/g, "_");
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Archivo no recibido" }, { status: 400 });
    }

    const keyRaw = String(form.get("key") ?? "");
    const key = sanitize(keyRaw).slice(0, 80);

    await fs.mkdir(BASE_DIR, { recursive: true });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const orig = sanitize(file.name);
    const base = key ? `${key}__${orig}` : orig;

    // limitar longitud
    const maxLen = 180;
    let name = base.length > maxLen ? base.slice(base.length - maxLen) : base;

    // asegurar único
    let target = path.join(BASE_DIR, name);
    for (let i = 1; i < 1000; i++) {
      try {
        await fs.access(target);
        const ext = path.extname(name);
        const stem = path.basename(name, ext);
        name = `${stem}-${i}${ext}`;
        target = path.join(BASE_DIR, name);
      } catch {
        break; // no existe, listo
      }
    }

    await fs.writeFile(target, buffer);

    // Nota: para descargar/ver, usar /api/recibos/[name]
    return NextResponse.json({ ok: true, name });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[upload] error:", msg);
    return NextResponse.json({ error: msg || "Upload failed" }, { status: 500 });
  }
}
