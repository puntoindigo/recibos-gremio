import { getSupabaseClient } from './supabase-client';

// Tipo para la app (formato de la aplicación)
export interface PendingItem {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'open' | 'in-progress' | 'verifying' | 'completed';
  order: number;
  color?: string;
  proposedSolution?: string;
  feedback?: Array<{
    id: string;
    text: string;
    createdAt: string;
    resolved: boolean;
  }>;
  resolution?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Tipos para la base de datos (formato DB)
export interface PendingItemDB {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'open' | 'in-progress' | 'verifying' | 'completed';
  order: number;
  color?: string;
  proposed_solution?: string;
  feedback?: Array<{
    id: string;
    text: string;
    created_at: string;
    resolved: boolean;
  }>;
  resolution?: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
}

// Convertir de formato DB a formato de la app
const dbToApp = (dbItem: PendingItemDB): PendingItem => ({
  id: dbItem.id,
  title: dbItem.title,
  description: dbItem.description,
  category: dbItem.category,
  priority: dbItem.priority,
  status: dbItem.status,
  order: dbItem.order,
  color: dbItem.color,
  proposedSolution: dbItem.proposed_solution,
  feedback: dbItem.feedback?.map(f => ({
    id: f.id,
    text: f.text,
    createdAt: f.created_at,
    resolved: f.resolved
  })),
  resolution: dbItem.resolution,
  resolvedAt: dbItem.resolved_at,
  createdAt: dbItem.created_at,
  updatedAt: dbItem.updated_at
});

// Convertir de formato de la app a formato DB
const appToDb = (appItem: PendingItem): PendingItemDB => ({
  id: appItem.id,
  title: appItem.title,
  description: appItem.description,
  category: appItem.category,
  priority: appItem.priority,
  status: appItem.status,
  order: appItem.order,
  color: appItem.color,
  proposed_solution: appItem.proposedSolution,
  feedback: appItem.feedback?.map(f => ({
    id: f.id,
    text: f.text,
    created_at: f.createdAt,
    resolved: f.resolved
  })),
  resolution: appItem.resolution,
  resolved_at: appItem.resolvedAt,
  created_at: appItem.createdAt,
  updated_at: appItem.updatedAt
});

export class SupabasePendingItemsManager {
  private get client() {
    return getSupabaseClient();
  }

  // Obtener todos los items
  async getAllItems(): Promise<PendingItem[]> {
    try {
      const { data, error } = await this.client
        .from('pending_items')
        .select('*')
        .order('order', { ascending: true });

      if (error) {
        console.error('Error obteniendo items pendientes:', error);
        return [];
      }

      return data.map(dbToApp);
    } catch (error) {
      console.error('Error obteniendo items pendientes:', error);
      return [];
    }
  }

  // Obtener item por ID
  async getItemById(id: string): Promise<PendingItem | null> {
    try {
      const { data, error } = await this.client
        .from('pending_items')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error obteniendo item pendiente:', error);
        return null;
      }

      return dbToApp(data);
    } catch (error) {
      console.error('Error obteniendo item pendiente:', error);
      return null;
    }
  }

  // Crear nuevo item
  async createItem(item: Omit<PendingItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<PendingItem> {
    try {
      const now = new Date().toISOString();
      const newItem: PendingItem = {
        ...item,
        id: Date.now().toString(),
        createdAt: now,
        updatedAt: now
      };

      const dbItem = appToDb(newItem);
      const { data, error } = await this.client
        .from('pending_items')
        .insert([dbItem])
        .select()
        .single();

      if (error) {
        console.error('Error creando item pendiente:', error);
        throw error;
      }

      return dbToApp(data);
    } catch (error) {
      console.error('Error creando item pendiente:', error);
      throw error;
    }
  }

  // Actualizar item
  async updateItem(id: string, updates: Partial<Omit<PendingItem, 'id' | 'createdAt'>>): Promise<boolean> {
    try {
      console.log('🔍 Supabase updateItem:', { id, updates });

      // Convertir campos de la app a campos de la DB
      const dbUpdates: any = {};
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.category !== undefined) dbUpdates.category = updates.category;
      if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.order !== undefined) dbUpdates.order = updates.order;
      if (updates.color !== undefined) dbUpdates.color = updates.color;
      if (updates.proposedSolution !== undefined) dbUpdates.proposed_solution = updates.proposedSolution;
      if (updates.feedback !== undefined) dbUpdates.feedback = updates.feedback;
      if (updates.resolution !== undefined) dbUpdates.resolution = updates.resolution;
      if (updates.resolvedAt !== undefined) dbUpdates.resolved_at = updates.resolvedAt;
      dbUpdates.updated_at = new Date().toISOString();

      console.log('🔍 DB updates:', dbUpdates);

      const { error } = await this.client
        .from('pending_items')
        .update(dbUpdates)
        .eq('id', id);

      if (error) {
        console.error('Error actualizando item pendiente:', error);
        return false;
      }

      console.log('🔍 Update exitoso');
      return true;
    } catch (error) {
      console.error('Error actualizando item pendiente:', error);
      return false;
    }
  }

  // Eliminar item
  async deleteItem(id: string): Promise<boolean> {
    try {
      console.log('🔍 Eliminando item:', id);
      
      const { error } = await this.client
        .from('pending_items')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error eliminando item pendiente:', error);
        return false;
      }

      console.log('🔍 Item eliminado exitosamente');
      return true;
    } catch (error) {
      console.error('Error eliminando item pendiente:', error);
      return false;
    }
  }

  // Obtener categorías únicas
  async getCategories(): Promise<string[]> {
    try {
      const { data, error } = await this.client
        .from('pending_items')
        .select('category')
        .order('category');

      if (error) {
        console.error('Error obteniendo categorías:', error);
        return [];
      }

      return Array.from(new Set(data.map(item => item.category)));
    } catch (error) {
      console.error('Error obteniendo categorías:', error);
      return [];
    }
  }

  // Obtener estadísticas
  async getStats(): Promise<{
    total: number;
    completed: number;
    inProgress: number;
    pending: number;
    byCategory: Record<string, number>;
  }> {
    try {
      const items = await this.getAllItems();
      const stats = {
        total: items.length,
        completed: items.filter(item => item.status === 'completed').length,
        inProgress: items.filter(item => item.status === 'in-progress').length,
        pending: items.filter(item => item.status === 'pending').length,
        byCategory: {} as Record<string, number>
      };

      // Contar por categoría
      items.forEach(item => {
        stats.byCategory[item.category] = (stats.byCategory[item.category] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      return { total: 0, completed: 0, inProgress: 0, pending: 0, byCategory: {} };
    }
  }

  // Limpiar duplicados
  async cleanDuplicates(): Promise<number> {
    try {
      console.log('🧹 Limpiando duplicados...');
      
      const allItems = await this.getAllItems();
      console.log('🔍 Total items encontrados:', allItems.length);
      
      // Agrupar por título y descripción para encontrar duplicados
      const grouped = new Map<string, PendingItem[]>();
      
      allItems.forEach(item => {
        const key = `${item.title}|${item.description}`;
        if (!grouped.has(key)) {
          grouped.set(key, []);
        }
        grouped.get(key)!.push(item);
      });
      
      let duplicatesRemoved = 0;
      
      // Para cada grupo, mantener solo el primero y eliminar el resto
      for (const [key, items] of grouped) {
        if (items.length > 1) {
          console.log(`🔍 Duplicados encontrados para "${key}":`, items.length);
          
          // Ordenar por fecha de creación (mantener el más antiguo)
          const sortedItems = items.sort((a, b) => 
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
          
          // Eliminar todos excepto el primero
          const toDelete = sortedItems.slice(1);
          
          for (const item of toDelete) {
            console.log(`🗑️ Eliminando duplicado:`, item.id);
            await this.deleteItem(item.id);
            duplicatesRemoved++;
          }
        }
      }
      
      console.log(`✅ Duplicados eliminados: ${duplicatesRemoved}`);
      return duplicatesRemoved;
    } catch (error) {
      console.error('Error limpiando duplicados:', error);
      return 0;
    }
  }

  // Inicializar con datos por defecto
  async initializeDefaultItems(): Promise<void> {
    try {
      // Verificar si ya hay items
      const existingItems = await this.getAllItems();
      if (existingItems.length > 0) {
        console.log('Ya hay items en la base de datos, no se inicializan los por defecto');
        return;
      }

      const defaultItems: Omit<PendingItem, 'id' | 'createdAt' | 'updatedAt'>[] = [
        {
          description: 'Implementar roles granulares (admin, supervisor, operador)',
          title: 'Implementar roles granulares',
          category: 'Sistema de Usuarios',
          priority: 'high',
          status: 'pending',
          order: 1
        },
        {
          description: 'Gráficos interactivos en dashboard con filtros dinámicos',
          title: 'Gráficos interactivos en dashboard',
          category: 'Dashboard',
          priority: 'medium',
          status: 'pending',
          order: 2
        },
        {
          description: 'Validación automática de recibos con IA',
          title: 'Validación automática de recibos con IA',
          category: 'Recibos',
          priority: 'high',
          status: 'pending',
          order: 3
        },
        {
          description: 'Cálculo automático de descuentos por categoría',
          title: 'Cálculo automático de descuentos por categoría',
          category: 'Descuentos',
          priority: 'medium',
          status: 'pending',
          order: 4
        },
        {
          description: 'Comparación automática entre períodos',
          title: 'Comparación automática entre períodos',
          category: 'Control',
          priority: 'high',
          status: 'pending',
          order: 5
        },
        {
          description: 'Probar ABM de Empleados - Crear empleado',
          title: 'Probar ABM de Empleados - Crear empleado',
          category: 'Desarrollo',
          priority: 'high',
          status: 'pending',
          order: 20,
          color: 'bg-indigo-100'
        },
        {
          description: 'Probar ABM de Empleados - Editar empleado',
          title: 'Probar ABM de Empleados - Editar empleado',
          category: 'Desarrollo',
          priority: 'high',
          status: 'pending',
          order: 21,
          color: 'bg-indigo-100'
        },
        {
          description: 'Probar ABM de Empleados - Eliminar empleado',
          title: 'Probar ABM de Empleados - Eliminar empleado',
          category: 'Desarrollo',
          priority: 'high',
          status: 'pending',
          order: 22,
          color: 'bg-indigo-100'
        },
        {
          description: 'Probar ABM de Empresas - Crear empresa',
          title: 'Probar ABM de Empresas - Crear empresa',
          category: 'Desarrollo',
          priority: 'high',
          status: 'pending',
          order: 23,
          color: 'bg-indigo-100'
        },
        {
          description: 'Probar ABM de Empresas - Editar empresa existente',
          title: 'Probar ABM de Empresas - Editar empresa existente',
          category: 'Desarrollo',
          priority: 'high',
          status: 'pending',
          order: 24,
          color: 'bg-indigo-100'
        },
        {
          description: 'Probar ABM de Empresas - Eliminar empresa',
          title: 'Probar ABM de Empresas - Eliminar empresa',
          category: 'Desarrollo',
          priority: 'high',
          status: 'pending',
          order: 25,
          color: 'bg-indigo-100'
        },
        {
          description: 'Probar integración - Crear empresa desde empleado',
          title: 'Probar integración - Crear empresa desde empleado',
          category: 'Desarrollo',
          priority: 'high',
          status: 'pending',
          order: 26,
          color: 'bg-indigo-100'
        },
        {
          description: 'Probar integración - Asignar empresa a empleado',
          title: 'Probar integración - Asignar empresa a empleado',
          category: 'Desarrollo',
          priority: 'high',
          status: 'pending',
          order: 27,
          color: 'bg-indigo-100'
        },
        {
          description: 'Probar contadores y estadísticas',
          title: 'Probar contadores y estadísticas',
          category: 'Desarrollo',
          priority: 'medium',
          status: 'pending',
          order: 28,
          color: 'bg-indigo-100'
        },
        {
          description: 'Probar toggle de Gestión de Empresas',
          title: 'Probar toggle de Gestión de Empresas',
          category: 'Desarrollo',
          priority: 'medium',
          status: 'pending',
          order: 29,
          color: 'bg-indigo-100'
        }
      ];

      // Crear todos los items
      for (const item of defaultItems) {
        await this.createItem(item);
      }

      console.log('Items por defecto inicializados en Supabase');
    } catch (error) {
      console.error('Error inicializando items por defecto:', error);
    }
  }
}

export const supabasePendingItemsManager = new SupabasePendingItemsManager();
