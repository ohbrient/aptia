import { useQuery } from '@tanstack/react-query';
import { ClipboardList, Users, CheckCircle, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import StatCard from '../../components/ui/StatCard';
import PageHeader from '../../components/ui/PageHeader';
import { useAuth } from '../../context/AuthContext';

const ESTADO_BADGE = {
  completado:  'badge-green',
  en_progreso: 'badge-blue',
  pendiente:   'badge-yellow',
  expirado:    'badge-gray',
};

export default function EmpresaDashboard() {
  const { user } = useAuth();

  const { data } = useQuery({
    queryKey: ['empresa-dashboard'],
    queryFn: () => api.get('/empresa/dashboard').then(r => r.data),
  });

  const { data: procesos = [] } = useQuery({
    queryKey: ['empresa-procesos'],
    queryFn: () => api.get('/empresa/procesos').then(r => r.data),
  });

  return (
    <div className="p-8">
      <PageHeader
        title={`Bienvenido, ${user?.nombre?.split(' ')[0]}`}
        subtitle={user?.empresa_nombre}
        action={
          <Link to="/empresa/procesos" className="btn-primary">
            <ClipboardList className="w-4 h-4" /> Nuevo proceso
          </Link>
        }
      />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard label="Procesos activos"       value={data?.procesos_activos ?? 0}       icon={ClipboardList} color="blue"   />
        <StatCard label="Candidatos invitados"   value={data?.candidatos_invitados ?? 0}   icon={Users}         color="amber"  />
        <StatCard label="Evaluaciones completas" value={data?.evaluaciones_completas ?? 0} icon={CheckCircle}   color="green"  />
        <StatCard label="Informes IA generados"  value={data?.informes_generados ?? 0}     icon={FileText}      color="purple" />
      </div>

      {/* Procesos recientes */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800">Procesos activos</h2>
          <Link to="/empresa/procesos" className="text-xs text-brand-600 font-semibold hover:underline">Ver todos →</Link>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              {['Proceso', 'Puesto', 'Candidatos', 'Completados', 'Estado'].map(h => (
                <th key={h} className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {procesos.slice(0, 6).map(p => (
              <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <p className="font-semibold text-slate-800">{p.nombre}</p>
                  <p className="text-xs text-slate-400">{new Date(p.created_at).toLocaleDateString('es-DO')}</p>
                </td>
                <td className="px-6 py-4 text-slate-500">{p.puesto || '—'}</td>
                <td className="px-6 py-4 text-slate-600">{p.total_candidatos}</td>
                <td className="px-6 py-4 text-slate-600">{p.completados}</td>
                <td className="px-6 py-4">
                  <span className={p.estado === 'activo' ? 'badge-green' : 'badge-gray'}>
                    {p.estado}
                  </span>
                </td>
              </tr>
            ))}
            {procesos.length === 0 && (
              <tr><td colSpan={5} className="px-6 py-12 text-center">
                <ClipboardList className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">No hay procesos aún</p>
                <Link to="/empresa/procesos" className="btn-primary mx-auto mt-4 inline-flex">Crear primer proceso</Link>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
