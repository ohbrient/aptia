import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, Users, CheckCircle, Clock, AlertCircle, X,
  UserPlus, Mail, Send, RefreshCw, FileText, Target,
  Eye, Pencil
} from 'lucide-react';
import api from '../../services/api';
import PageHeader from '../../components/ui/PageHeader';

const ESTADO_CONFIG = {
  completado:  { label:'Completado',  cls:'badge-green',  icon:<CheckCircle className="w-3.5 h-3.5 text-emerald-500"/> },
  en_progreso: { label:'En progreso', cls:'badge-blue',   icon:<Clock       className="w-3.5 h-3.5 text-blue-500"/>    },
  pendiente:   { label:'Pendiente',   cls:'badge-yellow', icon:<AlertCircle className="w-3.5 h-3.5 text-amber-500"/>   },
  expirado:    { label:'Expirado',    cls:'badge-gray',   icon:<X           className="w-3.5 h-3.5 text-slate-400"/>   },
  cancelado:   { label:'Cancelado',   cls:'badge-gray',   icon:<X           className="w-3.5 h-3.5 text-slate-400"/>   },
};

const DIM_COLOR = { O:'#7C3AED', C:'#059669', E:'#D97706', A:'#DC2626', N:'#7C3AED', default:'#2563EB' };
const DIM_BG    = { O:'#EDE9FE', C:'#D1FAE5', E:'#FEF3C7', A:'#FEE2E2', N:'#EDE9FE', default:'#DBEAFE' };

// ── Match Score Badge ─────────────────────────────────────
function MatchBadge({ score, nivel, size = 'sm' }) {
  if (score == null) return null;
  const pct = parseFloat(score) || 0;
  const config =
    pct >= 80 ? { color:'#059669', bg:'#D1FAE5', border:'#A7F3D0', label:'Alto' } :
    pct >= 60 ? { color:'#D97706', bg:'#FEF3C7', border:'#FDE68A', label:'Medio' } :
    pct >= 40 ? { color:'#DC2626', bg:'#FEE2E2', border:'#FECACA', label:'Bajo' } :
                { color:'#6366F1', bg:'#EEF2FF', border:'#C7D2FE', label:'No compatible' };

  if (size === 'lg') {
    return (
      <div style={{
        display:'flex', alignItems:'center', gap:12,
        background:config.bg, border:`1.5px solid ${config.border}`,
        borderRadius:12, padding:'10px 16px',
      }}>
        <Target size={18} color={config.color}/>
        <div>
          <div style={{ fontSize:11, color:config.color, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em' }}>
            Compatibilidad con el puesto
          </div>
          <div style={{ fontSize:22, fontWeight:800, color:config.color, lineHeight:1.2 }}>
            {pct.toFixed(0)}% — {config.label}
          </div>
        </div>
        <div style={{ marginLeft:'auto' }}>
          <div style={{
            width:52, height:52, borderRadius:'50%',
            border:`3px solid ${config.border}`, background:'#fff',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            <span style={{ fontSize:14, fontWeight:800, color:config.color }}>{pct.toFixed(0)}%</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:4,
      background:config.bg, color:config.color,
      border:`1px solid ${config.border}`,
      borderRadius:100, padding:'2px 8px',
      fontSize:11, fontWeight:700, whiteSpace:'nowrap',
    }}>
      <Target size={10}/>
      {pct.toFixed(0)}%
    </span>
  );
}

function formatInforme(text) {
  if (!text) return '';
  return text.split('\n\n').map(p => {
    if (p.startsWith('### ')) return `<h3 style="font-size:15px;font-weight:700;color:#0F172A;margin:20px 0 8px">${p.slice(4)}</h3>`;
    const html = p.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\*(.+?)\*/g,'<em>$1</em>');
    return html.trim() ? `<p style="color:#475569;line-height:1.8;margin-bottom:12px">${html}</p>` : '';
  }).join('');
}

function abrirReporte(candidatoId) {
  window.open(`/rrhh/reporte/${candidatoId}`, '_blank');
}

// ── Modal Editar Candidato ────────────────────────────────
function ModalEditarCandidato({ candidato: c, onClose, onSave }) {
  const [form, setForm] = useState({
    nombre:          c.nombre        || '',
    apellido:        c.apellido      || '',
    email:           c.email         || '',
    telefono:        c.telefono      || '',
    cedula:          c.cedula        || '',
    fecha_nacimiento:c.fecha_nacimiento ? c.fecha_nacimiento.slice(0,10) : '',
    genero:          c.genero        || '',
    ciudad:          c.ciudad        || '',
    pais:            c.pais          || 'República Dominicana',
    linkedin:        c.linkedin      || '',
    notas:           c.notas         || '',
  });
  const [error, setError] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const mut = useMutation({
    mutationFn: () => api.patch(`/rrhh/candidatos/${c.id}`, form),
    onSuccess: () => { onSave(); onClose(); },
    onError: err => setError(err.response?.data?.error || 'Error al actualizar'),
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div>
            <h3 className="text-base font-bold text-slate-900">Editar candidato</h3>
            <p className="text-xs text-slate-400 mt-0.5">{c.nombre} {c.apellido} · {c.proceso_nombre}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg">
            <X className="w-4 h-4 text-slate-400"/>
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Datos básicos */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Información básica</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Nombre *</label>
                <input type="text" value={form.nombre} onChange={e=>set('nombre',e.target.value)} className="input" placeholder="Juan"/>
              </div>
              <div>
                <label className="label">Apellido</label>
                <input type="text" value={form.apellido} onChange={e=>set('apellido',e.target.value)} className="input" placeholder="Pérez"/>
              </div>
            </div>
            <div className="mt-3">
              <label className="label">Email *</label>
              <input type="email" value={form.email} onChange={e=>set('email',e.target.value)} className="input" placeholder="juan@email.com"/>
            </div>
          </div>

          {/* Datos personales */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Información personal</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Teléfono</label>
                <input type="text" value={form.telefono} onChange={e=>set('telefono',e.target.value)} className="input" placeholder="809-000-0000"/>
              </div>
              <div>
                <label className="label">Cédula / Documento</label>
                <input type="text" value={form.cedula} onChange={e=>set('cedula',e.target.value)} className="input" placeholder="000-0000000-0"/>
              </div>
              <div>
                <label className="label">Fecha de nacimiento</label>
                <input type="date" value={form.fecha_nacimiento} onChange={e=>set('fecha_nacimiento',e.target.value)} className="input"/>
              </div>
              <div>
                <label className="label">Género</label>
                <select value={form.genero} onChange={e=>set('genero',e.target.value)} className="input">
                  <option value="">Seleccionar...</option>
                  <option value="masculino">Masculino</option>
                  <option value="femenino">Femenino</option>
                  <option value="otro">Otro</option>
                  <option value="prefiero_no_decir">Prefiero no decir</option>
                </select>
              </div>
              <div>
                <label className="label">Ciudad</label>
                <input type="text" value={form.ciudad} onChange={e=>set('ciudad',e.target.value)} className="input" placeholder="Santo Domingo"/>
              </div>
              <div>
                <label className="label">País</label>
                <input type="text" value={form.pais} onChange={e=>set('pais',e.target.value)} className="input" placeholder="República Dominicana"/>
              </div>
            </div>
          </div>

          {/* Otros */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Otros datos</p>
            <div>
              <label className="label">LinkedIn</label>
              <input type="url" value={form.linkedin} onChange={e=>set('linkedin',e.target.value)} className="input" placeholder="https://linkedin.com/in/..."/>
            </div>
            <div className="mt-3">
              <label className="label">Notas internas</label>
              <textarea
                value={form.notas}
                onChange={e=>set('notas',e.target.value)}
                className="input resize-none"
                rows={3}
                placeholder="Observaciones sobre el candidato..."
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg">{error}</p>}

          <div className="flex gap-3 justify-end pt-1">
            <button onClick={onClose} className="btn-secondary">Cancelar</button>
            <button
              onClick={() => mut.mutate()}
              disabled={mut.isPending || !form.nombre || !form.email}
              className="btn-primary"
            >
              {mut.isPending ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Modal detalle candidato ───────────────────────────────
function ModalCandidato({ candidato: c, onClose, onEditar }) {
  const resultados = c.resultados || [];
  const est = ESTADO_CONFIG[c.estado] || { label: c.estado, cls: 'badge-gray' };
  const APP_URL = window.location.origin;
  const [copiado, setCopiado] = useState(false);

  const copiarLink = () => {
    navigator.clipboard.writeText(`${APP_URL}/evaluacion/${c.token_acceso}`).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
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
            {/* Botón Editar */}
            <button
              onClick={() => { onClose(); onEditar(c); }}
              className="btn-secondary py-2 px-4 text-xs flex items-center gap-1"
            >
              <Pencil className="w-3.5 h-3.5"/> Editar
            </button>
            {(c.estado === 'pendiente' || c.estado === 'en_progreso') && (
              <button
                onClick={async () => {
                  try {
                    await api.post(`/rrhh/candidatos/${c.id}/reenviar`);
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
                onClick={() => abrirReporte(c.id)}
                className="btn-primary py-2 px-4 text-xs flex items-center gap-1"
              >
                <FileText className="w-3.5 h-3.5"/> Reporte PDF
              </button>
            )}
            <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg">
              <X className="w-4 h-4 text-slate-400"/>
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Match score destacado */}
          {c.estado === 'completado' && c.match_score != null && (
            <div className="mb-5">
              <MatchBadge score={c.match_score} nivel={c.match_nivel} size="lg"/>
            </div>
          )}

          {/* Info básica + personal */}
          <div className="bg-slate-50 rounded-xl p-4 mb-6 grid grid-cols-2 gap-4 text-sm">
            <div><p className="text-xs text-slate-400 mb-0.5">Email</p><p className="font-medium text-slate-800">{c.email}</p></div>
            <div><p className="text-xs text-slate-400 mb-0.5">Estado</p><span className={est.cls}>{est.label}</span></div>
            {c.telefono && <div><p className="text-xs text-slate-400 mb-0.5">Teléfono</p><p className="font-medium text-slate-800">{c.telefono}</p></div>}
            {c.cedula && <div><p className="text-xs text-slate-400 mb-0.5">Cédula</p><p className="font-medium text-slate-800">{c.cedula}</p></div>}
            {c.fecha_nacimiento && (
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Fecha nacimiento</p>
                <p className="font-medium text-slate-800">{new Date(c.fecha_nacimiento).toLocaleDateString('es-DO', {year:'numeric',month:'long',day:'numeric'})}</p>
              </div>
            )}
            {c.genero && (
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Género</p>
                <p className="font-medium text-slate-800 capitalize">{c.genero.replace('_',' ')}</p>
              </div>
            )}
            {(c.ciudad || c.pais) && (
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Ubicación</p>
                <p className="font-medium text-slate-800">{[c.ciudad, c.pais].filter(Boolean).join(', ')}</p>
              </div>
            )}
            {c.linkedin && (
              <div>
                <p className="text-xs text-slate-400 mb-0.5">LinkedIn</p>
                <a href={c.linkedin} target="_blank" rel="noreferrer" className="text-brand-600 font-medium text-xs hover:underline truncate block">Ver perfil</a>
              </div>
            )}
            <div><p className="text-xs text-slate-400 mb-0.5">Invitado</p><p className="font-medium text-slate-800">{new Date(c.created_at).toLocaleDateString('es-DO')}</p></div>
            {c.fecha_completado && (
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Completado</p>
                <p className="font-medium text-slate-800">{new Date(c.fecha_completado).toLocaleDateString('es-DO',{year:'numeric',month:'long',day:'numeric'})}</p>
              </div>
            )}
          </div>

          {/* Notas */}
          {c.notas && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mb-6">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-600 mb-1">Notas internas</p>
              <p className="text-sm text-amber-800">{c.notas}</p>
            </div>
          )}

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

// ── Modal crear candidato ─────────────────────────────────
function ModalCrearCandidato({ endpoint, onClose, onSave }) {
  const [form, setForm]   = useState({ nombre:'', apellido:'', email:'', proceso_id:'' });
  const [error, setError] = useState('');
  const [exito, setExito] = useState(null);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const baseEndpoint = endpoint.includes('rrhh') ? '/rrhh' : '/empresa';
  const { data: procs=[] } = useQuery({
    queryKey: ['procesos-para-invitar', baseEndpoint],
    queryFn: () => api.get(`${baseEndpoint}/procesos`).then(r=>r.data),
  });

  const mut = useMutation({
    mutationFn: () => api.post(`${baseEndpoint}/procesos/${form.proceso_id}/candidatos`, {
      candidatos: [{ nombre: form.nombre, apellido: form.apellido, email: form.email }]
    }),
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
              {exito.candidatos?.map((c,i) => (
                <div key={i} className="border border-slate-200 rounded-xl p-3 mb-4">
                  <p className="text-sm font-semibold text-slate-800 mb-2">{c.nombre} {c.apellido}</p>
                  <div className="bg-slate-50 rounded-lg px-3 py-2">
                    <span className="text-xs text-slate-500 font-mono break-all">{APP_URL}/evaluacion/{c.token_acceso}</span>
                  </div>
                </div>
              ))}
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

// ── Página principal ──────────────────────────────────────
export default function Candidatos({ endpoint='/empresa/candidatos-todos', showEmpresa=false }) {
  const [busqueda,   setBusqueda]   = useState('');
  const [filtroEst,  setFiltroEst]  = useState('');
  const [detalle,    setDetalle]    = useState(null);
  const [editar,     setEditar]     = useState(null);
  const [modalCrear, setModalCrear] = useState(false);
  const [reenviando, setReenviando] = useState(null);
  const [reenvioOk,  setReenvioOk]  = useState(null);
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
    queryFn: () => api.get(endpoint).then(r=>r.data),
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
                {['Candidato','Proceso','Estado','Match','Invitado','Completado',''].map(h=>(
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map(c=>{
                const est = ESTADO_CONFIG[c.estado]||{label:c.estado,cls:'badge-gray'};
                return (
                  <tr
                    key={c.id}
                    className="border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => setDetalle(c)}
                  >
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
                    <td className="px-5 py-4">
                      {c.match_score != null
                        ? <MatchBadge score={c.match_score} nivel={c.match_nivel}/>
                        : <span className="text-xs text-slate-300">—</span>
                      }
                    </td>
                    <td className="px-5 py-4 text-slate-500 text-xs">{new Date(c.created_at).toLocaleDateString('es-DO')}</td>
                    <td className="px-5 py-4 text-slate-500 text-xs">{c.fecha_completado?new Date(c.fecha_completado).toLocaleDateString('es-DO'):'—'}</td>

                    {/* Acciones — stopPropagation para no abrir el modal de detalle */}
                    <td className="px-5 py-4" onClick={e=>e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        {/* Reenviar link */}
                        {(c.estado === 'pendiente' || c.estado === 'en_progreso') && (
                          <button
                            onClick={(e) => reenviarLink(c, e)}
                            disabled={reenviando === c.id}
                            title="Reenviar link de evaluación"
                            className={`p-1.5 rounded-lg transition-all flex items-center gap-1 text-xs font-semibold ${
                              reenvioOk === c.id ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                            }`}
                          >
                            {reenviando === c.id
                              ? <RefreshCw className="w-3.5 h-3.5 animate-spin"/>
                              : reenvioOk === c.id ? '✓ Enviado'
                              : <><Send className="w-3.5 h-3.5"/> Reenviar</>
                            }
                          </button>
                        )}
                        {/* Reporte PDF */}
                        {c.estado === 'completado' && (
                          <button
                            onClick={() => abrirReporte(c.id)}
                            title="Ver reporte PDF"
                            className="p-1.5 text-brand-500 hover:text-brand-700 hover:bg-brand-50 rounded-lg transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5"/>
                          </button>
                        )}
                        {/* Editar */}
                        <button
                          onClick={() => setEditar(c)}
                          title="Editar candidato"
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5"/>
                        </button>
                        {/* Ver detalle */}
                        <button
                          onClick={() => setDetalle(c)}
                          title="Ver detalle"
                          className="p-1.5 text-brand-500 hover:text-brand-700 hover:bg-brand-50 rounded-lg transition-colors flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5"/>
                          <span className="text-xs font-medium">Ver</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {detalle && (
        <ModalCandidato
          candidato={detalle}
          onClose={() => setDetalle(null)}
          onEditar={(c) => setEditar(c)}
        />
      )}
      {editar && (
        <ModalEditarCandidato
          candidato={editar}
          onClose={() => setEditar(null)}
          onSave={() => { invalidar(); setEditar(null); }}
        />
      )}
      {modalCrear && (
        <ModalCrearCandidato
          endpoint={endpoint}
          onClose={() => setModalCrear(false)}
          onSave={invalidar}
        />
      )}
    </div>
  );
}