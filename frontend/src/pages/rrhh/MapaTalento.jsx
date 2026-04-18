import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine
} from 'recharts';
import { Users, Filter, Target } from 'lucide-react';
import api from '../../services/api';
import PageHeader from '../../components/ui/PageHeader';

const TIPOS = [
  { key: '', label: 'Todas las pruebas' },
  { key: 'personalidad',  label: 'Personalidad' },
  { key: 'comportamiento',label: 'Comportamiento (DISC)' },
  { key: 'inteligencia',  label: 'Inteligencia' },
  { key: 'competencias',  label: 'Competencias' },
  { key: 'clima',         label: 'Clima Laboral' },
];

const COLORES = [
  '#2563EB','#7C3AED','#059669','#D97706','#DC2626',
  '#0891B2','#9333EA','#16A34A','#EA580C','#0284C7',
];

// Tooltip personalizado
function TooltipCandidato({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-4 text-sm max-w-xs">
      <p className="font-bold text-slate-900 mb-1">{d.nombre} {d.apellido}</p>
      <p className="text-xs text-slate-500 mb-2">{d.empresa_nombre} · {d.proceso_nombre}</p>
      <div className="space-y-1">
        {d.resultados?.map(r => (
          <div key={r.codigo} className="flex items-center justify-between gap-4">
            <span className="text-xs text-slate-600">{r.dimension}</span>
            <div className="flex items-center gap-2">
              <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-brand-600 rounded-full" style={{width:`${r.puntaje}%`}}/>
              </div>
              <span className="text-xs font-bold text-slate-700 w-8 text-right">{r.puntaje}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MapaTalento() {
  const [filtroTipo,     setFiltroTipo]     = useState('');
  const [filtroEmpresa,  setFiltroEmpresa]  = useState('');
  const [filtroProceso,  setFiltroProceso]  = useState('');
  const [ejeX,           setEjeX]           = useState(0); // índice dimensión eje X
  const [ejeY,           setEjeY]           = useState(1); // índice dimensión eje Y
  const [seleccionado,   setSeleccionado]   = useState(null);

  // Cargar datos
  const params = new URLSearchParams();
  if (filtroTipo)    params.append('prueba_tipo', filtroTipo);
  if (filtroEmpresa) params.append('empresa_cliente_id', filtroEmpresa);
  if (filtroProceso) params.append('proceso_id', filtroProceso);

  const { data: candidatos = [], isLoading } = useQuery({
    queryKey: ['mapa-talento', filtroTipo, filtroEmpresa, filtroProceso],
    queryFn: () => api.get(`/rrhh/mapa-talento?${params}`).then(r => r.data),
  });

  const { data: empresas = [] } = useQuery({
    queryKey: ['rrhh-clientes'],
    queryFn: () => api.get('/rrhh/empresas-cliente').then(r => r.data),
  });

  const { data: procesos = [] } = useQuery({
    queryKey: ['rrhh-procesos'],
    queryFn: () => api.get('/rrhh/procesos').then(r => r.data),
  });

  // Dimensiones disponibles en los datos actuales
  const dimensiones = useMemo(() => {
    const set = new Map();
    candidatos.forEach(c => {
      c.resultados?.forEach((r, i) => {
        if (!set.has(r.codigo)) set.set(r.codigo, { codigo: r.codigo, nombre: r.dimension, idx: i });
      });
    });
    return Array.from(set.values());
  }, [candidatos]);

  // Preparar puntos para el scatter
  const puntos = useMemo(() => {
    const dimX = dimensiones[ejeX];
    const dimY = dimensiones[ejeY];
    if (!dimX || !dimY) return [];

    return candidatos.map((c, i) => {
      const rx = c.resultados?.find(r => r.codigo === dimX.codigo);
      const ry = c.resultados?.find(r => r.codigo === dimY.codigo);
      if (!rx || !ry) return null;
      return {
        ...c,
        x: rx.puntaje,
        y: ry.puntaje,
        color: COLORES[i % COLORES.length],
      };
    }).filter(Boolean);
  }, [candidatos, dimensiones, ejeX, ejeY]);

  // Agrupar por empresa para leyenda
  const empresaGrupos = useMemo(() => {
    const map = new Map();
    puntos.forEach(p => {
      if (!map.has(p.empresa_nombre)) map.set(p.empresa_nombre, []);
      map.get(p.empresa_nombre).push(p);
    });
    return Array.from(map.entries());
  }, [puntos]);

  const dimX = dimensiones[ejeX];
  const dimY = dimensiones[ejeY];

  return (
    <div className="p-8">
      <PageHeader
        title="Mapa de Talento"
        subtitle="Visualiza y compara candidatos según sus dimensiones psicométricas"
      />

      {/* Filtros */}
      <div className="card p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-slate-400"/>
          <span className="text-sm font-semibold text-slate-700">Filtros</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="label">Tipo de prueba</label>
            <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className="input">
              {TIPOS.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Empresa cliente</label>
            <select value={filtroEmpresa} onChange={e => setFiltroEmpresa(e.target.value)} className="input">
              <option value="">Todas las empresas</option>
              {empresas.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Proceso</label>
            <select value={filtroProceso} onChange={e => setFiltroProceso(e.target.value)} className="input">
              <option value="">Todos los procesos</option>
              {procesos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="label">Eje X</label>
              <select value={ejeX} onChange={e => setEjeX(parseInt(e.target.value))} className="input" disabled={dimensiones.length < 2}>
                {dimensiones.map((d, i) => <option key={d.codigo} value={i}>{d.nombre}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="label">Eje Y</label>
              <select value={ejeY} onChange={e => setEjeY(parseInt(e.target.value))} className="input" disabled={dimensiones.length < 2}>
                {dimensiones.map((d, i) => <option key={d.codigo} value={i}>{d.nombre}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Candidatos</p>
          <p className="text-2xl font-bold text-slate-900">{puntos.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Empresas</p>
          <p className="text-2xl font-bold text-slate-900">{empresaGrupos.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Dimensiones</p>
          <p className="text-2xl font-bold text-slate-900">{dimensiones.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Scatter plot */}
        <div className="lg:col-span-3 card p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-96 text-slate-400 text-sm">Cargando datos...</div>
          ) : puntos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-96 text-center">
              <Target className="w-12 h-12 text-slate-200 mb-3"/>
              <p className="text-slate-400 text-sm font-medium">No hay candidatos completados</p>
              <p className="text-xs text-slate-300 mt-1">Ajusta los filtros o espera a que los candidatos completen sus evaluaciones</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-slate-800">
                  {dimX?.nombre} vs {dimY?.nombre}
                </h2>
                <span className="text-xs text-slate-400">{puntos.length} candidatos</span>
              </div>
              <ResponsiveContainer width="100%" height={420}>
                <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9"/>
                  <XAxis
                    type="number" dataKey="x" domain={[0, 100]}
                    name={dimX?.nombre}
                    label={{ value: dimX?.nombre, position: 'insideBottom', offset: -15, style: { fontSize: 11, fill: '#94A3B8' } }}
                    tick={{ fontSize: 11, fill: '#94A3B8' }}
                  />
                  <YAxis
                    type="number" dataKey="y" domain={[0, 100]}
                    name={dimY?.nombre}
                    label={{ value: dimY?.nombre, angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 11, fill: '#94A3B8' } }}
                    tick={{ fontSize: 11, fill: '#94A3B8' }}
                  />
                  <ReferenceLine x={50} stroke="#E2E8F0" strokeDasharray="4 4"/>
                  <ReferenceLine y={50} stroke="#E2E8F0" strokeDasharray="4 4"/>
                  <Tooltip content={<TooltipCandidato/>}/>
                  <Scatter
                    data={puntos}
                    onClick={(d) => setSeleccionado(d.id === seleccionado ? null : d.id)}
                  >
                    {puntos.map((p, i) => (
                      <Cell
                        key={p.id}
                        fill={p.color}
                        stroke={seleccionado === p.id ? '#0F172A' : 'transparent'}
                        strokeWidth={2}
                        r={seleccionado === p.id ? 10 : 7}
                        style={{ cursor: 'pointer', opacity: seleccionado && seleccionado !== p.id ? 0.35 : 1 }}
                      />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>

              {/* Cuadrantes */}
              <div className="grid grid-cols-4 gap-2 mt-4">
                {[
                  { label: 'Bajo-Bajo', desc: 'Área de desarrollo', color: 'bg-red-50 text-red-600' },
                  { label: 'Alto-Bajo', desc: `Alto en ${dimX?.nombre}`, color: 'bg-amber-50 text-amber-600' },
                  { label: 'Bajo-Alto', desc: `Alto en ${dimY?.nombre}`, color: 'bg-blue-50 text-blue-600' },
                  { label: 'Alto-Alto', desc: 'Perfil destacado', color: 'bg-emerald-50 text-emerald-700' },
                ].map(q => (
                  <div key={q.label} className={`rounded-xl p-3 text-center ${q.color}`}>
                    <p className="text-xs font-bold">{q.label}</p>
                    <p className="text-xs opacity-75 mt-0.5">{q.desc}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Panel lateral — candidatos */}
        <div className="card p-4 overflow-y-auto max-h-[600px]">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-slate-400"/>
            <h3 className="text-sm font-bold text-slate-700">Candidatos</h3>
          </div>
          {puntos.length === 0 ? (
            <p className="text-xs text-slate-400 text-center mt-8">Sin datos</p>
          ) : (
            <div className="space-y-2">
              {puntos.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSeleccionado(p.id === seleccionado ? null : p.id)}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${
                    seleccionado === p.id
                      ? 'border-brand-400 bg-brand-50'
                      : 'border-slate-100 hover:border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{background: p.color}}/>
                    <span className="text-xs font-semibold text-slate-800 truncate">{p.nombre} {p.apellido}</span>
                  </div>
                  <p className="text-xs text-slate-400 truncate pl-5">{p.empresa_nombre}</p>
                  <div className="flex gap-2 mt-1.5 pl-5">
                    <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                      {dimX?.codigo}: {p.x}%
                    </span>
                    <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                      {dimY?.codigo}: {p.y}%
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
