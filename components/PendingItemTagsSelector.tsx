// components/PendingItemTagsSelector.tsx
import React, { useState, useEffect, useRef, useMemo, forwardRef, useCallback } from 'react';
import { X, Plus, Tag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

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
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Usar el ref externo si se proporciona, sino usar el interno
  const actualInputRef = ref || inputRef;

  // Tags predefinidos comunes
  const predefinedTags = [
    'Bug', 'Feature', 'Mejora', 'Documentación', 'UI/UX', 
    'Backend', 'Frontend', 'Testing', 'Performance', 'Seguridad',
    'Urgente', 'General', 'Investigación', 'Refactoring'
  ];

  // Extraer todos los tags únicos de los items existentes
  const allExistingTags = useMemo(() => {
    const tagsSet = new Set<string>();
    
    // Agregar tags predefinidos
    predefinedTags.forEach(tag => tagsSet.add(tag));
    existingTags.forEach(tag => tagsSet.add(tag));
    
    // Agregar tags de items existentes
    allItems.forEach(item => {
      if (item.tags && Array.isArray(item.tags)) {
        item.tags.forEach((tag: string) => {
          if (tag && tag.trim()) {
            tagsSet.add(tag);
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
        tag.toLowerCase().includes(searchTerm) && !tags.includes(tag)
      );
      setSuggestions(filtered.slice(0, 8)); // Mostrar máximo 8 sugerencias
      setShowSuggestions(true);
    } else {
      // NO mostrar sugerencias automáticamente cuando no hay input
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [inputValue, allExistingTags, tags]);

  // Auto-agregar el defaultTag cuando se monta el componente si no hay tags
  const hasAddedDefaultTag = useRef(false);
  
  // Auto-agregar el defaultTag cuando se monta el componente si no hay tags - SIMPLIFICADO
  useEffect(() => {
    if (defaultTag && tags.length === 0 && !tags.includes(defaultTag) && !hasAddedDefaultTag.current) {
      hasAddedDefaultTag.current = true;
      // Usar setTimeout para evitar loops infinitos
      setTimeout(() => {
        onTagsChange([defaultTag]);
      }, 0);
    }
  }, [defaultTag, tags.length]); // Solo cuando cambie defaultTag o tags.length

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setSelectedSuggestionIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedSuggestionIndex >= 0 && suggestions[selectedSuggestionIndex]) {
          addTag(suggestions[selectedSuggestionIndex]);
        } else if (inputValue.trim()) {
          addTag(inputValue.trim());
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        break;
    }
  };

  const addTag = (tag: string) => {
    if (tag && !tags.includes(tag)) {
      onTagsChange([...tags, tag]);
      setInputValue('');
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
    }
  };

  const removeTag = (tagToRemove: string) => {
    onTagsChange(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSuggestionClick = (suggestion: string) => {
    addTag(suggestion);
  };

  const handleClickOutside = (event: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Tags existentes */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {tags.map((tag, index) => (
            <Badge
              key={index}
              variant="secondary"
              className="flex items-center space-x-1 px-2 py-1 text-xs"
            >
              <Tag className="h-3 w-3" />
              <span>{tag}</span>
              {!disabled && (
                <button
                  onClick={() => removeTag(tag)}
                  className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
                  type="button"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}

      {/* Input para agregar tags */}
      <div className="relative">
        <input
          ref={actualInputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (inputValue.trim()) {
              setShowSuggestions(true);
            }
          }}
          placeholder="Agregar tags..."
          disabled={disabled}
          tabIndex={tabIndex}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
        />
        
        {/* Botón para agregar tag manual */}
        {inputValue.trim() && (
          <Button
            type="button"
            size="sm"
            onClick={() => addTag(inputValue.trim())}
            className="absolute right-1 top-1 h-6 w-6 p-0"
          >
            <Plus className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Sugerencias */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
          <div className="p-2">
            <div className="text-xs text-gray-500 mb-2 font-medium">Sugerencias:</div>
            {suggestions.map((suggestion, index) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => handleSuggestionClick(suggestion)}
                className={`w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100 flex items-center space-x-2 ${
                  index === selectedSuggestionIndex ? 'bg-blue-50 text-blue-700' : ''
                }`}
              >
                <Tag className="h-3 w-3 text-gray-400" />
                <span>{suggestion}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tags predefinidos como botones */}
      {!showSuggestions && tags.length === 0 && (
        <div className="mt-3">
          <div className="text-xs text-gray-500 mb-2">Tags comunes:</div>
          <div className="flex flex-wrap gap-2">
            {predefinedTags.slice(0, 8).map((tag) => (
              <Button
                key={tag}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addTag(tag)}
                className="h-7 px-2 text-xs"
              >
                <Tag className="h-3 w-3 mr-1" />
                {tag}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

PendingItemTagsSelector.displayName = 'PendingItemTagsSelector';