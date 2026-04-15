import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { X, Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import api from '../../services/api';

export default function ModalCambiarPassword({ onClose }) {
  const [form, setForm] = useState({ password_actual:'', password_nuevo:'', confirmar:'' });
  const [showActual,  setShowActual]  = useState(false);
  const [showNuevo,   setShowNuevo]   = useState(false);
  const [error,  setError]  = useState('');
  const [exito,  setExito]  = useState(false);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const mut = useMutation({
    mutationFn: d => api.post('/auth/cambiar-password', d),
    onSuccess: () => setExito(true),
    onError: err => setError(err.response?.data?.error || 'Error al cambiar contraseña'),
  });

  const handleSubmit = () => {
    setError('');
    if (!form.password_actual || !form.password_nuevo || !form.confirmar) {
      return setError('Todos los campos son requeridos');
    }
    if (form.password_nuevo.length < 6) {
      return setError('La nueva contraseña debe tener al menos 6 caracteres');
    }
    if (form.password_nuevo !== form.confirmar) {
      return setError('Las contraseñas nuevas no coinciden');
    }
    mut.mutate({ password_actual: form.password_actual, password_nuevo: form.password_nuevo });
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-brand-600"/>
            <h3 className="text-base font-bold text-slate-900">Cambiar contraseña</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg">
            <X className="w-4 h-4 text-slate-400"/>
          </button>
        </div>

        <div className="p-6">
          {exito ? (
            <div className="text-center py-6">
              <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-7 h-7 text-emerald-600"/>
              </div>
              <h4 className="text-base font-bold text-slate-900 mb-2">¡Contraseña actualizada!</h4>
              <p className="text-sm text-slate-500 mb-6">Tu contraseña ha sido cambiada correctamente.</p>
              <button onClick={onClose} className="btn-primary mx-auto">Cerrar</button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Contraseña actual */}
              <div>
                <label className="label">Contraseña actual</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                  <input
                    type={showActual ? 'text' : 'password'}
                    value={form.password_actual}
                    onChange={e => set('password_actual', e.target.value)}
                    placeholder="••••••••"
                    className="input pl-10 pr-10"
                  />
                  <button type="button" onClick={() => setShowActual(v=>!v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showActual ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                  </button>
                </div>
              </div>

              {/* Nueva contraseña */}
              <div>
                <label className="label">Nueva contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                  <input
                    type={showNuevo ? 'text' : 'password'}
                    value={form.password_nuevo}
                    onChange={e => set('password_nuevo', e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="input pl-10 pr-10"
                  />
                  <button type="button" onClick={() => setShowNuevo(v=>!v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showNuevo ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                  </button>
                </div>
                {/* Indicador de fortaleza */}
                {form.password_nuevo && (
                  <div className="mt-2">
                    <div className="flex gap-1">
                      {[1,2,3,4].map(n => (
                        <div key={n} className={`h-1 flex-1 rounded-full transition-all ${
                          form.password_nuevo.length >= n*3
                            ? n <= 1 ? 'bg-red-400'
                            : n <= 2 ? 'bg-amber-400'
                            : n <= 3 ? 'bg-blue-400'
                            : 'bg-emerald-500'
                            : 'bg-slate-200'
                        }`}/>
                      ))}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {form.password_nuevo.length < 6 ? 'Muy corta' :
                       form.password_nuevo.length < 9 ? 'Débil' :
                       form.password_nuevo.length < 12 ? 'Moderada' : 'Fuerte'}
                    </p>
                  </div>
                )}
              </div>

              {/* Confirmar */}
              <div>
                <label className="label">Confirmar nueva contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                  <input
                    type="password"
                    value={form.confirmar}
                    onChange={e => set('confirmar', e.target.value)}
                    placeholder="Repite la nueva contraseña"
                    className={`input pl-10 ${form.confirmar && form.confirmar !== form.password_nuevo ? 'border-red-300 focus:ring-red-200' : ''}`}
                  />
                </div>
                {form.confirmar && form.confirmar !== form.password_nuevo && (
                  <p className="text-xs text-red-500 mt-1">Las contraseñas no coinciden</p>
                )}
              </div>

              {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg">{error}</p>}

              <div className="flex gap-3 justify-end pt-2">
                <button onClick={onClose} className="btn-secondary">Cancelar</button>
                <button onClick={handleSubmit} disabled={mut.isPending} className="btn-primary">
                  {mut.isPending ? 'Guardando...' : 'Cambiar contraseña'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
