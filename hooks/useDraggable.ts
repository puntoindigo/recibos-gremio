import React, { useRef, useState, useCallback } from 'react';

interface Position {
  x: number;
  y: number;
}

export function useDraggable(getInitialPosition?: () => Position) {
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [isClient, setIsClient] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Position>({ x: 0, y: 0 });
  const elementRef = useRef<HTMLDivElement>(null);

  // Establecer posición inicial solo en el cliente
  React.useEffect(() => {
    setIsClient(true);
    if (getInitialPosition) {
      setPosition(getInitialPosition());
    }
  }, [getInitialPosition]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return; // Solo botón izquierdo
    
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
    
    e.preventDefault();
    e.stopPropagation();
  }, [position]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    e.preventDefault();
    
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    
    // Limitar a los bordes de la ventana
    const elementWidth = elementRef.current?.offsetWidth || 0;
    const elementHeight = elementRef.current?.offsetHeight || 0;
    const maxX = window.innerWidth - elementWidth;
    const maxY = window.innerHeight - elementHeight;
    
    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY)),
    });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Agregar event listeners globales
  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return {
    position,
    isDragging,
    elementRef,
    handleMouseDown,
    isClient,
  };
}
