import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from 'recharts';
import { ArrowLeft, Plus, X, Send, Play, Square, Trash2, Users2, BarChart3, ClipboardList, Copy, Check } from 'lucide-react';
import api from '../../services/api';

const ROL_CONFIG = {
  auto:        { label:'Autoevaluación',   color:'#6366F1', bg:'#EEF2FF' },
  jefe:        { label:'Jefe directo',     color:'#D97706', bg:'#FEF3C7' },
  par:         { label:'Par/Compañero',    color:'#059669', bg:'#D1FAE5' },
  subordinado: { label:'Subordinado',      color:'#DC2626', bg:'#FEE2E2' },
};

// ── Modal agregar evaluadores ─────────────────────────────
function ModalEvaluadores({ evalId, onClose, onSave }) {
  const [evaluadores, setEvaluadores] = useState([
    {rol:'auto',      nombre:'', email:''},
    {rol:'jefe',      nombre:'', email:''},
    {rol:'par',       nombre:'', email:''},
    {rol:'subordinado',nombre:'',email:''},
  ]);
  const [error, setError] = useState('');

  const set = (i,k,v) => setEvaluadores(e=>e.map((x,idx)=>idx===i?{...x,[k]:v}:x));
  const add = (rol) => setEvaluadores(e=>[...e,{rol,nombre:'',email:''}]);

  const mut = useMutation({
    mutationFn: () => api.post(`/rrhh/eval360/${evalId}/evaluadores`, {
      evaluadores: evaluadores.filter(e=>e.email.trim())
    }),
    onSuccess: () => { onSave(); onClose(); },
    onError: err => setError(err.response?.data?.error||'Error al invitar'),
  });

  const porRol = Object.keys(ROL_CONFIG).reduce((acc,rol)=>{
    acc[rol] = evaluadores.map((e,i)=>({...e,i})).filter(e=>e.rol===rol);
    return acc;
  },{});

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">Agregar evaluadores</h3>
            <p className="text-xs text-slate-400 mt-0.5">Se enviarán emails con links personalizados por rol</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg"><X className="w-4 h-4 text-slate-400"/></button>
        </div>
        <div className="p-6 space-y-5">
          {Object.entries(ROL_CONFIG).map(([rol,cfg])=>(
            <div key={rol}>
              <div className="flex items-center gap-2 mb-2">
                <div style={{background:cfg.bg,color:cfg.color}} className="text-xs font-bold px-2.5 py-1 rounded-full">{cfg.label}</div>
                <div className="flex-1 h-px bg-slate-100"/>
                <button onClick={()=>add(rol)} className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1">
                  <Plus className="w-3 h-3"/> Agregar otro
                </button>
              </div>
              {porRol[rol].map(e=>(
                <div key={e.i} className="flex gap-2 mb-2 items-center">
                  <input type="text" placeholder="Nombre" value={e.nombre} onChange={v=>set(e.i,'nombre',v.target.value)} className="input text-xs py-2 flex-1"/>
                  <input type="email" placeholder={`Email del ${cfg.label.toLowerCase()} *`} value={e.email} onChange={v=>set(e.i,'email',v.target.value)} className="input text-xs py-2 flex-1"/>
                  {porRol[rol].length>1&&(
                    <button onClick={()=>setEvaluadores(ev=>ev.filter((_,idx)=>idx!==e.i))} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"><X className="w-3.5 h-3.5"/></button>
                  )}
                </div>
              ))}
            </div>
          ))}

          {error&&<p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg">{error}</p>}

          <div className="flex gap-3 justify-end pt-2 border-t border-slate-100">
            <button onClick={onClose} className="btn-secondary">Cancelar</button>
            <button onClick={()=>mut.mutate()} disabled={mut.isPending||!evaluadores.some(e=>e.email.trim())} className="btn-primary">
              {mut.isPending?'Enviando...':`Invitar ${evaluadores.filter(e=>e.email.trim()).length} evaluador(es)`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Reporte comparativo ───────────────────────────────────
function Reporte({ evalId }) {
  const { data, isLoading } = useQuery({
    queryKey: ['eval360-resultados', evalId],
    queryFn: () => api.get(`/rrhh/eval360/${evalId}/resultados`).then(r=>r.data),
  });

  if (isLoading) return <p className="text-slate-400 text-sm p-6">Calculando resultados...</p>;
  if (!data) return null;

  const { evaluacion, statsPorRol, porPregunta, promedioRol, porCategoria } = data;

  // Convertir promedio de escala 1-5 a porcentaje
  const toPercent = v => v ? Math.round((parseFloat(v)-1)/4*100) : null;

  // Datos para radar comparativo por rol
  const categorias = [...new Set(porPregunta.map(p=>p.categoria).filter(Boolean))];
  const radarData = categorias.map(cat=>{
    const punto = { categoria: cat.length>10?cat.slice(0,10)+'…':cat };
    Object.keys(ROL_CONFIG).forEach(rol=>{
      const proms = porPregunta.filter(p=>p.categoria===cat&&p.promedios_por_rol?.[rol]);
      if (proms.length) {
        const avg = proms.reduce((s,p)=>s+parseFloat(p.promedios_por_rol[rol]||0),0)/proms.length;
        punto[rol] = Math.round(toPercent(avg));
      }
    });
    return punto;
  });

  // Score general comparativo
  const scoresPorRol = Object.keys(ROL_CONFIG).map(rol=>{
    const found = promedioRol.find(p=>p.rol===rol);
    return { rol, label: ROL_CONFIG[rol].label, color: ROL_CONFIG[rol].color, bg: ROL_CONFIG[rol].bg, score: found ? toPercent(found.promedio) : null };
  }).filter(r=>r.score!==null);

  return (
    <div className="space-y-6 p-6">
      {/* Participación por rol */}
      <div className="grid grid-cols-4 gap-3">
        {Object.entries(ROL_CONFIG).map(([rol,cfg])=>{
          const stat = statsPorRol.find(s=>s.rol===rol);
          return (
            <div key={rol} style={{background:cfg.bg,border:`1px solid ${cfg.color}30`}} className="rounded-xl p-3 text-center">
              <div style={{color:cfg.color}} className="text-xs font-bold mb-1">{cfg.label}</div>
              <div style={{color:cfg.color}} className="text-2xl font-bold">{stat?.completados||0}</div>
              <div className="text-xs text-slate-400">de {stat?.total||0}</div>
            </div>
          );
        })}
      </div>

      {/* Score comparativo por rol */}
      <div className="card p-5">
        <h3 className="text-sm font-bold text-slate-800 mb-4">Comparación general por perspectiva</h3>
        <div className="space-y-3">
          {scoresPorRol.map(r=>(
            <div key={r.rol}>
              <div className="flex justify-between items-center mb-1.5">
                <span style={{background:r.bg,color:r.color}} className="text-xs font-bold px-2.5 py-1 rounded-full">{r.label}</span>
                <span style={{color:r.color}} className="text-sm font-bold">{r.score}%</span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{width:`${r.score}%`,background:r.color}}/>
              </div>
            </div>
          ))}
        </div>

        {/* Brecha autoevaluación vs otros */}
        {scoresPorRol.find(r=>r.rol==='auto') && scoresPorRol.length > 1 && (
          <div className="mt-4 bg-slate-50 rounded-xl p-3">
            <div className="text-xs font-bold text-slate-500 mb-2">Brecha: Autopercepción vs Percepción externa</div>
            {(() => {
              const auto = scoresPorRol.find(r=>r.rol==='auto')?.score||0;
              const otros = scoresPorRol.filter(r=>r.rol!=='auto');
              const promedioOtros = otros.length ? Math.round(otros.reduce((s,r)=>s+r.score,0)/otros.length) : null;
              if (!promedioOtros) return null;
              const brecha = auto - promedioOtros;
              return (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">
                    Se percibe {Math.abs(brecha)}% {brecha>0?'mejor':'peor'} de lo que otros lo ven
                  </span>
                  <span className={`text-sm font-bold ${brecha>10?'text-amber-600':brecha<-10?'text-red-600':'text-emerald-600'}`}>
                    {brecha>0?'+':''}{brecha}%
                  </span>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Radar comparativo */}
      {radarData.length > 0 && scoresPorRol.length > 1 && (
        <div className="card p-5">
          <h3 className="text-sm font-bold text-slate-800 mb-4">Radar comparativo por categoría</h3>
          <ResponsiveContainer width="100%" height={320}>
            <RadarChart data={radarData} margin={{top:20,right:50,bottom:20,left:50}}>
              <PolarGrid stroke="#E2E8F0" strokeDasharray="3 3"/>
              <PolarAngleAxis dataKey="categoria" tick={{fontSize:11,fill:'#64748B'}}/>
              <PolarRadiusAxis angle={90} domain={[0,100]} tick={{fontSize:9,fill:'#CBD5E1'}} tickCount={5}/>
              {Object.entries(ROL_CONFIG).map(([rol,cfg])=>(
                <Radar key={rol} name={cfg.label} dataKey={rol}
                  stroke={cfg.color} fill={cfg.color} fillOpacity={0.08} strokeWidth={2}
                  dot={{fill:cfg.color, r:3}}
                />
              ))}
              <Legend iconType="circle" iconSize={8} wrapperStyle={{fontSize:11}}/>
              <Tooltip formatter={(v,n)=>[`${v}%`,n]} contentStyle={{fontSize:11,border:'1px solid #E2E8F0',borderRadius:10}}/>
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Detalle por pregunta */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-800">Detalle por pregunta</h3>
        </div>
        <div className="divide-y divide-slate-50">
          {porPregunta.map((p,i)=>(
            <div key={p.id} className="px-5 py-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold text-slate-400">#{i+1}</span>
                {p.categoria&&<span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{p.categoria}</span>}
              </div>
              <p className="text-sm font-medium text-slate-800 mb-3">{p.texto_auto}</p>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(ROL_CONFIG).map(([rol,cfg])=>{
                  const val = p.promedios_por_rol?.[rol];
                  if (!val) return null;
                  const pct = toPercent(val);
                  return (
                    <div key={rol} style={{background:cfg.bg}} className="rounded-lg p-2.5 flex items-center justify-between">
                      <span style={{color:cfg.color}} className="text-xs font-semibold">{cfg.label}</span>
                      <span style={{color:cfg.color}} className="text-sm font-bold">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Página detalle ────────────────────────────────────────
export default function Eval360Detalle() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const qc       = useQueryClient();
  const [tab,       setTab]      = useState('evaluadores');
  const [modalEv,   setModalEv]  = useState(false);
  const [copiedId,  setCopiedId] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['eval360-detalle', id],
    queryFn: () => api.get(`/rrhh/eval360/${id}`).then(r=>r.data),
  });

  const invalidar = () => { qc.invalidateQueries(['eval360-detalle', id]); qc.invalidateQueries(['eval360']); };
  const activarMut = useMutation({ mutationFn:()=>api.post(`/rrhh/eval360/${id}/activar`), onSuccess:invalidar });
  const cerrarMut  = useMutation({ mutationFn:()=>api.post(`/rrhh/eval360/${id}/cerrar`),  onSuccess:invalidar });
  const elimEvalMut = useMutation({ mutationFn:evId=>api.delete(`/rrhh/eval360/${id}/evaluadores/${evId}`), onSuccess:invalidar });

  const copiarLink = (token, evId) => {
    navigator.clipboard.writeText(`${window.location.origin}/eval360/${token}`);
    setCopiedId(evId);
    setTimeout(()=>setCopiedId(null), 2000);
  };

  if (isLoading) return <div className="p-8 text-slate-400 text-sm">Cargando...</div>;
  if (!data) return null;

  const { evaluacion, evaluadores, preguntas } = data;
  const completados = evaluadores.filter(e=>e.estado==='completado').length;
  const tasa = evaluadores.length ? Math.round((completados/evaluadores.length)*100) : 0;

  const evaluadoresPorRol = Object.keys(ROL_CONFIG).reduce((acc,rol)=>{
    acc[rol] = evaluadores.filter(e=>e.rol===rol);
    return acc;
  },{});

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start gap-3 mb-6">
        <button onClick={()=>navigate('/rrhh/eval360')} className="p-2 hover:bg-slate-100 rounded-lg mt-0.5">
          <ArrowLeft className="w-4 h-4 text-slate-600"/>
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={evaluacion.estado==='activa'?'badge-green':evaluacion.estado==='cerrada'?'badge-blue':'badge-gray'}>
              {evaluacion.estado}
            </span>
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold">360°</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">{evaluacion.nombre_evaluado}</h1>
          <div className="flex items-center gap-3 mt-0.5">
            {evaluacion.puesto&&<p className="text-sm text-slate-500">{evaluacion.puesto}</p>}
            {evaluacion.proceso_nombre&&<p className="text-sm text-slate-400">· {evaluacion.proceso_nombre}</p>}
            {evaluacion.empresa_cliente_nombre&&<p className="text-sm text-slate-400">· {evaluacion.empresa_cliente_nombre}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          {evaluacion.estado==='activa'&&(
            <button onClick={()=>setModalEv(true)} className="btn-primary text-xs py-2">
              <Send className="w-3.5 h-3.5"/> Invitar evaluadores
            </button>
          )}
          {evaluacion.estado==='borrador'&&(
            <button onClick={()=>activarMut.mutate()} className="btn-primary text-xs py-2">
              <Play className="w-3.5 h-3.5"/> Activar
            </button>
          )}
          {evaluacion.estado==='activa'&&(
            <button onClick={()=>cerrarMut.mutate()} className="btn-secondary text-xs py-2">
              <Square className="w-3.5 h-3.5"/> Cerrar
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          {label:'Evaluadores', value:evaluadores.length},
          {label:'Completados', value:completados},
          {label:'Preguntas',   value:preguntas.length},
          {label:'Participación',value:`${tasa}%`},
        ].map(s=>(
          <div key={s.label} className="card p-4 text-center">
            <div className="text-2xl font-bold text-slate-800">{s.value}</div>
            <div className="text-xs text-slate-400 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-xl w-fit">
        {[
          ['evaluadores','Evaluadores'],
          ['preguntas',  'Preguntas'],
          ['reporte',    'Reporte comparativo'],
        ].map(([key,label])=>(
          <button key={key} onClick={()=>setTab(key)} className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${tab===key?'bg-white shadow-sm text-slate-800':'text-slate-500 hover:text-slate-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Tab: Evaluadores */}
      {tab==='evaluadores'&&(
        <div className="space-y-4">
          {Object.entries(ROL_CONFIG).map(([rol,cfg])=>{
            const evs = evaluadoresPorRol[rol]||[];
            return (
              <div key={rol} className="card overflow-hidden">
                <div style={{background:cfg.bg}} className="px-5 py-3 flex items-center justify-between">
                  <div style={{color:cfg.color}} className="text-sm font-bold flex items-center gap-2">
                    <div style={{background:cfg.color}} className="w-2 h-2 rounded-full"/>
                    {cfg.label}
                    <span className="text-xs font-normal opacity-60">{evs.filter(e=>e.estado==='completado').length}/{evs.length} completados</span>
                  </div>
                </div>
                {evs.length===0?(
                  <div className="px-5 py-4 text-sm text-slate-400 italic">
                    No hay evaluadores de este tipo aún.
                    {evaluacion.estado==='activa'&&<button onClick={()=>setModalEv(true)} className="ml-2 text-brand-600 hover:underline">Agregar</button>}
                  </div>
                ):(
                  <table className="w-full text-sm">
                    <tbody>
                      {evs.map(ev=>(
                        <tr key={ev.id} className="border-b border-slate-50 hover:bg-slate-50">
                          <td className="px-5 py-3">
                            <p className="font-medium text-slate-800">{ev.nombre||<span className="text-slate-400 italic">Sin nombre</span>}</p>
                            {ev.email&&<p className="text-xs text-slate-400">{ev.email}</p>}
                          </td>
                          <td className="px-5 py-3">
                            <span className={ev.estado==='completado'?'badge-green':'badge-yellow'}>
                              {ev.estado==='completado'?'Completado':'Pendiente'}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-xs text-slate-400">
                            {ev.fecha_completado?new Date(ev.fecha_completado).toLocaleDateString('es-DO'):'—'}
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <button onClick={()=>copiarLink(ev.token_acceso,ev.id)} className={`p-1.5 rounded-lg text-xs flex items-center gap-1 ${copiedId===ev.id?'text-emerald-600 bg-emerald-50':'text-slate-400 hover:bg-slate-100'}`} title="Copiar link">
                                {copiedId===ev.id?<><Check className="w-3 h-3"/> Copiado</>:<Copy className="w-3.5 h-3.5"/>}
                              </button>
                              <button onClick={()=>elimEvalMut.mutate(ev.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg">
                                <Trash2 className="w-3.5 h-3.5"/>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Tab: Preguntas */}
      {tab==='preguntas'&&(
        <div className="card overflow-hidden">
          {preguntas.length===0?(
            <div className="p-12 text-center"><p className="text-slate-400 text-sm">No hay preguntas configuradas.</p></div>
          ):(
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {['#','Autoevaluación','Para otros','Categoría','Roles'].map(h=>(
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preguntas.map((p,i)=>(
                  <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-5 py-3 text-slate-400 text-xs font-bold">{i+1}</td>
                    <td className="px-5 py-3 text-slate-800 text-xs max-w-xs">{p.texto_auto}</td>
                    <td className="px-5 py-3 text-slate-600 text-xs max-w-xs">{p.texto_otros}</td>
                    <td className="px-5 py-3"><span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{p.categoria||'—'}</span></td>
                    <td className="px-5 py-3 text-xs text-slate-400">{p.aplica_roles?.replace(/,/g,', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab: Reporte */}
      {tab==='reporte'&&(
        completados===0?(
          <div className="card p-12 text-center">
            <BarChart3 className="w-10 h-10 text-slate-200 mx-auto mb-3"/>
            <p className="text-slate-400 text-sm">Aún no hay evaluadores que hayan completado.</p>
          </div>
        ):<Reporte evalId={id}/>
      )}

      {modalEv&&<ModalEvaluadores evalId={id} onClose={()=>setModalEv(false)} onSave={invalidar}/>}
    </div>
  );
}
