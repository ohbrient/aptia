import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { ArrowLeft, Plus, X, Link, Copy, Check, Send, Users, BarChart3, MessageSquare, Building, Trash2, Play, Square, Mail } from 'lucide-react';
import api from '../../services/api';

const ESTADO_PART = {
  completado: { label:'Completado', cls:'badge-green' },
  pendiente:  { label:'Pendiente',  cls:'badge-yellow' },
};

const CAT_COLORS = ['#6366F1','#059669','#D97706','#DC2626','#0EA5E9','#8B5CF6','#F97316'];

// ── Modal invitar participantes ───────────────────────────
function ModalInvitar({ encuestaId, departamentos, onClose, onSave }) {
  const [filas, setFilas] = useState([{nombre:'',email:'',departamento_id:''}]);
  const [error, setError] = useState('');
  const [exito, setExito] = useState(null);

  const setFila = (i,k,v) => setFilas(f=>f.map((r,idx)=>idx===i?{...r,[k]:v}:r));
  const agregar = () => setFilas(f=>[...f,{nombre:'',email:'',departamento_id:''}]);
  const quitar  = i  => setFilas(f=>f.filter((_,idx)=>idx!==i));

  const mut = useMutation({
    mutationFn: () => api.post(`/rrhh/clima/${encuestaId}/invitar`, {
      participantes: filas.filter(f=>f.nombre||f.email)
    }),
    onSuccess: res => { setExito(res.data); onSave(); },
    onError: err => setError(err.response?.data?.error || 'Error al invitar'),
  });

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">Invitar participantes</h3>
            <p className="text-xs text-slate-400 mt-0.5">Se enviarán emails con links personalizados</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg"><X className="w-4 h-4 text-slate-400"/></button>
        </div>
        <div className="p-6">
          {exito ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Mail className="w-6 h-6 text-emerald-600"/>
              </div>
              <p className="font-bold text-slate-900 mb-1">{exito.invitados} participante(s) invitado(s)</p>
              <p className="text-xs text-slate-400 mb-5">Los emails fueron enviados exitosamente</p>
              <button onClick={onClose} className="btn-primary">Cerrar</button>
            </div>
          ) : (
            <>
              <div className="space-y-2 mb-4">
                {filas.map((f,i)=>(
                  <div key={i} className="grid gap-2" style={{gridTemplateColumns:departamentos.length?'1fr 1fr 1fr auto':'1fr 1fr auto'}}>
                    <input type="text" placeholder="Nombre" value={f.nombre} onChange={e=>setFila(i,'nombre',e.target.value)} className="input text-xs py-2"/>
                    <input type="email" placeholder="Email *" value={f.email} onChange={e=>setFila(i,'email',e.target.value)} className="input text-xs py-2"/>
                    {departamentos.length > 0 && (
                      <select value={f.departamento_id} onChange={e=>setFila(i,'departamento_id',e.target.value)} className="input text-xs py-2">
                        <option value="">Sin departamento</option>
                        {departamentos.map(d=><option key={d.id} value={d.id}>{d.nombre}</option>)}
                      </select>
                    )}
                    {filas.length>1 && <button onClick={()=>quitar(i)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"><X className="w-3.5 h-3.5"/></button>}
                  </div>
                ))}
              </div>
              <button onClick={agregar} className="btn-secondary w-full justify-center text-xs py-2 mb-4">
                <Plus className="w-3.5 h-3.5"/> Agregar persona
              </button>
              {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg mb-4">{error}</p>}
              <div className="flex gap-3 justify-end">
                <button onClick={onClose} className="btn-secondary">Cancelar</button>
                <button onClick={()=>mut.mutate()} disabled={mut.isPending||!filas.some(f=>f.email)} className="btn-primary">
                  {mut.isPending?'Enviando...':`Invitar ${filas.filter(f=>f.email).length} persona(s)`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sección resultados ────────────────────────────────────
function Resultados({ encuestaId }) {
  const { data, isLoading } = useQuery({
    queryKey: ['clima-resultados', encuestaId],
    queryFn: () => api.get(`/rrhh/clima/${encuestaId}/resultados`).then(r=>r.data),
  });

  if (isLoading) return <p className="text-slate-400 text-sm p-4">Cargando resultados...</p>;
  if (!data) return null;

  const { stats, porPregunta, porDepartamento, porCategoria, comentarios } = data;

  const promedio = porPregunta.length
    ? Math.round(porPregunta.filter(p=>p.promedio).reduce((s,p)=>s+parseFloat(p.promedio||0),0) / porPregunta.filter(p=>p.promedio).length * 20)
    : 0;

  const getNivel = (pct) => {
    if (pct >= 80) return { label:'Excelente', color:'#059669' };
    if (pct >= 65) return { label:'Bueno',     color:'#D97706' };
    if (pct >= 50) return { label:'Regular',   color:'#F97316' };
    return              { label:'Crítico',     color:'#DC2626' };
  };
  const nv = getNivel(promedio);

  return (
    <div className="space-y-6 p-6">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label:'Participantes', value: stats.total,      color:'text-slate-800' },
          { label:'Completados',   value: stats.completados, color:'text-emerald-600' },
          { label:'Pendientes',    value: stats.pendientes,  color:'text-amber-600' },
          { label:'Tasa',          value: `${stats.tasa||0}%`, color:'text-brand-600' },
        ].map(s=>(
          <div key={s.label} className="bg-slate-50 rounded-xl p-4 text-center">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-slate-400 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Score general */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 text-white flex items-center gap-6">
        <div style={{ width:80, height:80, borderRadius:'50%', border:`4px solid ${nv.color}`, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <div style={{ fontSize:24, fontWeight:800, color: nv.color, lineHeight:1 }}>{promedio}%</div>
        </div>
        <div>
          <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>Clima general</div>
          <div style={{ fontSize:22, fontWeight:800, color: nv.color }}>{nv.label}</div>
          <div style={{ fontSize:12, color:'rgba(255,255,255,0.5)', marginTop:2 }}>Basado en {stats.completados} respuestas</div>
        </div>
      </div>

      {/* Por categoría */}
      {porCategoria.length > 0 && (
        <div className="card p-5">
          <h3 className="text-sm font-bold text-slate-800 mb-4">Resultados por categoría</h3>
          <div className="space-y-3">
            {porCategoria.map((cat,i)=>{
              const pct = Math.round(parseFloat(cat.promedio||0)*20);
              return (
                <div key={cat.categoria}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-sm font-medium text-slate-700">{cat.categoria}</span>
                    <span className="text-sm font-bold" style={{color:CAT_COLORS[i%CAT_COLORS.length]}}>{pct}%</span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{width:`${pct}%`,background:CAT_COLORS[i%CAT_COLORS.length]}}/>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Por departamento */}
      {porDepartamento.length > 1 && (
        <div className="card p-5">
          <h3 className="text-sm font-bold text-slate-800 mb-4">Por departamento</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={porDepartamento.map(d=>({...d, pct:Math.round(parseFloat(d.promedio||0)*20)}))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9"/>
              <XAxis dataKey="departamento" tick={{fontSize:11}} tickLine={false}/>
              <YAxis domain={[0,100]} tick={{fontSize:10}} tickLine={false} axisLine={false}/>
              <Tooltip formatter={(v)=>[`${v}%`,'Clima']}/>
              <Bar dataKey="pct" radius={[6,6,0,0]}>
                {porDepartamento.map((_,i)=><Cell key={i} fill={CAT_COLORS[i%CAT_COLORS.length]}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Preguntas detalle */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-800">Detalle por pregunta</h3>
        </div>
        <div className="divide-y divide-slate-50">
          {porPregunta.map((p,i)=>{
            const pct = p.promedio ? Math.round(parseFloat(p.promedio)*20) : null;
            const nv2 = pct !== null ? getNivel(pct) : null;
            return (
              <div key={p.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-slate-400">#{i+1}</span>
                      {p.categoria && <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{p.categoria}</span>}
                    </div>
                    <p className="text-sm font-medium text-slate-800">{p.texto}</p>
                  </div>
                  {pct !== null && (
                    <div className="text-right flex-shrink-0">
                      <div className="text-lg font-bold" style={{color:nv2.color}}>{pct}%</div>
                      <div className="text-xs" style={{color:nv2.color}}>{nv2.label}</div>
                    </div>
                  )}
                </div>
                {pct !== null && (
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden mt-2">
                    <div className="h-full rounded-full" style={{width:`${pct}%`,background:nv2.color}}/>
                  </div>
                )}
                <div className="text-xs text-slate-400 mt-1">{p.respuestas} respuesta(s)</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Comentarios */}
      {comentarios.length > 0 && (
        <div className="card p-5">
          <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-slate-400"/>
            Comentarios abiertos ({comentarios.length})
          </h3>
          <div className="space-y-3">
            {comentarios.map((c,i)=>(
              <div key={i} className="bg-slate-50 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-slate-400">{c.pregunta}</span>
                  {c.departamento !== 'Sin departamento' && (
                    <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{c.departamento}</span>
                  )}
                </div>
                <p className="text-sm text-slate-700 italic">"{c.texto_respuesta}"</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Página detalle ────────────────────────────────────────
export default function ClimaDetalle() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const qc       = useQueryClient();
  const [tab,       setTab]       = useState('participantes'); // participantes | resultados
  const [modalInv,  setModalInv]  = useState(false);
  const [copied,    setCopied]    = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['clima-detalle', id],
    queryFn: () => api.get(`/rrhh/clima/${id}`).then(r=>r.data),
  });

  const invalidar = () => qc.invalidateQueries(['clima-detalle', id]);

  const activarMut = useMutation({ mutationFn: ()=>api.post(`/rrhh/clima/${id}/activar`), onSuccess:()=>{ invalidar(); qc.invalidateQueries(['clima-encuestas']); } });
  const cerrarMut  = useMutation({ mutationFn: ()=>api.post(`/rrhh/clima/${id}/cerrar`),  onSuccess:()=>{ invalidar(); qc.invalidateQueries(['clima-encuestas']); } });

  const copiarLink = async () => {
    const { data: d } = await api.get(`/rrhh/clima/${id}/link-publico`);
    navigator.clipboard.writeText(d.link);
    setCopied(true);
    setTimeout(()=>setCopied(false), 2500);
  };

  if (isLoading) return <div className="p-8 text-slate-400 text-sm">Cargando...</div>;
  if (!data) return null;

  const { encuesta, preguntas, participantes, departamentos } = data;
  const completados = participantes.filter(p=>p.estado==='completado').length;
  const tasa = participantes.length ? Math.round((completados/participantes.length)*100) : 0;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start gap-3 mb-6">
        <button onClick={()=>navigate('/rrhh/clima')} className="p-2 hover:bg-slate-100 rounded-lg transition-colors mt-0.5">
          <ArrowLeft className="w-4 h-4 text-slate-600"/>
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={encuesta.estado==='activa'?'badge-green':encuesta.estado==='cerrada'?'badge-blue':'badge-gray'}>
              {encuesta.estado}
            </span>
            {encuesta.anonima && <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Anónima</span>}
          </div>
          <h1 className="text-xl font-bold text-slate-900">{encuesta.nombre}</h1>
          {encuesta.empresa_cliente_nombre && <p className="text-sm text-slate-400 mt-0.5">{encuesta.empresa_cliente_nombre}</p>}
        </div>
        <div className="flex gap-2">
          {encuesta.estado === 'activa' && (
            <>
              <button onClick={copiarLink} className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg font-semibold transition-all ${copied?'bg-emerald-100 text-emerald-700':'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}>
                {copied?<><Check className="w-3.5 h-3.5"/> Copiado</>:<><Link className="w-3.5 h-3.5"/> Copiar link</>}
              </button>
              <button onClick={()=>setModalInv(true)} className="btn-primary text-xs py-2">
                <Send className="w-3.5 h-3.5"/> Invitar
              </button>
              <button onClick={()=>cerrarMut.mutate()} className="btn-secondary text-xs py-2">
                <Square className="w-3.5 h-3.5"/> Cerrar
              </button>
            </>
          )}
          {encuesta.estado === 'borrador' && (
            <button onClick={()=>activarMut.mutate()} className="btn-primary text-xs py-2">
              <Play className="w-3.5 h-3.5"/> Activar encuesta
            </button>
          )}
        </div>
      </div>

      {/* Stats rápidas */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label:'Participantes', value:participantes.length },
          { label:'Completados',   value:completados },
          { label:'Preguntas',     value:preguntas.length },
          { label:'Participación', value:`${tasa}%` },
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
          ['participantes', <Users className="w-3.5 h-3.5"/>, 'Participantes'],
          ['preguntas',     <BarChart3 className="w-3.5 h-3.5"/>, 'Preguntas'],
          ['resultados',    <BarChart3 className="w-3.5 h-3.5"/>, 'Resultados'],
        ].map(([key, icon, label])=>(
          <button key={key} onClick={()=>setTab(key)} className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${tab===key?'bg-white shadow-sm text-slate-800':'text-slate-500 hover:text-slate-700'}`}>
            {icon}{label}
          </button>
        ))}
      </div>

      {/* Tab: Participantes */}
      {tab === 'participantes' && (
        <div className="card overflow-hidden">
          {participantes.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-10 h-10 text-slate-200 mx-auto mb-3"/>
              <p className="text-slate-400 text-sm mb-4">No hay participantes aún.</p>
              {encuesta.estado === 'activa' && (
                <button onClick={()=>setModalInv(true)} className="btn-primary mx-auto text-xs">
                  <Send className="w-3.5 h-3.5"/> Invitar participantes
                </button>
              )}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {['Participante','Departamento','Estado','Fecha',''].map(h=>(
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {participantes.map(p=>{
                  const est = ESTADO_PART[p.estado]||{label:p.estado,cls:'badge-gray'};
                  return (
                    <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="px-5 py-3">
                        <p className="font-medium text-slate-800">{p.nombre||<span className="text-slate-400 italic">Anónimo</span>}</p>
                        {p.email && <p className="text-xs text-slate-400">{p.email}</p>}
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-500">{p.departamento_nombre||'—'}</td>
                      <td className="px-5 py-3"><span className={est.cls}>{est.label}</span></td>
                      <td className="px-5 py-3 text-xs text-slate-400">
                        {p.fecha_completado ? new Date(p.fecha_completado).toLocaleDateString('es-DO') : '—'}
                      </td>
                      <td className="px-5 py-3">
                        {p.estado === 'pendiente' && p.email && (
                          <button
                            onClick={async()=>{ await api.post(`/rrhh/clima/${id}/invitar`,{participantes:[{nombre:p.nombre,email:p.email}]}); }}
                            className="text-xs text-amber-600 hover:bg-amber-50 px-2 py-1 rounded-lg"
                          >
                            Reenviar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab: Preguntas */}
      {tab === 'preguntas' && (
        <div className="card overflow-hidden">
          {preguntas.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-slate-400 text-sm">Esta encuesta usa una prueba del banco de pruebas.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {['#','Pregunta','Categoría','Tipo',''].map(h=>(
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preguntas.map((p,i)=>(
                  <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-5 py-3 text-slate-400 text-xs font-bold">{i+1}</td>
                    <td className="px-5 py-3 font-medium text-slate-800 max-w-xs">{p.texto}</td>
                    <td className="px-5 py-3 text-sm text-slate-500">{p.categoria||'—'}</td>
                    <td className="px-5 py-3">
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{p.tipo_respuesta}</span>
                    </td>
                    <td className="px-5 py-3">
                      {encuesta.estado === 'borrador' && (
                        <button onClick={async()=>{ await api.delete(`/rrhh/clima/${id}/preguntas/${p.id}`); invalidar(); }} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg">
                          <Trash2 className="w-3.5 h-3.5"/>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab: Resultados */}
      {tab === 'resultados' && (
        completados === 0 ? (
          <div className="card p-12 text-center">
            <BarChart3 className="w-10 h-10 text-slate-200 mx-auto mb-3"/>
            <p className="text-slate-400 text-sm">Aún no hay respuestas completadas.</p>
          </div>
        ) : <Resultados encuestaId={id}/>
      )}

      {modalInv && (
        <ModalInvitar
          encuestaId={id}
          departamentos={departamentos}
          onClose={()=>setModalInv(false)}
          onSave={invalidar}
        />
      )}
    </div>
  );
}
