// hooks/useEmpresasInUse.ts
import { useState, useEffect } from 'react';
import { db } from '@/lib/db';

export function useEmpresasInUse() {
  const [empresas, setEmpresas] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEmpresasInUse = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Obtener empresas de la tabla consolidated
        const consolidatedRecords = await db.consolidated.toArray();
        const empresasFromConsolidated = new Set<string>();
        
        consolidatedRecords.forEach(record => {
          if (record.data?.EMPRESA && record.data.EMPRESA !== 'DESCONOCIDA') {
            empresasFromConsolidated.add(record.data.EMPRESA);
          }
        });

        // Obtener empresas de la tabla receipts
        const receiptRecords = await db.receipts.toArray();
        const empresasFromReceipts = new Set<string>();
        
        receiptRecords.forEach(record => {
          if (record.data?.EMPRESA && record.data.EMPRESA !== 'DESCONOCIDA') {
            empresasFromReceipts.add(record.data.EMPRESA);
          }
        });

        // Combinar ambas fuentes
        const allEmpresas = new Set([...empresasFromConsolidated, ...empresasFromReceipts]);
        
        // Filtrar empresas válidas (excluir ESTRATEGIA URBANA)
        const empresasValidas = Array.from(allEmpresas).filter(empresa => 
          empresa !== 'ESTRATEGIA URBANA' && 
          empresa !== 'DESCONOCIDA' &&
          empresa.trim() !== ''
        ).sort();

        setEmpresas(empresasValidas);
      } catch (err) {
        console.error("Error fetching empresas in use:", err);
        setError("Error al cargar las empresas.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchEmpresasInUse();
  }, []);

  return { empresas, isLoading, error };
}
