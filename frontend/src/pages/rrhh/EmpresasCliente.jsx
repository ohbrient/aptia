import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Building2, Trash2, Key } from 'lucide-react';
import SelectorPaisCiudad from '../../components/ui/SelectorPaisCiudad';
import api from '../../services/api';
import PageHeader from '../../components/ui/PageHeader';

function ModalCliente({ onClose, onSave }) {
  const [form, setForm] = useState({
    nombre: '', email_contacto: '', sector: '', pais: '', ciudad: '',
    admin_nombre: '', admin_email: '', admin_password: '',
  });
  const [error, setError] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const mut = useMutation({
    mutationFn: data => api.post('/rrhh/empresas-cliente', data),
    onSuccess: () => { onSave(); onClose(); },
    onError: err => setError(err.response?.data?.error || 'Error al crear empresa'),
  });
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">Nueva empresa cliente</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg"><X className="w-4 h-4 text-slate-400" /></button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Datos de la empresa</p>
          {[
            { key: 'nombre',         label: 'Nombre *',  type: 'text'  },
            { key: 'email_contacto', label: 'Email',     type: 'email' },
            { key: 'sector',         label: 'Sector',    type: 'text'  },
          ].map(f => (
            <div key={f.key}>
              <label className="label">{f.label}</label>
              <input type={f.type} value={form[f.key]} onChange={e => set(f.key, e.target.value)} className="input" />
            </div>
          ))}
          <SelectorPaisCiudad
            pais={form.pais}
            ciudad={form.ciudad}
            onPaisChange={v => set('pais', v)}
            onCiudadChange={v => set('ciudad', v)}
          />
          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Administrador</p>
            {[
              { key: 'admin_nombre',   label: 'Nombre *',     type: 'text'     },
              { key: 'admin_email',    label: 'Email *',      type: 'email'    },
              { key: 'admin_password', label: 'Contraseña *', type: 'password' },
            ].map(f => (
              <div key={f.key} className="mb-4">
                <label className="label">{f.label}</label>
                <input type={f.type} value={form[f.key]} onChange={e => set(f.key, e.target.value)} className="input" />
              </div>
            ))}
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg">{error}</p>}
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end">
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button onClick={() => mut.mutate(form)} disabled={mut.isPending} className="btn-primary">
            {mut.isPending ? 'Guardando...' : 'Crear empresa'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalSublicencia({ empresa, poolDisponible, onClose, onSave }) {
  const sub = empresa.sublicencia;
  const [candidatos, setCandidatos] = useState(sub?.candidatos_asignados?.toString() || '');
  const [fecha,      setFecha]      = useState(sub?.fecha_vencimiento?.slice(0,10) || '');
  const [error,      setError]      = useState('');

  const usados    = sub?.candidatos_usados || 0;
  const asignados = parseInt(candidatos) || 0;
  const pct       = asignados > 0 ? Math.round((usados / asignados) * 100) : 0;
  const maxAsignar = poolDisponible + (sub?.activa ? (sub.candidatos_asignados - usados) : 0);

  const mut = useMutation({
    mutationFn: () => api.post(`/rrhh/empresas-cliente/${empresa.id}/sublicencia`, {
      candidatos_asignados: parseInt(candidatos),
      fecha_vencimiento: fecha || null,
    }),
    onSuccess: () => { onSave(); onClose(); },
    onError: err => setError(err.response?.data?.error || 'Error al asignar licencia'),
  });

  const revocarMut = useMutation({
    mutationFn: () => api.delete(`/rrhh/empresas-cliente/${empresa.id}/sublicencia`),
    onSuccess: () => { onSave(); onClose(); },
  });

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">Licencia — {empresa.nombre}</h3>
            <p className="text-xs text-slate-400 mt-0.5">Asigna candidatos de tu pool disponible</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg"><X className="w-4 h-4 text-slate-400"/></button>
        </div>
        <div className="p-6 space-y-5">
          {/* Pool RRHH */}
          <div className="bg-brand-50 border border-brand-200 rounded-xl px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-brand-700 uppercase tracking-wider">Tu pool disponible</p>
              <p className="text-2xl font-bold text-brand-800">{poolDisponible} <span className="text-sm font-normal text-brand-600">candidatos libres</span></p>
            </div>
            <Key className="w-8 h-8 text-brand-300"/>
          </div>

          {/* Uso actual */}
          {sub?.activa && (
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="flex justify-between text-xs font-semibold mb-2">
                <span className="text-slate-600">Uso actual</span>
                <span className="text-slate-800">{usados} / {sub.candidatos_asignados} candidatos ({pct}%)</span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${pct>=90?'bg-red-500':pct>=70?'bg-amber-500':'bg-emerald-500'}`}
                  style={{width:`${Math.min(pct,100)}%`}}/>
              </div>
              {sub.fecha_vencimiento && (
                <p className="text-xs text-slate-400 mt-2">
                  Vence: {new Date(sub.fecha_vencimiento).toLocaleDateString('es-DO',{year:'numeric',month:'long',day:'numeric'})}
                </p>
              )}
            </div>
          )}

          {/* Formulario */}
          <div className="space-y-4">
            <div>
              <label className="label">Candidatos a asignar *</label>
              <input type="number" min="1" max={maxAsignar}
                value={candidatos} onChange={e => setCandidatos(e.target.value)}
                placeholder="Ej: 50" className="input"/>
              <p className="text-xs text-slate-400 mt-1">Máximo disponible para asignar: <strong>{maxAsignar}</strong></p>
            </div>
            <div>
              <label className="label">Fecha de vencimiento <span className="text-slate-400 font-normal">(opcional)</span></label>
              <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className="input"
                min={new Date().toISOString().slice(0,10)}/>
            </div>
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg">{error}</p>}
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex items-center gap-3">
          {sub?.activa && (
            <button onClick={() => { if(confirm('¿Revocar la licencia?')) revocarMut.mutate(); }}
              className="text-sm text-red-500 hover:text-red-700 font-semibold">
              Revocar
            </button>
          )}
          <div className="flex-1"/>
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button onClick={() => mut.mutate()}
            disabled={mut.isPending || !candidatos || parseInt(candidatos) < 1}
            className="btn-primary">
            {mut.isPending ? 'Guardando...' : sub?.activa ? 'Actualizar' : 'Asignar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalEliminar({ empresa, onClose, onSave }) {
  const mut = useMutation({
    mutationFn: () => api.delete(`/rrhh/empresas-cliente/${empresa.id}`),
    onSuccess: () => { onSave(); onClose(); },
    onError: err => alert(err.response?.data?.error || 'Error al eliminar'),
  });
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
        <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Trash2 className="w-6 h-6 text-red-600"/>
        </div>
        <h3 className="text-base font-bold text-slate-900 mb-2">¿Eliminar empresa?</h3>
        <p className="text-sm text-slate-500 mb-2"><strong>{empresa.nombre}</strong> será eliminada con todos sus procesos y candidatos.</p>
        <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg mb-6">Esta acción no se puede deshacer.</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancelar</button>
          <button onClick={() => mut.mutate()} disabled={mut.isPending}
            className="flex-1 justify-center bg-red-600 hover:bg-red-700 text-white font-semibold text-sm px-5 py-2.5 rounded-lg transition-all">
            {mut.isPending ? 'Eliminando...' : 'Sí, eliminar'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function EmpresasCliente() {
  const qc = useQueryClient();
  const [modal,       setModal]       = useState(false);
  const [eliminando,  setEliminando]  = useState(null);
  const [licenciando, setLicenciando] = useState(null);
  const invalidar = () => qc.invalidateQueries(['rrhh-clientes']);

  const { data: clientes = [], isLoading } = useQuery({
    queryKey: ['rrhh-clientes'],
    queryFn: () => api.get('/rrhh/empresas-cliente').then(r => r.data),
  });

  const { data: licencias = [] } = useQuery({
    queryKey: ['rrhh-licencias'],
    queryFn: () => api.get('/rrhh/licencias').then(r => r.data),
  });

  // Calcular pool libre = total disponible - lo ya asignado a otras empresas
  const totalDisponible = licencias.reduce((acc, l) => {
    if (l.activa && new Date(l.fecha_vencimiento) >= new Date())
      return acc + (l.candidatos_total - l.candidatos_usados);
    return acc;
  }, 0);

  const totalAsignado = clientes.reduce((acc, c) => {
    if (c.sublicencia?.activa)
      return acc + (c.sublicencia.candidatos_asignados - c.sublicencia.candidatos_usados);
    return acc;
  }, 0);

  const poolLibre = Math.max(0, totalDisponible - totalAsignado);

  const getLicBadge = (sub) => {
    if (!sub?.activa) return <span className="badge-gray text-xs">Sin licencia</span>;
    const vencida = sub.fecha_vencimiento && new Date(sub.fecha_vencimiento) < new Date();
    if (vencida) return <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold">Vencida</span>;
    const pct = sub.candidatos_asignados > 0 ? Math.round((sub.candidatos_usados / sub.candidatos_asignados) * 100) : 0;
    const color = pct >= 90 ? 'bg-red-100 text-red-700' : pct >= 70 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700';
    return <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${color}`}>{sub.candidatos_usados}/{sub.candidatos_asignados}</span>;
  };

  return (
    <div className="p-8">
      <PageHeader
        title="Empresas cliente"
        subtitle="Empresas a las que provees servicios de evaluación"
        action={<button onClick={() => setModal(true)} className="btn-primary"><Plus className="w-4 h-4" /> Nueva empresa</button>}
      />

      {/* KPI pool */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Pool disponible</p>
          <p className="text-2xl font-bold text-brand-600">{poolLibre}</p>
          <p className="text-xs text-slate-400 mt-0.5">candidatos libres</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Asignados</p>
          <p className="text-2xl font-bold text-slate-800">{totalAsignado}</p>
          <p className="text-xs text-slate-400 mt-0.5">a empresas cliente</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Total licencia</p>
          <p className="text-2xl font-bold text-slate-800">{totalDisponible}</p>
          <p className="text-xs text-slate-400 mt-0.5">candidatos en tu licencia</p>
        </div>
      </div>

      {isLoading ? <p className="text-slate-400 text-sm">Cargando...</p> : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {['Empresa','Sector','País','Procesos','Candidatos','Licencia','Estado',''].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clientes.map(c => (
                <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center">
                        {c.nombre.slice(0,2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">{c.nombre}</p>
                        <p className="text-xs text-slate-400">{c.email_contacto || '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-slate-500">{c.sector || '—'}</td>
                  <td className="px-5 py-4 text-slate-500">{c.pais || '—'}</td>
                  <td className="px-5 py-4 text-slate-600">{c.total_procesos || 0}</td>
                  <td className="px-5 py-4 text-slate-600">{c.total_candidatos || 0}</td>
                  <td className="px-5 py-4">
                    <button onClick={() => setLicenciando(c)}
                      className="flex items-center gap-1.5 hover:opacity-75 transition-opacity" title="Gestionar licencia">
                      {getLicBadge(c.sublicencia)}
                      <span className="text-xs text-slate-400">✎</span>
                    </button>
                  </td>
                  <td className="px-5 py-4">
                    <span className={c.activo ? 'badge-green' : 'badge-gray'}>{c.activo ? 'Activa' : 'Inactiva'}</span>
                  </td>
                  <td className="px-5 py-4">
                    <button onClick={() => setEliminando(c)}
                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4"/>
                    </button>
                  </td>
                </tr>
              ))}
              {clientes.length === 0 && (
                <tr><td colSpan={8} className="px-6 py-12 text-center">
                  <Building2 className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">No hay empresas cliente aún</p>
                  <button onClick={() => setModal(true)} className="btn-primary mx-auto mt-4"><Plus className="w-4 h-4" /> Crear primera</button>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modal       && <ModalCliente      onClose={() => setModal(false)}       onSave={invalidar} />}
      {eliminando  && <ModalEliminar     onClose={() => setEliminando(null)}   onSave={invalidar} empresa={eliminando} />}
      {licenciando && <ModalSublicencia  onClose={() => setLicenciando(null)}  onSave={invalidar} empresa={licenciando} poolDisponible={poolLibre} />}
    </div>
  );
}

export default EmpresasCliente;
