import { useQuery } from '@tanstack/react-query';
import { Building2, Key, ClipboardList, Users } from 'lucide-react';
import api from '../../services/api';
import StatCard from '../../components/ui/StatCard';
import PageHeader from '../../components/ui/PageHeader';

export default function SuperadminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['superadmin-dashboard'],
    queryFn: () => api.get('/superadmin/dashboard').then(r => r.data),
  });

  const { data: empresas } = useQuery({
    queryKey: ['superadmin-empresas'],
    queryFn: () => api.get('/superadmin/empresas-rrhh').then(r => r.data),
  });

  if (isLoading) return <div className="p-8 text-slate-400 text-sm">Cargando...</div>;

  return (
    <div className="p-8">
      <PageHeader
        title="Panel Superadmin"
        subtitle="Visión global de toda la plataforma Aptia"
      />

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard label="Empresas RRHH"       value={data?.empresas_rrhh ?? 0}        icon={Building2}    color="blue"   delta="Total activas" />
        <StatCard label="Candidatos evaluados" value={data?.candidatos_evaluados ?? 0} icon={Users}        color="green"  delta="Completados" />
        <StatCard label="Licencias activas"    value={data?.licencias_activas ?? 0}    icon={Key}          color="amber"  />
        <StatCard label="Pruebas activas"      value={data?.pruebas_activas ?? 0}      icon={ClipboardList} color="purple" />
      </div>

      {/* Tabla empresas RRHH */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800">Empresas RRHH recientes</h2>
          <a href="/superadmin/empresas" className="text-xs text-brand-600 font-semibold hover:underline">
            Ver todas →
          </a>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Empresa</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">País</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Clientes</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Licencias disp.</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
            </tr>
          </thead>
          <tbody>
            {(empresas || []).slice(0, 8).map(e => (
              <tr key={e.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                <td className="px-6 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {e.nombre.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">{e.nombre}</p>
                      <p className="text-xs text-slate-400">{e.email_contacto}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-3.5 text-slate-600">{e.pais || '—'}</td>
                <td className="px-6 py-3.5 text-slate-600">{e.total_clientes}</td>
                <td className="px-6 py-3.5 text-slate-600">{e.licencias_disponibles ?? 0}</td>
                <td className="px-6 py-3.5">
                  <span className={e.activo ? 'badge-green' : 'badge-gray'}>
                    {e.activo ? 'Activa' : 'Inactiva'}
                  </span>
                </td>
              </tr>
            ))}
            {(!empresas || empresas.length === 0) && (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400 text-sm">No hay empresas registradas aún</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
