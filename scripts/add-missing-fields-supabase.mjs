#!/usr/bin/env node

/**
 * Script para agregar campos faltantes a las tablas de Supabase
 * Basado en los campos que están en el backup pero no en Supabase
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Se requieren las variables de entorno SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔧 Agregando campos faltantes a Supabase...');

async function addMissingFields() {
  try {
    console.log('\n📋 Campos faltantes identificados:');
    console.log('\n🔸 TABLA: recibos');
    console.log('  - hashes (TEXT)');
    console.log('  - cuil (TEXT)');
    console.log('  - cuilNorm (TEXT)');
    console.log('  - filename (TEXT)');
    
    console.log('\n🔸 TABLA: consolidated');
    console.log('  - archivos (TEXT)');
    console.log('  - cuil (TEXT)');
    console.log('  - cuilNorm (TEXT)');
    
    console.log('\n🔸 TABLA: descuentos');
    console.log('  - empresa (TEXT)');
    console.log('  - montoCuota (NUMERIC)');
    console.log('  - fechaCreacion (BIGINT)');
    console.log('  - cantidadCuotas (INTEGER)');
    console.log('  - descripcion (TEXT)');
    console.log('  - tipoDescuento (TEXT)');
    console.log('  - motivo (TEXT)');
    console.log('  - tags (TEXT[])');
    console.log('  - autorizadoPor (TEXT)');
    console.log('  - fechaAutorizacion (TIMESTAMP)');
    console.log('  - creadoPor (TEXT)');
    console.log('  - modificadoPor (TEXT)');
    
    console.log('\n🔸 TABLA: pending_items');
    console.log('  - proposedSolution (TEXT)');
    
    console.log('\n⚠️  NOTA: Este script muestra los campos que necesitan ser agregados.');
    console.log('   Para agregarlos, necesitarás ejecutar las siguientes consultas SQL en Supabase:');
    
    console.log('\n📝 CONSULTAS SQL PARA EJECUTAR:');
    console.log('\n-- Agregar campos a tabla recibos');
    console.log('ALTER TABLE recibos ADD COLUMN IF NOT EXISTS hashes TEXT;');
    console.log('ALTER TABLE recibos ADD COLUMN IF NOT EXISTS cuil TEXT;');
    console.log('ALTER TABLE recibos ADD COLUMN IF NOT EXISTS cuilNorm TEXT;');
    console.log('ALTER TABLE recibos ADD COLUMN IF NOT EXISTS filename TEXT;');
    
    console.log('\n-- Agregar campos a tabla consolidated');
    console.log('ALTER TABLE consolidated ADD COLUMN IF NOT EXISTS archivos TEXT;');
    console.log('ALTER TABLE consolidated ADD COLUMN IF NOT EXISTS cuil TEXT;');
    console.log('ALTER TABLE consolidated ADD COLUMN IF NOT EXISTS cuilNorm TEXT;');
    
    console.log('\n-- Agregar campos a tabla descuentos');
    console.log('ALTER TABLE descuentos ADD COLUMN IF NOT EXISTS empresa TEXT;');
    console.log('ALTER TABLE descuentos ADD COLUMN IF NOT EXISTS montoCuota NUMERIC;');
    console.log('ALTER TABLE descuentos ADD COLUMN IF NOT EXISTS fechaCreacion BIGINT;');
    console.log('ALTER TABLE descuentos ADD COLUMN IF NOT EXISTS cantidadCuotas INTEGER;');
    console.log('ALTER TABLE descuentos ADD COLUMN IF NOT EXISTS descripcion TEXT;');
    console.log('ALTER TABLE descuentos ADD COLUMN IF NOT EXISTS tipoDescuento TEXT;');
    console.log('ALTER TABLE descuentos ADD COLUMN IF NOT EXISTS motivo TEXT;');
    console.log('ALTER TABLE descuentos ADD COLUMN IF NOT EXISTS tags TEXT[];');
    console.log('ALTER TABLE descuentos ADD COLUMN IF NOT EXISTS autorizadoPor TEXT;');
    console.log('ALTER TABLE descuentos ADD COLUMN IF NOT EXISTS fechaAutorizacion TIMESTAMP;');
    console.log('ALTER TABLE descuentos ADD COLUMN IF NOT EXISTS creadoPor TEXT;');
    console.log('ALTER TABLE descuentos ADD COLUMN IF NOT EXISTS modificadoPor TEXT;');
    
    console.log('\n-- Agregar campos a tabla pending_items');
    console.log('ALTER TABLE pending_items ADD COLUMN IF NOT EXISTS proposedSolution TEXT;');
    
    console.log('\n✅ Script completado. Ejecuta las consultas SQL en Supabase para agregar los campos.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Ejecutar el script
addMissingFields();
