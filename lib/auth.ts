// lib/auth.ts
import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import crypto from 'crypto';

type AccountsEmbedPayload = {
  email: string;
  name: string;
  isAdmin?: boolean;
  iat: number;
  exp: number;
};

const toBase64Url = (input: Buffer | string) => {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input, 'utf8');
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
};

const fromBase64Url = (input: string) => {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = padded.length % 4 ? 4 - (padded.length % 4) : 0;
  return Buffer.from(padded + '='.repeat(padLength), 'base64').toString('utf8');
};

const verifyAccountsToken = (token: string, secret: string) => {
  const [body, signature] = token.split('.');
  if (!body || !signature) {
    return null;
  }
  const expected = toBase64Url(crypto.createHmac('sha256', secret).update(body).digest());
  if (expected !== signature) {
    return null;
  }
  try {
    const payload = JSON.parse(fromBase64Url(body)) as AccountsEmbedPayload;
    const now = Math.floor(Date.now() / 1000);
    if (!payload?.email || payload.exp < now) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
};

// Detectar NEXTAUTH_URL automáticamente según el entorno
function getNextAuthUrl(): string {
  // En Vercel, usar la variable de entorno o detectar automáticamente
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL;
  }
  
  // En Vercel, usar VERCEL_URL si está disponible
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  
  // En desarrollo local, usar localhost:3000
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000';
  }
  
  // Fallback
  return 'http://localhost:3000';
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: 'accounts',
      name: 'accounts',
      credentials: {
        token: { label: 'Token', type: 'text' }
      },
      async authorize(credentials) {
        const token = credentials?.token;
        const secret = process.env.ACCOUNTS_EMBED_SECRET || '';
        if (!token || !secret) {
          return null;
        }
        const payload = verifyAccountsToken(token, secret);
        if (!payload) {
          return null;
        }
        return {
          id: `accounts_${payload.email}`,
          email: payload.email,
          name: payload.name || payload.email,
          role: payload.isAdmin ? 'ACCOUNTS_ADMIN' : 'ACCOUNTS_USER',
          empresaId: undefined,
          permissions: ['*']
        };
      }
    }),
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
            },
            {
              email: 'adminregistro@recibos.com',
              password: 'adminreg123',
              user: {
                id: 'adminregistro_initial',
                email: 'adminregistro@recibos.com',
                name: 'Administrador Registro',
                role: 'ADMIN_REGISTRO',
                empresaId: undefined,
                permissions: ['empresas', 'empleados', 'accesos']
              }
            },
            {
              email: 'registro@recibos.com',
              password: 'registro123',
              user: {
                id: 'registro_initial',
                email: 'registro@recibos.com',
                name: 'Operador Registro',
                role: 'REGISTRO',
                empresaId: undefined,
                permissions: ['registro']
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
      // Evitar bucles de redirección
      if (url === baseUrl + '/auth/signin' || url === '/auth/signin') {
        return baseUrl;
      }
      
      // Si la URL es relativa, usar baseUrl
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }
      
      // Si la URL es absoluta y del mismo dominio, permitirla
      if (url.startsWith(baseUrl)) {
        return url;
      }
      
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
  debug: process.env.NODE_ENV === 'development',
};
