#!/bin/bash
# scripts/fix-mac-pcsc.sh
# Script para intentar solucionar problemas de PC/SC en macOS

echo "🔧 SOLUCIONADOR DE PROBLEMAS PC/SC EN macOS"
echo "=========================================="
echo ""

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Verificar si pcsc-lite está instalado
echo "1️⃣ Verificando pcsc-lite..."
if brew list pcsc-lite &>/dev/null; then
    echo -e "${GREEN}✅ pcsc-lite está instalado${NC}"
else
    echo -e "${YELLOW}⚠️  pcsc-lite NO está instalado${NC}"
    echo "Instalando pcsc-lite..."
    brew install pcsc-lite
fi

# 2. Verificar permisos
echo ""
echo "2️⃣ Verificando permisos..."
echo "Por favor, verifica manualmente:"
echo "  - Preferencias del Sistema > Seguridad y Privacidad > Privacidad > Accesibilidad"
echo "  - Asegúrate de que Terminal esté marcado"

# 3. Reiniciar servicios si es necesario
echo ""
echo "3️⃣ Intentando reiniciar servicios..."
# En macOS, pcscd se inicia automáticamente cuando se necesita
# Pero podemos intentar matar procesos que puedan estar bloqueando
pkill -f pcscd 2>/dev/null && echo -e "${GREEN}✅ Procesos pcscd detenidos${NC}" || echo "No había procesos pcscd corriendo"

# 4. Verificar dispositivos USB
echo ""
echo "4️⃣ Verificando dispositivos USB conectados..."
if system_profiler SPUSBDataType | grep -qi "wCopy\|Smart Reader"; then
    echo -e "${GREEN}✅ Lector encontrado en USB${NC}"
    system_profiler SPUSBDataType | grep -i -A 5 "wCopy\|Smart Reader"
else
    echo -e "${RED}❌ Lector NO encontrado en USB${NC}"
    echo "Por favor, conecta el lector y vuelve a ejecutar este script"
fi

# 5. Verificar librerías
echo ""
echo "5️⃣ Verificando librerías PC/SC..."
if [ -d "/opt/homebrew/lib" ]; then
    echo "Buscando en /opt/homebrew/lib..."
    ls -la /opt/homebrew/lib/*pcsc* 2>/dev/null || echo "No se encontraron librerías PC/SC"
elif [ -d "/usr/local/lib" ]; then
    echo "Buscando en /usr/local/lib..."
    ls -la /usr/local/lib/*pcsc* 2>/dev/null || echo "No se encontraron librerías PC/SC"
fi

echo ""
echo "=========================================="
echo "✅ Verificación completada"
echo ""
echo "📋 Próximos pasos:"
echo "1. Reinicia Terminal"
echo "2. Ejecuta: npm run nfc:diagnose"
echo "3. Si sigue sin funcionar, puede necesitar drivers específicos del fabricante"
echo ""

