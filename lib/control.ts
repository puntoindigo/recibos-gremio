// lib/control.ts
import type { ArchivoRecibo } from './archivos';

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

/**
 * Convierte entradas como "jun-25", "06/2025", "2025-06", Date, "04/07/2025", "062025", "202506"
 * al formato estándar "MM/YYYY". Devuelve '' si no puede parsear.
 */
export function normalizarPeriodo(input: unknown): string {
  if (input instanceof Date && !isNaN(input.getTime())) {
    const mm = String(input.getMonth() + 1).padStart(2, '0');
    const yyyy = String(input.getFullYear());
    return `${mm}/${yyyy}`;
  }

  const raw = String(input ?? '').trim();
  if (!raw) return '';

  // Mapa de meses (ES, con variantes comunes)
  const MESES: Record<string, number> = {
    ene: 1, enero: 1,
    feb: 2, febrero: 2,
    mar: 3, marzo: 3,
    abr: 4, abril: 4,
    may: 5, mayo: 5,
    jun: 6, junio: 6,
    jul: 7, julio: 7,
    ago: 8, agosto: 8,
    sep: 9, sept: 9, set: 9, septiembre: 9, setiembre: 9,
    oct: 10, octubre: 10,
    nov: 11, noviembre: 11,
    dic: 12, diciembre: 12,
  };

  const toYYYY = (yy: number): number => (yy >= 80 ? 1900 + yy : 2000 + yy); // pivote 80→197x/198x se van a 19xx; resto 20xx
  const isMonth = (m: number): boolean => m >= 1 && m <= 12;
  const out = (m: number, y: number): string => (isMonth(m) && y >= 1900 && y <= 2099)
    ? `${String(m).padStart(2, '0')}/${String(y)}`
    : '';

  const s = raw
    .toLowerCase()
    .replace(/[\.·]+/g, '.') // normaliza puntos
    .replace(/\s+/g, ' ')
    .trim();

  // 1) Formatos numéricos claros: MM/YYYY o M/YYYY
  {
    const m = s.match(/^(\d{1,2})[\/\-.](\d{2}|\d{4})$/);
    if (m) {
      const month = Number(m[1]);
      const year = m[2].length === 2 ? toYYYY(Number(m[2])) : Number(m[2]);
      const r = out(month, year);
      if (r) return r;
    }
  }

  // 2) YYYY/MM o YYYY-M
  {
    const m = s.match(/^(\d{4})[\/\-.](\d{1,2})$/);
    if (m) {
      const year = Number(m[1]);
      const month = Number(m[2]);
      const r = out(month, year);
      if (r) return r;
    }
  }

  // 3) DD/MM/YYYY o D-M-YY → tomamos el mes del medio (formato local día/mes/año)
  {
    const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2}|\d{4})$/);
    if (m) {
      const month = Number(m[2]);
      const year = m[3].length === 2 ? toYYYY(Number(m[3])) : Number(m[3]);
      const r = out(month, year);
      if (r) return r;
    }
  }

  // 4) Nombre de mes + año (p. ej. "jun-25", "junio 2025", "sep.2025")
  {
    const m = s.match(/^([a-záéíóúñ\.]{3,12})[ \-_/\.]*(\d{2}|\d{4})$/i);
    if (m) {
      const mesTxt = m[1].replace(/\.$/, ''); // quita punto final tipo "sep."
      const year = m[2].length === 2 ? toYYYY(Number(m[2])) : Number(m[2]);
      const month = MESES[mesTxt] ?? MESES[mesTxt.replace(/\.$/, '')];
      if (month) {
        const r = out(month, year);
        if (r) return r;
      }
    }
  }

  // 5) Año + nombre de mes (p. ej. "2025 junio")
  {
    const m = s.match(/^(\d{4})[ \-_/\.]*([a-záéíóúñ\.]{3,12})$/i);
    if (m) {
      const year = Number(m[1]);
      const mesTxt = m[2].replace(/\.$/, '');
      const month = MESES[mesTxt] ?? MESES[mesTxt.replace(/\.$/, '')];
      if (month) {
        const r = out(month, year);
        if (r) return r;
      }
    }
  }

  // 6) Solo dígitos pegados: "062025" (MMYYYY) o "202506" (YYYYMM)
  {
    const digits = s.replace(/\D/g, '');
    if (digits.length === 6) {
      const first4 = Number(digits.slice(0, 4));
      const last2 = Number(digits.slice(4, 6));
      const first2 = Number(digits.slice(0, 2));
      const last4 = Number(digits.slice(2, 6));
      // Preferimos YYYYMM si parece año válido
      if (first4 >= 1900 && first4 <= 2099 && isMonth(last2)) {
        const r = out(last2, first4);
        if (r) return r;
      }
      // Si no, intentamos MMYYYY
      if (isMonth(first2) && last4 >= 1900 && last4 <= 2099) {
        const r = out(first2, last4);
        if (r) return r;
      }
    }
  }

  return '';
}

/** Elige y normaliza un período desde las filas; si no se puede, devuelve el valor crudo como fallback. */
function periodoParaKey(rowRecibos: GenericRow, rowHoja2: GenericRow): string {
  const candidato =
    rowRecibos['PERIODO'] ??
    rowRecibos['PER'] ??
    rowHoja2['PERIODO'] ??
    rowHoja2['PER'] ??
    '';
  const norm = normalizarPeriodo(candidato);
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
  const periodoKey = periodoParaKey(rowRecibos, rowHoja2);
  const key = `${legajo}||${periodoKey}`;

  return {
    key,
    diferencias: difs,
    archivos: archivos || [],
    estado: difs.length === 0 ? 'OK' : 'DIF',
  };
}
