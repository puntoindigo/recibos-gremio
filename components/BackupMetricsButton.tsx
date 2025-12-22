// components/BackupMetricsButton.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Settings } from 'lucide-react';
import { BackupMetricsTooltip } from './BackupMetricsTooltip';

interface BackupMetricsButtonProps {
  filename: string;
  onLoadData: (filename: string) => Promise<any>;
  cachedData?: any;
}

export function BackupMetricsButton({ filename, onLoadData, cachedData }: BackupMetricsButtonProps) {
  const [data, setData] = useState<any>(cachedData);
  const [isLoading, setIsLoading] = useState(false);

  const handleMouseEnter = async () => {
    if (!data && !isLoading) {
      setIsLoading(true);
      try {
        const backupData = await onLoadData(filename);
        setData(backupData);
      } catch (error) {
        console.error('Error cargando datos del backup:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            title="Ver detalles y métricas del backup"
            onMouseEnter={handleMouseEnter}
          >
            <Settings className="h-3 w-3" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left" className="p-0">
          {isLoading ? (
            <div className="w-80 p-4 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-sm text-gray-600 mt-2">Cargando métricas...</p>
            </div>
          ) : data ? (
            <BackupMetricsTooltip data={data} filename={filename} />
          ) : (
            <div className="w-80 p-4 text-center">
              <p className="text-sm text-gray-600">Error cargando métricas</p>
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

























