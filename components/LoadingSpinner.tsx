// components/LoadingSpinner.tsx
import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  text?: string;
  overlay?: boolean;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12'
};

export default function LoadingSpinner({ 
  size = 'md', 
  className, 
  text,
  overlay = false 
}: LoadingSpinnerProps) {
  const spinnerElement = (
    <div className={cn("flex items-center justify-center", className)}>
      <Loader2 className={cn("animate-spin", sizeClasses[size])} />
      {text && (
        <span className="ml-2 text-sm text-gray-600">{text}</span>
      )}
    </div>
  );

  if (overlay) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 shadow-lg">
          {spinnerElement}
        </div>
      </div>
    );
  }

  return spinnerElement;
}

// Componente específico para botones
export function ButtonSpinner({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  return (
    <Loader2 className={cn("animate-spin", sizeClasses[size])} />
  );
}

// Componente para overlays de carga en secciones
export function SectionSpinner({ text = "Cargando..." }: { text?: string }) {
  return (
    <div className="flex items-center justify-center py-8">
      <LoadingSpinner size="lg" text={text} />
    </div>
  );
}

// Componente para cards de carga
export function CardSpinner({ text = "Cargando datos..." }: { text?: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <LoadingSpinner size="md" text={text} />
    </div>
  );
}

