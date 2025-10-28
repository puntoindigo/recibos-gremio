// scripts/migrate-to-supabase-complete.ts
import { getSupabaseManager } from '../lib/supabase-manager';
import { getSupabaseBackupManager } from '../lib/supabase-backup';

async function migrateToSupabase() {
  console.log('🚀 Iniciando migración completa a Supabase...');
  
  const manager = getSupabaseManager();
  const backupManager = getSupabaseBackupManager();
  
  try {
    // 1. Verificar conexión
    console.log('🔍 Verificando conexión con Supabase...');
    const connectionTest = await manager.testConnection();
    
    if (!connectionTest.success) {
      throw new Error(`Error de conexión: ${connectionTest.error}`);
    }
    
    console.log('✅ Conexión con Supabase establecida');
    
    // 2. Obtener estadísticas actuales
    console.log('📊 Obteniendo estadísticas actuales...');
    const stats = await manager.getStats();
    
    console.log('📈 Estadísticas actuales:');
    console.log(`  - Recibos: ${stats.receipts}`);
    console.log(`  - Consolidados: ${stats.consolidated}`);
    console.log(`  - Descuentos: ${stats.descuentos}`);
    console.log(`  - Items pendientes: ${stats.pendingItems}`);
    
    // 3. Crear backup de seguridad
    console.log('💾 Creando backup de seguridad...');
    const backupResult = await backupManager.createBackup();
    
    if (!backupResult.success) {
      throw new Error(`Error creando backup: ${backupResult.error}`);
    }
    
    console.log(`✅ Backup creado: ${backupResult.data?.metadata.totalRecords || 0} registros`);
    
    // 4. Verificar integridad de datos
    console.log('🔍 Verificando integridad de datos...');
    
    const [receipts, consolidated, descuentos, pendingItems] = await Promise.all([
      manager.getAllReceipts(),
      manager.getConsolidated(),
      manager.getAllDescuentos(),
      manager.getPendingItems()
    ]);
    
    console.log('📋 Verificación de datos:');
    console.log(`  - Recibos cargados: ${receipts.length}`);
    console.log(`  - Consolidados cargados: ${consolidated.length}`);
    console.log(`  - Descuentos cargados: ${descuentos.length}`);
    console.log(`  - Items pendientes cargados: ${pendingItems.length}`);
    
    // 5. Configurar aplicación para usar Supabase
    console.log('⚙️ Configurando aplicación para usar Supabase...');
    
    await manager.setAppConfig('enableSupabaseStorage', true);
    await manager.setAppConfig('migrationCompleted', true);
    await manager.setAppConfig('migrationDate', new Date().toISOString());
    
    console.log('✅ Configuración completada');
    
    // 6. Generar reporte final
    console.log('📊 Generando reporte final...');
    
    const finalStats = await manager.getStats();
    
    console.log('\n🎉 MIGRACIÓN COMPLETADA EXITOSAMENTE');
    console.log('=====================================');
    console.log(`📅 Fecha: ${new Date().toLocaleString()}`);
    console.log(`📊 Total de registros: ${Object.values(finalStats).reduce((a, b) => a + b, 0)}`);
    console.log(`📋 Desglose:`);
    console.log(`  - Recibos: ${finalStats.receipts}`);
    console.log(`  - Consolidados: ${finalStats.consolidated}`);
    console.log(`  - Descuentos: ${finalStats.descuentos}`);
    console.log(`  - Items pendientes: ${finalStats.pendingItems}`);
    console.log(`💾 Backup creado: ${backupResult.data?.metadata.timestamp}`);
    console.log(`🔗 Storage: Supabase`);
    
    return {
      success: true,
      stats: finalStats,
      backup: backupResult.data
    };
    
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  migrateToSupabase()
    .then(result => {
      if (result.success) {
        console.log('\n✅ Migración completada exitosamente');
        process.exit(0);
      } else {
        console.log('\n❌ Migración falló:', result.error);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Error fatal:', error);
      process.exit(1);
    });
}

export { migrateToSupabase };
