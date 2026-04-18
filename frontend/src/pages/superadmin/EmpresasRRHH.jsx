import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import SelectorPaisCiudad from '../../components/ui/SelectorPaisCiudad';
import { Plus, X, Building2, Trash2, ClipboardList, Pencil } from 'lucide-react';
import api from '../../services/api';
import PageHeader from '../../components/ui/PageHeader';

// ── Modal crear empresa ──────────────────────────────────────
function ModalCrear({ onClose, onSave }) {
  const [form, setForm] = useState({ nombre:'', email_contacto:'', pais:'', ciudad:'', telefono:'', ruc_nit:'', admin_nombre:'', admin_email:'', admin_password:'' });
  const [error, setError] = useState('');
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const mut = useMutation({
    mutationFn: d => api.post('/superadmin/empresas-rrhh', d),
    onSuccess: () => { onSave(); onClose(); },
    onError: err => setError(err.response?.data?.error || 'Error al crear empresa'),
  });
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">Nueva empresa RRHH</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg"><X className="w-4 h-4 text-slate-400"/></button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Datos de la empresa</p>
          {[
            {k:'nombre',         l:'Nombre *',        t:'text'},
            {k:'email_contacto', l:'Email contacto',  t:'email'},
            {k:'ruc_nit',        l:'RUC / NIT',       t:'text'},
          ].map(f=>(
            <div key={f.k}><label className="label">{f.l}</label>
            <input type={f.t} value={form[f.k]} onChange={e=>set(f.k,e.target.value)} className="input"/></div>
          ))}
          <SelectorPaisCiudad
            pais={form.pais}
            ciudad={form.ciudad}
            onPaisChange={v=>set('pais',v)}
            onCiudadChange={v=>set('ciudad',v)}
          />
          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Usuario administrador</p>
            {[
              {k:'admin_nombre',   l:'Nombre *',     t:'text'},
              {k:'admin_email',    l:'Email *',      t:'email'},
              {k:'admin_password', l:'Contraseña *', t:'password'},
            ].map(f=>(
              <div key={f.k} className="mb-4"><label className="label">{f.l}</label>
              <input type={f.t} value={form[f.k]} onChange={e=>set(f.k,e.target.value)} className="input"/></div>
            ))}
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg">{error}</p>}
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end">
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button onClick={()=>mut.mutate(form)} disabled={mut.isPending} className="btn-primary">
            {mut.isPending ? 'Guardando...' : 'Crear empresa'}
          </button>
        </div>
      </div>
    </div>
  );
}


// ── Modal editar empresa ─────────────────────────────────────
function ModalEditar({ empresa, onClose, onSave }) {
  const [form, setForm] = useState({
    nombre:         empresa.nombre         || '',
    email_contacto: empresa.email_contacto || '',
    pais:           empresa.pais           || '',
    ciudad:         empresa.ciudad         || '',
    telefono:       empresa.telefono       || '',
    ruc_nit:        empresa.ruc_nit        || '',
    activo:         empresa.activo,
  });
  const [error, setError] = useState('');
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const mut = useMutation({
    mutationFn: d => api.put(`/superadmin/empresas-rrhh/${empresa.id}`, d),
    onSuccess: () => { onSave(); onClose(); },
    onError: err => setError(err.response?.data?.error || 'Error al actualizar empresa'),
  });

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">Editar empresa RRHH</h3>
            <p className="text-xs text-slate-400 mt-0.5">{empresa.nombre}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg"><X className="w-4 h-4 text-slate-400"/></button>
        </div>
        <div className="p-6 space-y-4">
          {[
            {k:'nombre',         l:'Nombre *',       t:'text'},
            {k:'email_contacto', l:'Email contacto', t:'email'},
            {k:'pais',           l:'País',           t:'text'},
            {k:'ciudad',         l:'Ciudad',         t:'text'},
            {k:'telefono',       l:'Teléfono',       t:'text'},
            {k:'ruc_nit',        l:'RUC / NIT',      t:'text'},
          ].map(f=>(
            <div key={f.k}>
              <label className="label">{f.l}</label>
              <input type={f.t} value={form[f.k]} onChange={e=>set(f.k,e.target.value)} className="input"/>
            </div>
          ))}
          <div className="flex items-center gap-3 pt-2">
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={form.activo} onChange={e=>set('activo',e.target.checked)} className="sr-only peer"/>
              <div className="w-10 h-6 bg-slate-200 peer-focus:ring-2 peer-focus:ring-brand-300 rounded-full peer peer-checked:bg-brand-600 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-4"/>
            </label>
            <span className="text-sm font-medium text-slate-700">Empresa activa</span>
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

// ── Modal asignar pruebas ────────────────────────────────────
function ModalPruebas({ empresa, onClose, onSave }) {
  const { data: pruebas = [] } = useQuery({
    queryKey: ['empresa-pruebas-disponibles', empresa.id],
    queryFn: () => api.get(`/superadmin/empresas-rrhh/${empresa.id}/pruebas`).then(r=>r.data),
  });

  const [seleccionadas, setSeleccionadas] = useState(() =>
    pruebas.filter(p=>p.habilitada).map(p=>p.id)
  );

  // Actualizar selección cuando cargan las pruebas
  const [inicializado, setInicializado] = useState(false);
  if (pruebas.length > 0 && !inicializado) {
    setSeleccionadas(pruebas.filter(p=>p.habilitada).map(p=>p.id));
    setInicializado(true);
  }

  const toggle = (id) => setSeleccionadas(s => s.includes(id) ? s.filter(x=>x!==id) : [...s,id]);

  const mut = useMutation({
    mutationFn: () => api.post(`/superadmin/empresas-rrhh/${empresa.id}/pruebas`, { prueba_ids: seleccionadas }),
    onSuccess: () => { onSave(); onClose(); },
  });

  const TIPO_COLOR = { personalidad:'bg-blue-100 text-blue-700', inteligencia:'bg-amber-100 text-amber-700', competencias:'bg-emerald-100 text-emerald-700', tecnica:'bg-slate-100 text-slate-600', clima:'bg-purple-100 text-purple-700', '360':'bg-rose-100 text-rose-700' };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">Asignar pruebas</h3>
            <p className="text-xs text-slate-400 mt-0.5">{empresa.nombre}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg"><X className="w-4 h-4 text-slate-400"/></button>
        </div>
        <div className="p-6">
          <p className="text-xs text-slate-500 mb-4">Selecciona las pruebas que esta empresa podrá utilizar con sus clientes.</p>
          {pruebas.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No hay pruebas disponibles en el banco</p>
          ) : (
            <div className="space-y-2">
              {pruebas.map(p => (
                <label key={p.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${seleccionadas.includes(p.id) ? 'border-brand-400 bg-brand-50' : 'border-slate-200 hover:border-slate-300'}`}>
                  <input type="checkbox" checked={seleccionadas.includes(p.id)} onChange={()=>toggle(p.id)} className="w-4 h-4 text-brand-600 rounded"/>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800">{p.nombre}</p>
                    <p className="text-xs text-slate-400">{p.total_items} ítems · {p.escala_tipo}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TIPO_COLOR[p.tipo] || 'bg-slate-100 text-slate-600'}`}>{p.tipo}</span>
                </label>
              ))}
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-400">{seleccionadas.length} prueba(s) seleccionada(s)</span>
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary">Cancelar</button>
            <button onClick={()=>mut.mutate()} disabled={mut.isPending} className="btn-primary">
              {mut.isPending ? 'Guardando...' : 'Guardar asignación'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Modal confirmar eliminación ──────────────────────────────
function ModalEliminar({ empresa, onClose, onSave }) {
  const mut = useMutation({
    mutationFn: () => api.delete(`/superadmin/empresas-rrhh/${empresa.id}`),
    onSuccess: () => { onSave(); onClose(); },
  });
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Trash2 className="w-6 h-6 text-red-600"/>
        </div>
        <h3 className="text-base font-bold text-slate-900 text-center mb-2">¿Desactivar empresa?</h3>
        <p className="text-sm text-slate-500 text-center mb-6">
          <strong>{empresa.nombre}</strong> quedará inactiva. Sus datos se conservan y se puede reactivar luego.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancelar</button>
          <button onClick={()=>mut.mutate()} disabled={mut.isPending} className="flex-1 justify-center bg-red-600 hover:bg-red-700 text-white font-semibold text-sm px-5 py-2.5 rounded-lg transition-all flex items-center gap-2">
            {mut.isPending ? 'Desactivando...' : 'Sí, desactivar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Página principal ─────────────────────────────────────────
export default function EmpresasRRHH() {
  const qc = useQueryClient();
  const [modalCrear,    setModalCrear]    = useState(false);
  const [modalEditar,   setModalEditar]   = useState(null);
  const [modalPruebas,  setModalPruebas]  = useState(null);
  const [modalEliminar, setModalEliminar] = useState(null);

  const { data: empresas = [], isLoading } = useQuery({
    queryKey: ['superadmin-empresas'],
    queryFn: () => api.get('/superadmin/empresas-rrhh').then(r=>r.data),
  });

  const invalidar = () => qc.invalidateQueries(['superadmin-empresas']);

  return (
    <div className="p-8">
      <PageHeader
        title="Empresas RRHH"
        subtitle="Clientes directos de la plataforma Aptia"
        action={
          <button onClick={()=>setModalCrear(true)} className="btn-primary">
            <Plus className="w-4 h-4"/> Nueva empresa
          </button>
        }
      />

      {isLoading ? <p className="text-slate-400 text-sm">Cargando...</p> : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {['Empresa','País','Contacto','Clientes','Lic. disponibles','Estado','Acciones'].map(h=>(
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {empresas.map(e=>(
                <tr key={e.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {e.nombre.slice(0,2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">{e.nombre}</p>
                        <p className="text-xs text-slate-400">{e.ruc_nit || '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-slate-600">{e.pais || '—'}</td>
                  <td className="px-5 py-4 text-slate-600">{e.email_contacto || '—'}</td>
                  <td className="px-5 py-4 text-slate-600">{e.total_clientes}</td>
                  <td className="px-5 py-4 text-slate-600">{e.licencias_disponibles ?? 0}</td>
                  <td className="px-5 py-4">
                    <span className={e.activo ? 'badge-green' : 'badge-gray'}>{e.activo ? 'Activa' : 'Inactiva'}</span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={()=>setModalEditar(e)}
                        title="Editar empresa"
                        className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <Pencil className="w-4 h-4"/>
                      </button>
                      <button
                        onClick={()=>setModalPruebas(e)}
                        title="Asignar pruebas"
                        className="p-1.5 text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                      >
                        <ClipboardList className="w-4 h-4"/>
                      </button>
                      {e.activo && (
                        <button
                          onClick={()=>setModalEliminar(e)}
                          title="Desactivar empresa"
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4"/>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {empresas.length===0 && (
                <tr><td colSpan={7} className="px-6 py-12 text-center">
                  <Building2 className="w-10 h-10 text-slate-200 mx-auto mb-3"/>
                  <p className="text-slate-400 text-sm">No hay empresas RRHH registradas</p>
                  <button onClick={()=>setModalCrear(true)} className="btn-primary mx-auto mt-4"><Plus className="w-4 h-4"/> Crear primera</button>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modalCrear    && <ModalCrear    onClose={()=>setModalCrear(false)}   onSave={invalidar}/>}
      {modalEditar   && <ModalEditar   empresa={modalEditar}  onClose={()=>setModalEditar(null)}  onSave={invalidar}/>}
      {modalPruebas  && <ModalPruebas  empresa={modalPruebas}  onClose={()=>setModalPruebas(null)}  onSave={invalidar}/>}
      {modalEliminar && <ModalEliminar empresa={modalEliminar} onClose={()=>setModalEliminar(null)} onSave={invalidar}/>}
    </div>
  );
}
