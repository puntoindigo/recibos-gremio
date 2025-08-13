// lib/fechas.ts
export function excelSerialToDate(serial: number): Date | null {
  if (!Number.isFinite(serial)) return null;
  // Excel (Windows) día 1 = 1899-12-31; con bug de 1900 → convención común: 1899-12-30
  const base = new Date(Date.UTC(1899, 11, 30));
  const ms = serial * 24 * 60 * 60 * 1000;
  const d = new Date(base.getTime() + ms);
  return isNaN(d.getTime()) ? null : d;
}

export function normalizarPeriodo(input: unknown): string {
  // 1) Date directa
  if (input instanceof Date && !isNaN(input.getTime())) {
    const mm = String(input.getMonth() + 1).padStart(2, '0');
    const yyyy = String(input.getFullYear());
    return `${mm}/${yyyy}`;
  }

  // 2) Número tipo "serial" de Excel
  if (typeof input === 'number' && Number.isFinite(input)) {
    const d = excelSerialToDate(input);
    if (d) {
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = String(d.getFullYear());
      return `${mm}/${yyyy}`;
    }
  }

  const raw = String(input ?? '').trim();
  if (!raw) return '';

  // 3) YYYY-MM o YYYY/MM
  {
    const m = raw.match(/^(\d{4})[\/\-](\d{1,2})$/);
    if (m) {
      const yyyy = Number(m[1]);
      const mm = String(Number(m[2])).padStart(2, '0');
      return `${mm}/${yyyy}`;
    }
  }

  // 4) DD/MM/YYYY o DD-MM-YYYY  (tomamos el mes del medio)
  {
    const m = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (m) {
      const mm = String(Number(m[2])).padStart(2, '0');
      const yyyy = Number(m[3].length === 2 ? (2000 + Number(m[3])) : m[3]);
      return `${mm}/${yyyy}`;
    }
  }

  // 5) MM/YYYY o MM-YYYY
  {
    const m = raw.match(/^(\d{1,2})[\/\-](\d{2,4})$/);
    if (m) {
      const mm = String(Number(m[1])).padStart(2, '0');
      const yyyy = Number(m[2].length === 2 ? (2000 + Number(m[2])) : m[2]);
      return `${mm}/${yyyy}`;
    }
  }

  // 6) Mes en texto
  const meses: Record<string, number> = {
    ene:1, enero:1, feb:2, febrero:2, mar:3, marzo:3, abr:4, abril:4, may:5, mayo:5,
    jun:6, junio:6, jul:7, julio:7, ago:8, agosto:8, sep:9, sept:9, set:9, septiembre:9, setiembre:9,
    oct:10, octubre:10, nov:11, noviembre:11, dic:12, diciembre:12
  };

  {
    const m = raw.toLowerCase().replace(/\./g, '')
      .match(/^([a-záéíóúñ]{3,12})[ \-_/]*(\d{2,4})$/i);
    if (m) {
      const mmn = meses[m[1]];
      if (mmn) {
        const yyyyNum = Number(m[2].length === 2 ? (2000 + Number(m[2])) : m[2]);
        return `${String(mmn).padStart(2, '0')}/${yyyyNum}`;
      }
    }
  }

  // 7) Pegado: 062025 (MMYYYY) o 202506 (YYYYMM)
  {
    const d = raw.replace(/\D/g, '');
    if (d.length === 6) {
      const asYYYYMM = Number(d.slice(0, 4));
      const asMM = Number(d.slice(4, 6));
      if (asYYYYMM >= 1900 && asYYYYMM <= 2099 && asMM >= 1 && asMM <= 12) {
        return `${String(asMM).padStart(2, '0')}/${asYYYYMM}`;
      }
      const asMM2 = Number(d.slice(0, 2));
      const asYYYY = Number(d.slice(2, 6));
      if (asYYYY >= 1900 && asYYYY <= 2099 && asMM2 >= 1 && asMM2 <= 12) {
        return `${String(asMM2).padStart(2, '0')}/${asYYYY}`;
      }
    }
  }

  return '';
}
