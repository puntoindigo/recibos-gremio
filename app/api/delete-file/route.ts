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

    // Sanitizar el nombre del archivo para seguridad (permitir caracteres comunes en nombres de archivo)
    // Solo eliminar path traversal attempts, no caracteres válidos como espacios, guiones, paréntesis, etc.
    const sanitizedFilename = filename.replace(/[/\\]/g, '').replace(/\.\./g, '');
    
    // Verificar que no es una ruta absoluta o con caracteres peligrosos
    if (path.isAbsolute(sanitizedFilename) || sanitizedFilename.includes('..')) {
      return NextResponse.json({ 
        success: false, 
        error: 'Nombre de archivo inválido: ruta no permitida' 
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
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorDetails = error instanceof Error ? { 
      message: error.message, 
      stack: error.stack 
    } : { error };
    
    return NextResponse.json({ 
      success: false, 
      error: errorMessage || 'Error eliminando archivo',
      details: errorDetails
    }, { status: 500 });
  }
}
