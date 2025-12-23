import { getSupabaseManager } from '../lib/supabase-manager';
import { db } from '../lib/db';

// Script para migrar todos los datos desde IndexedDB a Supabase
export async function migrateToSupabase(): Promise<boolean> {
  try {
    console.log('🚀 Iniciando migración completa a Supabase...');
    
    // 1. MIGRAR RECIBOS
    console.log('📄 Migrando recibos...');
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
    }
    console.log(`✅ ${recibos.length} recibos migrados`);

    // 2. MIGRAR CONSOLIDATED
    console.log('👥 Migrando datos consolidados...');
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
    }
    console.log(`✅ ${consolidated.length} registros consolidados migrados`);

    // 3. MIGRAR DESCUENTOS
    console.log('💰 Migrando descuentos...');
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
    }
    console.log(`✅ ${descuentos.length} descuentos migrados`);

    // 4. MIGRAR CONFIGURACIONES DE COLUMNAS
    console.log('⚙️ Migrando configuraciones de columnas...');
    const columnConfigs = await db.columnConfigs.toArray();
    for (const config of columnConfigs) {
      await getSupabaseManager().saveColumnConfig({
        table_name: config.tableName,
        column_name: config.columnName,
        alias: config.alias,
        visible: config.visible,
        order_index: config.orderIndex
      });
    }
    console.log(`✅ ${columnConfigs.length} configuraciones de columnas migradas`);

    // 5. MIGRAR ACTIVIDADES DE USUARIO
    console.log('📊 Migrando actividades de usuario...');
    const userActivities = await db.userActivities.toArray();
    for (const activity of userActivities) {
      await getSupabaseManager().createUserActivity({
        user_email: activity.userEmail,
        action: activity.action,
        details: activity.details
      });
    }
    console.log(`✅ ${userActivities.length} actividades migradas`);

    // 6. MIGRAR EMPRESAS
    console.log('🏢 Migrando empresas...');
    const empresas = await db.empresas.toArray();
    for (const empresa of empresas) {
      await getSupabaseManager().createEmpresa({
        nombre: empresa.nombre,
        logo_url: empresa.logoUrl
      });
    }
    console.log(`✅ ${empresas.length} empresas migradas`);

    // 7. MIGRAR BACKUPS
    console.log('💾 Migrando backups...');
    const backups = await db.backups.toArray();
    for (const backup of backups) {
      await getSupabaseManager().createBackup({
        name: backup.name,
        description: backup.description,
        data: backup.data
      });
    }
    console.log(`✅ ${backups.length} backups migrados`);

    // 8. CONFIGURAR TIPO DE STORAGE
    console.log('🔧 Configurando tipo de storage...');
    await getSupabaseManager().setAppConfig('storage_type', 'SUPABASE');
    await getSupabaseManager().setAppConfig('migration_completed', true);

    console.log('🎉 ¡Migración completada exitosamente!');
    return true;

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    return false;
  }
}

// Función para verificar el estado de la migración
export async function checkMigrationStatus(): Promise<{
  isMigrated: boolean;
  stats: any;
}> {
  try {
    const storageType = await getSupabaseManager().getAppConfig('storage_type');
    const migrationCompleted = await getSupabaseManager().getAppConfig('migration_completed');
    const stats = await getSupabaseManager().getStats();

    return {
      isMigrated: storageType === 'SUPABASE' && migrationCompleted === true,
      stats
    };
  } catch (error) {
    console.error('Error verificando estado de migración:', error);
    return {
      isMigrated: false,
      stats: null
    };
  }
}

// Función para revertir a IndexedDB
export async function revertToIndexedDB(): Promise<boolean> {
  try {
    console.log('🔄 Revirtiendo a IndexedDB...');
    
    // Cambiar configuración
    await getSupabaseManager().setAppConfig('storage_type', 'IndexedDB');
    await getSupabaseManager().setAppConfig('migration_completed', false);

    console.log('✅ Revertido a IndexedDB');
    return true;
  } catch (error) {
    console.error('❌ Error revirtiendo a IndexedDB:', error);
    return false;
  }
}
