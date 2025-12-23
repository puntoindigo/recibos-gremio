/**
 * Utilidades para forzar limpieza completa del sistema
 */

/**
 * Limpia completamente el localStorage y recarga la página
 */
export function forceCleanAndReload() {
  // Limpiar localStorage
  localStorage.removeItem('pendingItems');
  
  // Limpiar otros datos relacionados si existen
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.includes('pending') || key.includes('item'))) {
      keysToRemove.push(key);
    }
  }
  
  keysToRemove.forEach(key => localStorage.removeItem(key));
  
  // Recargar la página
  window.location.reload();
}

/**
 * Limpia solo los datos de items pendientes
 */
export function cleanPendingItems() {
  localStorage.removeItem('pendingItems');
  console.log('🧹 Datos de items pendientes limpiados');
}

