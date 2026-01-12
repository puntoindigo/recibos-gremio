# 🔧 Solución de Problemas - Lector NFC JD014 / wCopy Smart Reader

## Problema: El lector no detecta tarjetas

### Síntomas
- El lector hace ruido cuando pasas una tarjeta
- El LED se pone verde
- Pero el script Node.js no detecta nada
- No aparece como lector PC/SC

### Diagnóstico

#### 1. Verificar que el dispositivo está conectado
```bash
system_profiler SPUSBDataType | grep -i "wCopy\|Smart Reader"
```

#### 2. Verificar PC/SC
```bash
npm run nfc:diagnose
```

#### 3. Probar con pcsc_scan
```bash
brew install pcsc-tools
pcsc_scan
```

### Posibles Soluciones

#### Opción 1: Drivers específicos
Algunos lectores JD014/wCopy necesitan drivers específicos:
1. Busca drivers para macOS en el sitio del fabricante
2. Algunos modelos requieren drivers de "NSCCN" o "Shenzhen Judi"
3. Instala los drivers y reinicia

#### Opción 2: Modo del lector
Algunos lectores tienen múltiples modos:
- Modo PC/SC (lector de tarjetas)
- Modo HID (emulador de teclado)
- Modo almacenamiento masivo

Verifica si hay un botón o switch en el lector para cambiar de modo.

#### Opción 3: Configuración en macOS
1. Ve a Preferencias del Sistema > Seguridad y Privacidad
2. Busca "Privacidad" > "Accesibilidad"
3. Asegúrate de que Terminal tenga permisos
4. También verifica "Privacidad" > "Acceso completo al disco" si aplica

#### Opción 4: Usar aplicación del fabricante
Algunos lectores vienen con software específico que debe estar corriendo:
- Busca software del fabricante
- Puede necesitar estar activo para que el lector funcione en modo PC/SC

### Verificación Final

Si después de todo esto el lector sigue sin funcionar:

1. **Prueba en otra computadora** (Windows/Linux) para verificar que el lector funciona
2. **Contacta al fabricante** para drivers específicos de macOS
3. **Considera usar otro lector** compatible con macOS/PC/SC

### Lectores Recomendados para macOS

- ACR122U (compatible con PC/SC)
- ACR1252U (compatible con PC/SC)
- OMNIKEY 5022CL (compatible con PC/SC)

Estos lectores tienen mejor soporte en macOS y funcionan directamente con PC/SC sin drivers adicionales.

