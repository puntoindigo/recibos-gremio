'use client';

import React, { useState } from 'react';
import MatrixDropdown from './ui/matrix-dropdown';
import CyberDropdown from './ui/cyber-dropdown';
import HolographicDropdown from './ui/holographic-dropdown';

interface DropdownStyleSelectorProps {
  value: string;
  options: Array<{ value: string; label: string; icon?: React.ReactNode; color?: string }>;
  onChange: (value: string) => void;
  className?: string;
  style?: 'matrix' | 'cyber' | 'holographic';
}

const DropdownStyleSelector: React.FC<DropdownStyleSelectorProps> = ({ 
  value, 
  options, 
  onChange, 
  className, 
  style = 'matrix' 
}) => {
  const [currentStyle, setCurrentStyle] = useState<'matrix' | 'cyber' | 'holographic'>(style);

  const styleOptions = [
    { value: 'matrix', label: 'MATRIX', icon: '🔮' },
    { value: 'cyber', label: 'CYBER', icon: '⚡' },
    { value: 'holographic', label: 'HOLO', icon: '✨' }
  ];

  const renderDropdown = () => {
    switch (currentStyle) {
      case 'matrix':
        return (
          <MatrixDropdown
            value={value}
            options={options}
            onChange={onChange}
            className={className}
          />
        );
      case 'cyber':
        return (
          <CyberDropdown
            value={value}
            options={options}
            onChange={onChange}
            className={className}
          />
        );
      case 'holographic':
        return (
          <HolographicDropdown
            value={value}
            options={options}
            onChange={onChange}
            className={className}
          />
        );
      default:
        return (
          <MatrixDropdown
            value={value}
            options={options}
            onChange={onChange}
            className={className}
          />
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Style Selector */}
      <div className="flex items-center space-x-4">
        <span className="text-sm font-medium text-gray-700">Estilo:</span>
        <div className="flex space-x-2">
          {styleOptions.map((styleOption) => (
            <button
              key={styleOption.value}
              onClick={() => setCurrentStyle(styleOption.value as 'matrix' | 'cyber' | 'holographic')}
              className={`
                px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200
                ${currentStyle === styleOption.value
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }
              `}
            >
              {styleOption.icon} {styleOption.label}
            </button>
          ))}
        </div>
      </div>

      {/* Dropdown Preview */}
      <div className="p-6 bg-gray-100 rounded-lg">
        <div className="text-sm text-gray-600 mb-3">Vista previa del dropdown:</div>
        {renderDropdown()}
      </div>
    </div>
  );
};

export default DropdownStyleSelector;
