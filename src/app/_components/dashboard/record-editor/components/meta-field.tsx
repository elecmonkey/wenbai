import type { ChangeEvent, FocusEvent } from 'react';

export type RecordEditorMetaFieldProps = {
  value: string;
  readOnly: boolean;
  copyFeedback: 'idle' | 'success';
  onCopy: () => void;
  onChange: (value: string) => void;
};

export function RecordEditorMetaField({
  value,
  readOnly,
  copyFeedback,
  onCopy,
  onChange,
}: RecordEditorMetaFieldProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value);
  };

  const handleFocus = readOnly
    ? (event: FocusEvent<HTMLInputElement>) => {
        event.target.blur();
      }
    : undefined;

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs uppercase tracking-wide text-neutral-500">
          元信息
        </label>
        <button
          type="button"
          onClick={onCopy}
          className="text-xs text-blue-500 hover:text-blue-600"
        >
          {copyFeedback === 'success' ? '复制成功' : '复制信息'}
        </button>
      </div>
      <input
        value={value}
        readOnly={readOnly}
        onChange={handleChange}
        onFocus={handleFocus}
        className="w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-neutral-50"
        placeholder="如：《论语·学而》"
      />
    </section>
  );
}
