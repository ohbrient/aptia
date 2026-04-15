import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip
} from 'recharts';
import { ArrowLeft, Users, Download, CheckCircle } from 'lucide-react';
import api from '../../services/api';

const COLORES = ['#2563EB', '#059669', '#D97706', '#DC2626', '#7C3AED'];
const COLORES_BG = ['#DBEAFE', '#D1FAE5', '#FEF3C7', '#FEE2E2', '#EDE9FE'];

function RadarCandidato({ candidatos, seleccionados }) {
  const activos = candidatos.filter(c => seleccionados.includes(c.id));
  if (activos.length === 0) return (
    <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
      Selecciona al menos un candidato
    </div>
  );

  // Construir datos para el radar
  const dimensiones = activos[0]?.resultados?.map(r => r.dimension) || [];
  const data = dimensiones.map(dim => {
    const punto = { dimension: dim };
    activos.forEach((c, i) => {
      const res = c.resultados?.find(r => r.dimension === dim);
      punto[`c${i}`] = res ? parseFloat(res.puntaje_pct) : 0;
    });
    return punto;
  });

  return (
    <ResponsiveContainer width="100%" height={380}>
      <RadarChart data={data} margin={{ top: 20, right: 40, bottom: 20, left: 40 }}>
        <PolarGrid stroke="#E2E8F0" />
        <PolarAngleAxis
          dataKey="dimension"
          tick={{ fontSize: 12, fill: '#64748B', fontFamily: 'Plus Jakarta Sans' }}
        />
        <PolarRadiusAxis
          angle={90} domain={[0, 100]}
          tick={{ fontSize: 10, fill: '#94A3B8' }}
          tickCount={5}
        />
        {activos.map((c, i) => (
          <Radar
            key={c.id}
            name={`${c.nombre} ${c.apellido || ''}`}
            dataKey={`c${i}`}
            stroke={COLORES[i]}
            fill={COLORES[i]}
            fillOpacity={0.12}
            strokeWidth={2}
            dot={{ fill: COLORES[i], r: 4 }}
          />
        ))}
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 12, fontFamily: 'Plus Jakarta Sans' }}
        />
        <Tooltip
          formatter={(v, name) => [`${v}%`, name]}
          contentStyle={{
            fontSize: 12,
            fontFamily: 'Plus Jakarta Sans',
            border: '1px solid #E2E8F0',
            borderRadius: 8,
          }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}

function TablaCandidatos({ candidatos, seleccionados, onToggle }) {
  if (!candidatos.length) return null;
  const dimensiones = candidatos[0]?.resultados?.map(r => ({ dim: r.dimension, cod: r.codigo })) || [];

  const nivelColor = (nivel) => {
    const m = { muy_alto:'text-emerald-700 bg-emerald-50', alto:'text-blue-700 bg-blue-50',
      moderado:'text-amber-700 bg-amber-50', bajo:'text-orange-700 bg-orange-50', muy_bajo:'text-red-700 bg-red-50' };
    return m[nivel] || 'text-slate-600 bg-slate-50';
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50">
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-8"></th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Candidato</th>
            {dimensiones.map(d => (
              <th key={d.cod} className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {d.cod}
              </th>
            ))}
            <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Promedio</th>
          </tr>
        </thead>
        <tbody>
          {candidatos.map((c, idx) => {
            const sel = seleccionados.includes(c.id);
            const resultados = c.resultados || [];
            const promedio = resultados.length
              ? Math.round(resultados.reduce((acc, r) => acc + parseFloat(r.puntaje_pct || 0), 0) / resultados.length)
              : 0;

            return (
              <tr
                key={c.id}
                onClick={() => onToggle(c.id)}
                className={`border-b border-slate-50 cursor-pointer transition-colors ${
                  sel ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-slate-50'
                }`}
              >
                <td className="px-4 py-3">
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                    sel ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                  }`}>
                    {sel && <CheckCircle className="w-3 h-3 text-white" />}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-7 h-7 rounded-full text-white text-xs font-bold flex items-center justify-center flex-shrink-0"
                      style={{ background: sel ? COLORES[seleccionados.indexOf(c.id)] : '#94A3B8' }}
                    >
                      {c.nombre[0]}{c.apellido?.[0] || ''}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">{c.nombre} {c.apellido}</p>
                      <p className="text-xs text-slate-400">{c.email}</p>
                    </div>
                  </div>
                </td>
                {dimensiones.map(d => {
                  const r = resultados.find(x => x.codigo === d.cod);
                  return (
                    <td key={d.cod} className="px-3 py-3 text-center">
                      {r ? (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${nivelColor(r.nivel)}`}>
                          {Math.round(r.puntaje_pct)}%
                        </span>
                      ) : <span className="text-slate-300 text-xs">—</span>}
                    </td>
                  );
                })}
                <td className="px-4 py-3 text-center">
                  <span className="text-sm font-bold text-slate-800">{promedio}%</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function CompararCandidatos() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [seleccionados, setSeleccionados] = useState([]);

  const { data, isLoading } = useQuery({
    queryKey: ['comparar', id],
    queryFn: () => api.get(`/rrhh/procesos/${id}/comparar`).then(r => r.data),
  });

  const toggleCandidato = (cid) => {
    setSeleccionados(s => {
      if (s.includes(cid)) return s.filter(x => x !== cid);
      if (s.length >= 5) return s; // máx 5
      return [...s, cid];
    });
  };

  const seleccionarTodos = () => {
    const ids = (data?.candidatos || []).slice(0, 5).map(c => c.id);
    setSeleccionados(ids);
  };

  const generarPDF = () => {
    window.print();
  };

  if (isLoading) return (
    <div className="p-8 text-slate-400 text-sm">Cargando comparación...</div>
  );

  const candidatos = data?.candidatos || [];
  const proceso = data?.proceso;

  return (
    <div className="p-8 print:p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 print:hidden">
        <button onClick={() => navigate('/rrhh/procesos')} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
          <ArrowLeft className="w-4 h-4 text-slate-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Comparación de candidatos</h1>
          <p className="text-sm text-slate-500">{proceso?.nombre} · {candidatos.length} candidatos completados</p>
        </div>
        <div className="flex items-center gap-2">
          {candidatos.length > 1 && (
            <button onClick={seleccionarTodos} className="btn-secondary text-xs py-1.5 px-3">
              Seleccionar todos
            </button>
          )}
          <button onClick={generarPDF} className="btn-primary text-xs py-1.5 px-3">
            <Download className="w-3.5 h-3.5" /> Exportar
          </button>
        </div>
      </div>

      {candidatos.length === 0 ? (
        <div className="card p-12 text-center">
          <Users className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">No hay candidatos que hayan completado la evaluación aún.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Instrucción */}
          <div className="bg-brand-50 border border-brand-200 rounded-xl px-5 py-3 text-sm text-brand-800 print:hidden">
            Selecciona hasta 5 candidatos para comparar en el radar. Haz clic en cualquier fila.
            <span className="ml-2 font-semibold">{seleccionados.length} seleccionado(s)</span>
          </div>

          {/* Radar chart */}
          <div className="card p-6">
            <h2 className="text-sm font-bold text-slate-800 mb-4">Perfil comparativo — radar</h2>
            <RadarCandidato candidatos={candidatos} seleccionados={seleccionados} />
          </div>

          {/* Tabla de puntuaciones */}
          <div className="card overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-800">Puntuaciones por dimensión</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Códigos: {candidatos[0]?.resultados?.map(r => `${r.codigo}=${r.dimension}`).join(' · ')}
              </p>
            </div>
            <TablaCandidatos
              candidatos={candidatos}
              seleccionados={seleccionados}
              onToggle={toggleCandidato}
            />
          </div>

          {/* Ranking por promedio */}
          {seleccionados.length > 1 && (
            <div className="card p-6">
              <h2 className="text-sm font-bold text-slate-800 mb-4">Ranking de candidatos seleccionados</h2>
              <div className="space-y-3">
                {candidatos
                  .filter(c => seleccionados.includes(c.id))
                  .map(c => {
                    const resultados = c.resultados || [];
                    const promedio = resultados.length
                      ? Math.round(resultados.reduce((acc, r) => acc + parseFloat(r.puntaje_pct || 0), 0) / resultados.length)
                      : 0;
                    const colorIdx = seleccionados.indexOf(c.id);
                    return { ...c, promedio, colorIdx };
                  })
                  .sort((a, b) => b.promedio - a.promedio)
                  .map((c, pos) => (
                    <div key={c.id} className="flex items-center gap-4">
                      <span className="text-lg font-bold text-slate-300 w-6">#{pos + 1}</span>
                      <div
                        className="w-8 h-8 rounded-full text-white text-xs font-bold flex items-center justify-content flex-shrink-0"
                        style={{ background: COLORES[c.colorIdx], display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        {c.nombre[0]}{c.apellido?.[0] || ''}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-semibold text-slate-800">{c.nombre} {c.apellido}</span>
                          <span className="text-sm font-bold" style={{ color: COLORES[c.colorIdx] }}>{c.promedio}%</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${c.promedio}%`, background: COLORES[c.colorIdx] }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
