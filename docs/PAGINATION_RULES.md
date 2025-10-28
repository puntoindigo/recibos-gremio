# Reglas de Paginación - Sistema de Recibos

## Regla Principal
**Cualquier listado de la aplicación que tenga al menos 25 registros DEBE tener paginación.**

## Implementación

### 1. Utilidades de Paginación
- **Archivo:** `lib/pagination-utils.ts`
- **Función:** `shouldShowPagination(itemCount)` - Determina si mostrar paginación
- **Umbral:** 25 registros (`PAGINATION_THRESHOLD = 25`)

### 2. Hook de Paginación
- **Archivo:** `hooks/usePagination.ts`
- **Configuración por defecto:** 25 elementos por página
- **Opciones:** 10, 25, 50, 100 elementos por página

### 3. Componente de Paginación
- **Archivo:** `components/Pagination.tsx`
- **Características:**
  - Navegación con botones primera/última página
  - Navegación con botones anterior/siguiente
  - Páginas numeradas con elipsis
  - Selector de elementos por página
  - Información de elementos mostrados

## Listados con Paginación Implementada

### ✅ Completados
1. **Descuentos** (`components/DescuentosPanel.tsx`)
   - Listado de descuentos con filtros
   - Paginación automática si hay 25+ registros

2. **Tabla Agregada** (`components/TablaAgregada/TablaAgregada.tsx`)
   - Listado de recibos consolidados
   - Paginación ya implementada

3. **Control Details** (`components/Control/ControlDetailsPanel.tsx`)
   - Diferencias y faltantes en controles
   - Paginación personalizada implementada

### 🔍 Por Auditar
1. **Lista de Controles Guardados** (`components/Control/SavedControlsList.tsx`)
2. **Ficha de Empleado** (`components/FichaEmpleadoModal.tsx`)
3. **Otros listados que puedan crecer**

## Cómo Implementar Paginación

### Paso 1: Importar utilidades
```typescript
import { usePagination } from '@/hooks/usePagination';
import { shouldShowPagination, applyPaginationRule } from '@/lib/pagination-utils';
import Pagination from './Pagination';
```

### Paso 2: Configurar paginación
```typescript
// Paginación - solo si hay 25+ registros
const showPagination = shouldShowPagination(filteredData.length);
const pagination = usePagination({
  data: filteredData,
  initialItemsPerPage: 25
});

// Usar datos paginados si hay 25+ registros, sino mostrar todos
const displayData = applyPaginationRule(filteredData, pagination);
```

### Paso 3: Usar datos paginados en el render
```typescript
{displayData.map((item) => (
  // Render del item
))}
```

### Paso 4: Agregar componente de paginación
```typescript
{/* Paginación - solo si hay 25+ registros */}
{showPagination && (
  <Pagination
    currentPage={pagination.currentPage}
    totalPages={pagination.totalPages}
    totalItems={pagination.totalItems}
    itemsPerPage={pagination.itemsPerPage}
    onPageChange={pagination.setCurrentPage}
    onItemsPerPageChange={pagination.setItemsPerPage}
  />
)}
```

## Beneficios

1. **Performance:** Mejora el rendimiento con listados grandes
2. **UX:** Mejor experiencia de usuario con navegación clara
3. **Consistencia:** Comportamiento uniforme en toda la aplicación
4. **Escalabilidad:** Preparado para crecer con más datos

## Notas Técnicas

- La paginación se activa automáticamente cuando hay 25+ registros
- Si hay menos de 25 registros, se muestran todos sin paginación
- Los filtros se aplican antes de la paginación
- La paginación se resetea al cambiar filtros
- Se mantiene la página actual al cambiar elementos por página
