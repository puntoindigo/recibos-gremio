// lib/concept-mapping.ts
// Sistema de unificación de conceptos entre empresas

export interface ConceptMapping {
  unifiedCode: string;
  unifiedName: string;
  companyMappings: Record<string, string>;
}

export const CONCEPT_MAPPINGS: ConceptMapping[] = [
  {
    unifiedCode: 'CONTRIBUCION_SOLIDARIA',
    unifiedName: 'Contribución Solidaria',
    companyMappings: {
      'LIMPAR': '20540',
      'LIME': '20540', 
      'TYSA': '20540',
      'SUMAR': '20540'
    }
  },
  {
    unifiedCode: 'SEGURO_SEPELIO',
    unifiedName: 'Gastos de Sepelio',
    companyMappings: {
      'LIMPAR': '20590',
      'LIME': '20590',
      'TYSA': '20590', 
      'SUMAR': '20590'
    }
  },
  {
    unifiedCode: 'CUOTA_MUTUAL',
    unifiedName: 'Cuota Mutual',
    companyMappings: {
      'LIMPAR': '20595',
      'LIME': '20595',
      'TYSA': '20595',
      'SUMAR': '20595'
    }
  },
  {
    unifiedCode: 'RESGUARDO_MUTUAL',
    unifiedName: 'Resguardo Mutuo',
    companyMappings: {
      'LIMPAR': '20610',
      'LIME': '20610',
      'TYSA': '20610',
      'SUMAR': '20610'
    }
  },
  {
    unifiedCode: 'MUTUAL_16_ABRIL',
    unifiedName: 'Mutual 16 de Abril',
    companyMappings: {
      'LIMPAR': '20620',
      'LIME': '20620',
      'TYSA': '20620',
      'SUMAR': '20620'
    }
  },
  {
    unifiedCode: 'ITEM_5310',
    unifiedName: 'ITEM 5.3.10',
    companyMappings: {
      'LIMPAR': '5310',
      'LIME': '5310',
      'TYSA': '5310',
      'SUMAR': '5310'
    }
  },
  {
    unifiedCode: 'JORNAL',
    unifiedName: 'Jornal',
    companyMappings: {
      'LIMPAR': 'JORNAL',
      'LIME': 'JORNAL',
      'TYSA': 'JORNAL',
      'SUMAR': 'JORNAL'
    }
  },
  {
    unifiedCode: 'HORAS_EXTRAS',
    unifiedName: 'Horas Extras',
    companyMappings: {
      'LIMPAR': 'HORAS_EXTRAS',
      'LIME': 'HORAS_EXTRAS',
      'TYSA': 'HORAS_EXTRAS',
      'SUMAR': 'HORAS_EXTRAS'
    }
  },
  {
    unifiedCode: 'ANTIGUEDAD',
    unifiedName: 'Antigüedad',
    companyMappings: {
      'LIMPAR': 'ANTIGUEDAD',
      'LIME': 'ANTIGUEDAD',
      'TYSA': 'ANTIGUEDAD',
      'SUMAR': 'ANTIGUEDAD'
    }
  },
  {
    unifiedCode: 'ADICIONALES',
    unifiedName: 'Adicionales',
    companyMappings: {
      'LIMPAR': 'ADICIONALES',
      'LIME': 'ADICIONALES',
      'TYSA': 'ADICIONALES',
      'SUMAR': 'ADICIONALES'
    }
  },
  {
    unifiedCode: 'INASISTENCIAS',
    unifiedName: 'Inasistencias',
    companyMappings: {
      'LIMPAR': 'INASISTENCIAS',
      'LIME': 'INASISTENCIAS',
      'TYSA': 'INASISTENCIAS',
      'SUMAR': 'INASISTENCIAS'
    }
  },
  {
    unifiedCode: 'SUELDO_BASICO',
    unifiedName: 'Sueldo Básico',
    companyMappings: {
      'LIMPAR': 'SUELDO_BASICO',
      'LIME': 'SUELDO_BASICO',
      'TYSA': 'SUELDO_BASICO',
      'SUMAR': 'SUELDO_BASICO'
    }
  },
  {
    unifiedCode: 'SUELDO_BRUTO',
    unifiedName: 'Sueldo Bruto',
    companyMappings: {
      'LIMPAR': 'SUELDO_BRUTO',
      'LIME': 'SUELDO_BRUTO',
      'TYSA': 'SUELDO_BRUTO',
      'SUMAR': 'SUELDO_BRUTO'
    }
  },
  {
    unifiedCode: 'TOTAL',
    unifiedName: 'Total',
    companyMappings: {
      'LIMPAR': 'TOTAL',
      'LIME': 'TOTAL',
      'TYSA': 'TOTAL',
      'SUMAR': 'TOTAL'
    }
  },
  {
    unifiedCode: 'DESCUENTOS',
    unifiedName: 'Descuentos',
    companyMappings: {
      'LIMPAR': 'DESCUENTOS',
      'LIME': 'DESCUENTOS',
      'TYSA': 'DESCUENTOS',
      'SUMAR': 'DESCUENTOS'
    }
  }
];

// Función para obtener el código unificado de un concepto
export function getUnifiedConceptCode(companyCode: string, company: string): string | null {
  const mapping = CONCEPT_MAPPINGS.find(m => 
    Object.keys(m.companyMappings).includes(company) && 
    m.companyMappings[company] === companyCode
  );
  return mapping ? mapping.unifiedCode : null;
}

// Función para obtener el nombre unificado de un concepto
export function getUnifiedConceptName(companyCode: string, company: string): string | null {
  const mapping = CONCEPT_MAPPINGS.find(m => 
    Object.keys(m.companyMappings).includes(company) && 
    m.companyMappings[company] === companyCode
  );
  return mapping ? mapping.unifiedName : null;
}

// Función para obtener todos los conceptos unificados
export function getAllUnifiedConcepts(): Array<{code: string, name: string}> {
  return CONCEPT_MAPPINGS.map(m => ({
    code: m.unifiedCode,
    name: m.unifiedName
  }));
}
