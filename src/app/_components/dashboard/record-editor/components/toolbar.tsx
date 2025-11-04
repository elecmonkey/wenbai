import { DisabledHintButton } from '../../disabled-hint-button';

export type RecordEditorToolbarProps = {
  onSave: () => void;
  onReset: () => void;
  onRefresh: () => void;
  canSave: boolean;
  canReset: boolean;
  canRefresh: boolean;
  refreshing: boolean;
  isAuthenticated: boolean;
  currentTitle: string;
};

export function RecordEditorToolbar({
  onSave,
  onReset,
  onRefresh,
  canSave,
  canReset,
  canRefresh,
  refreshing,
  isAuthenticated,
  currentTitle,
}: RecordEditorToolbarProps) {
  return (
    <div className="flex items-center gap-2 border-b border-neutral-200 bg-white px-4 py-3 text-sm">
      <DisabledHintButton
        onClick={onSave}
        disabled={!canSave}
        disabledHint={!isAuthenticated ? '请登录后保存修改' : undefined}
        className="rounded bg-emerald-500 px-3 py-1 font-medium text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-400"
      >
        保存
      </DisabledHintButton>
      <DisabledHintButton
        onClick={onReset}
        disabled={!canReset}
        disabledHint={!isAuthenticated ? '请登录后撤销修改' : undefined}
        className="rounded border border-neutral-300 px-3 py-1 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:text-neutral-400"
      >
        撤销更改
      </DisabledHintButton>
      <DisabledHintButton
        onClick={onRefresh}
        disabled={!canRefresh}
        disabledHint={canRefresh ? undefined : '请先保存或撤销当前更改后再刷新'}
        className="flex w-15 items-center justify-center rounded border border-neutral-300 px-3 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:text-neutral-400"
        containerClassName="inline-flex"
      >
        <span className="inline-flex h-7 w-full items-center justify-center">
          {refreshing ? (
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-neutral-400 border-t-transparent" />
          ) : (
            '刷新'
          )}
        </span>
      </DisabledHintButton>
      <span className="ml-auto text-xs text-neutral-500">
        当前条目：{currentTitle || '未命名'}
      </span>
    </div>
  );
}
