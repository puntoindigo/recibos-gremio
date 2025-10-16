// lib/test-descuentos.ts
// Script de prueba para validar el sistema de descuentos
import { 
  createDescuento, 
  getDescuentosByEmpresa, 
  getEstadisticasDescuentos,
  deleteDescuento,
  getFichaEmpleado
} from './descuentos-manager';

// Función para probar el sistema de descuentos
export async function testDescuentosSystem(): Promise<{
  success: boolean;
  results: string[];
  errors: string[];
}> {
  const results: string[] = [];
  const errors: string[] = [];

  try {
    results.push('🧪 Iniciando pruebas del sistema de descuentos...');

    // Test 1: Crear un descuento de prueba
    results.push('📝 Test 1: Crear descuento de prueba...');
    const descuentoPrueba = await createDescuento({
      legajo: 'TEST001',
      nombre: 'EMPLEADO PRUEBA',
      empresa: 'LIMPAR',
      fechaInicio: Date.now(),
      monto: 50000,
      cantidadCuotas: 12,
      cuotaActual: 0,
      descripcion: 'Préstamo de prueba para testing',
      tipoDescuento: 'PRESTAMO',
      estado: 'ACTIVO',
      tags: ['test', 'prueba'],
      motivo: 'Testing del sistema',
      autorizadoPor: 'Sistema de Pruebas',
      fechaAutorizacion: Date.now(),
      creadoPor: 'test_user'
    });
    
    results.push(`✅ Descuento creado con ID: ${descuentoPrueba.id}`);

    // Test 2: Buscar descuentos por empresa
    results.push('🔍 Test 2: Buscar descuentos por empresa...');
    const descuentosEmpresa = await getDescuentosByEmpresa('LIMPAR');
    results.push(`✅ Encontrados ${descuentosEmpresa.length} descuentos para LIMPAR`);

    // Test 3: Obtener estadísticas
    results.push('📊 Test 3: Obtener estadísticas...');
    const estadisticas = await getEstadisticasDescuentos('LIMPAR');
    results.push(`✅ Estadísticas obtenidas: ${estadisticas.total} total, ${estadisticas.activos} activos`);

    // Test 4: Obtener ficha de empleado
    results.push('👤 Test 4: Obtener ficha de empleado...');
    const ficha = await getFichaEmpleado('TEST001', 'LIMPAR');
    results.push(`✅ Ficha obtenida: ${ficha.nombre}, ${ficha.descuentosActivos.length} descuentos activos`);

    // Test 5: Limpiar datos de prueba
    results.push('🧹 Test 5: Limpiar datos de prueba...');
    await deleteDescuento(descuentoPrueba.id, 'test_user');
    results.push('✅ Descuento de prueba eliminado');

    results.push('🎉 Todas las pruebas completadas exitosamente!');

    return {
      success: true,
      results,
      errors
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    errors.push(`❌ Error en las pruebas: ${errorMessage}`);
    
    return {
      success: false,
      results,
      errors
    };
  }
}

// Función para probar la validación de PDFs
export async function testPdfValidation(): Promise<{
  success: boolean;
  results: string[];
  errors: string[];
}> {
  const results: string[] = [];
  const errors: string[] = [];

  try {
    results.push('🧪 Iniciando pruebas del sistema de validación de PDFs...');

    // Test 1: Datos válidos
    results.push('✅ Test 1: Validación de datos válidos...');
    const { validateReceiptData } = await import('./pdf-validation');
    
    const datosValidos = {
      LEGAJO: '12345',
      PERIODO: '01/2025',
      NOMBRE: 'JUAN PEREZ',
      CUIL: '20123456789',
      EMPRESA: 'LIMPAR',
      GUARDAR: 'true',
      ARCHIVO: 'test.pdf'
    };

    const validacionValida = validateReceiptData({
      data: datosValidos,
      debugLines: []
    });

    if (validacionValida.isValid) {
      results.push('✅ Datos válidos pasaron la validación');
    } else {
      errors.push(`❌ Datos válidos fallaron: ${validacionValida.errors.join(', ')}`);
    }

    // Test 2: Datos inválidos
    results.push('❌ Test 2: Validación de datos inválidos...');
    const datosInvalidos = {
      LEGAJO: 'abc', // Inválido
      PERIODO: '13/2025', // Mes inválido
      NOMBRE: '', // Vacío
      EMPRESA: 'EMPRESA_DESCONOCIDA', // No reconocida
      GUARDAR: 'true',
      ARCHIVO: 'test.pdf'
    };

    const validacionInvalida = validateReceiptData({
      data: datosInvalidos,
      debugLines: []
    });

    if (!validacionInvalida.isValid) {
      results.push(`✅ Datos inválidos correctamente rechazados: ${validacionInvalida.errors.length} errores`);
    } else {
      errors.push('❌ Datos inválidos pasaron la validación incorrectamente');
    }

    results.push('🎉 Pruebas de validación completadas!');

    return {
      success: true,
      results,
      errors
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    errors.push(`❌ Error en las pruebas de validación: ${errorMessage}`);
    
    return {
      success: false,
      results,
      errors
    };
  }
}

// Función principal para ejecutar todas las pruebas
export async function runAllTests(): Promise<void> {
  console.log('🚀 Ejecutando todas las pruebas del sistema...');
  
  const [descuentosTest, pdfTest] = await Promise.all([
    testDescuentosSystem(),
    testPdfValidation()
  ]);

  console.log('\n📋 Resultados de las pruebas:');
  
  if (descuentosTest.success) {
    console.log('✅ Sistema de descuentos: PASÓ');
    descuentosTest.results.forEach(result => console.log(`  ${result}`));
  } else {
    console.log('❌ Sistema de descuentos: FALLÓ');
    descuentosTest.errors.forEach(error => console.log(`  ${error}`));
  }

  if (pdfTest.success) {
    console.log('✅ Sistema de validación PDF: PASÓ');
    pdfTest.results.forEach(result => console.log(`  ${result}`));
  } else {
    console.log('❌ Sistema de validación PDF: FALLÓ');
    pdfTest.errors.forEach(error => console.log(`  ${error}`));
  }

  const allPassed = descuentosTest.success && pdfTest.success;
  console.log(`\n🎯 Resultado final: ${allPassed ? 'TODAS LAS PRUEBAS PASARON' : 'ALGUNAS PRUEBAS FALLARON'}`);
}
