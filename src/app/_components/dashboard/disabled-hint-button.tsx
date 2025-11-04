'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type DisabledHintButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  disabledHint?: string;
  containerClassName?: string;
  children: ReactNode;
};

export function DisabledHintButton({
  disabledHint,
  containerClassName,
  className,
  disabled,
  children,
  ...rest
}: DisabledHintButtonProps) {
  const [visible, setVisible] = useState(false);
  const [hintPosition, setHintPosition] = useState<{ left: number; top: number } | null>(null);
  const containerRef = useRef<HTMLSpanElement | null>(null);
  const shouldShowHint = Boolean(disabledHint) && Boolean(disabled);

  const updateHintPosition = useCallback(() => {
    if (!shouldShowHint || !containerRef.current) {
      setHintPosition(null);
      return;
    }
    const rect = containerRef.current.getBoundingClientRect();
    setHintPosition({
      left: rect.left + rect.width / 2,
      top: rect.top - 8,
    });
  }, [shouldShowHint]);

  const handleMouseEnter = () => {
    if (shouldShowHint) {
      updateHintPosition();
      setVisible(true);
    }
  };

  const handleMouseLeave = () => {
    if (visible) {
      setVisible(false);
    }
  };

  useEffect(() => {
    if (!visible) return;

    const handleScrollOrResize = () => {
      updateHintPosition();
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [visible, updateHintPosition]);

  return (
    <span
      ref={containerRef}
      className={`relative inline-flex ${containerClassName ?? ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        {...rest}
        disabled={disabled}
        className={className}
      >
        {children}
      </button>
      {visible && shouldShowHint && hintPosition
        ? createPortal(
            <span
              style={{
                position: 'fixed',
                left: hintPosition.left,
                top: hintPosition.top,
                transform: 'translate(-50%, -100%)',
                zIndex: 100000,
                pointerEvents: 'none',
              }}
              className="whitespace-nowrap rounded bg-neutral-900 px-2 py-1 text-xs text-white shadow-md"
            >
              {disabledHint}
            </span>,
            document.body,
          )
        : null}
    </span>
  );
}
