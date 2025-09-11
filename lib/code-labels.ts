// lib/code-labels.ts
// Solo etiquetas confirmadas o headers con 5 dígitos. El resto se ignora.
export const CODE_LABELS = [
  ["20540", "CONTRIBUCION SOLIDARIA"],
  ["20590", "SEGURO SEPELIO"],
  ["20595", "CUOTA MUTUAL"],
  ["20610", "RESGUARDO MUTUAL"],
  ["20620", "DESC. MUTUAL"],
  ["5310", "ITEM 5.3.10"],

  // Aliases frecuentes
  ["20620", "DESC. MUTUAL 16 DE ABRIL"],
  ["20540", "CONTRIBUCIÓN SOLIDARIA"], // con tilde
  ["20595", "CUOTA  MUTUAL"],          // doble espacio
  ["20610", "RESGUARDO  MUTUAL"],      // doble espacio
  ["20610", "RESGUARDO MUTUAL FAMILIAR"],      // doble espacio
  ["20590", "SEGURO DE SEPELIO "],     // espacio al final

  // Variantes abreviadas del Excel para Seguro de Sepelio
  ["20590", "SEG.SEPELIO"],
  ["20590", "SEG. SEPELIO"],
  ["20590", "SEG SEPELIO"],
  ["20590", "SEGURO DE SEPELIO"],

] as const;

// Ignorados (hasta confirmar código):
// AP.EXTRAORDINARIO
// ITEM 8.1.2 2 %
// ITEM 8.1.4 0.50%
// FEDERACION 1.50 %

export function labelFor(code: string | number): string {
  const c = String(code).trim();
  const found = CODE_LABELS.find(([k]) => k === c);
  return found ? found[1] : c;
}

// Mapeo único de códigos a conceptos principales (sin duplicados)
export const CODE_KEYS: string[] = Array.from(new Set(CODE_LABELS.map(([k]) => k)));
export const CODE_SET: Set<string> = new Set(CODE_KEYS);

// Mapeo de códigos a conceptos principales (solo la primera aparición de cada código)
export const CODE_PRINCIPAL_LABELS = [
  ["20540", "CONTRIBUCION SOLIDARIA"],
  ["20590", "SEGURO SEPELIO"],
  ["20595", "CUOTA MUTUAL"],
  ["20610", "RESGUARDO MUTUAL"],
  ["20620", "DESC. MUTUAL"],
  ["5310", "ITEM 5.3.10"],
] as const;

export function isLabeled(code: string | number): boolean {
  return CODE_SET.has(String(code).trim());
}

// Función para obtener solo los conceptos principales (sin duplicados)
// Excluye el código 5310 (ITEM 5.3.10) de los controles
export function getPrincipalLabels() {
  return CODE_PRINCIPAL_LABELS.filter(([code]) => code !== "5310");
}
