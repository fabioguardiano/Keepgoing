import { useState, useEffect, useCallback, useRef } from 'react';

export const useKanbanInteraction = (initialZoom = 1.0, minZoom = 0.5, maxZoom = 1.6) => {
  const [zoomLevel, setZoomLevel] = useState(initialZoom);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Drag-to-scroll state
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  // --- Zoom logic ---
  const handleWheel = useCallback((e: WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoomLevel(prev => {
        const next = Math.round((prev + delta) * 10) / 10;
        return Math.min(Math.max(next, minZoom), maxZoom);
      });
    }
  }, [minZoom, maxZoom]);

  // --- Drag-to-scroll logic ---
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Só inicia o drag se clicar no fundo (não em cards ou botões)
    // Verificamos se o target é o próprio container ou as áreas de "gap"
    if (e.target !== e.currentTarget && !(e.target as HTMLElement).classList.contains('kanban-background')) return;

    isDragging.current = true;
    startX.current = e.pageX - (containerRef.current?.offsetLeft || 0);
    scrollLeft.current = containerRef.current?.scrollLeft || 0;
    
    if (containerRef.current) {
      containerRef.current.style.cursor = 'grabbing';
      containerRef.current.style.userSelect = 'none';
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    isDragging.current = false;
    if (containerRef.current) {
      containerRef.current.style.cursor = 'grab';
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    if (containerRef.current) {
      containerRef.current.style.cursor = 'grab';
      containerRef.current.style.removeProperty('user-select');
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current || !containerRef.current) return;
    e.preventDefault();
    const x = e.pageX - (containerRef.current.offsetLeft || 0);
    const walk = (x - startX.current) * 2; // multiplicador de velocidade
    containerRef.current.scrollLeft = scrollLeft.current - walk;
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (el) {
      el.addEventListener('wheel', handleWheel, { passive: false });
      return () => el.removeEventListener('wheel', handleWheel);
    }
  }, [handleWheel]);

  const resetZoom = () => setZoomLevel(1.0);

  return {
    zoomLevel,
    setZoomLevel,
    containerRef,
    resetZoom,
    zoomStyle: {
      zoom: zoomLevel,
    } as React.CSSProperties,
    scrollProps: {
      onMouseDown: handleMouseDown,
      onMouseLeave: handleMouseLeave,
      onMouseUp: handleMouseUp,
      onMouseMove: handleMouseMove,
      style: { cursor: 'grab' }
    }
  };
};
