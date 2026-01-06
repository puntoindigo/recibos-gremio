// lib/supabase-client.ts
import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Error: Se requieren las variables de entorno NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

// Cliente Supabase singleton
let supabaseClient: any = null;

export const getSupabaseClient = () => {
  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false, // No persistir sesiones para evitar problemas
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    });
  }
  return supabaseClient;
};

// Verificar conexión
export const testSupabaseConnection = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('🔍 testSupabaseConnection() - Iniciando test de conexión...');
    console.log('🔗 testSupabaseConnection() - URL:', supabaseUrl);
    console.log('🔑 testSupabaseConnection() - Key configurada:', !!supabaseAnonKey);
    
    const client = getSupabaseClient();
    console.log('✅ testSupabaseConnection() - Cliente creado');
    
    const { data, error } = await client
      .from('recibos')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ testSupabaseConnection() - Error:', error);
      console.error('❌ testSupabaseConnection() - Tipo de error:', typeof error);
      console.error('❌ testSupabaseConnection() - Error completo:', JSON.stringify(error, null, 2));
      return { success: false, error: JSON.stringify(error) };
    }
    
    console.log('✅ testSupabaseConnection() - Conexión exitosa');
    return { success: true };
  } catch (error) {
    console.error('❌ testSupabaseConnection() - Error fatal:', error);
    console.error('❌ testSupabaseConnection() - Tipo de error:', typeof error);
    console.error('❌ testSupabaseConnection() - Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    };
  }
};

// Tipos de datos
export interface SupabaseReceipt {
  id: string;
  key: string;
  legajo: string;
  nombre: string;
  periodo: string;
  archivos?: any; // JSONB array
  data: any; // empresa, filename, cuil, etc. van aquí dentro
  created_at: string;
  updated_at: string;
}

export interface SupabaseConsolidated {
  id: string;
  key: string;
  legajo: string;
  nombre: string;
  periodo: string;
  cuil?: string;
  cuil_norm?: string;
  empresa?: string; // Puede estar en data.EMPRESA o como campo directo
  data: any;
  created_at: string;
  updated_at: string;
}

export interface SupabaseDescuento {
  id: string;
  legajo: string;
  nombre: string;
  empresa: string;
  tipo: string;
  estado: string;
  monto_total: number;
  cuotas_total: number;
  cuotas_pagadas: number;
  cuotas_restantes: number;
  monto_cuota: number;
  fecha_inicio: string;
  fecha_fin?: string;
  tags: string[];
  observaciones?: string;
  created_at: string;
  updated_at: string;
}

export interface SupabaseColumnConfig {
  id: string;
  table_name: string;
  column_name: string;
  is_visible: boolean;
  alias?: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface SupabasePendingItem {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  order: number;
  color: string;
  proposed_solution?: string;
  feedback?: string;
  resolution?: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface SupabaseAppConfig {
  id: string;
  key: string;
  value: any;
  created_at: string;
  updated_at: string;
}

export interface SupabaseRegistro {
  id: string;
  legajo: string;
  nombre: string;
  empresa: string;
  accion: 'entrada' | 'salida' | 'alta';
  sede: string;
  fecha_hora: string;
  created_at: string;
  updated_at: string;
}
