// lib/auth.ts
import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          // Usuarios por defecto para desarrollo
          const defaultUsers = [
            {
              email: 'superadmin@recibos.com',
              password: 'super123',
              user: {
                id: 'superadmin_initial',
                email: 'superadmin@recibos.com',
                name: 'Super Administrador',
                role: 'SUPERADMIN',
                empresaId: undefined,
                permissions: ['*']
              }
            },
            {
              email: 'admin@recibos.com',
              password: 'admin123',
              user: {
                id: 'admin_initial',
                email: 'admin@recibos.com',
                name: 'Administrador Empresa',
                role: 'ADMIN',
                empresaId: 'empresa_limpar',
                permissions: ['recibos', 'controles', 'descuentos', 'reportes']
              }
            },
            {
              email: 'usuario@recibos.com',
              password: 'user123',
              user: {
                id: 'user_initial',
                email: 'usuario@recibos.com',
                name: 'Usuario Regular',
                role: 'USER',
                empresaId: 'empresa_limpar',
                permissions: ['recibos', 'controles']
              }
            }
          ];

          const matchedUser = defaultUsers.find(
            u => u.email === credentials.email && u.password === credentials.password
          );

          if (matchedUser) {
            return matchedUser.user;
          }

          return null;
        } catch (error) {
          console.error('Error en autenticación:', error);
          return null;
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.empresaId = user.empresaId;
        token.permissions = user.permissions;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!;
        session.user.role = token.role as string;
        session.user.empresaId = token.empresaId as string;
        session.user.permissions = token.permissions as string[];
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      console.log('NextAuth Redirect:', { url, baseUrl });
      // Evitar bucles de redirección
      if (url === baseUrl + '/auth/signin') {
        return baseUrl;
      }
      // Si la URL es relativa, agregar baseUrl
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // Si la URL es del mismo dominio, permitirla
      if (url.startsWith(baseUrl)) return url;
      // Por defecto, redirigir a la página principal
      return baseUrl;
    }
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error'
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60 // 24 horas
  },
  secret: process.env.NEXTAUTH_SECRET || 'fallback-secret-key',
  debug: true, // Habilitar debug siempre para diagnosticar
  logger: {
    error(code, metadata) {
      console.error('NextAuth Error:', code, metadata);
    },
    warn(code) {
      console.warn('NextAuth Warning:', code);
    },
    debug(code, metadata) {
      console.log('NextAuth Debug:', code, metadata);
    }
  }
};
