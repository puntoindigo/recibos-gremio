const { createClient } = require('@supabase/supabase-js');
const Dexie = require('dexie');

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Se requieren las variables de entorno NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Configuración de IndexedDB
const db = new Dexie('RecibosDB');
db.version(1).stores({
  consolidated: 'id, key, legajo, nombre, periodo, cuil, cuil_norm, data, created_at, updated_at',
  recibos: 'id, key, legajo, nombre, periodo, archivos, data, created_at, updated_at',
  descuentos: 'id, legajo, nombre, descripcion, monto, cuotas, cuotas_pagadas, estado, fecha_inicio, fecha_fin, tags, observaciones, created_at, updated_at',
  empresas: 'id, nombre, logo_url, created_at, updated_at',
  columnConfigs: 'id, table_name, column_name, alias, visible, order_index, created_at, updated_at',
  userActivities: 'id, user_email, action, details, timestamp',
  savedControls: 'id, name, data, created_at, updated_at',
  controlData: 'id, name, data, created_at, updated_at',
  appConfig: 'id, key, value, created_at, updated_at',
  backups: 'id, name, description, data, created_at'
});

async function migrateAllData() {
  console.log('🚀 Iniciando migración completa de datos...');
  
  try {
    // 1. Migrar datos consolidados
    console.log('📊 Migrando datos consolidados...');
    const consolidatedData = await db.consolidated.toArray();
    console.log(`📊 Encontrados ${consolidatedData.length} registros consolidados`);
    
    if (consolidatedData.length > 0) {
      const { error: consolidatedError } = await supabase
        .from('consolidated')
        .insert(consolidatedData);
      
      if (consolidatedError) {
        console.error('❌ Error migrando consolidated:', consolidatedError);
      } else {
        console.log('✅ Consolidated migrado exitosamente');
      }
    }

    // 2. Migrar recibos
    console.log('📄 Migrando recibos...');
    const recibosData = await db.recibos.toArray();
    console.log(`📄 Encontrados ${recibosData.length} recibos`);
    
    if (recibosData.length > 0) {
      const { error: recibosError } = await supabase
        .from('recibos')
        .insert(recibosData);
      
      if (recibosError) {
        console.error('❌ Error migrando recibos:', recibosError);
      } else {
        console.log('✅ Recibos migrados exitosamente');
      }
    }

    // 3. Migrar descuentos
    console.log('💰 Migrando descuentos...');
    const descuentosData = await db.descuentos.toArray();
    console.log(`💰 Encontrados ${descuentosData.length} descuentos`);
    
    if (descuentosData.length > 0) {
      const { error: descuentosError } = await supabase
        .from('descuentos')
        .insert(descuentosData);
      
      if (descuentosError) {
        console.error('❌ Error migrando descuentos:', descuentosError);
      } else {
        console.log('✅ Descuentos migrados exitosamente');
      }
    }

    // 4. Migrar empresas
    console.log('🏢 Migrando empresas...');
    const empresasData = await db.empresas.toArray();
    console.log(`🏢 Encontradas ${empresasData.length} empresas`);
    
    if (empresasData.length > 0) {
      const { error: empresasError } = await supabase
        .from('empresas')
        .insert(empresasData);
      
      if (empresasError) {
        console.error('❌ Error migrando empresas:', empresasError);
      } else {
        console.log('✅ Empresas migradas exitosamente');
      }
    }

    // 5. Migrar configuraciones de columnas
    console.log('⚙️ Migrando configuraciones de columnas...');
    const columnConfigsData = await db.columnConfigs.toArray();
    console.log(`⚙️ Encontradas ${columnConfigsData.length} configuraciones`);
    
    if (columnConfigsData.length > 0) {
      const { error: columnConfigsError } = await supabase
        .from('column_configs')
        .insert(columnConfigsData);
      
      if (columnConfigsError) {
        console.error('❌ Error migrando column configs:', columnConfigsError);
      } else {
        console.log('✅ Column configs migrados exitosamente');
      }
    }

    // 6. Migrar actividades de usuario
    console.log('👤 Migrando actividades de usuario...');
    const userActivitiesData = await db.userActivities.toArray();
    console.log(`👤 Encontradas ${userActivitiesData.length} actividades`);
    
    if (userActivitiesData.length > 0) {
      const { error: userActivitiesError } = await supabase
        .from('user_activities')
        .insert(userActivitiesData);
      
      if (userActivitiesError) {
        console.error('❌ Error migrando user activities:', userActivitiesError);
      } else {
        console.log('✅ User activities migrados exitosamente');
      }
    }

    // 7. Migrar controles guardados
    console.log('💾 Migrando controles guardados...');
    const savedControlsData = await db.savedControls.toArray();
    console.log(`💾 Encontrados ${savedControlsData.length} controles`);
    
    if (savedControlsData.length > 0) {
      const { error: savedControlsError } = await supabase
        .from('saved_controls')
        .insert(savedControlsData);
      
      if (savedControlsError) {
        console.error('❌ Error migrando saved controls:', savedControlsError);
      } else {
        console.log('✅ Saved controls migrados exitosamente');
      }
    }

    // 8. Migrar datos de control
    console.log('📋 Migrando datos de control...');
    const controlDataData = await db.controlData.toArray();
    console.log(`📋 Encontrados ${controlDataData.length} datos de control`);
    
    if (controlDataData.length > 0) {
      const { error: controlDataError } = await supabase
        .from('control_data')
        .insert(controlDataData);
      
      if (controlDataError) {
        console.error('❌ Error migrando control data:', controlDataError);
      } else {
        console.log('✅ Control data migrado exitosamente');
      }
    }

    // 9. Migrar configuración de app
    console.log('🔧 Migrando configuración de app...');
    const appConfigData = await db.appConfig.toArray();
    console.log(`🔧 Encontradas ${appConfigData.length} configuraciones`);
    
    if (appConfigData.length > 0) {
      const { error: appConfigError } = await supabase
        .from('app_config')
        .insert(appConfigData);
      
      if (appConfigError) {
        console.error('❌ Error migrando app config:', appConfigError);
      } else {
        console.log('✅ App config migrado exitosamente');
      }
    }

    // 10. Migrar backups
    console.log('💿 Migrando backups...');
    const backupsData = await db.backups.toArray();
    console.log(`💿 Encontrados ${backupsData.length} backups`);
    
    if (backupsData.length > 0) {
      const { error: backupsError } = await supabase
        .from('backups')
        .insert(backupsData);
      
      if (backupsError) {
        console.error('❌ Error migrando backups:', backupsError);
      } else {
        console.log('✅ Backups migrados exitosamente');
      }
    }

    // 11. Actualizar configuración de migración
    console.log('✅ Actualizando configuración de migración...');
    const { error: updateError } = await supabase
      .from('app_config')
      .upsert([
        { id: 'migration_completed', key: 'migration_completed', value: 'true' },
        { id: 'storage_type', key: 'storage_type', value: '"SUPABASE"' }
      ]);
    
    if (updateError) {
      console.error('❌ Error actualizando configuración:', updateError);
    } else {
      console.log('✅ Configuración actualizada exitosamente');
    }

    console.log('🎉 ¡Migración completa exitosa!');
    console.log('📊 Resumen:');
    console.log(`   - Consolidated: ${consolidatedData.length} registros`);
    console.log(`   - Recibos: ${recibosData.length} registros`);
    console.log(`   - Descuentos: ${descuentosData.length} registros`);
    console.log(`   - Empresas: ${empresasData.length} registros`);
    console.log(`   - Column Configs: ${columnConfigsData.length} registros`);
    console.log(`   - User Activities: ${userActivitiesData.length} registros`);
    console.log(`   - Saved Controls: ${savedControlsData.length} registros`);
    console.log(`   - Control Data: ${controlDataData.length} registros`);
    console.log(`   - App Config: ${appConfigData.length} registros`);
    console.log(`   - Backups: ${backupsData.length} registros`);

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
  }
}

// Ejecutar migración
migrateAllData();
















