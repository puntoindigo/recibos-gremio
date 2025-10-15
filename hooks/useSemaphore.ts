import { useCallback, useRef } from 'react';

/**
 * Hook personalizado para implementar un semáforo que limita la concurrencia
 * @param maxConcurrency - Número máximo de operaciones simultáneas
 * @returns Objeto con métodos para adquirir y liberar permisos
 */
export function useSemaphore(maxConcurrency: number) {
  const currentCount = useRef(0);
  const waitingQueue = useRef<Array<() => void>>([]);

  const acquire = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      if (currentCount.current < maxConcurrency) {
        currentCount.current++;
        resolve();
      } else {
        waitingQueue.current.push(resolve);
      }
    });
  }, [maxConcurrency]);

  const release = useCallback(() => {
    if (waitingQueue.current.length > 0) {
      const next = waitingQueue.current.shift();
      if (next) {
        next();
      }
    } else {
      currentCount.current--;
    }
  }, []);

  const getCurrentCount = useCallback(() => currentCount.current, []);
  const getWaitingCount = useCallback(() => waitingQueue.current.length, []);

  return {
    acquire,
    release,
    getCurrentCount,
    getWaitingCount,
    maxConcurrency
  };
}
