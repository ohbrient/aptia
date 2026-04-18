import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Users, CheckCircle, Clock, AlertCircle, X, Download, UserPlus, Mail, Send, RefreshCw, FileText } from 'lucide-react';
import api from '../../services/api';
import PageHeader from '../../components/ui/PageHeader';

const ESTADO_CONFIG = {
  completado:  { label:'Completado',   cls:'badge-green',  icon:<CheckCircle  className="w-3.5 h-3.5 text-emerald-500"/> },
  en_progreso: { label:'En progreso',  cls:'badge-blue',   icon:<Clock        className="w-3.5 h-3.5 text-blue-500"/>    },
  pendiente:   { label:'Pendiente',    cls:'badge-yellow', icon:<AlertCircle  className="w-3.5 h-3.5 text-amber-500"/>   },
  expirado:    { label:'Expirado',     cls:'badge-gray',   icon:<X            className="w-3.5 h-3.5 text-slate-400"/>   },
  cancelado:   { label:'Cancelado',    cls:'badge-gray',   icon:<X            className="w-3.5 h-3.5 text-slate-400"/>   },
};

const DIM_COLOR = { O:'#7C3AED', C:'#059669', E:'#D97706', A:'#DC2626', N:'#7C3AED', default:'#2563EB' };
const DIM_BG    = { O:'#EDE9FE', C:'#D1FAE5', E:'#FEF3C7', A:'#FEE2E2', N:'#EDE9FE', default:'#DBEAFE' };

function formatInforme(text) {
  if (!text) return '';
  return text.split('\n\n').map(p => {
    if (p.startsWith('### ')) return `<h3 style="font-size:15px;font-weight:700;color:#0F172A;margin:20px 0 8px">${p.slice(4)}</h3>`;
    const html = p.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\*(.+?)\*/g,'<em>$1</em>');
    return html.trim()?`<p style="color:#475569;line-height:1.8;margin-bottom:12px">${html}</p>`:'';
  }).join('');
}

function generarPDF(c) {
  const resultados = c.resultados || [];
  const barras = resultados.map(r => {
    const color = DIM_COLOR[r.codigo]||DIM_COLOR.default;
    const bg    = DIM_BG[r.codigo]||DIM_BG.default;
    const pct   = parseFloat(r.puntaje_pct)||0;
    return `<div style="margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="background:${bg};color:${color};font-size:11px;font-weight:700;padding:2px 8px;border-radius:100px">${r.codigo}</span>
          <span style="font-size:14px;font-weight:600;color:#0F172A">${r.dimension}</span>
        </div>
        <span style="font-size:15px;font-weight:700;color:${color}">${pct}%</span>
      </div>
      <div style="height:10px;background:#F1F5F9;border-radius:100px;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:${color};border-radius:100px"></div>
      </div>
    </div>`;
  }).join('');

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Informe — ${c.nombre} ${c.apellido||''}</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;background:#fff}
.page{max-width:800px;margin:0 auto;padding:40px}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style>
</head><body><div class="page">
<div style="display:flex;justify-content:space-between;padding-bottom:24px;border-bottom:2px solid #2563EB;margin-bottom:32px">
  <div>
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
      <div style="background:#2563EB;color:#fff;width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:700">A</div>
      <span style="font-size:18px;font-weight:700">Aptia</span>
    </div>
    <h1 style="font-size:26px;font-weight:700;margin-bottom:4px">Informe de Evaluación</h1>
    <p style="font-size:13px;color:#64748B">Reporte psicométrico confidencial</p>
  </div>
  <div style="text-align:right">
    <p style="font-size:11px;color:#94A3B8;margin-bottom:2px">Fecha de evaluación</p>
    <p style="font-size:13px;font-weight:600">${c.fecha_completado ? new Date(c.fecha_completado).toLocaleDateString('es-DO',{year:'numeric',month:'long',day:'numeric'}) : '—'}</p>
  </div>
</div>
<div style="background:#F8FAFC;border-radius:12px;padding:20px 24px;margin-bottom:28px;border:1px solid #E2E8F0">
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
    <div>
      <p style="font-size:11px;font-weight:600;color:#94A3B8;text-transform:uppercase;margin-bottom:4px">Candidato</p>
      <p style="font-size:18px;font-weight:700">${c.nombre} ${c.apellido||''}</p>
      <p style="font-size:13px;color:#64748B">${c.email}</p>
    </div>
    <div>
      <p style="font-size:11px;font-weight:600;color:#94A3B8;text-transform:uppercase;margin-bottom:4px">Proceso</p>
      <p style="font-size:15px;font-weight:600">${c.proceso_nombre||'—'}</p>
      <p style="font-size:13px;color:#64748B">${c.puesto||'Sin puesto'}</p>
    </div>
  </div>
</div>
${resultados.length>0?`<div style="margin-bottom:32px">
  <h2 style="font-size:16px;font-weight:700;margin-bottom:20px;padding-bottom:8px;border-bottom:1px solid #E2E8F0">Resultados</h2>
  ${barras}</div>`:''}
${c.informe?`<div>
  <h2 style="font-size:16px;font-weight:700;margin-bottom:16px;padding-bottom:8px;border-bottom:1px solid #E2E8F0">Análisis psicológico</h2>
  ${formatInforme(c.informe)}</div>`:''}
<div style="border-top:1px solid #E2E8F0;padding-top:20px;margin-top:32px;display:flex;justify-content:space-between">
  <p style="font-size:11px;color:#94A3B8">Confidencial · Aptia</p>
  <p style="font-size:11px;color:#94A3B8">Generado el ${new Date().toLocaleDateString('es-DO')}</p>
</div>
</div></body></html>`;

  const win = window.open('','_blank');
  win.document.write(html);
  win.document.close();
  win.onload = ()=>setTimeout(()=>win.print(),500);
}

// ── Modal detalle candidato ───────────────────────────────────
function ModalCandidato({ candidato: c, onClose }) {
  const resultados = c.resultados || [];
  const est = ESTADO_CONFIG[c.estado] || { label: c.estado, cls: 'badge-gray' };
  const APP_URL = window.location.origin;
  const [copiado, setCopiado] = useState(false);

  const copiarLink = () => {
    navigator.clipboard.writeText(`${APP_URL}/evaluacion/${c.token_acceso}`).then(()=>{
      setCopiado(true);
      setTimeout(()=>setCopiado(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div>
            <h3 className="text-base font-bold text-slate-900">{c.nombre} {c.apellido}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{c.proceso_nombre}</p>
          </div>
          <div className="flex items-center gap-2">
            {(c.estado === 'pendiente' || c.estado === 'en_progreso') && (
              <button
                onClick={async () => {
                  try {
                    const base = '/rrhh';
                    await api.post(`${base}/candidatos/${c.id}/reenviar`);
                    alert('Link reenviado exitosamente a ' + c.email);
                  } catch(err) {
                    alert(err.response?.data?.error || 'Error al reenviar');
                  }
                }}
                className="btn-secondary py-2 px-4 text-xs flex items-center gap-1"
              >
                <Send className="w-3.5 h-3.5"/> Reenviar link
              </button>
            )}
            {c.estado === 'completado' && (
              <button
                onClick={() => window.open(`/rrhh/reporte/${c.id}`, '_blank')}
                className="btn-primary py-2 px-4 text-xs flex items-center gap-1"
              >
                <FileText className="w-3.5 h-3.5"/> Reporte PDF
              </button>
            )}
            {c.estado === 'completado' && (
              <button onClick={()=>generarPDF(c)} className="btn-secondary py-2 px-4 text-xs">
                <Download className="w-3.5 h-3.5"/> PDF
              </button>
            )}
            <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg">
              <X className="w-4 h-4 text-slate-400"/>
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Info */}
          <div className="bg-slate-50 rounded-xl p-4 mb-6 grid grid-cols-2 gap-4 text-sm">
            <div><p className="text-xs text-slate-400 mb-0.5">Email</p><p className="font-medium text-slate-800">{c.email}</p></div>
            <div><p className="text-xs text-slate-400 mb-0.5">Estado</p><span className={est.cls}>{est.label}</span></div>
            <div><p className="text-xs text-slate-400 mb-0.5">Invitado</p><p className="font-medium text-slate-800">{new Date(c.created_at).toLocaleDateString('es-DO')}</p></div>
            {c.fecha_completado && <div><p className="text-xs text-slate-400 mb-0.5">Completado</p><p className="font-medium text-slate-800">{new Date(c.fecha_completado).toLocaleDateString('es-DO',{year:'numeric',month:'long',day:'numeric'})}</p></div>}
          </div>

          {/* Link si pendiente */}
          {(c.estado === 'pendiente' || c.estado === 'en_progreso') && (
            <div className="mb-6">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Link de evaluación</p>
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-3">
                <span className="text-xs font-mono text-slate-500 flex-1 truncate">{APP_URL}/evaluacion/{c.token_acceso}</span>
                <button onClick={copiarLink} className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all flex-shrink-0 ${copiado?'bg-emerald-100 text-emerald-700':'bg-brand-50 text-brand-700 hover:bg-brand-100'}`}>
                  {copiado ? '✓ Copiado' : '📋 Copiar'}
                </button>
              </div>
            </div>
          )}

          {/* Resultados */}
          {resultados.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-bold text-slate-800 mb-4">Resultados por dimensión</h4>
              <div className="space-y-4">
                {resultados.map(r => {
                  const color = DIM_COLOR[r.codigo]||DIM_COLOR.default;
                  const bg    = DIM_BG[r.codigo]||DIM_BG.default;
                  const pct   = parseFloat(r.puntaje_pct)||0;
                  return (
                    <div key={r.codigo}>
                      <div className="flex justify-between items-center mb-1.5">
                        <div className="flex items-center gap-2">
                          <span style={{background:bg,color}} className="text-xs font-bold px-2 py-0.5 rounded-full">{r.codigo}</span>
                          <span className="text-sm font-semibold text-slate-700">{r.dimension}</span>
                          <span className="text-xs text-slate-400 capitalize">{r.nivel?.replace('_',' ')}</span>
                        </div>
                        <span className="text-sm font-bold" style={{color}}>{pct}%</span>
                      </div>
                      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{width:`${pct}%`,background:color}}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Informe IA */}
          {c.informe && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-brand-600"/>
                <h4 className="text-sm font-bold text-brand-800">Análisis psicológico — IA</h4>
              </div>
              <div
                className="text-sm leading-relaxed [&_h3]:text-sm [&_h3]:font-bold [&_h3]:text-slate-900 [&_h3]:mt-4 [&_h3]:mb-2 [&_p]:text-slate-600 [&_p]:leading-relaxed [&_p]:mb-3 [&_strong]:text-slate-800"
                dangerouslySetInnerHTML={{__html:formatInforme(c.informe)}}
              />
            </div>
          )}

          {c.estado !== 'completado' && resultados.length === 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
              El candidato aún no ha completado la evaluación.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


// ── Modal crear candidato ─────────────────────────────────────
function ModalCrearCandidato({ endpoint, onClose, onSave }) {
  const [procesos, setProcesos] = useState([]);
  const [form, setForm]   = useState({ nombre:'', apellido:'', email:'', proceso_id:'' });
  const [error, setError] = useState('');
  const [exito, setExito] = useState(null);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  // Cargar procesos disponibles
  const baseEndpoint = endpoint.includes('rrhh') ? '/rrhh' : '/empresa';
  const { data: procs=[] } = useQuery({
    queryKey: ['procesos-para-invitar', baseEndpoint],
    queryFn: () => api.get(`${baseEndpoint}/procesos`).then(r=>r.data),
  });

  const mut = useMutation({
    mutationFn: () => {
      const rutaBase = baseEndpoint === '/rrhh' ? '/rrhh' : '/empresa';
      return api.post(`${rutaBase}/procesos/${form.proceso_id}/candidatos`, {
        candidatos: [{ nombre: form.nombre, apellido: form.apellido, email: form.email }]
      });
    },
    onSuccess: res => { setExito(res.data); onSave(); },
    onError: err => setError(err.response?.data?.error || 'Error al crear candidato'),
  });

  const APP_URL = window.location.origin;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">Nuevo candidato</h3>
            <p className="text-xs text-slate-400 mt-0.5">Se enviará un email con el link de evaluación</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg"><X className="w-4 h-4 text-slate-400"/></button>
        </div>
        <div className="p-6">
          {exito ? (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5 text-emerald-600"/>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">¡Candidato creado!</p>
                  <p className="text-xs text-slate-400">Email enviado · Link disponible</p>
                </div>
              </div>
              {exito.candidatos?.map((c,i) => {
                const link = `${APP_URL}/evaluacion/${c.token_acceso}`;
                return (
                  <div key={i} className="border border-slate-200 rounded-xl p-3 mb-4">
                    <p className="text-sm font-semibold text-slate-800 mb-2">{c.nombre} {c.apellido}</p>
                    <div className="bg-slate-50 rounded-lg px-3 py-2">
                      <span className="text-xs text-slate-500 font-mono break-all">{link}</span>
                    </div>
                  </div>
                );
              })}
              <button onClick={onClose} className="btn-primary w-full justify-center">Cerrar</button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="label">Proceso *</label>
                <select value={form.proceso_id} onChange={e=>set('proceso_id',e.target.value)} className="input">
                  <option value="">Seleccionar proceso...</option>
                  {procs.filter(p=>p.estado==='activo').map(p=>(
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Nombre *</label>
                  <input type="text" value={form.nombre} onChange={e=>set('nombre',e.target.value)} placeholder="Juan" className="input"/>
                </div>
                <div>
                  <label className="label">Apellido</label>
                  <input type="text" value={form.apellido} onChange={e=>set('apellido',e.target.value)} placeholder="Pérez" className="input"/>
                </div>
              </div>
              <div>
                <label className="label">Email *</label>
                <input type="email" value={form.email} onChange={e=>set('email',e.target.value)} placeholder="juan@email.com" className="input"/>
              </div>
              {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg">{error}</p>}
              <div className="flex gap-3 justify-end pt-2">
                <button onClick={onClose} className="btn-secondary">Cancelar</button>
                <button
                  onClick={() => mut.mutate()}
                  disabled={mut.isPending || !form.nombre || !form.email || !form.proceso_id}
                  className="btn-primary"
                >
                  {mut.isPending ? 'Enviando...' : 'Crear y enviar link'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Página principal ─────────────────────────────────────────
export default function Candidatos({ endpoint='/empresa/candidatos-todos', showEmpresa=false }) {
  const [busqueda,   setBusqueda]   = useState('');
  const [filtroEst,  setFiltroEst]  = useState('');
  const [detalle,    setDetalle]    = useState(null);
  const [modalCrear,  setModalCrear]  = useState(false);
  const [reenviando,  setReenviando]  = useState(null);
  const [reenvioOk,   setReenvioOk]   = useState(null);
  const qc = useQueryClient();
  const invalidar = () => qc.invalidateQueries(['candidatos-todos', endpoint]);

  const reenviarLink = async (c, e) => {
    e.stopPropagation();
    setReenviando(c.id);
    try {
      const base = endpoint.includes('rrhh') ? '/rrhh' : '/empresa';
      await api.post(`${base}/candidatos/${c.id}/reenviar`);
      setReenvioOk(c.id);
      setTimeout(() => setReenvioOk(null), 3000);
    } catch(err) {
      alert(err.response?.data?.error || 'Error al reenviar');
    } finally {
      setReenviando(null);
    }
  };

  const { data: candidatos=[], isLoading } = useQuery({
    queryKey: ['candidatos-todos', endpoint],
    queryFn: ()=>api.get(endpoint).then(r=>r.data),
  });

  const filtrados = candidatos.filter(c => {
    const q   = busqueda.toLowerCase();
    const est = !filtroEst || c.estado === filtroEst;
    const txt = !q ||
      c.nombre?.toLowerCase().includes(q) ||
      c.apellido?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.proceso_nombre?.toLowerCase().includes(q);
    return est && txt;
  });

  const conteo = {
    total:       candidatos.length,
    completados: candidatos.filter(c=>c.estado==='completado').length,
    pendientes:  candidatos.filter(c=>c.estado==='pendiente').length,
    progreso:    candidatos.filter(c=>c.estado==='en_progreso').length,
  };

  return (
    <div className="p-8">
      <PageHeader
        title="Candidatos"
        subtitle="Todos los candidatos invitados a tus procesos de selección"
        action={
          <button onClick={()=>setModalCrear(true)} className="btn-primary">
            <UserPlus className="w-4 h-4"/> Nuevo candidato
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label:'Total',       value:conteo.total,       color:'text-slate-800' },
          { label:'Completados', value:conteo.completados, color:'text-emerald-600' },
          { label:'En progreso', value:conteo.progreso,    color:'text-blue-600' },
          { label:'Pendientes',  value:conteo.pendientes,  color:'text-amber-600' },
        ].map(s=>(
          <div key={s.label} className="card p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-5 flex-wrap items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
          <input type="text" placeholder="Buscar candidato..." value={busqueda} onChange={e=>setBusqueda(e.target.value)} className="input pl-9"/>
        </div>
        <div className="flex gap-1">
          {[['','Todos'],['completado','Completados'],['en_progreso','En progreso'],['pendiente','Pendientes'],['expirado','Expirados']].map(([k,l])=>(
            <button key={k} onClick={()=>setFiltroEst(k)} className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${filtroEst===k?'bg-brand-600 text-white':'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? <p className="text-slate-400 text-sm">Cargando...</p> :
      filtrados.length===0 ? (
        <div className="card p-12 text-center">
          <Users className="w-10 h-10 text-slate-200 mx-auto mb-3"/>
          <p className="text-slate-400 text-sm">{candidatos.length===0?'No hay candidatos invitados aún.':'No se encontraron candidatos.'}</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {['Candidato', 'Proceso', 'Estado', 'Invitado', 'Completado', ''].map(h=>(
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map(c=>{
                const est = ESTADO_CONFIG[c.estado]||{label:c.estado,cls:'badge-gray'};
                return (
                  <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer" onClick={()=>setDetalle(c)}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                          {c.nombre?.[0]}{c.apellido?.[0]||''}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{c.nombre} {c.apellido}</p>
                          <p className="text-xs text-slate-400">{c.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-slate-700">{c.proceso_nombre}</p>
                      <p className="text-xs text-slate-400">{c.puesto||'—'}</p>
                    </td>
                    <td className="px-5 py-4"><span className={est.cls}>{est.label}</span></td>
                    <td className="px-5 py-4 text-slate-500 text-xs">{new Date(c.created_at).toLocaleDateString('es-DO')}</td>
                    <td className="px-5 py-4 text-slate-500 text-xs">{c.fecha_completado?new Date(c.fecha_completado).toLocaleDateString('es-DO'):'—'}</td>
                    <td className="px-5 py-4" onClick={e=>e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        {(c.estado === 'pendiente' || c.estado === 'en_progreso') && (
                          <button
                            onClick={(e) => reenviarLink(c, e)}
                            disabled={reenviando === c.id}
                            title="Reenviar link de evaluación"
                            className={`p-1.5 rounded-lg transition-all flex items-center gap-1 text-xs font-semibold ${
                              reenvioOk === c.id
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                            }`}
                          >
                            {reenviando === c.id
                              ? <RefreshCw className="w-3.5 h-3.5 animate-spin"/>
                              : reenvioOk === c.id
                                ? '✓ Enviado'
                                : <><Send className="w-3.5 h-3.5"/> Reenviar</>
                            }
                          </button>
                        )}
                        <span className="text-brand-600 text-xs font-medium">Ver →</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {detalle && <ModalCandidato candidato={detalle} onClose={()=>setDetalle(null)}/>}
      {modalCrear && <ModalCrearCandidato endpoint={endpoint} onClose={()=>setModalCrear(false)} onSave={invalidar}/>}
    </div>
  );
}