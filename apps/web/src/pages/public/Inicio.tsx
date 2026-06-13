import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Church, GraduationCap, HeartHandshake, Megaphone, Trophy, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { formatearFechaLarga } from '../../lib/format';

const cifras = [
  { valor: '809', label: 'Alumnos', icon: GraduationCap },
  { valor: '32', label: 'Docentes', icon: Users },
  { valor: '10', label: 'Religiosas HDS', icon: Church },
  { valor: '114', label: 'Años de historia', icon: BookOpen },
];

interface Anuncio {
  id: string;
  titulo: string;
  contenido: string;
  publicadoEn: string;
  esDestacado: boolean;
}

export function Inicio() {
  const { data: anuncios } = useQuery({
    queryKey: ['anuncios-publicos'],
    queryFn: async () => (await api<Anuncio[]>('/api/calendario/publico/anuncios')).data,
    staleTime: 60_000,
    retry: 1,
  });

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-20 lg:grid-cols-2 lg:py-28">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">
              <HeartHandshake size={14} />
              Institución Católica Salesiana — Chalchuapa
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight text-primary lg:text-5xl">
              Formando Buenos Cristianos y{' '}
              <span className="text-accent">Honrados Ciudadanos</span>
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-secondary">
              Desde 1912 acompañamos a la niñez y juventud de Chalchuapa con una formación integral basada en la
              razón, la religión y el amor, al estilo de Don Bosco y María Auxiliadora.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/oferta-educativa"
                className="inline-flex items-center gap-2 rounded-md bg-accent px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                Conoce nuestra oferta <ArrowRight size={16} />
              </Link>
              <Link
                to="/historia"
                className="inline-flex items-center gap-2 rounded-md border border-line px-5 py-3 text-sm font-semibold text-secondary transition-colors hover:bg-elevated hover:text-primary"
              >
                Nuestra historia
              </Link>
            </div>
          </div>
          {/* Tarjeta hero estilo dashboard */}
          <div className="rounded-xl border border-line bg-surface p-6 shadow-card">
            <p className="text-xs font-semibold uppercase tracking-widest text-secondary">Comunidad educativa 2026</p>
            <div className="mt-4 grid grid-cols-2 gap-4">
              {cifras.map((c) => (
                <div key={c.label} className="rounded-lg bg-elevated p-4">
                  <c.icon size={18} className="text-accent" />
                  <p className="mt-2 text-3xl font-bold text-primary">{c.valor}</p>
                  <p className="text-xs text-secondary">{c.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Anuncios */}
      <section className="border-t border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-2xl font-bold text-primary">
              <Megaphone size={22} className="text-accent" /> Noticias y actividades
            </h2>
            <Link to="/cuadro-honor" className="inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline">
              <Trophy size={15} /> Ver cuadro de honor
            </Link>
          </div>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {(anuncios ?? []).slice(0, 3).map((a) => (
              <article key={a.id} className="rounded-xl border border-line bg-base p-5">
                <p className="text-xs text-muted">{formatearFechaLarga(a.publicadoEn)}</p>
                <h3 className="mt-2 font-semibold text-primary">{a.titulo}</h3>
                <p className="mt-2 text-sm leading-relaxed text-secondary line-clamp-3">{a.contenido}</p>
              </article>
            ))}
            {(!anuncios || anuncios.length === 0) && (
              <p className="col-span-3 text-sm text-muted">
                Pronto publicaremos las actividades del año lectivo: fiesta de María Auxiliadora, Oratorio Festivo,
                actos de graduación y celebraciones litúrgicas.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
