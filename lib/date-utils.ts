// lib/date-utils.ts
// Utilidades para manejo seguro de fechas

/**
 * Convierte una fecha en formato YYYY-MM-DD a timestamp
 * Usa zona horaria local para evitar problemas de UTC
 */
export function parseDateToTimestamp(dateString: string): number {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0); // Mediodía para evitar problemas de zona horaria
  return date.getTime();
}

/**
 * Convierte un timestamp a formato YYYY-MM-DD
 * Usa zona horaria local para evitar problemas de UTC
 */
export function formatTimestampToDateString(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formatea un timestamp para mostrar en la UI
 * Usa zona horaria argentina para consistencia
 */
export function formatTimestampForDisplay(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('es-AR', { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit',
    timeZone: 'America/Argentina/Buenos_Aires'
  });
}

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD
 */
export function getCurrentDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
















