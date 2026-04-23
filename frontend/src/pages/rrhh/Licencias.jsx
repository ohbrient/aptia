import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Key, Users, Calendar, CheckCircle, AlertTriangle, Clock, Upload, X } from 'lucide-react';
import api from '../../services/api';
import PageHeader from '../../components/ui/PageHeader';

function ModalCargarLicencia({ onClose }) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState(null);
  const qc = useQueryClient();

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.json')) { setError('Solo se aceptan archivos JSON'); return; }

    setCargando(true); setError(''); setExito(null);
    try {
      const fileContent = await file.text();
      const response = await api.post('/rrhh/licencias/cargar-archivo', { fileContent });
      setExito({
        nombre: response.data.license.empresa,
        candidatos: response.data.license.candidatos,
        vencimiento: response.data.license.vencimiento
      });
      qc.invalidateQueries(['rrhh-licencias']);
      setTimeout(() => onClose(), 2500);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cargar licencia');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">Cargar licencia</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg"><X className="w-4 h-4 text-slate-400"/></button>
        </div>
        <div className="p-6 space-y-4">
          {exito ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
              <CheckCircle className="w-10 h-10 text-emerald-600 mx-auto mb-2"/>
              <p className="text-sm font-semibold text-emerald-900 mb-1">¡Licencia activada!</p>
              <div className="text-xs text-emerald-700 space-y-1">
                <p><strong>{exito.nombre}</strong></p>
                <p>{exito.candidatos} candidatos incluidos</p>
                <p>Vence: {new Date(exito.vencimiento).toLocaleDateString('es-DO')}</p>
              </div>
            </div>
          ) : (
            <>
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Upload className="w-6 h-6 text-blue-600"/>
                </div>
                <p className="text-sm font-semibold text-slate-700 mb-1">Sube tu archivo de licencia</p>
                <p className="text-xs text-slate-500">Selecciona el archivo .json que te proporcionó Aptia</p>
              </div>
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-6">
                <label className="cursor-pointer flex flex-col items-center gap-2">
                  <Key className="w-8 h-8 text-slate-300"/>
                  <span className="text-sm font-semibold text-slate-600">
                    {cargando ? 'Procesando...' : 'Seleccionar archivo'}
                  </span>
                  <span className="text-xs text-slate-400">aptia-license-*.json</span>
                  <input type="file" accept=".json" onChange={handleFileChange} disabled={cargando} className="sr-only"/>
                </label>
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
              )}
              <p className="text-xs text-slate-400 text-center">
                El archivo contiene tu información de licencia protegida. No lo compartas.
              </p>
            </>
          )}
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end">
          <button onClick={onClose} className="btn-secondary">{exito ? 'Cerrar' : 'Cancelar'}</button>
        </div>
      </div>
    </div>
  );
}

function estadoLicencia(lic) {
  const vence = new Date(lic.fecha_vencimiento);
  const hoy   = new Date();
  const dias  = Math.ceil((vence - hoy) / (1000 * 60 * 60 * 24));
  if (dias < 0)   return { label: 'Vencida',          cls: 'badge-gray',   icon: AlertTriangle };
  if (dias <= 30) return { label: `Vence en ${dias}d`, cls: 'badge-yellow', icon: AlertTriangle };
  return { label: 'Activa', cls: 'badge-green', icon: CheckCircle };
}

export default function Licencias() {
  const [modalCargar, setModalCargar] = useState(false);

  const { data: todasLicencias = [], isLoading } = useQuery({
    queryKey: ['rrhh-licencias'],
    queryFn: () => api.get('/rrhh/licencias').then(r => r.data),
  });

  // ── Solo licencias activas para mostrar ──────────────────────
  const licencias = todasLicencias.filter(l => l.activa === true);

  const total      = licencias.reduce((s, l) => s + (parseInt(l.candidatos_total) || 0), 0);
  const usados     = licencias.reduce((s, l) => s + (parseInt(l.candidatos_usados) || 0), 0);
  const disponibles = total - usados;

  return (
    <div className="p-8">
      <PageHeader
        title="Mis licencias"
        subtitle="Licencias adquiridas de la plataforma Aptia"
        action={
          <button onClick={() => setModalCargar(true)} className="btn-primary">
            <Upload className="w-4 h-4"/> Cargar licencia
          </button>
        }
      />

      {/* KPIs — solo cuentan licencias activas */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card p-5">
          <div className="flex items-start justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total candidatos</p>
            <Users className="w-4 h-4 text-slate-300"/>
          </div>
          <p className="text-3xl font-bold text-slate-900">{total}</p>
          <p className="text-xs text-slate-400 mt-1">en todas tus licencias activas</p>
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

      {/* Lista */}
      {isLoading ? (
        <p className="text-slate-400 text-sm">Cargando...</p>
      ) : licencias.length === 0 ? (
        <div className="card p-12 text-center">
          <Key className="w-10 h-10 text-slate-200 mx-auto mb-3"/>
          <p className="text-slate-400 text-sm font-semibold">No tienes licencias activas</p>
          <p className="text-xs text-slate-300 mt-1 mb-6">Carga el archivo .json que te proporcionó Aptia para activar tu licencia.</p>
          <button onClick={() => setModalCargar(true)} className="btn-primary mx-auto">
            <Upload className="w-4 h-4"/> Cargar licencia
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {licencias.map(lic => {
            const est = estadoLicencia(lic);
            const pct = lic.candidatos_total
              ? Math.round((lic.candidatos_usados / lic.candidatos_total) * 100) : 0;
            const barColor = pct >= 90 ? '#DC2626' : pct >= 70 ? '#D97706' : '#2563EB';

            return (
              <div key={lic.id} className="card p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-bold text-slate-900">{lic.plan_nombre || 'Licencia'}</h3>
                      <span className={est.cls}>{est.label}</span>
                    </div>
                    {lic.notas && <p className="text-xs text-slate-400">{lic.notas}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400 mb-0.5">Vencimiento</p>
                    <p className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5"/>
                      {new Date(lic.fecha_vencimiento).toLocaleDateString('es-DO', { year:'numeric', month:'long', day:'numeric' })}
                    </p>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs text-slate-500">Uso de candidatos</span>
                    <span className="text-xs font-bold text-slate-700">{lic.candidatos_usados} / {lic.candidatos_total}</span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: barColor }}/>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-slate-400">{pct}% utilizado</span>
                    <span className="text-xs font-semibold" style={{ color: barColor }}>{lic.candidatos_total - lic.candidatos_usados} disponibles</span>
                  </div>
                </div>

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

      <div className="mt-6 bg-brand-50 border border-brand-200 rounded-2xl px-6 py-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-brand-900">¿Necesitas más candidatos o una nueva licencia?</p>
          <p className="text-xs text-brand-600 mt-0.5">Contacta a tu representante de Aptia para renovar o ampliar tu plan.</p>
        </div>
        <a href="mailto:soporte@aptia.com.do" className="btn-primary text-xs py-2 px-4 flex-shrink-0">Contactar →</a>
      </div>

      {modalCargar && <ModalCargarLicencia onClose={() => setModalCargar(false)}/>}
    </div>
  );
}