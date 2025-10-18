// lib/backup-client.ts
// Funciones de backup que funcionan en el cliente

import { db } from './db';

export interface BackupData {
  receipts: any[];
  consolidated: any[];
  descuentos: any[];
  columnConfigs: any[];
  userActivities: any[];
  metadata: {
    timestamp: string;
    version: string;
    totalRecords: number;
  };
}

/**
 * Exporta todos los datos de la base de datos a un objeto JSON
 * Esta función funciona en el cliente
 */
export async function exportDatabaseBackupClient(): Promise<{
  success: boolean;
  data?: BackupData;
  error?: string;
}> {
  try {
    // Exportar todos los datos
    const receipts = await db.receipts.toArray();
    const consolidated = await db.consolidated.toArray();
    const descuentos = await db.descuentos.toArray();
    const columnConfigs = await db.columnConfigs.toArray();
    const userActivities = await db.userActivities.toArray();

    const backupData: BackupData = {
      receipts,
      consolidated,
      descuentos,
      columnConfigs,
      userActivities,
      metadata: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        totalRecords: receipts.length + consolidated.length + descuentos.length + columnConfigs.length + userActivities.length
      }
    };

    console.log(`✅ Backup de datos preparado: ${backupData.metadata.totalRecords} registros`);

    return {
      success: true,
      data: backupData
    };

  } catch (error) {
    console.error('❌ Error preparando backup:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Descarga un archivo JSON desde el cliente
 */
export function downloadBackupFile(data: BackupData, filename: string) {
  try {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
    return true;
  } catch (error) {
    console.error('Error descargando archivo:', error);
    return false;
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

/**
 * Restaura la base de datos desde datos de backup
 * Esta función solo puede ejecutarse en el cliente
 */
export async function restoreDatabaseFromBackup(backupData: BackupData): Promise<{
  success: boolean;
  error?: string;
}> {
  if (typeof window === 'undefined') {
    return { success: false, error: 'Esta función solo puede ejecutarse en el cliente' };
  }

  try {
    // Limpiar base de datos actual
    await db.receipts.clear();
    await db.consolidated.clear();
    await db.descuentos.clear();
    await db.columnConfigs.clear();
    await db.userActivities.clear();
    
    // Restaurar datos
    if (backupData.receipts && backupData.receipts.length > 0) {
      await db.receipts.bulkAdd(backupData.receipts);
    }
    if (backupData.consolidated && backupData.consolidated.length > 0) {
      await db.consolidated.bulkAdd(backupData.consolidated);
    }
    if (backupData.descuentos && backupData.descuentos.length > 0) {
      await db.descuentos.bulkAdd(backupData.descuentos);
    }
    if (backupData.columnConfigs && backupData.columnConfigs.length > 0) {
      await db.columnConfigs.bulkAdd(backupData.columnConfigs);
    }
    if (backupData.userActivities && backupData.userActivities.length > 0) {
      await db.userActivities.bulkAdd(backupData.userActivities);
    }
    
    console.log('✅ Base de datos restaurada exitosamente');
    return { success: true };
  } catch (error) {
    console.error('❌ Error restaurando base de datos:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Vacía completamente todas las bases de datos
 * Esta función solo puede ejecutarse en el cliente
 */
export async function clearAllDatabases(): Promise<{
  success: boolean;
  error?: string;
}> {
  if (typeof window === 'undefined') {
    return { success: false, error: 'Esta función solo puede ejecutarse en el cliente' };
  }

  try {
    // Limpiar todas las tablas
    await db.receipts.clear();
    await db.consolidated.clear();
    await db.descuentos.clear();
    await db.columnConfigs.clear();
    await db.userActivities.clear();
    await db.savedControls.clear();
    await db.control.clear();
    
    console.log('✅ Todas las bases de datos han sido vaciadas');
    return { success: true };
  } catch (error) {
    console.error('❌ Error vaciando bases de datos:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}
