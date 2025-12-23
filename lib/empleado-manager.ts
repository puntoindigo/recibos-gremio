// lib/empleado-manager.ts
import { DataManager } from './data-manager';

export interface EmpleadoData {
  legajo: string;
  nombre: string;
  empresa: string;
  cuil: string;
  periodo: string;
  data: any;
  createdAt: number;
  recibosCount: number;
  descuentosCount: number;
  recibos: any[];
  descuentosActivos: any[];
  descuentosPagados: any[];
  totalDescontar: number;
  totalPagado: number;
  saldoPendiente: number;
  cuotasRestantes: number;
}

export class EmpleadoManager {
  private static instance: EmpleadoManager;
  
  static getInstance(): EmpleadoManager {
    if (!EmpleadoManager.instance) {
      EmpleadoManager.instance = new EmpleadoManager();
    }
    return EmpleadoManager.instance;
  }

  /**
   * Obtiene todos los empleados con sus datos completos
   */
  async getAllEmpleados(dataManager: DataManager): Promise<EmpleadoData[]> {
    try {
      // Obtener empleados consolidados
      const consolidatedData = await dataManager.getConsolidated();
      
      // Obtener descuentos para contar
      const descuentosData = await dataManager.getDescuentos();
      
      // Crear mapa de descuentos por legajo
      const descuentosPorLegajo = new Map<string, any[]>();
      descuentosData.forEach(descuento => {
        if (!descuentosPorLegajo.has(descuento.legajo)) {
          descuentosPorLegajo.set(descuento.legajo, []);
        }
        descuentosPorLegajo.get(descuento.legajo)!.push(descuento);
      });

      // Agrupar empleados por legajo para evitar duplicados
      const empleadosPorLegajo = new Map<string, EmpleadoData>();
      
      consolidatedData.forEach(emp => {
        const legajo = emp.legajo;
        if (!empleadosPorLegajo.has(legajo)) {
          empleadosPorLegajo.set(legajo, {
            legajo: emp.legajo,
            nombre: emp.nombre || 'Sin nombre',
            empresa: emp.data?.EMPRESA || 'Sin empresa',
            cuil: emp.data?.CUIL || '',
            periodo: emp.periodo,
            data: emp.data,
            createdAt: emp.createdAt || Date.now(),
            recibosCount: 0,
            descuentosCount: 0,
            recibos: [],
            descuentosActivos: [],
            descuentosPagados: [],
            totalDescontar: 0,
            totalPagado: 0,
            saldoPendiente: 0,
            cuotasRestantes: 0
          });
        }
        
        // Solo incrementar contador de recibos si NO es manual
        const empleado = empleadosPorLegajo.get(legajo)!;
        if (emp.data?.MANUAL !== 'true') {
          empleado.recibosCount++;
          empleado.recibos.push(emp);
        }
      });

      // Agregar descuentos y calcular totales
      empleadosPorLegajo.forEach((empleado, legajo) => {
        const descuentos = descuentosPorLegajo.get(legajo) || [];
        empleado.descuentosCount = descuentos.length;
        empleado.descuentosActivos = descuentos.filter(d => d.estado === 'ACTIVO');
        empleado.descuentosPagados = descuentos.filter(d => d.estado === 'FINALIZADO');
        
        // Calcular totales
        empleado.totalDescontar = empleado.descuentosActivos.reduce((sum, d) => sum + (d.monto || 0), 0);
        empleado.totalPagado = empleado.descuentosPagados.reduce((sum, d) => sum + (d.monto || 0), 0);
        empleado.saldoPendiente = empleado.totalDescontar;
        empleado.cuotasRestantes = empleado.descuentosActivos.reduce((sum, d) => sum + (d.cuotasRestantes || 0), 0);
      });

      return Array.from(empleadosPorLegajo.values());
    } catch (error) {
      console.error('Error obteniendo empleados:', error);
      return [];
    }
  }

  /**
   * Obtiene un empleado específico por legajo con todos sus datos
   */
  async getEmpleadoByLegajo(legajo: string, dataManager: DataManager): Promise<EmpleadoData | null> {
    try {
      // Obtener todos los recibos del empleado
      const recibosData = await dataManager.getConsolidatedByLegajo(legajo);

      if (recibosData.length === 0) {
        return null;
      }

      // Obtener descuentos del empleado
      const descuentosData = await dataManager.getDescuentosByLegajo(legajo);

      // Usar el primer recibo para obtener datos básicos
      const primerRecibo = recibosData[0];
      
      // Separar descuentos activos y pagados
      const descuentosActivos = descuentosData.filter(d => d.estado === 'ACTIVO');
      const descuentosPagados = descuentosData.filter(d => d.estado === 'FINALIZADO');
      
      // Calcular totales
      const totalDescontar = descuentosActivos.reduce((sum, d) => sum + (d.monto || 0), 0);
      const totalPagado = descuentosPagados.reduce((sum, d) => sum + (d.monto || 0), 0);
      const saldoPendiente = totalDescontar;
      const cuotasRestantes = descuentosActivos.reduce((sum, d) => sum + (d.cuotasRestantes || 0), 0);

      const empleado: EmpleadoData = {
        legajo: primerRecibo.legajo,
        nombre: primerRecibo.nombre || 'Sin nombre',
        empresa: primerRecibo.data?.EMPRESA || 'Sin empresa',
        cuil: primerRecibo.data?.CUIL || '',
        periodo: primerRecibo.periodo,
        data: primerRecibo.data,
        createdAt: primerRecibo.createdAt || Date.now(),
        recibosCount: recibosData.length,
        descuentosCount: descuentosData.length,
        recibos: recibosData,
        descuentosActivos,
        descuentosPagados,
        totalDescontar,
        totalPagado,
        saldoPendiente,
        cuotasRestantes
      };

      return empleado;
    } catch (error) {
      console.error('Error obteniendo empleado:', error);
      return null;
    }
  }

  /**
   * Verifica si un empleado tiene recibos vinculados
   */
  async hasRecibosVinculados(legajo: string, dataManager: DataManager): Promise<boolean> {
    try {
      const recibos = await dataManager.getConsolidatedByLegajo(legajo);
      return recibos.length > 0;
    } catch (error) {
      console.error('Error verificando recibos vinculados:', error);
      return false;
    }
  }

  /**
   * Verifica si un empleado tiene descuentos vinculados
   */
  async hasDescuentosVinculados(legajo: string, dataManager: DataManager): Promise<boolean> {
    try {
      const descuentos = await dataManager.getDescuentosByLegajo(legajo);
      return descuentos.length > 0;
    } catch (error) {
      console.error('Error verificando descuentos vinculados:', error);
      return false;
    }
  }
}

// Exportar instancia singleton
export const empleadoManager = EmpleadoManager.getInstance();
