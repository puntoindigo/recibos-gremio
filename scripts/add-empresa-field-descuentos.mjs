#!/usr/bin/env node

/**
 * Script para agregar el campo empresa a la tabla descuentos en Supabase
 */

console.log('🔧 Agregando campo empresa a tabla descuentos...');

console.log('\n📝 CONSULTA SQL PARA EJECUTAR EN SUPABASE:');
console.log('\n-- Agregar campo empresa a tabla descuentos');
console.log('ALTER TABLE descuentos ADD COLUMN IF NOT EXISTS empresa TEXT;');

console.log('\n⚠️  NOTA: Después de ejecutar esta consulta, necesitarás:');
console.log('1. Actualizar la función adaptBackupData para incluir el campo empresa');
console.log('2. Restaurar el backup nuevamente para que los descuentos tengan empresa');

console.log('\n✅ Script completado. Ejecuta la consulta SQL en Supabase.');
