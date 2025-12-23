'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface UseResizableOptions {
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  initialWidth?: number;
  initialHeight?: number;
}

export function useResizable({
  minWidth = 200,
  minHeight = 150,
  maxWidth = 600,
  maxHeight = 400,
  initialWidth = 280,
  initialHeight = 200
}: UseResizableOptions = {}) {
  const [size, setSize] = useState({
    width: initialWidth,
    height: initialHeight
  });
  
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const newWidth = Math.max(minWidth, Math.min(maxWidth, e.clientX - rect.left));
    const newHeight = Math.max(minHeight, Math.min(maxHeight, e.clientY - rect.top));

    setSize({ width: newWidth, height: newHeight });
  }, [isResizing, minWidth, maxWidth, minHeight, maxHeight]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'nw-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return {
    size,
    isResizing,
    containerRef,
    handleMouseDown
  };
}

