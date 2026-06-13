import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCheck, Plus } from 'lucide-react';
import { api, ApiError } from '../../lib/api';
import { Badge, Button, Card, CardHeader, EmptyState, Spinner, Table } from '../../components/ui';
import { Field, Modal, SelectInput, TextArea, TextInput } from '../../components/forms';
import { toast } from '../../components/toast';
import { useAuthStore } from '../../store/auth';
import { formatearFecha } from '../../lib/format';

interface Ficha {
  id: string;
  titulo: string;
  descripcion: string;
  gravedad: string;
  estado: string;
  fechaEmision: string;
  alumno: { persona: { primerNombre: string; primerApellido: string } };
  maestro: { persona: { primerNombre: string; primerApellido: string } };
}

interface AlumnoMin {
  id: string;
  persona: { primerNombre: string; primerApellido: string; segundoApellido: string | null };
}

const tonoGravedad: Record<string, 'success' | 'warning' | 'danger'> = {
  BAJA: 'success',
  MEDIA: 'warning',
  ALTA: 'danger',
  CRITICA: 'danger',
};

const tonoEstado: Record<string, 'accent' | 'warning' | 'success' | 'neutral'> = {
  ABIERTA: 'warning',
  ACUSADA: 'accent',
  RESUELTA: 'success',
  ARCHIVADA: 'neutral',
};

const fichaZ = z.object({
  alumnoId: z.string().uuid('Seleccione un alumno'),
  titulo: z.string().min(1, 'Requerido'),
  descripcion: z.string().min(10, 'Describa la situación (mínimo 10 caracteres)'),
  gravedad: z.enum(['BAJA', 'MEDIA', 'ALTA', 'CRITICA']),
});

function NuevaFichaModal({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  const qc = useQueryClient();
  const { data: alumnos } = useQuery({
    queryKey: ['alumnos-cat'],
    enabled: abierto,
    queryFn: async () => (await api<AlumnoMin[]>('/api/personas/alumnos?limit=100')).data,
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<z.infer<typeof fichaZ>>({
    resolver: zodResolver(fichaZ),
    defaultValues: { gravedad: 'MEDIA' },
  });

  const emitir = useMutation({
    mutationFn: (f: z.infer<typeof fichaZ>) =>
      api('/api/calendario/fichas', {
        method: 'POST',
        body: JSON.stringify({ ...f, fechaEmision: new Date().toISOString().slice(0, 10) }),
      }),
    onSuccess: () => {
      toast.ok('Ficha emitida; el responsable principal fue notificado');
      qc.invalidateQueries({ queryKey: ['fichas'] });
      reset();
      onCerrar();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'No se pudo emitir la ficha'),
  });

  return (
    <Modal abierto={abierto} titulo="Emitir ficha de atención" onCerrar={onCerrar}>
      <form onSubmit={handleSubmit((d) => emitir.mutate(d))} className="space-y-4">
        <Field label="Alumno" error={errors.alumnoId?.message}>
          <SelectInput {...register('alumnoId')}>
            <option value="">Seleccionar…</option>
            {(alumnos ?? []).map((a) => (
              <option key={a.id} value={a.id}>
                {a.persona.primerApellido} {a.persona.segundoApellido ?? ''}, {a.persona.primerNombre}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Título" error={errors.titulo?.message}>
          <TextInput {...register('titulo')} placeholder="Bajo rendimiento en…" />
        </Field>
        <Field label="Descripción" error={errors.descripcion?.message}>
          <TextArea {...register('descripcion')} rows={4} placeholder="Describa la situación y recomendaciones…" />
        </Field>
        <Field label="Gravedad">
          <SelectInput {...register('gravedad')}>
            <option value="BAJA">Baja</option>
            <option value="MEDIA">Media</option>
            <option value="ALTA">Alta</option>
            <option value="CRITICA">Crítica</option>
          </SelectInput>
        </Field>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onCerrar}>Cancelar</Button>
          <Button type="submit" disabled={emitir.isPending}>
            {emitir.isPending ? 'Emitiendo…' : 'Emitir ficha'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function Fichas() {
  const { usuario } = useAuthStore();
  const qc = useQueryClient();
  const [modalNueva, setModalNueva] = useState(false);
  // El backend exige que quien emite sea un maestro registrado
  const puedeEmitir = usuario?.rol === 'MAESTRO';
  const puedeResolver = usuario?.rol === 'MAESTRO' || usuario?.rol === 'ADMIN' || usuario?.rol === 'DIRECTOR';

  const { data, isLoading } = useQuery({
    queryKey: ['fichas'],
    queryFn: async () => (await api<Ficha[]>('/api/calendario/fichas')).data,
  });

  const resolver = useMutation({
    mutationFn: (id: string) => api(`/api/calendario/fichas/${id}/resolver`, { method: 'POST' }),
    onSuccess: () => {
      toast.ok('Ficha marcada como resuelta');
      qc.invalidateQueries({ queryKey: ['fichas'] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'No se pudo resolver'),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">Fichas de atención</h1>
          <p className="text-sm text-secondary">Seguimiento conductual y académico de los alumnos</p>
        </div>
        {puedeEmitir && (
          <Button onClick={() => setModalNueva(true)}>
            <Plus size={16} /> Emitir ficha
          </Button>
        )}
      </div>

      <Card>
        <CardHeader title={`${data?.length ?? 0} fichas registradas`} />
        <div className="px-5 pb-5">
          {isLoading ? (
            <Spinner />
          ) : !data || data.length === 0 ? (
            <EmptyState mensaje="No hay fichas registradas" />
          ) : (
            <Table headers={['Fecha', 'Alumno', 'Título', 'Emitida por', 'Gravedad', 'Estado', '']}>
              {data.map((f) => (
                <tr key={f.id} className="odd:bg-surface even:bg-elevated/50">
                  <td className="px-4 py-3 font-mono text-xs text-secondary">{formatearFecha(f.fechaEmision)}</td>
                  <td className="px-4 py-3 text-sm font-medium text-primary">
                    {f.alumno.persona.primerNombre} {f.alumno.persona.primerApellido}
                  </td>
                  <td className="px-4 py-3 text-sm text-secondary" title={f.descripcion}>{f.titulo}</td>
                  <td className="px-4 py-3 text-sm text-secondary">
                    {f.maestro.persona.primerNombre} {f.maestro.persona.primerApellido}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={tonoGravedad[f.gravedad] ?? 'neutral'}>{f.gravedad}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={tonoEstado[f.estado] ?? 'neutral'}>{f.estado}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    {puedeResolver && (f.estado === 'ABIERTA' || f.estado === 'ACUSADA') && (
                      <button
                        onClick={() => resolver.mutate(f.id)}
                        title="Marcar como resuelta"
                        className="rounded-md border border-line p-1.5 text-secondary transition-colors hover:text-success"
                      >
                        <CheckCheck size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </div>
      </Card>

      <NuevaFichaModal abierto={modalNueva} onCerrar={() => setModalNueva(false)} />
    </div>
  );
}
