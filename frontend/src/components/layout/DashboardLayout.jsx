import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  ShieldCheck, LayoutDashboard, Building2, Key, ClipboardList,
  Users, Users2, BarChart3, LogOut, ChevronDown, Bell, Lock, TrendingUp, AlertTriangle, X as XIcon
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
      { to: '/rrhh/clientes',   icon: Building2,       label: 'Empresas cliente' },
      { to: '/rrhh/procesos',   icon: ClipboardList,   label: 'Procesos' },
      { to: '/rrhh/candidatos', icon: Users,           label: 'Candidatos' },
    ]},
    { section: 'Análisis', links: [
      { to: '/rrhh/reportes',   icon: BarChart3,       label: 'Reportes' },
    ]},
    { section: 'Herramientas', links: [
      { to: '/rrhh/banco',      icon: ClipboardList,   label: 'Mis pruebas' },
    ]},
    { section: 'Configuración', links: [
      { to: '/rrhh/usuarios',   icon: Users2,          label: 'Usuarios' },
      { to: '/rrhh/licencias',  icon: Key,             label: 'Mis licencias' },
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


// ── Banner de licencia por vencer ────────────────────────────
function BannerLicencia({ rol }) {
  const [cerrado, setCerrado] = useState(false);

  const { data: licencias = [] } = useQuery({
    queryKey: ['rrhh-licencias-banner'],
    queryFn: () => api.get('/rrhh/licencias').then(r => r.data),
    enabled: rol === 'rrhh' && !cerrado,
    staleTime: 1000 * 60 * 10, // 10 min
  });

  if (cerrado || rol !== 'rrhh') return null;

  const hoy = new Date();
  const critica = licencias.find(l => {
    if (!l.activa) return false;
    const dias = Math.ceil((new Date(l.fecha_vencimiento) - hoy) / (1000 * 60 * 60 * 24));
    return dias >= 0 && dias <= 15;
  });
  const casillena = licencias.find(l => {
    const pct = l.candidatos_total ? (l.candidatos_usados / l.candidatos_total) * 100 : 0;
    return pct >= 90 && l.activa;
  });

  const alerta = critica || casillena;
  if (!alerta) return null;

  const dias = critica
    ? Math.ceil((new Date(critica.fecha_vencimiento) - hoy) / (1000 * 60 * 60 * 24))
    : null;
  const pct = casillena
    ? Math.round((casillena.candidatos_usados / casillena.candidatos_total) * 100)
    : null;

  const msg = critica
    ? `Tu licencia${critica.plan_nombre ? ` "${critica.plan_nombre}"` : ''} vence en ${dias === 0 ? 'hoy' : `${dias} día${dias !== 1 ? 's' : ''}`}. Renueva para no perder acceso.`
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

export default function DashboardLayout({ rol }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [userMenu,   setUserMenu]   = useState(false);
  const [cambiarPwd, setCambiarPwd] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setUserMenu(false);
      }
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
      {/* Topbar */}
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

      <div className="flex flex-1">
        {/* Sidebar */}
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
                      isActive
                        ? 'bg-brand-50 text-brand-700'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
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

        {/* Main */}
        <main className="flex-1 bg-slate-50 min-h-[calc(100vh-56px)]">
          <Outlet />
        </main>
      </div>

      {/* Modal cambiar contraseña */}
      {cambiarPwd && <ModalCambiarPassword onClose={() => setCambiarPwd(false)} />}
    </div>
  );
}