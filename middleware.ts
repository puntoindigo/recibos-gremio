// middleware.ts
import { withAuth } from 'next-auth/middleware';

export default withAuth(
  function middleware(req) {
    // Aquí puedes agregar lógica adicional de middleware si es necesario
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname;
        
        // Permitir acceso a páginas públicas sin autenticación
        if (pathname.startsWith('/auth/')) {
          return true;
        }
        
        // Permitir acceso a documentación sin autenticación
        if (pathname.startsWith('/docs')) {
          return true;
        }
        
        // Permitir acceso a API routes sin autenticación (se manejan internamente)
        if (pathname.startsWith('/api/')) {
          return true;
        }
        
        // Requerir autenticación para todas las demás rutas
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - backups (backup files)
     * - public (public files)
     * - recibos (PDF files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|backups|public|recibos).*)',
  ],
};
