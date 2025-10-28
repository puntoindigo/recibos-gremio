# Sistema de Parsers de PDF por Empresa

## Empresas Soportadas

### 1. LIMPAR (Parser Genérico)
- **Archivo**: `lib/pdf-parser-limpar.ts`
- **Detecta**: Archivos que contienen "LIMPAR" o archivos no reconocidos
- **Características**: Parser genérico que maneja múltiples formatos

### 2. LIME
- **Archivo**: `lib/pdf-parser-lime.ts`
- **Detecta**: Archivos que contienen "LIME" en el nombre o contenido
- **Características específicas**:
  - Extrae legajo después del CUIL
  - Nombre no incluye la palabra "Legajo"
  - Formato específico de LIME

### 3. SUMAR
- **Archivo**: `lib/pdf-parser-sumar.ts`
- **Detecta**: Archivos que contienen "SUMAR" en el nombre o contenido
- **Características específicas**:
  - Formato específico de SUMAR
  - Manejo particular de campos y valores

### 4. TYSA
- **Archivo**: `lib/pdf-parser-tysa.ts`
- **Detecta**: Archivos que contienen "TYSA" o "TALLER TYSA"
- **Características específicas**:
  - Legajo: número < 100, aparece después del CUIL o repetido cerca de "Periodo de Pago"
  - Nombre: no empieza con "Legajo"
  - EMPRESA: se establece como "TYSA"

## Sistema de Control por Empresa

### Parsers de Archivos Excel de Control

#### 1. LIMPAR (Parser Genérico)
- **Archivo**: `lib/import-excel.ts`
- **Mapeo de columnas**:
  - CONTRIBUCION SOLIDARIA → 20540
  - SEGURO SEPELIO → 20590
  - CUOTA MUTUAL → 20595
  - RESGUARDO MUTUAL → 20610
  - DESC. MUTUAL → 20620

#### 2. LIME
- **Archivo**: `lib/import-excel-lime.ts`
- **Mapeo específico** para archivos de control de LIME
- **Columnas específicas**:
  - G → SEGURO SEPELIO (20590)
  - H → CONTRIBUCION SOLIDARIA (20540)
  - I → RESGUARDO MUTUAL (20610)
  - J → CUOTA MUTUAL (20595)
  - L → DESC. MUTUAL (20620)
- **Datos**: Empiezan desde la fila 5
- **Logging**: Muestra valores de las 5 columnas principales

#### 3. SUMAR
- **Archivo**: `lib/import-excel-sumar.ts`
- **Mapeo específico** para archivos de control de SUMAR
- **Logging**: Muestra valores de las 5 columnas principales

#### 4. TYSA
- **Archivo**: `lib/import-excel-tysa.ts`
- **Mapeo específico** para archivos de control de TYSA
- **Logging**: Muestra valores de las 5 columnas principales

## Sistema Unificado

### Archivo Principal: `lib/import-excel-unified.ts`
- **Función principal**: `readOfficialXlsxUnified(file, empresa)`
- **Selección automática** del parser según la empresa
- **Detección automática**: `detectEmpresaFromFile(file)` para detectar empresa desde el contenido
- **Soporte de formatos**: `.xlsx` y `.xls`

### Uso en la Aplicación
```typescript
// Cargar archivo de control con parser específico por empresa
const rows = await readOfficialXlsxUnified(file, empresaFiltro);

// Detectar empresa automáticamente
const empresa = detectEmpresaFromFile(file);
```

## Configuración de Archivos

### Input de Archivos
- **Formatos soportados**: `.xlsx`, `.xls`
- **MIME types**: 
  - `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
  - `application/vnd.ms-excel`

### Detección de Empresa
1. **Por filtro**: Usa la empresa seleccionada en el filtro
2. **Automática**: Detecta desde el contenido del archivo
3. **Fallback**: Usa LIMPAR como parser genérico

## Logging y Debug

Cada parser incluye logging específico:
- **LIME**: `"LIME - fila X"` con valores de las 5 columnas principales
- **SUMAR**: `"SUMAR - fila X"` con valores de las 5 columnas principales  
- **TYSA**: `"TYSA - fila X"` con valores de las 5 columnas principales
- **Unificado**: `"🔄 Parseando archivo de control para empresa: X"`

## Estructura de Datos

Todos los parsers devuelven el mismo tipo `OfficialRow`:
```typescript
type OfficialRow = {
  key: string; // legajo||mm/yyyy
  valores: Record<string, string>; // códigos como string
  meta?: {
    legajo: string;
    periodoRaw?: string;
    periodo: string;
    nombre?: string;
    cuil?: string;
  };
};
```
