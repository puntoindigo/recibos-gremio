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

    // Normalizar legajo (trim y limpiar espacios)
    const normalizedLegajo = legajo.trim();

    console.log(`[RFID API] Buscando tarjetas para legajo: "${normalizedLegajo}", empresa: "${empresa || 'sin filtrar'}"`);

    // Construir query - buscar por legajo sin importar empresa
    // (un empleado puede tener tarjetas de diferentes empresas)
    let query = supabase
      .from('rfid_cards')
      .select('*')
      .eq('legajo', normalizedLegajo);

    // Filtrar por empresa solo si se proporciona y no está vacía
    if (empresa && empresa.trim()) {
      const normalizedEmpresa = empresa.trim();
      console.log(`[RFID API] Filtrando también por empresa: "${normalizedEmpresa}"`);
      query = query.eq('empresa', normalizedEmpresa);
    }

    // Ordenar por fecha de creación (más recientes primero)
    query = query.order('created_at', { ascending: false });

    const { data: cards, error } = await query;

    console.log(`[RFID API] Resultado: ${cards?.length || 0} tarjetas encontradas`);
    if (cards && cards.length > 0) {
      console.log(`[RFID API] Tarjetas encontradas:`, cards.map(c => ({ id: c.id, uid: c.uid, legajo: c.legajo, empresa: c.empresa })));
    }

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

