import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeftRight, Plus, UserMinus } from 'lucide-react';
import { api, ApiError } from '../../lib/api';
import { Badge, Button, Card, CardHeader, EmptyState, Spinner, Table } from '../../components/ui';
import { Field, Modal, SelectInput, TextArea, TextInput } from '../../components/forms';
import { toast } from '../../components/toast';
import { etiquetaSeccion, nombreMaestro, useAnioActivo, useMaestros, useSecciones } from '../../lib/hooks';
import { formatearFecha } from '../../lib/format';
import { useAuthStore } from '../../store/auth';

interface Inscripcion {
  id: string;
  estado: string;
  fechaInscripcion: string;
  alumno: { id: string; codigoAlumno: string | null; persona: { primerNombre: string; primerApellido: string } };
  seccion: { id: string; nombre: string; turno: string; grado: { nombre: string } };
  anioLectivo: { nombre: string };
  maestroGuia: { persona: { primerNombre: string; primerApellido: string } };
}

interface AlumnoMin {
  id: string;
  codigoAlumno: string | null;
  persona: { primerNombre: string; primerApellido: string; segundoApellido: string | null };
  inscripciones: { estado: string }[];
}

const matriculaZ = z.object({
  alumnoId: z.string().uuid('Seleccione un alumno'),
  seccionId: z.string().uuid('Seleccione una sección'),
  // Opcional: si matricula un MAESTRO, él mismo queda como guía (lo asigna el backend).
  maestroGuiaId: z.string().uuid('Seleccione el maestro guía').optional(),
  fechaInscripcion: z.string().min(1, 'Requerido'),
});

function MatricularModal({ abierto, onCerrar, esMaestro }: { abierto: boolean; onCerrar: () => void; esMaestro: boolean }) {
  const qc = useQueryClient();
  const { data: anio } = useAnioActivo();
  const { data: secciones } = useSecciones();
  const { data: maestros } = useMaestros();
  const { data: alumnos } = useQuery({
    queryKey: ['alumnos-cat'],
    enabled: abierto,
    queryFn: async () => (await api<AlumnoMin[]>('/api/personas/alumnos?limit=100')).data,
  });

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<z.infer<typeof matriculaZ>>({
    resolver: zodResolver(matriculaZ),
    defaultValues: { fechaInscripcion: new Date().toISOString().slice(0, 10) },
  });

  const matricular = useMutation({
    mutationFn: (form: z.infer<typeof matriculaZ>) => {
      // El maestro no envía guía: el backend lo asigna como guía de la sección.
      const { maestroGuiaId, ...resto } = form;
      const payload = esMaestro ? resto : form;
      return api('/api/inscripciones', {
        method: 'POST',
        body: JSON.stringify({ ...payload, anioLectivoId: anio?.id }),
      });
    },
    onSuccess: () => {
      toast.ok('Alumno matriculado correctamente');
      qc.invalidateQueries({ queryKey: ['inscripciones'] });
      qc.invalidateQueries({ queryKey: ['alumnos'] });
      reset();
      onCerrar();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'No se pudo matricular'),
  });

  // Solo alumnos sin inscripción activa
  const candidatos = (alumnos ?? []).filter((a) => !a.inscripciones.some((i) => i.estado === 'ACTIVO'));

  const onSubmit = (d: z.infer<typeof matriculaZ>) => {
    if (!esMaestro && !d.maestroGuiaId) {
      setError('maestroGuiaId', { message: 'Seleccione el maestro guía' });
      return;
    }
    matricular.mutate(d);
  };

  return (
    <Modal abierto={abierto} titulo={`Matricular alumno — Año ${anio?.nombre ?? ''}`} onCerrar={onCerrar}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field label="Alumno (sin matrícula activa)" error={errors.alumnoId?.message}>
          <SelectInput {...register('alumnoId')}>
            <option value="">Seleccionar…</option>
            {candidatos.map((a) => (
              <option key={a.id} value={a.id}>
                {a.persona.primerApellido} {a.persona.segundoApellido ?? ''}, {a.persona.primerNombre}{' '}
                {a.codigoAlumno ? `(${a.codigoAlumno})` : ''}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Sección" error={errors.seccionId?.message}>
          <SelectInput {...register('seccionId')}>
            <option value="">Seleccionar…</option>
            {(secciones ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {etiquetaSeccion(s)}
              </option>
            ))}
          </SelectInput>
        </Field>
        {esMaestro ? (
          <p className="rounded-md border border-line bg-elevated px-3.5 py-2.5 text-xs text-secondary">
            Usted quedará registrado como <span className="font-semibold text-primary">maestro guía</span> de este alumno.
          </p>
        ) : (
          <Field label="Maestro guía" error={errors.maestroGuiaId?.message}>
            <SelectInput {...register('maestroGuiaId')}>
              <option value="">Seleccionar…</option>
              {(maestros ?? []).map((m) => (
                <option key={m.id} value={m.id}>
                  {nombreMaestro(m)} {m.especializacion ? `— ${m.especializacion}` : ''}
                </option>
              ))}
            </SelectInput>
          </Field>
        )}
        <Field label="Fecha de inscripción" error={errors.fechaInscripcion?.message}>
          <TextInput type="date" {...register('fechaInscripcion')} />
        </Field>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onCerrar}>Cancelar</Button>
          <Button type="submit" disabled={matricular.isPending || !anio}>
            {matricular.isPending ? 'Matriculando…' : 'Matricular'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function RetirarModal({ inscripcion, onCerrar }: { inscripcion: Inscripcion | null; onCerrar: () => void }) {
  const qc = useQueryClient();
  const [motivo, setMotivo] = useState('');

  const retirar = useMutation({
    mutationFn: () =>
      api(`/api/inscripciones/${inscripcion!.id}/retirar`, {
        method: 'POST',
        body: JSON.stringify({ fechaRetiro: new Date().toISOString().slice(0, 10), motivo }),
      }),
    onSuccess: () => {
      toast.ok('Alumno retirado');
      qc.invalidateQueries({ queryKey: ['inscripciones'] });
      setMotivo('');
      onCerrar();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'No se pudo retirar'),
  });

  return (
    <Modal abierto={Boolean(inscripcion)} titulo="Retirar alumno" onCerrar={onCerrar}>
      <div className="space-y-4">
        <p className="text-sm text-secondary">
          Está retirando a{' '}
          <span className="font-semibold text-primary">
            {inscripcion?.alumno.persona.primerNombre} {inscripcion?.alumno.persona.primerApellido}
          </span>{' '}
          de {inscripcion?.seccion.grado.nombre} "{inscripcion?.seccion.nombre}". Esta acción cambia el estado de la
          matrícula a RETIRADO.
        </p>
        <Field label="Motivo del retiro">
          <TextArea value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Describa el motivo…" />
        </Field>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onCerrar}>Cancelar</Button>
          <Button variant="danger" disabled={motivo.trim().length < 3 || retirar.isPending} onClick={() => retirar.mutate()}>
            {retirar.isPending ? 'Procesando…' : 'Confirmar retiro'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function CambiarTurnoModal({ inscripcion, onCerrar }: { inscripcion: Inscripcion | null; onCerrar: () => void }) {
  const qc = useQueryClient();
  const { data: secciones } = useSecciones();
  const [nuevaSeccionId, setNuevaSeccionId] = useState('');

  const seccionDestino = (secciones ?? []).find((s) => s.id === nuevaSeccionId);

  const cambiar = useMutation({
    mutationFn: () =>
      api(`/api/inscripciones/${inscripcion!.id}/cambiar-turno`, {
        method: 'POST',
        body: JSON.stringify({
          nuevaSeccionId,
          turno: seccionDestino?.turno ?? 'MANANA',
          fecha: new Date().toISOString().slice(0, 10),
        }),
      }),
    onSuccess: () => {
      toast.ok('Cambio de sección aplicado');
      qc.invalidateQueries({ queryKey: ['inscripciones'] });
      setNuevaSeccionId('');
      onCerrar();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'No se pudo cambiar la sección'),
  });

  return (
    <Modal abierto={Boolean(inscripcion)} titulo="Cambio de sección / turno" onCerrar={onCerrar}>
      <div className="space-y-4">
        <p className="text-sm text-secondary">
          Alumno:{' '}
          <span className="font-semibold text-primary">
            {inscripcion?.alumno.persona.primerNombre} {inscripcion?.alumno.persona.primerApellido}
          </span>{' '}
          — actualmente en {inscripcion?.seccion.grado.nombre} "{inscripcion?.seccion.nombre}" (
          {inscripcion?.seccion.turno === 'MANANA' ? 'Mañana' : 'Tarde'}).
        </p>
        <Field label="Nueva sección">
          <SelectInput value={nuevaSeccionId} onChange={(e) => setNuevaSeccionId(e.target.value)}>
            <option value="">Seleccionar…</option>
            {(secciones ?? [])
              .filter((s) => s.id !== inscripcion?.seccion.id)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {etiquetaSeccion(s)}
                </option>
              ))}
          </SelectInput>
        </Field>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onCerrar}>Cancelar</Button>
          <Button disabled={!nuevaSeccionId || cambiar.isPending} onClick={() => cambiar.mutate()}>
            {cambiar.isPending ? 'Aplicando…' : 'Aplicar cambio'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function Matricula() {
  const { usuario } = useAuthStore();
  const puedeGestionar = usuario?.rol === 'ADMIN' || usuario?.rol === 'DIRECTOR';
  const esMaestro = usuario?.rol === 'MAESTRO';
  const puedeMatricular = puedeGestionar || esMaestro;
  const [modalNueva, setModalNueva] = useState(false);
  const [retirando, setRetirando] = useState<Inscripcion | null>(null);
  const [cambiando, setCambiando] = useState<Inscripcion | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['inscripciones'],
    queryFn: async () => (await api<Inscripcion[]>('/api/inscripciones?limit=100')).data,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">Matrícula</h1>
          <p className="text-sm text-secondary">
            {esMaestro ? 'Registre a sus alumnos como su sección guía' : 'Inscripciones, retiros y cambios de turno'}
          </p>
        </div>
        {puedeMatricular && (
          <Button onClick={() => setModalNueva(true)}>
            <Plus size={16} /> Matricular alumno
          </Button>
        )}
      </div>

      <Card>
        <CardHeader title={`${data?.length ?? 0} inscripciones`} />
        <div className="px-5 pb-5">
          {isLoading ? (
            <Spinner />
          ) : !data || data.length === 0 ? (
            <EmptyState mensaje="No hay inscripciones registradas" />
          ) : (
            <Table headers={['Alumno', 'Grado y sección', 'Maestro guía', 'Fecha', 'Estado', 'Acciones']}>
              {data.map((i) => (
                <tr key={i.id} className="odd:bg-surface even:bg-elevated/50">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-primary">
                      {i.alumno.persona.primerNombre} {i.alumno.persona.primerApellido}
                    </p>
                    <p className="font-mono text-xs text-muted">{i.alumno.codigoAlumno ?? ''}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-secondary">
                    {i.seccion.grado.nombre} "{i.seccion.nombre}"
                    <Badge tone={i.seccion.turno === 'MANANA' ? 'accent' : 'warning'}>
                      {i.seccion.turno === 'MANANA' ? 'Mañana' : 'Tarde'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-secondary">
                    {i.maestroGuia.persona.primerNombre} {i.maestroGuia.persona.primerApellido}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-secondary">{formatearFecha(i.fechaInscripcion)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={i.estado === 'ACTIVO' ? 'success' : i.estado === 'RETIRADO' ? 'danger' : 'neutral'}>
                      {i.estado}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {puedeGestionar && i.estado === 'ACTIVO' && (
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setCambiando(i)}
                          title="Cambiar sección/turno"
                          className="rounded-md border border-line p-1.5 text-secondary transition-colors hover:text-accent"
                        >
                          <ArrowLeftRight size={14} />
                        </button>
                        <button
                          onClick={() => setRetirando(i)}
                          title="Retirar alumno"
                          className="rounded-md border border-line p-1.5 text-secondary transition-colors hover:text-danger"
                        >
                          <UserMinus size={14} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </div>
      </Card>

      <MatricularModal abierto={modalNueva} onCerrar={() => setModalNueva(false)} esMaestro={esMaestro} />
      <RetirarModal inscripcion={retirando} onCerrar={() => setRetirando(null)} />
      <CambiarTurnoModal inscripcion={cambiando} onCerrar={() => setCambiando(null)} />
    </div>
  );
}
