// hooks/useLearnedRules.ts
'use client';

import { useState, useEffect } from 'react';

interface LearnedRule {
  pattern: string; // Patrón del nombre del archivo
  empresa: string;
  periodo: string;
  timestamp: number;
}

const STORAGE_KEY = 'learned-parser-rules';

export function useLearnedRules() {
  const [rules, setRules] = useState<LearnedRule[]>([]);

  // Cargar reglas al inicializar
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setRules(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading learned rules:', error);
    }
  }, []);

  // Guardar reglas cuando cambien
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
    } catch (error) {
      console.error('Error saving learned rules:', error);
    }
  }, [rules]);

  // Aprender una nueva regla
  const learnRule = (fileName: string, empresa: string, periodo: string) => {
    const pattern = extractPattern(fileName);
    const newRule: LearnedRule = {
      pattern,
      empresa,
      periodo,
      timestamp: Date.now()
    };

    setRules(prev => {
      // Remover reglas duplicadas para el mismo patrón
      const filtered = prev.filter(rule => rule.pattern !== pattern);
      return [...filtered, newRule].sort((a, b) => b.timestamp - a.timestamp);
    });

    console.log('🧠 Aprendida nueva regla:', { pattern, empresa, periodo });
  };

  // Aprender regla solo de empresa (para casos donde no hay período)
  const learnEmpresaRule = (fileName: string, empresa: string) => {
    learnRule(fileName, empresa, '');
  };

  // Aprender regla solo de período (para casos donde no hay empresa)
  const learnPeriodoRule = (fileName: string, periodo: string) => {
    learnRule(fileName, '', periodo);
  };

  // Buscar regla aplicable
  const findApplicableRule = (fileName: string): { empresa?: string; periodo?: string } | null => {
    const pattern = extractPattern(fileName);
    
    console.log('🧠 Buscando regla para archivo:', { fileName, pattern, totalRules: rules.length });
    console.log('🧠 Reglas disponibles:', rules.map(r => ({ pattern: r.pattern, empresa: r.empresa, periodo: r.periodo })));
    
    // Buscar regla exacta
    const exactMatch = rules.find(rule => rule.pattern === pattern);
    if (exactMatch) {
      console.log('🧠 Aplicando regla aprendida exacta:', { pattern, empresa: exactMatch.empresa, periodo: exactMatch.periodo });
      return { empresa: exactMatch.empresa, periodo: exactMatch.periodo };
    }

    // Buscar regla similar (mismo prefijo o sufijo)
    const similarMatch = rules.find(rule => {
      const fileNameLower = fileName.toLowerCase();
      const rulePatternLower = rule.pattern.toLowerCase();
      
      // Verificar si el patrón está contenido en el nombre del archivo o viceversa
      const containsPattern = fileNameLower.includes(rulePatternLower) || 
                             rulePatternLower.includes(fileNameLower);
      
      // Verificar si comparten palabras clave importantes
      const sharesKeywords = (fileNameLower.includes('recibos') && rulePatternLower.includes('recibos')) ||
                            (fileNameLower.includes('convenio') && rulePatternLower.includes('convenio')) ||
                            (fileNameLower.includes('estrategia') && rulePatternLower.includes('estrategia')) ||
                            (fileNameLower.includes('ambiental') && rulePatternLower.includes('ambiental')) ||
                            (fileNameLower.includes('e.a') && rulePatternLower.includes('e.a'));
      
      // Para archivos como "RECIBOS E.A SETIEMBRE 2025 CONVENIO-X.pdf"
      // Verificar si comparten la estructura base
      const sharesStructure = fileNameLower.includes('recibos') && 
                             fileNameLower.includes('convenio') && 
                             rulePatternLower.includes('recibos') && 
                             rulePatternLower.includes('convenio');
      
      return containsPattern || sharesKeywords || sharesStructure;
    });
    
    if (similarMatch) {
      console.log('🧠 Aplicando regla similar:', { 
        fileName, 
        pattern: similarMatch.pattern, 
        empresa: similarMatch.empresa, 
        periodo: similarMatch.periodo 
      });
      return { empresa: similarMatch.empresa, periodo: similarMatch.periodo };
    }

    return null;
  };

  // Limpiar reglas antiguas (más de 30 días)
  const cleanOldRules = () => {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    setRules(prev => prev.filter(rule => rule.timestamp > thirtyDaysAgo));
  };

  return {
    rules,
    learnRule,
    learnEmpresaRule,
    learnPeriodoRule,
    findApplicableRule,
    cleanOldRules
  };
}

// Extraer patrón del nombre del archivo
function extractPattern(fileName: string): string {
  // Remover extensiones
  let pattern = fileName.replace(/\.(pdf|PDF)$/, '');
  
  // Remover números de página comunes
  pattern = pattern.replace(/_pag_\d+$/, '');
  pattern = pattern.replace(/_\d+$/, '');
  pattern = pattern.replace(/-\d+$/, '');
  
  // Remover fechas comunes
  pattern = pattern.replace(/\d{4}-\d{2}-\d{2}/, '');
  pattern = pattern.replace(/\d{2}\/\d{2}\/\d{4}/, '');
  
  // Remover números de convenio específicos (ej: CONVENIO-1, CONVENIO-2)
  pattern = pattern.replace(/CONVENIO-\d+$/i, 'CONVENIO');
  
  // Remover números de página específicos (ej: _pag_0001, _pag_0002)
  pattern = pattern.replace(/_pag_\d{4}$/i, '');
  
  // Para archivos como "RECIBOS E.A SETIEMBRE 2025 CONVENIO-1.pdf"
  // Extraer la parte común: "RECIBOS E.A SETIEMBRE 2025 CONVENIO"
  pattern = pattern.replace(/CONVENIO-\d+$/i, 'CONVENIO');
  
  // Remover años específicos pero mantener la estructura
  pattern = pattern.replace(/\s+\d{4}\s+/, ' ');
  
  // Limpiar espacios extra y normalizar
  pattern = pattern.trim();
  
  // Convertir a mayúsculas para consistencia
  pattern = pattern.toUpperCase();
  
  return pattern;
}
