import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CalendarPlus, ChevronLeft, ChevronRight, Megaphone, Repeat, Trash2 } from 'lucide-react';
import { api, ApiError } from '../../lib/api';
import { Badge, Button, Card, CardHeader, EmptyState } from '../../components/ui';
import { Field, Modal, SelectInput, TextArea, TextInput } from '../../components/forms';
import { toast } from '../../components/toast';
import { useAuthStore } from '../../store/auth';
import { formatearFechaLarga } from '../../lib/format';

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const DIAS_LARGOS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const COLOR_TIPO: Record<string, string> = {
  ACADEMICO: '#4f8ef7',
  INSTITUCIONAL: '#34d399',
  FERIADO: '#fbbf24',
  EVALUACION: '#f87171',
};

interface Evento {
  id: string;
  titulo: string;
  descripcion: string | null;
  fechaInicio: string;
  fechaFin: string;
  tipoEvento: string | null;
  publicoDestino: string | null;
}

interface Recurrente {
  id: string;
  nombre: string;
  descripcion: string | null;
  diaSemana: number; // 1=Lunes ... 7=Domingo
  horaInicio: string | null;
  horaFin: string | null;
  colorHex: string | null;
  publicoDestino: string | null;
}

const tonoTipo: Record<string, 'accent' | 'warning' | 'success' | 'danger'> = {
  ACADEMICO: 'accent',
  INSTITUCIONAL: 'success',
  FERIADO: 'warning',
  EVALUACION: 'danger',
};

function claveDia(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** 1=Lunes ... 7=Domingo a partir de un Date local. */
function diaSemanaIso(d: Date): number {
  return ((d.getDay() + 6) % 7) + 1;
}

function horaCorta(iso: string | null): string {
  return iso ? new Date(iso).toISOString().slice(11, 16) : '';
}

// ── Schemas ──
const eventoZ = z.object({
  titulo: z.string().min(1, 'Requerido'),
  descripcion: z.string().optional(),
  fechaInicio: z.string().min(1, 'Requerido'),
  fechaFin: z.string().min(1, 'Requerido'),
  tipoEvento: z.enum(['ACADEMICO', 'INSTITUCIONAL', 'FERIADO', 'EVALUACION']),
  publicoDestino: z.enum(['TODOS', 'MAESTROS', 'ALUMNOS', 'PADRES']),
});

const anuncioZ = z.object({
  titulo: z.string().min(1, 'Requerido'),
  contenido: z.string().min(10, 'Mínimo 10 caracteres'),
  publicoDestino: z.enum(['TODOS', 'MAESTROS', 'ALUMNOS', 'PADRES']),
  esDestacado: z.boolean(),
});

const recurrenteZ = z.object({
  nombre: z.string().min(1, 'Requerido'),
  descripcion: z.string().optional(),
  diaSemana: z.coerce.number().int().min(1).max(7),
  horaInicio: z.string().optional(),
  horaFin: z.string().optional(),
  colorHex: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color inválido'),
  publicoDestino: z.enum(['TODOS', 'MAESTROS', 'ALUMNOS', 'PADRES']),
});

export function Calendario() {
  const { usuario } = useAuthStore();
  const puedeGestionar = usuario?.rol === 'ADMIN' || usuario?.rol === 'DIRECTOR';
  const qc = useQueryClient();
  const hoy = new Date();
  const [mes, setMes] = useState(() => new Date(hoy.getFullYear(), hoy.getMonth(), 1));
  const [seleccionado, setSeleccionado] = useState<Date>(hoy);
  const [modal, setModal] = useState<'evento' | 'anuncio' | 'recurrente' | null>(null);

  // Rango visible del grid (6 semanas desde el lunes anterior al día 1)
  const inicioGrid = useMemo(() => {
    const d = new Date(mes);
    d.setDate(1 - (diaSemanaIso(d) - 1));
    return d;
  }, [mes]);

  const celdas = useMemo(() => {
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(inicioGrid);
      d.setDate(inicioGrid.getDate() + i);
      return d;
    });
  }, [inicioGrid]);

  const finGrid = celdas[celdas.length - 1];

  const { data: eventos } = useQuery({
    queryKey: ['eventos', claveDia(inicioGrid)],
    queryFn: async () => {
      const params = new URLSearchParams({ desde: claveDia(inicioGrid), hasta: claveDia(finGrid) });
      return (await api<Evento[]>(`/api/calendario/eventos?${params}`)).data;
    },
  });

  const { data: recurrentes } = useQuery({
    queryKey: ['recurrentes'],
    queryFn: async () => (await api<Recurrente[]>('/api/calendario/recurrentes')).data,
  });

  const eventosDelDia = (d: Date) => {
    const clave = claveDia(d);
    return (eventos ?? []).filter((e) => e.fechaInicio.slice(0, 10) <= clave && clave <= e.fechaFin.slice(0, 10));
  };
  const recurrentesDelDia = (d: Date) => (recurrentes ?? []).filter((r) => r.diaSemana === diaSemanaIso(d));

  // ── Formularios ──
  const hoyStr = claveDia(hoy);
  const fEvento = useForm<z.infer<typeof eventoZ>>({
    resolver: zodResolver(eventoZ),
    defaultValues: { tipoEvento: 'INSTITUCIONAL', publicoDestino: 'TODOS', fechaInicio: hoyStr, fechaFin: hoyStr },
  });
  const fAnuncio = useForm<z.infer<typeof anuncioZ>>({
    resolver: zodResolver(anuncioZ),
    defaultValues: { publicoDestino: 'TODOS', esDestacado: false },
  });
  const fRecurrente = useForm<z.infer<typeof recurrenteZ>>({
    resolver: zodResolver(recurrenteZ),
    defaultValues: { diaSemana: 4, colorHex: '#a78bfa', publicoDestino: 'TODOS' },
  });

  const crearEvento = useMutation({
    mutationFn: (f: z.infer<typeof eventoZ>) =>
      api('/api/calendario/eventos', { method: 'POST', body: JSON.stringify({ ...f, descripcion: f.descripcion || undefined }) }),
    onSuccess: () => {
      toast.ok('Evento creado');
      qc.invalidateQueries({ queryKey: ['eventos'] });
      fEvento.reset();
      setModal(null);
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'No se pudo crear el evento'),
  });

  const crearAnuncio = useMutation({
    mutationFn: (f: z.infer<typeof anuncioZ>) =>
      api('/api/calendario/anuncios', { method: 'POST', body: JSON.stringify(f) }),
    onSuccess: () => {
      toast.ok('Anuncio publicado');
      fAnuncio.reset();
      setModal(null);
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'No se pudo publicar'),
  });

  const crearRecurrente = useMutation({
    mutationFn: (f: z.infer<typeof recurrenteZ>) =>
      api('/api/calendario/recurrentes', {
        method: 'POST',
        body: JSON.stringify({
          ...f,
          descripcion: f.descripcion || undefined,
          horaInicio: f.horaInicio || undefined,
          horaFin: f.horaFin || undefined,
        }),
      }),
    onSuccess: () => {
      toast.ok('Actividad recurrente agregada al catálogo');
      qc.invalidateQueries({ queryKey: ['recurrentes'] });
      fRecurrente.reset();
      setModal(null);
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'No se pudo crear'),
  });

  const eliminarRecurrente = useMutation({
    mutationFn: (id: string) => api(`/api/calendario/recurrentes/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.ok('Actividad eliminada del catálogo');
      qc.invalidateQueries({ queryKey: ['recurrentes'] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'No se pudo eliminar'),
  });

  const nombreMes = mes.toLocaleDateString('es-SV', { month: 'long', year: 'numeric' });
  const detalleRecurrentes = recurrentesDelDia(seleccionado);
  const detalleEventos = eventosDelDia(seleccionado);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">Calendario institucional</h1>
          <p className="text-sm text-secondary">Eventos, celebraciones y actividades recurrentes del CECMA</p>
        </div>
        {puedeGestionar && (
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => setModal('recurrente')}>
              <Repeat size={15} /> Actividad recurrente
            </Button>
            <Button variant="ghost" onClick={() => setModal('anuncio')}>
              <Megaphone size={15} /> Publicar anuncio
            </Button>
            <Button onClick={() => setModal('evento')}>
              <CalendarPlus size={15} /> Nuevo evento
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {/* ── Grid mensual ── */}
        <Card className="xl:col-span-2">
          <div className="flex items-center justify-between px-5 pt-5">
            <h2 className="text-lg font-bold capitalize text-primary">{nombreMes}</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1))}
                className="rounded-md border border-line p-2 text-secondary transition-colors hover:bg-elevated"
                aria-label="Mes anterior"
              >
                <ChevronLeft size={15} />
              </button>
              <button
                onClick={() => {
                  setMes(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
                  setSeleccionado(hoy);
                }}
                className="rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-secondary transition-colors hover:bg-elevated"
              >
                Hoy
              </button>
              <button
                onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1))}
                className="rounded-md border border-line p-2 text-secondary transition-colors hover:bg-elevated"
                aria-label="Mes siguiente"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>

          <div className="p-5">
            <div className="grid grid-cols-7 gap-1">
              {DIAS_SEMANA.map((d) => (
                <div key={d} className="pb-2 text-center text-[10px] font-bold uppercase tracking-wider text-muted">
                  {d}
                </div>
              ))}
              {celdas.map((d) => {
                const esDelMes = d.getMonth() === mes.getMonth();
                const esHoy = claveDia(d) === claveDia(hoy);
                const esSeleccionado = claveDia(d) === claveDia(seleccionado);
                const puntos = [
                  ...eventosDelDia(d).map((e) => COLOR_TIPO[e.tipoEvento ?? ''] ?? '#4f8ef7'),
                  ...recurrentesDelDia(d).map((r) => r.colorHex ?? '#a78bfa'),
                ].slice(0, 4);
                return (
                  <button
                    key={claveDia(d)}
                    onClick={() => setSeleccionado(d)}
                    className={`flex h-14 flex-col items-center justify-start rounded-lg pt-1.5 transition-colors sm:h-16 ${
                      esSeleccionado ? 'bg-accent-soft ring-1 ring-accent' : 'hover:bg-elevated'
                    } ${esDelMes ? '' : 'opacity-35'}`}
                  >
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-sm ${
                        esHoy ? 'bg-accent font-bold text-white' : 'font-medium text-primary'
                      }`}
                    >
                      {d.getDate()}
                    </span>
                    <span className="mt-1 flex gap-1">
                      {puntos.map((color, i) => (
                        <span key={i} className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
                      ))}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </Card>

        {/* ── Panel de detalles del día ── */}
        <Card>
          <CardHeader
            title={DIAS_LARGOS[diaSemanaIso(seleccionado) - 1]}
            subtitle={formatearFechaLarga(seleccionado)}
          />
          <div className="space-y-3 px-5 pb-5">
            {detalleRecurrentes.length === 0 && detalleEventos.length === 0 && (
              <EmptyState mensaje="Sin actividades este día" />
            )}
            {detalleRecurrentes.map((r) => (
              <div
                key={r.id}
                className="rounded-lg border-l-[3px] bg-elevated p-3.5"
                style={{ borderLeftColor: r.colorHex ?? '#a78bfa' }}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-primary">{r.nombre}</p>
                  <Badge tone="neutral">
                    <Repeat size={10} className="mr-1" /> Semanal
                  </Badge>
                </div>
                {r.horaInicio && (
                  <p className="mt-0.5 font-mono text-xs text-accent">
                    {horaCorta(r.horaInicio)}
                    {r.horaFin ? ` — ${horaCorta(r.horaFin)}` : ''}
                  </p>
                )}
                {r.descripcion && <p className="mt-1 text-xs text-secondary">{r.descripcion}</p>}
              </div>
            ))}
            {detalleEventos.map((e) => (
              <div
                key={e.id}
                className="rounded-lg border-l-[3px] bg-elevated p-3.5"
                style={{ borderLeftColor: COLOR_TIPO[e.tipoEvento ?? ''] ?? '#4f8ef7' }}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-primary">{e.titulo}</p>
                  {e.tipoEvento && <Badge tone={tonoTipo[e.tipoEvento] ?? 'neutral'}>{e.tipoEvento}</Badge>}
                </div>
                {e.descripcion && <p className="mt-1 text-xs text-secondary">{e.descripcion}</p>}
                <p className="mt-1 text-xs text-muted">
                  {formatearFechaLarga(e.fechaInicio)}
                  {e.fechaFin.slice(0, 10) !== e.fechaInicio.slice(0, 10) ? ` — ${formatearFechaLarga(e.fechaFin)}` : ''}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Catálogo de actividades recurrentes ── */}
      <Card>
        <CardHeader
          title="Catálogo de actividades recurrentes"
          subtitle="Actividades fijas de cada semana — ej. Hora Santa los jueves, Oratorio Festivo los sábados"
          action={<Repeat size={16} className="text-secondary" />}
        />
        <div className="grid gap-3 px-5 pb-5 sm:grid-cols-2 lg:grid-cols-3">
          {(recurrentes ?? []).length === 0 && <EmptyState mensaje="El catálogo está vacío" />}
          {(recurrentes ?? []).map((r) => (
            <div
              key={r.id}
              className="flex items-start justify-between gap-2 rounded-lg border-l-[3px] bg-elevated p-3.5"
              style={{ borderLeftColor: r.colorHex ?? '#a78bfa' }}
            >
              <div>
                <p className="text-sm font-semibold text-primary">{r.nombre}</p>
                <p className="mt-0.5 text-xs text-accent">
                  Todos los {DIAS_LARGOS[r.diaSemana - 1].toLowerCase()}
                  {r.horaInicio ? ` · ${horaCorta(r.horaInicio)}${r.horaFin ? ` — ${horaCorta(r.horaFin)}` : ''}` : ''}
                </p>
                {r.descripcion && <p className="mt-1 text-xs text-secondary">{r.descripcion}</p>}
              </div>
              {puedeGestionar && (
                <button
                  onClick={() => eliminarRecurrente.mutate(r.id)}
                  title="Eliminar del catálogo"
                  className="text-muted transition-colors hover:text-danger"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* ── Modal actividad recurrente ── */}
      <Modal abierto={modal === 'recurrente'} titulo="Nueva actividad recurrente" onCerrar={() => setModal(null)}>
        <form onSubmit={fRecurrente.handleSubmit((d) => crearRecurrente.mutate(d))} className="space-y-4">
          <Field label="Nombre" error={fRecurrente.formState.errors.nombre?.message}>
            <TextInput {...fRecurrente.register('nombre')} placeholder="Hora Santa" />
          </Field>
          <Field label="Descripción">
            <TextArea {...fRecurrente.register('descripcion')} placeholder="Adoración al Santísimo en la capilla…" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Día de la semana">
              <SelectInput {...fRecurrente.register('diaSemana')}>
                {DIAS_LARGOS.map((d, i) => (
                  <option key={d} value={i + 1}>{d}</option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Color" error={fRecurrente.formState.errors.colorHex?.message}>
              <TextInput type="color" {...fRecurrente.register('colorHex')} className="h-10 cursor-pointer p-1" />
            </Field>
            <Field label="Hora inicio">
              <TextInput type="time" {...fRecurrente.register('horaInicio')} />
            </Field>
            <Field label="Hora fin">
              <TextInput type="time" {...fRecurrente.register('horaFin')} />
            </Field>
          </div>
          <Field label="Dirigido a">
            <SelectInput {...fRecurrente.register('publicoDestino')}>
              <option value="TODOS">Todos</option>
              <option value="MAESTROS">Maestros</option>
              <option value="ALUMNOS">Alumnos</option>
              <option value="PADRES">Padres</option>
            </SelectInput>
          </Field>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setModal(null)}>Cancelar</Button>
            <Button type="submit" disabled={crearRecurrente.isPending}>Agregar al catálogo</Button>
          </div>
        </form>
      </Modal>

      {/* ── Modal nuevo evento ── */}
      <Modal abierto={modal === 'evento'} titulo="Nuevo evento" onCerrar={() => setModal(null)}>
        <form onSubmit={fEvento.handleSubmit((d) => crearEvento.mutate(d))} className="space-y-4">
          <Field label="Título" error={fEvento.formState.errors.titulo?.message}>
            <TextInput {...fEvento.register('titulo')} placeholder="Fiesta de María Auxiliadora" />
          </Field>
          <Field label="Descripción">
            <TextArea {...fEvento.register('descripcion')} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Fecha inicio" error={fEvento.formState.errors.fechaInicio?.message}>
              <TextInput type="date" {...fEvento.register('fechaInicio')} />
            </Field>
            <Field label="Fecha fin" error={fEvento.formState.errors.fechaFin?.message}>
              <TextInput type="date" {...fEvento.register('fechaFin')} />
            </Field>
            <Field label="Tipo">
              <SelectInput {...fEvento.register('tipoEvento')}>
                <option value="ACADEMICO">Académico</option>
                <option value="INSTITUCIONAL">Institucional</option>
                <option value="FERIADO">Feriado</option>
                <option value="EVALUACION">Evaluación</option>
              </SelectInput>
            </Field>
            <Field label="Dirigido a">
              <SelectInput {...fEvento.register('publicoDestino')}>
                <option value="TODOS">Todos</option>
                <option value="MAESTROS">Maestros</option>
                <option value="ALUMNOS">Alumnos</option>
                <option value="PADRES">Padres</option>
              </SelectInput>
            </Field>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setModal(null)}>Cancelar</Button>
            <Button type="submit" disabled={crearEvento.isPending}>Crear evento</Button>
          </div>
        </form>
      </Modal>

      {/* ── Modal nuevo anuncio ── */}
      <Modal abierto={modal === 'anuncio'} titulo="Publicar anuncio" onCerrar={() => setModal(null)}>
        <form onSubmit={fAnuncio.handleSubmit((d) => crearAnuncio.mutate(d))} className="space-y-4">
          <Field label="Título" error={fAnuncio.formState.errors.titulo?.message}>
            <TextInput {...fAnuncio.register('titulo')} placeholder="Inicio del Oratorio Festivo" />
          </Field>
          <Field label="Contenido" error={fAnuncio.formState.errors.contenido?.message}>
            <TextArea {...fAnuncio.register('contenido')} rows={4} />
          </Field>
          <div className="grid items-end gap-4 sm:grid-cols-2">
            <Field label="Dirigido a">
              <SelectInput {...fAnuncio.register('publicoDestino')}>
                <option value="TODOS">Todos</option>
                <option value="MAESTROS">Maestros</option>
                <option value="ALUMNOS">Alumnos</option>
                <option value="PADRES">Padres</option>
              </SelectInput>
            </Field>
            <label className="flex items-center gap-2 pb-2.5 text-sm text-secondary">
              <input type="checkbox" {...fAnuncio.register('esDestacado')} className="accent-[var(--color-accent)]" />
              Anuncio destacado (visible en el sitio público)
            </label>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setModal(null)}>Cancelar</Button>
            <Button type="submit" disabled={crearAnuncio.isPending}>Publicar</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
