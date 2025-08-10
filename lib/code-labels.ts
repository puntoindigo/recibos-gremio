// lib/code-labels.ts
// Editá este array y el orden se respetará en toda la app.
export const CODE_LABELS = [
  ["20540", "CONTRIBUCION SOLIDARIA"],
  ["20590", "SEGURO DE SEPELIO"],
  ["20595", "CUOTA MUTUAL"],
  ["20610", "RESGUARDO MUTUAL"],
  ["20620", "DESC. MUTUAL"],
] as const;


export function labelFor(code: string | number) {
  const c = String(code).trim();
  const found = CODE_LABELS.find(([k]) => k === c);
  return found ? found[1] : c; // fallback: muestra el código si no está mapeado
}

// Útiles
export const CODE_KEYS: string[] = CODE_LABELS.map(([k]) => k);
export const CODE_SET: Set<string> = new Set(CODE_KEYS);
export function isLabeled(code: string | number): boolean {
  return CODE_SET.has(String(code).trim());
}
