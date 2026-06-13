import { create } from 'zustand';
import { CheckCircle2, XCircle } from 'lucide-react';

interface Toast {
  id: number;
  tipo: 'ok' | 'error';
  mensaje: string;
}

interface ToastState {
  toasts: Toast[];
  push: (tipo: Toast['tipo'], mensaje: string) => void;
  remove: (id: number) => void;
}

let contador = 0;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (tipo, mensaje) => {
    const id = ++contador;
    set((s) => ({ toasts: [...s.toasts, { id, tipo, mensaje }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 4500);
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  ok: (mensaje: string) => useToastStore.getState().push('ok', mensaje),
  error: (mensaje: string) => useToastStore.getState().push('error', mensaje),
};

export function Toaster() {
  const { toasts, remove } = useToastStore();
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[100] flex w-80 flex-col gap-2">
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => remove(t.id)}
          className={`pointer-events-auto flex items-start gap-2.5 rounded-lg border p-3.5 text-left text-sm shadow-modal ${
            t.tipo === 'ok'
              ? 'border-success/40 bg-surface text-primary'
              : 'border-danger/40 bg-surface text-primary'
          }`}
        >
          {t.tipo === 'ok' ? (
            <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-success" />
          ) : (
            <XCircle size={17} className="mt-0.5 shrink-0 text-danger" />
          )}
          <span>{t.mensaje}</span>
        </button>
      ))}
    </div>
  );
}
