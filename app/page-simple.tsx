// app/page-simple.tsx
"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";

export default function Page() {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState<string>("recibos");

  // Mostrar loading mientras se verifica la autenticación
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Verificando autenticación...</p>
        </div>
      </div>
    );
  }

  // Redirigir a login si no está autenticado
  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Acceso Requerido</h1>
          <p className="text-gray-600 mb-6">Necesitas iniciar sesión para acceder al sistema</p>
          <Button onClick={() => window.location.href = '/auth/signin'}>
            Ir a Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
      
      <main className="mx-auto max-w-6xl p-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">
            Gestor de Recibos
          </h1>
        </div>

        <div className="space-y-6">
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              ¡Bienvenido al Sistema!
            </h2>
            <p className="text-gray-600">
              Has iniciado sesión correctamente como: {session?.user?.name}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Rol: {session?.user?.role}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

