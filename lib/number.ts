// lib/number.ts
// Normaliza strings con coma/punto a número JS y viceversa (2 decimales)
export function toNumber(v: unknown): number {
  if (typeof v === "number") return v;
  const s = String(v ?? "").replace(/\s/g, "").trim();
  if (!s) return 0;
  // Si termina con coma decimal, asume formato es-AR
  if (/,\d{1,}$/.test(s)) return parseFloat(s.replace(/\./g, "").replace(",", ".")) || 0;
  return parseFloat(s.replace(/,/g, "")) || 0;
}
export function sum2(a: unknown, b: unknown): string {
  return (toNumber(a) + toNumber(b)).toFixed(2);
}
export function toFixed2(v: unknown): string {
  return toNumber(v).toFixed(2);
}
export const isCode = (k: string) => /^\d{5}$/.test(k);
