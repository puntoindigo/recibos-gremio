-- Script para corregir las políticas RLS de rfid_cards
-- Ejecutar en el SQL Editor de Supabase si ya ejecutaste el script anterior

-- Eliminar políticas antiguas si existen
DROP POLICY IF EXISTS "Permitir lectura de tarjetas RFID a usuarios autenticados" ON rfid_cards;
DROP POLICY IF EXISTS "Permitir inserción de tarjetas RFID a usuarios autenticados" ON rfid_cards;
DROP POLICY IF EXISTS "Permitir actualización de tarjetas RFID a usuarios autenticados" ON rfid_cards;
DROP POLICY IF EXISTS "Permitir eliminación de tarjetas RFID a usuarios autenticados" ON rfid_cards;

-- Crear política única que permite todas las operaciones
CREATE POLICY "Allow all operations on rfid_cards"
  ON rfid_cards FOR ALL
  USING (true)
  WITH CHECK (true);

