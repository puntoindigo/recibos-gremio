// app/api/backup/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { exportDatabaseBackup, getBackupInfo, deleteBackup, restoreFromBackup } from '@/lib/backup';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, data, filename } = body;
    
    if (action === 'create') {
      // Si vienen datos del cliente, guardarlos en el servidor
      if (data && filename) {
        try {
          const { writeFile, mkdir } = await import('fs/promises');
          const { join } = await import('path');
          
          // Crear directorio de backups si no existe
          const backupsDir = join(process.cwd(), 'backups');
          await mkdir(backupsDir, { recursive: true });
          
          // Guardar archivo de backup
          const backupPath = join(backupsDir, filename);
          await writeFile(backupPath, JSON.stringify(data, null, 2), 'utf8');
          
          return NextResponse.json({
            success: true,
            message: 'Backup guardado exitosamente',
            backupPath: filename
          });
        } catch (error) {
          return NextResponse.json({
            success: false,
            error: 'Error guardando backup: ' + (error instanceof Error ? error.message : 'Error desconocido')
          }, { status: 500 });
        }
      } else {
        // Fallback al método original (que no funciona por IndexedDB)
        const result = await exportDatabaseBackup();
        
        if (result.success) {
          return NextResponse.json({
            success: true,
            message: 'Backup creado exitosamente',
            backupPath: result.backupPath
          });
        } else {
          return NextResponse.json({
            success: false,
            error: result.error || 'Error desconocido al crear backup'
          }, { status: 500 });
        }
      }
    }
    
    if (action === 'list') {
      const { backups } = await getBackupInfo();
      
      return NextResponse.json({
        success: true,
        backups: backups.map(backup => ({
          name: backup.name,
          size: backup.size,
          created: backup.created.toISOString()
        }))
      });
    }
    
    if (action === 'delete') {
      if (!filename) {
        return NextResponse.json({
          success: false,
          error: 'Nombre de archivo requerido'
        }, { status: 400 });
      }
      
      const result = await deleteBackup(filename);
      
      if (result.success) {
        return NextResponse.json({
          success: true,
          message: 'Backup eliminado exitosamente'
        });
      } else {
        return NextResponse.json({
          success: false,
          error: result.error || 'Error desconocido al eliminar backup'
        }, { status: 500 });
      }
    }
    
    if (action === 'restore') {
      if (!filename) {
        return NextResponse.json({
          success: false,
          error: 'Nombre de archivo requerido'
        }, { status: 400 });
      }
      
      const result = await restoreFromBackup(filename);
      
      if (result.success) {
        return NextResponse.json({
          success: true,
          message: 'Backup leído exitosamente',
          data: result.data
        });
      } else {
        return NextResponse.json({
          success: false,
          error: result.error || 'Error desconocido al leer backup'
        }, { status: 500 });
      }
    }
    
    return NextResponse.json({
      success: false,
      error: 'Acción no válida'
    }, { status: 400 });
    
  } catch (error) {
    console.error('Error en API de backup:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor'
    }, { status: 500 });
  }
}
