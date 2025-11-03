'use client';

export type RepoInfoModalProps = {
  open: boolean;
  onClose: () => void;
};

export function RepoInfoModal({ open, onClose }: RepoInfoModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-50 w-full max-w-md rounded-lg border border-neutral-200 bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-800">关于本站</h2>
          <button
            onClick={onClose}
            className="rounded border border-transparent px-2 py-1 text-xs text-neutral-500 hover:border-neutral-300 hover:bg-neutral-100 hover:text-neutral-700"
            aria-label="关闭"
          >
            关闭
          </button>
        </div>
        <div className="mt-4 space-y-3 text-sm leading-relaxed text-neutral-600">
          <p>
            文白对译标注系统（Wenbai）by <a href="https://www.elecmonkey.com" className="text-blue-600 hover:text-blue-700 hover:underline" target="_blank">Elecmonkey</a>
          </p>
          <p className="text-neutral-500">本项目仍在迭代中，欢迎提出改进建议。</p>
        </div>
      </div>
    </div>
  );
}
