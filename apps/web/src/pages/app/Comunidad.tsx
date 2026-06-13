import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { KeyRound, Link2, Plus } from 'lucide-react';
import { api, ApiError } from '../../lib/api';
import { Badge, Button, Card, CardHeader, EmptyState, Spinner, Table } from '../../components/ui';
import { Field, Modal, SelectInput, TextInput, limpiar } from '../../components/forms';
import { PersonaFields, personaZ } from '../../components/PersonaFields';
import { toast } from '../../components/toast';
import { useAuthStore } from '../../store/auth';

interface Maestro {
  id: string;
  codigoMaestro: string | null;
  especializacion: string | null;
  tipoContrato: string | null;
  persona: { id: string; primerNombre: string; primerApellido: string; email: string | null; telefono: string | null };
}

interface Responsable {
  id: string;
  tipoRelacion: string | null;
  persona: { id: string; primerNombre: string; primerApellido: string; telefono: string | null; email: string | null };
  alumnos: { esPrincipal: boolean; alumno: { persona: { primerNombre: string; primerApellido: string } } }[];
}

interface AlumnoMin {
  id: string;
  persona: { primerNombre: string; primerApellido: string; segundoApellido: string | null };
}

// ── Crear maestro ──
const maestroZ = z.object({
  persona: personaZ,
  detalle: z.object({
    codigoMaestro: z.string().optional(),
    especializacion: z.string().optional(),
    tipoContrato: z.enum(['TIEMPO_COMPLETO', 'MEDIO_TIEMPO', 'CONTRATO']).or(z.literal('')).optional(),
  }),
});

function NuevoMaestroModal({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  const qc = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<z.infer<typeof maestroZ>>({
    resolver: zodResolver(maestroZ),
    defaultValues: { persona: {} as never, detalle: {} },
  });

  const crear = useMutation({
    mutationFn: (f: z.infer<typeof maestroZ>) =>
      api('/api/personas/maestros', {
        method: 'POST',
        body: JSON.stringify({ persona: limpiar(f.persona), detalle: limpiar(f.detalle) }),
      }),
    onSuccess: () => {
      toast.ok('Maestro registrado');
      qc.invalidateQueries({ queryKey: ['maestros'] });
      qc.invalidateQueries({ queryKey: ['maestros-cat'] });
      reset();
      onCerrar();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'No se pudo registrar'),
  });

  return (
    <Modal abierto={abierto} titulo="Registrar maestro" onCerrar={onCerrar} ancho="max-w-2xl">
      <form onSubmit={handleSubmit((d) => crear.mutate(d))} className="space-y-6">
        <PersonaFields register={register} errors={errors} />
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Código">
            <TextInput {...register('detalle.codigoMaestro')} placeholder="M-005" />
          </Field>
          <Field label="Especialización">
            <TextInput {...register('detalle.especializacion')} placeholder="Matemática" />
          </Field>
          <Field label="Tipo de contrato">
            <SelectInput {...register('detalle.tipoContrato')}>
              <option value="">Seleccionar…</option>
              <option value="TIEMPO_COMPLETO">Tiempo completo</option>
              <option value="MEDIO_TIEMPO">Medio tiempo</option>
              <option value="CONTRATO">Por contrato</option>
            </SelectInput>
          </Field>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onCerrar}>Cancelar</Button>
          <Button type="submit" disabled={crear.isPending}>{crear.isPending ? 'Guardando…' : 'Registrar'}</Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Crear responsable ──
const responsableZ = z.object({
  persona: personaZ,
  tipoRelacion: z.enum(['PADRE', 'MADRE', 'TUTOR', 'OTRO']),
});

function NuevoResponsableModal({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  const qc = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<z.infer<typeof responsableZ>>({
    resolver: zodResolver(responsableZ),
    defaultValues: { persona: {} as never, tipoRelacion: 'PADRE' },
  });

  const crear = useMutation({
    mutationFn: (f: z.infer<typeof responsableZ>) =>
      api('/api/personas/responsables', {
        method: 'POST',
        body: JSON.stringify({ persona: limpiar(f.persona), tipoRelacion: f.tipoRelacion }),
      }),
    onSuccess: () => {
      toast.ok('Responsable registrado');
      qc.invalidateQueries({ queryKey: ['responsables'] });
      reset();
      onCerrar();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'No se pudo registrar'),
  });

  return (
    <Modal abierto={abierto} titulo="Registrar responsable" onCerrar={onCerrar} ancho="max-w-2xl">
      <form onSubmit={handleSubmit((d) => crear.mutate(d))} className="space-y-6">
        <PersonaFields register={register} errors={errors} />
        <Field label="Relación con el alumno">
          <SelectInput {...register('tipoRelacion')}>
            <option value="PADRE">Padre</option>
            <option value="MADRE">Madre</option>
            <option value="TUTOR">Tutor</option>
            <option value="OTRO">Otro</option>
          </SelectInput>
        </Field>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onCerrar}>Cancelar</Button>
          <Button type="submit" disabled={crear.isPending}>{crear.isPending ? 'Guardando…' : 'Registrar'}</Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Vincular responsable ↔ alumno ──
function VincularModal({ responsable, onCerrar }: { responsable: Responsable | null; onCerrar: () => void }) {
  const qc = useQueryClient();
  const [alumnoId, setAlumnoId] = useState('');
  const [esPrincipal, setEsPrincipal] = useState(true);

  const { data: alumnos } = useQuery({
    queryKey: ['alumnos-cat'],
    enabled: Boolean(responsable),
    queryFn: async () => (await api<AlumnoMin[]>('/api/personas/alumnos?limit=100')).data,
  });

  const vincular = useMutation({
    mutationFn: () =>
      api('/api/personas/responsables/vincular', {
        method: 'POST',
        body: JSON.stringify({ alumnoId, responsableId: responsable!.id, esPrincipal }),
      }),
    onSuccess: () => {
      toast.ok('Vínculo creado');
      qc.invalidateQueries({ queryKey: ['responsables'] });
      setAlumnoId('');
      onCerrar();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'No se pudo vincular'),
  });

  return (
    <Modal abierto={Boolean(responsable)} titulo="Vincular alumno" onCerrar={onCerrar}>
      <div className="space-y-4">
        <p className="text-sm text-secondary">
          Vinculando alumno a{' '}
          <span className="font-semibold text-primary">
            {responsable?.persona.primerNombre} {responsable?.persona.primerApellido}
          </span>
        </p>
        <Field label="Alumno">
          <SelectInput value={alumnoId} onChange={(e) => setAlumnoId(e.target.value)}>
            <option value="">Seleccionar…</option>
            {(alumnos ?? []).map((a) => (
              <option key={a.id} value={a.id}>
                {a.persona.primerApellido} {a.persona.segundoApellido ?? ''}, {a.persona.primerNombre}
              </option>
            ))}
          </SelectInput>
        </Field>
        <label className="flex items-center gap-2 text-sm text-secondary">
          <input type="checkbox" checked={esPrincipal} onChange={(e) => setEsPrincipal(e.target.checked)} className="accent-[var(--color-accent)]" />
          Responsable principal (recibe las notificaciones)
        </label>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onCerrar}>Cancelar</Button>
          <Button disabled={!alumnoId || vincular.isPending} onClick={() => vincular.mutate()}>
            {vincular.isPending ? 'Vinculando…' : 'Vincular'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Crear usuario de acceso ──
const usuarioZ = z.object({
  nombreUsuario: z.string().min(3, 'Mínimo 3 caracteres'),
  email: z.string().email('Correo inválido'),
  contrasena: z.string().min(10, 'Mínimo 10 caracteres'),
});

function CrearUsuarioModal({
  destino,
  onCerrar,
}: {
  destino: { personaId: string; nombre: string; rol: 'MAESTRO' | 'RESPONSABLE' } | null;
  onCerrar: () => void;
}) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<z.infer<typeof usuarioZ>>({
    resolver: zodResolver(usuarioZ),
  });

  const crear = useMutation({
    mutationFn: (f: z.infer<typeof usuarioZ>) =>
      api('/api/personas/usuarios', {
        method: 'POST',
        body: JSON.stringify({ ...f, personaId: destino!.personaId, rol: destino!.rol }),
      }),
    onSuccess: () => {
      toast.ok('Usuario de acceso creado');
      reset();
      onCerrar();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'No se pudo crear el usuario'),
  });

  return (
    <Modal abierto={Boolean(destino)} titulo={`Crear acceso para ${destino?.nombre ?? ''}`} onCerrar={onCerrar}>
      <form onSubmit={handleSubmit((d) => crear.mutate(d))} className="space-y-4">
        <p className="text-sm text-secondary">
          Rol del usuario: <Badge tone="accent">{destino?.rol}</Badge>
        </p>
        <Field label="Nombre de usuario" error={errors.nombreUsuario?.message}>
          <TextInput {...register('nombreUsuario')} placeholder="jperez" autoComplete="off" />
        </Field>
        <Field label="Correo electrónico" error={errors.email?.message}>
          <TextInput type="email" {...register('email')} placeholder="correo@cecma.edu.sv" autoComplete="off" />
        </Field>
        <Field label="Contraseña temporal" error={errors.contrasena?.message}>
          <TextInput type="password" {...register('contrasena')} placeholder="Mínimo 10 caracteres, may/min/números" autoComplete="new-password" />
        </Field>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onCerrar}>Cancelar</Button>
          <Button type="submit" disabled={crear.isPending}>{crear.isPending ? 'Creando…' : 'Crear usuario'}</Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Página ──
export function Comunidad() {
  const { usuario } = useAuthStore();
  const puedeGestionar = usuario?.rol === 'ADMIN' || usuario?.rol === 'DIRECTOR';
  const [tab, setTab] = useState<'maestros' | 'responsables'>('maestros');
  const [modalMaestro, setModalMaestro] = useState(false);
  const [modalResponsable, setModalResponsable] = useState(false);
  const [vinculando, setVinculando] = useState<Responsable | null>(null);
  const [creandoUsuario, setCreandoUsuario] = useState<{ personaId: string; nombre: string; rol: 'MAESTRO' | 'RESPONSABLE' } | null>(null);

  const { data: maestros, isLoading: cargandoM } = useQuery({
    queryKey: ['maestros'],
    queryFn: async () => (await api<Maestro[]>('/api/personas/maestros?limit=100')).data,
  });

  const { data: responsables, isLoading: cargandoR } = useQuery({
    queryKey: ['responsables'],
    queryFn: async () => (await api<Responsable[]>('/api/personas/responsables?limit=100')).data,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">Comunidad educativa</h1>
          <p className="text-sm text-secondary">Docentes y responsables de familia</p>
        </div>
        {puedeGestionar && (
          <Button onClick={() => (tab === 'maestros' ? setModalMaestro(true) : setModalResponsable(true))}>
            <Plus size={16} /> {tab === 'maestros' ? 'Nuevo maestro' : 'Nuevo responsable'}
          </Button>
        )}
      </div>

      <div className="flex gap-2">
        {(['maestros', 'responsables'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-4 py-2 text-sm font-semibold capitalize transition-colors ${
              tab === t ? 'bg-accent text-white' : 'border border-line text-secondary hover:bg-elevated'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'maestros' && (
        <Card>
          <CardHeader title={`${maestros?.length ?? 0} docentes`} />
          <div className="px-5 pb-5">
            {cargandoM ? (
              <Spinner />
            ) : !maestros || maestros.length === 0 ? (
              <EmptyState mensaje="No hay maestros registrados" />
            ) : (
              <Table headers={['Código', 'Nombre', 'Especialización', 'Contrato', 'Contacto', 'Acciones']}>
                {maestros.map((m) => (
                  <tr key={m.id} className="odd:bg-surface even:bg-elevated/50">
                    <td className="px-4 py-3 font-mono text-xs text-secondary">{m.codigoMaestro ?? '—'}</td>
                    <td className="px-4 py-3 text-sm font-medium text-primary">
                      {m.persona.primerNombre} {m.persona.primerApellido}
                    </td>
                    <td className="px-4 py-3 text-sm text-secondary">{m.especializacion ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Badge tone="neutral">{m.tipoContrato?.replace('_', ' ') ?? '—'}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-secondary">{m.persona.email ?? m.persona.telefono ?? '—'}</td>
                    <td className="px-4 py-3">
                      {puedeGestionar && (
                        <button
                          onClick={() =>
                            setCreandoUsuario({
                              personaId: m.persona.id,
                              nombre: `${m.persona.primerNombre} ${m.persona.primerApellido}`,
                              rol: 'MAESTRO',
                            })
                          }
                          title="Crear usuario de acceso"
                          className="rounded-md border border-line p-1.5 text-secondary transition-colors hover:text-accent"
                        >
                          <KeyRound size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </Table>
            )}
          </div>
        </Card>
      )}

      {tab === 'responsables' && (
        <Card>
          <CardHeader title={`${responsables?.length ?? 0} responsables`} />
          <div className="px-5 pb-5">
            {cargandoR ? (
              <Spinner />
            ) : !responsables || responsables.length === 0 ? (
              <EmptyState mensaje="No hay responsables registrados" />
            ) : (
              <Table headers={['Nombre', 'Relación', 'Hijos vinculados', 'Contacto', 'Acciones']}>
                {responsables.map((r) => (
                  <tr key={r.id} className="odd:bg-surface even:bg-elevated/50">
                    <td className="px-4 py-3 text-sm font-medium text-primary">
                      {r.persona.primerNombre} {r.persona.primerApellido}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone="neutral">{r.tipoRelacion ?? '—'}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-secondary">
                      {r.alumnos.length === 0
                        ? 'Ninguno'
                        : r.alumnos
                            .map((v) => `${v.alumno.persona.primerNombre} ${v.alumno.persona.primerApellido}`)
                            .join(', ')}
                    </td>
                    <td className="px-4 py-3 text-xs text-secondary">{r.persona.email ?? r.persona.telefono ?? '—'}</td>
                    <td className="px-4 py-3">
                      {puedeGestionar && (
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => setVinculando(r)}
                            title="Vincular alumno"
                            className="rounded-md border border-line p-1.5 text-secondary transition-colors hover:text-accent"
                          >
                            <Link2 size={14} />
                          </button>
                          <button
                            onClick={() =>
                              setCreandoUsuario({
                                personaId: r.persona.id,
                                nombre: `${r.persona.primerNombre} ${r.persona.primerApellido}`,
                                rol: 'RESPONSABLE',
                              })
                            }
                            title="Crear usuario de acceso"
                            className="rounded-md border border-line p-1.5 text-secondary transition-colors hover:text-accent"
                          >
                            <KeyRound size={14} />
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
      )}

      <NuevoMaestroModal abierto={modalMaestro} onCerrar={() => setModalMaestro(false)} />
      <NuevoResponsableModal abierto={modalResponsable} onCerrar={() => setModalResponsable(false)} />
      <VincularModal responsable={vinculando} onCerrar={() => setVinculando(null)} />
      <CrearUsuarioModal destino={creandoUsuario} onCerrar={() => setCreandoUsuario(null)} />
    </div>
  );
}
