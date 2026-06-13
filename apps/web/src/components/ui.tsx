import { ReactNode } from 'react';
import { TrendingDown, TrendingUp, Loader2 } from 'lucide-react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-surface border border-line rounded-xl shadow-card ${className}`}>{children}</div>
  );
}

export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between px-5 pt-5 pb-3">
      <div>
        <h3 className="text-base font-semibold text-primary">{title}</h3>
        {subtitle && <p className="text-xs text-secondary mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function KpiCard({
  label,
  value,
  icon,
  delta,
  deltaLabel,
  destacado = false,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  delta?: number;
  deltaLabel?: string;
  destacado?: boolean;
}) {
  const positivo = (delta ?? 0) >= 0;
  return (
    <div
      className={`rounded-xl border p-5 shadow-card transition-transform hover:-translate-y-0.5 ${
        destacado ? 'bg-accent text-white border-accent' : 'bg-surface border-line'
      }`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`text-xs font-medium uppercase tracking-wider ${destacado ? 'text-white/80' : 'text-secondary'}`}
        >
          {label}
        </span>
        <span className={destacado ? 'text-white/90' : 'text-accent'}>{icon}</span>
      </div>
      <div className="mt-3 flex items-end gap-3">
        <span className={`text-4xl font-bold leading-none ${destacado ? 'text-white' : 'text-primary'}`}>{value}</span>
        {delta !== undefined && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
              destacado
                ? 'bg-white/20 text-white'
                : positivo
                  ? 'bg-success-soft text-success'
                  : 'bg-danger-soft text-danger'
            }`}
          >
            {positivo ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(delta)}%
          </span>
        )}
      </div>
      {deltaLabel && (
        <p className={`mt-2 text-xs ${destacado ? 'text-white/70' : 'text-muted'}`}>{deltaLabel}</p>
      )}
    </div>
  );
}

type BadgeTone = 'success' | 'warning' | 'danger' | 'accent' | 'neutral';

const badgeTones: Record<BadgeTone, string> = {
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  accent: 'bg-accent-soft text-accent',
  neutral: 'bg-elevated text-secondary',
};

export function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeTones[tone]}`}>
      {children}
    </span>
  );
}

export function Button({
  children,
  variant = 'primary',
  type = 'button',
  disabled,
  onClick,
  className = '',
}: {
  children: ReactNode;
  variant?: 'primary' | 'ghost' | 'danger';
  type?: 'button' | 'submit';
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const variants = {
    primary: 'bg-accent text-white hover:opacity-90',
    ghost: 'bg-transparent text-secondary border border-line hover:bg-elevated hover:text-primary',
    danger: 'bg-danger text-white hover:opacity-90',
  };
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Input({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required,
  autoComplete,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-secondary">{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-line bg-elevated px-3.5 py-2.5 text-sm text-primary placeholder:text-muted outline-none transition-colors focus:border-accent"
      />
    </label>
  );
}

export function Table({ headers, children }: { headers: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-elevated">
            {headers.map((h) => (
              <th
                key={h}
                className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-secondary first:rounded-l-md last:rounded-r-md"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line-subtle">{children}</tbody>
      </table>
    </div>
  );
}

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center py-12 text-secondary ${className}`}>
      <Loader2 className="animate-spin" size={24} />
    </div>
  );
}

export function EmptyState({ mensaje }: { mensaje: string }) {
  return <p className="py-10 text-center text-sm text-muted">{mensaje}</p>;
}
