#!/bin/bash
# scripts/setup-pcsc-env.sh
# Configura el entorno para que Node.js encuentre las librerías PC/SC

echo "🔧 Configurando entorno PC/SC para Node.js..."
echo ""

# Obtener la ruta de pcsc-lite
PCSC_PATH=$(brew --prefix pcsc-lite)

if [ -z "$PCSC_PATH" ]; then
    echo "❌ Error: pcsc-lite no está instalado"
    echo "Instala con: brew install pcsc-lite"
    exit 1
fi

echo "✅ pcsc-lite encontrado en: $PCSC_PATH"
echo ""

# Verificar que las librerías existen
if [ -f "$PCSC_PATH/lib/libpcsclite_real.1.dylib" ]; then
    echo "✅ Librería encontrada: $PCSC_PATH/lib/libpcsclite_real.1.dylib"
else
    echo "❌ Error: No se encontró la librería PC/SC"
    exit 1
fi

# Configurar variables de entorno para esta sesión
export DYLD_LIBRARY_PATH="$PCSC_PATH/lib:$DYLD_LIBRARY_PATH"
export PKG_CONFIG_PATH="$PCSC_PATH/lib/pkgconfig:$PKG_CONFIG_PATH"

echo ""
echo "📋 Variables de entorno configuradas:"
echo "   DYLD_LIBRARY_PATH=$DYLD_LIBRARY_PATH"
echo "   PKG_CONFIG_PATH=$PKG_CONFIG_PATH"
echo ""

# Agregar al .zshrc si no está ya
if ! grep -q "pcsc-lite" ~/.zshrc 2>/dev/null; then
    echo "💾 Agregando configuración permanente a ~/.zshrc..."
    echo "" >> ~/.zshrc
    echo "# PC/SC configuration for Node.js" >> ~/.zshrc
    echo "export DYLD_LIBRARY_PATH=\"$PCSC_PATH/lib:\$DYLD_LIBRARY_PATH\"" >> ~/.zshrc
    echo "export PKG_CONFIG_PATH=\"$PCSC_PATH/lib/pkgconfig:\$PKG_CONFIG_PATH\"" >> ~/.zshrc
    echo "✅ Configuración agregada a ~/.zshrc"
    echo "   Reinicia Terminal o ejecuta: source ~/.zshrc"
else
    echo "✅ La configuración ya existe en ~/.zshrc"
fi

echo ""
echo "✅ Configuración completada!"
echo ""
echo "📋 Próximos pasos:"
echo "1. Reinicia Terminal O ejecuta: source ~/.zshrc"
echo "2. Prueba con: npm run nfc:diagnose"
echo ""

