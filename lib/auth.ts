// lib/auth.ts
import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { getUserByEmail, updateUserLastLogin } from './user-management';
import { db } from './db';

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
          const user = await getUserByEmail(credentials.email);
          
          if (!user || !user.isActive) {
            return null;
          }

          // Para simplificar, usamos una validación básica
          // En producción, deberías usar bcrypt o similar
          if (user.passwordHash && user.passwordHash === credentials.password) {
            await updateUserLastLogin(user.id);
            return {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
              empresaId: user.empresaId,
              permissions: user.permissions
            };
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
  secret: process.env.NEXTAUTH_SECRET || 'fallback-secret-key'
};

// Función para crear usuario inicial (SuperAdmin)
export async function createInitialSuperAdmin() {
  const existingSuperAdmin = await db.users.where('role').equals('SUPERADMIN').first();
  
  if (!existingSuperAdmin) {
    const superAdmin = await db.users.add({
      id: 'superadmin_initial',
      email: 'admin@recibos.com',
      name: 'Super Administrador',
      role: 'SUPERADMIN',
      permissions: ['*'], // Todos los permisos
      isActive: true,
      createdAt: Date.now(),
      passwordHash: 'admin123' // Cambiar en producción
    });
    
    console.log('SuperAdmin inicial creado:', superAdmin);
    return superAdmin;
  }
  
  return existingSuperAdmin;
}
