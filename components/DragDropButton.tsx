'use client';

import { useState, useRef, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DragDropButtonProps {
  children: ReactNode;
  onClick: () => void;
  onDrop: (files: FileList) => void;
  className?: string;
  disabled?: boolean;
}

export default function DragDropButton({ 
  children, 
  onClick, 
  onDrop, 
  className, 
  disabled 
}: DragDropButtonProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Solo permitir archivos PDF
    const hasPdfFiles = Array.from(e.dataTransfer.items).some(
      item => item.kind === 'file' && item.type === 'application/pdf'
    );
    
    if (hasPdfFiles) {
      setDragCounter(prev => prev + 1);
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setDragCounter(prev => {
      const newCounter = prev - 1;
      if (newCounter === 0) {
        setIsDragOver(false);
      }
      return newCounter;
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsDragOver(false);
    setDragCounter(0);
    
    if (disabled) return;
    
    const files = e.dataTransfer.files;
    const pdfFiles = Array.from(files).filter(file => 
      file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    );
    
    if (pdfFiles.length > 0) {
      // Crear un FileList sintético con solo los PDFs
      const dataTransfer = new DataTransfer();
      pdfFiles.forEach(file => dataTransfer.items.add(file));
      
      onDrop(dataTransfer.files);
    }
  };

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="relative"
    >
      <Button
        ref={buttonRef}
        onClick={onClick}
        disabled={disabled}
        className={cn(
          "transition-all duration-200",
          isDragOver && "scale-105 shadow-lg ring-2 ring-blue-500 ring-opacity-50",
          className
        )}
      >
        {children}
      </Button>
      
      {isDragOver && (
        <div className="absolute inset-0 bg-blue-500 bg-opacity-20 rounded-md border-2 border-dashed border-blue-500 flex items-center justify-center pointer-events-none">
          <span className="text-blue-600 font-medium text-sm">
            Suelta los PDFs aquí
          </span>
        </div>
      )}
    </div>
  );
}
