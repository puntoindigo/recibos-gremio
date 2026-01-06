// lib/biometric/utils.ts
// Utilidades para reconocimiento facial

/**
 * Calcula la distancia euclidiana entre dos descriptores faciales
 * @param descriptor1 Primer descriptor (vector de 128 posiciones)
 * @param descriptor2 Segundo descriptor (vector de 128 posiciones)
 * @returns Distancia euclidiana entre los dos descriptores
 */
export function euclideanDistance(
  descriptor1: Float32Array | number[],
  descriptor2: Float32Array | number[]
): number {
  if (descriptor1.length !== descriptor2.length) {
    throw new Error('Los descriptores deben tener la misma longitud');
  }

  let sum = 0;
  for (let i = 0; i < descriptor1.length; i++) {
    const diff = descriptor1[i] - descriptor2[i];
    sum += diff * diff;
  }

  return Math.sqrt(sum);
}

/**
 * Umbral de distancia para considerar que dos rostros son la misma persona
 * Valores menores a 0.6 generalmente indican la misma persona
 */
export const FACE_MATCH_THRESHOLD = 0.6;

/**
 * Compara un descriptor con una lista de descriptores guardados
 * @param currentDescriptor Descriptor actual a comparar
 * @param savedDescriptors Lista de descriptores guardados
 * @returns Índice del descriptor más cercano si está por debajo del umbral, null si no hay coincidencia
 */
export function findMatchingFace(
  currentDescriptor: Float32Array | number[],
  savedDescriptors: Array<{ descriptor: Float32Array | number[]; legajo: string }>
): { legajo: string; distance: number } | null {
  let bestMatch: { legajo: string; distance: number } | null = null;
  let minDistance = Infinity;

  for (const saved of savedDescriptors) {
    const distance = euclideanDistance(currentDescriptor, saved.descriptor);
    
    if (distance < minDistance && distance < FACE_MATCH_THRESHOLD) {
      minDistance = distance;
      bestMatch = {
        legajo: saved.legajo,
        distance
      };
    }
  }

  return bestMatch;
}

/**
 * Convierte un descriptor Float32Array a un array de números para almacenamiento
 */
export function descriptorToArray(descriptor: Float32Array): number[] {
  return Array.from(descriptor);
}

/**
 * Convierte un array de números a Float32Array para comparación
 */
export function arrayToDescriptor(array: number[]): Float32Array {
  return new Float32Array(array);
}

