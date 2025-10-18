// components/EmployeeSelector.tsx
'use client';

import { useState, useMemo, useRef, useEffect, forwardRef } from 'react';
import { Check, ChevronsUpDown, Search, X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ConsolidatedEntity } from '@/lib/db';

interface EmployeeSelectorProps {
  employees: ConsolidatedEntity[];
  value?: string;
  onValueChange: (value: string) => void;
  onSearchChange?: (searchTerm: string) => void;
  placeholder?: string;
  disabled?: boolean;
  tabIndex?: number;
  onCreateEmployee?: () => void;
}

export const EmployeeSelector = forwardRef<HTMLInputElement, EmployeeSelectorProps>(
  ({ employees, value, onValueChange, onSearchChange, placeholder = "Seleccionar empleado...", disabled = false, tabIndex, onCreateEmployee }, ref) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Usar el ref externo si se proporciona, sino usar el interno
  const actualInputRef = ref || inputRef;

  // Crear lista de empleados únicos por legajo (sin importar el período)
  const uniqueEmployees = useMemo(() => {
    const employeeMap = new Map<string, ConsolidatedEntity>();
    
    employees.forEach(emp => {
      // Usar solo el legajo como clave, no el período
      const key = emp.legajo;
      if (!employeeMap.has(key)) {
        employeeMap.set(key, emp);
      }
    });
    
    return Array.from(employeeMap.values()).sort((a, b) => {
      // Ordenar por legajo numérico si es posible, sino alfabéticamente
      const legajoA = parseInt(a.legajo) || 0;
      const legajoB = parseInt(b.legajo) || 0;
      if (legajoA !== legajoB) {
        return legajoA - legajoB;
      }
      return a.legajo.localeCompare(b.legajo);
    });
  }, [employees]);

  // Filtrar empleados por término de búsqueda
  const filteredEmployees = useMemo(() => {
    const term = searchTerm || inputValue;
    if (!term) return uniqueEmployees;
    
    return uniqueEmployees.filter(emp => 
      emp.legajo.toLowerCase().includes(term.toLowerCase()) ||
      (emp.nombre && emp.nombre.toLowerCase().includes(term.toLowerCase()))
    );
  }, [uniqueEmployees, searchTerm, inputValue]);

  const selectedEmployee = uniqueEmployees.find(emp => 
    emp.legajo === value
  );

  const handleSelect = (currentValue: string) => {
    onValueChange(currentValue === value ? "" : currentValue);
    setOpen(false);
    setSearchTerm('');
    setInputValue('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setSearchTerm(newValue);
    setSelectedIndex(-1); // Resetear índice seleccionado
    
    // Notificar al componente padre del cambio en la búsqueda
    if (onSearchChange) {
      onSearchChange(newValue);
    }
    
    // Si hay texto, abrir el dropdown
    if (newValue && !open) {
      setOpen(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < filteredEmployees.length) {
        // Seleccionar empleado con flechas
        const employee = filteredEmployees[selectedIndex];
        handleSelect(employee.legajo);
      } else if (filteredEmployees.length === 1) {
        // Si hay solo un resultado, seleccionarlo automáticamente
        handleSelect(filteredEmployees[0].legajo);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      setInputValue('');
      setSearchTerm('');
      setSelectedIndex(-1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) {
        setOpen(true);
      } else {
        setSelectedIndex(prev => 
          prev < filteredEmployees.length - 1 ? prev + 1 : 0
        );
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => 
        prev > 0 ? prev - 1 : filteredEmployees.length - 1
      );
    } else if (e.key === 'Tab') {
      // Si hay un empleado resaltado, seleccionarlo antes de pasar al siguiente campo
      if (selectedIndex >= 0 && selectedIndex < filteredEmployees.length) {
        e.preventDefault();
        const employee = filteredEmployees[selectedIndex];
        handleSelect(employee.legajo);
      } else if (filteredEmployees.length === 1) {
        // Si hay solo un resultado, seleccionarlo automáticamente
        e.preventDefault();
        handleSelect(filteredEmployees[0].legajo);
      } else {
        // Permitir que Tab pase al siguiente campo
        setOpen(false);
        setSelectedIndex(-1);
      }
    }
  };

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div className="relative">
        <Input
          ref={actualInputRef}
          placeholder={placeholder}
          value={selectedEmployee ? `${selectedEmployee.legajo} - ${selectedEmployee.nombre || 'Sin nombre'}` : inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            setOpen(true);
          }}
          disabled={disabled}
          className="w-full pr-10"
          tabIndex={tabIndex}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
          onClick={() => {
            if (selectedEmployee) {
              onValueChange('');
              setInputValue('');
            } else {
              setOpen(!open);
            }
          }}
        >
          {selectedEmployee ? (
            <X className="h-4 w-4" />
          ) : (
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          )}
        </Button>
      </div>

      {open && (
        <div className="absolute z-[9999] w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-hidden">
          
          <div className="max-h-48 overflow-y-auto">
            {filteredEmployees.length === 0 ? (
              <div className="p-3 text-sm text-muted-foreground text-center">
                <div className="mb-2">No se encontraron empleados.</div>
                {onCreateEmployee && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onCreateEmployee();
                      setOpen(false);
                    }}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Crear empleado nuevo
                  </Button>
                )}
              </div>
            ) : (
              filteredEmployees.map((employee, index) => {
                const isSelected = value === employee.legajo;
                const isHighlighted = selectedIndex === index;
                
                return (
                  <div
                    key={employee.legajo}
                    className={cn(
                      "flex items-center p-3 cursor-pointer border-b last:border-b-0",
                      isHighlighted ? "bg-blue-100" : "hover:bg-gray-100",
                      isSelected && "bg-blue-50"
                    )}
                    onClick={() => handleSelect(employee.legajo)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        isSelected ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {employee.legajo} - {employee.nombre || 'Sin nombre'}
                        </span>
                        {employee.data?.MANUAL === 'true' && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                            Manual
                          </span>
                        )}
                      </div>
                      {employee.data?.EMPRESA && (
                        <span className="text-xs text-muted-foreground">
                          {employee.data.EMPRESA}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
});

EmployeeSelector.displayName = 'EmployeeSelector';
