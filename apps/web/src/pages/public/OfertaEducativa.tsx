import { Baby, BookOpen, FlaskConical, GraduationCap } from 'lucide-react';

const niveles = [
  {
    icon: Baby,
    nombre: 'Parvularia',
    rango: '4, 5 y 6 años',
    descripcion:
      'Primeros pasos en un ambiente seguro y alegre, desarrollando habilidades sociales, motoras y espirituales con el sistema preventivo salesiano.',
  },
  {
    icon: BookOpen,
    nombre: 'Educación Primaria',
    rango: '1er a 6to Grado',
    descripcion:
      'Formación académica sólida en lenguaje, matemática, ciencias y educación en la fe, con evaluación trimestral y acompañamiento cercano.',
  },
  {
    icon: FlaskConical,
    nombre: 'Tercer Ciclo',
    rango: '7mo a 9no Grado',
    descripcion:
      'Profundización académica con evaluación por periodos, laboratorio de cómputo, actividades deportivas, culturales y oratorio festivo.',
  },
  {
    icon: GraduationCap,
    nombre: 'Bachillerato General',
    rango: '1er y 2do Año',
    descripcion:
      'Desde el año 2000 preparamos bachilleres competentes para la universidad y el mundo laboral, con integridad moral y cristiana.',
  },
];

export function OfertaEducativa() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <h1 className="text-3xl font-extrabold text-primary lg:text-4xl">Oferta educativa</h1>
      <p className="mt-4 max-w-2xl text-secondary">
        Acompañamos a nuestros estudiantes desde sus primeros años hasta su graduación como bachilleres, en turnos de
        mañana y tarde.
      </p>
      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {niveles.map((n) => (
          <div key={n.nombre} className="rounded-xl border border-line bg-surface p-7 shadow-card transition-transform hover:-translate-y-1">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent-soft text-accent">
              <n.icon size={22} />
            </span>
            <h2 className="mt-4 text-lg font-bold text-primary">{n.nombre}</h2>
            <p className="text-xs font-semibold uppercase tracking-wider text-accent">{n.rango}</p>
            <p className="mt-3 text-sm leading-relaxed text-secondary">{n.descripcion}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
