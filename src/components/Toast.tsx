import React from 'react';
import { CheckCircle2, AlertCircle, Info, MessageSquare, X } from 'lucide-react';
import { NotificationToast } from '../types';

interface ToastProps {
  toasts: NotificationToast[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-3">
      {toasts.map((toast) => {
        let icon = <Info className="w-5 h-5 text-indigo-500 shrink-0" />;
        let borderClass = 'border-indigo-100';

        if (toast.type === 'success') {
          icon = <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />;
          borderClass = 'border-emerald-200';
        } else if (toast.type === 'error') {
          icon = <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />;
          borderClass = 'border-rose-200';
        } else if (toast.type === 'message') {
          icon = <MessageSquare className="w-5 h-5 text-violet-500 shrink-0 animate-bounce" />;
          borderClass = 'border-violet-300 ring-2 ring-violet-200/50';
        }

        return (
          <div
            key={toast.id}
            onClick={() => {
              if (toast.onClick) {
                toast.onClick();
                onDismiss(toast.id);
              }
            }}
            className={`pointer-events-auto liquid-glass-card rounded-2xl p-4 shadow-xl border ${borderClass} flex items-start gap-3 transition-all duration-300 transform translate-y-0 ${
              toast.onClick ? 'cursor-pointer hover:scale-102 hover:bg-white active:scale-98' : ''
            }`}
          >
            {icon}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <h4 className="text-sm font-bold text-slate-900 leading-snug">
                  {toast.title}
                </h4>
                {toast.onClick && (
                  <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded-md">
                    Reply
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 mt-0.5 break-words line-clamp-2">
                {toast.message}
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDismiss(toast.id);
              }}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
