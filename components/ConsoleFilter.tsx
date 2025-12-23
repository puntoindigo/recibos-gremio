'use client';

import { useEffect } from 'react';

/**
 * Componente que filtra mensajes de Fast Refresh y HMR de la consola
 * Solo se ejecuta en desarrollo
 */
export default function ConsoleFilter() {
  useEffect(() => {
    // Solo filtrar en desarrollo
    if (process.env.NODE_ENV !== 'development') {
      return;
    }

    // Guardar las funciones originales
    const originalLog = console.log;
    const originalInfo = console.info;
    const originalWarn = console.warn;

    // Patrones a filtrar
    const filterPatterns = [
      /Fast Refresh/i,
      /\[Fast Refresh\]/i,
      /\[HMR\]/i,
      /hot-reloader/i,
      /rebuilding/i,
      /done in \d+ms/i,
      /DataManagerSingleton/i,
      /DataManagerProvider/i,
      /validate-data-source/i,
      /Worker de PDF/i,
      /PDF.js configurado/i,
    ];

    // Función para verificar si un mensaje debe ser filtrado
    const shouldFilter = (...args: any[]): boolean => {
      const message = args.map(arg => 
        typeof arg === 'string' ? arg : JSON.stringify(arg)
      ).join(' ');
      
      return filterPatterns.some(pattern => pattern.test(message));
    };

    // Interceptar console.log
    console.log = (...args: any[]) => {
      if (!shouldFilter(...args)) {
        originalLog(...args);
      }
    };

    // Interceptar console.info
    console.info = (...args: any[]) => {
      if (!shouldFilter(...args)) {
        originalInfo(...args);
      }
    };

    // Interceptar console.warn (por si acaso)
    console.warn = (...args: any[]) => {
      if (!shouldFilter(...args)) {
        originalWarn(...args);
      }
    };

    // Cleanup al desmontar
    return () => {
      console.log = originalLog;
      console.info = originalInfo;
      console.warn = originalWarn;
    };
  }, []);

  return null; // Este componente no renderiza nada
}

