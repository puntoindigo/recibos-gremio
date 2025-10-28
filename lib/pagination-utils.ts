// lib/pagination-utils.ts
/**
 * Utilidades para paginación en la aplicación
 * Regla: Cualquier listado con 25+ registros debe tener paginación
 */

export const PAGINATION_THRESHOLD = 25;

/**
 * Determina si un listado debe mostrar paginación
 * @param itemCount - Número total de elementos
 * @returns true si debe mostrar paginación
 */
export function shouldShowPagination(itemCount: number): boolean {
  return itemCount >= PAGINATION_THRESHOLD;
}

/**
 * Obtiene la configuración de paginación por defecto
 * @returns Configuración inicial de paginación
 */
export function getDefaultPaginationConfig() {
  return {
    initialItemsPerPage: PAGINATION_THRESHOLD,
    itemsPerPageOptions: [10, 25, 50, 100]
  };
}

/**
 * Aplica la regla de paginación a un listado
 * @param data - Array de datos
 * @param pagination - Objeto de paginación del hook usePagination
 * @returns Datos a mostrar (paginados o completos)
 */
export function applyPaginationRule<T>(
  data: T[], 
  pagination: { paginatedData: T[] }
): T[] {
  return shouldShowPagination(data.length) ? pagination.paginatedData : data;
}
