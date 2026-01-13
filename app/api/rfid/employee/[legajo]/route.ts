// app/api/rfid/employee/[legajo]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase-client';

export const dynamic = 'force-dynamic';

/**
 * Obtiene todas las tarjetas RFID asociadas a un empleado
 * GET /api/rfid/employee/[legajo]?empresa=...
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { legajo: string } }
) {
  try {
    const legajo = params.legajo;
    const empresa = req.nextUrl.searchParams.get('empresa');

    if (!legajo) {
      return NextResponse.json(
        { error: 'Legajo es requerido' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // Construir query
    let query = supabase
      .from('rfid_cards')
      .select('*')
      .eq('legajo', legajo);

    // Filtrar por empresa si se proporciona
    if (empresa) {
      query = query.eq('empresa', empresa);
    }

    // Ordenar por fecha de creación (más recientes primero)
    query = query.order('created_at', { ascending: false });

    const { data: cards, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      cards: cards || [],
      count: cards?.length || 0
    });
  } catch (error) {
    console.error('Error obteniendo tarjetas del empleado:', error);
    return NextResponse.json(
      { 
        error: 'Error obteniendo tarjetas',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

