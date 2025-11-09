'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';

type TokenTooltipProps = {
  children: ReactNode;
  annotation?: string | null;
};

export function TokenTooltip({ children, annotation }: TokenTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  const hasAnnotation = annotation && annotation.trim().length > 0;

  const handleMouseEnter = (event: React.MouseEvent) => {
    if (!hasAnnotation) return;

    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top - 8;

    setPosition({ x, y });
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  useLayoutEffect(() => {
    if (!isVisible || !tooltipRef.current) return;

    const tooltip = tooltipRef.current;
    const rect = tooltip.getBoundingClientRect();
    const viewportWidth = window.innerWidth;

    let { x, y } = position;
    let adjusted = false;

    // 调整水平位置，避免超出视窗
    if (x - rect.width / 2 < 8) {
      x = rect.width / 2 + 8;
      adjusted = true;
    } else if (x + rect.width / 2 > viewportWidth - 8) {
      x = viewportWidth - rect.width / 2 - 8;
      adjusted = true;
    }

    // 调整垂直位置，避免超出视窗顶部
    if (y - rect.height < 8) {
      // 如果上方空间不足，显示在下方
      const triggerRect = triggerRef.current?.getBoundingClientRect();
      if (triggerRect) {
        y = triggerRect.bottom + 8;
        adjusted = true;
      }
    }

    if (adjusted) {
      // Tooltip 位置调整需要在渲染后立即执行，这是合理的使用场景
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPosition({ x, y });
    }
  }, [isVisible, position]);

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="inline-block"
      >
        {children}
      </div>
      {isVisible &&
        hasAnnotation &&
        createPortal(
          <div
            ref={tooltipRef}
            className="pointer-events-none fixed z-50 max-w-xs rounded-lg bg-neutral-900 px-3 py-2 text-xs text-white shadow-lg transition-opacity duration-200"
            style={{
              left: `${position.x}px`,
              top: `${position.y}px`,
              transform: 'translate(-50%, -100%)',
              opacity: isVisible ? 1 : 0,
            }}
          >
            {annotation}
          </div>,
          document.body,
        )}
    </>
  );
}
