/**
 * Utilidades de logging condicional
 */

const DEBUG_ENABLED = process.env.NODE_ENV === 'development' || process.env.DEBUG_ENABLED === 'true';

/**
 * Log de debug que solo se ejecuta en modo desarrollo
 * @param message - Mensaje a loggear
 * @param data - Datos adicionales
 */
export function debugLog(message: string, data?: any) {
  if (DEBUG_ENABLED) {
    if (data) {
      console.log(`🐛 ${message}`, data);
    } else {
      console.log(`🐛 ${message}`);
    }
  }
}

/**
 * Log de información
 * @param message - Mensaje a loggear
 * @param data - Datos adicionales
 */
export function infoLog(message: string, data?: any) {
  if (data) {
    console.log(`ℹ️ ${message}`, data);
  } else {
    console.log(`ℹ️ ${message}`);
  }
}

/**
 * Log de error
 * @param message - Mensaje de error
 * @param error - Error object
 */
export function errorLog(message: string, error?: any) {
  if (error) {
    console.error(`❌ ${message}`, error);
  } else {
    console.error(`❌ ${message}`);
  }
}

/**
 * Log de éxito
 * @param message - Mensaje de éxito
 * @param data - Datos adicionales
 */
export function successLog(message: string, data?: any) {
  if (data) {
    console.log(`✅ ${message}`, data);
  } else {
    console.log(`✅ ${message}`);
  }
}

/**
 * Log de advertencia
 * @param message - Mensaje de advertencia
 * @param data - Datos adicionales
 */
export function warnLog(message: string, data?: any) {
  if (data) {
    console.warn(`⚠️ ${message}`, data);
  } else {
    console.warn(`⚠️ ${message}`);
  }
}

