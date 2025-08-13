// lib/control.ts
import type { ArchivoRecibo } from './archivos';
import { normalizarPeriodo } from './fechas';

export type ResultadoControl = {
  key: string; // legajo||mm/yyyy
  estado: 'OK' | 'DIF';
  diferencias: Array<{ campo: string; hoja2: string; recibos: string }>;
  archivos?: ArchivoRecibo[];
};

export function aNumero(s: unknown): number {
  const t = String(s ?? '').trim();
  if (!t || t === '-' || t === '—') return 0;
  const c = t.replace(/\s+/g, '');
  const lastDot = c.lastIndexOf('.');
  const lastComma = c.lastIndexOf(',');
  const useCommaDecimal = lastComma > lastDot;
  const norm = useCommaDecimal ? c.replace(/\./g, '').replace(',', '.') : c.replace(/,/g, '');
  const n = Number(norm);
  return Number.isFinite(n) ? n : NaN;
}

export function igualesNum(a: unknown, b: unknown, tol = 0.01): boolean {
  const na = aNumero(a);
  const nb = aNumero(b);
  if (Number.isNaN(na) || Number.isNaN(nb)) {
    return String(a ?? '').trim() === String(b ?? '').trim();
  }
  return Math.abs(na - nb) <= tol;
}

export type GenericRow = Record<string, string | number | undefined>;

// Considera PERIODO / PER / FECHA y normaliza a MM/YYYY
function periodoParaKey(rowHoja2: GenericRow, rowRecibos: GenericRow): string {
  const candidato =
    rowRecibos['PERIODO'] ??
    rowRecibos['PER'] ??
    rowRecibos['FECHA'] ?? // puede venir como 01/06/2025
    rowHoja2['PERIODO'] ??
    rowHoja2['PER'] ??
    rowHoja2['FECHA'] ??
    '';
  const norm = normalizarPeriodo(candidato ?? '');
  const fallback = String(candidato ?? '').trim();
  return norm || fallback;
}

export function compararValoresEntreHojasPorLegajo(
  rowHoja2: GenericRow,
  rowRecibos: GenericRow,
  archivos?: ArchivoRecibo[],
  camposAComparar: string[] = [
    'CONTR.SOLIDARIA',
    'SEG.SEPELIO',
    'CUOTA MUTUAL',
    'RESGUARDO MUTUAL',
    'DESC. MUTUAL',
  ]
): ResultadoControl {
  const difs: ResultadoControl['diferencias'] = [];

  for (const campo of camposAComparar) {
    const v2 = rowHoja2[campo] ?? '';
    const vr = rowRecibos[campo] ?? '';
    if (!igualesNum(v2, vr)) {
      difs.push({ campo, hoja2: String(v2 ?? ''), recibos: String(vr ?? '') });
    }
  }

  const legajo = String(rowRecibos['LEGAJO'] ?? rowHoja2['LEGAJO'] ?? '').trim();
  const periodoKey = periodoParaKey(rowHoja2, rowRecibos);
  const key = `${legajo}||${periodoKey}`;

  return {
    key,
    diferencias: difs,
    archivos: archivos || [],
    estado: difs.length === 0 ? 'OK' : 'DIF',
  };
}
