import { useState, useEffect, useCallback, useRef } from 'react';

export const useKanbanZoom = (initialZoom = 1.0, minZoom = 0.5, maxZoom = 1.6) => {
  const [zoomLevel, setZoomLevel] = useState(initialZoom);
  const containerRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const el = containerRef.current;
    if (el) {
      // Adiciona listener não-passivo para permitir preventDefault
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
      // Fallback para scale se necessário, mas zoom é melhor para dnd
      // transform: `scale(${zoomLevel})`,
      // transformOrigin: 'top left'
    } as React.CSSProperties
  };
};
