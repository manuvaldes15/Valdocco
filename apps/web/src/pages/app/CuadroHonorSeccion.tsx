import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Award, Megaphone } from 'lucide-react';
import { api, ApiError } from '../../lib/api';
import { Button, Card, CardHeader, EmptyState, Spinner, Table } from '../../components/ui';
import { Field, SelectInput } from '../../components/forms';
import { toast } from '../../components/toast';

interface SeccionGuia {
  seccionId: string;
  gradoId: string;
  nombre: string;
}

interface EntradaHonor {
  posicion: number;
  alumnoId: string;
  alumno: string;
  promedioGeneral: number;
}

interface Previsualizacion {
  periodoId: string;
  entradas: EntradaHonor[];
}

// Color del distintivo según el podio (1.º oro, 2.º plata, 3.º bronce, resto neutro).
const COLOR_POSICION = ['#f59e0b', '#94a3b8', '#b45309'];

export function CuadroHonorSeccion() {
  const qc = useQueryClient();
  const [seccionId, setSeccionId] = useState('');
  const [top, setTop] = useState(3);

  const { data: secciones, isLoading } = useQuery({
    queryKey: ['cuadro-honor-mis-secciones'],
    queryFn: async () => (await api<SeccionGuia[]>('/api/calendario/cuadro-honor/mis-secciones')).data,
  });

  // Selecciona la primera sección automáticamente.
  useEffect(() => {
    if (!seccionId && secciones && secciones.length > 0) setSeccionId(secciones[0].seccionId);
  }, [secciones, seccionId]);

  const { data: preview, isFetching } = useQuery({
    queryKey: ['cuadro-honor-preview', seccionId, top],
    enabled: Boolean(seccionId),
    queryFn: async () =>
      (await api<Previsualizacion>(`/api/calendario/cuadro-honor/seccion/${seccionId}?top=${top}`)).data,
  });

  const publicar = useMutation({
    mutationFn: () =>
      api(`/api/calendario/cuadro-honor/seccion/${seccionId}/publicar`, {
        method: 'POST',
        body: JSON.stringify({ top }),
      }),
    onSuccess: () => {
      toast.ok('Cuadro de honor publicado en la plataforma');
      qc.invalidateQueries({ queryKey: ['cuadro-honor-publico'] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'No se pudo publicar'),
  });

  if (isLoading) return <Spinner />;

  if (!secciones || secciones.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-primary">Cuadro de honor</h1>
          <p className="text-sm text-secondary">Reconozca los logros de los alumnos de su sección guía</p>
        </div>
        <Card>
          <div className="px-5 py-10">
            <EmptyState mensaje="No es guía de ninguna sección este año lectivo. Matricule alumnos para serlo." />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Cuadro de honor</h1>
          <p className="text-sm text-secondary">
            Vista previa del ranking del periodo vigente de su sección. Publíquelo para mostrarlo en la plataforma.
          </p>
        </div>
        <Button
          onClick={() => publicar.mutate()}
          disabled={publicar.isPending || !preview || preview.entradas.length === 0}
        >
          <Megaphone size={16} /> {publicar.isPending ? 'Publicando…' : 'Publicar cuadro de honor'}
        </Button>
      </div>

      <Card>
        <div className="flex flex-wrap items-end gap-4 p-5">
          <Field label="Sección guía">
            <SelectInput value={seccionId} onChange={(e) => setSeccionId(e.target.value)} className="w-64">
              {secciones.map((s) => (
                <option key={s.seccionId} value={s.seccionId}>
                  {s.nombre}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="Posiciones (Top)">
            <SelectInput value={top} onChange={(e) => setTop(Number(e.target.value))} className="w-32">
              {[3, 5, 10].map((n) => (
                <option key={n} value={n}>
                  Top {n}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader title="Vista previa" subtitle="Promedio general del periodo vigente (escala 0–10)" action={<Award size={16} className="text-secondary" />} />
        <div className="px-5 pb-5">
          {isFetching ? (
            <Spinner />
          ) : !preview || preview.entradas.length === 0 ? (
            <EmptyState mensaje="Aún no hay notas calificadas suficientes para armar el cuadro de honor" />
          ) : (
            <Table headers={['Posición', 'Alumno', 'Promedio general']}>
              {preview.entradas.map((e) => (
                <tr key={e.alumnoId} className="odd:bg-surface even:bg-elevated/50">
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ background: COLOR_POSICION[e.posicion - 1] ?? 'var(--color-text-muted)' }}
                    >
                      {e.posicion}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-primary">{e.alumno}</td>
                  <td className="px-4 py-3 font-mono text-sm font-bold text-accent">{e.promedioGeneral.toFixed(2)}</td>
                </tr>
              ))}
            </Table>
          )}
        </div>
      </Card>
    </div>
  );
}
