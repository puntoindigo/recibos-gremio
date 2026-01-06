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
  // Excluir archivos grandes del tracing de serverless functions
  experimental: {
    outputFileTracingExcludes: {
      '*': [
        'node_modules/@tensorflow/**',
        'node_modules/face-api.js/**',
        'public/models/**',
        'public/recibos/**',
        'node_modules/.cache/**',
        '.next/cache/**',
        'node_modules/pdfjs-dist/**',
      ],
    },
  },
  // Excluir paquetes pesados del bundle del servidor
  serverComponentsExternalPackages: ['face-api.js', 'pdfjs-dist'],
};

export default nextConfig;
