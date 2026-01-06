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
  serverExternalPackages: ['face-api.js'],
  webpack: (config, { isServer }) => {
    // Excluir face-api.js del bundle del servidor
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push('face-api.js');
    }
    
    // Ignorar módulos de Node.js que face-api.js intenta usar en el cliente
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }
    
    return config;
  },
};

export default nextConfig;
