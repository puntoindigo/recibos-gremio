/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Warning: This allows production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
  webpack: (config, { dev, isServer }) => {
    // Configuración para mejorar la estabilidad de chunks
    if (dev && !isServer) {
      // Configuración de timeout para chunks
      config.output = {
        ...config.output,
        chunkLoadTimeout: 30000, // 30 segundos
      };
      
      // Configuración de optimización de chunks
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          minSize: 20000,
          maxSize: 244000,
          cacheGroups: {
            default: {
              minChunks: 1,
              priority: -20,
              reuseExistingChunk: true,
            },
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              priority: -10,
              chunks: 'all',
              minSize: 0,
            },
            common: {
              name: 'common',
              minChunks: 2,
              priority: -5,
              reuseExistingChunk: true,
            },
          },
        },
      };
      
      // Configuración de resolución de módulos
      config.resolve = {
        ...config.resolve,
        fallback: {
          ...config.resolve.fallback,
          fs: false,
          path: false,
        },
      };
    }
    return config;
  },
  serverExternalPackages: [],
}

module.exports = nextConfig
