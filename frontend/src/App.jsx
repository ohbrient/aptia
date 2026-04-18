import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Layouts
import DashboardLayout from './components/layout/DashboardLayout';

// Pages comunes
import LoginPage from './pages/LoginPage';

// Superadmin
import SuperadminDashboard   from './pages/superadmin/Dashboard';
import SuperadminEmpresas    from './pages/superadmin/EmpresasRRHH';
import SuperadminLicencias   from './pages/superadmin/Licencias';
import SuperadminPruebas     from './pages/superadmin/Pruebas';
import PruebaDetalle         from './pages/superadmin/PruebaDetalle';

// RRHH
import RrhhDashboard  from './pages/rrhh/Dashboard';
import RrhhClientes   from './pages/rrhh/EmpresasCliente';
import RrhhLicencias  from './pages/rrhh/Licencias';
import RrhhProcesos   from './pages/rrhh/Procesos';
import RrhhReportes    from './pages/rrhh/Reportes';
import RrhhAnalytics   from './pages/rrhh/Analytics';
import RrhhCandidatos      from './pages/rrhh/Candidatos';
import RrhhBancoPruebas   from './pages/rrhh/BancoPruebas';
import RrhhBancoDetalle   from './pages/rrhh/BancoPruebaDetalle';
import RrhhUsuarios       from './pages/rrhh/UsuariosRRHH';
import RrhhMapaTalento   from './pages/rrhh/MapaTalento';
import ReportePDF        from './pages/rrhh/ReportePDF';
import LogActividad      from './pages/rrhh/LogActividad';
import Onboarding        from './pages/rrhh/Onboarding';
import CompararCandidatos from './pages/rrhh/CompararCandidatos';

// Empresa
import EmpresaDashboard  from './pages/empresa/Dashboard';
import EmpresaProcesos   from './pages/empresa/Procesos';
import EmpresaCandidatos from './pages/empresa/Candidatos';
import EmpresaReportes   from './pages/empresa/Reportes';

// Candidato (público)
import PruebaPage from './pages/prueba/PruebaPage';

// Guard de ruta protegida
function PrivateRoute({ roles, children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-400">Cargando...</div>;
  if (!user)   return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.rol)) return <Navigate to="/login" replace />;
  return children;
}

// Redirige al dashboard correcto según el rol
function RolRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  const map = { superadmin: '/superadmin', rrhh: '/rrhh', empresa: '/empresa' };
  return <Navigate to={map[user.rol] || '/login'} replace />;
}


// Protege rutas según permisos del usuario RRHH
function PermisosGuard({ permiso, children }) {
  const { user } = useAuth();
  if (!user || user.rol !== 'rrhh') return children;
  const permisos = user.permisos || {};
  if (permisos.administrador || permisos[permiso]) return children;
  return <Navigate to="/rrhh" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Público */}
        <Route path="/login"                   element={<LoginPage />} />
        <Route path="/preview/:previewId"      element={<PruebaPage />} />
        <Route path="/evaluacion/:token"       element={<PruebaPage />} />

        {/* Redirección raíz */}
        <Route path="/" element={<RolRedirect />} />

        {/* ── Superadmin ── */}
        <Route path="/superadmin" element={
          <PrivateRoute roles={['superadmin']}>
            <DashboardLayout rol="superadmin" />
          </PrivateRoute>
        }>
          <Route index               element={<SuperadminDashboard />} />
          <Route path="empresas"     element={<SuperadminEmpresas />} />
          <Route path="licencias"    element={<SuperadminLicencias />} />
          <Route path="pruebas"         element={<SuperadminPruebas />} />
          <Route path="pruebas/:id"     element={<PruebaDetalle />} />
        </Route>

        {/* ── RRHH ── */}
        <Route path="/rrhh" element={
          <PrivateRoute roles={['rrhh']}>
            <DashboardLayout rol="rrhh" />
          </PrivateRoute>
        }>
          <Route index                 element={<RrhhDashboard />} />
          <Route path="clientes"       element={<RrhhClientes />} />
          <Route path="licencias"      element={<RrhhLicencias />} />
          <Route path="procesos"      element={<RrhhProcesos />} />
          <Route path="candidatos"    element={<RrhhCandidatos />} />
          <Route path="banco"          element={<PermisosGuard permiso="administrador"><RrhhBancoPruebas /></PermisosGuard>} />
          <Route path="banco/:id"      element={<RrhhBancoDetalle />} />
          <Route path="usuarios"         element={<PermisosGuard permiso="administrador"><RrhhUsuarios /></PermisosGuard>} />
          <Route path="mapa-talento"     element={<PermisosGuard permiso="ver_reportes"><RrhhMapaTalento /></PermisosGuard>} />
          <Route path="reporte/:id"       element={<ReportePDF />} />
          <Route path="actividad"         element={<PermisosGuard permiso="administrador"><LogActividad /></PermisosGuard>} />
          <Route path="onboarding"        element={<Onboarding />} />
          <Route path="procesos/:id/comparar" element={<CompararCandidatos />} />
          <Route path="reportes"      element={<RrhhReportes />} />
          <Route path="analytics"     element={<RrhhAnalytics />} />
        </Route>

        {/* ── Empresa ── */}
        <Route path="/empresa" element={
          <PrivateRoute roles={['empresa']}>
            <DashboardLayout rol="empresa" />
          </PrivateRoute>
        }>
          <Route index                  element={<EmpresaDashboard />} />
          <Route path="procesos"        element={<EmpresaProcesos />} />
          <Route path="candidatos"      element={<EmpresaCandidatos />} />
          <Route path="reportes"        element={<EmpresaReportes />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}