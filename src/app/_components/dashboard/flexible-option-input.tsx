'use client';

import { createPortal } from 'react-dom';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';

type FlexibleOptionInputProps = {
  value: string | null;
  onChange: (value: string | null) => void;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

const normalizeValue = (value: string | null) => {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export function FlexibleOptionInput({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  className,
}: FlexibleOptionInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [filterText, setFilterText] = useState('');
  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const inputValue = value ?? '';
  const normalizedCurrent = normalizeValue(value);

  const optionPool = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    if (normalizedCurrent) {
      seen.add(normalizedCurrent);
      list.push(normalizedCurrent);
    }
    options.forEach((option) => {
      const normalizedOption = normalizeValue(option) ?? '';
      if (!normalizedOption || seen.has(normalizedOption)) {
        return;
      }
      seen.add(normalizedOption);
      list.push(normalizedOption);
    });
    return list;
  }, [normalizedCurrent, options]);

  const filteredOptions = useMemo(() => {
    const keyword = filterText.trim().toLowerCase();
    if (!keyword) {
      return optionPool;
    }
    return optionPool.filter((option) => option.toLowerCase().includes(keyword));
  }, [filterText, optionPool]);

  const closeDropdown = useCallback(() => {
    setOpen(false);
    setActiveIndex(-1);
    setDropdownPosition(null);
    dropdownRef.current = null;
  }, []);

  const openDropdown = useCallback(() => {
    if (disabled) return;
    setOpen(true);
  }, [disabled]);

  const handleOptionSelect = useCallback(
    (option: string) => {
      const normalized = normalizeValue(option);
      onChange(normalized);
      setFilterText(option);
      closeDropdown();
      requestAnimationFrame(() => {
        if (!disabled) {
          inputRef.current?.focus();
        }
      });
    },
    [closeDropdown, disabled, onChange],
  );

  const handleDocumentClick = useCallback(
    (event: MouseEvent | FocusEvent) => {
      if (!rootRef.current) return;
      const targetNode = event.target as Node;
      if (
        rootRef.current.contains(targetNode) ||
        (dropdownRef.current && dropdownRef.current.contains(targetNode))
      ) {
        return;
      }
      closeDropdown();
    },
    [closeDropdown],
  );

  useEffect(() => {
    document.addEventListener('mousedown', handleDocumentClick);
    document.addEventListener('focusin', handleDocumentClick);
    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
      document.removeEventListener('focusin', handleDocumentClick);
    };
  }, [handleDocumentClick]);

  useEffect(() => {
    if (!open) {
      setActiveIndex(-1);
    } else if (filteredOptions.length > 0) {
      setActiveIndex(0);
    }
  }, [filteredOptions.length, open]);

  useEffect(() => {
    if (!open) {
      setFilterText(value ?? '');
    }
  }, [open, value]);

  const updateDropdownPosition = useCallback(() => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    setDropdownPosition({
      top: rect.bottom + window.scrollY,
      left: rect.left + window.scrollX,
      width: rect.width,
    });
  }, []);

  useLayoutEffect(() => {
    if (open) {
      updateDropdownPosition();
    }
  }, [open, updateDropdownPosition, filteredOptions.length]);

  useEffect(() => {
    if (!open) return;
    const handleWindowEvents = () => {
      updateDropdownPosition();
    };
    window.addEventListener('resize', handleWindowEvents);
    window.addEventListener('scroll', handleWindowEvents, true);
    return () => {
      window.removeEventListener('resize', handleWindowEvents);
      window.removeEventListener('scroll', handleWindowEvents, true);
    };
  }, [open, updateDropdownPosition]);

  const handleFocus = useCallback(() => {
    if (disabled) {
      closeDropdown();
      return;
    }
    setFilterText('');
    openDropdown();
  }, [closeDropdown, disabled, openDropdown]);

  const handleMouseDown = useCallback(
    (event: ReactMouseEvent<HTMLInputElement>) => {
      if (disabled) {
        event.preventDefault();
      }
    },
    [disabled],
  );

  const handleInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (disabled) {
        return;
      }
      const nextValue = event.target.value;
      openDropdown();
      setFilterText(nextValue);
      onChange(normalizeValue(nextValue));
    },
    [disabled, onChange, openDropdown],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (!open && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
        event.preventDefault();
        setFilterText('');
        openDropdown();
        return;
      }

      if (!open) return;

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((prev) => {
          if (filteredOptions.length === 0) return -1;
          const next = prev + 1;
          return next >= filteredOptions.length ? 0 : next;
        });
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((prev) => {
          if (filteredOptions.length === 0) return -1;
          const next = prev - 1;
          return next < 0 ? filteredOptions.length - 1 : next;
        });
      } else if (event.key === 'Enter') {
        if (activeIndex >= 0 && activeIndex < filteredOptions.length) {
          event.preventDefault();
          handleOptionSelect(filteredOptions[activeIndex]);
        } else {
          closeDropdown();
        }
      } else if (event.key === 'Escape') {
        event.preventDefault();
        closeDropdown();
      }
    },
    [activeIndex, closeDropdown, filteredOptions, handleOptionSelect, open, openDropdown],
  );

  const showDropdown = open && !disabled && filteredOptions.length > 0 && dropdownPosition !== null;
  const wrapperClassName = `inline-block ${className ?? ''}`.trim();

  return (
    <div ref={rootRef} className={wrapperClassName}>
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onFocus={handleFocus}
        onMouseDown={handleMouseDown}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        spellCheck={false}
        className="w-full rounded border border-neutral-300 bg-white px-2 py-1 text-xs text-neutral-700 outline-none transition focus:border-blue-400 disabled:cursor-not-allowed disabled:bg-white disabled:text-neutral-500 disabled:opacity-100"
        role="combobox"
        aria-expanded={showDropdown}
        aria-autocomplete="list"
        aria-disabled={disabled}
      />
      {showDropdown && dropdownPosition
        ? createPortal(
            <div
              ref={(element) => {
                dropdownRef.current = element;
              }}
              className="z-50 max-h-48 overflow-auto rounded border border-neutral-200 bg-white shadow-lg"
              style={{
                position: 'absolute',
                top: dropdownPosition.top,
                left: dropdownPosition.left,
                width: dropdownPosition.width,
              }}
            >
              {filteredOptions.map((option, index) => {
                const isActive = index === activeIndex;
                return (
                  <button
                    key={option}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => handleOptionSelect(option)}
                    className={`flex w-full items-center px-3 py-1.5 text-left text-xs transition ${
                      isActive ? 'bg-blue-50 text-blue-700' : 'hover:bg-neutral-100'
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
