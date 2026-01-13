// app/api/rfid/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase-client';

export const dynamic = 'force-dynamic';

/**
 * Elimina o desactiva una tarjeta RFID
 * DELETE /api/rfid/[id]
 * Query params: ?hard=true para eliminación permanente (opcional)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cardId = params.id;
    const hardDelete = req.nextUrl.searchParams.get('hard') === 'true';

    if (!cardId) {
      return NextResponse.json(
        { error: 'ID de tarjeta es requerido' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    if (hardDelete) {
      // Eliminación permanente
      const { error } = await supabase
        .from('rfid_cards')
        .delete()
        .eq('id', cardId);

      if (error) {
        throw error;
      }

      return NextResponse.json({
        success: true,
        message: 'Tarjeta eliminada permanentemente'
      });
    } else {
      // Desactivación (soft delete)
      const { error } = await supabase
        .from('rfid_cards')
        .update({ activo: false, updated_at: new Date().toISOString() })
        .eq('id', cardId);

      if (error) {
        throw error;
      }

      return NextResponse.json({
        success: true,
        message: 'Tarjeta desactivada'
      });
    }
  } catch (error) {
    console.error('Error eliminando tarjeta RFID:', error);
    return NextResponse.json(
      { 
        error: 'Error eliminando tarjeta',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

/**
 * Reactiva una tarjeta RFID desactivada
 * PATCH /api/rfid/[id]
 * Body: { activo: true }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cardId = params.id;
    const { activo } = await req.json();

    if (!cardId) {
      return NextResponse.json(
        { error: 'ID de tarjeta es requerido' },
        { status: 400 }
      );
    }

    if (typeof activo !== 'boolean') {
      return NextResponse.json(
        { error: 'Campo activo debe ser boolean' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from('rfid_cards')
      .update({ activo, updated_at: new Date().toISOString() })
      .eq('id', cardId);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: activo ? 'Tarjeta reactivada' : 'Tarjeta desactivada'
    });
  } catch (error) {
    console.error('Error actualizando tarjeta RFID:', error);
    return NextResponse.json(
      { 
        error: 'Error actualizando tarjeta',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

