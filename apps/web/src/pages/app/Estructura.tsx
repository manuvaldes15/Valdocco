import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { BookOpen, Layers, Plus, UserCheck } from 'lucide-react';
import { api, ApiError } from '../../lib/api';
import { Badge, Button, Card, CardHeader, EmptyState, Spinner, Table } from '../../components/ui';
import { Field, Modal, SelectInput, TextInput } from '../../components/forms';
import { toast } from '../../components/toast';
import { nombreMaestro, useAnioActivo, useMaestros, useMaterias, useSecciones, etiquetaSeccion } from '../../lib/hooks';
import { useAuthStore } from '../../store/auth';

interface Nivel {
  id: string;
  nombre: string;
  ciclos: {
    id: string;
    nombre: string;
    grados: {
      id: string;
      nombre: string;
      sistemaEvaluacion: string;
      secciones: { id: string; nombre: string; turno: string; capacidad: number }[];
    }[];
  }[];
}

interface AsignacionFila {
  id: string;
  horasSemanales: string | null;
  materia: { nombre: string; colorHex: string | null };
  seccion: { nombre: string; grado: { nombre: string } };
  maestro: { persona: { primerNombre: string; primerApellido: string } };
}

const seccionZ = z.object({
  gradoId: z.string().uuid('Seleccione un grado'),
  nombre: z.string().min(1, 'Requerido').max(10),
  turno: z.enum(['MANANA', 'TARDE']),
  capacidad: z.coerce.number().int().min(1).max(60),
});

const materiaZ = z.object({
  nombre: z.string().min(1, 'Requerido'),
  codigo: z.string().optional(),
  colorHex: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color inválido'),
});

const asignacionZ = z.object({
  seccionId: z.string().uuid('Seleccione una sección'),
  materiaId: z.string().uuid('Seleccione una materia'),
  maestroId: z.string().uuid('Seleccione un maestro'),
  horasSemanales: z.preprocess(
    (v) => (v === '' || v === undefined ? undefined : Number(v)),
    z.number().min(0.5).max(40).optional()
  ),
});

export function Estructura() {
  const { usuario } = useAuthStore();
  const puedeGestionar = usuario?.rol === 'ADMIN' || usuario?.rol === 'DIRECTOR';
  const qc = useQueryClient();
  const { data: anio } = useAnioActivo();
  const { data: secciones } = useSecciones();
  const { data: maestros } = useMaestros();
  const { data: materias } = useMaterias();
  const [modal, setModal] = useState<'seccion' | 'materia' | 'asignacion' | null>(null);

  const { data: estructura, isLoading } = useQuery({
    queryKey: ['estructura'],
    queryFn: async () => (await api<Nivel[]>('/api/academico/estructura')).data,
  });

  const { data: asignaciones } = useQuery({
    queryKey: ['asignaciones'],
    queryFn: async () => (await api<AsignacionFila[]>('/api/academico/asignaciones')).data,
  });

  const grados = (estructura ?? []).flatMap((n) => n.ciclos.flatMap((c) => c.grados));

  // ── Formularios ──
  const fSeccion = useForm<z.infer<typeof seccionZ>>({
    resolver: zodResolver(seccionZ),
    defaultValues: { turno: 'MANANA', capacidad: 35 },
  });
  const fMateria = useForm<z.infer<typeof materiaZ>>({
    resolver: zodResolver(materiaZ),
    defaultValues: { colorHex: '#4f8ef7' },
  });
  const fAsignacion = useForm<z.infer<typeof asignacionZ>>({ resolver: zodResolver(asignacionZ) });

  const invalidarYcerrar = (claves: string[], mensaje: string) => ({
    onSuccess: () => {
      toast.ok(mensaje);
      claves.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      setModal(null);
    },
    onError: (e: unknown) => toast.error(e instanceof ApiError ? e.message : 'Operación fallida'),
  });

  const crearSeccion = useMutation({
    mutationFn: (f: z.infer<typeof seccionZ>) =>
      api('/api/academico/secciones', { method: 'POST', body: JSON.stringify(f) }),
    ...invalidarYcerrar(['estructura', 'secciones'], 'Sección creada'),
  });

  const crearMateria = useMutation({
    mutationFn: (f: z.infer<typeof materiaZ>) =>
      api('/api/academico/materias', { method: 'POST', body: JSON.stringify({ ...f, codigo: f.codigo || undefined }) }),
    ...invalidarYcerrar(['materias'], 'Materia creada'),
  });

  const crearAsignacion = useMutation({
    mutationFn: (f: z.infer<typeof asignacionZ>) =>
      api('/api/academico/asignaciones', {
        method: 'POST',
        body: JSON.stringify({ ...f, anioLectivoId: anio?.id }),
      }),
    ...invalidarYcerrar(['asignaciones'], 'Materia asignada al maestro'),
  });

  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">Estructura académica</h1>
          <p className="text-sm text-secondary">Niveles, grados, secciones y asignación docente — Año {anio?.nombre}</p>
        </div>
        {puedeGestionar && (
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => setModal('materia')}>
              <BookOpen size={15} /> Nueva materia
            </Button>
            <Button variant="ghost" onClick={() => setModal('seccion')}>
              <Layers size={15} /> Nueva sección
            </Button>
            <Button onClick={() => setModal('asignacion')}>
              <UserCheck size={15} /> Asignar materia
            </Button>
          </div>
        )}
      </div>

      {/* Árbol de estructura */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Niveles y secciones" />
          <div className="space-y-5 px-5 pb-5">
            {(estructura ?? []).map((nivel) => (
              <div key={nivel.id}>
                <p className="text-xs font-bold uppercase tracking-widest text-accent">{nivel.nombre}</p>
                <div className="mt-2 space-y-2">
                  {nivel.ciclos.flatMap((c) => c.grados).map((g) => (
                    <div key={g.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-elevated px-3.5 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-primary">{g.nombre}</span>
                        <Badge tone="neutral">{g.sistemaEvaluacion === 'TRIMESTRAL' ? '3 trimestres' : '4 periodos'}</Badge>
                      </div>
                      <div className="flex gap-1.5">
                        {g.secciones.length === 0 ? (
                          <span className="text-xs text-muted">Sin secciones</span>
                        ) : (
                          g.secciones.map((s) => (
                            <span
                              key={s.id}
                              title={`Turno ${s.turno === 'MANANA' ? 'mañana' : 'tarde'} · capacidad ${s.capacidad}`}
                              className="flex h-7 w-7 items-center justify-center rounded-md bg-accent-soft font-mono text-xs font-bold text-accent"
                            >
                              {s.nombre}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Materias" subtitle={`${materias?.length ?? 0} en el catálogo`} />
          <div className="flex flex-wrap gap-2 px-5 pb-5">
            {(materias ?? []).map((m) => (
              <span
                key={m.id}
                className="flex items-center gap-2 rounded-full border border-line bg-elevated px-3.5 py-1.5 text-sm text-primary"
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: m.colorHex ?? 'var(--color-accent)' }} />
                {m.nombre}
                {m.codigo && <span className="font-mono text-xs text-muted">{m.codigo}</span>}
              </span>
            ))}
            {(!materias || materias.length === 0) && <EmptyState mensaje="Sin materias registradas" />}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Asignación docente" subtitle="Materia → sección → maestro (año activo)" />
        <div className="px-5 pb-5">
          {!asignaciones || asignaciones.length === 0 ? (
            <EmptyState mensaje="No hay asignaciones registradas" />
          ) : (
            <Table headers={['Materia', 'Sección', 'Maestro', 'Horas/semana']}>
              {asignaciones.map((a) => (
                <tr key={a.id} className="odd:bg-surface even:bg-elevated/50">
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2 text-sm font-medium text-primary">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: a.materia.colorHex ?? 'var(--color-accent)' }} />
                      {a.materia.nombre}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-secondary">
                    {a.seccion.grado.nombre} "{a.seccion.nombre}"
                  </td>
                  <td className="px-4 py-3 text-sm text-secondary">
                    {a.maestro.persona.primerNombre} {a.maestro.persona.primerApellido}
                  </td>
                  <td className="px-4 py-3 font-mono text-sm text-secondary">{a.horasSemanales ? Number(a.horasSemanales) : '—'}</td>
                </tr>
              ))}
            </Table>
          )}
        </div>
      </Card>

      {/* Modales */}
      <Modal abierto={modal === 'seccion'} titulo="Nueva sección" onCerrar={() => setModal(null)}>
        <form onSubmit={fSeccion.handleSubmit((d) => crearSeccion.mutate(d))} className="space-y-4">
          <Field label="Grado" error={fSeccion.formState.errors.gradoId?.message}>
            <SelectInput {...fSeccion.register('gradoId')}>
              <option value="">Seleccionar…</option>
              {grados.map((g) => (
                <option key={g.id} value={g.id}>{g.nombre}</option>
              ))}
            </SelectInput>
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Nombre" error={fSeccion.formState.errors.nombre?.message}>
              <TextInput {...fSeccion.register('nombre')} placeholder="A" />
            </Field>
            <Field label="Turno">
              <SelectInput {...fSeccion.register('turno')}>
                <option value="MANANA">Mañana</option>
                <option value="TARDE">Tarde</option>
              </SelectInput>
            </Field>
            <Field label="Capacidad" error={fSeccion.formState.errors.capacidad?.message}>
              <TextInput type="number" {...fSeccion.register('capacidad')} />
            </Field>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setModal(null)}>Cancelar</Button>
            <Button type="submit" disabled={crearSeccion.isPending}>Crear sección</Button>
          </div>
        </form>
      </Modal>

      <Modal abierto={modal === 'materia'} titulo="Nueva materia" onCerrar={() => setModal(null)}>
        <form onSubmit={fMateria.handleSubmit((d) => crearMateria.mutate(d))} className="space-y-4">
          <Field label="Nombre" error={fMateria.formState.errors.nombre?.message}>
            <TextInput {...fMateria.register('nombre')} placeholder="Educación Artística" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Código">
              <TextInput {...fMateria.register('codigo')} placeholder="ART" />
            </Field>
            <Field label="Color" error={fMateria.formState.errors.colorHex?.message}>
              <TextInput type="color" {...fMateria.register('colorHex')} className="h-10 cursor-pointer p-1" />
            </Field>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setModal(null)}>Cancelar</Button>
            <Button type="submit" disabled={crearMateria.isPending}>Crear materia</Button>
          </div>
        </form>
      </Modal>

      <Modal abierto={modal === 'asignacion'} titulo="Asignar materia a sección" onCerrar={() => setModal(null)}>
        <form onSubmit={fAsignacion.handleSubmit((d) => crearAsignacion.mutate(d))} className="space-y-4">
          <Field label="Sección" error={fAsignacion.formState.errors.seccionId?.message}>
            <SelectInput {...fAsignacion.register('seccionId')}>
              <option value="">Seleccionar…</option>
              {(secciones ?? []).map((s) => (
                <option key={s.id} value={s.id}>{etiquetaSeccion(s)}</option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Materia" error={fAsignacion.formState.errors.materiaId?.message}>
            <SelectInput {...fAsignacion.register('materiaId')}>
              <option value="">Seleccionar…</option>
              {(materias ?? []).map((m) => (
                <option key={m.id} value={m.id}>{m.nombre}</option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Maestro" error={fAsignacion.formState.errors.maestroId?.message}>
            <SelectInput {...fAsignacion.register('maestroId')}>
              <option value="">Seleccionar…</option>
              {(maestros ?? []).map((m) => (
                <option key={m.id} value={m.id}>
                  {nombreMaestro(m)} {m.especializacion ? `— ${m.especializacion}` : ''}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Horas semanales">
            <TextInput type="number" step="0.5" {...fAsignacion.register('horasSemanales')} placeholder="5" />
          </Field>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setModal(null)}>Cancelar</Button>
            <Button type="submit" disabled={crearAsignacion.isPending || !anio}>Asignar</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
