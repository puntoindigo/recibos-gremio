// components/CuotasSelector.tsx
'use client';

import { forwardRef } from 'react';
import { Input } from '@/components/ui/input';

interface CuotasSelectorProps {
  value: number;
  onValueChange: (value: number) => void;
  disabled?: boolean;
  onEnterPress?: () => void;
  tabIndex?: number;
}

export const CuotasSelector = forwardRef<HTMLInputElement, CuotasSelectorProps>(
  ({ value, onValueChange, disabled = false, onEnterPress, tabIndex }, ref) => {
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      // Llamar a onEnterPress si está definido
      if (onEnterPress) {
        onEnterPress();
      }
    }
  };

  return (
    <Input
      ref={ref}
      type="number"
      min="1"
      max="48"
      placeholder="Cantidad de cuotas (1-48)"
      value={value || ''}
      onChange={(e) => {
        const numValue = parseInt(e.target.value) || 1;
        if (numValue >= 1 && numValue <= 48) {
          onValueChange(numValue);
        }
      }}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      className="w-full"
      tabIndex={tabIndex}
    />
  );
});

CuotasSelector.displayName = 'CuotasSelector';