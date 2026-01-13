// app/api/rfid/associate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase-client';

export const dynamic = 'force-dynamic';

/**
 * Asocia una tarjeta RFID a un empleado
 * POST /api/rfid/associate
 * Body: { uid: string, legajo: string, empresa: string, nombre: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { uid, legajo, empresa, nombre } = await req.json();

    // Validaciones
    if (!uid || typeof uid !== 'string') {
      return NextResponse.json(
        { error: 'UID es requerido' },
        { status: 400 }
      );
    }

    if (!legajo || typeof legajo !== 'string') {
      return NextResponse.json(
        { error: 'Legajo es requerido' },
        { status: 400 }
      );
    }

    if (!empresa || typeof empresa !== 'string') {
      return NextResponse.json(
        { error: 'Empresa es requerida' },
        { status: 400 }
      );
    }

    if (!nombre || typeof nombre !== 'string') {
      return NextResponse.json(
        { error: 'Nombre es requerido' },
        { status: 400 }
      );
    }

    // Normalizar UID
    const normalizedUid = uid.trim().replace(/\s+/g, '').replace(/\n/g, '').replace(/\r/g, '');

    if (!normalizedUid) {
      return NextResponse.json(
        { error: 'UID inválido' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // Verificar si el UID ya existe
    const { data: existingCard, error: checkError } = await supabase
      .from('rfid_cards')
      .select('id, legajo, nombre')
      .eq('uid', normalizedUid)
      .maybeSingle();

    // Si hay un error que no sea "no encontrado", lanzarlo
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error verificando UID existente:', checkError);
      throw checkError;
    }

    // Si la tarjeta ya existe, retornar error
    if (existingCard) {
      return NextResponse.json(
        { 
          error: 'Esta tarjeta ya está asociada a otro empleado',
          details: {
            legajo: existingCard.legajo,
            nombre: existingCard.nombre
          }
        },
        { status: 409 } // Conflict
      );
    }

    // Crear nueva tarjeta
    const cardId = `rfid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const { data: newCard, error } = await supabase
      .from('rfid_cards')
      .insert({
        id: cardId,
        uid: normalizedUid,
        legajo: legajo.trim(),
        empresa: empresa.trim(),
        nombre: nombre.trim(),
        activo: true
      })
      .select()
      .single();

    if (error) {
      console.error('Error insertando tarjeta RFID:', error);
      console.error('Detalles del error:', JSON.stringify(error, null, 2));
      throw error;
    }

    if (!newCard) {
      throw new Error('No se pudo crear la tarjeta');
    }

    return NextResponse.json({
      success: true,
      card: {
        id: newCard.id,
        uid: newCard.uid,
        legajo: newCard.legajo,
        empresa: newCard.empresa,
        nombre: newCard.nombre,
        activo: newCard.activo,
        created_at: newCard.created_at
      },
      message: 'Tarjeta asociada correctamente'
    });
  } catch (error) {
    console.error('Error asociando tarjeta RFID:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorDetails = error && typeof error === 'object' && 'code' in error 
      ? { code: (error as any).code, message: (error as any).message, details: (error as any).details }
      : errorMessage;
    
    return NextResponse.json(
      { 
        error: 'Error asociando tarjeta',
        details: errorDetails
      },
      { status: 500 }
    );
  }
}

