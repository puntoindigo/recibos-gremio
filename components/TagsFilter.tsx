// components/TagsFilter.tsx
'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface TagsFilterProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  allDescuentos: any[];
  disabled?: boolean;
}

export default function TagsFilter({ selectedTags, onTagsChange, allDescuentos, disabled = false }: TagsFilterProps) {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Extraer todos los tags únicos de los descuentos existentes
  const allExistingTags = useMemo(() => {
    const tagsSet = new Set<string>();
    
    allDescuentos.forEach(descuento => {
      if (descuento.tags && Array.isArray(descuento.tags)) {
        descuento.tags.forEach((tag: string) => {
          if (tag && tag.trim()) {
            tagsSet.add(tag); // Mantener el case original
          }
        });
      }
    });
    
    return Array.from(tagsSet).sort();
  }, [allDescuentos]);

  // Filtrar sugerencias basadas en el input
  useEffect(() => {
    if (inputValue.trim()) {
      const searchTerm = inputValue.toLowerCase();
      const filtered = allExistingTags.filter(tag => 
        tag.toLowerCase().includes(searchTerm) && !selectedTags.includes(tag)
      );
      setSuggestions(filtered.slice(0, 8));
      setShowSuggestions(filtered.length > 0);
    } else if (showSuggestions) {
      // Si no hay input pero se muestran sugerencias, mostrar todos los tags disponibles
      const availableTags = allExistingTags.filter(tag => !selectedTags.includes(tag));
      setSuggestions(availableTags.slice(0, 10));
    }
  }, [inputValue, allExistingTags, selectedTags, showSuggestions]);

  const handleAddTag = (tagToAdd: string) => {
    if (tagToAdd.trim() && !selectedTags.includes(tagToAdd.trim())) {
      onTagsChange([...selectedTags, tagToAdd.trim()]);
      setInputValue('');
      setShowSuggestions(false);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onTagsChange(selectedTags.filter(tag => tag !== tagToRemove));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestions.length > 0 && showSuggestions) {
        handleAddTag(suggestions[0]);
      } else if (inputValue.trim()) {
        handleAddTag(inputValue);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
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
        {selectedTags.map((tag, index) => (
          <Badge key={index} variant="secondary" className="flex items-center gap-1">
            {tag}
            <X
              className="h-3 w-3 cursor-pointer"
              onClick={() => handleRemoveTag(tag)}
            />
          </Badge>
        ))}
      </div>
      
      <div className="relative">
        <Input
          ref={inputRef}
          placeholder="Filtrar por tags..."
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
        />
        {inputValue ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
            onClick={() => setInputValue('')}
            disabled={disabled}
          >
            <X className="h-4 w-4 opacity-50" />
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
            onClick={() => setShowSuggestions(!showSuggestions)}
            disabled={disabled}
          >
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              className="p-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
              onClick={() => handleAddTag(suggestion)}
            >
              <span className="text-sm">{suggestion}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
