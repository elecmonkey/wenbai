'use client';

import { useEffect, useRef, useState } from 'react';

type PanelResizerProps = {
  onResize: (width: number) => void;
  minWidth?: number;
  maxWidth?: number;
  onDoubleClick?: () => void;
};

export function PanelResizer({
  onResize,
  minWidth = 200,
  maxWidth = 600,
  onDoubleClick,
}: PanelResizerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const initialXRef = useRef(0);
  const initialWidthRef = useRef(0);
  const currentWidthRef = useRef(0);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (event: MouseEvent) => {
      const deltaX = event.clientX - initialXRef.current;
      const newWidth = Math.max(
        minWidth,
        Math.min(maxWidth, initialWidthRef.current + deltaX)
      );
      currentWidthRef.current = newWidth;
      onResize(newWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      // Save final width on mouse up
      onResize(currentWidthRef.current);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, minWidth, maxWidth, onResize]);

  const handleMouseDown = (event: React.MouseEvent) => {
    event.preventDefault();

    // Get the width of the previous sibling (the panel we're resizing)
    const resizer = event.currentTarget as HTMLElement;
    const panel = resizer.previousElementSibling as HTMLElement;
    if (!panel) return;

    initialXRef.current = event.clientX;
    initialWidthRef.current = panel.offsetWidth;
    setIsDragging(true);

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const handleDoubleClick = () => {
    if (onDoubleClick) {
      onDoubleClick();
    }
  };

  return (
    <div
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onDoubleClick={handleDoubleClick}
      className="group relative z-10 w-px shrink-0 cursor-col-resize"
      aria-label="调整面板宽度"
    >
      {/* Visual indicator - doesn't affect layout */}
      <div
        className={`absolute inset-y-0 left-1/2 -translate-x-1/2 transition-all ${
          isDragging
            ? 'w-1 bg-blue-500'
            : isHovered
              ? 'w-px bg-blue-400'
              : 'w-px bg-neutral-200'
        }`}
      />
      {/* Wider hit area for easier grabbing */}
      <div className="absolute inset-y-0 -left-2 -right-2" />
    </div>
  );
}
