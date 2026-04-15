import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, ShieldCheck, Mail, Lock, ChevronRight } from 'lucide-react';

const REDIRECT = { superadmin: '/superadmin', rrhh: '/rrhh', empresa: '/empresa' };
const ROLES = ['superadmin', 'rrhh', 'empresa'];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate  = useNavigate();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPwd,  setShowPwd]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    // Intentar login con cada rol hasta que uno funcione
    let loggedIn = false;
    for (const rol of ROLES) {
      try {
        const user = await login(email.trim().toLowerCase(), password, rol);
        loggedIn = true;
        navigate(REDIRECT[user.rol]);
        break;
      } catch (err) {
        // Si el error es de credenciales incorrectas con este rol, continuar con el siguiente
        const msg = err?.response?.data?.error || '';
        if (msg === 'Credenciales incorrectas') continue;
        // Si es otro error (servidor, etc.) parar
        if (err?.response?.status >= 500) {
          setError('Error del servidor. Intenta de nuevo.');
          setLoading(false);
          return;
        }
      }
    }
    if (!loggedIn) {
      setError('Correo o contraseña incorrectos');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Panel izquierdo */}
      <div className="hidden lg:flex flex-col w-[480px] bg-brand-600 p-12 relative overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-white/5" />

        <div className="flex items-center gap-3 relative z-10">
          <div className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center backdrop-blur">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-bold text-xl tracking-tight">Aptia</span>
        </div>

        <div className="mt-auto relative z-10">
          <h1 className="text-white text-4xl font-bold leading-tight tracking-tight mb-4">
            Evalúa talento<br />
            <span className="text-white/50">con precisión</span><br />
            y confianza.
          </h1>
          <p className="text-white/60 text-base leading-relaxed mb-12">
            La plataforma psicométrica diseñada para empresas de RRHH en Latinoamérica. Pruebas validadas, informes con IA y resultados en tiempo real.
          </p>
          <div className="grid grid-cols-3 gap-4">
            {[
              { num: '40+', label: 'Pruebas activas' },
              { num: '98%', label: 'Precisión' },
              { num: 'IA',  label: 'Informes auto' },
            ].map(s => (
              <div key={s.label} className="bg-white/10 rounded-2xl p-4 backdrop-blur border border-white/10">
                <div className="text-white text-2xl font-bold mb-1">{s.num}</div>
                <div className="text-white/50 text-xs">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
        <p className="text-white/30 text-xs mt-8 relative z-10">© 2025 Aptia · Plataforma psicométrica</p>
      </div>

      {/* Panel derecho */}
      <div className="flex-1 flex items-center justify-center bg-white p-8">
        <div className="w-full max-w-[420px]">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <ShieldCheck className="w-6 h-6 text-brand-600" />
            <span className="font-bold text-lg text-slate-900">Aptia</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-1">Bienvenido de nuevo</h2>
          <p className="text-slate-500 text-sm mb-8">Ingresa con tus credenciales para continuar</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Correo electrónico</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email" required
                  value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="tu@empresa.com"
                  className="input pl-10"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="label mb-0">Contraseña</label>
                <a href="#" className="text-xs text-brand-600 font-semibold hover:underline">
                  ¿Olvidaste tu contraseña?
                </a>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPwd ? 'text' : 'password'} required
                  value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit" disabled={loading}
              className="btn-primary w-full justify-center py-3 text-base mt-2"
            >
              {loading ? (
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
              ) : (
                <>Iniciar sesión <ChevronRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-slate-400 mt-8">
            ¿Problemas para acceder?{' '}
            <a href="mailto:soporte@aptia.io" className="text-brand-600 font-semibold hover:underline">
              Contactar soporte
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}