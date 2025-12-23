import React, { useState } from 'react';
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
  RefreshCw,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';

export default function StorageToggleSimple() {
  const [storageType, setStorageType] = useState<'IndexedDB' | 'SUPABASE'>('IndexedDB');
  const [isMigrating, setIsMigrating] = useState(false);

  const handleStorageToggle = async (useSupabase: boolean) => {
    if (useSupabase && storageType === 'IndexedDB') {
      toast.info('Para usar Supabase, primero configura las variables de entorno. Ver docs/ENV_SETUP.md');
      return;
    } else if (!useSupabase && storageType === 'SUPABASE') {
      setStorageType('IndexedDB');
      toast.success('Cambiado a IndexedDB');
    }
  };

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
