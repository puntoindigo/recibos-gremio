// lib/empresa-manager.ts
import { DataManager } from './data-manager-singleton';
// import type { Empresa } from './db'; // REMOVIDO - IndexedDB roto

// Tipo Empresa movido desde db.ts
export interface Empresa {
  id: string;
  nombre: string;
  logo?: string;
  colors?: {
    primary: string;
    secondary: string;
    accent: string;
  };
  adminUserId: string;
  isActive: boolean;
  createdAt: number;
  updatedAt?: number;
  descripcion?: string;
}

export interface EmpresaData {
  id: string;
  nombre: string;
  logo?: string;
  descripcion?: string;
  empleadosCount: number;
  recibosCount: number;
  descuentosCount: number;
  createdAt: number;
  updatedAt: number;
}

export class EmpresaManager {
  private static instance: EmpresaManager;
  
  static getInstance(): EmpresaManager {
    if (!EmpresaManager.instance) {
      EmpresaManager.instance = new EmpresaManager();
    }
    return EmpresaManager.instance;
  }

  /**
   * Obtiene todas las empresas con sus estadísticas
   */
  async getAllEmpresas(dataManager: DataManager): Promise<EmpresaData[]> {
    try {
      // Obtener empresas desde la base de datos
      const empresasData = await dataManager.getEmpresas();
      const empresasConNombreUndefined = empresasData.filter(emp => !emp.nombre || emp.nombre.trim() === '');
      
      // Obtener estadísticas de empleados por empresa
      const consolidatedData = await dataManager.getConsolidated();
      const descuentosData = await dataManager.getDescuentos();
      
      // Crear mapas de estadísticas
      const empleadosPorEmpresa = new Map<string, Set<string>>();
      const recibosPorEmpresa = new Map<string, number>();
      const descuentosPorEmpresa = new Map<string, number>();
      
      // Contar empleados únicos por empresa
      consolidatedData.forEach(emp => {
        const empresa = emp.data?.EMPRESA;
        if (empresa && empresa.trim() !== '') {
          if (!empleadosPorEmpresa.has(empresa)) {
            empleadosPorEmpresa.set(empresa, new Set());
          }
          empleadosPorEmpresa.get(empresa)!.add(emp.legajo);
          
          // Solo contar recibos si NO es un empleado manual
          if (emp.data?.MANUAL !== 'true') {
            recibosPorEmpresa.set(empresa, (recibosPorEmpresa.get(empresa) || 0) + 1);
          }
        }
      });
      
      // Contar descuentos por empresa
      descuentosData.forEach(descuento => {
        const empresa = descuento.empresa;
        if (empresa && empresa.trim() !== '') {
          descuentosPorEmpresa.set(empresa, (descuentosPorEmpresa.get(empresa) || 0) + 1);
        }
      });
      
      // Crear lista de empresas con estadísticas
      const empresas: EmpresaData[] = [];
      
      // Agregar empresas de la base de datos
      for (const empresa of empresasData) {
        const empleadosCount = empleadosPorEmpresa.get(empresa.nombre)?.size || 0;
        const recibosCount = recibosPorEmpresa.get(empresa.nombre) || 0;
        const descuentosCount = descuentosPorEmpresa.get(empresa.nombre) || 0;
        
        empresas.push({
          id: empresa.id,
          nombre: empresa.nombre,
          logo: empresa.logo,
          descripcion: empresa.descripcion,
          empleadosCount,
          recibosCount,
          descuentosCount,
          createdAt: empresa.createdAt,
          updatedAt: empresa.updatedAt
        });
      }
      
      // Agregar empresas que existen en datos pero no en la tabla empresas
      const empresasEnDatos = new Set(
        consolidatedData
          .map(emp => emp.data?.EMPRESA)
          .filter(empresa => empresa && empresa.trim() !== '')
      );
      
      for (const nombreEmpresa of empresasEnDatos) {
        if (!empresasData.find(e => e.nombre === nombreEmpresa)) {
          const empleadosCount = empleadosPorEmpresa.get(nombreEmpresa)?.size || 0;
          const recibosCount = recibosPorEmpresa.get(nombreEmpresa) || 0;
          const descuentosCount = descuentosPorEmpresa.get(nombreEmpresa) || 0;
          
          empresas.push({
            id: `auto-${nombreEmpresa}`,
            nombre: nombreEmpresa,
            logo: undefined,
            descripcion: 'Empresa detectada automáticamente',
            empleadosCount,
            recibosCount,
            descuentosCount,
            createdAt: Date.now(),
            updatedAt: Date.now()
          });
        }
      }
      
      // Limpiar empresas con nombre undefined de la base de datos
      if (empresasConNombreUndefined.length > 0) {
        for (const empresaUndefined of empresasConNombreUndefined) {
          try {
            await dataManager.deleteEmpresa(empresaUndefined.id);
          } catch (error) {
            console.error('Error eliminando empresa undefined:', error);
          }
        }
      }

      return empresas.sort((a, b) => {
        const nombreA = a.nombre || '';
        const nombreB = b.nombre || '';
        return nombreA.localeCompare(nombreB);
      });
    } catch (error) {
      console.error('Error obteniendo empresas:', error);
      return [];
    }
  }

  /**
   * Obtiene una empresa específica por ID
   */
  async getEmpresaById(id: string, dataManager: DataManager): Promise<EmpresaData | null> {
    try {
      const empresa = await dataManager.getEmpresaById(id);
      if (!empresa) return null;
      
      // Obtener estadísticas
      const consolidatedData = await dataManager.getConsolidated();
      const descuentosData = await dataManager.getDescuentos();
      
      const empleadosUnicos = new Set<string>();
      let recibosCount = 0;
      let descuentosCount = 0;
      
      consolidatedData.forEach(emp => {
        if (emp.data?.EMPRESA === empresa.nombre) {
          empleadosUnicos.add(emp.legajo);
          recibosCount++;
        }
      });
      
      descuentosData.forEach(descuento => {
        if (descuento.empresa === empresa.nombre) {
          descuentosCount++;
        }
      });
      
      return {
        id: empresa.id,
        nombre: empresa.nombre,
        logo: empresa.logo,
        descripcion: empresa.descripcion,
        empleadosCount: empleadosUnicos.size,
        recibosCount,
        descuentosCount,
        createdAt: empresa.createdAt,
        updatedAt: empresa.updatedAt
      };
    } catch (error) {
      console.error('Error obteniendo empresa:', error);
      return null;
    }
  }

  /**
   * Crea una nueva empresa
   */
  async createEmpresa(dataManager: DataManager, data: Omit<EmpresaData, 'id' | 'empleadosCount' | 'recibosCount' | 'descuentosCount' | 'createdAt' | 'updatedAt'>, userId: string = 'system'): Promise<string> {
    try {
      const id = `empresa-${Date.now()}`;
      const now = Date.now();
      
      await dataManager.addEmpresa({
        id,
        nombre: data.nombre,
        logo: data.logo,
        colors: {
          primary: '#3B82F6',
          secondary: '#6B7280',
          accent: '#10B981'
        },
        adminUserId: userId,
        isActive: true,
        createdAt: now
      });
      
      return id;
    } catch (error) {
      console.error('Error creando empresa:', error);
      throw error;
    }
  }

  /**
   * Actualiza una empresa existente
   */
  async updateEmpresa(dataManager: DataManager, id: string, data: Partial<Pick<EmpresaData, 'nombre' | 'logo' | 'descripcion'>>): Promise<void> {
    try {
      console.log('🔍 Debug - Actualizando empresa:', { id, data });
      
      // Si es una empresa automática (auto-), crear el registro en la tabla empresas
      if (id.startsWith('auto-')) {
        const nombreEmpresa = id.replace('auto-', '');
        console.log('🔍 Debug - Creando empresa automática en BD:', nombreEmpresa);
        
        const empresaId = `empresa-${Date.now()}`;
        await dataManager.addEmpresa({
          id: empresaId,
          nombre: nombreEmpresa,
          logo: data.logo || '',
          colors: {
            primary: '#3B82F6',
            secondary: '#6B7280',
            accent: '#10B981'
          },
          adminUserId: 'system',
          isActive: true,
          createdAt: Date.now()
        });
        
        console.log('🔍 Debug - Empresa automática creada con ID:', empresaId);
      } else {
        // Actualizar empresa existente
        const result = await dataManager.updateEmpresa(id, {
          ...data,
          updatedAt: Date.now()
        });
        console.log('🔍 Debug - Resultado de actualización:', result);
      }
    } catch (error) {
      console.error('Error actualizando empresa:', error);
      throw error;
    }
  }

  /**
   * Elimina una empresa
   */
  async deleteEmpresa(dataManager: DataManager, id: string): Promise<void> {
    try {
      await dataManager.deleteEmpresa(id);
    } catch (error) {
      console.error('Error eliminando empresa:', error);
      throw error;
    }
  }

  /**
   * Verifica si una empresa tiene empleados vinculados
   */
  async hasEmpleadosVinculados(nombreEmpresa: string, dataManager: DataManager): Promise<boolean> {
    try {
      const consolidated = await dataManager.getConsolidated();
      const count = consolidated.filter(item => item.data?.EMPRESA === nombreEmpresa).length;
      return count > 0;
    } catch (error) {
      console.error('Error verificando empleados vinculados:', error);
      return false;
    }
  }
}

// Exportar instancia singleton
export const empresaManager = EmpresaManager.getInstance();
