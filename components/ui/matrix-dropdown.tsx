'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface MatrixDropdownOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  color?: string;
}

interface MatrixDropdownProps {
  value: string;
  options: MatrixDropdownOption[];
  onChange: (value: string) => void;
  className?: string;
}

const MatrixDropdown: React.FC<MatrixDropdownProps> = ({ value, options, onChange, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [glitchEffect, setGlitchEffect] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(option => option.value === value) || options[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleOptionClick = (optionValue: string) => {
    setGlitchEffect(true);
    setTimeout(() => {
      onChange(optionValue);
      setIsOpen(false);
      setGlitchEffect(false);
    }, 150);
  };

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <div>
        <button
          type="button"
          className={`
            group relative inline-flex justify-center items-center w-full rounded-lg border-2 
            shadow-lg px-4 py-2 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 
            text-sm font-mono text-green-400 hover:text-green-300 
            focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 
            transition-all duration-300 transform hover:scale-105
            ${isOpen ? 'ring-2 ring-green-400 shadow-green-400/50' : ''}
            ${glitchEffect ? 'animate-pulse' : ''}
            border-green-500/50 hover:border-green-400
            before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-r 
            before:from-green-500/10 before:via-transparent before:to-green-500/10 
            before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300
          `}
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
        >
          <span className="relative z-10 flex items-center">
            {selectedOption.icon && <span className="mr-2 text-green-400">{selectedOption.icon}</span>}
            <span className="font-mono tracking-wider">{selectedOption.label}</span>
            <ChevronDown className={`ml-2 h-4 w-4 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
          </span>
          
          {/* Matrix effect overlay */}
          <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-green-500/5 via-transparent to-green-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        </button>
      </div>

      {isOpen && (
        <div
          className="origin-top-right absolute right-0 mt-2 w-64 rounded-lg shadow-2xl bg-gray-900/95 backdrop-blur-sm border-2 border-green-500/30 focus:outline-none z-50 transition-all duration-300 ease-out transform scale-100 opacity-100"
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="options-menu"
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
        >
          {/* Matrix grid background */}
          <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-green-500/5 via-transparent to-green-500/5"></div>
          
          <div className="relative py-2" role="none">
            {options.map((option, index) => (
              <button
                key={option.value}
                onClick={() => handleOptionClick(option.value)}
                className={`
                  group flex items-center w-full text-left px-4 py-3 text-sm font-mono
                  text-green-400 hover:text-green-300 hover:bg-green-500/10 
                  transition-all duration-200 relative overflow-hidden
                  ${option.value === value ? 'bg-green-500/20 text-green-300' : ''}
                `}
                role="menuitem"
                style={{
                  animationDelay: `${index * 50}ms`,
                  animation: isOpen ? 'slideInFromRight 0.3s ease-out forwards' : 'none'
                }}
              >
                {/* Glitch effect on hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                
                <span className="relative z-10 flex items-center w-full">
                  {option.icon && <span className="mr-3 text-green-400">{option.icon}</span>}
                  <span className="flex-1 tracking-wider">{option.label}</span>
                  {option.value === value && (
                    <Check className="ml-auto h-4 w-4 text-green-400 animate-pulse" />
                  )}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slideInFromRight {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
};

export default MatrixDropdown;
