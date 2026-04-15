import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Cell, FunnelChart, Funnel, LabelList,
} from 'recharts';
import { Users, CheckCircle, Clock, TrendingUp, ArrowUp, ArrowDown } from 'lucide-react';
import api from '../../services/api';
import PageHeader from '../../components/ui/PageHeader';

const DIM_COLORS = ['#2563EB','#059669','#D97706','#DC2626','#7C3AED','#0891B2','#9333EA'];

function StatCard({ icon: Icon, label, value, sub, color = 'text-slate-800' }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        <Icon className="w-4 h-4 text-slate-300" />
      </div>
      <p className={`text-3xl font-bold tracking-tight ${color}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

function EmbudoChart({ data }) {
  if (!data) return null;
  const items = [
    { name: 'Invitados',    value: parseInt(data.invitados  || 0), fill: '#DBEAFE', stroke: '#2563EB' },
    { name: 'Iniciados',    value: parseInt(data.iniciados  || 0), fill: '#D1FAE5', stroke: '#059669' },
    { name: 'Completados',  value: parseInt(data.completados|| 0), fill: '#FEF3C7', stroke: '#D97706' },
  ];
  return (
    <div className="space-y-3">
      {items.map((item, i) => {
        const pct = items[0].value ? Math.round((item.value / items[0].value) * 100) : 0;
        return (
          <div key={item.name}>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-sm font-medium text-slate-700">{item.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-800">{item.value}</span>
                <span className="text-xs text-slate-400">{pct}%</span>
              </div>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, background: item.stroke }}
              />
            </div>
          </div>
        );
      })}
      {parseInt(data.expirados || 0) > 0 && (
        <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
          <div className="w-2 h-2 rounded-full bg-slate-300"/>
          <span>{data.expirados} expirados sin completar</span>
        </div>
      )}
    </div>
  );
}

function ActividadChart({ data }) {
  if (!data?.length) return (
    <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
      Sin actividad en los últimos 30 días
    </div>
  );

  // Rellenar días sin actividad
  const map = {};
  data.forEach(d => { map[d.fecha?.slice(0,10)] = parseInt(d.completados); });
  const dias = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0,10);
    dias.push({
      fecha: d.toLocaleDateString('es-DO', { day:'numeric', month:'short' }),
      completados: map[key] || 0,
    });
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={dias} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
        <XAxis
          dataKey="fecha"
          tick={{ fontSize: 10, fill: '#94A3B8' }}
          tickLine={false}
          axisLine={false}
          interval={4}
        />
        <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }}
          formatter={v => [v, 'Completados']}
        />
        <Bar dataKey="completados" fill="#2563EB" radius={[3, 3, 0, 0]} maxBarSize={16} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function DistribucionChart({ data }) {
  if (!data?.length) return (
    <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
      Sin datos de dimensiones
    </div>
  );

  const chartData = data.map(d => ({
    dimension: d.codigo || d.dimension,
    nombre: d.dimension,
    promedio: parseFloat(d.promedio) || 0,
    min: parseFloat(d.minimo) || 0,
    max: parseFloat(d.maximo) || 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
        <XAxis dataKey="dimension" tick={{ fontSize: 11, fill: '#64748B' }} tickLine={false} axisLine={false} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }}
          formatter={(v, name) => [`${v}%`, name === 'promedio' ? 'Promedio' : name]}
          labelFormatter={(l, payload) => payload?.[0]?.payload?.nombre || l}
        />
        <Bar dataKey="promedio" radius={[4, 4, 0, 0]} maxBarSize={40}>
          {chartData.map((_, i) => (
            <Cell key={i} fill={DIM_COLORS[i % DIM_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function TasaProcesoChart({ data }) {
  if (!data?.length) return (
    <div className="flex items-center justify-center h-48 text-slate-400 text-sm">Sin procesos</div>
  );

  return (
    <div className="space-y-3">
      {data.slice(0, 8).map((p, i) => {
        const tasa = parseFloat(p.tasa) || 0;
        const color = tasa >= 70 ? '#059669' : tasa >= 40 ? '#D97706' : '#DC2626';
        return (
          <div key={i}>
            <div className="flex justify-between items-center mb-1">
              <div className="flex-1 min-w-0 mr-3">
                <p className="text-xs font-medium text-slate-700 truncate">{p.proceso}</p>
                <p className="text-xs text-slate-400">{p.completados}/{p.total} candidatos</p>
              </div>
              <span className="text-sm font-bold flex-shrink-0" style={{ color }}>{tasa}%</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${tasa}%`, background: color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function Analytics() {
  const { data, isLoading } = useQuery({
    queryKey: ['rrhh-analytics'],
    queryFn: () => api.get('/rrhh/analytics').then(r => r.data),
  });

  if (isLoading) return (
    <div className="p-8">
      <PageHeader title="Analytics" subtitle="Métricas de tus procesos de selección" />
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[1,2,3,4].map(i => <div key={i} className="card h-24 animate-pulse bg-slate-100" />)}
      </div>
    </div>
  );

  const embudo = data?.embudo || {};
  const tiempo = data?.tiempoPromedio || {};
  const tasaGlobal = embudo.invitados
    ? Math.round((embudo.completados / embudo.invitados) * 100)
    : 0;

  return (
    <div className="p-8">
      <PageHeader
        title="Analytics"
        subtitle="Métricas y tendencias de tus procesos de selección"
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={Users}
          label="Total candidatos"
          value={embudo.invitados || 0}
          sub={`${embudo.pendientes || 0} pendientes`}
        />
        <StatCard
          icon={CheckCircle}
          label="Completados"
          value={embudo.completados || 0}
          sub={`Tasa global: ${tasaGlobal}%`}
          color="text-emerald-600"
        />
        <StatCard
          icon={Clock}
          label="Tiempo promedio"
          value={tiempo.promedio_minutos ? `${tiempo.promedio_minutos} min` : '—'}
          sub={tiempo.minimo_minutos ? `Rango: ${tiempo.minimo_minutos}–${tiempo.maximo_minutos} min` : 'Sin datos'}
          color="text-brand-600"
        />
        <StatCard
          icon={TrendingUp}
          label="Tasa de completitud"
          value={`${tasaGlobal}%`}
          sub={`${embudo.expirados || 0} expirados`}
          color={tasaGlobal >= 60 ? 'text-emerald-600' : 'text-amber-600'}
        />
      </div>

      {/* Fila 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Embudo */}
        <div className="card p-6">
          <h2 className="text-sm font-bold text-slate-800 mb-5">Embudo de selección</h2>
          <EmbudoChart data={embudo} />
        </div>

        {/* Actividad diaria */}
        <div className="card p-6 lg:col-span-2">
          <h2 className="text-sm font-bold text-slate-800 mb-4">Actividad — últimos 30 días</h2>
          <ActividadChart data={data?.actividadDiaria} />
        </div>
      </div>

      {/* Fila 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Distribución por dimensión */}
        <div className="card p-6">
          <h2 className="text-sm font-bold text-slate-800 mb-1">Puntaje promedio por dimensión</h2>
          <p className="text-xs text-slate-400 mb-4">Promedio de todos los candidatos evaluados</p>
          <DistribucionChart data={data?.distribucion} />

          {/* Leyenda dimensiones */}
          {data?.distribucion?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {data.distribucion.map((d, i) => (
                <span key={d.codigo} className="text-xs text-slate-500 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full inline-block" style={{ background: DIM_COLORS[i % DIM_COLORS.length] }}/>
                  {d.codigo} = {d.dimension}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Tasa por proceso */}
        <div className="card p-6">
          <h2 className="text-sm font-bold text-slate-800 mb-1">Tasa de completitud por proceso</h2>
          <p className="text-xs text-slate-400 mb-4">Últimos 8 procesos</p>
          <TasaProcesoChart data={data?.porProceso} />
        </div>
      </div>

      {/* Top dimensiones */}
      {data?.topDimensiones?.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-6">
            <h2 className="text-sm font-bold text-slate-800 mb-4">Dimensiones más altas</h2>
            <div className="space-y-3">
              {data.topDimensiones.slice(0, 3).map((d, i) => (
                <div key={d.codigo} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ background: DIM_COLORS[i] }}>
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-slate-700">{d.dimension}</span>
                      <span className="text-sm font-bold" style={{ color: DIM_COLORS[i] }}>{d.promedio}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${d.promedio}%`, background: DIM_COLORS[i] }} />
                    </div>
                  </div>
                  <ArrowUp className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                </div>
              ))}
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-sm font-bold text-slate-800 mb-4">Dimensiones más bajas</h2>
            <div className="space-y-3">
              {[...data.topDimensiones].reverse().slice(0, 3).map((d, i) => (
                <div key={d.codigo} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0 bg-slate-400">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-slate-700">{d.dimension}</span>
                      <span className="text-sm font-bold text-slate-600">{d.promedio}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-slate-400" style={{ width: `${d.promedio}%` }} />
                    </div>
                  </div>
                  <ArrowDown className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
