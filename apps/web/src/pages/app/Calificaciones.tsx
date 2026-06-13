import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, ClipboardCheck, Plus, Save } from 'lucide-react';
import { api, ApiError } from '../../lib/api';
import { Badge, Button, Card, CardHeader, EmptyState, Spinner, Table } from '../../components/ui';
import { Field, Modal, SelectInput, TextArea, TextInput } from '../../components/forms';
import { toast } from '../../components/toast';
import { useAuthStore } from '../../store/auth';
import { formatearFecha } from '../../lib/format';

interface Asignacion {
  id: string;
  materia: { nombre: string; colorHex: string | null };
  seccion: { nombre: string; turno: string; grado: { id: string; nombre: string } };
}

interface Periodo {
  id: string;
  nombre: string;
  numeroPeriodo: number;
  fechaInicio: string;
  fechaFin: string;
}

interface Actividad {
  id: string;
  titulo: string;
  tipo: string;
  porcentajePeso: string;
  notaMaxima: string;
  fechaEntrega: string | null;
  _count?: { notas: number };
}

interface NotaFila {
  id: string;
  notaObtenida: string | null;
  estado: string;
  comentario: string | null;
  alumno: { id: string; persona: { primerNombre: string; primerApellido: string; segundoApellido: string | null } };
}

const actividadZ = z.object({
  titulo: z.string().min(1, 'Requerido'),
  descripcion: z.string().optional(),
  tipo: z.enum(['EXAMEN', 'TAREA', 'PROYECTO', 'QUIZ', 'PARTICIPACION', 'OTRO']),
  porcentajePeso: z.coerce.number().gt(0, 'Mayor a 0').max(100, 'Máximo 100'),
  notaMaxima: z.coerce.number().gt(0).max(100),
  fechaEntrega: z.string().optional(),
});

function NuevaActividadModal({
  abierto,
  onCerrar,
  seccionMateriaId,
  periodoEvaluacionId,
  pesoDisponible,
}: {
  abierto: boolean;
  onCerrar: () => void;
  seccionMateriaId: string;
  periodoEvaluacionId: string;
  pesoDisponible: number;
}) {
  const qc = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<z.infer<typeof actividadZ>>({
    resolver: zodResolver(actividadZ),
    defaultValues: { tipo: 'TAREA', notaMaxima: 10 },
  });

  const crear = useMutation({
    mutationFn: (f: z.infer<typeof actividadZ>) =>
      api('/api/calificaciones/actividades', {
        method: 'POST',
        body: JSON.stringify({
          ...f,
          descripcion: f.descripcion || undefined,
          fechaEntrega: f.fechaEntrega || undefined,
          seccionMateriaId,
          periodoEvaluacionId,
        }),
      }),
    onSuccess: () => {
      toast.ok('Actividad creada; notas PENDIENTE generadas para todos los alumnos');
      qc.invalidateQueries({ queryKey: ['actividades'] });
      reset();
      onCerrar();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'No se pudo crear la actividad'),
  });

  return (
    <Modal abierto={abierto} titulo="Nueva actividad evaluada" onCerrar={onCerrar}>
      <form onSubmit={handleSubmit((d) => crear.mutate(d))} className="space-y-4">
        <p className="rounded-md bg-accent-soft px-3 py-2 text-xs text-accent">
          Peso disponible en este periodo: <strong>{pesoDisponible}%</strong>
        </p>
        <Field label="Título" error={errors.titulo?.message}>
          <TextInput {...register('titulo')} placeholder="Examen de unidad 2" />
        </Field>
        <Field label="Descripción">
          <TextArea {...register('descripcion')} placeholder="Detalle de la actividad…" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Tipo">
            <SelectInput {...register('tipo')}>
              <option value="EXAMEN">Examen</option>
              <option value="TAREA">Tarea</option>
              <option value="PROYECTO">Proyecto</option>
              <option value="QUIZ">Quiz</option>
              <option value="PARTICIPACION">Participación</option>
              <option value="OTRO">Otro</option>
            </SelectInput>
          </Field>
          <Field label="Peso (%)" error={errors.porcentajePeso?.message}>
            <TextInput type="number" step="0.5" {...register('porcentajePeso')} placeholder="20" />
          </Field>
          <Field label="Nota máxima" error={errors.notaMaxima?.message}>
            <TextInput type="number" step="0.5" {...register('notaMaxima')} />
          </Field>
        </div>
        <Field label="Fecha de entrega">
          <TextInput type="date" {...register('fechaEntrega')} />
        </Field>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onCerrar}>Cancelar</Button>
          <Button type="submit" disabled={crear.isPending}>{crear.isPending ? 'Creando…' : 'Crear actividad'}</Button>
        </div>
      </form>
    </Modal>
  );
}

function TablaNotas({ actividad, onVolver }: { actividad: Actividad; onVolver: () => void }) {
  const qc = useQueryClient();
  const [notas, setNotas] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['notas-actividad', actividad.id],
    queryFn: async () => (await api<NotaFila[]>(`/api/calificaciones/actividades/${actividad.id}/notas`)).data,
  });

  const calificar = useMutation({
    mutationFn: ({ alumnoId, nota }: { alumnoId: string; nota: number }) =>
      api(`/api/calificaciones/actividades/${actividad.id}/calificar`, {
        method: 'POST',
        body: JSON.stringify({ alumnoId, nota }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notas-actividad', actividad.id] });
      qc.invalidateQueries({ queryKey: ['actividades'] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'No se pudo guardar la nota'),
  });

  const guardarFila = (fila: NotaFila) => {
    const valor = notas[fila.alumno.id];
    if (valor === undefined || valor === '') return;
    const nota = Number(valor);
    if (Number.isNaN(nota) || nota < 0 || nota > Number(actividad.notaMaxima)) {
      toast.error(`La nota debe estar entre 0 y ${actividad.notaMaxima}`);
      return;
    }
    calificar.mutate(
      { alumnoId: fila.alumno.id, nota },
      { onSuccess: () => toast.ok(`Nota guardada: ${fila.alumno.persona.primerNombre} → ${nota}`) }
    );
  };

  return (
    <Card>
      <CardHeader
        title={actividad.titulo}
        subtitle={`Peso ${Number(actividad.porcentajePeso)}% · Nota máxima ${Number(actividad.notaMaxima)}`}
        action={
          <Button variant="ghost" onClick={onVolver}>
            <ArrowLeft size={15} /> Actividades
          </Button>
        }
      />
      <div className="px-5 pb-5">
        {isLoading ? (
          <Spinner />
        ) : !data || data.length === 0 ? (
          <EmptyState mensaje="No hay alumnos inscritos en esta sección" />
        ) : (
          <Table headers={['Alumno', 'Estado', 'Nota actual', 'Nueva nota', '']}>
            {data.map((fila) => (
              <tr key={fila.id} className="odd:bg-surface even:bg-elevated/50">
                <td className="px-4 py-3 text-sm font-medium text-primary">
                  {fila.alumno.persona.primerApellido} {fila.alumno.persona.segundoApellido ?? ''},{' '}
                  {fila.alumno.persona.primerNombre}
                </td>
                <td className="px-4 py-3">
                  <Badge tone={fila.estado === 'CALIFICADO' ? 'success' : fila.estado === 'PENDIENTE' ? 'warning' : 'neutral'}>
                    {fila.estado}
                  </Badge>
                </td>
                <td className="px-4 py-3 font-mono text-sm text-primary">
                  {fila.notaObtenida !== null ? Number(fila.notaObtenida).toFixed(1) : '—'}
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    step="0.1"
                    min={0}
                    max={Number(actividad.notaMaxima)}
                    value={notas[fila.alumno.id] ?? ''}
                    onChange={(e) => setNotas((n) => ({ ...n, [fila.alumno.id]: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && guardarFila(fila)}
                    placeholder={fila.notaObtenida !== null ? Number(fila.notaObtenida).toFixed(1) : '0.0'}
                    className="w-24 rounded-md border border-line bg-elevated px-3 py-1.5 font-mono text-sm text-primary outline-none focus:border-accent"
                  />
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => guardarFila(fila)}
                    disabled={!notas[fila.alumno.id]}
                    title="Guardar nota"
                    className="rounded-md border border-line p-1.5 text-secondary transition-colors hover:text-success disabled:opacity-30"
                  >
                    <Save size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </div>
    </Card>
  );
}

export function Calificaciones() {
  const { usuario } = useAuthStore();
  const [asignacionId, setAsignacionId] = useState('');
  const [periodoId, setPeriodoId] = useState('');
  const [actividadActiva, setActividadActiva] = useState<Actividad | null>(null);
  const [modalActividad, setModalActividad] = useState(false);

  // El maestro ve sus asignaciones; admin/director ven todas
  const esMaestro = usuario?.rol === 'MAESTRO';
  const { data: asignaciones, isLoading } = useQuery({
    queryKey: ['asignaciones-calificar', esMaestro],
    queryFn: async () => {
      if (esMaestro) {
        const res = await api<{ asignaciones: Asignacion[] }>('/api/reportes/dashboard/maestro');
        return res.data.asignaciones;
      }
      return (await api<Asignacion[]>('/api/academico/asignaciones')).data;
    },
  });

  const asignacion = asignaciones?.find((a) => a.id === asignacionId);

  const { data: periodos } = useQuery({
    queryKey: ['periodos', asignacion?.seccion.grado.id],
    enabled: Boolean(asignacion),
    queryFn: async () =>
      (await api<Periodo[]>(`/api/calificaciones/periodos?gradoId=${asignacion!.seccion.grado.id}`)).data,
  });

  const { data: actividades } = useQuery({
    queryKey: ['actividades', asignacionId, periodoId],
    enabled: Boolean(asignacionId && periodoId),
    queryFn: async () =>
      (
        await api<Actividad[]>(
          `/api/calificaciones/actividades?seccionMateriaId=${asignacionId}&periodoEvaluacionId=${periodoId}`
        )
      ).data,
  });

  const pesoUsado = useMemo(
    () => (actividades ?? []).reduce((s, a) => s + Number(a.porcentajePeso), 0),
    [actividades]
  );

  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Calificaciones</h1>
        <p className="text-sm text-secondary">Actividades evaluadas y registro de notas</p>
      </div>

      <Card>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Materia y sección">
            <SelectInput
              value={asignacionId}
              onChange={(e) => {
                setAsignacionId(e.target.value);
                setPeriodoId('');
                setActividadActiva(null);
              }}
            >
              <option value="">Seleccionar…</option>
              {(asignaciones ?? []).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.materia.nombre} — {a.seccion.grado.nombre} "{a.seccion.nombre}"
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Periodo de evaluación">
            <SelectInput
              value={periodoId}
              onChange={(e) => {
                setPeriodoId(e.target.value);
                setActividadActiva(null);
              }}
              disabled={!asignacionId}
            >
              <option value="">Seleccionar…</option>
              {(periodos ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} ({formatearFecha(p.fechaInicio)} — {formatearFecha(p.fechaFin)})
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>
      </Card>

      {actividadActiva ? (
        <TablaNotas actividad={actividadActiva} onVolver={() => setActividadActiva(null)} />
      ) : (
        asignacionId &&
        periodoId && (
          <Card>
            <CardHeader
              title="Actividades del periodo"
              subtitle={`Peso asignado: ${pesoUsado}% de 100%`}
              action={
                <Button onClick={() => setModalActividad(true)} disabled={pesoUsado >= 100}>
                  <Plus size={15} /> Nueva actividad
                </Button>
              }
            />
            <div className="px-5 pb-5">
              {!actividades || actividades.length === 0 ? (
                <EmptyState mensaje="No hay actividades en este periodo. Cree la primera." />
              ) : (
                <Table headers={['Actividad', 'Tipo', 'Peso', 'Nota máx.', 'Entrega', 'Pendientes', '']}>
                  {actividades.map((a) => (
                    <tr key={a.id} className="odd:bg-surface even:bg-elevated/50">
                      <td className="px-4 py-3 text-sm font-medium text-primary">{a.titulo}</td>
                      <td className="px-4 py-3">
                        <Badge tone="accent">{a.tipo}</Badge>
                      </td>
                      <td className="px-4 py-3 font-mono text-sm text-secondary">{Number(a.porcentajePeso)}%</td>
                      <td className="px-4 py-3 font-mono text-sm text-secondary">{Number(a.notaMaxima)}</td>
                      <td className="px-4 py-3 font-mono text-xs text-secondary">
                        {a.fechaEntrega ? formatearFecha(a.fechaEntrega) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {a._count && a._count.notas > 0 ? (
                          <Badge tone="warning">{a._count.notas} sin calificar</Badge>
                        ) : (
                          <Badge tone="success">Al día</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Button variant="ghost" onClick={() => setActividadActiva(a)}>
                          <ClipboardCheck size={14} /> Calificar
                        </Button>
                      </td>
                    </tr>
                  ))}
                </Table>
              )}
            </div>
          </Card>
        )
      )}

      <NuevaActividadModal
        abierto={modalActividad}
        onCerrar={() => setModalActividad(false)}
        seccionMateriaId={asignacionId}
        periodoEvaluacionId={periodoId}
        pesoDisponible={Math.max(0, 100 - pesoUsado)}
      />
    </div>
  );
}
