'use client';

/**
 * SISTEMA DE VALIDACIÓN: Asegura que TODAS las consultas pasen por el sistema centralizado
 */

// Variable global para rastrear el tipo de storage activo
let currentStorageType: 'IndexedDB' | 'SUPABASE' = 'SUPABASE';

export function setCurrentStorageType(type: 'IndexedDB' | 'SUPABASE') {
  currentStorageType = type;
  console.log('🔍 validate-data-source - Storage type cambiado a:', type);
}

export function getCurrentStorageType(): 'IndexedDB' | 'SUPABASE' {
  return currentStorageType;
}

/**
 * Valida que una consulta use el sistema centralizado
 */
export function validateDataSource(source: string, expectedStorage: 'IndexedDB' | 'SUPABASE' = 'SUPABASE') {
  
  if (currentStorageType !== expectedStorage) {
    console.error('🚨 ERROR DE VALIDACIÓN DE DATA SOURCE');
    console.error('🚨 Consulta desde:', source);
    console.error('🚨 Storage esperado:', expectedStorage);
    console.error('🚨 Storage actual:', currentStorageType);
    console.error('🚨 Esta consulta debe usar el sistema centralizado');
    
    // Lanzar error para forzar el uso del sistema centralizado
    throw new Error(`🚨 CONSULTA INCORRECTA - Storage actual: ${currentStorageType}, esperado: ${expectedStorage}`);
  }
  
}

/**
 * Hook para validar el data source en componentes React
 */
export function useDataSourceValidation() {
  return {
    validateDataSource,
    getCurrentStorageType,
    setCurrentStorageType
  };
}

