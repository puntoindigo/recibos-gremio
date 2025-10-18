// components/EmpresaSelector.tsx
'use client';

import { useState, useRef, useEffect, forwardRef } from 'react';
import { ChevronDown, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useEmpresasInUse } from '@/hooks/useEmpresasInUse';

interface EmpresaSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const EmpresaSelector = forwardRef<HTMLInputElement, EmpresaSelectorProps>(
  ({ value, onValueChange, placeholder = "Seleccionar empresa...", disabled = false, className }, ref) => {
    const [open, setOpen] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    
    const { empresas, isLoading } = useEmpresasInUse();
    
    // Usar el ref externo si se proporciona, sino usar el interno
    const actualInputRef = ref || inputRef;

    // Sincronizar inputValue con el value prop solo si no estamos escribiendo
    useEffect(() => {
      if (!isTyping) {
        setInputValue(value);
      }
    }, [value, isTyping]);

    // Verificar si el valor actual es una empresa válida
    const isValidEmpresa = empresas.includes(value);
    
    // Si el valor actual no está en la lista pero tiene valor, mostrarlo como seleccionado
    const currentValueInList = value && !empresas.includes(value) ? [value] : [];
    const allEmpresas = [...empresas, ...currentValueInList];
    
    // Filtrar empresas basadas en el input, pero siempre incluir el valor actual si existe
    const filteredEmpresas = allEmpresas.filter(empresa => {
      const matchesInput = empresa.toLowerCase().includes(inputValue.toLowerCase());
      const isCurrentValue = empresa === value;
      return matchesInput || isCurrentValue;
    });
    
    const showAddNew = inputValue && !filteredEmpresas.some(emp => 
      emp.toLowerCase() === inputValue.toLowerCase()
    ) && inputValue !== value;
  

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setInputValue(newValue);
      setIsTyping(true);
      
      if (newValue && !open) {
        setOpen(true);
      }
    };

    const handleSelect = (selectedValue: string) => {
      onValueChange(selectedValue);
      setInputValue('');
      setIsTyping(false);
      setOpen(false); // Cerrar el dropdown al seleccionar
      setSelectedIndex(-1);
    };

    const handleAddNew = () => {
      if (inputValue.trim()) {
        const newEmpresa = inputValue.trim();
        onValueChange(newEmpresa);
        setInputValue(newEmpresa);
        setIsTyping(false);
        setOpen(false); // Cerrar el dropdown al agregar
        setSelectedIndex(-1);
      }
    };

    const handleClear = () => {
      onValueChange('');
      setInputValue('');
      setIsTyping(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (!open) {
        if (e.key === 'Enter' || e.key === 'ArrowDown') {
          e.preventDefault();
          setOpen(true);
          setSelectedIndex(0);
        }
        return;
      }

      const totalOptions = filteredEmpresas.length + (showAddNew ? 1 : 0);

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % totalOptions);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => prev <= 0 ? totalOptions - 1 : prev - 1);
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0 && selectedIndex < filteredEmpresas.length) {
            handleSelect(filteredEmpresas[selectedIndex]);
          } else if (selectedIndex === filteredEmpresas.length && showAddNew) {
            handleAddNew();
          }
          break;
        case 'Tab':
          e.preventDefault();
          if (selectedIndex >= 0 && selectedIndex < filteredEmpresas.length) {
            handleSelect(filteredEmpresas[selectedIndex]);
          } else if (selectedIndex === filteredEmpresas.length && showAddNew) {
            handleAddNew();
          } else if (showAddNew) {
            handleAddNew();
          } else if (filteredEmpresas.length === 1) {
            handleSelect(filteredEmpresas[0]);
          } else {
            setOpen(false);
            setIsTyping(false);
          }
          break;
        case 'Escape':
          setOpen(false);
          setInputValue('');
          setIsTyping(false);
          setSelectedIndex(-1);
          break;
      }
    };

    // Cerrar dropdown al hacer clic fuera
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setOpen(false);
          setInputValue('');
          setIsTyping(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
      <div className="relative w-full" ref={containerRef}>
        <div className="relative">
          <Input
            ref={actualInputRef}
            placeholder={placeholder}
            value={isTyping ? inputValue : (isValidEmpresa ? value : inputValue)}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (!isTyping) {
                setInputValue('');
                setIsTyping(true);
              }
              setOpen(true);
              setSelectedIndex(-1);
            }}
            disabled={disabled}
            className={cn("w-full pr-20", className)}
          />
          <div className="absolute right-0 top-0 h-full flex items-center">
            {value && !isTyping && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-full px-2 hover:bg-transparent"
                onClick={handleClear}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-full px-2 hover:bg-transparent"
              onClick={() => setOpen(!open)}
            >
              <ChevronDown className={cn("h-4 w-4", open && "rotate-180")} />
            </Button>
          </div>
        </div>

        {open && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-hidden">
            <div className="max-h-48 overflow-y-auto">
              {isLoading ? (
                <div className="p-3 text-sm text-muted-foreground text-center">
                  Cargando empresas...
                </div>
              ) : filteredEmpresas.length === 0 && !showAddNew ? (
                <div className="p-3 text-sm text-muted-foreground text-center">
                  No se encontraron empresas.
                </div>
              ) : (
                <>
                  {filteredEmpresas.map((empresa, index) => (
                    <div
                      key={empresa}
                      className={cn(
                        "p-3 cursor-pointer border-b last:border-b-0 hover:bg-gray-100",
                        selectedIndex === index && "bg-blue-100"
                      )}
                      onClick={() => handleSelect(empresa)}
                    >
                      <span className="text-sm">{empresa}</span>
                    </div>
                  ))}
                  
                  {showAddNew && (
                    <div
                      className={cn(
                        "p-3 cursor-pointer border-b last:border-b-0 hover:bg-blue-50 bg-blue-25",
                        selectedIndex === filteredEmpresas.length && "bg-blue-100"
                      )}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleAddNew();
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <Plus className="h-4 w-4 text-blue-600" />
                        <span className="text-sm text-blue-600">
                          Agregar "{inputValue}"
                        </span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
);

EmpresaSelector.displayName = 'EmpresaSelector';
