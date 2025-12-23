#!/bin/bash
# Script para actualizar .env.vercel desde .env.local
# Uso: ./scripts/update-vercel-env.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_LOCAL="$PROJECT_ROOT/.env.local"
ENV_VERCEL="$PROJECT_ROOT/.env.vercel"

if [ ! -f "$ENV_LOCAL" ]; then
  echo "❌ Error: .env.local no existe"
  exit 1
fi

echo "📝 Actualizando .env.vercel desde .env.local..."

# Leer variables de .env.local
SUPABASE_URL=$(grep "^NEXT_PUBLIC_SUPABASE_URL=" "$ENV_LOCAL" | cut -d '=' -f2- | tr -d '"' | tr -d "'")
SUPABASE_ANON_KEY=$(grep "^NEXT_PUBLIC_SUPABASE_ANON_KEY=" "$ENV_LOCAL" | cut -d '=' -f2- | tr -d '"' | tr -d "'")
SUPABASE_SERVICE_KEY=$(grep "^SUPABASE_SERVICE_ROLE_KEY=" "$ENV_LOCAL" | cut -d '=' -f2- | tr -d '"' | tr -d "'" || echo "REEMPLAZA_CON_TU_SERVICE_ROLE_KEY")
NEXTAUTH_SECRET=$(grep "^NEXTAUTH_SECRET=" "$ENV_LOCAL" | cut -d '=' -f2- | tr -d '"' | tr -d "'")

# Crear .env.vercel
cat > "$ENV_VERCEL" << EOF
# Archivo para importar variables de entorno en Vercel
# IMPORTANTE: Este archivo NO se sube a git (está en .gitignore)
# 
# Cómo importar en Vercel:
# 1. Ve a tu proyecto en Vercel Dashboard
# 2. Settings → Environment Variables
# 3. Haz clic en "Import" o "Add" y pega el contenido de este archivo
# 4. O usa: vercel env pull .env.vercel (desde la CLI)
#
# NOTA: Actualiza NEXTAUTH_URL con tu dominio real de Vercel antes de importar

# Supabase
NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_KEY

# NextAuth.js
# IMPORTANTE: Actualiza esta URL con tu dominio real de Vercel
NEXTAUTH_URL=https://tu-dominio.vercel.app
NEXTAUTH_SECRET=$NEXTAUTH_SECRET
EOF

echo "✅ .env.vercel actualizado exitosamente"
echo "📋 Recuerda actualizar NEXTAUTH_URL con tu dominio real de Vercel antes de importar"

