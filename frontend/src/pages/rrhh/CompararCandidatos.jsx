import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { ArrowLeft, Users, Download, ChevronDown, ChevronRight, Target, ClipboardList } from 'lucide-react';
import api from '../../services/api';

const COLORES    = ['#6366F1','#059669','#D97706','#DC2626','#0EA5E9'];
const COLORES_BG = ['#EEF2FF','#D1FAE5','#FEF3C7','#FEE2E2','#E0F2FE'];

const TIPO_COLOR = {
  personalidad: '#6366F1', comportamiento: '#D97706', inteligencia: '#0EA5E9',
  competencias: '#059669', laborales: '#F97316', tecnica: '#64748B',
  '360': '#DC2626', clima: '#8B5CF6',
};
const TIPO_BG = {
  personalidad: '#EEF2FF', comportamiento: '#FEF3C7', inteligencia: '#E0F2FE',
  competencias: '#D1FAE5', laborales: '#FFEDD5', tecnica: '#F1F5F9',
  '360': '#FEE2E2', clima: '#F3E8FF',
};

function getNivel(pct) {
  const p = parseFloat(pct) || 0;
  if (p >= 81) return { label:'Alto',           color:'#059669', bg:'#D1FAE5' };
  if (p >= 56) return { label:'Medio',          color:'#D97706', bg:'#FEF3C7' };
  if (p >= 26) return { label:'Bajo',           color:'#DC2626', bg:'#FEE2E2' };
  return             { label:'No desarrollada', color:'#6366F1', bg:'#EEF2FF' };
}

// ── Radar chart ───────────────────────────────────────────
function RadarCandidato({ candidatos, seleccionados }) {
  const activos = candidatos.filter(c => seleccionados.includes(c.id));
  if (activos.length === 0) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:280, color:'#94A3B8', fontSize:13 }}>
      Selecciona candidatos para ver el radar
    </div>
  );

  // Usar solo dimensiones del primer resultado (promedio de pruebas)
  const allDims = [...new Set(activos.flatMap(c => (c.resultados||[]).map(r => r.dimension)))];
  const data = allDims.slice(0, 10).map(dim => {
    const punto = { dimension: dim.length > 12 ? dim.slice(0,12)+'…' : dim };
    activos.forEach((c, i) => {
      const matches = (c.resultados||[]).filter(r => r.dimension === dim);
      const avg = matches.length ? matches.reduce((s,r)=>s+parseFloat(r.puntaje_pct||0),0)/matches.length : 0;
      punto[`c${i}`] = Math.round(avg);
    });
    return punto;
  });

  return (
    <ResponsiveContainer width="100%" height={320}>
      <RadarChart data={data} margin={{ top:20, right:50, bottom:20, left:50 }}>
        <PolarGrid stroke="#E2E8F0" strokeDasharray="3 3"/>
        <PolarAngleAxis dataKey="dimension" tick={{ fontSize:10, fill:'#64748B' }}/>
        <PolarRadiusAxis angle={90} domain={[0,100]} tick={{ fontSize:9, fill:'#CBD5E1' }} tickCount={5}/>
        {activos.map((c, i) => (
          <Radar key={c.id} name={`${c.nombre} ${c.apellido||''}`} dataKey={`c${i}`}
            stroke={COLORES[i]} fill={COLORES[i]} fillOpacity={0.1} strokeWidth={2.5}
            dot={{ fill:COLORES[i], r:3, strokeWidth:0 }}
          />
        ))}
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize:11 }}/>
        <Tooltip formatter={(v,n)=>[`${v}%`,n]} contentStyle={{ fontSize:11, border:'1px solid #E2E8F0', borderRadius:10 }}/>
      </RadarChart>
    </ResponsiveContainer>
  );
}

// ── Detalle expandible de un candidato ───────────────────
function DetalleCandidato({ candidato, color, colorBg }) {
  const [expandedPrueba, setExpandedPrueba] = useState(null);
  const resultados = candidato.resultados || [];

  // Agrupar resultados por prueba
  const porPrueba = {};
  resultados.forEach(r => {
    const key = r.prueba_nombre || 'Evaluación';
    if (!porPrueba[key]) porPrueba[key] = { tipo: r.prueba_tipo, dims: [] };
    porPrueba[key].dims.push(r);
  });

  const pruebas = Object.entries(porPrueba);
  const promedioGeneral = resultados.length
    ? Math.round(resultados.reduce((s,r)=>s+parseFloat(r.puntaje_pct||0),0)/resultados.length)
    : 0;

  return (
    <div style={{ padding:'16px 20px 20px', background:'#FAFBFF', borderTop:`3px solid ${color}` }}>
      {/* Header candidato */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
        <div style={{ width:40, height:40, borderRadius:'50%', background:color, color:'#fff', fontSize:14, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          {candidato.nombre[0]}{candidato.apellido?.[0]||''}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:15, fontWeight:700, color:'#0F172A' }}>{candidato.nombre} {candidato.apellido}</div>
          <div style={{ fontSize:11, color:'#94A3B8' }}>{candidato.email} · Completado {candidato.fecha_completado ? new Date(candidato.fecha_completado).toLocaleDateString('es-DO') : '—'}</div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {candidato.match_score != null && (
            <div style={{
              display:'flex', alignItems:'center', gap:5,
              background: parseFloat(candidato.match_score)>=80?'#D1FAE5':parseFloat(candidato.match_score)>=60?'#FEF3C7':'#FEE2E2',
              color: parseFloat(candidato.match_score)>=80?'#065F46':parseFloat(candidato.match_score)>=60?'#92400E':'#991B1B',
              fontSize:12, fontWeight:700, padding:'4px 12px', borderRadius:100,
            }}>
              <Target size={11}/> {Math.round(candidato.match_score)}% match
            </div>
          )}
          <div style={{ background:colorBg, color:color, fontSize:14, fontWeight:800, padding:'4px 14px', borderRadius:100 }}>
            {promedioGeneral}% promedio
          </div>
        </div>
      </div>

      {/* Pruebas */}
      <div style={{ fontSize:11, fontWeight:700, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>
        {pruebas.length} prueba(s) aplicada(s)
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {pruebas.map(([nombre, grupo]) => {
          const isOpen = expandedPrueba === nombre;
          const dims   = grupo.dims;
          const prom   = dims.length ? Math.round(dims.reduce((s,d)=>s+parseFloat(d.puntaje_pct||0),0)/dims.length) : 0;
          const tc     = TIPO_COLOR[grupo.tipo] || '#64748B';
          const tb     = TIPO_BG[grupo.tipo]    || '#F1F5F9';

          return (
            <div key={nombre} style={{ background:'#fff', border:'1px solid #E2E8F0', borderRadius:12, overflow:'hidden' }}>
              {/* Header prueba */}
              <button
                onClick={() => setExpandedPrueba(isOpen ? null : nombre)}
                style={{ width:'100%', display:'flex', alignItems:'center', gap:12, padding:'12px 16px', background:'none', border:'none', cursor:'pointer', textAlign:'left' }}
              >
                <div style={{ width:32, height:32, borderRadius:8, background:tb, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <ClipboardList size={15} color={tc}/>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'#0F172A' }}>{nombre}</div>
                  <div style={{ fontSize:11, color:'#94A3B8', marginTop:1 }}>{dims.length} dimensiones</div>
                </div>
                <span style={{ background:tb, color:tc, fontSize:11, fontWeight:700, padding:'2px 10px', borderRadius:100 }}>
                  {grupo.tipo}
                </span>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ ...getNivel(prom) }}>
                    <span style={{ fontSize:14, fontWeight:800, color: getNivel(prom).color }}>{prom}%</span>
                  </div>
                  {isOpen ? <ChevronDown size={14} color="#94A3B8"/> : <ChevronRight size={14} color="#94A3B8"/>}
                </div>
              </button>

              {/* Dimensiones expandidas */}
              {isOpen && (
                <div style={{ padding:'0 16px 16px', borderTop:'1px solid #F1F5F9' }}>
                  <div style={{ paddingTop:12, display:'flex', flexDirection:'column', gap:8 }}>
                    {dims.sort((a,b)=>(a.orden||0)-(b.orden||0)).map(d => {
                      const pct = parseFloat(d.puntaje_pct) || 0;
                      const nv  = getNivel(pct);
                      return (
                        <div key={d.codigo}>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                              <span style={{ background:nv.bg, color:nv.color, fontSize:10, fontWeight:700, padding:'1px 7px', borderRadius:100 }}>{d.codigo}</span>
                              <span style={{ fontSize:12, fontWeight:500, color:'#334155' }}>{d.dimension}</span>
                            </div>
                            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                              <span style={{ fontSize:11, fontWeight:600, color:nv.color }}>{nv.label}</span>
                              <span style={{ fontSize:13, fontWeight:700, color:nv.color }}>{pct}%</span>
                            </div>
                          </div>
                          <div style={{ height:7, background:'#F1F5F9', borderRadius:100, overflow:'hidden' }}>
                            <div style={{ height:'100%', width:`${pct}%`, background:nv.color, borderRadius:100 }}/>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Promedio de la prueba */}
                  <div style={{ marginTop:12, padding:'10px 14px', background:'#F8FAFC', borderRadius:10, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontSize:12, color:'#64748B', fontWeight:500 }}>Promedio de {nombre}</span>
                    <span style={{ fontSize:15, fontWeight:800, color: getNivel(prom).color }}>{prom}% — {getNivel(prom).label}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Tabla principal ───────────────────────────────────────
function TablaCandidatos({ candidatos, seleccionados, onToggle, expandido, onExpandir }) {
  const tieneMatch = candidatos.some(c => c.match_score != null);

  return (
    <div>
      {candidatos.map((c, idx) => {
        const sel     = seleccionados.includes(c.id);
        const cidx    = seleccionados.indexOf(c.id);
        const color   = sel ? COLORES[cidx] : '#94A3B8';
        const colorBg = sel ? COLORES_BG[cidx] : '#F1F5F9';
        const isOpen  = expandido === c.id;
        const resultados = c.resultados || [];
        const promedio = resultados.length
          ? Math.round(resultados.reduce((acc,r)=>acc+parseFloat(r.puntaje_pct||0),0)/resultados.length)
          : 0;
        const pruebas = c.pruebas || [];

        return (
          <div key={c.id} style={{ borderBottom:'1px solid #F1F5F9' }}>
            {/* Fila principal */}
            <div style={{
              display:'grid', gridTemplateColumns:'40px 1fr auto auto auto auto',
              alignItems:'center', gap:12, padding:'12px 20px',
              background: sel ? (COLORES_BG[cidx]+'60') : 'transparent',
              cursor:'pointer', transition:'background 0.15s',
            }}>
              {/* Checkbox / color */}
              <div
                onClick={() => onToggle(c.id)}
                style={{
                  width:28, height:28, borderRadius:'50%',
                  background: sel ? color : '#F1F5F9',
                  color: sel ? '#fff' : '#94A3B8',
                  fontSize:11, fontWeight:700,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  cursor:'pointer', flexShrink:0,
                  border:`2px solid ${sel ? color : '#E2E8F0'}`,
                }}
              >
                {c.nombre[0]}{c.apellido?.[0]||''}
              </div>

              {/* Nombre + pruebas */}
              <div onClick={() => onExpandir(isOpen ? null : c.id)}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:14, fontWeight:600, color:'#0F172A' }}>{c.nombre} {c.apellido}</span>
                  <span style={{ fontSize:11, color:'#94A3B8' }}>{c.email}</span>
                </div>
                <div style={{ display:'flex', gap:4, marginTop:3 }}>
                  {pruebas.map(p => (
                    <span key={p.prueba_id} style={{
                      fontSize:10, fontWeight:600, padding:'1px 8px', borderRadius:100,
                      background: TIPO_BG[p.prueba_tipo]||'#F1F5F9',
                      color: TIPO_COLOR[p.prueba_tipo]||'#64748B',
                    }}>{p.prueba_nombre}</span>
                  ))}
                </div>
              </div>

              {/* Match */}
              {tieneMatch && (
                <div>
                  {c.match_score != null ? (
                    <span style={{
                      fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:100,
                      background: parseFloat(c.match_score)>=80?'#D1FAE5':parseFloat(c.match_score)>=60?'#FEF3C7':'#FEE2E2',
                      color:      parseFloat(c.match_score)>=80?'#065F46':parseFloat(c.match_score)>=60?'#92400E':'#991B1B',
                      display:'flex', alignItems:'center', gap:4,
                    }}>
                      <Target size={9}/>{Math.round(c.match_score)}%
                    </span>
                  ) : <span style={{ color:'#E2E8F0', fontSize:12 }}>—</span>}
                </div>
              )}

              {/* Promedio */}
              <div style={{ textAlign:'right' }}>
                <span style={{ fontSize:15, fontWeight:800, color }}>{promedio}%</span>
              </div>

              {/* Expand button */}
              <button
                onClick={() => onExpandir(isOpen ? null : c.id)}
                style={{ background:'none', border:'none', cursor:'pointer', padding:4, color:'#94A3B8', display:'flex', alignItems:'center', gap:4, fontSize:11 }}
              >
                {isOpen ? <><ChevronDown size={14}/> Ocultar</> : <><ChevronRight size={14}/> Ver pruebas</>}
              </button>
            </div>

            {/* Detalle expandido */}
            {isOpen && (
              <DetalleCandidato candidato={c} color={color} colorBg={colorBg}/>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Página principal ──────────────────────────────────────
export default function CompararCandidatos() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const [seleccionados, setSeleccionados] = useState([]);
  const [expandido,     setExpandido]     = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['comparar', id],
    queryFn: () => api.get(`/rrhh/procesos/${id}/comparar`).then(r => r.data),
  });

  const toggleCandidato = (cid) => {
    setSeleccionados(s => {
      if (s.includes(cid)) return s.filter(x=>x!==cid);
      if (s.length >= 5) return s;
      return [...s, cid];
    });
  };

  const seleccionarTodos = () => setSeleccionados((data?.candidatos||[]).slice(0,5).map(c=>c.id));

  if (isLoading) return <div className="p-8 text-slate-400 text-sm">Cargando comparación...</div>;

  const candidatos = data?.candidatos || [];
  const proceso    = data?.proceso;
  const activos    = candidatos.filter(c => seleccionados.includes(c.id));

  return (
    <div style={{ padding:32 }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:28 }}>
        <button onClick={()=>navigate('/rrhh/procesos')} style={{ padding:8, background:'none', border:'none', cursor:'pointer', borderRadius:8 }}
          onMouseEnter={e=>e.currentTarget.style.background='#F1F5F9'} onMouseLeave={e=>e.currentTarget.style.background='none'}>
          <ArrowLeft size={16} color="#64748B"/>
        </button>
        <div style={{ flex:1 }}>
          <h1 style={{ fontSize:20, fontWeight:800, color:'#0F172A', letterSpacing:'-0.3px', marginBottom:2 }}>Comparación de candidatos</h1>
          <p style={{ fontSize:13, color:'#94A3B8' }}>{proceso?.nombre} · {candidatos.length} candidato(s) completado(s)</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {candidatos.length > 1 && (
            <button onClick={seleccionarTodos} className="btn-secondary" style={{ fontSize:12, padding:'6px 14px' }}>Seleccionar todos para radar</button>
          )}
          <button onClick={()=>window.print()} className="btn-primary" style={{ fontSize:12, padding:'6px 14px', display:'flex', alignItems:'center', gap:6 }}>
            <Download size={13}/> Exportar
          </button>
        </div>
      </div>

      {candidatos.length === 0 ? (
        <div className="card" style={{ padding:48, textAlign:'center' }}>
          <Users size={40} color="#E2E8F0" style={{ margin:'0 auto 12px' }}/>
          <p style={{ color:'#94A3B8', fontSize:13 }}>No hay candidatos que hayan completado la evaluación aún.</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

          {/* Instrucción */}
          <div style={{ background:'#EEF2FF', border:'1px solid #C7D2FE', borderRadius:12, padding:'10px 16px', fontSize:13, color:'#4338CA', display:'flex', alignItems:'center', gap:8 }}>
            <span>Haz clic en el avatar de color para incluir en el radar · Haz clic en <strong>"Ver pruebas"</strong> para ver el detalle completo</span>
            <span style={{ marginLeft:'auto', fontWeight:700 }}>{seleccionados.length} en radar</span>
          </div>

          {/* Radar */}
          {seleccionados.length > 0 && (
            <div className="card" style={{ padding:24 }}>
              <div style={{ fontSize:14, fontWeight:700, color:'#0F172A', marginBottom:4 }}>Perfil comparativo — radar</div>
              <div style={{ fontSize:11, color:'#94A3B8', marginBottom:16 }}>Promedio de todas las pruebas por dimensión</div>
              <RadarCandidato candidatos={candidatos} seleccionados={seleccionados}/>
            </div>
          )}

          {/* Lista candidatos con expandir */}
          <div className="card" style={{ overflow:'hidden' }}>
            <div style={{ padding:'14px 20px', borderBottom:'1px solid #F1F5F9', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ fontSize:14, fontWeight:700, color:'#0F172A' }}>Candidatos</div>
              <div style={{ fontSize:11, color:'#94A3B8' }}>Toca el avatar para el radar · Toca la fila para ver pruebas</div>
            </div>
            <TablaCandidatos
              candidatos={candidatos}
              seleccionados={seleccionados}
              onToggle={toggleCandidato}
              expandido={expandido}
              onExpandir={setExpandido}
            />
          </div>

          {/* Ranking */}
          {activos.length > 1 && (
            <div className="card" style={{ padding:24 }}>
              <div style={{ fontSize:14, fontWeight:700, color:'#0F172A', marginBottom:20 }}>Ranking</div>
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {activos
                  .map(c => {
                    const resultados = c.resultados || [];
                    const promedio = resultados.length ? Math.round(resultados.reduce((acc,r)=>acc+parseFloat(r.puntaje_pct||0),0)/resultados.length) : 0;
                    return { ...c, promedio, cidx: seleccionados.indexOf(c.id) };
                  })
                  .sort((a,b) => b.promedio - a.promedio)
                  .map((c, pos) => (
                    <div key={c.id} style={{ display:'flex', alignItems:'center', gap:14 }}>
                      <span style={{ fontSize:18, fontWeight:800, color:'#E2E8F0', width:24 }}>#{pos+1}</span>
                      <div style={{ width:34, height:34, borderRadius:'50%', flexShrink:0, background:COLORES[c.cidx], color:'#fff', fontSize:12, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center' }}>
                        {c.nombre[0]}{c.apellido?.[0]||''}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                          <div>
                            <span style={{ fontSize:13, fontWeight:600, color:'#0F172A' }}>{c.nombre} {c.apellido}</span>
                            <div style={{ display:'flex', gap:4, marginTop:2 }}>
                              {(c.pruebas||[]).map(p=>(
                                <span key={p.prueba_id} style={{ fontSize:10, color:TIPO_COLOR[p.prueba_tipo]||'#64748B', background:TIPO_BG[p.prueba_tipo]||'#F1F5F9', padding:'1px 7px', borderRadius:100, fontWeight:600 }}>
                                  {p.prueba_nombre}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            {c.match_score != null && (
                              <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:100, background:parseFloat(c.match_score)>=80?'#D1FAE5':parseFloat(c.match_score)>=60?'#FEF3C7':'#FEE2E2', color:parseFloat(c.match_score)>=80?'#065F46':parseFloat(c.match_score)>=60?'#92400E':'#991B1B', display:'flex', alignItems:'center', gap:3 }}>
                                <Target size={9}/>{Math.round(c.match_score)}% match
                              </span>
                            )}
                            <span style={{ fontSize:14, fontWeight:800, color:COLORES[c.cidx] }}>{c.promedio}%</span>
                          </div>
                        </div>
                        <div style={{ height:8, background:'#F1F5F9', borderRadius:100, overflow:'hidden' }}>
                          <div style={{ height:'100%', width:`${c.promedio}%`, background:COLORES[c.cidx], borderRadius:100, transition:'width 0.7s ease' }}/>
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