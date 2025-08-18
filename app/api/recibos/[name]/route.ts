// app/api/recibos/[name]/route.ts
import { NextResponse } from "next/server";
import path from "node:path";
import { promises as fs } from "node:fs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BASE_DIR = path.join(process.cwd(), "uploads", "recibos");

function sanitize(name: string): string {
  const n = name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  // solo permitir letras, números, guiones, guion bajo y punto
  return n.replace(/[^\w.\-]/g, "");
}

export async function GET(
  _req: Request,
  { params }: { params: { name: string } }
) {
  try {
    const safe = sanitize(params.name || "");
    if (!safe) return NextResponse.json({ error: "Nombre inválido" }, { status: 400 });

    const filePath = path.join(BASE_DIR, safe);
    const data = await fs.readFile(filePath);

    return new NextResponse(data, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${safe}"`,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[recibos] error:", msg);
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
}
