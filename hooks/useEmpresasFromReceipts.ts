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
        
        // Agregar empresas creadas manualmente (solo si tienen nombre válido)
        empresasFromDB.forEach(empresa => {
          // Manejar tanto strings como objetos
          const nombre = typeof empresa === 'string' ? empresa : (empresa?.nombre || empresa);
          if (nombre && typeof nombre === 'string' && nombre.trim() && nombre !== 'undefined') {
            empresasSet.add(nombre);
          }
        });
        
        // Verificar si hay registros con "Sin nombre" como empresa en los datos consolidados
        const registrosSinNombre = allConsolidated.filter(item => 
          item.data?.EMPRESA === 'Sin nombre'
        );
        
        // Convertir a array y ordenar (incluir "Sin nombre" solo si hay registros consolidados con esa empresa)
        const empresasArray = Array.from(empresasSet)
          .filter(emp => {
            if (!emp || !emp.trim() || emp === 'undefined') return false;
            // Incluir "Sin nombre" solo si hay registros consolidados con esa empresa (no solo si está en la BD)
            if (emp === 'Sin nombre' || emp.trim() === 'Sin nombre') {
              return registrosSinNombre.length > 0;
            }
            return true;
          })
          .sort();
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
