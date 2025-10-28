// lib/supabase-client.ts
import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rlqmsnycvgsiykvbatgo.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJscW1zbnljdmdzaXlrdmJhdGdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyNDEzODQsImV4cCI6MjA3NjgxNzM4NH0.Faa2R1eZysdRHzxEov_mnUU6Up5M0sQRXHz9pwUt9wE';

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
  filename: string;
  empresa: string;
  legajo: string;
  nombre: string;
  periodo: string;
  cuil: string;
  data: any;
  created_at: string;
  updated_at: string;
}

export interface SupabaseConsolidated {
  id: string;
  legajo: string;
  nombre: string;
  periodo: string;
  empresa: string;
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
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  tags: string[];
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
