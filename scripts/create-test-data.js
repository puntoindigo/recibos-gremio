// scripts/create-test-data.js
const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://rlqmsnycvgsiykvbatgo.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJscW1zbnljdmdzaXlrdmJhdGdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyNDEzODQsImV4cCI6MjA3NjgxNzM4NH0.Faa2R1eZysdRHzxEov_mnUU6Up5M0sQRXHz9pwUt9wE';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createTestData() {
  console.log('🚀 Creando datos de prueba en Supabase...');
  
  try {
    // 1. Crear datos consolidados de prueba
    console.log('📊 Creando datos consolidados...');
    const consolidatedData = [
      {
        id: 'consolidated-001',
        key: 'EMP001||01/2025||LIMPAR',
        legajo: 'EMP001',
        nombre: 'Juan Pérez',
        periodo: '01/2025',
        cuil: '20123456789',
        cuil_norm: '20-12345678-9',
        data: {
          EMPRESA: 'LIMPAR',
          SUELDO_BASICO: 150000,
          HORAS_EXTRAS: 5000,
          DESCUENTOS: 15000,
          NETO: 140000
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'consolidated-002',
        key: 'EMP002||01/2025||LIME',
        legajo: 'EMP002',
        nombre: 'María García',
        periodo: '01/2025',
        cuil: '27123456789',
        cuil_norm: '27-12345678-9',
        data: {
          EMPRESA: 'LIME',
          SUELDO_BASICO: 180000,
          HORAS_EXTRAS: 8000,
          DESCUENTOS: 20000,
          NETO: 168000
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'consolidated-003',
        key: 'EMP003||01/2025||SUMAR',
        legajo: 'EMP003',
        nombre: 'Carlos López',
        periodo: '01/2025',
        cuil: '20123456790',
        cuil_norm: '20-12345678-0',
        data: {
          EMPRESA: 'SUMAR',
          SUELDO_BASICO: 120000,
          HORAS_EXTRAS: 3000,
          DESCUENTOS: 12000,
          NETO: 111000
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    const { error: consolidatedError } = await supabase
      .from('consolidated')
      .insert(consolidatedData);

    if (consolidatedError) {
      console.error('❌ Error creando datos consolidados:', consolidatedError);
    } else {
      console.log('✅ Datos consolidados creados exitosamente');
    }

    // 2. Crear recibos de prueba
    console.log('📄 Creando recibos...');
    const recibosData = [
      {
        id: 'recibo-001',
        key: 'EMP001||01/2025||LIMPAR',
        legajo: 'EMP001',
        nombre: 'Juan Pérez',
        periodo: '01/2025',
        archivos: ['recibo_emp001_012025.pdf'],
        data: {
          EMPRESA: 'LIMPAR',
          SUELDO_BASICO: 150000,
          HORAS_EXTRAS: 5000,
          DESCUENTOS: 15000,
          NETO: 140000
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'recibo-002',
        key: 'EMP002||01/2025||LIME',
        legajo: 'EMP002',
        nombre: 'María García',
        periodo: '01/2025',
        archivos: ['recibo_emp002_012025.pdf'],
        data: {
          EMPRESA: 'LIME',
          SUELDO_BASICO: 180000,
          HORAS_EXTRAS: 8000,
          DESCUENTOS: 20000,
          NETO: 168000
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    const { error: recibosError } = await supabase
      .from('recibos')
      .insert(recibosData);

    if (recibosError) {
      console.error('❌ Error creando recibos:', recibosError);
    } else {
      console.log('✅ Recibos creados exitosamente');
    }

    // 3. Crear descuentos de prueba
    console.log('💰 Creando descuentos...');
    const descuentosData = [
      {
        id: 'descuento-001',
        legajo: 'EMP001',
        nombre: 'Juan Pérez',
        descripcion: 'Préstamo personal',
        monto: 50000,
        cuotas: 10,
        cuotas_pagadas: 3,
        estado: 'ACTIVO',
        fecha_inicio: '2025-01-01',
        fecha_fin: '2025-10-01',
        tags: ['préstamo', 'personal'],
        observaciones: 'Préstamo aprobado por RRHH',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'descuento-002',
        legajo: 'EMP002',
        nombre: 'María García',
        descripcion: 'Adelanto de sueldo',
        monto: 30000,
        cuotas: 3,
        cuotas_pagadas: 1,
        estado: 'ACTIVO',
        fecha_inicio: '2025-01-15',
        fecha_fin: '2025-04-15',
        tags: ['adelanto', 'sueldo'],
        observaciones: 'Adelanto por emergencia familiar',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    const { error: descuentosError } = await supabase
      .from('descuentos')
      .insert(descuentosData);

    if (descuentosError) {
      console.error('❌ Error creando descuentos:', descuentosError);
    } else {
      console.log('✅ Descuentos creados exitosamente');
    }

    // 4. Crear empresas de prueba
    console.log('🏢 Creando empresas...');
    const empresasData = [
      {
        id: 'empresa-001',
        nombre: 'LIMPAR',
        descripcion: 'Limpieza y Parquización',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'empresa-002',
        nombre: 'LIME',
        descripcion: 'Limpieza Integral Municipal',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'empresa-003',
        nombre: 'SUMAR',
        descripcion: 'Servicios Urbanos Municipales',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    const { error: empresasError } = await supabase
      .from('empresas')
      .insert(empresasData);

    if (empresasError) {
      console.error('❌ Error creando empresas:', empresasError);
    } else {
      console.log('✅ Empresas creadas exitosamente');
    }

    console.log('🎉 Datos de prueba creados exitosamente!');
    console.log('📊 Resumen:');
    console.log('  - 3 registros consolidados');
    console.log('  - 2 recibos');
    console.log('  - 2 descuentos');
    console.log('  - 3 empresas');
    console.log('🔄 Recarga la página para ver los datos');

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

createTestData();
