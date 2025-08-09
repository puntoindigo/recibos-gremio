// /app/todos/page.tsx
'use client';

import { useState } from 'react';
import TodosGrid from '@/components/TodosGrid';

export default function TodosPage() {
  // DEFAULT: "Tabla agregada" abierta por defecto
  const [tab, setTab] = useState<'tabla'|'vista'>('tabla');

  return (
    <main className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Visor de todos.csv</h1>
        <p className="text-sm text-gray-600">Tabla tipo Excel con búsqueda, orden y refresco.</p>
      </div>

      <div className="border-b">
        <nav className="flex gap-2">
          {/* 1) PRIMERA solapa y activa por defecto */}
          <button
            className={`px-3 py-2 -mb-px border-b-2 ${tab==='tabla' ? 'border-black font-medium' : 'border-transparent text-gray-500'}`}
            onClick={() => setTab('tabla')}
          >
            Tabla agregada
          </button>
          {/* 2) Segunda solapa: Vista rápida */}
          <button
            className={`px-3 py-2 -mb-px border-b-2 ${tab==='vista' ? 'border-black font-medium' : 'border-transparent text-gray-500'}`}
            onClick={() => setTab('vista')}
          >
            Vista rápida
          </button>
        </nav>
      </div>

      {tab === 'tabla' && <TodosGrid />}
      {tab === 'vista' && <VistaRapidaFallback />}
    </main>
  );
}

// Placeholder (reemplazá por tu componente real de vista rápida si ya lo tenés)
function VistaRapidaFallback() {
  return (
    <div className="text-sm text-gray-500 border rounded-xl p-4">
      Acá va tu componente de "Vista rápida". Por defecto se abre la solapa "Tabla agregada".
    </div>
  );
}