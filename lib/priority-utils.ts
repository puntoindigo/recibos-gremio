/**
 * Utilidades para manejo de prioridades
 */

/**
 * Obtiene las clases CSS para el color de prioridad
 * @param priority - Prioridad del item
 * @returns Clases CSS para el color
 */
export function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'high':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'low':
      return 'bg-green-100 text-green-800 border-green-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

/**
 * Obtiene el texto de prioridad en mayúsculas
 * @param priority - Prioridad del item
 * @returns Texto de prioridad en mayúsculas
 */
export function getPriorityText(priority: string): string {
  switch (priority) {
    case 'high':
      return 'ALTA';
    case 'medium':
      return 'MEDIA';
    case 'low':
      return 'BAJA';
    default:
      return 'NORMAL';
  }
}

