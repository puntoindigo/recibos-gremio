import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const RECIBOS_DIR = path.join(process.cwd(), 'public/recibos');

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const filename = searchParams.get('filename');
    
    if (!filename) {
      return NextResponse.json({ error: 'Filename es requerido' }, { status: 400 });
    }

    // Sanitizar el nombre del archivo (permitir espacios y caracteres comunes)
    const sanitizedFilename = filename.replace(/[/\\]/g, '').replace(/\.\./g, '');
    
    const filePath = path.join(RECIBOS_DIR, sanitizedFilename);
    
    // Verificar que el archivo existe
    try {
      await fs.access(filePath);
    } catch {
      // Intentar buscar el archivo con variaciones más flexibles
      try {
        const files = await fs.readdir(RECIBOS_DIR);
        
        // Normalizar nombres para comparación (sin espacios extra, lowercase)
        const normalizedSearch = sanitizedFilename.toLowerCase().replace(/\s+/g, ' ');
        
        // Buscar coincidencias exactas primero
        let matchingFile = files.find(f => 
          f.toLowerCase() === sanitizedFilename.toLowerCase() ||
          decodeURIComponent(f) === sanitizedFilename ||
          f === sanitizedFilename
        );
        
        // Si no encontramos exacto, buscar por coincidencia parcial
        // Esto maneja casos como "SUMAR_recibos sueldos 09.2025 -4.pdf" buscando "SUMAR_recibos sueldos 09.2025 -4-1.pdf"
        if (!matchingFile) {
          const searchName = sanitizedFilename.toLowerCase().replace(/\.pdf$/, '');
          
          // Estrategia 1: Buscar archivos que empiecen con el nombre buscado (permite sufijos)
          // Ej: "sumar_recibos sueldos 09.2025 -4" encuentra "sumar_recibos sueldos 09.2025 -4-1.pdf"
          matchingFile = files.find(f => {
            const fLower = f.toLowerCase();
            return fLower.startsWith(searchName) && fLower.endsWith('.pdf');
          });
          
          // Estrategia 2: Si no encontramos, buscar por patrón de número
          // Extraer el número final si existe (ej: " -4" de "sumar_recibos sueldos 09.2025 -4")
          if (!matchingFile) {
            const numberMatch = searchName.match(/\s*-(\d+)$/);
            
            if (numberMatch) {
              const targetNumber = numberMatch[1];
              // Base sin el número final (ej: "sumar_recibos sueldos 09.2025")
              const baseWithoutNumber = searchName.replace(/\s*-\d+$/, '').trim();
              
              // Buscar archivos que:
              // 1. Empiecen con baseWithoutNumber
              // 2. Tengan el número buscado seguido de guión y otro número (ej: " -4-1")
              // 3. Terminen en .pdf
              matchingFile = files.find(f => {
                const fLower = f.toLowerCase().replace(/\.pdf$/, '');
                
                // Debe empezar con la base
                if (!fLower.startsWith(baseWithoutNumber)) return false;
                
                // Debe tener el patrón: base + " -" + número + "-" + número opcional
                // Escapar caracteres especiales para regex
                const escapedBase = baseWithoutNumber.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const pattern = new RegExp(`^${escapedBase}\\s*-${targetNumber}-\\d+$`);
                
                return pattern.test(fLower);
              });
            }
          }
          
          // Estrategia 3: Fallback - buscar por prefijo largo
          if (!matchingFile) {
            // Tomar los primeros 30 caracteres del nombre buscado como prefijo
            const prefix = searchName.substring(0, Math.max(30, searchName.length - 10));
            matchingFile = files.find(f => {
              const fLower = f.toLowerCase();
              return fLower.startsWith(prefix) && fLower.endsWith('.pdf');
            });
          }
        }
        
        if (matchingFile) {
          const actualPath = path.join(RECIBOS_DIR, matchingFile);
          const fileBuffer = await fs.readFile(actualPath);
          
          console.log(`✅ Archivo encontrado con variación: "${sanitizedFilename}" → "${matchingFile}"`);
          
          return new NextResponse(fileBuffer, {
            headers: {
              'Content-Type': 'application/pdf',
              'Content-Disposition': `inline; filename="${matchingFile}"`,
            },
          });
        } else {
          console.warn(`⚠️ Archivo no encontrado: "${sanitizedFilename}"`);
          console.warn(`   Buscando en: ${RECIBOS_DIR}`);
          console.warn(`   Total archivos en directorio: ${files.length}`);
          // Mostrar algunos archivos similares para debugging
          const similarFiles = files
            .filter(f => f.toLowerCase().includes('sumar') || f.toLowerCase().includes(sanitizedFilename.toLowerCase().substring(0, 10)))
            .slice(0, 5);
          if (similarFiles.length > 0) {
            console.warn(`   Archivos similares encontrados:`, similarFiles);
          }
        }
      } catch (readError) {
        console.error('Error buscando archivo alternativo:', readError);
      }
      
      return NextResponse.json({ 
        error: 'Archivo no encontrado',
        filename: sanitizedFilename,
        directory: RECIBOS_DIR
      }, { status: 404 });
    }

    // Leer y servir el archivo
    const fileBuffer = await fs.readFile(filePath);
    
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${sanitizedFilename}"`,
      },
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo PDF:', error);
    return NextResponse.json({ 
      error: 'Error obteniendo archivo PDF' 
    }, { status: 500 });
  }
}

