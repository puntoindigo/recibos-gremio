# Sistema de Parsers de PDF por Empresa

## Estructura de Archivos

### `lib/pdf-parser.ts` (Principal)
- **Función**: Punto de entrada principal que detecta automáticamente la empresa del recibo
- **Lógica**: 
  - Usa `pdf-parser-generic.ts` para extraer texto básico
  - Detecta si es LIMPAR usando patrones específicos
  - Si es LIMPAR: usa `pdf-parser-limpar.ts`
  - Si no es LIMPAR: retorna datos genéricos con `GUARDAR: "false"`

### `lib/pdf-parser-limpar.ts` (LIMPAR)
- **Función**: Parser específico para recibos de LIMPAR
- **Contenido**: Todo el código original del parser actual
- **Características**: Extrae legajo, período, códigos 20xxx, CUIL, nombre, etc.

### `lib/pdf-parser-generic.ts` (Genérico)
- **Función**: Parser básico para detectar empresas desconocidas
- **Contenido**: Solo extrae texto básico del PDF
- **Salida**: 
  - `TEXTO_COMPLETO`: Todo el texto del PDF
  - `PRIMERAS_LINEAS`: Primeras 20 líneas para análisis
  - `EMPRESA_DETECTADA`: "DESCONOCIDA"

## Detección de Empresas

### LIMPAR
Se detecta si encuentra al menos 2 de estos patrones:
- `LIMPAR` (nombre de la empresa)
- `LEGAJO` (campo específico)
- `Período|PERIODO|PER.|abonado` (campo de período)
- `20xxx` (códigos que empiezan con 20)

### Otras Empresas
- Se usa el parser genérico
- Se hace `console.log` con los datos extraídos
- **NO se guarda** en la base de datos
- Se muestra toast informativo al usuario

## Flujo de Procesamiento

1. **Subida de archivo** → `pdf-parser.ts`
2. **Detección** → Parser genérico extrae texto básico
3. **Análisis** → Se evalúan patrones de LIMPAR
4. **Decisión**:
   - Si es LIMPAR → Parser específico → Guardar en BD
   - Si no es LIMPAR → Datos genéricos → Solo log, no guardar

## Agregar Nuevas Empresas

Para agregar soporte para una nueva empresa:

1. Crear `lib/pdf-parser-[EMPRESA].ts`
2. Implementar función `parsePdfReceiptToRecord`
3. Agregar detección en `pdf-parser.ts`
4. Actualizar lógica de guardado

### Ejemplo de estructura para nueva empresa:

```typescript
// lib/pdf-parser-nuevaempresa.ts
export async function parsePdfReceiptToRecord(file: File): Promise<Parsed> {
  // Lógica específica para la nueva empresa
  // Extraer campos específicos del formato de la empresa
  return { data, debugLines };
}
```

## Logs y Debugging

### LIMPAR detectado:
```
📄 Detectado como recibo de LIMPAR - usando parser específico
```

### Empresa desconocida:
```
🏢 Detectado como recibo de otra empresa - usando parser genérico
📊 Datos extraídos para análisis: {
  archivo: "recibo.pdf",
  primerasLineas: "...",
  textoCompleto: "...",
  empresaDetectada: "DESCONOCIDA"
}
```

## Notas Importantes

- Los recibos de empresas desconocidas **NO se guardan** en la base de datos
- Se mantiene compatibilidad total con recibos de LIMPAR existentes
- El sistema es extensible para agregar más empresas fácilmente
- Los logs ayudan a identificar patrones para nuevas empresas
