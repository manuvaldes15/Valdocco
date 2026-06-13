import { forwardRef, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { X } from 'lucide-react';

/** Estilo compartido de campos de formulario (compatible con react-hook-form). */
const fieldCls =
  'w-full rounded-md border border-line bg-elevated px-3.5 py-2.5 text-sm text-primary placeholder:text-muted outline-none transition-colors focus:border-accent disabled:opacity-50';

export function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-secondary">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </label>
  );
}

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function TextInput(props, ref) {
    return <input ref={ref} {...props} className={`${fieldCls} ${props.className ?? ''}`} />;
  }
);

export const SelectInput = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function SelectInput(props, ref) {
    return <select ref={ref} {...props} className={`${fieldCls} ${props.className ?? ''}`} />;
  }
);

export const TextArea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function TextArea(props, ref) {
    return <textarea ref={ref} rows={3} {...props} className={`${fieldCls} ${props.className ?? ''}`} />;
  }
);

export function Modal({
  abierto,
  titulo,
  onCerrar,
  children,
  ancho = 'max-w-lg',
}: {
  abierto: boolean;
  titulo: string;
  onCerrar: () => void;
  children: ReactNode;
  ancho?: string;
}) {
  if (!abierto) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-16">
      <div className="fixed inset-0 bg-black/60" onClick={onCerrar} />
      <div className={`relative w-full ${ancho} rounded-xl border border-line bg-surface shadow-modal`}>
        <div className="flex items-center justify-between border-b border-line-subtle px-6 py-4">
          <h2 className="text-base font-bold text-primary">{titulo}</h2>
          <button
            onClick={onCerrar}
            className="rounded-md p-1.5 text-secondary transition-colors hover:bg-elevated hover:text-primary"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

/** Elimina strings vacíos antes de enviar al backend (los campos opcionales con '' fallan Zod). */
export function limpiar<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const salida: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === '' || v === undefined || v === null) continue;
    salida[k] = v;
  }
  return salida as Partial<T>;
}
