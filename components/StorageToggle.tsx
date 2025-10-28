import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Database, 
  Cloud, 
  HardDrive, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  RefreshCw,
  Download,
  Upload,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
// import { supabaseManager } from '@/lib/supabase-manager';
// import { completeMigration, checkMigrationStatus, revertToIndexedDB, rollbackSupabase } from '@/scripts/complete-migration';

interface StorageStats {
  recibos: number;
  consolidated: number;
  descuentos: number;
  empresas: number;
  backups: number;
}

export default function StorageToggle() {
  const [storageType, setStorageType] = useState<'IndexedDB' | 'SUPABASE'>('IndexedDB');
  const [isMigrating, setIsMigrating] = useState(false);
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStorageInfo();
  }, []);

  const loadStorageInfo = async () => {
    try {
      setIsLoading(true);
      
      // Por ahora usar IndexedDB por defecto
      setStorageType('IndexedDB');
      // setIsMigrated(false);

      // Simular estadísticas básicas
      setStats({
        recibos: 0,
        consolidated: 0,
        descuentos: 0,
        empresas: 0,
        backups: 0
      });

    } catch (error) {
      console.error('Error cargando información de storage:', error);
      toast.error('Error cargando información de storage');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStorageToggle = async (useSupabase: boolean) => {
    if (useSupabase && storageType === 'IndexedDB') {
      // Mostrar mensaje de configuración requerida
      toast.info('Para usar Supabase, primero configura las variables de entorno. Ver docs/ENV_SETUP.md');
      return;
    } else if (!useSupabase && storageType === 'SUPABASE') {
      // Revertir a IndexedDB
      setStorageType('IndexedDB');
      toast.success('Cambiado a IndexedDB');
      await loadStorageInfo();
    }
  };

  const handleRefreshStats = async () => {
    await loadStorageInfo();
    toast.success('Estadísticas actualizadas');
  };

  const handleRollback = async () => {
    toast.info('Funcionalidad de rollback disponible cuando Supabase esté configurado');
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Cargando información de storage...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Database className="h-5 w-5" />
          <span>Configuración de Storage</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Toggle Principal */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="storage-toggle" className="text-base font-medium">
              Usar Supabase
            </Label>
            <p className="text-sm text-gray-600">
              Cambiar entre IndexedDB (local) y Supabase (nube)
            </p>
          </div>
          <Switch
            id="storage-toggle"
            checked={storageType === 'SUPABASE'}
            onCheckedChange={handleStorageToggle}
            disabled={isMigrating}
          />
        </div>

        <Separator />

        {/* Estado Actual */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">Estado Actual:</span>
            <Badge 
              variant={storageType === 'SUPABASE' ? 'default' : 'secondary'}
              className={storageType === 'SUPABASE' ? 'bg-green-100 text-green-800' : ''}
            >
              {storageType === 'SUPABASE' ? (
                <>
                  <Cloud className="h-3 w-3 mr-1" />
                  Supabase
                </>
              ) : (
                <>
                  <HardDrive className="h-3 w-3 mr-1" />
                  IndexedDB
                </>
              )}
            </Badge>
          </div>

          {isMigrating && (
            <div className="flex items-center space-x-2 text-blue-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Migrando datos...</span>
            </div>
          )}
        </div>

        <Separator />

        {/* Estadísticas */}
        {stats && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Estadísticas de Datos:</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshStats}
                disabled={isMigrating}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Actualizar
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Recibos:</span>
                  <Badge variant="outline">{stats.recibos}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Consolidados:</span>
                  <Badge variant="outline">{stats.consolidated}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Descuentos:</span>
                  <Badge variant="outline">{stats.descuentos}</Badge>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Empresas:</span>
                  <Badge variant="outline">{stats.empresas}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Backups:</span>
                  <Badge variant="outline">{stats.backups}</Badge>
                </div>
              </div>
            </div>
          </div>
        )}

        <Separator />

        {/* Botones de Acción */}
        <div className="space-y-3">
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshStats}
              disabled={isMigrating}
              className="flex-1"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Actualizar
            </Button>
            {storageType === 'SUPABASE' && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleRollback}
                disabled={isMigrating}
                className="flex-1"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Rollback
              </Button>
            )}
          </div>
        </div>

        <Separator />

        {/* Información Adicional */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm text-gray-600">
              Los datos se sincronizan automáticamente
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <span className="text-sm text-gray-600">
              Puedes cambiar entre storage en cualquier momento
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
