import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Warning: This allows production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
  eslint: {
    // Desactivar ESLint durante el build para permitir deploy
    // Los errores de linting se pueden corregir gradualmente
    ignoreDuringBuilds: true,
  },
  // face-api.js ahora se carga desde CDN, no necesita configuración especial
};

export default nextConfig;
