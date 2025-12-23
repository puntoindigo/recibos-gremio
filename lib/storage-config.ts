// Configuración de storage para la aplicación
export type StorageType = 'IndexedDB' | 'SUPABASE';

export interface StorageConfig {
  type: StorageType;
  isMigrated: boolean;
  lastMigration?: string;
}

class StorageConfigManager {
  private static instance: StorageConfigManager;
  private config: StorageConfig = {
    type: 'IndexedDB',
    isMigrated: false
  };

  static getInstance(): StorageConfigManager {
    if (!StorageConfigManager.instance) {
      StorageConfigManager.instance = new StorageConfigManager();
    }
    return StorageConfigManager.instance;
  }

  async getStorageType(): Promise<StorageType> {
    try {
      // Intentar obtener desde Supabase primero
      const { getSupabaseManager } = await import('./supabase-manager');
      const storageType = await getSupabaseManager().getAppConfig('storage_type');
      
      if (storageType) {
        this.config.type = storageType as StorageType;
        return this.config.type;
      }
    } catch (error) {
      console.log('No se pudo obtener configuración de Supabase, usando IndexedDB');
    }

    // Fallback a localStorage
    const localConfig = localStorage.getItem('storage_config');
    if (localConfig) {
      const parsed = JSON.parse(localConfig);
      this.config.type = parsed.type || 'IndexedDB';
    }

    return this.config.type;
  }

  async setStorageType(type: StorageType): Promise<void> {
    this.config.type = type;
    
    try {
      // Guardar en Supabase si está disponible
      const { getSupabaseManager() } = await import('./supabase-manager');
      await getSupabaseManager().setAppConfig('storage_type', type);
    } catch (error) {
      console.log('No se pudo guardar en Supabase, usando localStorage');
    }

    // También guardar en localStorage como backup
    localStorage.setItem('storage_config', JSON.stringify({
      type,
      isMigrated: this.config.isMigrated,
      lastMigration: this.config.lastMigration
    }));
  }

  async isMigrated(): Promise<boolean> {
    try {
      const { getSupabaseManager() } = await import('./supabase-manager');
      const migrationCompleted = await getSupabaseManager().getAppConfig('migration_completed');
      return migrationCompleted === true;
    } catch (error) {
      // Fallback a localStorage
      const localConfig = localStorage.getItem('storage_config');
      if (localConfig) {
        const parsed = JSON.parse(localConfig);
        return parsed.isMigrated || false;
      }
      return false;
    }
  }

  async setMigrated(migrated: boolean): Promise<void> {
    this.config.isMigrated = migrated;
    this.config.lastMigration = migrated ? new Date().toISOString() : undefined;

    try {
      const { getSupabaseManager() } = await import('./supabase-manager');
      await getSupabaseManager().setAppConfig('migration_completed', migrated);
      if (migrated) {
        await getSupabaseManager().setAppConfig('last_migration', this.config.lastMigration);
      }
    } catch (error) {
      console.log('No se pudo guardar en Supabase, usando localStorage');
    }

    // También guardar en localStorage
    localStorage.setItem('storage_config', JSON.stringify({
      type: this.config.type,
      isMigrated: migrated,
      lastMigration: this.config.lastMigration
    }));
  }

  getConfig(): StorageConfig {
    return { ...this.config };
  }
}

export const storageConfig = StorageConfigManager.getInstance();
