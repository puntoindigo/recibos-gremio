/**
 * Utilidades para manejo de estados
 */

import { CheckCircle, Circle, Clock, AlertCircle, XCircle } from 'lucide-react';
import React from 'react';

/**
 * Obtiene el icono para un estado
 * @param status - Estado del item
 * @returns Componente de icono
 */
export function getStatusIcon(status: string): React.ReactElement {
  switch (status) {
    case 'completed':
    case 'success':
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case 'in-progress':
    case 'processing':
      return <Clock className="h-4 w-4 text-yellow-600" />;
    case 'open':
      return <AlertCircle className="h-4 w-4 text-blue-600" />;
    case 'verifying':
      return <CheckCircle className="h-4 w-4 text-purple-600" />;
    case 'error':
    case 'failed':
      return <XCircle className="h-4 w-4 text-red-600" />;
    case 'warning':
      return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    case 'pending':
      return <Circle className="h-4 w-4 text-gray-400" />;
    default:
      return <Circle className="h-4 w-4 text-gray-400" />;
  }
}

/**
 * Obtiene las clases CSS para el color de estado
 * @param status - Estado del item
 * @returns Clases CSS para el color
 */
export function getStatusColor(status: string): string {
  switch (status) {
    case 'completed':
    case 'success':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'in-progress':
    case 'processing':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'open':
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'verifying':
      return 'bg-purple-100 text-purple-800 border-purple-300';
    case 'error':
    case 'failed':
      return 'bg-red-100 text-red-800 border-red-300';
    case 'warning':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'pending':
      return 'bg-gray-100 text-gray-800 border-gray-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
}

/**
 * Obtiene el texto de estado en mayúsculas
 * @param status - Estado del item
 * @returns Texto de estado en mayúsculas
 */
export function getStatusText(status: string): string {
  switch (status) {
    case 'completed':
      return 'COMPLETADO';
    case 'in-progress':
      return 'EN PROGRESO';
    case 'open':
      return 'ABIERTO';
    case 'verifying':
      return 'VERIFICANDO';
    case 'processing':
      return 'PROCESANDO';
    case 'error':
      return 'ERROR';
    case 'failed':
      return 'FALLIDO';
    case 'warning':
      return 'ADVERTENCIA';
    case 'pending':
      return 'PENDIENTE';
    default:
      return 'DESCONOCIDO';
  }
}
