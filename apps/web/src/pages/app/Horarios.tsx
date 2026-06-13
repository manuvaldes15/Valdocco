import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DoorOpen, Plus, Trash2 } from 'lucide-react';
import { api, ApiError } from '../../lib/api';
import { Badge, Button, Card, CardHeader, EmptyState, Spinner } from '../../components/ui';
import { Field, Modal, SelectInput, TextInput } from '../../components/forms';
import { toast } from '../../components/toast';
import { useAnioActivo, useSecciones, etiquetaSeccion, useMaestros } from '../../lib/hooks';
import { useAuthStore } from '../../store/auth';

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

interface Aula {
  id: string;
  nombre: string;
  capacidad: number | null;
  edificio: string | null;
}

interface HorarioClase {
  id: string;
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
  aula: { nombre: string };
  maestro: { persona: { primerNombre: string; primerApellido: string } };
  seccionMateria: {
    id: string;
    materia: { nombre: string; colorHex: string | null };
    seccion: { id: string; nombre: string; grado: { nombre: string } };
  };
}

interface AsignacionCat {
  id: string;
  maestroId?: string;
  maestro?: { id: string };
  materia: { nombre: string };
  seccion: { nombre: string; grado: { nombre: string } };
}

const horarioZ = z.object({
  seccionMateriaId: z.string().uuid('Seleccione la materia'),
  aulaId: z.string().uuid('Seleccione el aula'),
  diaSemana: z.coerce.number().int().min(1).max(5),
  horaInicio: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Formato HH:mm'),
  horaFin: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Formato HH:mm'),
});

const aulaZ = z.object({
  nombre: z.string().min(1, 'Requerido'),
  capacidad: z.coerce.number().int().min(1).max(100),
  edificio: z.string().optional(),
});

function horaCorta(iso: string): string {
  // El backend guarda TIME como 1970-01-01THH:mm:ssZ
  return new Date(iso).toISOString().slice(11, 16);
}

/** Minutos desde medianoche (UTC) de un TIME del backend. */
function minutosUTC(iso: string): number {
  const d = new Date(iso);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

const PX_POR_MIN = 1.05; // alto de la grilla por minuto

/** Grilla semanal tipo calendario: filas = horas, columnas = días. */
function GridSemanal({
  horarios,
  puedeEliminar,
  onEliminar,
}: {
  horarios: HorarioClase[];
  puedeEliminar: (h: HorarioClase) => boolean;
  onEliminar: (id: string) => void;
}) {
  // Rango horario dinámico, ajustado a las clases (con margen y mínimos sensatos).
  const inicios = horarios.map((h) => minutosUTC(h.horaInicio));
  const fines = horarios.map((h) => minutosUTC(h.horaFin));
  const desde = Math.floor(Math.min(7 * 60, ...(inicios.length ? inicios : [7 * 60])) / 60) * 60;
  const hasta = Math.ceil(Math.max(14 * 60, ...(fines.length ? fines : [14 * 60])) / 60) * 60;
  const totalMin = hasta - desde;
  const horas: number[] = [];
  for (let m = desde; m <= hasta; m += 60) horas.push(m);

  return (
    <Card>
      <div className="overflow-x-auto p-4">
        <div className="flex min-w-[680px]">
          {/* Columna de horas */}
          <div className="w-14 shrink-0">
            <div className="h-9" />
            <div className="relative" style={{ height: totalMin * PX_POR_MIN }}>
              {horas.map((m) => (
                <div
                  key={m}
                  className="absolute -translate-y-1/2 pr-2 text-right text-[11px] font-medium text-muted"
                  style={{ top: (m - desde) * PX_POR_MIN, right: 0 }}
                >
                  {String(Math.floor(m / 60)).padStart(2, '0')}:00
                </div>
              ))}
            </div>
          </div>

          {/* Columnas de días */}
          {DIAS.map((dia, idx) => {
            const delDia = horarios.filter((h) => h.diaSemana === idx + 1);
            return (
              <div key={dia} className="flex-1 border-l border-line-subtle">
                <div className="flex h-9 items-center justify-center text-xs font-bold uppercase tracking-widest text-secondary">
                  {dia}
                </div>
                <div className="relative" style={{ height: totalMin * PX_POR_MIN }}>
                  {/* Líneas de hora (espacios libres visibles) */}
                  {horas.map((m) => (
                    <div
                      key={m}
                      className="absolute inset-x-0 border-t border-line-subtle"
                      style={{ top: (m - desde) * PX_POR_MIN }}
                    />
                  ))}
                  {/* Bloques de clase */}
                  {delDia.map((h) => {
                    const top = (minutosUTC(h.horaInicio) - desde) * PX_POR_MIN;
                    const alto = (minutosUTC(h.horaFin) - minutosUTC(h.horaInicio)) * PX_POR_MIN;
                    const color = h.seccionMateria.materia.colorHex ?? 'var(--color-accent)';
                    return (
                      <div
                        key={h.id}
                        className="group absolute inset-x-1 overflow-hidden rounded-md border-l-[3px] px-2 py-1 text-white shadow-card"
                        style={{ top: top + 1, height: Math.max(alto - 2, 18), background: color, borderLeftColor: 'rgba(0,0,0,0.25)' }}
                        title={`${h.seccionMateria.materia.nombre} · ${h.seccionMateria.seccion.grado.nombre} "${h.seccionMateria.seccion.nombre}" · ${h.aula.nombre}`}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <p className="truncate text-[11px] font-bold leading-tight">{h.seccionMateria.materia.nombre}</p>
                          {puedeEliminar(h) && (
                            <button
                              onClick={() => onEliminar(h.id)}
                              title="Eliminar"
                              className="shrink-0 text-white/70 opacity-0 transition-opacity hover:text-white group-hover:opacity-100"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                        <p className="truncate text-[10px] leading-tight text-white/90">
                          {h.seccionMateria.seccion.grado.nombre} "{h.seccionMateria.seccion.nombre}"
                        </p>
                        {alto >= 44 && (
                          <p className="truncate text-[10px] leading-tight text-white/80">
                            {horaCorta(h.horaInicio)}–{horaCorta(h.horaFin)} · {h.aula.nombre}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

export function Horarios() {
  const { usuario } = useAuthStore();
  const puedeGestionar = usuario?.rol === 'ADMIN' || usuario?.rol === 'DIRECTOR';
  const esMaestro = usuario?.rol === 'MAESTRO';
  const puedeAgendar = puedeGestionar || esMaestro;
  const qc = useQueryClient();
  const { data: anio } = useAnioActivo();
  const { data: secciones } = useSecciones();
  const { data: maestros } = useMaestros();
  const [seccionId, setSeccionId] = useState('');
  const [modal, setModal] = useState<'horario' | 'aula' | null>(null);

  // Para un maestro, su propio maestroId (resuelto por su personaId) y sus asignaciones.
  const miMaestroId = esMaestro ? maestros?.find((m) => m.persona.id === usuario?.personaId)?.id : undefined;

  const { data: horarios, isLoading } = useQuery({
    // El maestro ve solo sus clases; la gestión filtra por sección.
    queryKey: ['horarios', esMaestro ? `maestro:${miMaestroId}` : `seccion:${seccionId}`],
    enabled: !esMaestro || Boolean(miMaestroId),
    queryFn: async () => {
      const params = esMaestro
        ? `?maestroId=${miMaestroId}`
        : seccionId
          ? `?seccionId=${seccionId}`
          : '';
      return (await api<HorarioClase[]>(`/api/horarios/clases${params}`)).data;
    },
  });

  const { data: aulas } = useQuery({
    queryKey: ['aulas'],
    queryFn: async () => (await api<Aula[]>('/api/horarios/aulas')).data,
  });

  const { data: asignaciones } = useQuery({
    queryKey: ['asignaciones'],
    queryFn: async () => (await api<(AsignacionCat & { maestroId: string })[]>('/api/academico/asignaciones')).data,
  });

  // El maestro solo agenda y elimina sus propias asignaciones.
  const asignacionesParaAgendar = esMaestro
    ? (asignaciones ?? []).filter((a) => a.maestroId === miMaestroId)
    : asignaciones ?? [];
  const misAsignacionIds = new Set(asignacionesParaAgendar.map((a) => a.id));

  const fHorario = useForm<z.infer<typeof horarioZ>>({
    resolver: zodResolver(horarioZ),
    defaultValues: { diaSemana: 1, horaInicio: '07:00', horaFin: '08:00' },
  });
  const fAula = useForm<z.infer<typeof aulaZ>>({ resolver: zodResolver(aulaZ), defaultValues: { capacidad: 35 } });

  const crearHorario = useMutation({
    mutationFn: (f: z.infer<typeof horarioZ>) => {
      const asignacion = (asignaciones ?? []).find((a) => a.id === f.seccionMateriaId);
      return api('/api/horarios/clases', {
        method: 'POST',
        body: JSON.stringify({ ...f, maestroId: asignacion?.maestroId, anioLectivoId: anio?.id }),
      });
    },
    onSuccess: () => {
      toast.ok('Horario creado sin conflictos');
      qc.invalidateQueries({ queryKey: ['horarios'] });
      setModal(null);
    },
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : 'No se pudo crear el horario'),
  });

  const crearAula = useMutation({
    mutationFn: (f: z.infer<typeof aulaZ>) =>
      api('/api/horarios/aulas', { method: 'POST', body: JSON.stringify({ ...f, edificio: f.edificio || undefined }) }),
    onSuccess: () => {
      toast.ok('Aula registrada');
      qc.invalidateQueries({ queryKey: ['aulas'] });
      setModal(null);
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'No se pudo registrar el aula'),
  });

  const eliminar = useMutation({
    mutationFn: (id: string) => api(`/api/horarios/clases/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.ok('Horario eliminado');
      qc.invalidateQueries({ queryKey: ['horarios'] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'No se pudo eliminar'),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">{esMaestro ? 'Mi horario de clases' : 'Horarios de clase'}</h1>
          <p className="text-sm text-secondary">
            {esMaestro
              ? 'Arme su horario con las materias y secciones que tiene asignadas'
              : 'Distribución semanal con detección automática de conflictos de maestro y aula'}
          </p>
        </div>
        {puedeAgendar && (
          <div className="flex gap-2">
            {puedeGestionar && (
              <Button variant="ghost" onClick={() => setModal('aula')}>
                <DoorOpen size={15} /> Nueva aula
              </Button>
            )}
            <Button onClick={() => setModal('horario')}>
              <Plus size={15} /> Nuevo horario
            </Button>
          </div>
        )}
      </div>

      {!esMaestro && (
        <Card>
          <div className="flex items-center gap-4 p-5">
            <Field label="Filtrar por sección">
              <SelectInput value={seccionId} onChange={(e) => setSeccionId(e.target.value)} className="w-72">
                <option value="">Todas las secciones</option>
                {(secciones ?? []).map((s) => (
                  <option key={s.id} value={s.id}>{etiquetaSeccion(s)}</option>
                ))}
              </SelectInput>
            </Field>
          </div>
        </Card>
      )}

      {isLoading ? (
        <Spinner />
      ) : esMaestro ? (
        // Vista del maestro: cuadrícula semanal (horas × días) con espacios ocupados y libres
        (horarios ?? []).length === 0 ? (
          <Card>
            <div className="px-5 py-10">
              <EmptyState mensaje="Aún no tiene clases en su horario. Use 'Nuevo horario' para agregarlas." />
            </div>
          </Card>
        ) : (
          <GridSemanal
            horarios={horarios ?? []}
            puedeEliminar={(h) => misAsignacionIds.has(h.seccionMateria.id)}
            onEliminar={(id) => eliminar.mutate(id)}
          />
        )
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {DIAS.map((dia, idx) => {
            const delDia = (horarios ?? []).filter((h) => h.diaSemana === idx + 1);
            return (
              <Card key={dia} className="min-h-[140px]">
                <p className="border-b border-line-subtle px-4 py-3 text-xs font-bold uppercase tracking-widest text-secondary">
                  {dia}
                </p>
                <div className="space-y-2 p-3">
                  {delDia.length === 0 && <p className="py-4 text-center text-xs text-muted">Sin clases</p>}
                  {delDia.map((h) => (
                    <div
                      key={h.id}
                      className="rounded-lg border-l-[3px] bg-elevated p-3"
                      style={{ borderLeftColor: h.seccionMateria.materia.colorHex ?? 'var(--color-accent)' }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-primary">{h.seccionMateria.materia.nombre}</p>
                        {puedeGestionar && (
                          <button
                            onClick={() => eliminar.mutate(h.id)}
                            title="Eliminar horario"
                            className="text-muted transition-colors hover:text-danger"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                      <p className="mt-0.5 font-mono text-xs text-accent">
                        {horaCorta(h.horaInicio)} — {horaCorta(h.horaFin)}
                      </p>
                      <p className="mt-1 text-xs text-secondary">
                        {h.seccionMateria.seccion.grado.nombre} "{h.seccionMateria.seccion.nombre}" · {h.aula.nombre}
                      </p>
                      <p className="text-xs text-muted">
                        {h.maestro.persona.primerNombre} {h.maestro.persona.primerApellido}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Card>
        <CardHeader title="Aulas" subtitle={`${aulas?.length ?? 0} registradas`} />
        <div className="flex flex-wrap gap-2 px-5 pb-5">
          {(aulas ?? []).map((a) => (
            <span key={a.id} className="flex items-center gap-2 rounded-full border border-line bg-elevated px-3.5 py-1.5 text-sm text-primary">
              <DoorOpen size={13} className="text-accent" />
              {a.nombre}
              {a.capacidad && <Badge tone="neutral">{a.capacidad}</Badge>}
            </span>
          ))}
          {(!aulas || aulas.length === 0) && <EmptyState mensaje="Sin aulas registradas" />}
        </div>
      </Card>

      {/* Modal nuevo horario */}
      <Modal abierto={modal === 'horario'} titulo="Nuevo horario de clase" onCerrar={() => setModal(null)}>
        <form onSubmit={fHorario.handleSubmit((d) => crearHorario.mutate(d))} className="space-y-4">
          <Field label="Materia y sección" error={fHorario.formState.errors.seccionMateriaId?.message}>
            <SelectInput {...fHorario.register('seccionMateriaId')}>
              <option value="">Seleccionar…</option>
              {asignacionesParaAgendar.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.materia.nombre} — {a.seccion.grado.nombre} "{a.seccion.nombre}"
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Aula" error={fHorario.formState.errors.aulaId?.message}>
            <SelectInput {...fHorario.register('aulaId')}>
              <option value="">Seleccionar…</option>
              {(aulas ?? []).map((a) => (
                <option key={a.id} value={a.id}>{a.nombre}{a.edificio ? ` — ${a.edificio}` : ''}</option>
              ))}
            </SelectInput>
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Día">
              <SelectInput {...fHorario.register('diaSemana')}>
                {DIAS.map((d, i) => (
                  <option key={d} value={i + 1}>{d}</option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Inicio" error={fHorario.formState.errors.horaInicio?.message}>
              <TextInput type="time" {...fHorario.register('horaInicio')} />
            </Field>
            <Field label="Fin" error={fHorario.formState.errors.horaFin?.message}>
              <TextInput type="time" {...fHorario.register('horaFin')} />
            </Field>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setModal(null)}>Cancelar</Button>
            <Button type="submit" disabled={crearHorario.isPending || !anio}>
              {crearHorario.isPending ? 'Validando conflictos…' : 'Crear horario'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal nueva aula */}
      <Modal abierto={modal === 'aula'} titulo="Registrar aula" onCerrar={() => setModal(null)}>
        <form onSubmit={fAula.handleSubmit((d) => crearAula.mutate(d))} className="space-y-4">
          <Field label="Nombre" error={fAula.formState.errors.nombre?.message}>
            <TextInput {...fAula.register('nombre')} placeholder="Aula 103" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Capacidad" error={fAula.formState.errors.capacidad?.message}>
              <TextInput type="number" {...fAula.register('capacidad')} />
            </Field>
            <Field label="Edificio">
              <TextInput {...fAula.register('edificio')} placeholder="Edificio Don Bosco" />
            </Field>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setModal(null)}>Cancelar</Button>
            <Button type="submit" disabled={crearAula.isPending}>Registrar aula</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
