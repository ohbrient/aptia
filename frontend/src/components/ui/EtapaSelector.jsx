import { useState, useRef, useEffect } from 'react';
import { UserCheck, Briefcase, XCircle, ChevronDown, Minus } from 'lucide-react';
import api from '../../services/api';

export const ETAPA_CONFIG = {
  entrevistado: {
    label: 'Entrevistado',
    icon: UserCheck,
    color: '#2563EB',
    bg: '#DBEAFE',
    border: '#BFDBFE',
    dot: 'bg-blue-500',
  },
  contratado: {
    label: 'Contratado',
    icon: Briefcase,
    color: '#059669',
    bg: '#D1FAE5',
    border: '#A7F3D0',
    dot: 'bg-emerald-500',
  },
  no_contratado: {
    label: 'No contratado',
    icon: XCircle,
    color: '#DC2626',
    bg: '#FEE2E2',
    border: '#FECACA',
    dot: 'bg-red-400',
  },
};

const OPCIONES = [
  { value: '',             label: 'Sin etapa',     icon: Minus,      color: '#94A3B8', bg: '#F8FAFC' },
  { value: 'entrevistado', label: 'Entrevistado',  icon: UserCheck,  color: '#2563EB', bg: '#DBEAFE' },
  { value: 'contratado',   label: 'Contratado',    icon: Briefcase,  color: '#059669', bg: '#D1FAE5' },
  { value: 'no_contratado',label: 'No contratado', icon: XCircle,    color: '#DC2626', bg: '#FEE2E2' },
];

export default function EtapaSelector({ candidatoId, etapaActual, onCambio }) {
  const [open,    setOpen]    = useState(false);
  const [cargando,setCargando]= useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const cambiar = async (valor) => {
    setOpen(false);
    if (valor === (etapaActual || '')) return;
    setCargando(true);
    try {
      await api.patch(`/rrhh/candidatos/${candidatoId}/etapa`, { etapa_reclutamiento: valor || null });
      onCambio?.(valor || null);
    } catch (err) {
      alert(err.response?.data?.error || 'Error al actualizar etapa');
    } finally {
      setCargando(false);
    }
  };

  const cfg = etapaActual ? ETAPA_CONFIG[etapaActual] : null;
  const Icon = cfg ? cfg.icon : Minus;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
        disabled={cargando}
        style={cfg ? { background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` } : {}}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
          cfg ? '' : 'bg-slate-100 text-slate-400 border border-slate-200 hover:bg-slate-200'
        } ${cargando ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
      >
        <Icon className="w-3 h-3 flex-shrink-0"/>
        <span>{cfg ? cfg.label : 'Etapa'}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`}/>
      </button>

      {open && (
        <div
  className="fixed bg-white border border-slate-200 rounded-xl shadow-xl z-[9999] min-w-[160px] overflow-hidden"
  style={{ top: ref.current?.getBoundingClientRect().bottom + 4, left: ref.current?.getBoundingClientRect().left }}
          onClick={e => e.stopPropagation()}
        >
          {OPCIONES.map(op => {
            const OpIcon = op.icon;
            const activa = (etapaActual || '') === op.value;
            return (
              <button
                key={op.value}
                onClick={() => cambiar(op.value)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium hover:bg-slate-50 transition-colors text-left ${
                  activa ? 'bg-slate-50' : ''
                }`}
                style={{ color: op.color }}
              >
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: op.bg }}
                >
                  <OpIcon className="w-3 h-3"/>
                </span>
                {op.label}
                {activa && <span className="ml-auto text-slate-400">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
