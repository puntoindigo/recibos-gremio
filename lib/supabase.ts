import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rlqmsnycvgsiykvbatgo.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJscW1zbnljdmdzaXlrdmJhdGdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyNDEzODQsImV4cCI6MjA3NjgxNzM4NH0.Faa2R1eZysdRHzxEov_mnUU6Up5M0sQRXHz9pwUt9wE';

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
