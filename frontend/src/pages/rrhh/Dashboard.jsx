import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LineChart, Line,
} from 'recharts';
import {
  Building2, Key, Users, ClipboardList,
  TrendingUp, CheckCircle, Clock, ArrowRight,
  ArrowUp, ArrowDown,
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const DIM_COLORS = ['#2563EB','#059669','#D97706','#DC2626','#7C3AED','#0891B2'];

function KPI({ label, value, sub, color = 'text-slate-800', icon: Icon }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        <Icon className="w-4 h-4 text-slate-300" />
      </div>
      <p className={`text-3xl font-bold tracking-tight ${color}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function RrhhDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: dash } = useQuery({
    queryKey: ['rrhh-dashboard'],
    queryFn: () => api.get('/rrhh/dashboard').then(r => r.data),
  });

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['rrhh-analytics'],
    queryFn: () => api.get('/rrhh/analytics').then(r => r.data),
  });

  const { data: procesos = [] } = useQuery({
    queryKey: ['rrhh-procesos'],
    queryFn: () => api.get('/rrhh/procesos').then(r => r.data),
  });

  const embudo = analytics?.embudo || {};
  const tasaGlobal = embudo.invitados
    ? Math.round((embudo.completados / embudo.invitados) * 100) : 0;
  const tiempo = analytics?.tiempoPromedio || {};

  // Actividad últimos 30 días
  const map = {};
  (analytics?.actividadDiaria || []).forEach(d => { map[d.fecha?.slice(0,10)] = parseInt(d.completados); });
  const actividadDias = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0,10);
    actividadDias.push({
      fecha: d.toLocaleDateString('es-DO', { day:'numeric', month:'short' }),
      completados: map[key] || 0,
    });
  }

  const procesosActivos = procesos.filter(p => p.estado === 'activo');

  return (
    <div className="p-8">
      {/* Saludo */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Bienvenido, {user?.nombre?.split(' ')[0]} 👋
        </h1>
        <p className="text-sm text-slate-500 mt-1">{user?.empresa_nombre} · Resumen de hoy</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <KPI label="Total candidatos"    value={embudo.invitados || dash?.candidatos_evaluados || 0} sub={`${embudo.pendientes || 0} pendientes`}        icon={Users}        color="text-slate-800" />
        <KPI label="Completados"         value={embudo.completados || 0}  sub={`Tasa global: ${tasaGlobal}%`}      icon={CheckCircle}  color="text-emerald-600" />
        <KPI label="Tiempo promedio"     value={tiempo.promedio_minutos ? `${tiempo.promedio_minutos} min` : (dash?.licencias_disponibles ? `${dash.licencias_disponibles} lic.` : '—')} sub={tiempo.minimo_minutos ? `Rango: ${tiempo.minimo_minutos}–${tiempo.maximo_minutos} min` : 'Sin evaluaciones aún'} icon={Clock} color="text-brand-600" />
        <KPI label="Procesos activos"    value={dash?.procesos_activos || procesosActivos.length || 0} sub={`${dash?.empresas_cliente || 0} empresas cliente`} icon={ClipboardList} color="text-purple-600" />
      </div>

      {/* Fila 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

        {/* Embudo */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-bold text-slate-800">Embudo de selección</h2>
            <TrendingUp className="w-4 h-4 text-slate-300" />
          </div>
          {embudo.invitados > 0 ? (
            <div className="space-y-4">
              {[
                { label:'Invitados',   value: parseInt(embudo.invitados||0),   color:'#2563EB' },
                { label:'Iniciados',   value: parseInt(embudo.iniciados||0),    color:'#059669' },
                { label:'Completados', value: parseInt(embudo.completados||0),  color:'#D97706' },
              ].map(item => {
                const pct = embudo.invitados ? Math.round((item.value/embudo.invitados)*100) : 0;
                return (
                  <div key={item.label}>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-sm text-slate-600">{item.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-800">{item.value}</span>
                        <span className="text-xs text-slate-400 w-8 text-right">{pct}%</span>
                      </div>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width:`${pct}%`, background:item.color }} />
                    </div>
                  </div>
                );
              })}
              {parseInt(embudo.expirados||0) > 0 && (
                <p className="text-xs text-slate-400 pt-1">{embudo.expirados} expirados sin completar</p>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-32 text-slate-400">
              <Users className="w-8 h-8 text-slate-200 mb-2" />
              <p className="text-xs">Sin candidatos aún</p>
            </div>
          )}
        </div>

        {/* Actividad */}
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-800">Evaluaciones completadas — 30 días</h2>
          </div>
          {actividadDias.some(d => d.completados > 0) ? (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={actividadDias} margin={{ top:4, right:4, bottom:4, left:-20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="fecha" tick={{ fontSize:10, fill:'#94A3B8' }} tickLine={false} axisLine={false} interval={6} />
                <YAxis tick={{ fontSize:10, fill:'#94A3B8' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ fontSize:12, borderRadius:8, border:'1px solid #E2E8F0' }} formatter={v=>[v,'Completados']} />
                <Bar dataKey="completados" fill="#2563EB" radius={[3,3,0,0]} maxBarSize={14} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-slate-400">
              <CheckCircle className="w-8 h-8 text-slate-200 mb-2" />
              <p className="text-xs">Sin actividad en los últimos 30 días</p>
            </div>
          )}
        </div>
      </div>

      {/* Fila 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

        {/* Dimensiones */}
        <div className="card p-6">
          <h2 className="text-sm font-bold text-slate-800 mb-1">Puntaje promedio por dimensión</h2>
          <p className="text-xs text-slate-400 mb-4">Todos los candidatos evaluados</p>
          {analytics?.distribucion?.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={analytics.distribucion.map(d => ({ ...d, promedio: parseFloat(d.promedio)||0 }))}
                  margin={{ top:4, right:4, bottom:4, left:-20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="codigo" tick={{ fontSize:11, fill:'#64748B' }} tickLine={false} axisLine={false} />
                  <YAxis domain={[0,100]} tick={{ fontSize:10, fill:'#94A3B8' }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ fontSize:12, borderRadius:8, border:'1px solid #E2E8F0' }}
                    formatter={(v,_,{payload}) => [`${v}%`, payload?.dimension]} />
                  <Bar dataKey="promedio" radius={[4,4,0,0]} maxBarSize={36}>
                    {analytics.distribucion.map((_,i) => <Cell key={i} fill={DIM_COLORS[i%DIM_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                {analytics.distribucion.map((d,i) => (
                  <span key={d.codigo} className="text-xs text-slate-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full inline-block" style={{ background:DIM_COLORS[i%DIM_COLORS.length] }}/>
                    {d.codigo}={d.dimension}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-slate-400">
              <p className="text-xs">Sin evaluaciones completadas aún</p>
            </div>
          )}
        </div>

        {/* Procesos recientes */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-800">Procesos activos</h2>
            <button onClick={() => navigate('/rrhh/procesos')}
              className="text-xs text-brand-600 font-semibold hover:underline flex items-center gap-1">
              Ver todos <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {procesosActivos.length > 0 ? (
            <div className="divide-y divide-slate-50">
              {procesosActivos.slice(0,5).map(p => {
                const pct = p.total_candidatos
                  ? Math.round((p.completados/p.total_candidatos)*100) : 0;
                return (
                  <div key={p.id} className="px-6 py-3.5 hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => navigate('/rrhh/procesos')}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="min-w-0 flex-1 mr-3">
                        <p className="text-sm font-semibold text-slate-800 truncate">{p.nombre}</p>
                        <p className="text-xs text-slate-400">{p.empresa_cliente_nombre} · {p.total_candidatos} candidatos</p>
                      </div>
                      <span className="text-xs font-bold text-slate-600 flex-shrink-0">{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-brand-500 transition-all"
                        style={{ width:`${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-slate-400">
              <ClipboardList className="w-8 h-8 text-slate-200 mb-2" />
              <p className="text-xs">Sin procesos activos</p>
              <button onClick={() => navigate('/rrhh/procesos')}
                className="mt-3 text-xs text-brand-600 font-semibold hover:underline">
                Crear proceso →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Top/Bottom dimensiones */}
      {analytics?.topDimensiones?.length > 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-6">
            <h2 className="text-sm font-bold text-slate-800 mb-4">Fortalezas del grupo</h2>
            <div className="space-y-3">
              {analytics.topDimensiones.slice(0,3).map((d,i) => (
                <div key={d.codigo} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ background:DIM_COLORS[i] }}>{i+1}</div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-slate-700">{d.dimension}</span>
                      <span className="text-sm font-bold" style={{ color:DIM_COLORS[i] }}>{d.promedio}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width:`${d.promedio}%`, background:DIM_COLORS[i] }} />
                    </div>
                  </div>
                  <ArrowUp className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                </div>
              ))}
            </div>
          </div>
          <div className="card p-6">
            <h2 className="text-sm font-bold text-slate-800 mb-4">Áreas de oportunidad</h2>
            <div className="space-y-3">
              {[...analytics.topDimensiones].reverse().slice(0,3).map((d,i) => (
                <div key={d.codigo} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0 bg-slate-400">{i+1}</div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-slate-700">{d.dimension}</span>
                      <span className="text-sm font-bold text-slate-500">{d.promedio}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-slate-300" style={{ width:`${d.promedio}%` }} />
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