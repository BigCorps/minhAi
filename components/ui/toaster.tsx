// components/ui/toaster.tsx
'use client';

import { useToast } from "@//hooks/use-toast";
import { X, CheckCircle2, AlertCircle } from "lucide-react";

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <div className="fixed top-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:top-auto sm:right-0 sm:bottom-0 sm:flex-col md:max-w-[420px]">
      {toasts.map((toast) => {
        const isDestructive = toast.variant === "destructive";
        
        return (
          <div
            key={toast.id}
            className={`group pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-2xl border p-4 pr-8 shadow-lg transition-all animate-in slide-in-from-right-full ${
              isDestructive
                ? "bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-500/30"
                : "bg-white dark:bg-slate-800 border-gray-200 dark:border-white/10"
            }`}
          >
            <div className="flex-shrink-0">
              {isDestructive ? (
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              )}
            </div>
            
            <div className="grid gap-1 flex-1">
              {toast.title && (
                <div className={`text-sm font-semibold ${
                  isDestructive 
                    ? "text-red-900 dark:text-red-200" 
                    : "text-gray-900 dark:text-white"
                }`}>
                  {toast.title}
                </div>
              )}
              {toast.description && (
                <div className={`text-sm ${
                  isDestructive
                    ? "text-red-700 dark:text-red-300"
                    : "text-gray-600 dark:text-gray-400"
                }`}>
                  {toast.description}
                </div>
              )}
            </div>

            <button
              onClick={() => dismiss(toast.id)}
              className={`absolute right-2 top-2 rounded-md p-1 opacity-70 transition-opacity hover:opacity-100 ${
                isDestructive
                  ? "text-red-600 dark:text-red-400"
                  : "text-gray-500 dark:text-gray-400"
              }`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}