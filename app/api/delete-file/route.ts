import { NextResponse } from 'next/server';
import { promises as fs } from 'node:fs';
import path from 'node:path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RECIBOS_DIR = path.join(process.cwd(), 'public/recibos');

export async function POST(req: Request) {
  try {
    const { filename } = await req.json();
    
    console.log(`🔍 delete-file endpoint recibió: "${filename}"`);
    
    if (!filename) {
      console.log('❌ Filename vacío o undefined');
      return NextResponse.json({ 
        success: false, 
        error: 'Filename es requerido' 
      }, { status: 400 });
    }

    // Sanitizar el nombre del archivo para seguridad
    const sanitizedFilename = filename.replace(/[/\\]/g, '').replace(/[^\w.\- ]+/g, '');
    
    if (sanitizedFilename !== filename) {
      return NextResponse.json({ 
        success: false, 
        error: 'Nombre de archivo inválido' 
      }, { status: 400 });
    }

    const filePath = path.join(RECIBOS_DIR, sanitizedFilename);
    
    // Verificar que el archivo existe
    try {
      await fs.access(filePath);
    } catch {
      return NextResponse.json({ 
        success: false, 
        error: 'Archivo no encontrado' 
      }, { status: 404 });
    }

    // Eliminar el archivo
    await fs.unlink(filePath);
    
    console.log(`🗑️ Archivo eliminado: ${sanitizedFilename}`);
    
    return NextResponse.json({
      success: true,
      message: `Archivo ${sanitizedFilename} eliminado exitosamente`
    });
    
  } catch (error) {
    console.error('❌ Error eliminando archivo:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Error eliminando archivo' 
    }, { status: 500 });
  }
}
