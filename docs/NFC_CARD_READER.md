# 📱 Lector de Tarjetas NFC/RFID

Sistema de prueba para leer tarjetas NFC/RFID usando el lector JD014 de Shenzhen Judi Trading Co.

## 🎯 Objetivo

Crear una interfaz de prueba que permita:
1. Leer el UID de tarjetas NFC/RFID
2. Visualizar los datos leídos en tiempo real
3. Preparar la base para asociar tarjetas con empleados (similar a datos biométricos)

## 📋 Requisitos

- Lector JD014 conectado por USB
- Node.js instalado
- Next.js corriendo en desarrollo

## 🚀 Instalación

### 1. Instalar dependencias

```bash
npm install nfc-pcsc
```

**Nota:** En macOS, es posible que necesites instalar drivers adicionales o dar permisos al sistema para acceder al dispositivo USB.

### 2. Verificar conexión del lector

Conecta el lector JD014 por USB y verifica que el sistema lo reconozca:

```bash
# En macOS
system_profiler SPUSBDataType | grep -i "judy\|nfc\|card"

# O simplemente verifica que aparezca en la lista de dispositivos USB
```

## 🔧 Uso

### Paso 1: Iniciar servidor Next.js

En una terminal:

```bash
npm run dev
```

El servidor estará disponible en `http://localhost:3000`

### Paso 2: Ejecutar script de lectura NFC

En otra terminal:

```bash
npm run nfc:reader
```

O directamente:

```bash
node scripts/nfc-reader.js
```

Deberías ver:

```
🔌 Iniciando lector NFC...
📱 Conecta tu lector JD014 y pasa una tarjeta

✅ Lector conectado: [Nombre del lector]
⏳ Esperando tarjeta...
```

### Paso 3: Abrir página de prueba

Navega a: `http://localhost:3000/test-card-reader`

### Paso 4: Pasar tarjeta

Acerca una tarjeta NFC/RFID al lector. Deberías ver:

1. **En la terminal del script:**
   ```
   🎴 TARJETA DETECTADA!
      UID: [UID de la tarjeta]
      Tipo: [Tipo de tarjeta]
      Timestamp: [Fecha y hora]
   ```

2. **En la página web:**
   - El UID aparecerá en la sección "Última Tarjeta Detectada"
   - Se mostrará un toast de confirmación
   - El estado cambiará a "Lector conectado"

## 📁 Archivos Creados

### `scripts/nfc-reader.js`
Script Node.js que:
- Se conecta al lector NFC usando `nfc-pcsc`
- Detecta tarjetas cuando se acercan
- Envía el UID al endpoint API de Next.js
- Maneja errores y desconexiones

### `app/api/nfc-card/route.ts`
Endpoint API que:
- Recibe UIDs desde el script Node.js (POST)
- Almacena el último UID leído en memoria
- Permite consultar el último UID (GET) para polling

### `app/test-card-reader/page.tsx`
Página de prueba que:
- Hace polling cada 500ms al endpoint API
- Muestra el último UID detectado
- Indica el estado de conexión del lector
- Permite pausar/reanudar el monitoreo

## 🔄 Flujo de Datos

```
Lector USB (JD014)
    ↓
Script Node.js (nfc-reader.js)
    ↓ HTTP POST
API Endpoint (/api/nfc-card)
    ↓ Almacena en memoria
Página Web (polling GET cada 500ms)
    ↓ Muestra UID
Interfaz de Usuario
```

## 🐛 Solución de Problemas

### El lector no se detecta

1. **Verifica la conexión USB:**
   ```bash
   # macOS
   system_profiler SPUSBDataType
   ```

2. **Verifica permisos:**
   - En macOS, puede que necesites dar permisos de seguridad al terminal
   - Ve a: Sistema > Privacidad y Seguridad > Accesibilidad

3. **Reinstala dependencias:**
   ```bash
   npm uninstall nfc-pcsc
   npm install nfc-pcsc
   ```

### El script no envía datos al servidor

1. **Verifica que Next.js esté corriendo:**
   - Debe estar en `http://localhost:3000`
   - Verifica en el navegador que la página `/test-card-reader` carga

2. **Verifica la conexión:**
   - El script intenta conectarse a `localhost:3000`
   - Si usas otro puerto, modifica `scripts/nfc-reader.js`

### No aparece el UID en la página web

1. **Verifica que el script esté corriendo:**
   - Debe mostrar "Lector conectado" en la terminal

2. **Verifica el polling:**
   - Abre la consola del navegador (F12)
   - Debe haber requests a `/api/nfc-card` cada 500ms

3. **Prueba refrescar manualmente:**
   - Usa el botón "Actualizar" en la página

## 🔮 Próximos Pasos

1. **Asociar tarjetas con empleados:**
   - Crear tabla en base de datos para almacenar UID → empleado
   - Similar a cómo se manejan los datos biométricos

2. **Mejorar comunicación:**
   - Implementar WebSockets para comunicación en tiempo real
   - Eliminar necesidad de polling

3. **Integración con registro de entrada/salida:**
   - Usar tarjetas como método alternativo a reconocimiento facial
   - Permitir registro rápido con tarjeta en página `/on`

4. **Persistencia:**
   - Reemplazar almacenamiento en memoria por base de datos
   - Guardar historial de lecturas

## 📝 Notas Técnicas

- **Almacenamiento actual:** Los UIDs se almacenan en memoria del servidor (se pierden al reiniciar)
- **Polling:** La página hace polling cada 500ms (configurable)
- **Detección de duplicados:** El script evita leer la misma tarjeta múltiples veces seguidas
- **Compatibilidad:** Funciona con lectores PCSC estándar (no emuladores de teclado)

## 🔒 Seguridad

- El endpoint API no tiene autenticación actualmente (solo para pruebas)
- En producción, agregar validación de origen y autenticación
- Los UIDs son datos sensibles, considerar encriptación

