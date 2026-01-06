// lib/biometric/face-matcher.ts
// Utilidades para reconocer empleados mediante reconocimiento facial
// Preparado para uso futuro en registro de ingresos/egresos

import { findMatchingFace, arrayToDescriptor, FACE_MATCH_THRESHOLD } from './utils';
import type { DataManager } from '../data-manager-singleton';

export interface FaceMatchResult {
  legajo: string;
  nombre: string;
  empresa: string;
  distance: number;
  confidence: number; // 0-100, mayor es mejor
}

/**
 * Busca un empleado que coincida con el descriptor facial capturado
 * 
 * Esta función está preparada para usarse en:
 * - Registro de ingresos/egresos en sedes
 * - Autenticación de empleados
 * - Control de acceso
 * 
 * @param capturedDescriptor Descriptor facial capturado desde la cámara
 * @param dataManager Manager de datos para obtener empleados
 * @returns Resultado de la búsqueda o null si no hay coincidencia
 */
export async function findEmployeeByFace(
  capturedDescriptor: Float32Array | number[],
  dataManager: DataManager
): Promise<FaceMatchResult | null> {
  try {
    // Obtener todos los empleados con descriptores faciales
    const allConsolidated = await dataManager.getConsolidated();
    
    // Filtrar solo los que tienen descriptor facial
    const employeesWithFace = allConsolidated
      .filter(emp => emp.data?.FACE_DESCRIPTOR && Array.isArray(emp.data.FACE_DESCRIPTOR))
      .map(emp => ({
        legajo: emp.legajo,
        nombre: emp.nombre || 'Sin nombre',
        empresa: emp.data?.EMPRESA || 'Sin empresa',
        descriptor: arrayToDescriptor(emp.data.FACE_DESCRIPTOR)
      }));

    if (employeesWithFace.length === 0) {
      return null;
    }

    // Buscar coincidencia
    const match = findMatchingFace(
      capturedDescriptor,
      employeesWithFace.map(emp => ({
        descriptor: emp.descriptor,
        legajo: emp.legajo
      }))
    );

    if (!match) {
      return null;
    }

    // Encontrar los datos completos del empleado
    const employeeData = employeesWithFace.find(emp => emp.legajo === match.legajo);
    
    if (!employeeData) {
      return null;
    }

    // Calcular confianza (inversa de la distancia, normalizada)
    const confidence = Math.max(0, Math.min(100, (1 - match.distance / FACE_MATCH_THRESHOLD) * 100));

    return {
      legajo: match.legajo,
      nombre: employeeData.nombre,
      empresa: employeeData.empresa,
      distance: match.distance,
      confidence: Math.round(confidence)
    };
  } catch (error) {
    console.error('Error buscando empleado por rostro:', error);
    return null;
  }
}

/**
 * Verifica si un descriptor facial corresponde a un empleado específico
 * 
 * Útil para verificar identidad antes de realizar acciones sensibles
 */
export async function verifyEmployeeFace(
  capturedDescriptor: Float32Array | number[],
  legajo: string,
  dataManager: DataManager
): Promise<{ verified: boolean; distance?: number; confidence?: number }> {
  try {
    const empleados = await dataManager.getConsolidatedByLegajo(legajo);
    
    if (empleados.length === 0) {
      return { verified: false };
    }

    const empleado = empleados[0];
    const savedDescriptor = empleado.data?.FACE_DESCRIPTOR;

    if (!savedDescriptor || !Array.isArray(savedDescriptor)) {
      return { verified: false };
    }

    const { euclideanDistance, FACE_MATCH_THRESHOLD } = await import('./utils');
    const distance = euclideanDistance(capturedDescriptor, arrayToDescriptor(savedDescriptor));
    const verified = distance < FACE_MATCH_THRESHOLD;
    const confidence = verified 
      ? Math.max(0, Math.min(100, (1 - distance / FACE_MATCH_THRESHOLD) * 100))
      : 0;

    return {
      verified,
      distance,
      confidence: Math.round(confidence)
    };
  } catch (error) {
    console.error('Error verificando rostro del empleado:', error);
    return { verified: false };
  }
}

