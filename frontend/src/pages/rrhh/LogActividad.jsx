import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, Users, ClipboardList, Building2, Key, Filter } from 'lucide-react';
import api from '../../services/api';
import PageHeader from '../../components/ui/PageHeader';

const TIPOS = [
  { key: '',                   label: 'Todo',                icon: Activity,      color: 'text-slate-500',   bg: 'bg-slate-100' },
  { key: 'proceso_creado',     label: 'Proceso creado',      icon: ClipboardList, color: 'text-brand-600',   bg: 'bg-brand-50' },
  { key: 'candidatos_invitados',label: 'Candidatos invitados',icon: Users,         color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { key: 'empresa_creada',     label: 'Empresa creada',      icon: Building2,     color: 'text-violet-600',  bg: 'bg-violet-50' },
  { key: 'sublicencia',        label: 'Licencia',            icon: Key,           color: 'text-amber-600',   bg: 'bg-amber-50' },
];

const TIPO_MAP = Object.fromEntries(TIPOS.map(t => [t.key, t]));

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return 'Ahora mismo';
  if (mins  < 60) return `Hace ${mins} min`;
  if (hours < 24) return `Hace ${hours}h`;
  if (days  < 7)  return `Hace ${days} día${days > 1 ? 's' : ''}`;
  return new Date(dateStr).toLocaleDateString('es-DO', { day:'numeric', month:'short', year:'numeric' });
}

export default function LogActividad() {
  const [filtroTipo, setFiltroTipo] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['rrhh-actividad', filtroTipo, page],
    queryFn: () => {
      const params = new URLSearchParams({ page, limite: 30 });
      if (filtroTipo) params.append('tipo', filtroTipo);
      return api.get(`/rrhh/actividad?${params}`).then(r => r.data);
    },
    keepPreviousData: true,
  });

  const logs    = data?.logs || [];
  const total   = data?.total || 0;
  const totalPages = Math.ceil(total / 30);

  return (
    <div className="p-8">
      <PageHeader
        title="Log de actividad"
        subtitle="Historial de todas las acciones realizadas en tu cuenta"
      />

      {/* Filtros por tipo */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {TIPOS.map(t => (
          <button
            key={t.key}
            onClick={() => { setFiltroTipo(t.key); setPage(1); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all border ${
              filtroTipo === t.key
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
            }`}
          >
            <t.icon className="w-3.5 h-3.5"/>
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="card p-12 text-center text-slate-400 text-sm">Cargando actividad...</div>
      ) : logs.length === 0 ? (
        <div className="card p-12 text-center">
          <Activity className="w-10 h-10 text-slate-200 mx-auto mb-3"/>
          <p className="text-slate-400 text-sm">No hay actividad registrada aún</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="divide-y divide-slate-50">
            {logs.map((log, idx) => {
              const tipo = TIPO_MAP[log.tipo] || TIPO_MAP[''];
              const Icon = tipo.icon;
              return (
                <div key={log.id} className="flex items-start gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                  {/* Ícono */}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${tipo.bg}`}>
                    <Icon className={`w-4 h-4 ${tipo.color}`}/>
                  </div>

                  {/* Contenido */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">{log.descripcion}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-slate-400">
                        por <span className="font-semibold text-slate-500">{log.usuario_nombre}</span>
                      </span>
                      <span className="text-xs text-slate-300">·</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tipo.bg} ${tipo.color}`}>
                        {tipo.label || log.tipo}
                      </span>
                    </div>
                  </div>

                  {/* Tiempo */}
                  <div className="text-xs text-slate-400 flex-shrink-0 mt-0.5 text-right">
                    <p>{timeAgo(log.created_at)}</p>
                    <p className="text-slate-300 mt-0.5">
                      {new Date(log.created_at).toLocaleTimeString('es-DO', {hour:'2-digit', minute:'2-digit'})}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50">
              <p className="text-xs text-slate-400">{total} eventos total</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p-1))}
                  disabled={page === 1}
                  className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ← Anterior
                </button>
                <span className="text-xs px-3 py-1.5 text-slate-500">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p+1))}
                  disabled={page === totalPages}
                  className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Siguiente →
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
