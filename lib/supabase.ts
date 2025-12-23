import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Error: Se requieren las variables de entorno NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Tipos para la base de datos
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
