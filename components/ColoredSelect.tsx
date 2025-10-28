// components/ColoredSelect.tsx
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, CheckCircle, XCircle, Calendar, Play, Pause } from 'lucide-react';

interface SelectOption {
  value: string;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface ColoredSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export default function ColoredSelect({
  value,
  onValueChange,
  options,
  placeholder = "Seleccionar...",
  disabled = false,
  className = ""
}: ColoredSelectProps) {
  const selectedOption = options.find(option => option.value === value);
  const SelectedIcon = selectedOption?.icon || Clock;

  return (
    <Select
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
    >
      <SelectTrigger 
        className={`${selectedOption?.bgColor || 'bg-gray-50'} border-2 ${selectedOption?.borderColor || 'border-gray-200'} ${className}`}
      >
        <SelectValue placeholder={placeholder}>
          {selectedOption && (
            <div className="flex items-center gap-2">
              <SelectedIcon className="h-4 w-4" />
              <span className={selectedOption.color.split(' ')[1]}>
                {selectedOption.label}
              </span>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => {
          const Icon = option.icon;
          return (
            <SelectItem 
              key={option.value} 
              value={option.value} 
              className={`${option.bgColor} hover:${option.bgColor.replace('50', '100')}`}
            >
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <span className={option.color.split(' ')[1]}>
                  {option.label}
                </span>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

// Configuraciones predefinidas para diferentes tipos de selects
export const PRIORITY_OPTIONS: SelectOption[] = [
  {
    value: 'high',
    label: 'Alta',
    color: 'text-red-800',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    icon: AlertTriangle
  },
  {
    value: 'medium',
    label: 'Media',
    color: 'text-yellow-800',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    icon: Clock
  },
  {
    value: 'low',
    label: 'Baja',
    color: 'text-green-800',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    icon: CheckCircle
  }
];

export const STATUS_OPTIONS: SelectOption[] = [
  {
    value: 'pending',
    label: 'Pendiente',
    color: 'text-gray-800',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    icon: Clock
  },
  {
    value: 'in_progress',
    label: 'En Progreso',
    color: 'text-blue-800',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    icon: Play
  },
  {
    value: 'completed',
    label: 'Completado',
    color: 'text-green-800',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    icon: CheckCircle
  },
  {
    value: 'cancelled',
    label: 'Cancelado',
    color: 'text-red-800',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    icon: XCircle
  }
];

export const CATEGORY_OPTIONS: SelectOption[] = [
  {
    value: 'bug',
    label: 'Bug',
    color: 'text-red-800',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    icon: AlertTriangle
  },
  {
    value: 'feature',
    label: 'Feature',
    color: 'text-blue-800',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    icon: Calendar
  },
  {
    value: 'improvement',
    label: 'Mejora',
    color: 'text-green-800',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    icon: CheckCircle
  },
  {
    value: 'refactor',
    label: 'Refactor',
    color: 'text-yellow-800',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    icon: Clock
  }
];
