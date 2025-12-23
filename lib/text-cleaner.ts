/**
 * Utilidades para limpiar texto de caracteres corruptos
 */

/**
 * Limpia texto removiendo caracteres corruptos comunes
 * @param text - Texto a limpiar
 * @returns Texto limpio
 */
export function cleanText(text: string | undefined): string {
  if (!text) return '';
  
  return text
    .replace(/\s*\)\}$/g, '') // Remover )} al final
    .replace(/\s*\)\s*$/g, '') // Remover ) al final
    .replace(/\s*\}\s*$/g, '') // Remover } al final
    .replace(/\s+$/g, '') // Remover espacios al final
    .trim();
}

/**
 * Limpia un objeto de item removiendo caracteres corruptos
 * @param item - Item a limpiar
 * @returns Item limpio
 */
export function cleanItem(item: any) {
  return {
    ...item,
    description: cleanText(item.description),
    proposedSolution: cleanText(item.proposedSolution)
  };
}

/**
 * Limpia un array de items
 * @param items - Array de items a limpiar
 * @returns Array de items limpios
 */
export function cleanItems(items: any[]) {
  return items.map(cleanItem);
}

