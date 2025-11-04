'use client';

type SaveStatusIndicatorProps = {
  dirty: boolean;
  saving: boolean;
  className?: string;
};

export function SaveStatusIndicator({
  dirty,
  saving,
  className = '',
}: SaveStatusIndicatorProps) {
  if (saving) {
    return (
      <span
        className={`inline-flex h-3 w-3 items-center justify-center ${className}`}
        aria-label="保存中"
      >
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
      </span>
    );
  }

  const colorClass = dirty ? 'bg-orange-400' : 'bg-emerald-400';
  const label = dirty ? '存在未保存修改' : '已保存';

  return (
    <span
      className={`inline-flex h-3 w-3 flex-shrink-0 items-center justify-center ${className}`}
      aria-label={label}
    >
      <span className={`h-2.5 w-2.5 rounded-full ${colorClass}`} />
    </span>
  );
}
