import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, X, ClipboardList, Mail, Building2, Trash2, Target, GitCompareArrows } from 'lucide-react';
import api from '../../services/api';
import PageHeader from '../../components/ui/PageHeader';
import ModalPerfilPuesto from '../../components/rrhh/ModalPerfilPuesto';
import EtapaSelector from '../../components/ui/EtapaSelector';

const TIPO_COLOR = {
  personalidad:'bg-blue-100 text-blue-700', inteligencia:'bg-amber-100 text-amber-700',
  competencias:'bg-emerald-100 text-emerald-700', tecnica:'bg-slate-100 text-slate-600',
  clima:'bg-purple-100 text-purple-700', '360':'bg-rose-100 text-rose-700',
};

const TIPO_LABELS = {
  personalidad:'Personalidad', comportamiento:'Comportamiento', inteligencia:'Inteligencia',
  competencias:'Competencias', laborales:'Laborales', tecnica:'Técnica', '360':'360°', clima:'Clima',
};
const TIPO_ICON_COLOR = {
  personalidad:'#6366F1', comportamiento:'#D97706', inteligencia:'#0EA5E9',
  competencias:'#059669', laborales:'#F97316', tecnica:'#64748B', '360':'#DC2626', clima:'#8B5CF6',
};
const TIPO_BG = {
  personalidad:'#EEF2FF', comportamiento:'#FEF3C7', inteligencia:'#E0F2FE',
  competencias:'#D1FAE5', laborales:'#FFEDD5', tecnica:'#F1F5F9', '360':'#FEE2E2', clima:'#F3E8FF',
};

function PruebasDisponibles({ pruebas }) {
  const [open, setOpen] = useState(false);
  const grupos = pruebas.reduce((acc, p) => {
    const tipo = p.tipo || 'personalidad';
    if (!acc[tipo]) acc[tipo] = [];
    acc[tipo].push(p);
    return acc;
  }, {});

  return (
    <div className="mb-6">
      <button onClick={()=>setOpen(v=>!v)} className="flex items-center gap-3 w-full text-left mb-3 group">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Pruebas disponibles</span>
        <span className="text-xs bg-slate-100 text-slate-500 font-semibold px-2 py-0.5 rounded-full">{pruebas.length}</span>
        <div className="flex gap-1 flex-1">
          {Object.entries(grupos).map(([tipo, ps])=>(
            <span key={tipo} style={{ background:TIPO_BG[tipo]||'#F1F5F9', color:TIPO_ICON_COLOR[tipo]||'#64748B' }}
              className="text-xs font-semibold px-2 py-0.5 rounded-full">
              {TIPO_LABELS[tipo]||tipo} ({ps.length})
            </span>
          ))}
        </div>
        <span className="text-xs text-slate-400 group-hover:text-slate-600 transition-colors">
          {open ? '▲ Ocultar' : '▼ Ver todas'}
        </span>
      </button>
      {open && (
        <div className="card p-4">
          <div className="space-y-4">
            {Object.entries(grupos).map(([tipo, ps])=>(
              <div key={tipo}>
                <div className="flex items-center gap-2 mb-2">
                  <span style={{ background:TIPO_BG[tipo]||'#F1F5F9', color:TIPO_ICON_COLOR[tipo]||'#64748B' }}
                    className="text-xs font-bold px-2.5 py-1 rounded-full">
                    {TIPO_LABELS[tipo]||tipo}
                  </span>
                  <div className="flex-1 h-px bg-slate-100"/>
                  <span className="text-xs text-slate-400">{ps.length} prueba(s)</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {ps.map(p=>(
                    <div key={p.id} className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5">
                      <ClipboardList className="w-3 h-3 text-slate-400"/>
                      <span className="text-xs font-medium text-slate-700">{p.nombre}</span>
                      <span className="text-xs text-slate-400">{p.total_items} ítems</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ModalProceso({ clientes, pruebas, onClose, onSave }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ empresa_cliente_id:'', nombre:'', puesto:'', descripcion:'', fecha_inicio:'', fecha_limite:'' });
  const [pruebasSeleccionadas, setPruebasSeleccionadas] = useState([]);
  const [error, setError] = useState('');
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const mut = useMutation({
    mutationFn: d=>api.post('/rrhh/procesos', d),
    onSuccess: ()=>{ onSave(); onClose(); },
    onError: err=>setError(err.response?.data?.error||'Error al crear proceso'),
  });
  const togglePrueba = id=>setPruebasSeleccionadas(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id]);
  const clienteSeleccionado = form.empresa_cliente_id === 'propio'
    ? { nombre: 'Proceso propio' }
    : clientes.find(c=>c.id===form.empresa_cliente_id);

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div><h3 className="text-base font-bold text-slate-900">Nuevo proceso de selección</h3><p className="text-xs text-slate-400 mt-0.5">Paso {step} de 3</p></div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg"><X className="w-4 h-4 text-slate-400"/></button>
        </div>
        <div className="flex items-center px-6 pt-5 gap-1 mb-2">
          {[['1','Cliente'],['2','Datos'],['3','Pruebas']].map(([n,l],i)=>(
            <div key={n} className="flex items-center gap-1 flex-1">
              <div className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 ${step>i+1?'bg-emerald-500 text-white':step===i+1?'bg-brand-600 text-white':'bg-slate-100 text-slate-400'}`}>{step>i+1?'✓':n}</div>
              <span className={`text-xs font-medium ${step===i+1?'text-slate-800':'text-slate-400'}`}>{l}</span>
              {i<2&&<div className="flex-1 h-px bg-slate-200 mx-1"/>}
            </div>
          ))}
        </div>

        {step===1&&(
          <div className="p-6">
            <p className="text-sm text-slate-500 mb-4">¿Para qué empresa cliente es este proceso?</p>
            <div className="space-y-2">

              {/* ── Proceso propio ── */}
              <label className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${form.empresa_cliente_id==='propio'?'border-brand-400 bg-brand-50':'border-slate-200 hover:border-slate-300'}`}>
                <input type="radio" name="cliente" checked={form.empresa_cliente_id==='propio'} onChange={()=>set('empresa_cliente_id','propio')} className="w-4 h-4 text-brand-600"/>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-800">Proceso propio</p>
                  <p className="text-xs text-slate-400">Reclutamiento interno — sin empresa cliente</p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 border border-brand-200">Interno</span>
              </label>

              {/* Separador */}
              {clientes.length>0&&(
                <div className="flex items-center gap-2 py-1">
                  <div className="flex-1 h-px bg-slate-100"/>
                  <span className="text-xs text-slate-400">o selecciona una empresa cliente</span>
                  <div className="flex-1 h-px bg-slate-100"/>
                </div>
              )}

              {/* ── Empresas cliente ── */}
              {clientes.map(c=>(
                <label key={c.id} className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${form.empresa_cliente_id===c.id?'border-brand-400 bg-brand-50':'border-slate-200 hover:border-slate-300'}`}>
                  <input type="radio" name="cliente" checked={form.empresa_cliente_id===c.id} onChange={()=>set('empresa_cliente_id',c.id)} className="w-4 h-4 text-brand-600"/>
                  <div className="flex-1"><p className="text-sm font-semibold text-slate-800">{c.nombre}</p><p className="text-xs text-slate-400">{c.sector||'—'} · {c.total_candidatos||0} candidatos evaluados</p></div>
                  <span className={c.activo?'badge-green':'badge-gray'}>{c.activo?'Activa':'Inactiva'}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {step===2&&(
          <div className="p-6 space-y-4">
            {clienteSeleccionado&&(<div className="bg-brand-50 border border-brand-200 rounded-xl px-4 py-3 flex items-center gap-2"><Building2 className="w-4 h-4 text-brand-600"/><span className="text-sm font-semibold text-brand-800">{clienteSeleccionado.nombre}</span></div>)}
            <div><label className="label">Nombre del proceso *</label><input type="text" value={form.nombre} onChange={e=>set('nombre',e.target.value)} placeholder="Ej: Selección Analista de Ventas Q2" className="input"/></div>
            <div><label className="label">Puesto a cubrir</label><input type="text" value={form.puesto} onChange={e=>set('puesto',e.target.value)} placeholder="Ej: Analista de Ventas" className="input"/></div>
            <div><label className="label">Descripción</label><textarea value={form.descripcion} onChange={e=>set('descripcion',e.target.value)} rows={2} className="input resize-none"/></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="label">Fecha inicio</label><input type="date" value={form.fecha_inicio} onChange={e=>set('fecha_inicio',e.target.value)} className="input"/></div>
              <div><label className="label">Fecha límite</label><input type="date" value={form.fecha_limite} onChange={e=>set('fecha_limite',e.target.value)} className="input"/></div>
            </div>
          </div>
        )}

        {step===3&&(
          <div className="p-6">
            <p className="text-sm text-slate-500 mb-4">Selecciona las pruebas que aplicarás en este proceso.</p>
            {pruebas.length===0?(<div className="text-center py-8"><ClipboardList className="w-10 h-10 text-slate-200 mx-auto mb-2"/><p className="text-sm text-slate-400">No tienes pruebas asignadas.</p></div>):(
              <div className="space-y-2">{pruebas.map(p=>(
                <label key={p.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${pruebasSeleccionadas.includes(p.id)?'border-brand-400 bg-brand-50':'border-slate-200 hover:border-slate-300'}`}>
                  <input type="checkbox" checked={pruebasSeleccionadas.includes(p.id)} onChange={()=>togglePrueba(p.id)} className="w-4 h-4 text-brand-600 rounded"/>
                  <div className="flex-1"><p className="text-sm font-semibold text-slate-800">{p.nombre}</p><p className="text-xs text-slate-400">{p.total_items} ítems · {p.escala_tipo}{p.tiempo_limite?` · ${p.tiempo_limite} min`:''}</p></div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TIPO_COLOR[p.tipo]||'bg-slate-100 text-slate-600'}`}>{p.tipo}</span>
                </label>
              ))}</div>
            )}
            {pruebasSeleccionadas.length>0&&(<div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-700">✓ {pruebasSeleccionadas.length} prueba(s) seleccionada(s)</div>)}
            {error&&<p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg mt-4">{error}</p>}
          </div>
        )}

        <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-between">
          <button onClick={step===1?onClose:()=>setStep(s=>s-1)} className="btn-secondary">{step===1?'Cancelar':'← Atrás'}</button>
          {step<3?(<button onClick={()=>setStep(s=>s+1)} disabled={step===1?!form.empresa_cliente_id:!form.nombre} className="btn-primary">Siguiente →</button>):(
            <button onClick={()=>mut.mutate({...form, prueba_ids:pruebasSeleccionadas})} disabled={mut.isPending||pruebasSeleccionadas.length===0} className="btn-primary">{mut.isPending?'Creando...':'Crear proceso'}</button>
          )}
        </div>
      </div>
    </div>
  );
}

function ModalInvitar({ proceso, onClose, onSave }) {
  const [filas, setFilas] = useState([{nombre:'',apellido:'',email:''}]);
  const [error, setError] = useState('');
  const [resultado, setResultado] = useState(null);
  const [copiado, setCopiado] = useState({});
  const APP_URL = window.location.origin;
  const agregar = ()=>setFilas(f=>[...f,{nombre:'',apellido:'',email:''}]);
  const quitar  = i=>setFilas(f=>f.filter((_,idx)=>idx!==i));
  const setFila = (i,k,v)=>setFilas(f=>f.map((r,idx)=>idx===i?{...r,[k]:v}:r));
  const mut = useMutation({
    mutationFn: ()=>api.post(`/rrhh/procesos/${proceso.id}/candidatos`,{candidatos:filas.filter(f=>f.nombre&&f.email)}),
    onSuccess: res=>{ setResultado(res.data); onSave(); },
    onError: err=>setError(err.response?.data?.error||'Error al invitar'),
  });
  const copiarLink = (token, idx) => {
    navigator.clipboard.writeText(`${APP_URL}/evaluacion/${token}`).then(()=>{ setCopiado(c=>({...c,[idx]:true})); setTimeout(()=>setCopiado(c=>({...c,[idx]:false})),2000); });
  };
  const copiarTodos = () => {
    if (!resultado?.candidatos) return;
    const texto = resultado.candidatos.map(c=>`${c.nombre} ${c.apellido||''} — ${APP_URL}/evaluacion/${c.token_acceso}`).join('\n');
    navigator.clipboard.writeText(texto).then(()=>{ setCopiado(c=>({...c,todos:true})); setTimeout(()=>setCopiado(c=>({...c,todos:false})),2000); });
  };
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div><h3 className="text-base font-bold text-slate-900">Invitar candidatos</h3><p className="text-xs text-slate-400 mt-0.5">{proceso.nombre} · {proceso.empresa_cliente_nombre}</p></div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg"><X className="w-4 h-4 text-slate-400"/></button>
        </div>
        <div className="p-6">
          {resultado!==null?(
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0"><Mail className="w-5 h-5 text-emerald-600"/></div>
                <div><h4 className="text-sm font-bold text-slate-900">{resultado.invitados} candidato(s) invitado(s)</h4><p className="text-xs text-slate-400">Email enviado · Links disponibles para copiar</p></div>
                <button onClick={copiarTodos} className={`ml-auto text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${copiado.todos?'bg-emerald-100 text-emerald-700':'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{copiado.todos?'✓ Copiados':'Copiar todos'}</button>
              </div>
              <div className="space-y-3 mb-5">
                {resultado.candidatos?.map((c,i)=>{
                  const link=`${APP_URL}/evaluacion/${c.token_acceso}`;
                  return (
                    <div key={c.id} className="border border-slate-200 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div><p className="text-sm font-semibold text-slate-800">{c.nombre} {c.apellido}</p><p className="text-xs text-slate-400">{c.email}</p></div>
                        <button onClick={()=>copiarLink(c.token_acceso,i)} className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${copiado[i]?'bg-emerald-100 text-emerald-700':'bg-brand-50 text-brand-700 hover:bg-brand-100'}`}>{copiado[i]?'✓ Copiado':'📋 Copiar link'}</button>
                      </div>
                      <div className="bg-slate-50 rounded-lg px-3 py-2"><span className="text-xs text-slate-500 font-mono break-all">{link}</span></div>
                    </div>
                  );
                })}
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700 mb-4">⚠️ Guarda estos links — el email ya fue enviado pero puedes compartirlos manualmente si es necesario. Expiran en 7 días.</div>
              <button onClick={onClose} className="btn-primary w-full justify-center">Cerrar</button>
            </div>
          ):(
            <>
              <p className="text-sm text-slate-500 mb-4">Se enviará un email con el link. También podrás copiar el link manualmente después.</p>
              <div className="space-y-2 mb-4">
                {filas.map((f,i)=>(
                  <div key={i} className="flex gap-2 items-center">
                    <div className="flex-1 grid grid-cols-3 gap-2">
                      <input type="text" placeholder="Nombre *" value={f.nombre} onChange={e=>setFila(i,'nombre',e.target.value)} className="input text-xs py-2"/>
                      <input type="text" placeholder="Apellido" value={f.apellido} onChange={e=>setFila(i,'apellido',e.target.value)} className="input text-xs py-2"/>
                      <input type="email" placeholder="Email *" value={f.email} onChange={e=>setFila(i,'email',e.target.value)} className="input text-xs py-2"/>
                    </div>
                    {filas.length>1&&<button onClick={()=>quitar(i)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"><X className="w-3.5 h-3.5"/></button>}
                  </div>
                ))}
              </div>
              <button onClick={agregar} className="btn-secondary w-full justify-center text-xs py-2 mb-4"><Plus className="w-3.5 h-3.5"/> Agregar candidato</button>
              {error&&<p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg mb-4">{error}</p>}
              <div className="flex gap-3 justify-end">
                <button onClick={onClose} className="btn-secondary">Cancelar</button>
                <button onClick={()=>mut.mutate()} disabled={mut.isPending||!filas.some(f=>f.nombre&&f.email)} className="btn-primary">{mut.isPending?'Enviando...':`Enviar ${filas.filter(f=>f.nombre&&f.email).length} invitación(es)`}</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const ESTADO_CANDIDATO = {
  completado:  { label:'Completado',  cls:'badge-green'  },
  en_progreso: { label:'En progreso', cls:'badge-blue'   },
  pendiente:   { label:'Pendiente',   cls:'badge-yellow' },
  expirado:    { label:'Expirado',    cls:'badge-gray'   },
};

function ProcesoRow({ proceso, onInvitar, onEliminar, onPerfil, onComparar }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const queryKey = ['rrhh-proceso-candidatos', proceso.id];

  const { data: candidatos=[] } = useQuery({
    queryKey,
    queryFn: ()=>api.get(`/rrhh/procesos/${proceso.id}/candidatos`).then(r=>r.data),
    enabled: open,
  });

  const completados = candidatos.filter(c=>c.estado==='completado').length;
  const pct = candidatos.length?Math.round((completados/candidatos.length)*100):0;

  const handleEtapaCambio = (candidatoId, nuevaEtapa) => {
    qc.setQueryData(queryKey, old =>
      (old||[]).map(c => c.id === candidatoId ? { ...c, etapa_reclutamiento: nuevaEtapa } : c)
    );
  };

  return (
    <>
      <tr className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
        <td className="px-5 py-4 cursor-pointer" onClick={()=>setOpen(v=>!v)}>
          <p className="font-semibold text-slate-800">{proceso.nombre}</p>
          <p className="text-xs text-slate-400">{proceso.puesto||'Sin puesto'}</p>
        </td>
        <td className="px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center">{proceso.empresa_cliente_nombre?.slice(0,2).toUpperCase()}</div>
            <span className="text-sm text-slate-700">{proceso.empresa_cliente_nombre}</span>
          </div>
        </td>
        <td className="px-5 py-4"><span className={proceso.estado==='activo'?'badge-green':'badge-gray'}>{proceso.estado}</span></td>
        <td className="px-5 py-4 text-slate-600">{proceso.total_candidatos}</td>
        <td className="px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{width:`${pct}%`}}/></div>
            <span className="text-xs text-slate-500">{proceso.completados}/{proceso.total_candidatos}</span>
          </div>
        </td>
        <td className="px-5 py-4 text-slate-500 text-xs">{proceso.fecha_limite?new Date(proceso.fecha_limite).toLocaleDateString('es-DO'):'—'}</td>
        <td className="px-5 py-4">
          <div className="flex gap-2 items-center">
            <button onClick={()=>onPerfil(proceso)} className="p-1.5 text-violet-500 hover:text-violet-700 hover:bg-violet-50 rounded-lg transition-colors" title="Definir perfil de puesto"><Target className="w-3.5 h-3.5"/></button>
            <button onClick={()=>onComparar(proceso)} className="p-1.5 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors" title="Comparar candidatos"><GitCompareArrows className="w-3.5 h-3.5"/></button>
            <button onClick={()=>onInvitar(proceso)} className="btn-primary py-1.5 px-3 text-xs"><Mail className="w-3.5 h-3.5"/> Invitar</button>
            <button onClick={()=>onEliminar(proceso)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar proceso"><Trash2 className="w-3.5 h-3.5"/></button>
          </div>
        </td>
      </tr>
      {open && (
        <tr className="bg-slate-50 border-b border-slate-100">
          <td colSpan={7} className="px-8 py-4">
            {candidatos.length===0 ? (
              <p className="text-sm text-slate-400">No hay candidatos invitados aún.</p>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Candidatos ({candidatos.length})</p>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    {['entrevistado','contratado','no_contratado'].map(etapa => {
                      const n = candidatos.filter(c=>c.etapa_reclutamiento===etapa).length;
                      if (!n) return null;
                      const labels = { entrevistado:'Entrevistados', contratado:'Contratados', no_contratado:'No contratados' };
                      const colors = { entrevistado:'text-blue-600 bg-blue-50', contratado:'text-emerald-600 bg-emerald-50', no_contratado:'text-red-500 bg-red-50' };
                      return <span key={etapa} className={`px-2 py-0.5 rounded-full font-semibold ${colors[etapa]}`}>{n} {labels[etapa]}</span>;
                    })}
                  </div>
                </div>
                {candidatos.map(c=>{
                  const est = ESTADO_CANDIDATO[c.estado]||{label:c.estado,cls:'badge-gray'};
                  return (
                    <div key={c.id} className="flex items-center gap-3 bg-white rounded-xl px-4 py-2.5 border border-slate-100">
                      <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {c.nombre[0]}{c.apellido?.[0]||''}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-800">{c.nombre} {c.apellido}</p>
                        <p className="text-xs text-slate-400">{c.email}</p>
                      </div>
                      <span className={est.cls}>{est.label}</span>
                      {c.fecha_completado && <span className="text-xs text-slate-400">{new Date(c.fecha_completado).toLocaleDateString('es-DO')}</span>}
                      <EtapaSelector
                        candidatoId={c.id}
                        etapaActual={c.etapa_reclutamiento}
                        onCambio={nuevaEtapa => handleEtapaCambio(c.id, nuevaEtapa)}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

export default function ProcesosRRHH() {
  const qc       = useQueryClient();
  const navigate = useNavigate();
  const [modalProceso,  setModalProceso]  = useState(false);
  const [modalInvitar,  setModalInvitar]  = useState(null);
  const [eliminando,    setEliminando]    = useState(null);
  const [modalPerfil,   setModalPerfil]   = useState(null);
  const [filtroCliente, setFiltroCliente] = useState('');

  const eliminarMut = useMutation({
    mutationFn: id => api.delete(`/rrhh/procesos/${id}`),
    onSuccess: () => { qc.invalidateQueries(['rrhh-procesos']); setEliminando(null); },
    onError: err => alert(err.response?.data?.error || 'Error al eliminar'),
  });

  const { data: procesos=[], isLoading } = useQuery({ queryKey:['rrhh-procesos'], queryFn:()=>api.get('/rrhh/procesos').then(r=>r.data) });
  const { data: clientes=[] } = useQuery({ queryKey:['rrhh-clientes'], queryFn:()=>api.get('/rrhh/empresas-cliente').then(r=>r.data) });
  const { data: pruebas=[]  } = useQuery({ queryKey:['rrhh-pruebas-disponibles'], queryFn:()=>api.get('/rrhh/pruebas-disponibles').then(r=>r.data) });

  const invalidar = ()=>qc.invalidateQueries(['rrhh-procesos']);
  const procesosFiltrados = filtroCliente ? procesos.filter(p=>p.empresa_cliente_nombre?.toLowerCase().includes(filtroCliente.toLowerCase())) : procesos;

  return (
    <div className="p-8">
      <PageHeader
        title="Procesos de selección"
        subtitle="Gestiona los procesos de evaluación para tus empresas cliente"
        action={<button onClick={()=>setModalProceso(true)} className="btn-primary"><Plus className="w-4 h-4"/> Nuevo proceso</button>}
      />

      {pruebas.length>0&&<PruebasDisponibles pruebas={pruebas}/>}

      {clientes.length>1&&(
        <div className="mb-4 flex gap-2 flex-wrap">
          <button onClick={()=>setFiltroCliente('')} className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${!filtroCliente?'bg-brand-600 text-white':'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'}`}>Todos</button>
          {clientes.map(c=>(<button key={c.id} onClick={()=>setFiltroCliente(c.nombre)} className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${filtroCliente===c.nombre?'bg-brand-600 text-white':'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'}`}>{c.nombre}</button>))}
        </div>
      )}

      {isLoading?<p className="text-slate-400 text-sm">Cargando...</p>:(
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {['Proceso','Empresa cliente','Estado','Candidatos','Completados','Fecha límite',''].map(h=>(<th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>))}
              </tr>
            </thead>
            <tbody>
              {procesosFiltrados.map(p=>(
                <ProcesoRow
                  key={p.id} proceso={p}
                  onInvitar={setModalInvitar}
                  onEliminar={setEliminando}
                  onPerfil={setModalPerfil}
                  onComparar={p => navigate(`/rrhh/procesos/${p.id}/comparar`)}
                />
              ))}
              {procesosFiltrados.length===0&&(
                <tr><td colSpan={7} className="px-6 py-12 text-center">
                  <ClipboardList className="w-10 h-10 text-slate-200 mx-auto mb-3"/>
                  <p className="text-slate-400 text-sm">No hay procesos creados aún</p>
                  <button onClick={()=>setModalProceso(true)} className="btn-primary mx-auto mt-4"><Plus className="w-4 h-4"/> Crear primer proceso</button>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modalProceso && <ModalProceso clientes={clientes} pruebas={pruebas} onClose={()=>setModalProceso(false)} onSave={invalidar}/>}
      {modalInvitar && <ModalInvitar proceso={modalInvitar} onClose={()=>setModalInvitar(null)} onSave={invalidar}/>}
      {modalPerfil  && <ModalPerfilPuesto procesoId={modalPerfil.id} procesoNombre={modalPerfil.nombre} onClose={()=>setModalPerfil(null)}/>}
      {eliminando && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4"><Trash2 className="w-6 h-6 text-red-600"/></div>
            <h3 className="text-base font-bold text-slate-900 mb-2">¿Eliminar proceso?</h3>
            <p className="text-sm text-slate-500 mb-2"><strong>{eliminando.nombre}</strong> será eliminado permanentemente.</p>
            <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg mb-6">Se eliminarán todos los candidatos y resultados asociados.</p>
            <div className="flex gap-3">
              <button onClick={()=>setEliminando(null)} className="btn-secondary flex-1 justify-center">Cancelar</button>
              <button onClick={()=>eliminarMut.mutate(eliminando.id)} disabled={eliminarMut.isPending} className="flex-1 justify-center bg-red-600 hover:bg-red-700 text-white font-semibold text-sm px-5 py-2.5 rounded-lg transition-all">
                {eliminarMut.isPending ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}