# 🔐 Configuración de Reconocimiento Facial

Este documento describe cómo configurar y usar el sistema de reconocimiento facial basado en face-api.js.

## 📋 Requisitos Previos

- Node.js instalado
- Navegador con soporte para WebRTC (cámara web)
- Permisos de cámara en el navegador

## 🚀 Instalación

### 1. Instalar dependencias

Las dependencias ya están instaladas en `package.json`:
- `face-api.js`: Librería de reconocimiento facial

### 2. Modelos desde CDN

Los modelos se cargan automáticamente desde CDN (unpkg) cuando se necesitan. **No es necesario descargar ni instalar nada adicional**. El sistema carga:

- `tiny_face_detector_model`: Detector de rostros rápido
- `face_landmark_68_model`: Detección de puntos faciales  
- `face_recognition_model`: Modelo de reconocimiento facial

Todo se carga automáticamente desde:
- **face-api.js**: `https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js`
- **Modelos**: `https://unpkg.com/face-api.js@0.22.2/weights`

## 🏗️ Arquitectura

El sistema de reconocimiento facial está completamente separado del resto del código:

```
lib/biometric/
  └── utils.ts                    # Utilidades (distancia euclidiana, comparación)

hooks/
  └── useFaceRecognition.ts      # Hook para manejar face-api.js

components/biometric/
  └── FaceRecognitionCapture.tsx # Componente UI para captura
```

## 💻 Uso

### En el Modal de Empleado

El componente `FaceRecognitionCapture` se integra automáticamente en el modal de empleado:

1. **Abrir modal de empleado** (crear o editar)
2. **Expandir sección "Reconocimiento Facial"** (colapsable por defecto)
3. **Activar cámara** haciendo clic en "Activar Cámara"
4. **Capturar rostro** cuando el empleado esté frente a la cámara
5. **Guardar empleado** - el descriptor se guarda automáticamente

### Estructura de Datos

El descriptor facial se guarda en el campo `data.FACE_DESCRIPTOR` del empleado:

```typescript
{
  legajo: "001",
  nombre: "Juan Pérez",
  data: {
    FACE_DESCRIPTOR: [0.123, -0.456, 0.789, ...] // Array de 128 números
  }
}
```

## 🔍 Reconocimiento

### Comparación de Rostros

Para comparar un rostro capturado con los guardados:

```typescript
import { findMatchingFace, euclideanDistance, FACE_MATCH_THRESHOLD } from '@/lib/biometric/utils';

// Descriptor capturado desde la cámara
const currentDescriptor = new Float32Array([...]);

// Descriptores guardados de empleados
const savedDescriptors = [
  { descriptor: [0.123, ...], legajo: "001" },
  { descriptor: [0.456, ...], legajo: "002" }
];

// Buscar coincidencia
const match = findMatchingFace(currentDescriptor, savedDescriptors);

if (match) {
  console.log(`Empleado encontrado: ${match.legajo} (distancia: ${match.distance})`);
} else {
  console.log('No se encontró coincidencia');
}
```

### Umbral de Distancia

- **< 0.6**: Misma persona (muy probable)
- **0.6 - 0.8**: Posiblemente la misma persona
- **> 0.8**: Diferentes personas

## 🔐 Seguridad y Privacidad

- Los descriptores faciales son **vectores numéricos** (no imágenes)
- No se almacenan fotografías, solo datos biométricos procesados
- Los descriptores se guardan en la base de datos junto con los datos del empleado
- El procesamiento se realiza **100% en el navegador** (no se envía a servidores externos)

## 🚧 Próximos Pasos

Este sistema está preparado para integrarse con:

1. **Registro de Ingresos/Egresos**: Usar reconocimiento facial para registrar entrada/salida en sedes
2. **Autenticación de Empleados**: Permitir acceso mediante reconocimiento facial
3. **Control de Acceso**: Validar identidad antes de realizar acciones sensibles

## 📝 Notas Técnicas

- Los modelos se cargan la primera vez que se expande la sección biométrica
- El procesamiento es asíncrono y no bloquea la UI
- Se requiere buena iluminación para mejores resultados
- Funciona mejor con rostros frontales y expresión neutra

## 🐛 Solución de Problemas

### Los modelos no se cargan

1. Verifica tu conexión a internet (los modelos se cargan desde CDN)
2. Verifica la consola del navegador para errores de CORS o red
3. Si hay problemas con el CDN, puedes cambiar la URL en `hooks/useFaceRecognition.ts`

### No se detecta el rostro

1. Verifica que la cámara tenga buena iluminación
2. Asegúrate de estar frente a la cámara
3. Intenta con diferentes ángulos
4. Verifica los permisos de cámara en el navegador

### Error de permisos de cámara

1. Verifica la configuración del navegador
2. Asegúrate de usar HTTPS (requerido para WebRTC)
3. En desarrollo local, `localhost` funciona sin HTTPS

