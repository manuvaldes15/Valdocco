import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BellRing, Check } from 'lucide-react';
import { api } from '../../lib/api';
import { Card, CardHeader, EmptyState, Spinner } from '../../components/ui';
import { formatearFechaLarga } from '../../lib/format';

interface Notificacion {
  id: string;
  titulo: string;
  mensaje: string;
  tipo: string;
  leidaEn: string | null;
  fechaCrea: string;
}

export function Notificaciones() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['notificaciones'],
    queryFn: async () => (await api<Notificacion[]>('/api/notificaciones')).data,
  });

  const marcarLeida = useMutation({
    mutationFn: (id: string) => api(`/api/notificaciones/${id}/leer`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notificaciones'] }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Notificaciones</h1>
        <p className="text-sm text-secondary">Avisos sobre fichas, calificaciones y anuncios</p>
      </div>

      <Card>
        <CardHeader title="Bandeja de entrada" />
        <div className="space-y-3 px-5 pb-5">
          {isLoading && <Spinner />}
          {!isLoading && (!data || data.length === 0) && <EmptyState mensaje="No tiene notificaciones" />}
          {(data ?? []).map((n) => (
            <div
              key={n.id}
              className={`flex items-start gap-3 rounded-lg p-4 ${n.leidaEn ? 'bg-surface opacity-70' : 'bg-elevated'}`}
            >
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                <BellRing size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-primary">{n.titulo}</p>
                <p className="mt-0.5 text-sm text-secondary">{n.mensaje}</p>
                <p className="mt-1 text-xs text-muted">{formatearFechaLarga(n.fechaCrea)}</p>
              </div>
              {!n.leidaEn && (
                <button
                  onClick={() => marcarLeida.mutate(n.id)}
                  className="rounded-md border border-line p-2 text-secondary transition-colors hover:text-success"
                  aria-label="Marcar como leída"
                >
                  <Check size={15} />
                </button>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
