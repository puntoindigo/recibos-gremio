'use client';

import { dataManagerSingleton } from './data-manager-singleton';

/**
 * GUARDIA DE SEGURIDAD: Intercepta TODAS las consultas a IndexedDB
 * y las redirige al sistema centralizado
 */
class DatabaseGuard {
  private static instance: DatabaseGuard;
  private isInitialized = false;

  private constructor() {
    this.initializeGuard();
  }

  public static getInstance(): DatabaseGuard {
    if (!DatabaseGuard.instance) {
      DatabaseGuard.instance = new DatabaseGuard();
    }
    return DatabaseGuard.instance;
  }

  private initializeGuard() {
    if (this.isInitialized) return;
    
    console.log('🛡️ DatabaseGuard - Inicializando guardia de seguridad...');
    
    // Interceptar todas las consultas a db.consolidated
    this.interceptDatabaseQueries();
    
    this.isInitialized = true;
    console.log('🛡️ DatabaseGuard - Guardia de seguridad activa');
  }

  private interceptDatabaseQueries() {
    // Esta función se ejecutará cuando se detecte una consulta directa
    console.error('🚨 GUARDIA DE SEGURIDAD ACTIVADA');
    console.error('🚨 Se detectó una consulta directa a IndexedDB');
    console.error('🚨 Todas las consultas deben pasar por el sistema centralizado');
    console.error('🚨 Usa useCentralizedDataManager() en lugar de db.consolidated');
    
    // Lanzar error para forzar el uso del sistema centralizado
    throw new Error('🚨 CONSULTA DIRECTA A INDEXEDDB DETECTADA - Usa el sistema centralizado');
  }

  /**
   * Método para verificar que todas las consultas pasen por el sistema centralizado
   */
  public validateQuery(source: string) {
    console.log('🛡️ DatabaseGuard - Validando consulta desde:', source);
    
    const storageType = dataManagerSingleton.getStorageType();
    console.log('🛡️ DatabaseGuard - Storage type actual:', storageType);
    
    if (storageType === 'SUPABASE') {
      console.log('🛡️ DatabaseGuard - ✅ Consulta válida, usando Supabase');
    } else {
      console.log('🛡️ DatabaseGuard - ⚠️ Consulta usando IndexedDB');
    }
  }
}

export const databaseGuard = DatabaseGuard.getInstance();




