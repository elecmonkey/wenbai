import type { ChangeEvent, FocusEvent } from 'react';

export type RecordEditorTextSectionProps = {
  label: string;
  value: string;
  readOnly: boolean;
  copyFeedback: 'idle' | 'success';
  copyIdleLabel: string;
  copySuccessLabel: string;
  onCopy: () => void;
  onChange: (value: string) => void;
  rows?: number;
};

export function RecordEditorTextSection({
  label,
  value,
  readOnly,
  copyFeedback,
  copyIdleLabel,
  copySuccessLabel,
  onCopy,
  onChange,
  rows = 3,
}: RecordEditorTextSectionProps) {
  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onChange(event.target.value);
  };

  const handleFocus = readOnly
    ? (event: FocusEvent<HTMLTextAreaElement>) => {
        event.target.blur();
      }
    : undefined;

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs uppercase tracking-wide text-neutral-500">
          {label}
        </label>
        <button
          type="button"
          onClick={onCopy}
          className="text-xs text-blue-500 hover:text-blue-600"
        >
          {copyFeedback === 'success' ? copySuccessLabel : copyIdleLabel}
        </button>
      </div>
      <textarea
        value={value}
        readOnly={readOnly}
        onChange={handleChange}
        onFocus={handleFocus}
        rows={rows}
        className="w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm leading-relaxed text-neutral-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-neutral-50"
      />
    </section>
  );
}
