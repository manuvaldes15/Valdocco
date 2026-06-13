import { useQuery } from '@tanstack/react-query';
import { BookOpen, CheckSquare, ClipboardList, Users } from 'lucide-react';
import { api } from '../../lib/api';
import { Badge, Card, CardHeader, EmptyState, KpiCard, Spinner, Table } from '../../components/ui';
import { formatearFecha } from '../../lib/format';

interface DashboardMaestroData {
  kpis: {
    alumnosACargo: number;
    secciones: number;
    actividadesPendientesCalificar: number;
    fichasEmitidas: number;
  };
  asignaciones: {
    id: string;
    materia: { nombre: string; colorHex: string | null };
    seccion: { nombre: string; turno: string; grado: { nombre: string } };
    horasSemanales: string | null;
  }[];
  actividadesProximas: {
    id: string;
    titulo: string;
    tipo: string;
    fechaEntrega: string;
    seccionMateria: { materia: { nombre: string }; seccion: { nombre: string; grado: { nombre: string } } };
  }[];
}

export function DashboardMaestro() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-maestro'],
    queryFn: async () => (await api<DashboardMaestroData>('/api/reportes/dashboard/maestro')).data,
  });

  if (isLoading || !data) return <Spinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Mi panel docente</h1>
        <p className="text-sm text-secondary">Secciones, actividades y seguimiento de mis alumnos</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Alumnos a cargo" value={data.kpis.alumnosACargo} icon={<Users size={18} />} destacado />
        <KpiCard label="Secciones" value={data.kpis.secciones} icon={<BookOpen size={18} />} />
        <KpiCard
          label="Pendientes de calificar"
          value={data.kpis.actividadesPendientesCalificar}
          icon={<CheckSquare size={18} />}
        />
        <KpiCard label="Fichas emitidas" value={data.kpis.fichasEmitidas} icon={<ClipboardList size={18} />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Mis asignaciones" subtitle="Materias y secciones de este año" />
          <div className="px-5 pb-5">
            {data.asignaciones.length === 0 ? (
              <EmptyState mensaje="Sin asignaciones registradas" />
            ) : (
              <Table headers={['Materia', 'Sección', 'Turno', 'Horas']}>
                {data.asignaciones.map((a) => (
                  <tr key={a.id} className="odd:bg-surface even:bg-elevated/50">
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2 text-sm font-medium text-primary">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ background: a.materia.colorHex ?? 'var(--color-accent)' }}
                        />
                        {a.materia.nombre}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-secondary">
                      {a.seccion.grado.nombre} "{a.seccion.nombre}"
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={a.seccion.turno === 'MANANA' ? 'accent' : 'warning'}>
                        {a.seccion.turno === 'MANANA' ? 'Mañana' : 'Tarde'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-mono text-sm text-secondary">{a.horasSemanales ?? '—'}</td>
                  </tr>
                ))}
              </Table>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Actividades próximas a vencer" subtitle="Próximos 7 días" />
          <div className="space-y-3 px-5 pb-5">
            {data.actividadesProximas.length === 0 && <EmptyState mensaje="Sin entregas esta semana" />}
            {data.actividadesProximas.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 rounded-lg bg-elevated p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-primary">{a.titulo}</p>
                  <p className="text-xs text-secondary">
                    {a.seccionMateria.materia.nombre} · {a.seccionMateria.seccion.grado.nombre} "
                    {a.seccionMateria.seccion.nombre}"
                  </p>
                </div>
                <div className="text-right">
                  <Badge tone="warning">{a.tipo}</Badge>
                  <p className="mt-1 text-xs text-muted">{formatearFecha(a.fechaEntrega)}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
