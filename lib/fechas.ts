// lib/fechas.ts
export function normalizarPeriodo(raw: unknown): string {
  if (raw == null) return "";

  // 0) Date nativa
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    const mm = String(raw.getMonth() + 1).padStart(2, "0");
    const yyyy = String(raw.getFullYear());
    return `${mm}/${yyyy}`;
  }

  // 1) Serial de Excel (días desde 1899-12-30)
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 20000) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const ms = raw * 24 * 60 * 60 * 1000;
    const d = new Date(excelEpoch.getTime() + ms);
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const yyyy = String(d.getUTCFullYear());
    return `${mm}/${yyyy}`;
  }

  const s0 = String(raw).trim();
  if (!s0) return "";

  // Normalización básica
  const s = s0
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const meses: Record<string, string> = {
    ene: "01", enero: "01",
    feb: "02", febrero: "02",
    mar: "03", marzo: "03",
    abr: "04", abril: "04",
    may: "05", mayo: "05",
    jun: "06", junio: "06",
    jul: "07", julio: "07",
    ago: "08", agosto: "08",
    sep: "09", set: "09", septiembre: "09", setiembre: "09",
    oct: "10", octubre: "10",
    nov: "11", noviembre: "11",
    dic: "12", diciembre: "12",
  };

  const toYYYY = (yy: string): string => {
    const n = Number(yy);
    return n >= 0 && n < 50 ? `20${yy.padStart(2, "0")}` : `19${yy.padStart(2, "0")}`;
  };

  const clampMM = (mm: string): string => {
    const n = Math.max(1, Math.min(12, Number(mm)));
    return String(n).padStart(2, "0");
  };

  // A) Mes en texto: "jun-25", "jun 2025", "junio/24", "septiembre 2025"
  {
    const m = s.match(/^([a-zñ]+)[\s\/\-]?(\d{2}|\d{4})$/i);
    if (m) {
      const mm = meses[m[1]];
      if (mm) {
        const yyyy = m[2].length === 2 ? toYYYY(m[2]) : m[2];
        return `${mm}/${yyyy}`;
      }
    }
  }

  // B) "DD/MM/YYYY" o "MM/DD/YYYY" → tomamos MES y AÑO
  {
    const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (m) {
      const a = Number(m[1]), b = Number(m[2]);
      const month = a > 12 ? b : (b <= 12 ? b : a);
      const mm = clampMM(String(month));
      return `${mm}/${m[3]}`;
    }
  }

  // C) "MM/YY" o "M-YY"
  {
    const m = s.match(/^(\d{1,2})[\/\-](\d{2})$/);
    if (m) {
      const mm = clampMM(m[1]);
      const yyyy = toYYYY(m[2]);
      return `${mm}/${yyyy}`;
    }
  }

  // D) "MM/YYYY" o "M-YYYY"
  {
    const m = s.match(/^(\d{1,2})[\/\-](\d{4})$/);
    if (m) {
      const mm = clampMM(m[1]);
      return `${mm}/${m[2]}`;
    }
  }

  // E) "YYYY-MM" o "YYYY/MM"
  {
    const m = s.match(/^(\d{4})[\/\-](\d{1,2})$/);
    if (m) {
      const mm = clampMM(m[2]);
      return `${mm}/${m[1]}`;
    }
  }

  // F) "YYYYMM"
  {
    const m = s.match(/^(\d{4})(\d{2})$/);
    if (m) {
      const yyyy = m[1];
      const mm = clampMM(m[2]);
      return `${mm}/${yyyy}`;
    }
  }

  // Nada matchea → devuelvo original (sirve para debug)
  return s0;
}
