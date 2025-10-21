// components/TagsSelector.tsx
'use client';

import { useState, useRef, useEffect, useMemo, forwardRef } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface TagsSelectorProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  existingTags?: string[];
  disabled?: boolean;
  tabIndex?: number;
  allDescuentos?: any[]; // Para obtener tags reales de la base de datos
  defaultTag?: string; // Último tag usado para agregar como predeterminado
}

export const TagsSelector = forwardRef<HTMLInputElement, TagsSelectorProps>(
  ({ tags, onTagsChange, existingTags = [], disabled = false, tabIndex, allDescuentos = [], defaultTag }, ref) => {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Usar el ref externo si se proporciona, sino usar el interno
  const actualInputRef = ref || inputRef;

  // Extraer todos los tags únicos de los descuentos existentes
  const allExistingTags = useMemo(() => {
    const tagsSet = new Set<string>();
    
    // Agregar tags predefinidos
    existingTags.forEach(tag => tagsSet.add(tag.toLowerCase()));
    
    // Agregar tags de descuentos existentes
    allDescuentos.forEach(descuento => {
      if (descuento.tags && Array.isArray(descuento.tags)) {
        descuento.tags.forEach((tag: string) => {
          if (tag && tag.trim()) {
            tagsSet.add(tag.toLowerCase());
          }
        });
      }
    });
    
    return Array.from(tagsSet).sort();
  }, [existingTags, allDescuentos]);

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
  useEffect(() => {
    if (defaultTag && tags.length === 0 && !tags.includes(defaultTag)) {
      addTag(defaultTag);
    }
  }, [defaultTag, tags]);

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

  const handleSuggestionClick = (suggestion: string) => {
    addTag(suggestion);
  };

  // Cerrar sugerencias al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="flex flex-wrap gap-2 mb-2">
        {tags.map((tag) => (
          <Badge key={tag} variant="secondary" className="flex items-center gap-1">
            {tag}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 hover:bg-transparent"
              onClick={() => removeTag(tag)}
              disabled={disabled}
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        ))}
      </div>
      
      <div className="relative">
        <Input
          ref={actualInputRef}
          placeholder="Agregar tag..."
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (inputValue.trim() && suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
          disabled={disabled}
          className="w-full pr-10"
          tabIndex={tabIndex}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
          onClick={() => addTag(inputValue.trim())}
          disabled={disabled || !inputValue.trim()}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-hidden">
          <div className="max-h-32 overflow-y-auto">
            {suggestions.map((suggestion, index) => (
              <div
                key={suggestion}
                className={`p-2 cursor-pointer border-b last:border-b-0 ${
                  index === selectedSuggestionIndex 
                    ? 'bg-blue-100' 
                    : 'hover:bg-gray-100'
                }`}
                onClick={() => handleSuggestionClick(suggestion)}
              >
                <span className="text-sm">{suggestion}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

TagsSelector.displayName = 'TagsSelector';
