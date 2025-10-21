'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { getStatusIcon, getStatusColor, getStatusText } from '@/lib/status-utils';
import { getPriorityColor } from '@/lib/priority-utils';

interface TechDropdownProps {
  value: string;
  options: Array<{
    value: string;
    label: string;
    icon?: React.ReactNode;
    color?: string;
  }>;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function TechDropdown({
  value,
  options,
  onChange,
  placeholder = "Seleccionar...",
  className = ""
}: TechDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const selectedOption = options.find(option => option.value === value);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-3 py-2 text-sm bg-transparent border border-gray-300/50 rounded-lg hover:border-gray-400/70 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all duration-200"
      >
        <div className="flex items-center space-x-2">
          {selectedOption?.icon && (
            <span className="text-gray-600">
              {selectedOption.icon}
            </span>
          )}
          <span className="text-gray-700">
            {selectedOption?.label || placeholder}
          </span>
        </div>
        <ChevronDown 
          className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`} 
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white/95 backdrop-blur-sm border border-gray-200/50 rounded-lg shadow-xl overflow-hidden">
          <div className="py-1">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-50/80 transition-colors duration-150"
              >
                <div className="flex items-center space-x-2">
                  {option.icon && (
                    <span className="text-gray-600">
                      {option.icon}
                    </span>
                  )}
                  <span className="text-gray-700">{option.label}</span>
                </div>
                {value === option.value && (
                  <Check className="h-4 w-4 text-blue-600" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
