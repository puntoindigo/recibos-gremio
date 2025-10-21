'use client';

import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronDown } from 'lucide-react';

interface DropdownStylePreviewProps {
  style: 'matrix' | 'cyber' | 'holographic' | 'tech';
  className?: string;
}

const DropdownStylePreview: React.FC<DropdownStylePreviewProps> = ({ style, className = '' }) => {
  const getStyleClasses = (style: string) => {
    switch (style) {
      case 'matrix':
        return {
          trigger: 'bg-black text-green-400 border-green-400 font-mono hover:bg-green-900/20 focus:ring-green-400/50',
          content: 'bg-black border-green-400',
          item: 'text-green-400 hover:bg-green-900/20 focus:bg-green-900/20'
        };
      case 'cyber':
        return {
          trigger: 'bg-gray-900 text-cyan-400 border-cyan-400 shadow-cyan-500/50 shadow-lg hover:bg-cyan-900/20 focus:ring-cyan-400/50',
          content: 'bg-gray-900 border-cyan-400 shadow-cyan-500/50 shadow-lg',
          item: 'text-cyan-400 hover:bg-cyan-900/20 focus:bg-cyan-900/20'
        };
      case 'holographic':
        return {
          trigger: 'bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white border-transparent hover:from-pink-600 hover:via-purple-600 hover:to-indigo-600 focus:ring-purple-400/50',
          content: 'bg-gradient-to-b from-pink-500 via-purple-500 to-indigo-500 border-transparent shadow-lg',
          item: 'text-white hover:bg-white/20 focus:bg-white/20'
        };
      case 'tech':
        return {
          trigger: 'bg-gray-100 text-gray-900 border-gray-300 hover:bg-gray-200 focus:ring-gray-400/50',
          content: 'bg-white border-gray-300 shadow-lg',
          item: 'text-gray-900 hover:bg-gray-100 focus:bg-gray-100'
        };
      default:
        return {
          trigger: 'bg-white text-gray-900 border-gray-300 hover:bg-gray-50 focus:ring-blue-400/50',
          content: 'bg-white border-gray-300',
          item: 'text-gray-900 hover:bg-gray-100 focus:bg-gray-100'
        };
    }
  };

  const styles = getStyleClasses(style);

  return (
    <div className={`space-y-2 ${className}`}>
      <p className="text-sm text-gray-600">Vista previa del estilo:</p>
      <Select>
        <SelectTrigger className={`w-full ${styles.trigger}`}>
          <SelectValue placeholder="Selecciona una opción" />
          <ChevronDown className="h-4 w-4 opacity-50" />
        </SelectTrigger>
        <SelectContent className={styles.content}>
          <SelectItem value="option1" className={styles.item}>
            Opción 1
          </SelectItem>
          <SelectItem value="option2" className={styles.item}>
            Opción 2
          </SelectItem>
          <SelectItem value="option3" className={styles.item}>
            Opción 3
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

export default DropdownStylePreview;
