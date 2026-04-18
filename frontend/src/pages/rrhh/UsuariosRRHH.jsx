import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Pencil, Trash2, Shield, User, CheckCircle, XCircle, Key } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import PageHeader from '../../components/ui/PageHeader';

const PERMISOS = [
  { key: 'ver_candidatos',     label: 'Ver candidatos',      desc: 'Puede ver candidatos y sus resultados',          icon: '👤' },
  { key: 'gestionar_procesos', label: 'Gestionar procesos',  desc: 'Puede crear y editar procesos de selección',     icon: '📋' },
  { key: 'invitar_candidatos', label: 'Invitar candidatos',  desc: 'Puede enviar links de evaluación',               icon: '✉️' },
  { key: 'ver_reportes',       label: 'Ver reportes',        desc: 'Puede acceder a reportes e informes',            icon: '📊' },
  { key: 'administrador',      label: 'Administrador',       desc: 'Acceso total a todas las funciones',             icon: '🔑' },
];

const defaultPermisos = () => ({
  ver_candidatos: false, gestionar_procesos: false,
  invitar_candidatos: false, ver_reportes: false, administrador: false,
});

// ── Modal crear/editar usuario ────────────────────────────────
function ModalUsuario({ usuario, onClose, onSave }) {
  const esNuevo = !usuario;
  const [form, setForm] = useState({
    nombre:   usuario?.nombre  || '',
    email:    usuario?.email   || '',
    password: '',
    permisos: usuario?.permisos || defaultPermisos(),
    activo:   usuario?.activo  ?? true,
  });
  const [error, setError] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const togglePermiso = (k) => {
    const nuevos = { ...form.permisos };
    if (k === 'administrador' && !nuevos.administrador) {
      // Al activar admin, activar todos
      Object.keys(nuevos).forEach(p => nuevos[p] = true);
    } else if (k === 'administrador' && nuevos.administrador) {
      nuevos.administrador = false;
    } else {
      nuevos[k] = !nuevos[k];
      if (!nuevos[k]) nuevos.administrador = false;
    }
    set('permisos', nuevos);
  };

  const mut = useMutation({
    mutationFn: d => esNuevo
      ? api.post('/rrhh/usuarios', d)
      : api.put(`/rrhh/usuarios/${usuario.id}`, d),
    onSuccess: () => { onSave(); onClose(); },
    onError: err => setError(err.response?.data?.error || 'Error al guardar'),
  });

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">{esNuevo ? 'Nuevo usuario' : 'Editar usuario'}</h3>
            <p className="text-xs text-slate-400 mt-0.5">Define el acceso y permisos de este colaborador</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg"><X className="w-4 h-4 text-slate-400"/></button>
        </div>
        <div className="p-6 space-y-5">
          {/* Datos básicos */}
          <div className="space-y-3">
            <div>
              <label className="label">Nombre completo *</label>
              <input type="text" value={form.nombre} onChange={e=>set('nombre',e.target.value)} placeholder="Ej: Ana Martínez" className="input"/>
            </div>
            <div>
              <label className="label">Email *</label>
              <input type="email" value={form.email} onChange={e=>set('email',e.target.value)} placeholder="ana@empresa.com" className="input"/>
            </div>
            <div>
              <label className="label">{esNuevo ? 'Contraseña *' : 'Nueva contraseña'} <span className="text-slate-400 font-normal">{!esNuevo && '(dejar vacío para no cambiar)'}</span></label>
              <input type="password" value={form.password} onChange={e=>set('password',e.target.value)} placeholder={esNuevo ? 'Mínimo 6 caracteres' : '••••••••'} className="input"/>
            </div>
          </div>

          {/* Permisos */}
          <div>
            <label className="label mb-3">Permisos de acceso</label>
            <div className="space-y-2">
              {PERMISOS.map(p => {
                const activo = form.permisos[p.key];
                const esAdmin = p.key === 'administrador';
                return (
                  <label key={p.key} className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    activo
                      ? esAdmin ? 'border-amber-400 bg-amber-50' : 'border-brand-400 bg-brand-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}>
                    <input type="checkbox" checked={activo} onChange={()=>togglePermiso(p.key)} className="mt-0.5 w-4 h-4 text-brand-600 flex-shrink-0"/>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">{p.icon}</span>
                        <span className={`text-sm font-semibold ${activo ? esAdmin ? 'text-amber-700' : 'text-brand-700' : 'text-slate-700'}`}>{p.label}</span>
                        {esAdmin && <span className="text-xs bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full font-bold">Full</span>}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{p.desc}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Estado */}
          {!esNuevo && usuario?.rol !== 'admin' && (
            <div>
              <label className="label">Estado</label>
              <div className="flex gap-2">
                {[true, false].map(v => (
                  <button key={String(v)} onClick={()=>set('activo',v)}
                    className={`flex-1 py-2 rounded-xl border-2 text-sm font-semibold transition-all ${
                      form.activo === v
                        ? v ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-red-300 bg-red-50 text-red-600'
                        : 'border-slate-200 text-slate-500'
                    }`}>
                    {v ? '✓ Activo' : '✕ Inactivo'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg">{error}</p>}
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end">
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button
            onClick={() => mut.mutate(form)}
            disabled={mut.isPending || !form.nombre || !form.email || (esNuevo && !form.password)}
            className="btn-primary"
          >
            {mut.isPending ? 'Guardando...' : esNuevo ? 'Crear usuario' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────
export default function UsuariosRRHH() {
  const qc = useQueryClient();
  const { user: currentUser } = useAuth();
  const [modalUsuario, setModalUsuario] = useState(null); // null=cerrado, false=nuevo, obj=editar
  const [eliminando,   setEliminando]   = useState(null);

  const { data: usuarios=[], isLoading } = useQuery({
    queryKey: ['rrhh-usuarios'],
    queryFn: () => api.get('/rrhh/usuarios').then(r => r.data),
  });

  const invalidar = () => qc.invalidateQueries(['rrhh-usuarios']);

  const eliminarMut = useMutation({
    mutationFn: id => api.delete(`/rrhh/usuarios/${id}`),
    onSuccess: () => { invalidar(); setEliminando(null); },
    onError: err => alert(err.response?.data?.error || 'Error al eliminar'),
  });

  const permisosActivos = (permisos) =>
    PERMISOS.filter(p => permisos?.[p.key]).map(p => p.label);

  return (
    <div className="p-8">
      <PageHeader
        title="Usuarios"
        subtitle="Gestiona los colaboradores y sus permisos de acceso"
        action={
          <button onClick={() => setModalUsuario(false)} className="btn-primary">
            <Plus className="w-4 h-4"/> Nuevo usuario
          </button>
        }
      />

      {isLoading ? (
        <div className="card p-12 text-center">
          <p className="text-slate-400 text-sm">Cargando usuarios...</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {['Usuario','Permisos','Estado','Último acceso',''].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {usuarios.map(u => {
                const perms = permisosActivos(u.permisos);
                const esAdmin = u.rol === 'admin' || u.permisos?.administrador;
                return (
                  <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${esAdmin ? 'bg-amber-100 text-amber-700' : 'bg-brand-100 text-brand-700'}`}>
                          {u.nombre?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="font-semibold text-slate-800">{u.nombre}</p>
                            {esAdmin && <span className="text-xs bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full font-bold">Admin</span>}
                          </div>
                          <p className="text-xs text-slate-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {esAdmin ? (
                        <span className="text-xs text-amber-600 font-semibold flex items-center gap-1"><Key className="w-3 h-3"/> Acceso total</span>
                      ) : perms.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {perms.slice(0,3).map(p => (
                            <span key={p} className="text-xs bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full">{p}</span>
                          ))}
                          {perms.length > 3 && <span className="text-xs text-slate-400">+{perms.length-3}</span>}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Sin permisos</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className={u.activo ? 'badge-green' : 'badge-gray'}>
                        {u.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-400">
                      {u.ultimo_acceso ? new Date(u.ultimo_acceso).toLocaleDateString('es-DO') : 'Nunca'}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1">
                        {u.id !== currentUser?.id && (
                          <button onClick={() => setModalUsuario(u)} className="p-1.5 text-brand-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg" title="Editar">
                            <Pencil className="w-4 h-4"/>
                          </button>
                        )}
                        {u.id === currentUser?.id && (
                          <span className="text-xs text-slate-300 px-2">Tú</span>
                        )}
                        {u.rol !== 'admin' && u.id !== currentUser?.id && (
                          <button onClick={() => setEliminando(u)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                            <Trash2 className="w-4 h-4"/>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {usuarios.length === 0 && (
            <div className="text-center py-12">
              <User className="w-10 h-10 text-slate-200 mx-auto mb-3"/>
              <p className="text-slate-400 text-sm">No hay usuarios registrados aún</p>
              <button onClick={() => setModalUsuario(false)} className="btn-primary mx-auto mt-4">
                <Plus className="w-4 h-4"/> Crear primer usuario
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal crear/editar */}
      {modalUsuario !== null && (
        <ModalUsuario
          usuario={modalUsuario || null}
          onClose={() => setModalUsuario(null)}
          onSave={invalidar}
        />
      )}

      {/* Modal confirmar eliminar */}
      {eliminando && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-600"/>
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">¿Eliminar usuario?</h3>
            <p className="text-sm text-slate-500 mb-6"><strong>{eliminando.nombre}</strong> perderá acceso al sistema.</p>
            <div className="flex gap-3">
              <button onClick={() => setEliminando(null)} className="btn-secondary flex-1 justify-center">Cancelar</button>
              <button
                onClick={() => eliminarMut.mutate(eliminando.id)}
                disabled={eliminarMut.isPending}
                className="flex-1 justify-center bg-red-600 hover:bg-red-700 text-white font-semibold text-sm px-5 py-2.5 rounded-lg transition-all"
              >
                {eliminarMut.isPending ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}