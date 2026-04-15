import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Key, RefreshCw, Pencil, Trash2 } from 'lucide-react';
import api from '../../services/api';
import PageHeader from '../../components/ui/PageHeader';

function ModalLicencia({ onClose, onSave }) {
  const [form, setForm] = useState({ empresa_rrhh_id:'', plan_id:'', candidatos_total:'', fecha_vencimiento:'', notas:'' });
  const [error, setError] = useState('');
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const today = new Date().toISOString().split('T')[0];

  const { data: empresas=[] } = useQuery({ queryKey:['superadmin-empresas'], queryFn:()=>api.get('/superadmin/empresas-rrhh').then(r=>r.data) });
  const { data: planes=[]   } = useQuery({ queryKey:['superadmin-planes'],   queryFn:()=>api.get('/superadmin/planes').then(r=>r.data) });

  const mut = useMutation({
    mutationFn: d=>api.post('/superadmin/licencias',d),
    onSuccess: ()=>{ onSave(); onClose(); },
    onError: err=>setError(err.response?.data?.error||'Error al crear licencia'),
  });

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">Nueva licencia</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg"><X className="w-4 h-4 text-slate-400"/></button>
        </div>
        <div className="p-6 space-y-4">
          <div><label className="label">Empresa RRHH *</label>
            <select value={form.empresa_rrhh_id} onChange={e=>set('empresa_rrhh_id',e.target.value)} className="input">
              <option value="">Seleccionar empresa...</option>
              {empresas.map(e=><option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>
          </div>
          <div><label className="label">Plan *</label>
            <select value={form.plan_id} onChange={e=>{ const p=planes.find(x=>x.id===e.target.value); set('plan_id',e.target.value); if(p) set('candidatos_total',p.max_candidatos); }} className="input">
              <option value="">Seleccionar plan...</option>
              {planes.map(p=><option key={p.id} value={p.id}>{p.nombre} — {p.max_candidatos} candidatos (${p.precio})</option>)}
            </select>
          </div>
          <div><label className="label">Candidatos incluidos *</label>
            <input type="number" min="1" value={form.candidatos_total} onChange={e=>set('candidatos_total',e.target.value)} placeholder="100" className="input"/>
          </div>
          <div><label className="label">Fecha de vencimiento *</label>
            <input type="date" min={today} value={form.fecha_vencimiento} onChange={e=>set('fecha_vencimiento',e.target.value)} className="input"/>
          </div>
          <div><label className="label">Notas <span className="text-slate-400 font-normal">(opcional)</span></label>
            <textarea value={form.notas} onChange={e=>set('notas',e.target.value)} rows={2} className="input resize-none"/>
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg">{error}</p>}
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end">
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button onClick={()=>mut.mutate(form)} disabled={mut.isPending||!form.empresa_rrhh_id||!form.candidatos_total||!form.fecha_vencimiento} className="btn-primary">
            {mut.isPending?'Guardando...':'Crear licencia'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalRenovar({ licencia, onClose, onSave }) {
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({ candidatos_adicionales:'', nueva_fecha_vencimiento:'' });
  const [error, setError] = useState('');
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const mut = useMutation({
    mutationFn: d=>api.put(`/superadmin/licencias/${licencia.id}/renovar`, d),
    onSuccess: ()=>{ onSave(); onClose(); },
    onError: err=>setError(err.response?.data?.error||'Error al renovar'),
  });

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">Renovar licencia</h3>
            <p className="text-xs text-slate-400 mt-0.5">{licencia.empresa_nombre}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg"><X className="w-4 h-4 text-slate-400"/></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-slate-50 rounded-xl p-4 text-sm">
            <div className="flex justify-between mb-1"><span className="text-slate-500">Candidatos actuales</span><span className="font-semibold">{licencia.candidatos_total}</span></div>
            <div className="flex justify-between mb-1"><span className="text-slate-500">Usados</span><span className="font-semibold text-amber-600">{licencia.candidatos_usados}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Vencimiento actual</span><span className="font-semibold">{new Date(licencia.fecha_vencimiento).toLocaleDateString('es-DO')}</span></div>
          </div>
          <div><label className="label">Candidatos adicionales</label>
            <input type="number" min="0" value={form.candidatos_adicionales} onChange={e=>set('candidatos_adicionales',e.target.value)} placeholder="0 (sin cambio)" className="input"/>
            <p className="text-xs text-slate-400 mt-1">Se sumarán a los actuales</p>
          </div>
          <div><label className="label">Nueva fecha de vencimiento *</label>
            <input type="date" min={today} value={form.nueva_fecha_vencimiento} onChange={e=>set('nueva_fecha_vencimiento',e.target.value)} className="input"/>
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg">{error}</p>}
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end">
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button onClick={()=>mut.mutate(form)} disabled={mut.isPending||!form.nueva_fecha_vencimiento} className="btn-primary">
            {mut.isPending?'Renovando...':'Renovar licencia'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalEditarPlan({ plan, onClose, onSave }) {
  const [form, setForm] = useState({
    nombre:         plan.nombre         || '',
    descripcion:    plan.descripcion    || '',
    max_candidatos: plan.max_candidatos || '',
    max_pruebas:    plan.max_pruebas    || 10,
    precio:         plan.precio         || '',
    moneda:         plan.moneda         || 'USD',
    activo:         plan.activo,
  });
  const [error, setError] = useState('');
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const mut = useMutation({
    mutationFn: d=>api.put(`/superadmin/planes/${plan.id}`, d),
    onSuccess: ()=>{ onSave(); onClose(); },
    onError: err=>setError(err.response?.data?.error||'Error al actualizar plan'),
  });

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">Editar plan</h3>
            <p className="text-xs text-slate-400 mt-0.5">{plan.nombre}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg"><X className="w-4 h-4 text-slate-400"/></button>
        </div>
        <div className="p-6 space-y-4">
          {[
            {k:'nombre',         l:'Nombre *',          t:'text',   p:'Plan Básico'},
            {k:'descripcion',    l:'Descripción',       t:'text',   p:'Descripción breve'},
            {k:'max_candidatos', l:'Máx. candidatos *', t:'number', p:'100'},
            {k:'max_pruebas',    l:'Máx. pruebas',      t:'number', p:'10'},
            {k:'precio',         l:'Precio (USD) *',    t:'number', p:'0.00'},
          ].map(f=>(
            <div key={f.k}>
              <label className="label">{f.l}</label>
              <input type={f.t} placeholder={f.p} value={form[f.k]} onChange={e=>set(f.k,e.target.value)} className="input"/>
            </div>
          ))}
          <div className="flex items-center gap-3 pt-2">
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={form.activo} onChange={e=>set('activo',e.target.checked)} className="sr-only peer"/>
              <div className="w-10 h-6 bg-slate-200 rounded-full peer peer-checked:bg-brand-600 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-4"/>
            </label>
            <span className="text-sm font-medium text-slate-700">Plan activo</span>
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg">{error}</p>}
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end">
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button onClick={()=>mut.mutate(form)} disabled={mut.isPending||!form.nombre} className="btn-primary">
            {mut.isPending?'Guardando...':'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalEliminarPlan({ plan, onClose, onSave }) {
  const mut = useMutation({
    mutationFn: ()=>api.delete(`/superadmin/planes/${plan.id}`),
    onSuccess: ()=>{ onSave(); onClose(); },
  });
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Trash2 className="w-6 h-6 text-red-600"/>
        </div>
        <h3 className="text-base font-bold text-slate-900 text-center mb-2">¿Desactivar plan?</h3>
        <p className="text-sm text-slate-500 text-center mb-6">
          <strong>{plan.nombre}</strong> quedará inactivo. Las licencias existentes no se verán afectadas.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancelar</button>
          <button onClick={()=>mut.mutate()} disabled={mut.isPending} className="flex-1 justify-center bg-red-600 hover:bg-red-700 text-white font-semibold text-sm px-5 py-2.5 rounded-lg transition-all flex items-center gap-2">
            {mut.isPending?'Desactivando...':'Sí, desactivar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalPlan({ onClose, onSave }) {
  const [form, setForm] = useState({ nombre:'', descripcion:'', max_candidatos:'', max_pruebas:10, precio:'', moneda:'USD' });
  const [error, setError] = useState('');
  const mut = useMutation({
    mutationFn: d=>api.post('/superadmin/planes',d),
    onSuccess: ()=>{ onSave(); onClose(); },
    onError: err=>setError(err.response?.data?.error||'Error al crear plan'),
  });
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">Nuevo plan</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg"><X className="w-4 h-4 text-slate-400"/></button>
        </div>
        <div className="p-6 space-y-4">
          {[
            {k:'nombre',         l:'Nombre *',          t:'text',   p:'Plan Básico'},
            {k:'descripcion',    l:'Descripción',       t:'text',   p:'Descripción breve'},
            {k:'max_candidatos', l:'Máx. candidatos *', t:'number', p:'100'},
            {k:'max_pruebas',    l:'Máx. pruebas',      t:'number', p:'10'},
            {k:'precio',         l:'Precio (USD) *',    t:'number', p:'0.00'},
          ].map(f=>(
            <div key={f.k}><label className="label">{f.l}</label>
            <input type={f.t} placeholder={f.p} value={form[f.k]} onChange={e=>setForm(x=>({...x,[f.k]:e.target.value}))} className="input"/></div>
          ))}
          {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg">{error}</p>}
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end">
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button onClick={()=>mut.mutate(form)} disabled={mut.isPending} className="btn-primary">
            {mut.isPending?'Guardando...':'Crear plan'}
          </button>
        </div>
      </div>
    </div>
  );
}

const estadoBadge = l => {
  if (!l.activa) return <span className="badge-gray">Inactiva</span>;
  if (new Date(l.fecha_vencimiento) < new Date()) return <span className="badge-gray">Vencida</span>;
  return <span className="badge-green">Activa</span>;
};

export default function Licencias() {
  const qc = useQueryClient();
  const [modalLic,  setModalLic]  = useState(false);
  const [modalPlan, setModalPlan] = useState(false);
  const [renovando,      setRenovando]      = useState(null);
  const [editandoPlan,   setEditandoPlan]   = useState(null);
  const [eliminandoPlan, setEliminandoPlan] = useState(null);
  const [tab,       setTab]       = useState('licencias');

  const { data: licencias=[] } = useQuery({ queryKey:['superadmin-licencias'], queryFn:()=>api.get('/superadmin/licencias').then(r=>r.data) });
  const { data: planes=[]    } = useQuery({ queryKey:['superadmin-planes'],    queryFn:()=>api.get('/superadmin/planes').then(r=>r.data) });

  const invalidar = () => { qc.invalidateQueries(['superadmin-licencias']); qc.invalidateQueries(['superadmin-planes']); };

  return (
    <div className="p-8">
      <PageHeader
        title="Licencias y Planes"
        subtitle="Gestión de licencias y planes de la plataforma"
        action={
          <div className="flex gap-2">
            <button onClick={()=>setModalPlan(true)} className="btn-secondary"><Plus className="w-4 h-4"/> Nuevo plan</button>
            <button onClick={()=>setModalLic(true)}  className="btn-primary"><Plus className="w-4 h-4"/> Nueva licencia</button>
          </div>
        }
      />

      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-6 w-fit">
        {[['licencias','Licencias'],['planes','Planes']].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)} className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${tab===k?'bg-white text-brand-600 shadow-sm':'text-slate-500 hover:text-slate-700'}`}>{l}</button>
        ))}
      </div>

      {tab==='licencias' && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {['Empresa RRHH','Plan','Total','Usados','Disponibles','Vencimiento','Estado',''].map(h=>(
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {licencias.map(l=>(
                <tr key={l.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4 font-semibold text-slate-800">{l.empresa_nombre}</td>
                  <td className="px-5 py-4 text-slate-600">{l.plan_nombre}</td>
                  <td className="px-5 py-4 text-slate-600">{l.candidatos_total}</td>
                  <td className="px-5 py-4 text-amber-600 font-medium">{l.candidatos_usados}</td>
                  <td className="px-5 py-4 text-emerald-700 font-semibold">{l.candidatos_total-l.candidatos_usados}</td>
                  <td className="px-5 py-4 text-slate-600">{new Date(l.fecha_vencimiento).toLocaleDateString('es-DO')}</td>
                  <td className="px-5 py-4">{estadoBadge(l)}</td>
                  <td className="px-5 py-4">
                    <button onClick={()=>setRenovando(l)} title="Renovar licencia" className="p-1.5 text-brand-600 hover:bg-brand-50 rounded-lg transition-colors">
                      <RefreshCw className="w-4 h-4"/>
                    </button>
                  </td>
                </tr>
              ))}
              {licencias.length===0 && (
                <tr><td colSpan={8} className="px-6 py-12 text-center">
                  <Key className="w-10 h-10 text-slate-200 mx-auto mb-3"/>
                  <p className="text-slate-400 text-sm">No hay licencias creadas aún</p>
                  <button onClick={()=>setModalLic(true)} className="btn-primary mx-auto mt-4"><Plus className="w-4 h-4"/> Crear primera</button>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab==='planes' && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {['Plan','Máx. candidatos','Máx. pruebas','Precio','Estado',''].map(h=>(
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {planes.map(p=>(
                <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4"><p className="font-semibold text-slate-800">{p.nombre}</p><p className="text-xs text-slate-400">{p.descripcion}</p></td>
                  <td className="px-5 py-4 text-slate-600">{p.max_candidatos}</td>
                  <td className="px-5 py-4 text-slate-600">{p.max_pruebas}</td>
                  <td className="px-5 py-4 font-semibold text-slate-800">${p.precio} {p.moneda}</td>
                  <td className="px-5 py-4"><span className={p.activo?'badge-green':'badge-gray'}>{p.activo?'Activo':'Inactivo'}</span></td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1">
                      <button onClick={()=>setEditandoPlan(p)} title="Editar plan" className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                        <Pencil className="w-4 h-4"/>
                      </button>
                      {p.activo&&(
                        <button onClick={()=>setEliminandoPlan(p)} title="Desactivar plan" className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4"/>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {planes.length===0 && (
                <tr><td colSpan={5} className="px-6 py-12 text-center">
                  <p className="text-slate-400 text-sm">No hay planes aún</p>
                  <button onClick={()=>setModalPlan(true)} className="btn-primary mx-auto mt-4"><Plus className="w-4 h-4"/> Crear plan</button>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modalLic  && <ModalLicencia onClose={()=>setModalLic(false)}  onSave={invalidar}/>}
      {modalPlan && <ModalPlan     onClose={()=>setModalPlan(false)} onSave={invalidar}/>}
      {renovando       && <ModalRenovar    licencia={renovando}        onClose={()=>setRenovando(null)}      onSave={invalidar}/>}
      {editandoPlan   && <ModalEditarPlan  plan={editandoPlan}    onClose={()=>setEditandoPlan(null)}   onSave={invalidar}/>}
      {eliminandoPlan && <ModalEliminarPlan plan={eliminandoPlan}  onClose={()=>setEliminandoPlan(null)} onSave={invalidar}/>}
    </div>
  );
}