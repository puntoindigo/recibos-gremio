// app/api/nfc-card/route.ts
// Endpoint API para recibir UID de tarjetas NFC desde el script Node.js

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase-client';

// Clave fija para almacenar el último UID en app_config
const NFC_CARD_CONFIG_KEY = 'nfc_last_card';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { uid, timestamp } = body;

    if (!uid) {
      return NextResponse.json(
        { error: 'UID requerido' },
        { status: 400 }
      );
    }

    const cardData = {
      uid: String(uid),
      timestamp: timestamp || new Date().toISOString()
    };

    console.log('📱 Tarjeta recibida:', cardData);

    // Guardar en Supabase usando app_config
    const supabase = getSupabaseClient();
    
    // Intentar actualizar o insertar en app_config
    // value es JSONB, así que podemos pasar el objeto directamente
    const { error: upsertError } = await supabase
      .from('app_config')
      .upsert({
        id: NFC_CARD_CONFIG_KEY, // Usar la key como id también
        key: NFC_CARD_CONFIG_KEY,
        value: cardData, // JSONB acepta objetos directamente
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'key'
      });

    if (upsertError) {
      console.error('Error guardando tarjeta en Supabase:', upsertError);
      // Si falla, intentar crear la tabla o usar método alternativo
      // Por ahora, continuar aunque falle para no bloquear
    }

    return NextResponse.json({
      success: true,
      uid: cardData.uid,
      timestamp: cardData.timestamp
    });
  } catch (error) {
    console.error('Error procesando tarjeta NFC:', error);
    return NextResponse.json(
      { error: 'Error procesando tarjeta' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Obtener el último UID leído desde Supabase
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', NFC_CARD_CONFIG_KEY)
      .single();

    if (error || !data) {
      // Si no existe, retornar null (primera vez)
      return NextResponse.json({
        success: true,
        card: null,
        timestamp: new Date().toISOString()
      });
    }

    // value es JSONB, así que viene como objeto directamente
    const cardData = data.value;
    if (cardData && typeof cardData === 'object') {
      return NextResponse.json({
        success: true,
        card: cardData,
        timestamp: new Date().toISOString()
      });
    } else {
      // Si por alguna razón viene como string, intentar parsear
      try {
        const parsed = typeof cardData === 'string' ? JSON.parse(cardData) : cardData;
        return NextResponse.json({
          success: true,
          card: parsed,
          timestamp: new Date().toISOString()
        });
      } catch (parseError) {
        console.error('Error parseando datos de tarjeta:', parseError);
        return NextResponse.json({
          success: true,
          card: null,
          timestamp: new Date().toISOString()
        });
      }
    }
  } catch (error) {
    console.error('Error obteniendo tarjeta NFC:', error);
    return NextResponse.json({
      success: true,
      card: null,
      timestamp: new Date().toISOString()
    });
  }
}

