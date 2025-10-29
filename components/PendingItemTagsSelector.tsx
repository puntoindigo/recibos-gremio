// components/PendingItemTagsSelector.tsx
import React, { useState, useEffect, useRef, useMemo, forwardRef, useCallback } from 'react';
import { X, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface PendingItemTagsSelectorProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  existingTags?: string[];
  disabled?: boolean;
  tabIndex?: number;
  allItems?: any[];
  defaultTag?: string;
}

export const PendingItemTagsSelector = forwardRef<HTMLInputElement, PendingItemTagsSelectorProps>(
  ({ tags, onTagsChange, existingTags = [], disabled = false, tabIndex, allItems = [], defaultTag }, ref) => {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Usar el ref externo si se proporciona, sino usar el interno
  const actualInputRef = ref || inputRef;

  // Extraer todos los tags únicos de los items existentes
  const allExistingTags = useMemo(() => {
    const tagsSet = new Set<string>();
    
    // Agregar tags predefinidos
    existingTags.forEach(tag => tagsSet.add(tag.toLowerCase()));
    
    // Agregar tags de items existentes
    allItems.forEach(item => {
      if (item.tags && Array.isArray(item.tags)) {
        item.tags.forEach((tag: string) => {
          if (tag && tag.trim()) {
            tagsSet.add(tag.toLowerCase());
          }
        });
      }
    });
    
    return Array.from(tagsSet).sort();
  }, [existingTags, allItems]);

  // Filtrar sugerencias basadas en el input
  useEffect(() => {
    if (inputValue.trim()) {
      const searchTerm = inputValue.toLowerCase();
      const filtered = allExistingTags.filter(tag => 
        tag.includes(searchTerm) && !tags.includes(tag)
      );
      setSuggestions(filtered.slice(0, 8)); // Mostrar máximo 8 sugerencias
      setShowSuggestions(filtered.length > 0);
    } else {
      // Si no hay input, mostrar el defaultTag si existe y no está ya seleccionado
      if (defaultTag && !tags.includes(defaultTag)) {
        setSuggestions([defaultTag]);
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }
  }, [inputValue, allExistingTags, tags, defaultTag]);

  // Auto-agregar el defaultTag cuando se monta el componente si no hay tags
  const hasAddedDefaultTag = useRef(false);
  
  // Memoizar la función para evitar re-renders innecesarios
  const addDefaultTag = useCallback(() => {
    if (defaultTag && tags.length === 0 && !tags.includes(defaultTag) && !hasAddedDefaultTag.current) {
      hasAddedDefaultTag.current = true;
      onTagsChange([defaultTag]);
    }
  }, [defaultTag, onTagsChange]); // Removido 'tags' para evitar loop infinito
  
  useEffect(() => {
    addDefaultTag();
  }, [defaultTag]); // Solo ejecutar cuando cambie defaultTag, no cuando cambie addDefaultTag

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedSuggestionIndex >= 0 && selectedSuggestionIndex < suggestions.length) {
        addTag(suggestions[selectedSuggestionIndex]);
      } else {
        addTag(inputValue.trim());
      }
    } else if (e.key === 'Escape') {
      setInputValue('');
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (suggestions.length > 0) {
        setShowSuggestions(true);
        setSelectedSuggestionIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSuggestionIndex(prev => 
        prev > 0 ? prev - 1 : suggestions.length - 1
      );
    } else if (e.key === 'Tab') {
      if (showSuggestions && suggestions.length > 0) {
        // Si hay sugerencias, seleccionar la primera
        e.preventDefault();
        addTag(suggestions[0]);
      } else if (inputValue.trim()) {
        // Si hay texto, agregarlo como tag
        e.preventDefault();
        addTag(inputValue.trim());
      }
      // Si no hay sugerencias ni texto, permitir que Tab pase al siguiente campo (no preventDefault)
    }
  };

  const addTag = (tag: string) => {
    if (tag && !tags.some(t => t.toLowerCase() === tag.toLowerCase())) {
      onTagsChange([...tags, tag]);
    }
    setInputValue('');
    setShowSuggestions(false);
  };

  const removeTag = (tagToRemove: string) => {
    onTagsChange(tags.filter(tag => tag !== tagToRemove));
  };

  // Cerrar sugerencias al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Tags existentes */}
      <div className="flex flex-wrap gap-2 mb-2 min-h-[32px]">
        {tags.map((tag, index) => (
          <Badge
            key={index}
            variant="secondary"
            className="bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors cursor-pointer group"
            onClick={() => !disabled && removeTag(tag)}
          >
            {tag}
            {!disabled && (
              <X className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </Badge>
        ))}
      </div>

      {/* Input para agregar nuevos tags */}
      <div className="relative">
        <input
          ref={actualInputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (inputValue.trim() || suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
          placeholder="Agregar tags..."
          disabled={disabled}
          tabIndex={tabIndex}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
        
        {/* Botón para agregar tag manualmente */}
        {inputValue.trim() && !tags.includes(inputValue.trim()) && (
          <button
            type="button"
            onClick={() => addTag(inputValue.trim())}
            disabled={disabled}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-blue-600 hover:text-blue-800 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Sugerencias */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              className={`px-3 py-2 cursor-pointer hover:bg-gray-100 ${
                index === selectedSuggestionIndex ? 'bg-blue-100' : ''
              }`}
              onClick={() => addTag(suggestion)}
            >
              {suggestion}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

PendingItemTagsSelector.displayName = 'PendingItemTagsSelector';
