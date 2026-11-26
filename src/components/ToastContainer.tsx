import React from 'react';
import { useApp } from '../context/AppContext';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X, RotateCcw } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-3 inset-x-2.5 sm:inset-x-4 z-50 flex flex-col items-center gap-2 pointer-events-none max-w-2xl mx-auto">
      {toasts.map((t) => {
        const isSuccess = t.type === 'success';
        const isError = t.type === 'error';
        const isWarning = t.type === 'warning';

        return (
          <div
            key={t.id}
            className={`pointer-events-auto w-full px-4 py-3 rounded-2xl shadow-xl flex items-center justify-between gap-3 backdrop-blur-md transition-all duration-200 border ${
              isSuccess
                ? 'bg-slate-900/90 text-white border-slate-700/80 shadow-slate-900/20'
                : isError
                ? 'bg-rose-900/90 text-white border-rose-700/80'
                : isWarning
                ? 'bg-amber-900/90 text-white border-amber-700/80'
                : 'bg-sky-900/90 text-white border-sky-700/80'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
              {isError && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
              {isWarning && <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />}
              {!isSuccess && !isError && !isWarning && <Info className="w-5 h-5 text-sky-400 shrink-0" />}
              <span className="text-sm font-medium tracking-tight truncate">{t.message}</span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {t.undoAction && (
                <button
                  onClick={() => {
                    t.undoAction?.();
                    dismissToast(t.id);
                  }}
                  className="px-2.5 py-1 rounded-xl bg-white/20 hover:bg-white/30 text-xs font-bold text-sky-200 flex items-center gap-1 transition"
                >
                  <RotateCcw className="w-3 h-3" /> Undo
                </button>
              )}
              <button
                onClick={() => dismissToast(t.id)}
                className="w-6 h-6 rounded-lg text-white/60 hover:text-white flex items-center justify-center transition"
                aria-label="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
