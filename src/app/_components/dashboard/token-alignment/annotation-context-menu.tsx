'use client';

import { useEffect, useRef } from 'react';

type AnnotationContextMenuProps = {
  position: { x: number; y: number };
  hasAnnotation: boolean;
  onAddEdit: () => void;
  onRemove: () => void;
  onClose: () => void;
};

export function AnnotationContextMenu({
  position,
  hasAnnotation,
  onAddEdit,
  onRemove,
  onClose,
}: AnnotationContextMenuProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuRef.current) return;

    const menu = menuRef.current;
    const rect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let { x, y } = position;

    // 调整水平位置
    if (x + rect.width > viewportWidth - 8) {
      x = viewportWidth - rect.width - 8;
    }
    if (x < 8) {
      x = 8;
    }

    // 调整垂直位置
    if (y + rect.height > viewportHeight - 8) {
      y = viewportHeight - rect.height - 8;
    }
    if (y < 8) {
      y = 8;
    }

    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
  }, [position]);

  return (
    <div
      ref={menuRef}
      className="fixed z-50 w-36 overflow-hidden rounded border border-neutral-200 bg-white shadow-lg"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      <button
        onClick={() => {
          onAddEdit();
          onClose();
        }}
        className="flex w-full items-center px-3 py-2 text-left text-sm text-neutral-700 transition hover:bg-neutral-100"
      >
        {hasAnnotation ? '编辑注释' : '添加注释'}
      </button>
      {hasAnnotation && (
        <button
          onClick={() => {
            onRemove();
            onClose();
          }}
          className="flex w-full items-center border-t border-neutral-100 px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-50"
        >
          删除注释
        </button>
      )}
    </div>
  );
}
