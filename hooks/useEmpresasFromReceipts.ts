// hooks/useEmpresasFromReceipts.ts
'use client';

import { useState, useEffect } from 'react';
import { useCentralizedDataManager } from '@/hooks/useCentralizedDataManager';

export function useEmpresasFromReceipts() {
  const { dataManager } = useCentralizedDataManager();
  const [empresas, setEmpresas] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadEmpresas = async () => {
      try {
        setIsLoading(true);
        
        // Obtener empresas de la tabla empresas (creadas manualmente)
        const empresasFromDB = await dataManager.getEmpresas();
        
        // Obtener todas las empresas únicas de la tabla consolidated
        const allConsolidated = await dataManager.getConsolidated();
        
        // Extraer empresas únicas de recibos
        const empresasSet = new Set<string>();
        allConsolidated.forEach(item => {
          if (item.data?.EMPRESA && item.data.EMPRESA.trim()) {
            empresasSet.add(item.data.EMPRESA);
          }
        });
        
        // Agregar empresas creadas manualmente
        empresasFromDB.forEach(empresa => {
          if (empresa.nombre && empresa.nombre.trim()) {
            empresasSet.add(empresa.nombre);
          }
        });
        
        // Debug: Log todas las empresas encontradas
        console.log('🔍 Debug useEmpresasFromReceipts - Empresas encontradas:', Array.from(empresasSet));
        console.log('🔍 Debug useEmpresasFromReceipts - Total registros:', allConsolidated.length);
        
        // Convertir a array y ordenar
        const empresasArray = Array.from(empresasSet).sort();
        setEmpresas(empresasArray);
        
      } catch (error) {
        console.error('Error cargando empresas desde recibos:', error);
        setEmpresas([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadEmpresas();
  }, []);

  return { empresas, isLoading };
}
