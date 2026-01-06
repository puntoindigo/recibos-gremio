# 🏗️ Arquitectura Conceptual del Sistema de Recibos - Gremio

> **Documento de arquitectura orientada al dominio** para conectar conceptos del negocio.  
> **Última actualización**: Enero 2025  
> **Versión del sistema**: 0.1.0

---

## 📋 Índice de Conceptos

1. [Conceptos Principales](#conceptos-principales)
2. [Entidades del Dominio](#entidades-del-dominio)
3. [Relaciones entre Conceptos](#relaciones-entre-conceptos)
4. [Flujos de Negocio](#flujos-de-negocio)
5. [Conectores y Sistemas Externos](#conectores-y-sistemas-externos)
6. [Procesos y Transformaciones](#procesos-y-transformaciones)

---

## 🎯 Conceptos Principales

### [[Empleado]]

El **Empleado** es la entidad central del sistema. Representa a una persona que trabaja en una [[Empresa]] y genera [[Recibo de Sueldo|recibos de sueldo]].

**Atributos principales**:
- **Legajo**: Identificador único del empleado dentro de la empresa
- **Nombre**: Nombre completo del empleado
- **CUIL**: Código Único de Identificación Laboral
- **Empresa**: [[Empresa]] a la que pertenece
- **Estado**: Activo, inactivo, licencia, etc.

**Relaciones**:
- Pertenece a una [[Empresa]]
- Tiene múltiples [[Recibo de Sueldo|recibos de sueldo]]
- Puede tener [[Descuento|descuentos]] asociados
- Puede realizar [[Pedido|pedidos]] en el remitero
- Puede tener [[Autenticación|métodos de autenticación]] ([[Huella]], [[Tarjeta Magnética]])

**Operaciones**:
- Consultar historial de recibos
- Ver descuentos activos y pagados
- Realizar pedidos en el remitero
- Autenticarse mediante [[Huella]] o [[Tarjeta Magnética]]

---

### [[Recibo de Sueldo]]

El **Recibo de Sueldo** es un documento que registra los conceptos monetarios de un [[Empleado]] para un período específico.

**Atributos principales**:
- **Legajo**: Referencia al [[Empleado]]
- **Período**: Mes y año del recibo (formato: mm/yyyy)
- **Empresa**: [[Empresa]] que emite el recibo
- **Conceptos**: Montos de haberes y descuentos
- **Archivo PDF**: Documento original escaneado

**Relaciones**:
- Pertenece a un [[Empleado]]
- Pertenece a una [[Empresa]]
- Puede tener [[Descuento|descuentos]] aplicados
- Se genera a partir de un [[Procesamiento de PDF]]
- Puede ser validado mediante [[Control de Recibos]]

**Conceptos monetarios típicos**:
- Haberes: Sueldo básico, horas extras, bonificaciones
- Descuentos: Contribución solidaria, seguro sepelio, cuota mutual, resguardo mutual

**Estados**:
- Procesado: PDF subido y datos extraídos
- Consolidado: Datos consolidados por legajo/período
- Validado: Comparado con archivo oficial
- Con diferencias: Discrepancias encontradas en validación

---

### [[Empresa]]

La **Empresa** es la organización que emplea a los [[Empleado|empleados]] y genera los [[Recibo de Sueldo|recibos de sueldo]].

**Atributos principales**:
- **Nombre**: Nombre de la empresa
- **Logo**: Imagen corporativa
- **Colores**: Esquema de colores personalizado
- **Configuración**: Parsers específicos, reglas OCR

**Relaciones**:
- Tiene múltiples [[Empleado|empleados]]
- Genera múltiples [[Recibo de Sueldo|recibos de sueldo]]
- Tiene [[Descuento|descuentos]] asociados a sus empleados
- Puede tener [[Pedido|pedidos]] del remitero

**Empresas soportadas**:
- LIMPAR
- LIME
- SUMAR
- TYSA
- ESTRATEGIA AMBIENTAL
- ESTRATEGIA URBANA

---

### [[Descuento]]

El **Descuento** representa una deducción del sueldo de un [[Empleado]] que se aplica en múltiples cuotas.

**Atributos principales**:
- **Legajo**: Referencia al [[Empleado]]
- **Concepto**: Descripción del descuento
- **Monto total**: Monto completo a descontar
- **Cuotas**: Cantidad de cuotas
- **Cuotas pagadas**: Cuotas ya aplicadas
- **Cuotas restantes**: Cuotas pendientes
- **Estado**: Activo, completado, cancelado
- **Tipo**: Contribución solidaria, seguro sepelio, cuota mutual, etc.

**Relaciones**:
- Pertenece a un [[Empleado]]
- Pertenece a una [[Empresa]]
- Se aplica en múltiples [[Recibo de Sueldo|recibos de sueldo]]

**Tipos de descuentos**:
- Contribución Solidaria (código 20540)
- Seguro Sepelio (código 20590)
- Cuota Mutual (código 20595)
- Resguardo Mutual (código 20610)
- Descuento Mutual (código 20620)

**Flujo**:
1. Se crea un descuento para un empleado
2. Se divide en cuotas mensuales
3. Se aplica automáticamente en cada recibo del período correspondiente
4. Se marca como completado cuando todas las cuotas están pagadas

---

### [[Pedido]]

El **Pedido** representa una solicitud realizada por un [[Empleado]] en el remitero (sistema de pedidos/compras).

**Atributos principales**:
- **Legajo**: Referencia al [[Empleado]] que realiza el pedido
- **Fecha**: Fecha de creación del pedido
- **Estado**: Pendiente, en proceso, completado, cancelado
- **Items**: Productos o servicios solicitados
- **Monto total**: Costo total del pedido
- **Método de pago**: Descuento en recibo, efectivo, etc.

**Relaciones**:
- Pertenece a un [[Empleado]]
- Puede estar vinculado a un [[Descuento]] si se paga mediante descuento en recibo
- Puede generar múltiples [[Recibo de Sueldo|recibos de sueldo]] si se paga en cuotas

**Flujo**:
1. [[Empleado]] realiza un pedido en el remitero
2. Si elige pago mediante descuento, se crea un [[Descuento]] automáticamente
3. El descuento se aplica en los [[Recibo de Sueldo|recibos de sueldo]] según las cuotas acordadas
4. El pedido se marca como completado cuando el descuento está pagado

---

## 🔐 Autenticación y Conectores

### [[Autenticación]]

El sistema de **Autenticación** permite que los [[Empleado|empleados]] y usuarios accedan al sistema de forma segura.

**Métodos de autenticación**:
- **Credenciales**: Email y contraseña (para usuarios administrativos)
- **[[Huella]]**: Autenticación biométrica mediante huella dactilar
- **[[Tarjeta Magnética]]**: Autenticación mediante tarjeta con banda magnética

**Roles**:
- **SUPERADMIN**: Acceso total al sistema
- **ADMIN**: Gestión de empresa y usuarios
- **USER**: Acceso básico de consulta
- **EMPLEADO**: Acceso mediante [[Huella]] o [[Tarjeta Magnética]]

**Relaciones**:
- Los usuarios administrativos usan credenciales
- Los [[Empleado|empleados]] usan [[Huella]] o [[Tarjeta Magnética]]
- La autenticación permite acceso a [[Recibo de Sueldo|recibos de sueldo]]
- La autenticación permite realizar [[Pedido|pedidos]] en el remitero

---

### [[Huella]]

La **Huella** es un método de autenticación biométrica que identifica a un [[Empleado]] mediante su huella dactilar.

**Atributos principales**:
- **Legajo**: Referencia al [[Empleado]]
- **Template**: Datos biométricos de la huella
- **Estado**: Activa, inactiva, bloqueada
- **Fecha de registro**: Cuándo se registró la huella

**Relaciones**:
- Pertenece a un [[Empleado]]
- Se usa para [[Autenticación]]
- Permite acceso a [[Recibo de Sueldo|recibos de sueldo]]
- Permite realizar [[Pedido|pedidos]] en el remitero

**Flujo de autenticación**:
1. [[Empleado]] coloca su dedo en el lector de huellas
2. El sistema captura la huella
3. Se compara con las huellas registradas
4. Si coincide, se identifica al [[Empleado]]
5. Se permite el acceso a sus [[Recibo de Sueldo|recibos de sueldo]] y realizar [[Pedido|pedidos]]

---

### [[Tarjeta Magnética]]

La **Tarjeta Magnética** es un método de autenticación mediante tarjeta con banda magnética que identifica a un [[Empleado]].

**Atributos principales**:
- **Legajo**: Referencia al [[Empleado]]
- **Número de tarjeta**: Identificador único de la tarjeta
- **Estado**: Activa, inactiva, bloqueada, perdida
- **Fecha de emisión**: Cuándo se emitió la tarjeta
- **Fecha de vencimiento**: Cuándo expira la tarjeta

**Relaciones**:
- Pertenece a un [[Empleado]]
- Se usa para [[Autenticación]]
- Permite acceso a [[Recibo de Sueldo|recibos de sueldo]]
- Permite realizar [[Pedido|pedidos]] en el remitero

**Flujo de autenticación**:
1. [[Empleado]] pasa su tarjeta por el lector magnético
2. El sistema lee el número de tarjeta
3. Se busca el [[Empleado]] asociado a esa tarjeta
4. Se verifica que la tarjeta esté activa y no vencida
5. Si es válida, se permite el acceso a sus [[Recibo de Sueldo|recibos de sueldo]] y realizar [[Pedido|pedidos]]

---

## 🔄 Relaciones entre Conceptos

### Diagrama de Relaciones

```
[[Empresa]]
  ├── tiene múltiples → [[Empleado]]
  │     ├── tiene múltiples → [[Recibo de Sueldo]]
  │     ├── puede tener → [[Descuento]]
  │     ├── puede tener → [[Huella]]
  │     ├── puede tener → [[Tarjeta Magnética]]
  │     └── puede realizar → [[Pedido]]
  │
  └── genera múltiples → [[Recibo de Sueldo]]
        ├── pertenece a → [[Empleado]]
        ├── puede tener → [[Descuento]] aplicado
        └── puede ser validado por → [[Control de Recibos]]

[[Pedido]]
  ├── realizado por → [[Empleado]]
  └── puede generar → [[Descuento]]
        └── se aplica en → [[Recibo de Sueldo]]

[[Autenticación]]
  ├── mediante → [[Huella]]
  ├── mediante → [[Tarjeta Magnética]]
  └── permite acceso a → [[Recibo de Sueldo]] y [[Pedido]]
```

---

## 📊 Flujos de Negocio

### Flujo: Procesamiento de Recibo de Sueldo

1. **Subida de PDF**: Se sube un archivo PDF del recibo de sueldo
2. **Detección de Empresa**: El sistema detecta la [[Empresa]] mediante el nombre del archivo o contenido del PDF
3. **Extracción de Datos**: Se extraen los datos del recibo usando el parser específico de la [[Empresa]]
4. **Identificación de Empleado**: Se identifica al [[Empleado]] mediante el legajo
5. **Consolidación**: Se consolida con otros recibos del mismo [[Empleado]] y período
6. **Aplicación de Descuentos**: Se aplican los [[Descuento|descuentos]] activos del [[Empleado]]
7. **Almacenamiento**: Se guarda el recibo procesado en la base de datos

**Conceptos involucrados**: [[Recibo de Sueldo]], [[Empresa]], [[Empleado]], [[Descuento]], [[Procesamiento de PDF]]

---

### Flujo: Creación de Descuento desde Pedido

1. **Pedido en Remitero**: Un [[Empleado]] realiza un [[Pedido]] en el remitero
2. **Selección de Pago**: El [[Empleado]] elige pagar mediante descuento en recibo
3. **Creación de Descuento**: El sistema crea automáticamente un [[Descuento]] asociado al [[Pedido]]
4. **Configuración de Cuotas**: Se configura el número de cuotas según el acuerdo
5. **Aplicación en Recibos**: El [[Descuento]] se aplica automáticamente en los [[Recibo de Sueldo|recibos de sueldo]] futuros
6. **Seguimiento**: Se lleva registro de las cuotas pagadas y restantes

**Conceptos involucrados**: [[Pedido]], [[Empleado]], [[Descuento]], [[Recibo de Sueldo]]

---

### Flujo: Autenticación de Empleado

1. **Método de Autenticación**: El [[Empleado]] elige usar [[Huella]] o [[Tarjeta Magnética]]
2. **Captura**: Se captura la huella o se lee la tarjeta
3. **Identificación**: El sistema identifica al [[Empleado]] mediante el método de [[Autenticación]]
4. **Verificación**: Se verifica que el [[Empleado]] esté activo
5. **Acceso**: Se permite el acceso a:
   - Sus [[Recibo de Sueldo|recibos de sueldo]]
   - Realizar [[Pedido|pedidos]] en el remitero
   - Consultar [[Descuento|descuentos]] activos

**Conceptos involucrados**: [[Autenticación]], [[Empleado]], [[Huella]], [[Tarjeta Magnética]], [[Recibo de Sueldo]], [[Pedido]]

---

### Flujo: Validación de Recibos

1. **Importación de Archivo Oficial**: Se importa un archivo Excel con datos oficiales de la [[Empresa]]
2. **Comparación**: Se comparan los [[Recibo de Sueldo|recibos de sueldo]] procesados con los datos oficiales
3. **Detección de Diferencias**: Se identifican discrepancias entre los valores calculados y oficiales
4. **Generación de Reporte**: Se genera un reporte con las diferencias encontradas
5. **Almacenamiento de Control**: Se guarda el control con los resultados de la comparación
6. **Exportación**: Se exporta el control a CSV para análisis

**Conceptos involucrados**: [[Recibo de Sueldo]], [[Empresa]], [[Control de Recibos]]

---

## 🔌 Conectores y Sistemas Externos

### [[Procesamiento de PDF]]

El **Procesamiento de PDF** es el sistema que extrae datos de los archivos PDF de recibos de sueldo.

**Relaciones**:
- Recibe archivos PDF de [[Recibo de Sueldo|recibos de sueldo]]
- Utiliza parsers específicos por [[Empresa]]
- Genera datos estructurados que se almacenan como [[Recibo de Sueldo]]

**Procesos**:
- Detección de empresa
- Extracción de texto mediante OCR
- Parsing de datos estructurados
- Validación de datos extraídos

---

### [[Control de Recibos]]

El **Control de Recibos** es el sistema que valida los [[Recibo de Sueldo|recibos de sueldo]] procesados comparándolos con archivos oficiales.

**Relaciones**:
- Compara [[Recibo de Sueldo|recibos de sueldo]] procesados con datos oficiales
- Genera reportes de diferencias
- Pertenece a una [[Empresa]] y período específico

**Resultados**:
- Recibos OK: Sin diferencias
- Recibos con diferencias: Discrepancias encontradas
- Recibos faltantes: No encontrados en el archivo oficial

---

### [[Remitero]]

El **Remitero** es el sistema de pedidos/compras donde los [[Empleado|empleados]] pueden realizar pedidos.

**Relaciones**:
- Los [[Empleado|empleados]] realizan [[Pedido|pedidos]] en el remitero
- Los [[Pedido|pedidos]] pueden generar [[Descuento|descuentos]] automáticos
- Los [[Descuento|descuentos]] se aplican en los [[Recibo de Sueldo|recibos de sueldo]]

**Funcionalidades**:
- Catálogo de productos/servicios
- Carrito de compras
- Selección de método de pago
- Integración con sistema de descuentos

---

## 🔄 Procesos y Transformaciones

### [[Consolidación de Recibos]]

La **Consolidación de Recibos** agrupa múltiples [[Recibo de Sueldo|recibos de sueldo]] del mismo [[Empleado]] y período.

**Proceso**:
1. Se agrupan recibos por legajo y período
2. Se suman los conceptos monetarios
3. Se mantiene referencia a los archivos originales
4. Se crea un registro consolidado

**Relaciones**:
- Agrupa múltiples [[Recibo de Sueldo|recibos de sueldo]]
- Pertenece a un [[Empleado]]
- Pertenece a una [[Empresa]]

---

### [[Aplicación de Descuentos]]

La **Aplicación de Descuentos** es el proceso que aplica los [[Descuento|descuentos]] activos en los [[Recibo de Sueldo|recibos de sueldo]].

**Proceso**:
1. Se identifican los [[Descuento|descuentos]] activos del [[Empleado]]
2. Se calcula el monto de cada cuota
3. Se aplica el descuento en el [[Recibo de Sueldo]] correspondiente
4. Se actualiza el estado del [[Descuento]] (cuotas pagadas/restantes)

**Relaciones**:
- Aplica [[Descuento|descuentos]] en [[Recibo de Sueldo|recibos de sueldo]]
- Pertenece a un [[Empleado]]

---

## 📈 Conceptos Derivados y Agregados

### [[Ficha de Empleado]]

La **Ficha de Empleado** es una vista consolidada de toda la información de un [[Empleado]].

**Contenido**:
- Datos básicos del [[Empleado]]
- Historial de [[Recibo de Sueldo|recibos de sueldo]]
- [[Descuento|Descuentos]] activos y pagados
- Totales y estadísticas
- [[Pedido|Pedidos]] realizados

**Relaciones**:
- Pertenece a un [[Empleado]]
- Agrega información de [[Recibo de Sueldo|recibos de sueldo]]
- Agrega información de [[Descuento|descuentos]]
- Agrega información de [[Pedido|pedidos]]

---

### [[Dashboard]]

El **Dashboard** es una vista agregada que muestra estadísticas y resúmenes del sistema.

**Contenido**:
- Total de [[Empleado|empleados]]
- Total de [[Recibo de Sueldo|recibos de sueldo]]
- Total de [[Descuento|descuentos]] activos
- Total de [[Pedido|pedidos]] pendientes
- Gráficos y tendencias

**Relaciones**:
- Agrega información de múltiples [[Empleado|empleados]]
- Agrega información de múltiples [[Recibo de Sueldo|recibos de sueldo]]
- Agrega información de múltiples [[Descuento|descuentos]]
- Agrega información de múltiples [[Pedido|pedidos]]

---

## 🔗 Conexiones con Otros Módulos

Este documento está diseñado para conectarse con:

- **Arquitectura General** - Arquitectura general del sistema
- **Módulo Remitero** - Módulo del remitero (sistema de pedidos)
- **Módulo Autenticación** - Módulo de autenticación biométrica
- **Módulo Contabilidad** - Módulo de contabilidad y finanzas
- **Módulo Reportes** - Módulo de reportes y análisis

---

## 📚 Glosario de Conceptos

### Conceptos Principales
- [[Empleado]] - Persona que trabaja en una empresa
- [[Recibo de Sueldo]] - Documento que registra conceptos monetarios
- [[Empresa]] - Organización que emplea trabajadores
- [[Descuento]] - Deducción del sueldo en múltiples cuotas
- [[Pedido]] - Solicitud realizada en el remitero

### Conceptos de Autenticación
- [[Autenticación]] - Sistema de identificación de usuarios
- [[Huella]] - Método de autenticación biométrica
- [[Tarjeta Magnética]] - Método de autenticación mediante tarjeta

### Conceptos de Procesamiento
- [[Procesamiento de PDF]] - Extracción de datos de PDFs
- [[Control de Recibos]] - Validación de recibos procesados
- [[Consolidación de Recibos]] - Agrupación de recibos
- [[Aplicación de Descuentos]] - Proceso de aplicar descuentos

### Conceptos de Sistemas
- [[Remitero]] - Sistema de pedidos/compras
- [[Ficha de Empleado]] - Vista consolidada de empleado
- [[Dashboard]] - Vista agregada del sistema

---

## 🎯 Notas de Diseño

### Principios de Diseño

1. **Centralidad del Empleado**: El [[Empleado]] es la entidad central alrededor de la cual giran todos los demás conceptos.

2. **Trazabilidad**: Todos los conceptos mantienen relaciones claras que permiten rastrear el origen y destino de la información.

3. **Automatización**: Los procesos como [[Aplicación de Descuentos]] y [[Consolidación de Recibos]] son automáticos para reducir errores.

4. **Flexibilidad**: El sistema soporta múltiples métodos de [[Autenticación]] y múltiples tipos de [[Descuento|descuentos]].

5. **Validación**: El sistema incluye [[Control de Recibos]] para validar la integridad de los datos procesados.

### Consideraciones Futuras

- Integración con sistemas de nómina externos
- Integración con sistemas de contabilidad
- Módulo de reportes avanzados
- Sistema de notificaciones para empleados
- App móvil para consulta de recibos

---

*Documento generado para integración con Obsidian y otros sistemas de documentación conceptual.*  
*Última actualización: Enero 2025*
