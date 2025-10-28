// app/auth/signin/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { signIn, getSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Crown, Shield, User } from 'lucide-react';

// Credenciales por defecto para cada rol
const defaultCredentials = [
  {
    role: 'SUPERADMIN',
    email: 'superadmin@recibos.com',
    password: 'super123',
    name: 'Super Administrador',
    description: 'Acceso total al sistema',
    icon: Crown,
    color: 'bg-gradient-to-br from-purple-500 to-pink-500',
    permissions: ['Todas las funcionalidades']
  },
  {
    role: 'ADMIN',
    email: 'admin@recibos.com',
    password: 'admin123',
    name: 'Administrador Empresa',
    description: 'Gestión de empresa y usuarios',
    icon: Shield,
    color: 'bg-gradient-to-br from-blue-500 to-cyan-500',
    permissions: ['Recibos', 'Controles', 'Descuentos', 'Reportes']
  },
  {
    role: 'USER',
    email: 'usuario@recibos.com',
    password: 'user123',
    name: 'Usuario Regular',
    description: 'Acceso básico al sistema',
    icon: User,
    color: 'bg-gradient-to-br from-green-500 to-emerald-500',
    permissions: ['Recibos', 'Controles']
  }
];

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberPassword, setRememberPassword] = useState(false);
  const router = useRouter();

  // Cargar credenciales guardadas al montar el componente
  useEffect(() => {
    const savedEmail = localStorage.getItem('savedEmail');
    const savedPassword = localStorage.getItem('savedPassword');
    const savedRemember = localStorage.getItem('rememberPassword') === 'true';
    
    if (savedEmail && savedPassword && savedRemember) {
      setEmail(savedEmail);
      setPassword(savedPassword);
      setRememberPassword(savedRemember);
    }
  }, []);

  // Función para manejar click en card de credenciales
  const handleCredentialCardClick = (credential: typeof defaultCredentials[0]) => {
    setEmail(credential.email);
    setPassword(credential.password);
    setError('');
    
    // Auto-submit después de un pequeño delay para que se vea el cambio
    setTimeout(() => {
      handleSubmit(new Event('submit') as any);
    }, 100);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false
      });

      if (result?.error) {
        setError('Credenciales inválidas');
      } else {
        // Guardar credenciales si el checkbox está marcado
        if (rememberPassword) {
          localStorage.setItem('savedEmail', email);
          localStorage.setItem('savedPassword', password);
          localStorage.setItem('rememberPassword', 'true');
        } else {
          // Limpiar credenciales guardadas si no se quiere recordar
          localStorage.removeItem('savedEmail');
          localStorage.removeItem('savedPassword');
          localStorage.removeItem('rememberPassword');
        }

        // Verificar la sesión y redirigir
        const session = await getSession();
        if (session) {
          router.push('/');
        }
      }
    } catch (error) {
      setError('Error al iniciar sesión');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Sistema de Gestión de Recibos
          </h1>
          <p className="text-lg text-gray-600">
            Selecciona un rol para iniciar sesión rápidamente
          </p>
        </div>

        {/* Cards de Credenciales */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {defaultCredentials.map((credential, index) => {
            const IconComponent = credential.icon;
            return (
              <Card 
                key={credential.role}
                className={`cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg ${
                  isLoading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                onClick={() => !isLoading && handleCredentialCardClick(credential)}
              >
                <CardHeader className={`${credential.color} text-white rounded-t-lg`}>
                  <div className="flex items-center space-x-3">
                    <IconComponent className="h-8 w-8" />
                    <div>
                      <CardTitle className="text-lg">{credential.name}</CardTitle>
                      <CardDescription className="text-white/90">
                        {credential.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="text-sm">
                      <strong>Email:</strong> {credential.email}
                    </div>
                    <div className="text-sm">
                      <strong>Contraseña:</strong> {credential.password}
                    </div>
                    <div className="text-sm">
                      <strong>Permisos:</strong>
                      <ul className="list-disc list-inside mt-1 text-xs">
                        {credential.permissions.map((perm, i) => (
                          <li key={i}>{perm}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Formulario Manual */}
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold text-center">
                O ingresa manualmente
              </CardTitle>
              <CardDescription className="text-center">
                Usa tus propias credenciales
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    autoComplete="email"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    autoComplete="current-password"
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember"
                    checked={rememberPassword}
                    onCheckedChange={(checked) => setRememberPassword(checked as boolean)}
                    disabled={isLoading}
                  />
                  <Label 
                    htmlFor="remember" 
                    className="text-sm font-normal cursor-pointer"
                  >
                    Guardar contraseña
                  </Label>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading}
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Iniciar Sesión
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
