import { Compass, Eye, Sparkles } from 'lucide-react';

const valores = [
  'Amor', 'Servicio', 'Paz', 'Responsabilidad', 'Honradez', 'Respeto',
  'Gratitud', 'Alegría', 'Perseverancia', 'Fe', 'Integridad', 'Comunicación',
];

export function MisionVision() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <h1 className="text-3xl font-extrabold text-primary lg:text-4xl">Misión, Visión y Valores</h1>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-line bg-surface p-7 shadow-card">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft text-accent">
            <Compass size={20} />
          </span>
          <h2 className="mt-4 text-xl font-bold text-primary">Misión</h2>
          <p className="mt-3 text-sm leading-relaxed text-secondary">
            "Somos una Institución Católica Salesiana, administrada por religiosas Hijas del Divino Salvador, que
            formamos integralmente a niños y jóvenes para hacer frente a los retos actuales de la educación, mediante
            la razón, la religión y el amor."
          </p>
        </div>
        <div className="rounded-xl border border-line bg-surface p-7 shadow-card">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft text-accent">
            <Eye size={20} />
          </span>
          <h2 className="mt-4 text-xl font-bold text-primary">Visión</h2>
          <p className="mt-3 text-sm leading-relaxed text-secondary">
            "Formar Buenos Cristianos y Honrados Ciudadanos y profesionales competentes; capaces de transformar su
            entorno social a través de su integridad moral y cristiana."
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-line bg-surface p-7 shadow-card">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft text-accent">
          <Sparkles size={20} />
        </span>
        <h2 className="mt-4 text-xl font-bold text-primary">Valores institucionales</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {valores.map((v) => (
            <span key={v} className="rounded-full bg-elevated px-4 py-1.5 text-sm font-medium text-secondary">
              {v}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
