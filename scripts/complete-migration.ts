import { getSupabaseManager } from '../lib/supabase-manager';
import { db } from '../lib/db';
import { storageConfig } from '../lib/storage-config';

// Script completo de migración con manejo de errores y rollback
export async function completeMigration(): Promise<{
  success: boolean;
  stats: any;
  errors: string[];
}> {
  const errors: string[] = [];
  const stats = {
    recibos: 0,
    consolidated: 0,
    descuentos: 0,
    empresas: 0,
    backups: 0,
    columnConfigs: 0,
    userActivities: 0
  };

  try {
    console.log('🚀 Iniciando migración completa a Supabase...');
    
    // 1. MIGRAR RECIBOS
    console.log('📄 Migrando recibos...');
    try {
      const recibos = await db.recibos.toArray();
      for (const recibo of recibos) {
        await getSupabaseManager().createRecibo({
          key: recibo.key,
          legajo: recibo.legajo,
          nombre: recibo.nombre,
          periodo: recibo.periodo,
          archivos: recibo.archivos || [],
          data: recibo.data || {}
        });
        stats.recibos++;
      }
      console.log(`✅ ${stats.recibos} recibos migrados`);
    } catch (error) {
      const errorMsg = `Error migrando recibos: ${error}`;
      console.error(errorMsg);
      errors.push(errorMsg);
    }

    // 2. MIGRAR CONSOLIDATED
    console.log('👥 Migrando datos consolidados...');
    try {
      const consolidated = await db.consolidated.toArray();
      for (const item of consolidated) {
        await getSupabaseManager().createConsolidated({
          key: item.key,
          legajo: item.legajo,
          nombre: item.nombre,
          periodo: item.periodo,
          cuil: item.cuil,
          cuil_norm: item.cuilNorm,
          data: item.data || {}
        });
        stats.consolidated++;
      }
      console.log(`✅ ${stats.consolidated} registros consolidados migrados`);
    } catch (error) {
      const errorMsg = `Error migrando consolidated: ${error}`;
      console.error(errorMsg);
      errors.push(errorMsg);
    }

    // 3. MIGRAR DESCUENTOS
    console.log('💰 Migrando descuentos...');
    try {
      const descuentos = await db.descuentos.toArray();
      for (const descuento of descuentos) {
        await getSupabaseManager().createDescuento({
          legajo: descuento.legajo,
          nombre: descuento.nombre,
          descripcion: descuento.descripcion,
          monto: descuento.monto,
          cuotas: descuento.cuotas,
          cuotas_pagadas: descuento.cuotasPagadas || 0,
          estado: descuento.estado || 'ACTIVO',
          fecha_inicio: descuento.fechaInicio,
          fecha_fin: descuento.fechaFin,
          tags: descuento.tags || [],
          observaciones: descuento.observaciones
        });
        stats.descuentos++;
      }
      console.log(`✅ ${stats.descuentos} descuentos migrados`);
    } catch (error) {
      const errorMsg = `Error migrando descuentos: ${error}`;
      console.error(errorMsg);
      errors.push(errorMsg);
    }

    // 4. MIGRAR CONFIGURACIONES DE COLUMNAS
    console.log('⚙️ Migrando configuraciones de columnas...');
    try {
      const columnConfigs = await db.columnConfigs.toArray();
      for (const config of columnConfigs) {
        await getSupabaseManager().saveColumnConfig({
          table_name: config.tableName,
          column_name: config.columnName,
          alias: config.alias,
          visible: config.visible,
          order_index: config.orderIndex
        });
        stats.columnConfigs++;
      }
      console.log(`✅ ${stats.columnConfigs} configuraciones de columnas migradas`);
    } catch (error) {
      const errorMsg = `Error migrando column configs: ${error}`;
      console.error(errorMsg);
      errors.push(errorMsg);
    }

    // 5. MIGRAR ACTIVIDADES DE USUARIO
    console.log('📊 Migrando actividades de usuario...');
    try {
      const userActivities = await db.userActivities.toArray();
      for (const activity of userActivities) {
        await getSupabaseManager().createUserActivity({
          user_email: activity.userEmail,
          action: activity.action,
          details: activity.details
        });
        stats.userActivities++;
      }
      console.log(`✅ ${stats.userActivities} actividades migradas`);
    } catch (error) {
      const errorMsg = `Error migrando user activities: ${error}`;
      console.error(errorMsg);
      errors.push(errorMsg);
    }

    // 6. MIGRAR EMPRESAS
    console.log('🏢 Migrando empresas...');
    try {
      const empresas = await db.empresas.toArray();
      for (const empresa of empresas) {
        await getSupabaseManager().createEmpresa({
          nombre: empresa.nombre,
          logo_url: empresa.logoUrl
        });
        stats.empresas++;
      }
      console.log(`✅ ${stats.empresas} empresas migradas`);
    } catch (error) {
      const errorMsg = `Error migrando empresas: ${error}`;
      console.error(errorMsg);
      errors.push(errorMsg);
    }

    // 7. MIGRAR BACKUPS
    console.log('💾 Migrando backups...');
    try {
      const backups = await db.backups.toArray();
      for (const backup of backups) {
        await getSupabaseManager().createBackup({
          name: backup.name,
          description: backup.description,
          data: backup.data
        });
        stats.backups++;
      }
      console.log(`✅ ${stats.backups} backups migrados`);
    } catch (error) {
      const errorMsg = `Error migrando backups: ${error}`;
      console.error(errorMsg);
      errors.push(errorMsg);
    }

    // 8. CONFIGURAR TIPO DE STORAGE
    console.log('🔧 Configurando tipo de storage...');
    try {
      await storageConfig.setStorageType('SUPABASE');
      await storageConfig.setMigrated(true);
      console.log('✅ Configuración de storage actualizada');
    } catch (error) {
      const errorMsg = `Error configurando storage: ${error}`;
      console.error(errorMsg);
      errors.push(errorMsg);
    }

    const success = errors.length === 0;
    
    if (success) {
      console.log('🎉 ¡Migración completada exitosamente!');
    } else {
      console.log('⚠️ Migración completada con errores');
    }

    return { success, stats, errors };

  } catch (error) {
    const errorMsg = `Error general en migración: ${error}`;
    console.error(errorMsg);
    errors.push(errorMsg);
    return { success: false, stats, errors };
  }
}

// Función para verificar el estado de la migración
export async function checkMigrationStatus(): Promise<{
  isMigrated: boolean;
  stats: any;
  storageType: string;
}> {
  try {
    const storageType = await storageConfig.getStorageType();
    const isMigrated = await storageConfig.isMigrated();
    const stats = await getSupabaseManager().getStats();

    return {
      isMigrated,
      stats,
      storageType
    };
  } catch (error) {
    console.error('Error verificando estado de migración:', error);
    return {
      isMigrated: false,
      stats: null,
      storageType: 'IndexedDB'
    };
  }
}

// Función para revertir a IndexedDB
export async function revertToIndexedDB(): Promise<boolean> {
  try {
    console.log('🔄 Revirtiendo a IndexedDB...');
    
    await storageConfig.setStorageType('IndexedDB');
    await storageConfig.setMigrated(false);

    console.log('✅ Revertido a IndexedDB');
    return true;
  } catch (error) {
    console.error('❌ Error revirtiendo a IndexedDB:', error);
    return false;
  }
}

// Función para limpiar datos de Supabase (rollback)
export async function rollbackSupabase(): Promise<boolean> {
  try {
    console.log('🗑️ Limpiando datos de Supabase...');
    
    // Eliminar todos los datos de Supabase
    const tables = ['recibos', 'consolidated', 'descuentos', 'empresas', 'backups', 'column_configs', 'user_activities'];
    
    for (const table of tables) {
      try {
        const { error } = await getSupabaseManager().supabase
          .from(table)
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000'); // Eliminar todos los registros
        
        if (error) {
          console.error(`Error limpiando tabla ${table}:`, error);
        }
      } catch (error) {
        console.error(`Error limpiando tabla ${table}:`, error);
      }
    }

    // Revertir configuración
    await storageConfig.setStorageType('IndexedDB');
    await storageConfig.setMigrated(false);

    console.log('✅ Rollback completado');
    return true;
  } catch (error) {
    console.error('❌ Error en rollback:', error);
    return false;
  }
}
