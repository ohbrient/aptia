import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, X, Users2, Trash2, Eye, Play, Square, CheckCircle } from 'lucide-react';
import api from '../../services/api';
import PageHeader from '../../components/ui/PageHeader';

const ESTADO_CONFIG = {
  borrador: { label:'Borrador', cls:'badge-gray' },
  activa:   { label:'Activa',   cls:'badge-green' },
  cerrada:  { label:'Cerrada',  cls:'badge-blue' },
};

const ROL_COLORS = {
  auto:        { bg:'#EEF2FF', color:'#6366F1', label:'Autoevaluación' },
  jefe:        { bg:'#FEF3C7', color:'#D97706', label:'Jefe directo' },
  par:         { bg:'#D1FAE5', color:'#059669', label:'Par / Compañero' },
  subordinado: { bg:'#FEE2E2', color:'#DC2626', label:'Subordinado' },
};

function ModalCrear({ clientes, onClose, onSave }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    nombre_evaluado:'', email_evaluado:'', puesto:'', proceso_nombre:'',
    empresa_cliente_id:'', fecha_inicio:'', fecha_cierre:'',
    tipo_preguntas:'predeterminadas',
  });
  const [preguntas, setPreguntas] = useState([
    { texto_auto:'¿Cómo evalúas tu desempeño general?', texto_otros:'¿Cómo evalúas el desempeño general de esta persona?', categoria:'Desempeño', tipo_respuesta:'likert5', aplica_roles:'auto,jefe,par,subordinado' },
    { texto_auto:'¿Cómo calificarías tu capacidad de trabajo en equipo?', texto_otros:'¿Cómo calificarías la capacidad de trabajo en equipo de esta persona?', categoria:'Trabajo en equipo', tipo_respuesta:'likert5', aplica_roles:'auto,jefe,par,subordinado' },
    { texto_auto:'¿Cómo evalúas tu capacidad de liderazgo?', texto_otros:'¿Cómo evalúas la capacidad de liderazgo de esta persona?', categoria:'Liderazgo', tipo_respuesta:'likert5', aplica_roles:'auto,jefe,subordinado' },
    { texto_auto:'¿Cómo calificarías tu comunicación efectiva?', texto_otros:'¿Cómo calificarías la comunicación efectiva de esta persona?', categoria:'Comunicación', tipo_respuesta:'likert5', aplica_roles:'auto,jefe,par,subordinado' },
    { texto_auto:'¿Cómo evalúas tu cumplimiento de objetivos?', texto_otros:'¿Cómo evalúas el cumplimiento de objetivos de esta persona?', categoria:'Resultados', tipo_respuesta:'likert5', aplica_roles:'auto,jefe' },
  ]);
  const [error, setError] = useState('');
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const setPregunta = (i,k,v) => setPreguntas(p=>p.map((x,idx)=>idx===i?{...x,[k]:v}:x));
  const addPregunta = () => setPreguntas(p=>[...p,{texto_auto:'',texto_otros:'',categoria:'General',tipo_respuesta:'likert5',aplica_roles:'auto,jefe,par,subordinado'}]);
  const removePregunta = i => setPreguntas(p=>p.filter((_,idx)=>idx!==i));

  const mut = useMutation({
    mutationFn: () => api.post('/rrhh/eval360', {
      ...form,
      preguntas: form.tipo_preguntas === 'predeterminadas' ? preguntas : preguntas.filter(p=>p.texto_auto.trim()),
    }),
    onSuccess: () => { onSave(); onClose(); },
    onError: err => setError(err.response?.data?.error || 'Error al crear'),
  });

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">Nueva Evaluación 360°</h3>
            <p className="text-xs text-slate-400 mt-0.5">Paso {step} de 3</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg"><X className="w-4 h-4 text-slate-400"/></button>
        </div>

        {/* Steps */}
        <div className="flex items-center px-6 pt-4 gap-1 mb-1">
          {[['1','Evaluado'],['2','Preguntas'],['3','Revisión']].map(([n,l],i)=>(
            <div key={n} className="flex items-center gap-1 flex-1">
              <div className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 ${step>i+1?'bg-emerald-500 text-white':step===i+1?'bg-brand-600 text-white':'bg-slate-100 text-slate-400'}`}>
                {step>i+1?'✓':n}
              </div>
              <span className={`text-xs font-medium ${step===i+1?'text-slate-800':'text-slate-400'}`}>{l}</span>
              {i<2&&<div className="flex-1 h-px bg-slate-200 mx-1"/>}
            </div>
          ))}
        </div>

        {/* Paso 1: Datos del evaluado */}
        {step===1&&(
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Nombre del evaluado *</label>
                <input type="text" value={form.nombre_evaluado} onChange={e=>set('nombre_evaluado',e.target.value)} placeholder="Ej: María González" className="input"/>
              </div>
              <div>
                <label className="label">Email del evaluado</label>
                <input type="email" value={form.email_evaluado} onChange={e=>set('email_evaluado',e.target.value)} placeholder="maria@empresa.com" className="input"/>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Puesto</label>
                <input type="text" value={form.puesto} onChange={e=>set('puesto',e.target.value)} placeholder="Ej: Gerente de Ventas" className="input"/>
              </div>
              <div>
                <label className="label">Proceso / Nombre de la evaluación</label>
                <input type="text" value={form.proceso_nombre} onChange={e=>set('proceso_nombre',e.target.value)} placeholder="Ej: Evaluación Anual 2026" className="input"/>
              </div>
            </div>
            <div>
              <label className="label">Empresa cliente</label>
              <select value={form.empresa_cliente_id} onChange={e=>set('empresa_cliente_id',e.target.value)} className="input">
                <option value="">Seleccionar empresa (opcional)</option>
                {clientes.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Fecha inicio</label>
                <input type="date" value={form.fecha_inicio} onChange={e=>set('fecha_inicio',e.target.value)} className="input"/>
              </div>
              <div>
                <label className="label">Fecha cierre</label>
                <input type="date" value={form.fecha_cierre} onChange={e=>set('fecha_cierre',e.target.value)} className="input"/>
              </div>
            </div>
          </div>
        )}

        {/* Paso 2: Preguntas */}
        {step===2&&(
          <div className="p-6">
            <div className="flex gap-2 mb-5">
              {[['predeterminadas','Usar plantilla (recomendado)'],['propias','Personalizar preguntas']].map(([v,l])=>(
                <button key={v} onClick={()=>set('tipo_preguntas',v)} className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold border-2 transition-all ${form.tipo_preguntas===v?'border-brand-500 bg-brand-50 text-brand-700':'border-slate-200 text-slate-500'}`}>
                  {l}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {preguntas.map((p,i)=>(
                <div key={i} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-500">Pregunta {i+1}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{p.categoria}</span>
                      {preguntas.length > 1 && <button onClick={()=>removePregunta(i)} className="p-1 text-red-400 hover:bg-red-50 rounded-lg"><X className="w-3 h-3"/></button>}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Para autoevaluación:</label>
                      <input value={p.texto_auto} onChange={e=>setPregunta(i,'texto_auto',e.target.value)} className="input text-xs py-2" placeholder="¿Cómo evalúas tu...?"/>
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Para jefes, pares y subordinados:</label>
                      <input value={p.texto_otros} onChange={e=>setPregunta(i,'texto_otros',e.target.value)} className="input text-xs py-2" placeholder="¿Cómo evalúas a esta persona en...?"/>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">Categoría</label>
                        <input value={p.categoria} onChange={e=>setPregunta(i,'categoria',e.target.value)} className="input text-xs py-1.5"/>
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 mb-1 block">Aplica a</label>
                        <select value={p.aplica_roles} onChange={e=>setPregunta(i,'aplica_roles',e.target.value)} className="input text-xs py-1.5">
                          <option value="auto,jefe,par,subordinado">Todos los roles</option>
                          <option value="auto,jefe">Auto + Jefe</option>
                          <option value="auto,jefe,par">Auto + Jefe + Par</option>
                          <option value="jefe,subordinado">Jefe + Subordinado</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={addPregunta} className="btn-secondary w-full justify-center text-xs py-2 mt-3">
              <Plus className="w-3.5 h-3.5"/> Agregar pregunta
            </button>
          </div>
        )}

        {/* Paso 3: Revisión */}
        {step===3&&(
          <div className="p-6 space-y-4">
            <div className="bg-slate-50 rounded-xl p-4 space-y-2">
              <h4 className="text-sm font-bold text-slate-800 mb-3">Resumen</h4>
              {[
                ['Evaluado',   form.nombre_evaluado],
                ['Puesto',     form.puesto||'—'],
                ['Proceso',    form.proceso_nombre||'—'],
                ['Preguntas',  `${preguntas.filter(p=>p.texto_auto.trim()).length} preguntas configuradas`],
              ].map(([k,v])=>(
                <div key={k} className="flex justify-between text-sm">
                  <span className="text-slate-500">{k}</span>
                  <span className="font-medium text-slate-800">{v}</span>
                </div>
              ))}
            </div>

            {/* Preview roles */}
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Tipos de evaluadores</p>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(ROL_COLORS).map(([rol,cfg])=>(
                  <div key={rol} style={{background:cfg.bg,border:`1px solid ${cfg.color}30`}} className="rounded-xl p-3 flex items-center gap-2">
                    <div style={{background:cfg.color}} className="w-2 h-2 rounded-full flex-shrink-0"/>
                    <span style={{color:cfg.color}} className="text-xs font-semibold">{cfg.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700">
              ℹ️ Después de crear la evaluación, podrás agregar los evaluadores e invitarlos por email.
            </div>

            {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg">{error}</p>}
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-between">
          <button onClick={step===1?onClose:()=>setStep(s=>s-1)} className="btn-secondary">
            {step===1?'Cancelar':'← Atrás'}
          </button>
          {step<3?(
            <button onClick={()=>setStep(s=>s+1)} disabled={step===1&&!form.nombre_evaluado} className="btn-primary">
              Siguiente →
            </button>
          ):(
            <button onClick={()=>mut.mutate()} disabled={mut.isPending} className="btn-primary">
              {mut.isPending?'Creando...':'Crear evaluación 360°'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Tarjeta evaluación ────────────────────────────────────
function EvalCard({ e, onActivar, onCerrar, onEliminar, onVer }) {
  const est  = ESTADO_CONFIG[e.estado] || ESTADO_CONFIG.borrador;
  const tasa = e.total_evaluadores > 0 ? Math.round((e.completados/e.total_evaluadores)*100) : 0;

  return (
    <div className="card p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={est.cls}>{est.label}</span>
          </div>
          <h3 className="text-sm font-bold text-slate-900">{e.nombre_evaluado}</h3>
          {e.puesto && <p className="text-xs text-slate-500 mt-0.5">{e.puesto}</p>}
          {e.proceso_nombre && <p className="text-xs text-slate-400 mt-0.5">{e.proceso_nombre}</p>}
          {e.empresa_cliente_nombre && <p className="text-xs text-slate-400">{e.empresa_cliente_nombre}</p>}
        </div>
        <div className="flex gap-1 flex-shrink-0">
          {e.estado==='borrador' && <button onClick={()=>onActivar(e.id)} title="Activar" className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg"><Play className="w-3.5 h-3.5"/></button>}
          {e.estado==='activa'   && <button onClick={()=>onCerrar(e.id)}  title="Cerrar"  className="p-1.5 text-amber-500  hover:bg-amber-50  rounded-lg"><Square className="w-3.5 h-3.5"/></button>}
          <button onClick={()=>onVer(e.id)}     title="Ver detalle" className="p-1.5 text-brand-500 hover:bg-brand-50 rounded-lg"><Eye className="w-3.5 h-3.5"/></button>
          <button onClick={()=>onEliminar(e.id)} title="Eliminar"   className="p-1.5 text-red-400   hover:bg-red-50   rounded-lg"><Trash2 className="w-3.5 h-3.5"/></button>
        </div>
      </div>

      {/* Stats evaluadores */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {[
          {label:'Evaluadores', value:e.total_evaluadores||0},
          {label:'Completados', value:e.completados||0},
          {label:'Preguntas',   value:e.total_preguntas||0},
        ].map(s=>(
          <div key={s.label} className="text-center">
            <div className="text-lg font-bold text-slate-800">{s.value}</div>
            <div className="text-xs text-slate-400">{s.label}</div>
          </div>
        ))}
      </div>

      {e.total_evaluadores > 0 && (
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-xs text-slate-400">Participación</span>
            <span className="text-xs font-semibold text-slate-600">{tasa}%</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{width:`${tasa}%`}}/>
          </div>
        </div>
      )}

      {/* Fechas */}
      {e.fecha_cierre && (
        <p className="text-xs text-slate-400 mt-2">Cierre: {new Date(e.fecha_cierre).toLocaleDateString('es-DO')}</p>
      )}
    </div>
  );
}

// ── Página principal ──────────────────────────────────────
export default function Eval360() {
  const qc       = useQueryClient();
  const navigate = useNavigate();
  const [modalCrear, setModalCrear] = useState(false);
  const [eliminando, setEliminando] = useState(null);

  const { data: evaluaciones=[], isLoading } = useQuery({
    queryKey: ['eval360'],
    queryFn: () => api.get('/rrhh/eval360').then(r=>r.data),
  });
  const { data: clientes=[] } = useQuery({
    queryKey: ['rrhh-clientes'],
    queryFn: () => api.get('/rrhh/empresas-cliente').then(r=>r.data),
  });

  const invalidar = () => qc.invalidateQueries(['eval360']);
  const activarMut  = useMutation({ mutationFn: id=>api.post(`/rrhh/eval360/${id}/activar`),  onSuccess: invalidar });
  const cerrarMut   = useMutation({ mutationFn: id=>api.post(`/rrhh/eval360/${id}/cerrar`),   onSuccess: invalidar });
  const eliminarMut = useMutation({ mutationFn: id=>api.delete(`/rrhh/eval360/${id}`),        onSuccess: ()=>{ invalidar(); setEliminando(null); } });

  const activas  = evaluaciones.filter(e=>e.estado==='activa');
  const borrador = evaluaciones.filter(e=>e.estado==='borrador');
  const cerradas = evaluaciones.filter(e=>e.estado==='cerrada');

  return (
    <div className="p-8">
      <PageHeader
        title="Evaluación 360°"
        subtitle="Evaluaciones de desempeño desde múltiples perspectivas"
        action={
          <button onClick={()=>setModalCrear(true)} className="btn-primary">
            <Plus className="w-4 h-4"/> Nueva evaluación
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          {label:'Total',      value:evaluaciones.length, color:'text-slate-800'},
          {label:'Activas',    value:activas.length,      color:'text-emerald-600'},
          {label:'Borrador',   value:borrador.length,     color:'text-amber-600'},
          {label:'Cerradas',   value:cerradas.length,     color:'text-blue-600'},
        ].map(s=>(
          <div key={s.label} className="card p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {isLoading ? <p className="text-slate-400 text-sm">Cargando...</p> :
      evaluaciones.length===0 ? (
        <div className="card p-16 text-center">
          <Users2 className="w-12 h-12 text-slate-200 mx-auto mb-4"/>
          <h3 className="text-slate-600 font-semibold mb-2">No hay evaluaciones 360° aún</h3>
          <p className="text-slate-400 text-sm mb-6">Crea una evaluación para obtener retroalimentación de múltiples perspectivas sobre un colaborador.</p>
          <button onClick={()=>setModalCrear(true)} className="btn-primary mx-auto"><Plus className="w-4 h-4"/> Crear evaluación</button>
        </div>
      ) : (
        <div className="space-y-8">
          {activas.length>0&&(
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Activas ({activas.length})</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {activas.map(e=><EvalCard key={e.id} e={e} onActivar={id=>activarMut.mutate(id)} onCerrar={id=>cerrarMut.mutate(id)} onEliminar={setEliminando} onVer={id=>navigate(`/rrhh/eval360/${id}`)}/>)}
              </div>
            </div>
          )}
          {borrador.length>0&&(
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Borradores ({borrador.length})</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {borrador.map(e=><EvalCard key={e.id} e={e} onActivar={id=>activarMut.mutate(id)} onCerrar={id=>cerrarMut.mutate(id)} onEliminar={setEliminando} onVer={id=>navigate(`/rrhh/eval360/${id}`)}/>)}
              </div>
            </div>
          )}
          {cerradas.length>0&&(
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Cerradas ({cerradas.length})</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {cerradas.map(e=><EvalCard key={e.id} e={e} onActivar={id=>activarMut.mutate(id)} onCerrar={id=>cerrarMut.mutate(id)} onEliminar={setEliminando} onVer={id=>navigate(`/rrhh/eval360/${id}`)}/>)}
              </div>
            </div>
          )}
        </div>
      )}

      {modalCrear && <ModalCrear clientes={clientes} onClose={()=>setModalCrear(false)} onSave={invalidar}/>}

      {eliminando && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4"><Trash2 className="w-6 h-6 text-red-600"/></div>
            <h3 className="text-base font-bold text-slate-900 mb-2">¿Eliminar evaluación?</h3>
            <p className="text-sm text-slate-500 mb-6">Se eliminarán todos los evaluadores y respuestas.</p>
            <div className="flex gap-3">
              <button onClick={()=>setEliminando(null)} className="btn-secondary flex-1 justify-center">Cancelar</button>
              <button onClick={()=>eliminarMut.mutate(eliminando)} disabled={eliminarMut.isPending} className="flex-1 justify-center bg-red-600 hover:bg-red-700 text-white font-semibold text-sm px-5 py-2.5 rounded-lg">
                {eliminarMut.isPending?'Eliminando...':'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
