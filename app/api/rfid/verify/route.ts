// app/api/rfid/verify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase-client';

export const dynamic = 'force-dynamic';

/**
 * Verifica si un UID de tarjeta RFID está asociado a un empleado
 * POST /api/rfid/verify
 * Body: { uid: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { uid } = await req.json();

    if (!uid || typeof uid !== 'string') {
      return NextResponse.json(
        { error: 'UID es requerido' },
        { status: 400 }
      );
    }

    // Normalizar UID: trim, eliminar saltos de línea y espacios
    const normalizedUid = uid.trim().replace(/\s+/g, '').replace(/\n/g, '').replace(/\r/g, '');

    if (!normalizedUid) {
      return NextResponse.json(
        { error: 'UID inválido' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // Buscar tarjeta por UID
    const { data: card, error } = await supabase
      .from('rfid_cards')
      .select('*')
      .eq('uid', normalizedUid)
      .eq('activo', true)
      .single();

    if (error) {
      // Si no se encuentra la tarjeta, retornar null (no es un error)
      if (error.code === 'PGRST116') {
        return NextResponse.json({
          found: false,
          uid: normalizedUid,
          message: 'Tarjeta no vinculada a ningún empleado'
        });
      }
      throw error;
    }

    if (!card) {
      return NextResponse.json({
        found: false,
        uid: normalizedUid,
        message: 'Tarjeta no vinculada a ningún empleado'
      });
    }

    return NextResponse.json({
      found: true,
      uid: normalizedUid,
      card: {
        id: card.id,
        uid: card.uid,
        legajo: card.legajo,
        empresa: card.empresa,
        nombre: card.nombre,
        activo: card.activo,
        created_at: card.created_at
      },
      message: 'Tarjeta encontrada'
    });
  } catch (error) {
    console.error('Error verificando tarjeta RFID:', error);
    return NextResponse.json(
      { 
        error: 'Error verificando tarjeta',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

