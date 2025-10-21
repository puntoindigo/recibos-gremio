// lib/descuentos-manager.ts
import { db, Descuento, generateDescuentoId, calculateMontoCuota, calculateCuotasRestantes } from './db';
import { logUserActivity } from './user-management';

// Gestión de descuentos
export async function createDescuento(descuentoData: Omit<Descuento, 'id' | 'montoCuota' | 'fechaCreacion'>): Promise<Descuento> {
  const montoCuota = calculateMontoCuota(descuentoData.monto, descuentoData.cantidadCuotas);
  
  const descuento: Descuento = {
    id: generateDescuentoId(),
    montoCuota,
    fechaCreacion: Date.now(),
    ...descuentoData
  };
  
  await db.descuentos.add(descuento);
  await logUserActivity(descuentoData.creadoPor, 'descuento:create', 'descuento', descuento.id, { 
    legajo: descuentoData.legajo,
    monto: descuentoData.monto,
    tipo: descuentoData.tipoDescuento
  });
  return descuento;
}

export async function getDescuentoById(id: string): Promise<Descuento | undefined> {
  return await db.descuentos.get(id);
}

export async function updateDescuento(id: string, updates: Partial<Descuento>, modificadoPor: string): Promise<void> {
  const descuento = await db.descuentos.get(id);
  if (!descuento) throw new Error('Descuento no encontrado');
  
  // Recalcular monto de cuota si cambió el monto o cantidad de cuotas
  let montoCuota = descuento.montoCuota;
  if (updates.monto || updates.cantidadCuotas) {
    const monto = updates.monto || descuento.monto;
    const cuotas = updates.cantidadCuotas || descuento.cantidadCuotas;
    montoCuota = calculateMontoCuota(monto, cuotas);
  }
  
  await db.descuentos.update(id, { 
    ...updates, 
    montoCuota,
    modificadoPor,
    fechaModificacion: Date.now()
  });
  
  await logUserActivity(modificadoPor, 'descuento:update', 'descuento', id, { updates });
}

export async function deleteDescuento(id: string, deletedBy: string): Promise<void> {
  await db.descuentos.delete(id);
  await logUserActivity(deletedBy, 'descuento:delete', 'descuento', id, { action: 'descuento_deleted' });
}

// Búsquedas y filtros
export async function getDescuentosByLegajo(legajo: string): Promise<Descuento[]> {
  return await db.descuentos.where('legajo').equals(legajo).toArray();
}

export async function getDescuentosByEmpresa(empresa: string): Promise<Descuento[]> {
  return await db.descuentos.where('empresa').equals(empresa).toArray();
}

export async function getDescuentosActivos(empresa?: string): Promise<Descuento[]> {
  let query = db.descuentos.where('estado').equals('ACTIVO');
  if (empresa) {
    query = query.and(descuento => descuento.empresa === empresa);
  }
  return await query.toArray();
}

export async function getDescuentosByTipo(tipo: Descuento['tipoDescuento'], empresa?: string): Promise<Descuento[]> {
  let query = db.descuentos.where('tipoDescuento').equals(tipo);
  if (empresa) {
    query = query.and(descuento => descuento.empresa === empresa);
  }
  return await query.toArray();
}

export async function getDescuentosByTags(tags: string[], empresa?: string): Promise<Descuento[]> {
  let query = db.descuentos;
  if (empresa) {
    query = query.where('empresa').equals(empresa);
  }
  
  const allDescuentos = await query.toArray();
  return allDescuentos.filter(descuento => 
    tags.some(tag => descuento.tags.includes(tag))
  );
}

export async function searchDescuentosByNombre(nombre: string, empresa?: string): Promise<Descuento[]> {
  let query = db.descuentos;
  if (empresa) {
    query = query.where('empresa').equals(empresa);
  }
  
  const allDescuentos = await query.toArray();
  return allDescuentos.filter(descuento => 
    descuento.nombre.toLowerCase().includes(nombre.toLowerCase())
  );
}

// Cálculos y estadísticas
export async function getTotalDescuentosByLegajo(legajo: string): Promise<number> {
  const descuentos = await getDescuentosByLegajo(legajo);
  return descuentos
    .filter(d => d.estado === 'ACTIVO')
    .reduce((total, d) => total + d.monto, 0);
}

export async function getTotalDescuentosByEmpresa(empresa: string): Promise<number> {
  const descuentos = await getDescuentosByEmpresa(empresa);
  return descuentos
    .filter(d => d.estado === 'ACTIVO')
    .reduce((total, d) => total + d.monto, 0);
}

export async function getDescuentosProximosAVencer(dias: number = 30): Promise<Descuento[]> {
  const fechaLimite = Date.now() + (dias * 24 * 60 * 60 * 1000);
  const descuentos = await db.descuentos.where('estado').equals('ACTIVO').toArray();
  
  return descuentos.filter(descuento => {
    if (!descuento.fechaFin) return false;
    return descuento.fechaFin <= fechaLimite;
  });
}

export async function getEstadisticasDescuentos(empresa?: string): Promise<{
  total: number;
  activos: number;
  suspendidos: number;
  finalizados: number;
  cancelados: number;
  montoTotal: number;
  montoActivos: number;
  empleadosUnicos: number;
  empresasUnicas: number;
  descuentosPorEmpresa: Array<{
    empresa: string;
    cantidad: number;
    monto: number;
  }>;
}> {
  let descuentos = await db.descuentos.toArray();
  if (empresa) {
    descuentos = descuentos.filter(d => d.empresa === empresa);
  }
  
  const stats = {
    total: descuentos.length,
    activos: 0,
    suspendidos: 0,
    finalizados: 0,
    cancelados: 0,
    montoTotal: 0,
    montoActivos: 0,
    empleadosUnicos: 0,
    empresasUnicas: 0,
    descuentosPorEmpresa: [] as Array<{
      empresa: string;
      cantidad: number;
      monto: number;
    }>
  };
  
  // Contar empleados únicos
  const empleadosUnicos = new Set(descuentos.map(d => d.legajo));
  stats.empleadosUnicos = empleadosUnicos.size;
  
  // Contar empresas únicas
  const empresasUnicas = new Set(descuentos.map(d => d.empresa));
  stats.empresasUnicas = empresasUnicas.size;
  
  // Calcular estadísticas por empresa
  const empresaStats: Record<string, { cantidad: number; monto: number }> = {};
  
  descuentos.forEach(descuento => {
    stats.montoTotal += descuento.monto;
    
    // Estadísticas por empresa
    if (!empresaStats[descuento.empresa]) {
      empresaStats[descuento.empresa] = { cantidad: 0, monto: 0 };
    }
    empresaStats[descuento.empresa].cantidad++;
    empresaStats[descuento.empresa].monto += descuento.monto;
    
    switch (descuento.estado) {
      case 'ACTIVO':
        stats.activos++;
        stats.montoActivos += descuento.monto;
        break;
      case 'SUSPENDIDO':
        stats.suspendidos++;
        break;
      case 'FINALIZADO':
        stats.finalizados++;
        break;
      case 'CANCELADO':
        stats.cancelados++;
        break;
    }
  });
  
  // Convertir estadísticas por empresa a array
  stats.descuentosPorEmpresa = Object.entries(empresaStats)
    .map(([empresa, data]) => ({
      empresa,
      cantidad: data.cantidad,
      monto: data.monto
    }))
    .sort((a, b) => b.cantidad - a.cantidad);
  
  return stats;
}

// Cambios de estado
export async function suspenderDescuento(id: string, motivo: string, modificadoPor: string): Promise<void> {
  await updateDescuento(id, { 
    estado: 'SUSPENDIDO',
    observaciones: motivo
  }, modificadoPor);
}

export async function reactivarDescuento(id: string, modificadoPor: string): Promise<void> {
  await updateDescuento(id, { 
    estado: 'ACTIVO',
    observaciones: 'Reactivado'
  }, modificadoPor);
}

export async function finalizarDescuento(id: string, modificadoPor: string): Promise<void> {
  await updateDescuento(id, { 
    estado: 'FINALIZADO',
    fechaFin: Date.now()
  }, modificadoPor);
}

export async function cancelarDescuento(id: string, motivo: string, modificadoBy: string): Promise<void> {
  await updateDescuento(id, { 
    estado: 'CANCELADO',
    observaciones: motivo,
    fechaFin: Date.now()
  }, modificadoBy);
}

// Procesamiento de cuotas
export async function procesarCuota(id: string, modificadoPor: string): Promise<void> {
  const descuento = await getDescuentoById(id);
  if (!descuento) throw new Error('Descuento no encontrado');
  
  if (descuento.estado !== 'ACTIVO') {
    throw new Error('Solo se pueden procesar cuotas de descuentos activos');
  }
  
  const nuevaCuotaActual = descuento.cuotaActual + 1;
  
  if (nuevaCuotaActual >= descuento.cantidadCuotas) {
    // Finalizar descuento
    await finalizarDescuento(id, modificadoPor);
  } else {
    // Actualizar cuota actual
    await updateDescuento(id, { cuotaActual: nuevaCuotaActual }, modificadoPor);
  }
}

// Ficha del empleado
export async function getFichaEmpleado(legajo: string, empresa: string): Promise<{
  legajo: string;
  nombre: string;
  empresa: string;
  descuentosActivos: Descuento[];
  descuentosPagados: Descuento[];
  totalDescontar: number;
  totalPagado: number;
  saldoPendiente: number;
  cuotasRestantes: number;
}> {
  const descuentos = await getDescuentosByLegajo(legajo);
  const descuentosEmpresa = descuentos.filter(d => d.empresa === empresa);
  
  const descuentosActivos = descuentosEmpresa.filter(d => d.estado === 'ACTIVO');
  const descuentosPagados = descuentosEmpresa.filter(d => d.estado === 'FINALIZADO');
  
  const totalDescontar = descuentosActivos.reduce((total, d) => total + d.monto, 0);
  const totalPagado = descuentosPagados.reduce((total, d) => total + d.monto, 0);
  const saldoPendiente = totalDescontar - totalPagado;
  
  const cuotasRestantes = descuentosActivos.reduce((total, d) => 
    total + calculateCuotasRestantes(d.cuotaActual, d.cantidadCuotas), 0
  );
  
  return {
    legajo,
    nombre: descuentosEmpresa[0]?.nombre || '',
    empresa,
    descuentosActivos,
    descuentosPagados,
    totalDescontar,
    totalPagado,
    saldoPendiente,
    cuotasRestantes
  };
}
