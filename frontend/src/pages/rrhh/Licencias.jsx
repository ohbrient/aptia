import { useQuery } from '@tanstack/react-query';
import { Key, Users, Calendar, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import api from '../../services/api';
import PageHeader from '../../components/ui/PageHeader';

function estadoLicencia(lic) {
  if (!lic.activa) return { label: 'Inactiva', cls: 'badge-gray', icon: Clock };
  const vence = new Date(lic.fecha_vencimiento);
  const hoy   = new Date();
  const dias   = Math.ceil((vence - hoy) / (1000 * 60 * 60 * 24));
  if (dias < 0)  return { label: 'Vencida',   cls: 'badge-gray',   icon: AlertTriangle };
  if (dias <= 30) return { label: `Vence en ${dias}d`, cls: 'badge-yellow', icon: AlertTriangle };
  return { label: 'Activa', cls: 'badge-green', icon: CheckCircle };
}

export default function Licencias() {
  const { data: licencias = [], isLoading } = useQuery({
    queryKey: ['rrhh-licencias'],
    queryFn: () => api.get('/rrhh/licencias').then(r => r.data),
  });

  const total     = licencias.reduce((s, l) => s + (parseInt(l.candidatos_total) || 0), 0);
  const usados    = licencias.reduce((s, l) => s + (parseInt(l.candidatos_usados) || 0), 0);
  const disponibles = total - usados;

  return (
    <div className="p-8">
      <PageHeader
        title="Mis licencias"
        subtitle="Licencias adquiridas de la plataforma Aptia"
      />

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card p-5">
          <div className="flex items-start justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total candidatos</p>
            <Users className="w-4 h-4 text-slate-300"/>
          </div>
          <p className="text-3xl font-bold text-slate-900">{total}</p>
          <p className="text-xs text-slate-400 mt-1">en todas tus licencias</p>
        </div>
        <div className="card p-5">
          <div className="flex items-start justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Usados</p>
            <CheckCircle className="w-4 h-4 text-slate-300"/>
          </div>
          <p className="text-3xl font-bold text-emerald-600">{usados}</p>
          <p className="text-xs text-slate-400 mt-1">evaluaciones completadas</p>
        </div>
        <div className="card p-5">
          <div className="flex items-start justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Disponibles</p>
            <Key className="w-4 h-4 text-slate-300"/>
          </div>
          <p className={`text-3xl font-bold ${disponibles > 10 ? 'text-brand-600' : 'text-amber-600'}`}>{disponibles}</p>
          <p className="text-xs text-slate-400 mt-1">candidatos restantes</p>
        </div>
      </div>

      {/* Lista de licencias */}
      {isLoading ? (
        <p className="text-slate-400 text-sm">Cargando...</p>
      ) : licencias.length === 0 ? (
        <div className="card p-12 text-center">
          <Key className="w-10 h-10 text-slate-200 mx-auto mb-3"/>
          <p className="text-slate-400 text-sm">No tienes licencias asignadas aún.</p>
          <p className="text-xs text-slate-300 mt-1">Contacta a Aptia para adquirir una licencia.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {licencias.map(lic => {
            const est  = estadoLicencia(lic);
            const pct  = lic.candidatos_total
              ? Math.round((lic.candidatos_usados / lic.candidatos_total) * 100) : 0;
            const barColor = pct >= 90 ? '#DC2626' : pct >= 70 ? '#D97706' : '#2563EB';

            return (
              <div key={lic.id} className="card p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-bold text-slate-900">
                        {lic.plan_nombre || 'Licencia'}
                      </h3>
                      <span className={est.cls}>{est.label}</span>
                    </div>
                    {lic.notas && (
                      <p className="text-xs text-slate-400">{lic.notas}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400 mb-0.5">Vencimiento</p>
                    <p className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5"/>
                      {new Date(lic.fecha_vencimiento).toLocaleDateString('es-DO', { year:'numeric', month:'long', day:'numeric' })}
                    </p>
                  </div>
                </div>

                {/* Barra de uso */}
                <div className="mb-3">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs text-slate-500">Uso de candidatos</span>
                    <span className="text-xs font-bold text-slate-700">
                      {lic.candidatos_usados} / {lic.candidatos_total}
                    </span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, background: barColor }}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-slate-400">{pct}% utilizado</span>
                    <span className="text-xs font-semibold" style={{ color: barColor }}>
                      {lic.candidatos_total - lic.candidatos_usados} disponibles
                    </span>
                  </div>
                </div>

                {/* Alerta si queda poco */}
                {pct >= 80 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700 flex items-center gap-2 mt-3">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0"/>
                    Estás usando el {pct}% de tu licencia. Contacta a Aptia para renovar o ampliar.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Contacto */}
      <div className="mt-6 bg-brand-50 border border-brand-200 rounded-2xl px-6 py-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-brand-900">¿Necesitas más candidatos o una nueva licencia?</p>
          <p className="text-xs text-brand-600 mt-0.5">Contacta a tu representante de Aptia para renovar o ampliar tu plan.</p>
        </div>
        <a href="mailto:soporte@aptia.com.do"
          className="btn-primary text-xs py-2 px-4 flex-shrink-0">
          Contactar →
        </a>
      </div>
    </div>
  );
}