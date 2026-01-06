// app/test-face-recognition/page.tsx
'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Cargar el componente dinámicamente solo en el cliente
const TestFaceRecognitionContent = dynamic(
  () => import('./TestFaceRecognitionContent'),
  { 
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando reconocimiento facial...</p>
        </div>
      </div>
    )
  }
);

export default function TestFaceRecognitionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    }>
      <TestFaceRecognitionContent />
    </Suspense>
  );
}

