// components/EmployeeSelector.tsx
'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { Check, ChevronsUpDown, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ConsolidatedEntity } from '@/lib/db';

interface EmployeeSelectorProps {
  employees: ConsolidatedEntity[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function EmployeeSelector({ 
  employees, 
  value, 
  onValueChange, 
  placeholder = "Seleccionar empleado...",
  disabled = false 
}: EmployeeSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Crear lista de empleados únicos con legajo y nombre
  const uniqueEmployees = useMemo(() => {
    const employeeMap = new Map<string, ConsolidatedEntity>();
    
    employees.forEach(emp => {
      const key = `${emp.legajo}||${emp.periodo}`;
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
    if (!searchTerm) return uniqueEmployees;
    
    return uniqueEmployees.filter(emp => 
      emp.legajo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.nombre && emp.nombre.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [uniqueEmployees, searchTerm]);

  const selectedEmployee = uniqueEmployees.find(emp => 
    `${emp.legajo}||${emp.periodo}` === value
  );

  const handleSelect = (currentValue: string) => {
    onValueChange(currentValue === value ? "" : currentValue);
    setOpen(false);
    setSearchTerm('');
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
      <Button
        variant="outline"
        role="combobox"
        aria-expanded={open}
        className="w-full justify-between"
        disabled={disabled}
        onClick={() => setOpen(!open)}
      >
        {selectedEmployee ? (
          <div className="flex flex-col items-start">
            <span className="font-medium">
              {selectedEmployee.legajo} - {selectedEmployee.nombre || 'Sin nombre'}
            </span>
            <span className="text-xs text-muted-foreground">
              Período: {selectedEmployee.periodo}
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>

      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-hidden">
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por legajo o nombre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="max-h-48 overflow-y-auto">
            {filteredEmployees.length === 0 ? (
              <div className="p-3 text-sm text-muted-foreground text-center">
                No se encontraron empleados.
              </div>
            ) : (
              filteredEmployees.map((employee) => {
                const employeeValue = `${employee.legajo}||${employee.periodo}`;
                return (
                  <div
                    key={employeeValue}
                    className="flex items-center p-3 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                    onClick={() => handleSelect(employeeValue)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === employeeValue ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {employee.legajo} - {employee.nombre || 'Sin nombre'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Período: {employee.periodo}
                        {employee.data?.EMPRESA && ` • ${employee.data.EMPRESA}`}
                      </span>
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
}
