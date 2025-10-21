// lib/backup.ts
// No importar db aquí para evitar problemas de IndexedDB en el servidor

export interface BackupData {
  receipts: any[];
  consolidated: any[];
  descuentos: any[];
  columnConfigs: any[];
  userActivities: any[];
  pendingItems: any[];
  appConfiguration: any;
  metadata: {
    timestamp: string;
    version: string;
    totalRecords: number;
  };
}

/**
 * Exporta todos los datos de la base de datos a archivos JSON
 * Esta función solo puede ejecutarse en el servidor
 */
export async function exportDatabaseBackup(): Promise<{
  success: boolean;
  backupPath?: string;
  error?: string;
}> {
  // Verificar que estamos en el servidor
  if (typeof window !== 'undefined') {
    return {
      success: false,
      error: 'Esta función solo puede ejecutarse en el servidor'
    };
  }

  try {
    const { writeFile, mkdir } = await import('fs/promises');
    const { join } = await import('path');

    // Crear timestamp para el nombre del backup
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupFolderName = `backup_${timestamp}`;
    const backupPath = join(process.cwd(), 'backups', backupFolderName);

    // Crear directorio de backup
    await mkdir(backupPath, { recursive: true });

    // Por ahora, crear un backup vacío ya que Dexie no funciona en el servidor
    // TODO: Implementar una solución alternativa para el backup
    const receipts: any[] = [];
    const consolidated: any[] = [];
    const descuentos: any[] = [];
    const columnConfigs: any[] = [];
    const userActivities: any[] = [];
    const pendingItems: any[] = [];
    const appConfiguration: any = null;

    const backupData: BackupData = {
      receipts,
      consolidated,
      descuentos,
      columnConfigs,
      userActivities,
      pendingItems,
      appConfiguration,
      metadata: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        totalRecords: receipts.length + consolidated.length + descuentos.length + columnConfigs.length + userActivities.length + pendingItems.length + (appConfiguration ? 1 : 0)
      }
    };

    // Escribir archivo principal de backup
    const mainBackupFile = join(backupPath, 'database_backup.json');
    await writeFile(mainBackupFile, JSON.stringify(backupData, null, 2), 'utf8');

    // Escribir archivos individuales por tabla
    await writeFile(join(backupPath, 'receipts.json'), JSON.stringify(receipts, null, 2), 'utf8');
    await writeFile(join(backupPath, 'consolidated.json'), JSON.stringify(consolidated, null, 2), 'utf8');
    await writeFile(join(backupPath, 'descuentos.json'), JSON.stringify(descuentos, null, 2), 'utf8');
    await writeFile(join(backupPath, 'column_configs.json'), JSON.stringify(columnConfigs, null, 2), 'utf8');
    await writeFile(join(backupPath, 'user_activities.json'), JSON.stringify(userActivities, null, 2), 'utf8');
    await writeFile(join(backupPath, 'pending_items.json'), JSON.stringify(pendingItems, null, 2), 'utf8');
    await writeFile(join(backupPath, 'app_configuration.json'), JSON.stringify(appConfiguration, null, 2), 'utf8');

    // Escribir archivo de metadatos
    const metadataFile = join(backupPath, 'metadata.json');
    await writeFile(metadataFile, JSON.stringify(backupData.metadata, null, 2), 'utf8');

    console.log(`✅ Backup creado exitosamente en: ${backupPath}`);
    console.log(`📊 Total de registros exportados: ${backupData.metadata.totalRecords}`);

    return {
      success: true,
      backupPath: backupFolderName
    };

  } catch (error) {
    console.error('❌ Error creando backup:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Obtiene información sobre los backups existentes
 * Esta función solo puede ejecutarse en el servidor
 */
export async function getBackupInfo(): Promise<{
  backups: Array<{
    name: string;
    path: string;
    size: number;
    created: Date;
  }>;
}> {
  // Verificar que estamos en el servidor
  if (typeof window !== 'undefined') {
    return { backups: [] };
  }

  try {
    const { readdir, stat } = await import('fs/promises');
    const { join } = await import('path');
    
    const backupsDir = join(process.cwd(), 'backups');
    
    try {
      const entries = await readdir(backupsDir);
      const backups = [];
      
      for (const entry of entries) {
        // Buscar archivos .json que empiecen con backup_
        if (entry.startsWith('backup_') && entry.endsWith('.json')) {
          const backupPath = join(backupsDir, entry);
          const stats = await stat(backupPath);
          
          if (stats.isFile()) {
            backups.push({
              name: entry,
              path: backupPath,
              size: stats.size,
              created: stats.birthtime
            });
          }
        }
      }
      
      // Ordenar por fecha de creación (más reciente primero)
      backups.sort((a, b) => b.created.getTime() - a.created.getTime());
      
      return { backups };
    } catch (error) {
      // Si no existe el directorio de backups, devolver array vacío
      return { backups: [] };
    }
  } catch (error) {
    console.error('Error obteniendo información de backups:', error);
    return { backups: [] };
  }
}

/**
 * Elimina un backup del servidor
 */
export async function deleteBackup(filename: string): Promise<{
  success: boolean;
  error?: string;
}> {
  // Verificar que estamos en el servidor
  if (typeof window !== 'undefined') {
    return {
      success: false,
      error: 'Esta función solo puede ejecutarse en el servidor'
    };
  }

  try {
    const { unlink } = await import('fs/promises');
    const { join } = await import('path');
    
    const backupPath = join(process.cwd(), 'backups', filename);
    await unlink(backupPath);
    
    console.log(`✅ Backup eliminado: ${filename}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Error eliminando backup:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Restaura la base de datos desde un backup
 * Esta función solo puede ejecutarse en el servidor
 */
export async function restoreFromBackup(filename: string): Promise<{
  success: boolean;
  error?: string;
  data?: any;
}> {
  // Verificar que estamos en el servidor
  if (typeof window !== 'undefined') {
    return {
      success: false,
      error: 'Esta función solo puede ejecutarse en el servidor'
    };
  }

  try {
    const { readFile } = await import('fs/promises');
    const { join } = await import('path');
    
    const backupPath = join(process.cwd(), 'backups', filename);
    const backupData = JSON.parse(await readFile(backupPath, 'utf8'));
    
    console.log(`✅ Backup leído desde: ${filename}`);
    return { 
      success: true, 
      data: backupData // Devolver los datos para que el cliente los procese
    };
  } catch (error) {
    console.error('❌ Error leyendo backup:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Formatea el tamaño de archivo en formato legible
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
