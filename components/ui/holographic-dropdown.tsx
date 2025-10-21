'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Sparkles } from 'lucide-react';

interface HolographicDropdownOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  color?: string;
}

interface HolographicDropdownProps {
  value: string;
  options: HolographicDropdownOption[];
  onChange: (value: string) => void;
  className?: string;
}

const HolographicDropdown: React.FC<HolographicDropdownProps> = ({ value, options, onChange, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [holographicEffect, setHolographicEffect] = useState(false);
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
    setHolographicEffect(true);
    setTimeout(() => {
      onChange(optionValue);
      setIsOpen(false);
      setHolographicEffect(false);
    }, 300);
  };

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <div>
        <button
          type="button"
          className={`
            group relative inline-flex justify-center items-center w-full rounded-2xl border 
            shadow-2xl px-6 py-4 bg-gradient-to-br from-purple-900/80 via-pink-900/80 to-indigo-900/80 
            text-sm font-semibold text-white hover:text-pink-200 
            focus:outline-none focus:ring-4 focus:ring-pink-500/50 focus:ring-offset-2 
            transition-all duration-500 transform hover:scale-105 hover:shadow-pink-500/25
            ${isOpen ? 'ring-4 ring-pink-400/50 shadow-pink-400/50' : ''}
            ${holographicEffect ? 'animate-pulse' : ''}
            border-pink-500/40 hover:border-pink-400/60
            backdrop-blur-sm
            before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-r 
            before:from-pink-500/20 before:via-purple-500/20 before:to-indigo-500/20 
            before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-500
            after:absolute after:inset-0 after:rounded-2xl after:bg-gradient-to-r 
            after:from-transparent after:via-white/10 after:to-transparent 
            after:opacity-0 hover:after:opacity-100 after:transition-opacity after:duration-500
          `}
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
        >
          <span className="relative z-10 flex items-center">
            <Sparkles className="mr-2 h-4 w-4 text-pink-400 animate-spin" style={{ animationDuration: '3s' }} />
            {selectedOption.icon && <span className="mr-2 text-pink-400">{selectedOption.icon}</span>}
            <span className="font-semibold tracking-wider bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
              {selectedOption.label}
            </span>
            <ChevronDown className={`ml-2 h-4 w-4 transition-all duration-500 ${isOpen ? 'rotate-180 text-pink-300' : 'text-pink-400'}`} />
          </span>
          
          {/* Holographic shimmer effect */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-indigo-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          
          {/* Rainbow glow effect */}
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-pink-500/30 via-purple-500/30 to-indigo-500/30 opacity-0 group-hover:opacity-100 blur-sm transition-opacity duration-500"></div>
        </button>
      </div>

      {isOpen && (
        <div
          className="origin-top-right absolute right-0 mt-4 w-80 rounded-2xl shadow-2xl bg-gradient-to-br from-purple-900/90 via-pink-900/90 to-indigo-900/90 backdrop-blur-lg border border-pink-500/30 focus:outline-none z-50 transition-all duration-500 ease-out transform scale-100 opacity-100"
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="options-menu"
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
        >
          {/* Holographic background */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-pink-500/10 via-purple-500/10 to-indigo-500/10"></div>
          
          {/* Animated rainbow border */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-pink-500/30 via-purple-500/30 to-indigo-500/30 animate-pulse"></div>
          
          {/* Glass effect */}
          <div className="absolute inset-0 rounded-2xl bg-white/5 backdrop-blur-sm"></div>
          
          <div className="relative py-4" role="none">
            {options.map((option, index) => (
              <button
                key={option.value}
                onClick={() => handleOptionClick(option.value)}
                className={`
                  group flex items-center w-full text-left px-6 py-5 text-sm font-semibold
                  text-white hover:text-pink-200 hover:bg-gradient-to-r hover:from-pink-500/20 hover:to-purple-500/20
                  transition-all duration-500 relative overflow-hidden
                  ${option.value === value ? 'bg-gradient-to-r from-pink-500/30 to-purple-500/30 text-pink-200 shadow-lg' : ''}
                  border-l-4 border-transparent hover:border-pink-500/50
                  rounded-lg mx-2
                `}
                role="menuitem"
                style={{
                  animationDelay: `${index * 150}ms`,
                  animation: isOpen ? 'slideInFromRight 0.5s ease-out forwards' : 'none'
                }}
              >
                {/* Hover effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-pink-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-lg"></div>
                
                <span className="relative z-10 flex items-center w-full">
                  {option.icon && <span className="mr-3 text-pink-400">{option.icon}</span>}
                  <span className="flex-1 tracking-wider font-semibold bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
                    {option.label}
                  </span>
                  {option.value === value && (
                    <div className="flex items-center">
                      <Check className="h-4 w-4 text-pink-400 animate-pulse mr-2" />
                      <Sparkles className="h-3 w-3 text-pink-400 animate-spin" style={{ animationDuration: '2s' }} />
                    </div>
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
            transform: translateX(30px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
};

export default HolographicDropdown;
