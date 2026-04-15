import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Building2 } from 'lucide-react';
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
            { key: 'nombre',         label: 'Nombre *',   type: 'text' },
            { key: 'email_contacto', label: 'Email',      type: 'email' },
            { key: 'sector',         label: 'Sector',     type: 'text' },
            { key: 'pais',           label: 'País',       type: 'text' },
          ].map(f => (
            <div key={f.key}>
              <label className="label">{f.label}</label>
              <input type={f.type} value={form[f.key]} onChange={e => set(f.key, e.target.value)} className="input" />
            </div>
          ))}
          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Administrador</p>
            {[
              { key: 'admin_nombre',   label: 'Nombre *',     type: 'text' },
              { key: 'admin_email',    label: 'Email *',      type: 'email' },
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

export function EmpresasCliente() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);

  const { data: clientes = [], isLoading } = useQuery({
    queryKey: ['rrhh-clientes'],
    queryFn: () => api.get('/rrhh/empresas-cliente').then(r => r.data),
  });

  return (
    <div className="p-8">
      <PageHeader
        title="Empresas cliente"
        subtitle="Empresas a las que provees servicios de evaluación"
        action={<button onClick={() => setModal(true)} className="btn-primary"><Plus className="w-4 h-4" /> Nueva empresa</button>}
      />
      {isLoading ? <p className="text-slate-400 text-sm">Cargando...</p> : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {['Empresa', 'Sector', 'País', 'Procesos', 'Candidatos', 'Estado'].map(h => (
                  <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clientes.map(c => (
                <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
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
                  <td className="px-6 py-4 text-slate-500">{c.sector || '—'}</td>
                  <td className="px-6 py-4 text-slate-500">{c.pais || '—'}</td>
                  <td className="px-6 py-4 text-slate-600">{c.total_procesos}</td>
                  <td className="px-6 py-4 text-slate-600">{c.total_candidatos}</td>
                  <td className="px-6 py-4">
                    <span className={c.activo ? 'badge-green' : 'badge-gray'}>{c.activo ? 'Activa' : 'Inactiva'}</span>
                  </td>
                </tr>
              ))}
              {clientes.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-12 text-center">
                  <Building2 className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">No hay empresas cliente aún</p>
                  <button onClick={() => setModal(true)} className="btn-primary mx-auto mt-4"><Plus className="w-4 h-4" /> Crear primera</button>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {modal && <ModalCliente onClose={() => setModal(false)} onSave={() => qc.invalidateQueries(['rrhh-clientes'])} />}
    </div>
  );
}

export default EmpresasCliente;
