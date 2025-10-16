// lib/pdf-validation.ts
import type { Parsed } from './pdf-parser';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  data: Record<string, string>;
}

export interface ValidationRule {
  field: string;
  required: boolean;
  pattern?: RegExp;
  customValidator?: (value: string, data: Record<string, string>) => string | null;
}

// Reglas de validación para recibos
const RECEIPT_VALIDATION_RULES: ValidationRule[] = [
  {
    field: 'LEGAJO',
    required: true,
    pattern: /^\d+$/,
    customValidator: (value) => {
      const num = parseInt(value);
      if (num <= 0) return 'El legajo debe ser un número positivo';
      if (num > 999999) return 'El legajo parece ser demasiado grande';
      return null;
    }
  },
  {
    field: 'PERIODO',
    required: true,
    pattern: /^\d{2}\/\d{4}$/,
    customValidator: (value) => {
      const [mes, año] = value.split('/');
      const mesNum = parseInt(mes);
      const añoNum = parseInt(año);
      
      if (mesNum < 1 || mesNum > 12) return 'El mes debe estar entre 01 y 12';
      if (añoNum < 2020 || añoNum > 2030) return 'El año debe estar entre 2020 y 2030';
      return null;
    }
  },
  {
    field: 'NOMBRE',
    required: true,
    pattern: /^[A-ZÁÉÍÓÚÑ\s,.-]+$/i,
    customValidator: (value) => {
      if (value.length < 3) return 'El nombre debe tener al menos 3 caracteres';
      if (value.length > 100) return 'El nombre es demasiado largo';
      return null;
    }
  },
  {
    field: 'CUIL',
    required: false,
    pattern: /^\d{11}$/,
    customValidator: (value) => {
      if (!value) return null; // CUIL es opcional
      if (value.length !== 11) return 'El CUIL debe tener 11 dígitos';
      
      // Validar prefijos comunes
      const prefijos = ['20', '23', '24', '25', '26', '27', '30', '33', '34'];
      const prefijo = value.substring(0, 2);
      if (!prefijos.includes(prefijo)) {
        return `Prefijo de CUIL inválido: ${prefijo}`;
      }
      return null;
    }
  },
  {
    field: 'EMPRESA',
    required: true,
    customValidator: (value) => {
      const empresasValidas = ['LIME', 'LIMPAR', 'SUMAR', 'TYSA'];
      if (!empresasValidas.includes(value)) {
        return `Empresa no reconocida: ${value}. Empresas válidas: ${empresasValidas.join(', ')}`;
      }
      return null;
    }
  }
];

// Función principal de validación
export function validateReceiptData(parsed: Parsed): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const data = { ...parsed.data };

  // Verificar si debe guardarse
  if (data.GUARDAR === 'false') {
    errors.push(`Archivo marcado como no guardar: ${data.GUARDAR_REASON || 'Razón no especificada'}`);
    return { isValid: false, errors, warnings, data };
  }

  // Aplicar reglas de validación
  for (const rule of RECEIPT_VALIDATION_RULES) {
    const value = data[rule.field] || '';
    
    // Verificar campo requerido
    if (rule.required && !value.trim()) {
      errors.push(`Campo requerido faltante: ${rule.field}`);
      continue;
    }

    // Si el campo está vacío y no es requerido, continuar
    if (!value.trim() && !rule.required) {
      continue;
    }

    // Verificar patrón
    if (rule.pattern && !rule.pattern.test(value)) {
      errors.push(`Formato inválido para ${rule.field}: "${value}"`);
      continue;
    }

    // Validación personalizada
    if (rule.customValidator) {
      const customError = rule.customValidator(value, data);
      if (customError) {
        errors.push(customError);
      }
    }
  }

  // Validaciones adicionales
  validateAdditionalRules(data, errors, warnings);

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    data
  };
}

// Validaciones adicionales específicas del negocio
function validateAdditionalRules(
  data: Record<string, string>, 
  errors: string[], 
  warnings: string[]
): void {
  // Verificar que haya al menos un concepto con valor
  const conceptosConValor = Object.entries(data)
    .filter(([key, value]) => /^\d{5}$/.test(key) && parseFloat(value) > 0)
    .length;

  if (conceptosConValor === 0) {
    warnings.push('No se encontraron conceptos con valores monetarios');
  }

  // Verificar valores monetarios razonables
  Object.entries(data).forEach(([key, value]) => {
    if (/^\d{5}$/.test(key)) { // Es un código de concepto
      const numValue = parseFloat(value);
      if (numValue > 1000000) {
        warnings.push(`Valor muy alto para concepto ${key}: $${numValue.toLocaleString()}`);
      }
      if (numValue < 0) {
        errors.push(`Valor negativo para concepto ${key}: $${numValue}`);
      }
    }
  });

  // Verificar coherencia de datos
  if (data.EMPRESA === 'DESCONOCIDA') {
    warnings.push('No se pudo detectar la empresa del recibo');
  }

  // Verificar que el archivo tenga un nombre válido
  if (!data.ARCHIVO || data.ARCHIVO.length < 3) {
    warnings.push('Nombre de archivo inválido o muy corto');
  }
}

// Función para limpiar y normalizar datos
export function normalizeReceiptData(data: Record<string, string>): Record<string, string> {
  const normalized = { ...data };

  // Normalizar legajo (solo números)
  if (normalized.LEGAJO) {
    normalized.LEGAJO = normalized.LEGAJO.replace(/\D/g, '');
  }

  // Normalizar CUIL (solo números)
  if (normalized.CUIL) {
    normalized.CUIL = normalized.CUIL.replace(/\D/g, '');
  }

  // Normalizar nombre (mayúsculas, limpiar espacios)
  if (normalized.NOMBRE) {
    normalized.NOMBRE = normalized.NOMBRE
      .toUpperCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Normalizar período (formato mm/yyyy)
  if (normalized.PERIODO) {
    const periodoMatch = normalized.PERIODO.match(/(\d{1,2})[\/\-](\d{4})/);
    if (periodoMatch) {
      const mes = periodoMatch[1].padStart(2, '0');
      const año = periodoMatch[2];
      normalized.PERIODO = `${mes}/${año}`;
    }
  }

  // Normalizar valores monetarios (convertir a formato estándar)
  Object.keys(normalized).forEach(key => {
    if (/^\d{5}$/.test(key)) { // Es un código de concepto
      const value = normalized[key];
      if (value && value !== '0' && value !== '0.00') {
        // Convertir formato europeo a estándar si es necesario
        const normalizedValue = value
          .replace(/\./g, '') // Quitar separadores de miles
          .replace(/,/g, '.'); // Convertir coma decimal a punto
        normalized[key] = parseFloat(normalizedValue).toFixed(2);
      }
    }
  });

  return normalized;
}

// Función para generar un resumen de validación
export function generateValidationSummary(result: ValidationResult): string {
  const { isValid, errors, warnings } = result;
  
  if (isValid && warnings.length === 0) {
    return '✅ Validación exitosa - Todos los datos son correctos';
  }
  
  let summary = isValid ? '⚠️ Validación exitosa con advertencias' : '❌ Validación fallida';
  
  if (errors.length > 0) {
    summary += `\n\nErrores (${errors.length}):\n${errors.map(e => `• ${e}`).join('\n')}`;
  }
  
  if (warnings.length > 0) {
    summary += `\n\nAdvertencias (${warnings.length}):\n${warnings.map(w => `• ${w}`).join('\n')}`;
  }
  
  return summary;
}
