import { NextResponse } from 'next/server';
import { promises as fs } from 'node:fs';
import path from 'node:path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RECIBOS_DIR = path.join(process.cwd(), 'public/recibos');

export async function POST() {
  try {
    console.log('🧹 Iniciando limpieza de archivos huérfanos...');
    
    // Verificar que la carpeta existe
    try {
      await fs.access(RECIBOS_DIR);
    } catch {
      return NextResponse.json({ 
        success: true, 
        deletedCount: 0, 
        message: 'Carpeta de recibos no existe' 
      });
    }

    // Obtener todos los archivos en la carpeta
    const files = await fs.readdir(RECIBOS_DIR);
    const pdfFiles = files.filter(file => file.endsWith('.pdf'));
    
    console.log(`📁 Archivos PDF encontrados: ${pdfFiles.length}`);
    
    // Por ahora, solo retornar información sin eliminar archivos
    // TODO: Implementar lógica de limpieza cuando tengamos acceso a la BD del servidor
    
    return NextResponse.json({
      success: true,
      deletedCount: 0,
      totalFiles: pdfFiles.length,
      message: 'Función de limpieza en desarrollo - no se eliminaron archivos'
    });
    
  } catch (error) {
    console.error('❌ Error en limpieza de archivos:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Error durante la limpieza de archivos' 
    }, { status: 500 });
  }
}
