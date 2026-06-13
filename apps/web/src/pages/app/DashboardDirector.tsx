import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertTriangle, Award, CalendarDays, ClipboardList, GraduationCap, RefreshCw, Target, Users } from 'lucide-react';
import { api, ApiError } from '../../lib/api';
import { Badge, Card, CardHeader, EmptyState, KpiCard, Spinner } from '../../components/ui';
import { toast } from '../../components/toast';
import { formatearFecha } from '../../lib/format';

const COLORES = ['#4f8ef7', '#34d399', '#fbbf24', '#f87171', '#a78bfa'];

interface DashboardDirectorData {
  anioLectivo: string | null;
  kpis: {
    alumnosActivos: number;
    docentes: number;
    promedioGeneral: number;
    alumnosEnRiesgo: number;
    porcentajeRiesgo: number;
  };
  promedioPorGrado: { grado: string; promedio: number }[];
  distribucionEstados: { estado: string; cantidad: number }[];
  fichasRecientes: {
    id: string;
    titulo: string;
    gravedad: string;
    estado: string;
    fechaEmision: string;
    alumno: { persona: { primerNombre: string; primerApellido: string } };
  }[];
  eventosProximos: { id: string; titulo: string; fechaInicio: string; tipoEvento: string | null }[];
  cuadroHonor: {
    id: string;
    posicion: number;
    promedioGeneral: string;
    alumno: { persona: { primerNombre: string; primerApellido: string } };
  }[];
}

const tonoGravedad: Record<string, 'success' | 'warning' | 'danger'> = {
  BAJA: 'success',
  MEDIA: 'warning',
  ALTA: 'danger',
  CRITICA: 'danger',
};

export function DashboardDirector() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-director'],
    queryFn: async () => (await api<DashboardDirectorData>('/api/reportes/dashboard/director')).data,
  });

  const generarHonor = useMutation({
    mutationFn: () =>
      api<{ gradosProcesados: number }>('/api/calendario/cuadro-honor/generar', {
        method: 'POST',
        body: JSON.stringify({ top: 3 }),
      }),
    onSuccess: (res) => {
      toast.ok(`Cuadro de honor generado para ${res.data.gradosProcesados} grado(s)`);
      qc.invalidateQueries({ queryKey: ['dashboard-director'] });
      qc.invalidateQueries({ queryKey: ['cuadro-honor-publico'] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'No se pudo generar el cuadro de honor'),
  });

  if (isLoading || !data) return <Spinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Panel de dirección</h1>
        <p className="text-sm text-secondary">Año lectivo {data.anioLectivo ?? '—'} · CECMA Chalchuapa</p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Alumnos activos" value={data.kpis.alumnosActivos} icon={<GraduationCap size={18} />} destacado />
        <KpiCard label="Docentes" value={data.kpis.docentes} icon={<Users size={18} />} />
        <KpiCard label="Promedio general" value={data.kpis.promedioGeneral.toFixed(1)} icon={<Target size={18} />} />
        <KpiCard
          label="Alumnos en riesgo"
          value={data.kpis.alumnosEnRiesgo}
          icon={<AlertTriangle size={18} />}
          delta={-data.kpis.porcentajeRiesgo}
          deltaLabel="con promedio bajo la nota mínima"
        />
      </div>

      {/* Gráficas */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Promedio por grado" subtitle="Periodo actual" />
          <div className="h-72 px-3 pb-5">
            {data.promedioPorGrado.length === 0 ? (
              <EmptyState mensaje="Aún no hay calificaciones registradas" />
            ) : (
              <ResponsiveContainer>
                <BarChart data={data.promedioPorGrado}>
                  <XAxis dataKey="grado" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 10]} stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    cursor={{ fill: 'var(--color-bg-elevated)' }}
                    contentStyle={{
                      background: 'var(--color-bg-overlay)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 8,
                      color: 'var(--color-text-primary)',
                    }}
                  />
                  <Bar dataKey="promedio" fill="#4f8ef7" radius={[6, 6, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Estado de la matrícula" subtitle="Distribución de alumnos" />
          <div className="h-72 px-3 pb-5">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={data.distribucionEstados}
                  dataKey="cantidad"
                  nameKey="estado"
                  innerRadius="55%"
                  outerRadius="80%"
                  paddingAngle={4}
                  strokeWidth={0}
                >
                  {data.distribucionEstados.map((_, i) => (
                    <Cell key={i} fill={COLORES[i % COLORES.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'var(--color-bg-overlay)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 8,
                    color: 'var(--color-text-primary)',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Tres columnas inferiores */}
      <div className="grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader title="Fichas de atención" subtitle="Últimas 5 emitidas" action={<ClipboardList size={16} className="text-secondary" />} />
          <div className="space-y-3 px-5 pb-5">
            {data.fichasRecientes.length === 0 && <EmptyState mensaje="Sin fichas registradas" />}
            {data.fichasRecientes.map((f) => (
              <div key={f.id} className="flex items-center justify-between gap-3 rounded-lg bg-elevated p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-primary">{f.titulo}</p>
                  <p className="text-xs text-secondary">
                    {f.alumno.persona.primerNombre} {f.alumno.persona.primerApellido} · {formatearFecha(f.fechaEmision)}
                  </p>
                </div>
                <Badge tone={tonoGravedad[f.gravedad] ?? 'neutral'}>{f.gravedad}</Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Próximos eventos" subtitle="Calendario institucional" action={<CalendarDays size={16} className="text-secondary" />} />
          <div className="space-y-3 px-5 pb-5">
            {data.eventosProximos.length === 0 && <EmptyState mensaje="Sin eventos próximos" />}
            {data.eventosProximos.map((e) => (
              <div key={e.id} className="flex items-center gap-3 rounded-lg bg-elevated p-3">
                <span className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-md bg-accent-soft font-mono text-accent">
                  <span className="text-sm font-bold leading-none">{new Date(e.fechaInicio).getDate()}</span>
                  <span className="text-[9px] uppercase">
                    {new Date(e.fechaInicio).toLocaleDateString('es-SV', { month: 'short' })}
                  </span>
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-primary">{e.titulo}</p>
                  <p className="text-xs text-secondary">{e.tipoEvento ?? 'Evento'}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Cuadro de honor"
            subtitle="Top 3 por grado, calculado de las notas del periodo"
            action={
              <button
                onClick={() => generarHonor.mutate()}
                disabled={generarHonor.isPending}
                title="Recalcular cuadro de honor del periodo vigente"
                className="inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-xs font-semibold text-secondary transition-colors hover:bg-elevated hover:text-accent disabled:opacity-50"
              >
                <RefreshCw size={13} className={generarHonor.isPending ? 'animate-spin' : ''} />
                {generarHonor.isPending ? 'Calculando…' : 'Generar'}
              </button>
            }
          />
          <div className="space-y-3 px-5 pb-5">
            {data.cuadroHonor.length === 0 && <EmptyState mensaje="Aún no generado — use el botón Generar" />}
            {data.cuadroHonor.map((h) => (
              <div key={h.id} className="flex items-center gap-3 rounded-lg bg-elevated p-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft font-mono text-sm font-bold text-accent">
                  {h.posicion}
                </span>
                <p className="flex-1 truncate text-sm font-medium text-primary">
                  {h.alumno.persona.primerNombre} {h.alumno.persona.primerApellido}
                </p>
                <span className="font-mono text-sm font-bold text-success">{Number(h.promedioGeneral).toFixed(1)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
