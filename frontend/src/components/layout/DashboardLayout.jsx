import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  ShieldCheck, LayoutDashboard, Building2, Key, ClipboardList,
  Users, Users2, BarChart3, Map, Activity, Zap, LogOut, ChevronDown, Bell, Lock, AlertTriangle, X as XIcon
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import ModalCambiarPassword from '../ui/ModalCambiarPassword';

const NAV = {
  superadmin: [
    { section: 'Principal', links: [
      { to: '/superadmin',           icon: LayoutDashboard, label: 'Dashboard',        end: true },
      { to: '/superadmin/empresas',  icon: Building2,       label: 'Empresas RRHH' },
    ]},
    { section: 'Catálogo', links: [
      { to: '/superadmin/pruebas',   icon: ClipboardList,   label: 'Banco de pruebas' },
    ]},
    { section: 'Configuración', links: [
      { to: '/superadmin/licencias', icon: Key,             label: 'Licencias' },
    ]},
  ],
  rrhh: [
    { section: 'Principal', links: [
      { to: '/rrhh',            icon: LayoutDashboard, label: 'Dashboard',        end: true },
      { to: '/rrhh/clientes',   icon: Building2,       label: 'Empresas cliente', permiso: 'administrador' },
      { to: '/rrhh/procesos',   icon: ClipboardList,   label: 'Procesos',         permiso: 'gestionar_procesos' },
      { to: '/rrhh/candidatos', icon: Users,           label: 'Candidatos',       permiso: 'ver_candidatos' },
    ]},
    { section: 'Análisis', links: [
      { to: '/rrhh/reportes',      icon: BarChart3, label: 'Reportes',        permiso: 'ver_reportes' },
      { to: '/rrhh/mapa-talento',  icon: Map,       label: 'Mapa de talento', permiso: 'ver_reportes' },
    ]},
    { section: 'Herramientas', links: [
      { to: '/rrhh/banco',      icon: ClipboardList, label: 'Mis pruebas', permiso: 'administrador' },
    ]},
    { section: 'Configuración', links: [
      { to: '/rrhh/usuarios',   icon: Users2,    label: 'Usuarios',   permiso: 'administrador' },
      { to: '/rrhh/actividad',  icon: Activity,  label: 'Actividad',  permiso: 'administrador' },
      { to: '/rrhh/licencias',  icon: Key,       label: 'Mis licencias', permiso: 'administrador' },
    ]},
  ],
  empresa: [
    { section: 'Selección', links: [
      { to: '/empresa',            icon: LayoutDashboard, label: 'Dashboard',  end: true },
      { to: '/empresa/procesos',   icon: ClipboardList,   label: 'Procesos' },
      { to: '/empresa/candidatos', icon: Users,           label: 'Candidatos' },
    ]},
    { section: 'Análisis', links: [
      { to: '/empresa/reportes', icon: BarChart3, label: 'Reportes' },
    ]},
  ],
};

function Avatar({ nombre }) {
  const initials = nombre?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'US';
  return (
    <div className="w-8 h-8 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
      {initials}
    </div>
  );
}

// ── Banner de licencia ────────────────────────────────────────
function BannerLicencia({ rol }) {
  const [cerrado, setCerrado] = useState(false);

  const { data: licencias = [] } = useQuery({
    queryKey: ['rrhh-licencias-banner'],
    queryFn: () => api.get('/rrhh/licencias').then(r => r.data),
    enabled: rol === 'rrhh',
    staleTime: 1000 * 60 * 10,
  });

  if (rol !== 'rrhh') return null;

  const hoy = new Date();

  const vencida  = licencias.find(l => l.activa && new Date(l.fecha_vencimiento) < hoy);
  const porVencer = !vencida && licencias.find(l => {
    if (!l.activa) return false;
    const dias = Math.ceil((new Date(l.fecha_vencimiento) - hoy) / (1000 * 60 * 60 * 24));
    return dias >= 0 && dias <= 15;
  });
  const casillena = !vencida && !porVencer && licencias.find(l => {
    const pct = l.candidatos_total ? (l.candidatos_usados / l.candidatos_total) * 100 : 0;
    return pct >= 90 && l.activa;
  });

  if (vencida) {
    return (
      <div className="bg-red-600 text-white px-6 py-3 flex items-center gap-3 text-sm">
        <AlertTriangle className="w-5 h-5 flex-shrink-0 animate-pulse"/>
        <div className="flex-1">
          <p className="font-bold">⚠️ Tu licencia ha vencido</p>
          <p className="text-red-200 text-xs mt-0.5">El acceso al sistema está restringido. Contacta a tu proveedor para renovar.</p>
        </div>
        <a href="/rrhh/licencias" className="bg-white text-red-600 font-bold text-xs px-4 py-1.5 rounded-lg hover:bg-red-50 flex-shrink-0">
          Renovar ahora →
        </a>
      </div>
    );
  }

  if (cerrado) return null;

  const dias = porVencer
    ? Math.ceil((new Date(porVencer.fecha_vencimiento) - hoy) / (1000 * 60 * 60 * 24))
    : null;
  const pct = casillena
    ? Math.round((casillena.candidatos_usados / casillena.candidatos_total) * 100)
    : null;

  if (!porVencer && !casillena) return null;

  const msg = porVencer
    ? `Tu licencia vence en ${dias === 0 ? 'hoy' : `${dias} día${dias !== 1 ? 's' : ''}`}. Renueva para no perder acceso.`
    : `Has usado el ${pct}% de tus candidatos. Amplía tu licencia para seguir evaluando.`;

  return (
    <div className="bg-amber-500 text-white px-6 py-2.5 flex items-center gap-3 text-sm">
      <AlertTriangle className="w-4 h-4 flex-shrink-0"/>
      <p className="flex-1 font-medium">{msg}</p>
      <a href="/rrhh/licencias" className="underline font-bold text-white hover:text-amber-100 flex-shrink-0">
        Ver licencias →
      </a>
      <button onClick={() => setCerrado(true)} className="p-0.5 hover:bg-amber-600 rounded ml-2 flex-shrink-0">
        <XIcon className="w-3.5 h-3.5"/>
      </button>
    </div>
  );
}



// ── Banner demo ───────────────────────────────────────────────
function BannerDemo({ rol, user }) {
  if (rol !== 'rrhh') return null;

  const { data: onboarding } = useQuery({
    queryKey: ['rrhh-onboarding'],
    queryFn: () => api.get('/rrhh/onboarding-status').then(r => r.data),
    enabled: rol === 'rrhh',
    staleTime: 1000 * 60 * 10,
  });

  if (!onboarding?.empresa?.es_demo) return null;

  const expira = onboarding?.empresa?.demo_expira_at;
  const dias = expira
    ? Math.ceil((new Date(expira) - Date.now()) / (1000 * 60 * 60 * 24))
    : 7;

  if (dias <= 0) return null;

  return (
    <div className="bg-violet-600 text-white px-6 py-2.5 flex items-center gap-3 text-sm">
      <Zap className="w-4 h-4 flex-shrink-0"/>
      <p className="flex-1 font-medium">
        Estás en modo <strong>DEMO</strong> — acceso completo por {dias} día{dias !== 1 ? 's' : ''} más.
      </p>
      <a href="mailto:ventas@aptia.io" className="bg-white text-violet-600 font-bold text-xs px-3 py-1.5 rounded-lg hover:bg-violet-50 flex-shrink-0">
        Contratar ahora →
      </a>
    </div>
  );
}

// ── Guard: demo expirado ──────────────────────────────────────
function DemoExpiredGuard({ rol, children }) {
  const { data: onboarding } = useQuery({
    queryKey: ['rrhh-onboarding'],
    queryFn: () => api.get('/rrhh/onboarding-status').then(r => r.data),
    enabled: rol === 'rrhh',
    staleTime: 1000 * 60 * 10,
  });

  if (rol !== 'rrhh') return children;
  if (!onboarding?.empresa?.es_demo) return children;

  const expira = onboarding?.empresa?.demo_expira_at;
  if (!expira || new Date(expira) > Date.now()) return children;

  return (
    <div className="flex flex-1 items-center justify-center bg-slate-50 min-h-[calc(100vh-56px)]">
      <div className="text-center max-w-md px-8">
        <div className="w-20 h-20 bg-violet-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <Zap className="w-10 h-10 text-violet-600"/>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-3">Tu demo ha expirado</h2>
        <p className="text-slate-500 mb-2">
          El período de prueba de <strong>7 días</strong> ha finalizado.
        </p>
        <p className="text-slate-400 text-sm mb-8">
          Contáctanos para contratar un plan y continuar usando Aptia con todos tus datos.
        </p>
        <a
          href="mailto:ventas@aptia.io"
          className="btn-primary inline-flex items-center gap-2"
        >
          <Zap className="w-4 h-4"/> Contratar Aptia
        </a>
      </div>
    </div>
  );
}

// ── Guard: bloquea acceso si licencia vencida ────────────────
function LicenciaVencidaGuard({ rol, children }) {
  const { data: licencias = [] } = useQuery({
    queryKey: ['rrhh-licencias-banner'],
    queryFn: () => api.get('/rrhh/licencias').then(r => r.data),
    enabled: rol === 'rrhh',
    staleTime: 1000 * 60 * 10,
  });

  if (rol !== 'rrhh') return children;

  const hoy = new Date();
  const vencida = licencias.find(l => l.activa && new Date(l.fecha_vencimiento) < hoy);

  if (!vencida) return children;

  return (
    <div className="flex flex-1 items-center justify-center bg-slate-50 min-h-[calc(100vh-56px)]">
      <div className="text-center max-w-md px-8">
        <div className="w-20 h-20 bg-red-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-10 h-10 text-red-600"/>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-3">Licencia vencida</h2>
        <p className="text-slate-500 mb-2">
          Tu licencia venció el <strong>{new Date(vencida.fecha_vencimiento).toLocaleDateString('es-DO',{year:'numeric',month:'long',day:'numeric'})}</strong>.
        </p>
        <p className="text-slate-400 text-sm mb-8">
          El acceso al sistema está suspendido. Contacta a tu proveedor Aptia para renovar y recuperar el acceso.
        </p>
        <a
          href="mailto:soporte@aptia.com"
          className="btn-primary inline-flex items-center gap-2"
        >
          Contactar soporte →
        </a>
      </div>
    </div>
  );
}

export default function DashboardLayout({ rol }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [userMenu,   setUserMenu]   = useState(false);
  const [cambiarPwd, setCambiarPwd] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setUserMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = (e) => {
    e.preventDefault();
    e.stopPropagation();
    logout();
    navigate('/login', { replace: true });
  };

  const rolLabel = { superadmin: 'Superadmin', rrhh: 'Empresa RRHH', empresa: 'Empresa' };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="h-14 bg-white border-b border-slate-200 flex items-center px-6 gap-4 sticky top-0 z-30">
        <div className="flex items-center gap-2 mr-4">
          <ShieldCheck className="w-5 h-5 text-brand-600" />
          <span className="font-bold text-slate-900 tracking-tight">Aptia</span>
        </div>
        <div className="w-px h-5 bg-slate-200" />
        <span className="text-sm text-slate-500 font-medium truncate max-w-[200px]">
          {user?.empresa_nombre || rolLabel[rol]}
        </span>
        <div className="flex-1" />
        <button className="relative p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
          <Bell className="w-4 h-4" />
        </button>
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setUserMenu(v => !v)}
            className="flex items-center gap-2.5 pl-3 pr-2 py-1.5 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <Avatar nombre={user?.nombre} />
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-slate-800 leading-none mb-0.5">{user?.nombre}</p>
              <p className="text-xs text-slate-400">{rolLabel[rol]}</p>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${userMenu ? 'rotate-180' : ''}`} />
          </button>
          {userMenu && (
            <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-800">{user?.nombre}</p>
                <p className="text-xs text-slate-400 truncate">{user?.email}</p>
              </div>
              <button
                onClick={() => { setUserMenu(false); setCambiarPwd(true); }}
                className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 transition-colors border-b border-slate-100"
              >
                <Lock className="w-4 h-4" /> Cambiar contraseña
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" /> Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </header>

      <BannerLicencia rol={rol} />
      <BannerDemo rol={rol} user={user} />

      <DemoExpiredGuard rol={rol}>
      <LicenciaVencidaGuard rol={rol}>
        <div className="flex flex-1">
          <aside className="w-56 bg-white border-r border-slate-200 flex flex-col py-4 sticky top-14 h-[calc(100vh-56px)] overflow-y-auto flex-shrink-0">
            {(NAV[rol] || []).map(section => (
              <div key={section.section} className="mb-4 px-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-3 mb-1.5">
                  {section.section}
                </p>
                {section.links.map(link => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.end}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium mb-0.5 transition-colors ${
                        isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`
                    }
                  >
                    <link.icon className="w-4 h-4 flex-shrink-0" />
                    {link.label}
                  </NavLink>
                ))}
              </div>
            ))}
            <div className="mt-auto px-3">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors"
              >
                <LogOut className="w-4 h-4" /> Cerrar sesión
              </button>
            </div>
          </aside>
          <main className="flex-1 bg-slate-50 min-h-[calc(100vh-56px)]">
            <Outlet />
          </main>
        </div>
      </LicenciaVencidaGuard>
      </DemoExpiredGuard>

      {cambiarPwd && <ModalCambiarPassword onClose={() => setCambiarPwd(false)} />}
    </div>
  );
}