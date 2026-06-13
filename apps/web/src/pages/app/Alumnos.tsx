import { useState } from 'react';
import { Link } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ChevronLeft, ChevronRight, Plus, Search } from 'lucide-react';
import { api, ApiError } from '../../lib/api';
import { Badge, Button, Card, CardHeader, EmptyState, Spinner, Table } from '../../components/ui';
import { Field, Modal, TextInput, limpiar } from '../../components/forms';
import { PersonaFields, personaZ } from '../../components/PersonaFields';
import { toast } from '../../components/toast';
import { useAuthStore } from '../../store/auth';
import { nombreCompleto } from '../../lib/format';

interface Alumno {
  id: string;
  codigoAlumno: string | null;
  persona: { primerNombre: string; segundoNombre: string | null; primerApellido: string; segundoApellido: string | null; genero: string | null };
  inscripciones: { estado: string; seccion: { nombre: string; turno: string; grado: { nombre: string } } }[];
}

const alumnoFormZ = z.object({
  persona: personaZ,
  detalle: z.object({
    tipoSangre: z.string().optional(),
    alergias: z.string().optional(),
    condicionesMedicas: z.string().optional(),
    nombreContactoEmergencia: z.string().optional(),
    telefonoContactoEmergencia: z.string().optional(),
  }),
});

type AlumnoForm = z.infer<typeof alumnoFormZ>;

function NuevoAlumnoModal({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  const qc = useQueryClient();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AlumnoForm>({ resolver: zodResolver(alumnoFormZ), defaultValues: { persona: {} as never, detalle: {} } });

  const crear = useMutation({
    mutationFn: (form: AlumnoForm) =>
      api('/api/personas/alumnos', {
        method: 'POST',
        body: JSON.stringify({ persona: limpiar(form.persona), detalle: limpiar(form.detalle) }),
      }),
    onSuccess: () => {
      toast.ok('Alumno registrado correctamente');
      qc.invalidateQueries({ queryKey: ['alumnos'] });
      reset();
      onCerrar();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'No se pudo registrar el alumno'),
  });

  return (
    <Modal abierto={abierto} titulo="Registrar nuevo alumno" onCerrar={onCerrar} ancho="max-w-2xl">
      <form onSubmit={handleSubmit((d) => crear.mutate(d))} className="space-y-6">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-accent">Datos personales</p>
          <PersonaFields register={register} errors={errors} />
        </div>
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-accent">Ficha médica y emergencia</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tipo de sangre">
              <TextInput {...register('detalle.tipoSangre')} placeholder="O+" />
            </Field>
            <Field label="Alergias">
              <TextInput {...register('detalle.alergias')} placeholder="Ninguna" />
            </Field>
            <Field label="Condiciones médicas">
              <TextInput {...register('detalle.condicionesMedicas')} />
            </Field>
            <Field label="Contacto de emergencia">
              <TextInput {...register('detalle.nombreContactoEmergencia')} placeholder="Nombre completo" />
            </Field>
            <Field label="Teléfono de emergencia">
              <TextInput {...register('detalle.telefonoContactoEmergencia')} placeholder="7000-0000" />
            </Field>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onCerrar}>Cancelar</Button>
          <Button type="submit" disabled={isSubmitting || crear.isPending}>
            {crear.isPending ? 'Guardando…' : 'Registrar alumno'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function Alumnos() {
  const { usuario } = useAuthStore();
  const [buscar, setBuscar] = useState('');
  const [page, setPage] = useState(1);
  const [modalNuevo, setModalNuevo] = useState(false);
  const puedeCrear = usuario?.rol === 'ADMIN' || usuario?.rol === 'DIRECTOR';

  const { data, isLoading } = useQuery({
    queryKey: ['alumnos', buscar, page],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '15' });
      if (buscar) params.set('buscar', buscar);
      const res = await api<Alumno[]>(`/api/personas/alumnos?${params}`);
      return { items: res.data, meta: res.meta };
    },
  });

  const totalPaginas = data?.meta ? Math.max(1, Math.ceil(data.meta.total / data.meta.limit)) : 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">Alumnos</h1>
          <p className="text-sm text-secondary">Registro académico de estudiantes</p>
        </div>
        {puedeCrear && (
          <Button onClick={() => setModalNuevo(true)}>
            <Plus size={16} /> Nuevo alumno
          </Button>
        )}
      </div>

      <Card>
        <CardHeader
          title={`${data?.meta?.total ?? 0} alumnos`}
          action={
            <label className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                value={buscar}
                onChange={(e) => {
                  setBuscar(e.target.value);
                  setPage(1);
                }}
                placeholder="Buscar por nombre…"
                className="w-56 rounded-full border border-line bg-elevated py-2 pl-9 pr-4 text-sm text-primary placeholder:text-muted outline-none focus:border-accent"
              />
            </label>
          }
        />
        <div className="px-5 pb-5">
          {isLoading ? (
            <Spinner />
          ) : !data || data.items.length === 0 ? (
            <EmptyState mensaje="No se encontraron alumnos" />
          ) : (
            <>
              <Table headers={['Código', 'Nombre', 'Grado y sección', 'Turno', 'Estado']}>
                {data.items.map((a) => {
                  const insc = a.inscripciones[0];
                  return (
                    <tr key={a.id} className="odd:bg-surface even:bg-elevated/50">
                      <td className="px-4 py-3 font-mono text-xs text-secondary">{a.codigoAlumno ?? '—'}</td>
                      <td className="px-4 py-3">
                        <Link to={`/app/alumnos/${a.id}`} className="text-sm font-medium text-primary hover:text-accent">
                          {nombreCompleto(a.persona)}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-secondary">
                        {insc ? `${insc.seccion.grado.nombre} "${insc.seccion.nombre}"` : 'Sin inscripción'}
                      </td>
                      <td className="px-4 py-3">
                        {insc ? (
                          <Badge tone={insc.seccion.turno === 'MANANA' ? 'accent' : 'warning'}>
                            {insc.seccion.turno === 'MANANA' ? 'Mañana' : 'Tarde'}
                          </Badge>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={insc?.estado === 'ACTIVO' ? 'success' : 'neutral'}>
                          {insc?.estado ?? 'SIN MATRÍCULA'}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </Table>
              <div className="mt-4 flex items-center justify-between text-sm text-secondary">
                <span>
                  Página {page} de {totalPaginas}
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="rounded-md border border-line p-2 transition-colors hover:bg-elevated disabled:opacity-40"
                    aria-label="Anterior"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    disabled={page >= totalPaginas}
                    onClick={() => setPage((p) => p + 1)}
                    className="rounded-md border border-line p-2 transition-colors hover:bg-elevated disabled:opacity-40"
                    aria-label="Siguiente"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </Card>

      <NuevoAlumnoModal abierto={modalNuevo} onCerrar={() => setModalNuevo(false)} />
    </div>
  );
}
