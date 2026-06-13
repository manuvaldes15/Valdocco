import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Bar, BarChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertCircle, BookOpenCheck, CheckCheck, ClipboardList, FileDown, UserPlus } from 'lucide-react';
import { api, ApiError, descargarArchivo } from '../../lib/api';
import { Badge, Button, Card, CardHeader, EmptyState, Spinner } from '../../components/ui';
import { Field, Modal, TextInput, limpiar } from '../../components/forms';
import { PersonaFields, personaZ } from '../../components/PersonaFields';
import { toast } from '../../components/toast';
import { formatearFecha } from '../../lib/format';

const hijoZ = z.object({
  persona: personaZ,
  nombreContactoEmergencia: z.string().optional(),
  telefonoContactoEmergencia: z.string().optional(),
});

/** El responsable registra a su propio hijo: queda vinculado como responsable principal. */
function RegistrarHijoModal({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  const qc = useQueryClient();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<z.infer<typeof hijoZ>>({ resolver: zodResolver(hijoZ) });

  const crear = useMutation({
    mutationFn: (form: z.infer<typeof hijoZ>) =>
      api('/api/personas/mis-hijos', {
        method: 'POST',
        body: JSON.stringify({
          persona: limpiar(form.persona),
          detalle: limpiar({
            nombreContactoEmergencia: form.nombreContactoEmergencia,
            telefonoContactoEmergencia: form.telefonoContactoEmergencia,
          }),
        }),
      }),
    onSuccess: () => {
      toast.ok('Hijo(a) registrado correctamente');
      qc.invalidateQueries({ queryKey: ['mis-hijos'] });
      reset();
      onCerrar();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'No se pudo registrar'),
  });

  return (
    <Modal abierto={abierto} titulo="Registrar hijo(a)" onCerrar={onCerrar} ancho="max-w-2xl">
      <form onSubmit={handleSubmit((d) => crear.mutate(d))} className="space-y-4">
        <PersonaFields register={register} errors={errors} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Contacto de emergencia">
            <TextInput {...register('nombreContactoEmergencia')} placeholder="Nombre del contacto" />
          </Field>
          <Field label="Teléfono de emergencia">
            <TextInput {...register('telefonoContactoEmergencia')} placeholder="7000-0000" />
          </Field>
        </div>
        <p className="text-xs text-muted">
          El alumno quedará vinculado a su cuenta. El docente podrá matricularlo en su sección.
        </p>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onCerrar}>Cancelar</Button>
          <Button type="submit" disabled={crear.isPending}>
            {crear.isPending ? 'Registrando…' : 'Registrar hijo(a)'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

interface Hijo {
  id: string;
  persona: { primerNombre: string; primerApellido: string };
  inscripciones: { seccion: { nombre: string; grado: { nombre: string } }; anioLectivoId: string }[];
}

interface ResumenMateria {
  materia: string;
  colorHex: string | null;
  promedioActual: number;
  pesoRestante: number;
  actividadesPendientes: number;
  puedeAprobar: boolean;
}

interface Resumen {
  periodo?: { nombre: string };
  seccion?: string;
  notaMinima?: number;
  materias: ResumenMateria[];
}

interface FichaHijo {
  id: string;
  titulo: string;
  descripcion: string;
  gravedad: string;
  estado: string;
  fechaEmision: string;
  maestro: { persona: { primerNombre: string; primerApellido: string } };
}

export function DashboardResponsable() {
  const [hijoActivo, setHijoActivo] = useState<string | null>(null);
  const [registrando, setRegistrando] = useState(false);

  const { data: hijos, isLoading } = useQuery({
    queryKey: ['mis-hijos'],
    queryFn: async () => (await api<Hijo[]>('/api/personas/mis-hijos')).data,
  });

  const hijo = hijos?.find((h) => h.id === hijoActivo) ?? hijos?.[0];
  const anioLectivoId = hijo?.inscripciones[0]?.anioLectivoId;

  const { data: resumen } = useQuery({
    queryKey: ['resumen-hijo', hijo?.id],
    enabled: Boolean(hijo && anioLectivoId),
    queryFn: async () =>
      (await api<Resumen>(`/api/calificaciones/alumnos/${hijo!.id}/resumen?anioLectivoId=${anioLectivoId}`)).data,
  });

  const qc = useQueryClient();
  const { data: fichas } = useQuery({
    queryKey: ['fichas-hijo', hijo?.id],
    enabled: Boolean(hijo),
    queryFn: async () => (await api<FichaHijo[]>(`/api/calendario/fichas?alumnoId=${hijo!.id}`)).data,
  });

  const acusar = useMutation({
    mutationFn: (id: string) => api(`/api/calendario/fichas/${id}/acusar`, { method: 'POST' }),
    onSuccess: () => {
      toast.ok('Acuse de recibido registrado');
      qc.invalidateQueries({ queryKey: ['fichas-hijo'] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'No se pudo registrar el acuse'),
  });

  if (isLoading) return <Spinner />;
  if (!hijos || hijos.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-primary">Portal de padres</h1>
            <p className="text-sm text-secondary">Registre a sus hijos para dar seguimiento académico</p>
          </div>
          <Button onClick={() => setRegistrando(true)}>
            <UserPlus size={16} /> Registrar hijo(a)
          </Button>
        </div>
        <Card>
          <div className="px-5 py-10">
            <EmptyState mensaje="Aún no hay alumnos vinculados a su cuenta. Registre a su primer hijo(a)." />
          </div>
        </Card>
        <RegistrarHijoModal abierto={registrando} onCerrar={() => setRegistrando(false)} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Portal de padres</h1>
          <p className="text-sm text-secondary">
            {hijo && resumen?.seccion ? `${resumen.seccion} · ${resumen.periodo?.nombre ?? ''}` : 'Seguimiento académico de sus hijos'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setRegistrando(true)}
            className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2 text-sm font-semibold text-secondary transition-colors hover:bg-elevated hover:text-primary"
          >
            <UserPlus size={15} /> Registrar hijo(a)
          </button>
          {hijos.length > 1 &&
            hijos.map((h) => (
              <button
                key={h.id}
                onClick={() => setHijoActivo(h.id)}
                className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
                  (hijoActivo ?? hijos[0].id) === h.id
                    ? 'bg-accent text-white'
                    : 'border border-line text-secondary hover:bg-elevated'
                }`}
              >
                {h.persona.primerNombre}
              </button>
            ))}
          {hijo && (
            <button
              onClick={async () => {
                try {
                  await descargarArchivo(`/api/reportes/libreta/${hijo.id}`, `libreta-${hijo.persona.primerNombre}.pdf`);
                  toast.ok('Libreta descargada');
                } catch (e) {
                  toast.error(e instanceof ApiError ? e.message : 'No se pudo generar la libreta');
                }
              }}
              className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2 text-sm font-semibold text-secondary transition-colors hover:bg-elevated hover:text-primary"
            >
              <FileDown size={15} /> Libreta PDF
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Nota actual por materia"
            subtitle={`Nota mínima de aprobación: ${resumen?.notaMinima ?? 5}`}
          />
          <div className="h-80 px-3 pb-5">
            {!resumen || resumen.materias.length === 0 ? (
              <EmptyState mensaje="Aún no hay calificaciones registradas" />
            ) : (
              <ResponsiveContainer>
                <BarChart data={resumen.materias} layout="vertical" margin={{ left: 16 }}>
                  <XAxis type="number" domain={[0, 10]} stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis
                    type="category"
                    dataKey="materia"
                    width={130}
                    stroke="var(--color-text-muted)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: 'var(--color-bg-elevated)' }}
                    contentStyle={{
                      background: 'var(--color-bg-overlay)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 8,
                      color: 'var(--color-text-primary)',
                    }}
                  />
                  <ReferenceLine x={resumen.notaMinima ?? 5} stroke="var(--color-danger)" strokeDasharray="4 4" />
                  <Bar dataKey="promedioActual" name="Nota actual" fill="#4f8ef7" radius={[0, 6, 6, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Detalle por materia" subtitle="Promedio, pendientes y proyección" />
          <div className="space-y-3 px-5 pb-5">
            {(resumen?.materias ?? []).map((m) => (
              <div key={m.materia} className="flex items-center justify-between gap-3 rounded-lg bg-elevated p-3.5">
                <div className="flex items-center gap-3">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: m.colorHex ?? 'var(--color-accent)' }}
                  />
                  <div>
                    <p className="text-sm font-medium text-primary">{m.materia}</p>
                    <p className="text-xs text-secondary">
                      {m.actividadesPendientes > 0
                        ? `${m.actividadesPendientes} actividad(es) pendiente(s)`
                        : 'Al día'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-lg font-bold text-primary">{m.promedioActual.toFixed(1)}</span>
                  {m.puedeAprobar ? (
                    <Badge tone="success">
                      <BookOpenCheck size={12} className="mr-1" /> En curso
                    </Badge>
                  ) : (
                    <Badge tone="danger">
                      <AlertCircle size={12} className="mr-1" /> En riesgo
                    </Badge>
                  )}
                </div>
              </div>
            ))}
            {(!resumen || resumen.materias.length === 0) && <EmptyState mensaje="Sin materias asignadas" />}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Fichas de atención"
          subtitle="Comunicados de los maestros sobre su hijo(a) — confirme la lectura con el acuse"
          action={<ClipboardList size={16} className="text-secondary" />}
        />
        <div className="space-y-3 px-5 pb-5">
          {(!fichas || fichas.length === 0) && <EmptyState mensaje="No hay fichas de atención" />}
          {(fichas ?? []).map((f) => (
            <div key={f.id} className="rounded-lg bg-elevated p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-primary">{f.titulo}</p>
                    <Badge tone={f.gravedad === 'BAJA' ? 'success' : f.gravedad === 'MEDIA' ? 'warning' : 'danger'}>
                      {f.gravedad}
                    </Badge>
                    <Badge tone={f.estado === 'ABIERTA' ? 'warning' : f.estado === 'ACUSADA' ? 'accent' : 'success'}>
                      {f.estado}
                    </Badge>
                  </div>
                  <p className="mt-1.5 text-sm text-secondary">{f.descripcion}</p>
                  <p className="mt-1 text-xs text-muted">
                    {f.maestro.persona.primerNombre} {f.maestro.persona.primerApellido} · {formatearFecha(f.fechaEmision)}
                  </p>
                </div>
                {f.estado === 'ABIERTA' && (
                  <button
                    onClick={() => acusar.mutate(f.id)}
                    disabled={acusar.isPending}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-accent px-3 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    <CheckCheck size={14} /> Acusar recibido
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <RegistrarHijoModal abierto={registrando} onCerrar={() => setRegistrando(false)} />
    </div>
  );
}
