// app/api/cleanup/route.ts
import { NextResponse } from "next/server";
import path from "node:path";
import { promises as fs } from "node:fs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Carpeta donde subís los PDF (coincide con /api/recibos/[name]/route.ts)
const BASE_DIR = path.join(process.cwd(), "uploads", "recibos");

function sanitize(name: string): string {
  const n = (name ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w.\-]/g, "");
  return n;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { names?: unknown };
    const names = Array.isArray(body.names) ? (body.names.filter((x) => typeof x === "string") as string[]) : [];

    if (names.length === 0) {
      // No-op para evitar 400 cuando no hay archivos a borrar
      return NextResponse.json({ ok: true, deleted: 0, missing: [], errors: [] });
    }

    const uniq = Array.from(new Set(names.map(sanitize))).filter(Boolean);

    let deleted = 0;
    const missing: string[] = [];
    const errors: Array<{ name: string; error: string }> = [];

    for (const n of uniq) {
      const p = path.join(BASE_DIR, n);
      const resolved = path.resolve(p);
      // Defensa anti path traversal
      if (!resolved.startsWith(path.resolve(BASE_DIR))) {
        errors.push({ name: n, error: "Ruta fuera de BASE_DIR" });
        continue;
      }
      try {
        await fs.unlink(resolved);
        deleted++;
      } catch (e: unknown) {
        const err = e as NodeJS.ErrnoException;
        if (err?.code === "ENOENT") {
          missing.push(n);
        } else {
          errors.push({ name: n, error: (err?.message ?? String(err)) });
        }
      }
    }

    return NextResponse.json({ ok: true, deleted, missing, errors });
  } catch (e: unknown) {
    const msg = (e as Error)?.message ?? String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}