import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, X, Wind, Users, BarChart3, Play, Square, Trash2, Eye, Link, Copy, Check, ClipboardList, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../../services/api';
import PageHeader from '../../components/ui/PageHeader';

const ESTADO_CONFIG = {
  borrador: { label:'Borrador', cls:'badge-gray',   dot:'#94A3B8' },
  activa:   { label:'Activa',   cls:'badge-green',  dot:'#059669' },
  cerrada:  { label:'Cerrada',  cls:'badge-blue',   dot:'#2563EB' },
};

// ── Modal crear encuesta ──────────────────────────────────
function ModalCrear({ clientes, pruebas, onClose, onSave }) {
  const [step, setStep]   = useState(1);
  const [form, setForm]   = useState({
    nombre:'', descripcion:'', empresa_cliente_id:'', prueba_id:'',
    anonima:true, fecha_inicio:'', fecha_cierre:'', visible_empresa:true,
    tipo_preguntas: 'banco', // banco | propias
  });
  const [preguntas, setPreguntas] = useState([
    { texto:'', categoria:'General', tipo_respuesta:'likert5' },
  ]);
  const [error, setError] = useState('');
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const mut = useMutation({
    mutationFn: () => api.post('/rrhh/clima', {
      ...form,
      prueba_id: form.tipo_preguntas === 'banco' ? form.prueba_id : null,
      preguntas: form.tipo_preguntas === 'propias' ? preguntas.filter(p=>p.texto.trim()) : [],
    }),
    onSuccess: () => { onSave(); onClose(); },
    onError: err => setError(err.response?.data?.error || 'Error al crear'),
  });

  const addPregunta = () => setPreguntas(p=>[...p,{texto:'',categoria:'General',tipo_respuesta:'likert5'}]);
  const setPregunta = (i,k,v) => setPreguntas(p=>p.map((x,idx)=>idx===i?{...x,[k]:v}:x));
  const removePregunta = (i) => setPreguntas(p=>p.filter((_,idx)=>idx!==i));

  const climaPruebas = pruebas.filter(p=>p.tipo==='clima' || p.tipo==='360');

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">Nueva encuesta de clima</h3>
            <p className="text-xs text-slate-400 mt-0.5">Paso {step} de 3</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg"><X className="w-4 h-4 text-slate-400"/></button>
        </div>

        {/* Steps */}
        <div className="flex items-center px-6 pt-4 gap-1 mb-1">
          {[['1','Datos'],['2','Preguntas'],['3','Config']].map(([n,l],i)=>(
            <div key={n} className="flex items-center gap-1 flex-1">
              <div className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 ${step>i+1?'bg-emerald-500 text-white':step===i+1?'bg-brand-600 text-white':'bg-slate-100 text-slate-400'}`}>
                {step>i+1?'✓':n}
              </div>
              <span className={`text-xs font-medium ${step===i+1?'text-slate-800':'text-slate-400'}`}>{l}</span>
              {i<2&&<div className="flex-1 h-px bg-slate-200 mx-1"/>}
            </div>
          ))}
        </div>

        {/* Paso 1: Datos básicos */}
        {step===1 && (
          <div className="p-6 space-y-4">
            <div>
              <label className="label">Nombre de la encuesta *</label>
              <input type="text" value={form.nombre} onChange={e=>set('nombre',e.target.value)} placeholder="Ej: Clima Organizacional Q2 2026" className="input"/>
            </div>
            <div>
              <label className="label">Descripción</label>
              <textarea value={form.descripcion} onChange={e=>set('descripcion',e.target.value)} rows={2} placeholder="Breve descripción del objetivo de la encuesta" className="input resize-none"/>
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
        {step===2 && (
          <div className="p-6">
            <div className="flex gap-2 mb-5">
              {[['banco','Usar prueba del banco'],['propias','Crear preguntas propias']].map(([v,l])=>(
                <button key={v} onClick={()=>set('tipo_preguntas',v)} className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold border-2 transition-all ${form.tipo_preguntas===v?'border-brand-500 bg-brand-50 text-brand-700':'border-slate-200 text-slate-500'}`}>
                  {l}
                </button>
              ))}
            </div>

            {form.tipo_preguntas === 'banco' ? (
              <div>
                <label className="label">Prueba de clima del banco</label>
                {climaPruebas.length === 0 ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
                    No tienes pruebas de tipo "clima" o "360" asignadas. Pide al superadmin que te las asigne, o crea preguntas propias.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {climaPruebas.map(p=>(
                      <label key={p.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${form.prueba_id===p.id?'border-brand-400 bg-brand-50':'border-slate-200 hover:border-slate-300'}`}>
                        <input type="radio" checked={form.prueba_id===p.id} onChange={()=>set('prueba_id',p.id)} className="w-4 h-4 text-brand-600"/>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-slate-800">{p.nombre}</p>
                          <p className="text-xs text-slate-400">{p.total_items} ítems · {p.tipo}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <p className="text-xs text-slate-500 mb-4">Agrega las preguntas que quieres hacer a los empleados.</p>
                <div className="space-y-3">
                  {preguntas.map((p,i)=>(
                    <div key={i} className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                      <div className="flex items-start gap-2 mb-2">
                        <span className="text-xs font-bold text-slate-400 mt-2 w-5">{i+1}.</span>
                        <textarea value={p.texto} onChange={e=>setPregunta(i,'texto',e.target.value)} rows={2} placeholder="Ej: ¿Te sientes valorado por tu equipo?" className="input text-xs py-2 flex-1 resize-none"/>
                        {preguntas.length > 1 && (
                          <button onClick={()=>removePregunta(i)} className="p-1 text-red-400 hover:bg-red-50 rounded-lg mt-1"><X className="w-3.5 h-3.5"/></button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 pl-7">
                        <div>
                          <label className="text-xs text-slate-400 mb-1 block">Categoría</label>
                          <input value={p.categoria} onChange={e=>setPregunta(i,'categoria',e.target.value)} placeholder="Ej: Liderazgo" className="input text-xs py-1.5"/>
                        </div>
                        <div>
                          <label className="text-xs text-slate-400 mb-1 block">Tipo</label>
                          <select value={p.tipo_respuesta} onChange={e=>setPregunta(i,'tipo_respuesta',e.target.value)} className="input text-xs py-1.5">
                            <option value="likert5">Escala 1-5</option>
                            <option value="likert10">Escala 1-10</option>
                            <option value="si_no">Sí / No</option>
                            <option value="texto">Texto libre</option>
                          </select>
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
          </div>
        )}

        {/* Paso 3: Configuración */}
        {step===3 && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <p className="text-sm font-semibold text-slate-800">Encuesta anónima</p>
                <p className="text-xs text-slate-400 mt-0.5">Los participantes no serán identificados</p>
              </div>
              <button onClick={()=>set('anonima',!form.anonima)} className={`w-12 h-6 rounded-full transition-colors relative ${form.anonima?'bg-brand-600':'bg-slate-300'}`}>
                <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${form.anonima?'translate-x-6':'translate-x-0.5'}`}/>
              </button>
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <p className="text-sm font-semibold text-slate-800">Visible para empresa cliente</p>
                <p className="text-xs text-slate-400 mt-0.5">La empresa puede ver sus propios resultados</p>
              </div>
              <button onClick={()=>set('visible_empresa',!form.visible_empresa)} className={`w-12 h-6 rounded-full transition-colors relative ${form.visible_empresa?'bg-brand-600':'bg-slate-300'}`}>
                <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${form.visible_empresa?'translate-x-6':'translate-x-0.5'}`}/>
              </button>
            </div>
            {form.anonima && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-700">
                ℹ️ Se generará un link público que cualquier persona puede usar para responder de forma anónima.
              </div>
            )}
            {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg">{error}</p>}
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-between">
          <button onClick={step===1?onClose:()=>setStep(s=>s-1)} className="btn-secondary">
            {step===1?'Cancelar':'← Atrás'}
          </button>
          {step < 3 ? (
            <button onClick={()=>setStep(s=>s+1)} disabled={step===1&&!form.nombre} className="btn-primary">
              Siguiente →
            </button>
          ) : (
            <button onClick={()=>mut.mutate()} disabled={mut.isPending} className="btn-primary">
              {mut.isPending ? 'Creando...' : 'Crear encuesta'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Tarjeta de encuesta ───────────────────────────────────
function EncuestaCard({ e, onActivar, onCerrar, onEliminar, onVer, onCopiarLink }) {
  const est    = ESTADO_CONFIG[e.estado] || ESTADO_CONFIG.borrador;
  const tasa   = e.total_participantes > 0 ? Math.round((e.completados/e.total_participantes)*100) : 0;
  const [copied, setCopied] = useState(false);

  const copiar = async () => {
    await onCopiarLink(e.id);
    setCopied(true);
    setTimeout(()=>setCopied(false), 2000);
  };

  return (
    <div className="card p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={est.cls}>{est.label}</span>
            {e.anonima && <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Anónima</span>}
          </div>
          <h3 className="text-sm font-bold text-slate-900 leading-tight">{e.nombre}</h3>
          {e.empresa_cliente_nombre && <p className="text-xs text-slate-400 mt-0.5">{e.empresa_cliente_nombre}</p>}
        </div>
        <div className="flex gap-1 flex-shrink-0">
          {e.estado === 'borrador' && (
            <button onClick={()=>onActivar(e.id)} title="Activar" className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors">
              <Play className="w-3.5 h-3.5"/>
            </button>
          )}
          {e.estado === 'activa' && (
            <>
              <button onClick={copiar} title="Copiar link" className={`p-1.5 rounded-lg transition-colors ${copied?'text-emerald-600 bg-emerald-50':'text-blue-500 hover:bg-blue-50'}`}>
                {copied ? <Check className="w-3.5 h-3.5"/> : <Link className="w-3.5 h-3.5"/>}
              </button>
              <button onClick={()=>onCerrar(e.id)} title="Cerrar" className="p-1.5 text-amber-500 hover:bg-amber-50 rounded-lg transition-colors">
                <Square className="w-3.5 h-3.5"/>
              </button>
            </>
          )}
          <button onClick={()=>onVer(e.id)} title="Ver detalle" className="p-1.5 text-brand-500 hover:bg-brand-50 rounded-lg transition-colors">
            <Eye className="w-3.5 h-3.5"/>
          </button>
          <button onClick={()=>onEliminar(e.id)} title="Eliminar" className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors">
            <Trash2 className="w-3.5 h-3.5"/>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        {[
          { label:'Participantes', value: e.total_participantes||0 },
          { label:'Completados',   value: e.completados||0 },
          { label:'Preguntas',     value: e.total_preguntas||0 },
        ].map(s=>(
          <div key={s.label} className="text-center">
            <div className="text-lg font-bold text-slate-800">{s.value}</div>
            <div className="text-xs text-slate-400">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Barra de progreso */}
      {e.total_participantes > 0 && (
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-slate-400">Participación</span>
            <span className="text-xs font-semibold text-slate-600">{tasa}%</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{width:`${tasa}%`}}/>
          </div>
        </div>
      )}

      {/* Fechas */}
      {(e.fecha_inicio || e.fecha_cierre) && (
        <div className="flex gap-3 mt-3 text-xs text-slate-400">
          {e.fecha_inicio && <span>Inicio: {new Date(e.fecha_inicio).toLocaleDateString('es-DO')}</span>}
          {e.fecha_cierre && <span>Cierre: {new Date(e.fecha_cierre).toLocaleDateString('es-DO')}</span>}
        </div>
      )}
    </div>
  );
}

// ── Página principal ──────────────────────────────────────
export default function ClimaLaboral() {
  const qc       = useQueryClient();
  const navigate = useNavigate();
  const [modalCrear, setModalCrear] = useState(false);
  const [eliminando, setEliminando] = useState(null);

  const { data: encuestas=[], isLoading } = useQuery({
    queryKey: ['clima-encuestas'],
    queryFn: () => api.get('/rrhh/clima').then(r=>r.data),
  });
  const { data: clientes=[] } = useQuery({
    queryKey: ['rrhh-clientes'],
    queryFn: () => api.get('/rrhh/empresas-cliente').then(r=>r.data),
  });
  const { data: pruebas=[] } = useQuery({
    queryKey: ['rrhh-pruebas-disponibles'],
    queryFn: () => api.get('/rrhh/pruebas-disponibles').then(r=>r.data),
  });

  const invalidar = () => qc.invalidateQueries(['clima-encuestas']);

  const activarMut  = useMutation({ mutationFn: id=>api.post(`/rrhh/clima/${id}/activar`),  onSuccess: invalidar });
  const cerrarMut   = useMutation({ mutationFn: id=>api.post(`/rrhh/clima/${id}/cerrar`),   onSuccess: invalidar });
  const eliminarMut = useMutation({ mutationFn: id=>api.delete(`/rrhh/clima/${id}`),        onSuccess: ()=>{ invalidar(); setEliminando(null); } });

  const copiarLink = async (id) => {
    const { data } = await api.get(`/rrhh/clima/${id}/link-publico`);
    navigator.clipboard.writeText(data.link);
  };

  const activas  = encuestas.filter(e=>e.estado==='activa');
  const borrador = encuestas.filter(e=>e.estado==='borrador');
  const cerradas = encuestas.filter(e=>e.estado==='cerrada');

  return (
    <div className="p-8">
      <PageHeader
        title="Clima Laboral"
        subtitle="Gestiona encuestas de clima organizacional para tus empresas cliente"
        action={
          <button onClick={()=>setModalCrear(true)} className="btn-primary">
            <Plus className="w-4 h-4"/> Nueva encuesta
          </button>
        }
      />

      {/* Stats globales */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label:'Total encuestas', value: encuestas.length,   color:'text-slate-800' },
          { label:'Activas',         value: activas.length,     color:'text-emerald-600' },
          { label:'En borrador',     value: borrador.length,    color:'text-amber-600' },
          { label:'Cerradas',        value: cerradas.length,    color:'text-blue-600' },
        ].map(s=>(
          <div key={s.label} className="card p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {isLoading ? <p className="text-slate-400 text-sm">Cargando...</p> :
      encuestas.length === 0 ? (
        <div className="card p-16 text-center">
          <Wind className="w-12 h-12 text-slate-200 mx-auto mb-4"/>
          <h3 className="text-slate-600 font-semibold mb-2">No hay encuestas de clima aún</h3>
          <p className="text-slate-400 text-sm mb-6">Crea tu primera encuesta para medir el clima organizacional de tus empresas cliente.</p>
          <button onClick={()=>setModalCrear(true)} className="btn-primary mx-auto">
            <Plus className="w-4 h-4"/> Crear encuesta
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {activas.length > 0 && (
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Activas ({activas.length})</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {activas.map(e=><EncuestaCard key={e.id} e={e} onActivar={id=>activarMut.mutate(id)} onCerrar={id=>cerrarMut.mutate(id)} onEliminar={setEliminando} onVer={id=>navigate(`/rrhh/clima/${id}`)} onCopiarLink={copiarLink}/>)}
              </div>
            </div>
          )}
          {borrador.length > 0 && (
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Borradores ({borrador.length})</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {borrador.map(e=><EncuestaCard key={e.id} e={e} onActivar={id=>activarMut.mutate(id)} onCerrar={id=>cerrarMut.mutate(id)} onEliminar={setEliminando} onVer={id=>navigate(`/rrhh/clima/${id}`)} onCopiarLink={copiarLink}/>)}
              </div>
            </div>
          )}
          {cerradas.length > 0 && (
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Cerradas ({cerradas.length})</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {cerradas.map(e=><EncuestaCard key={e.id} e={e} onActivar={id=>activarMut.mutate(id)} onCerrar={id=>cerrarMut.mutate(id)} onEliminar={setEliminando} onVer={id=>navigate(`/rrhh/clima/${id}`)} onCopiarLink={copiarLink}/>)}
              </div>
            </div>
          )}
        </div>
      )}

      {modalCrear && <ModalCrear clientes={clientes} pruebas={pruebas} onClose={()=>setModalCrear(false)} onSave={invalidar}/>}

      {eliminando && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-600"/>
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">¿Eliminar encuesta?</h3>
            <p className="text-sm text-slate-500 mb-6">Se eliminarán todos los participantes y respuestas.</p>
            <div className="flex gap-3">
              <button onClick={()=>setEliminando(null)} className="btn-secondary flex-1 justify-center">Cancelar</button>
              <button onClick={()=>eliminarMut.mutate(eliminando)} disabled={eliminarMut.isPending} className="flex-1 justify-center bg-red-600 hover:bg-red-700 text-white font-semibold text-sm px-5 py-2.5 rounded-lg transition-all">
                {eliminarMut.isPending ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
