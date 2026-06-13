import { useQuery } from '@tanstack/react-query';
import { Award, Medal, Trophy } from 'lucide-react';
import { api } from '../../lib/api';
import { Spinner, EmptyState } from '../../components/ui';

interface EntradaHonor {
  id: string;
  posicion: number;
  promedioGeneral: string;
  periodoEvaluacion: { nombre: string };
  alumno: {
    persona: { primerNombre: string; primerApellido: string };
    inscripciones: { seccion: { nombre: string; grado: { nombre: string } } }[];
  };
}

const iconos = [Trophy, Medal, Award];

export function CuadroHonor() {
  const { data, isLoading } = useQuery({
    queryKey: ['cuadro-honor-publico'],
    queryFn: async () => (await api<EntradaHonor[]>('/api/calendario/publico/cuadro-honor')).data,
    retry: 1,
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <span className="text-xs font-semibold uppercase tracking-widest text-accent">Reconocimiento al mérito</span>
      <h1 className="mt-2 text-3xl font-extrabold text-primary lg:text-4xl">Cuadro de Honor</h1>
      <p className="mt-4 text-secondary">
        Felicitamos a los estudiantes que se han destacado por su excelencia académica en el periodo actual.
      </p>

      {isLoading && <Spinner />}
      {!isLoading && (!data || data.length === 0) && (
        <EmptyState mensaje="El cuadro de honor del periodo se publicará próximamente." />
      )}

      <div className="mt-10 space-y-3">
        {(data ?? []).map((e, i) => {
          const Icono = iconos[Math.min(e.posicion - 1, 2)] ?? Award;
          const seccion = e.alumno.inscripciones[0]?.seccion;
          return (
            <div
              key={e.id}
              className={`flex items-center gap-4 rounded-xl border p-5 shadow-card ${
                e.posicion === 1 ? 'border-accent bg-accent-soft' : 'border-line bg-surface'
              }`}
            >
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                  e.posicion === 1 ? 'bg-accent text-white' : 'bg-elevated text-accent'
                }`}
              >
                <Icono size={20} />
              </span>
              <div className="flex-1">
                <p className="font-semibold text-primary">
                  {e.alumno.persona.primerNombre} {e.alumno.persona.primerApellido}
                </p>
                <p className="text-xs text-secondary">
                  {seccion ? `${seccion.grado.nombre} "${seccion.nombre}"` : ''} — {e.periodoEvaluacion.nombre}
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono text-2xl font-bold text-primary">{Number(e.promedioGeneral).toFixed(1)}</p>
                <p className="text-[10px] uppercase tracking-wider text-secondary">Promedio</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
