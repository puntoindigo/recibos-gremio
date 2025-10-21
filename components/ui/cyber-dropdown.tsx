'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Zap } from 'lucide-react';

interface CyberDropdownOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  color?: string;
}

interface CyberDropdownProps {
  value: string;
  options: CyberDropdownOption[];
  onChange: (value: string) => void;
  className?: string;
}

const CyberDropdown: React.FC<CyberDropdownProps> = ({ value, options, onChange, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [pulseEffect, setPulseEffect] = useState(false);
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
    setPulseEffect(true);
    setTimeout(() => {
      onChange(optionValue);
      setIsOpen(false);
      setPulseEffect(false);
    }, 200);
  };

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <div>
        <button
          type="button"
          className={`
            group relative inline-flex justify-center items-center w-full rounded-xl border-2 
            shadow-2xl px-5 py-3 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 
            text-sm font-bold text-cyan-400 hover:text-cyan-300 
            focus:outline-none focus:ring-4 focus:ring-cyan-500/50 focus:ring-offset-2 
            transition-all duration-300 transform hover:scale-105 hover:shadow-cyan-500/25
            ${isOpen ? 'ring-4 ring-cyan-400/50 shadow-cyan-400/50' : ''}
            ${pulseEffect ? 'animate-pulse' : ''}
            border-cyan-500/60 hover:border-cyan-400
            before:absolute before:inset-0 before:rounded-xl before:bg-gradient-to-r 
            before:from-cyan-500/20 before:via-transparent before:to-cyan-500/20 
            before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-500
            after:absolute after:inset-0 after:rounded-xl after:bg-gradient-to-r 
            after:from-transparent after:via-cyan-500/10 after:to-transparent 
            after:opacity-0 hover:after:opacity-100 after:transition-opacity after:duration-500
          `}
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
        >
          <span className="relative z-10 flex items-center">
            <Zap className="mr-2 h-4 w-4 text-cyan-400 animate-pulse" />
            {selectedOption.icon && <span className="mr-2 text-cyan-400">{selectedOption.icon}</span>}
            <span className="font-bold tracking-wider text-shadow-lg">{selectedOption.label}</span>
            <ChevronDown className={`ml-2 h-4 w-4 transition-all duration-300 ${isOpen ? 'rotate-180 text-cyan-300' : 'text-cyan-400'}`} />
          </span>
          
          {/* Animated border effect */}
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500/20 via-transparent to-cyan-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          
          {/* Glow effect */}
          <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-cyan-500/30 via-transparent to-cyan-500/30 opacity-0 group-hover:opacity-100 blur-sm transition-opacity duration-500"></div>
        </button>
      </div>

      {isOpen && (
        <div
          className="origin-top-right absolute right-0 mt-3 w-72 rounded-xl shadow-2xl bg-gradient-to-br from-slate-900/95 via-blue-900/95 to-slate-900/95 backdrop-blur-md border-2 border-cyan-500/40 focus:outline-none z-50 transition-all duration-300 ease-out transform scale-100 opacity-100"
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="options-menu"
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
        >
          {/* Cyber grid background */}
          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-cyan-500/10 via-transparent to-cyan-500/10"></div>
          
          {/* Animated border */}
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500/20 via-transparent to-cyan-500/20 animate-pulse"></div>
          
          <div className="relative py-3" role="none">
            {options.map((option, index) => (
              <button
                key={option.value}
                onClick={() => handleOptionClick(option.value)}
                className={`
                  group flex items-center w-full text-left px-5 py-4 text-sm font-bold
                  text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/15 
                  transition-all duration-300 relative overflow-hidden
                  ${option.value === value ? 'bg-cyan-500/25 text-cyan-300 shadow-lg' : ''}
                  border-l-4 border-transparent hover:border-cyan-500/50
                `}
                role="menuitem"
                style={{
                  animationDelay: `${index * 100}ms`,
                  animation: isOpen ? 'slideInFromTop 0.4s ease-out forwards' : 'none'
                }}
              >
                {/* Hover effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                <span className="relative z-10 flex items-center w-full">
                  {option.icon && <span className="mr-3 text-cyan-400">{option.icon}</span>}
                  <span className="flex-1 tracking-wider font-bold">{option.label}</span>
                  {option.value === value && (
                    <div className="flex items-center">
                      <Check className="h-4 w-4 text-cyan-400 animate-pulse mr-1" />
                      <Zap className="h-3 w-3 text-cyan-400" />
                    </div>
                  )}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slideInFromTop {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default CyberDropdown;
