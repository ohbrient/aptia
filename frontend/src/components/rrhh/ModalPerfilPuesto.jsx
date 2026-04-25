// ══════════════════════════════════════════════════════════
// ModalPerfilPuesto.jsx
// Guardar en: frontend/src/components/rrhh/ModalPerfilPuesto.jsx
// ══════════════════════════════════════════════════════════
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Target, Sliders, CheckCircle, Trash2, ChevronDown, ChevronUp, Info } from 'lucide-react';
import api from '../../services/api';

const NIVEL_COLOR = {
  alto:          { bg:'#D1FAE5', text:'#065F46', label:'Alto match' },
  medio:         { bg:'#FEF3C7', text:'#92400E', label:'Match medio' },
  bajo:          { bg:'#FEE2E2', text:'#991B1B', label:'Match bajo' },
  no_compatible: { bg:'#F1F5F9', text:'#475569', label:'No compatible' },
};

function SliderDimension({ dim, value, peso, onChange, onPesoChange }) {
  const nivel =
    value >= 80 ? { color:'#059669', label:'Alto' } :
    value >= 60 ? { color:'#D97706', label:'Medio' } :
    value >= 40 ? { color:'#DC2626', label:'Bajo' }  :
                  { color:'#6366F1', label:'Mínimo' };

  return (
    <div style={{
      padding: '14px 16px',
      background: '#FAFBFF',
      borderRadius: 12,
      border: '1px solid #F1F5F9',
      marginBottom: 8,
    }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{
            background: '#EEF2FF', color:'#6366F1',
            fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:100,
          }}>{dim.codigo}</span>
          <span style={{ fontSize:13, fontWeight:500, color:'#1E293B' }}>{dim.nombre}</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontSize:13, fontWeight:700, color: nivel.color }}>{value}%</span>
          <span style={{
            fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:100,
            background: nivel.color + '20', color: nivel.color,
          }}>{nivel.label}</span>
        </div>
      </div>

      {/* Slider puntaje mínimo */}
      <div style={{ marginBottom:8 }}>
        <div style={{ fontSize:10, color:'#94A3B8', marginBottom:4 }}>Puntaje mínimo requerido</div>
        <input
          type="range" min="0" max="100" step="5" value={value}
          onChange={e => onChange(parseInt(e.target.value))}
          style={{ width:'100%', accentColor: nivel.color, cursor:'pointer' }}
        />
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:9, color:'#CBD5E1' }}>
          <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
        </div>
      </div>

      {/* Peso */}
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <span style={{ fontSize:10, color:'#94A3B8' }}>Peso:</span>
        {[1,2,3].map(p => (
          <button
            key={p}
            onClick={() => onPesoChange(p)}
            style={{
              width:28, height:28, borderRadius:8, border:'1.5px solid',
              borderColor: peso === p ? '#6366F1' : '#E2E8F0',
              background: peso === p ? '#EEF2FF' : '#fff',
              color: peso === p ? '#6366F1' : '#94A3B8',
              fontSize:12, fontWeight:700, cursor:'pointer',
            }}
          >{p}</button>
        ))}
        <span style={{ fontSize:10, color:'#CBD5E1', marginLeft:4 }}>
          {peso === 1 ? 'Normal' : peso === 2 ? 'Importante' : 'Crítico'}
        </span>
      </div>
    </div>
  );
}

export default function ModalPerfilPuesto({ procesoId, procesoNombre, onClose }) {
  const qc = useQueryClient();
  const [selectedPrueba, setSelectedPrueba] = useState(null);
  const [dimValues, setDimValues]   = useState({});  // { dim_id: puntaje_minimo }
  const [dimPesos,  setDimPesos]    = useState({});  // { dim_id: peso }
  const [guardado,  setGuardado]    = useState(false);
  const [error,     setError]       = useState('');
  const [expandedInfo, setExpandedInfo] = useState(false);

  // Obtener pruebas del proceso con sus dimensiones
  const { data: pruebasConDims = [], isLoading } = useQuery({
    queryKey: ['rrhh-perfil-dims', procesoId],
    queryFn: () => api.get(`/rrhh/procesos/${procesoId}/perfil/dimensiones-disponibles`).then(r => r.data),
  });

  // Obtener perfiles existentes
  const { data: perfilesExistentes = [] } = useQuery({
    queryKey: ['rrhh-perfil', procesoId],
    queryFn: () => api.get(`/rrhh/procesos/${procesoId}/perfil`).then(r => r.data),
  });

  // Cuando cambia prueba seleccionada, cargar sus valores si tiene perfil
  useEffect(() => {
    if (!selectedPrueba) return;
    const perfil = perfilesExistentes.find(p => p.prueba_id === selectedPrueba.prueba_id);
    if (perfil?.dimensiones?.length) {
      const vals = {}, pesos = {};
      perfil.dimensiones.forEach(d => {
        vals[d.dimension_id]  = d.puntaje_minimo ?? 60;
        pesos[d.dimension_id] = d.peso ?? 1;
      });
      setDimValues(vals);
      setDimPesos(pesos);
    } else {
      // Defaults: 60% y peso 1 para todas
      const vals = {}, pesos = {};
      (selectedPrueba.dimensiones || []).forEach(d => {
        vals[d.id]  = 60;
        pesos[d.id] = 1;
      });
      setDimValues(vals);
      setDimPesos(pesos);
    }
    setGuardado(false);
    setError('');
  }, [selectedPrueba, perfilesExistentes]);

  const guardarMut = useMutation({
    mutationFn: () => {
      const dimensiones = (selectedPrueba.dimensiones || []).map(d => ({
        dimension_id:   d.id,
        puntaje_minimo: dimValues[d.id] ?? 60,
        peso:           dimPesos[d.id]  ?? 1,
      }));
      return api.post(`/rrhh/procesos/${procesoId}/perfil`, {
        prueba_id:   selectedPrueba.prueba_id,
        nombre:      procesoNombre,
        dimensiones,
      });
    },
    onSuccess: () => {
      setGuardado(true);
      qc.invalidateQueries(['rrhh-perfil', procesoId]);
      setTimeout(() => setGuardado(false), 3000);
    },
    onError: err => setError(err.response?.data?.error || 'Error al guardar'),
  });

  const eliminarMut = useMutation({
    mutationFn: (prueba_id) => api.delete(`/rrhh/procesos/${procesoId}/perfil/${prueba_id}`),
    onSuccess: () => qc.invalidateQueries(['rrhh-perfil', procesoId]),
  });

  // Calcular vista previa del match con los valores actuales
  const previewMatch = () => {
    if (!selectedPrueba?.dimensiones?.length) return null;
    const dims = selectedPrueba.dimensiones;
    let total = 0, totalPeso = 0;
    dims.forEach(d => {
      const min  = dimValues[d.id] ?? 60;
      const peso = dimPesos[d.id]  ?? 1;
      // Simular un candidato promedio en 70%
      const candidato = 70;
      const score = Math.min((candidato / (min || 1)) * 100, 100);
      total     += score * peso;
      totalPeso += peso;
    });
    return totalPeso > 0 ? Math.round(total / totalPeso) : 0;
  };

  const matchPreview = previewMatch();

  return (
    <div style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,0.35)',
      display:'flex', alignItems:'center', justifyContent:'center',
      zIndex:100, padding:16,
    }}>
      <div style={{
        background:'#fff', borderRadius:20, width:'100%', maxWidth:720,
        maxHeight:'90vh', overflow:'hidden', display:'flex', flexDirection:'column',
        boxShadow:'0 24px 60px rgba(0,0,0,0.15)',
      }}>

        {/* Header */}
        <div style={{
          padding:'20px 24px', borderBottom:'1px solid #F1F5F9',
          display:'flex', alignItems:'center', gap:12, flexShrink:0,
        }}>
          <div style={{
            width:36, height:36, borderRadius:10,
            background:'linear-gradient(135deg,#6366F1,#8B5CF6)',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            <Target size={18} color="#fff"/>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:15, fontWeight:700, color:'#0F172A' }}>Perfil de Puesto</div>
            <div style={{ fontSize:12, color:'#94A3B8' }}>{procesoNombre}</div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', padding:4 }}>
            <X size={18} color="#94A3B8"/>
          </button>
        </div>

        <div style={{ display:'flex', flex:1, overflow:'hidden' }}>

          {/* Panel izquierdo — lista de pruebas */}
          <div style={{
            width:220, borderRight:'1px solid #F1F5F9', padding:'16px 12px',
            overflowY:'auto', flexShrink:0, background:'#FAFBFF',
          }}>
            <div style={{ fontSize:10, fontWeight:700, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:12, paddingLeft:4 }}>
              Pruebas del proceso
            </div>

            {isLoading && <p style={{ fontSize:12, color:'#94A3B8', padding:4 }}>Cargando...</p>}

            {pruebasConDims.length === 0 && !isLoading && (
              <div style={{ fontSize:12, color:'#CBD5E1', padding:'8px 4px', lineHeight:1.5 }}>
                No hay pruebas asignadas a este proceso.
              </div>
            )}

            {pruebasConDims.map(p => {
              const tienePerfil = perfilesExistentes.some(pe => pe.prueba_id === p.prueba_id);
              const isSelected  = selectedPrueba?.prueba_id === p.prueba_id;
              return (
                <div
                  key={p.prueba_id}
                  onClick={() => setSelectedPrueba(p)}
                  style={{
                    padding:'10px 12px', borderRadius:10, cursor:'pointer', marginBottom:4,
                    background: isSelected ? '#EEF2FF' : 'transparent',
                    border: `1.5px solid ${isSelected ? '#C7D2FE' : 'transparent'}`,
                    transition:'all 0.15s',
                  }}
                >
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:12, fontWeight:600, color: isSelected ? '#6366F1' : '#1E293B', lineHeight:1.3 }}>
                        {p.prueba_nombre}
                      </div>
                      <div style={{ fontSize:10, color:'#94A3B8', marginTop:2 }}>
                        {(p.dimensiones || []).length} dimensiones
                      </div>
                    </div>
                    {tienePerfil && (
                      <div title="Perfil configurado">
                        <CheckCircle size={14} color="#059669"/>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Panel derecho — configurar dimensiones */}
          <div style={{ flex:1, overflow:'auto', padding:'20px 24px' }}>
            {!selectedPrueba ? (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', color:'#CBD5E1' }}>
                <Sliders size={40} style={{ marginBottom:12 }}/>
                <p style={{ fontSize:13, color:'#94A3B8' }}>Selecciona una prueba para configurar su perfil</p>
              </div>
            ) : (
              <>
                {/* Info box */}
                <div style={{
                  background:'#F0F9FF', border:'1px solid #BAE6FD',
                  borderRadius:12, padding:'10px 14px', marginBottom:20,
                }}>
                  <div
                    style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer' }}
                    onClick={() => setExpandedInfo(v => !v)}
                  >
                    <Info size={13} color="#0284C7"/>
                    <span style={{ fontSize:12, color:'#0369A1', fontWeight:500, flex:1 }}>
                      ¿Cómo funciona el perfil de puesto?
                    </span>
                    {expandedInfo ? <ChevronUp size={13} color="#0284C7"/> : <ChevronDown size={13} color="#0284C7"/>}
                  </div>
                  {expandedInfo && (
                    <div style={{ fontSize:11, color:'#0369A1', marginTop:8, lineHeight:1.6 }}>
                      Define el <strong>puntaje mínimo</strong> que necesitas en cada dimensión. Cuando un candidato
                      complete la evaluación, el sistema calculará automáticamente su <strong>% de compatibilidad</strong> con este perfil.
                      El <strong>peso</strong> indica la importancia relativa de cada dimensión (1=normal, 2=importante, 3=crítico).
                    </div>
                  )}
                </div>

                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                  <div>
                    <div style={{ fontSize:14, fontWeight:700, color:'#0F172A' }}>{selectedPrueba.prueba_nombre}</div>
                    <div style={{ fontSize:11, color:'#94A3B8' }}>{(selectedPrueba.dimensiones||[]).length} dimensiones a configurar</div>
                  </div>
                  {perfilesExistentes.some(pe => pe.prueba_id === selectedPrueba.prueba_id) && (
                    <button
                      onClick={() => eliminarMut.mutate(selectedPrueba.prueba_id)}
                      style={{ background:'none', border:'1px solid #FECACA', borderRadius:8, padding:'4px 10px', color:'#DC2626', fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}
                    >
                      <Trash2 size={12}/> Eliminar perfil
                    </button>
                  )}
                </div>

                {/* Sliders */}
                {(selectedPrueba.dimensiones || []).map(d => (
                  <SliderDimension
                    key={d.id}
                    dim={d}
                    value={dimValues[d.id] ?? 60}
                    peso={dimPesos[d.id] ?? 1}
                    onChange={v  => setDimValues(prev  => ({ ...prev,  [d.id]: v }))}
                    onPesoChange={p => setDimPesos(prev => ({ ...prev,  [d.id]: p }))}
                  />
                ))}

                {/* Preview match */}
                {matchPreview !== null && (
                  <div style={{
                    marginTop:16, padding:'12px 16px', background:'#F8FAFC',
                    borderRadius:12, border:'1px solid #E2E8F0',
                    display:'flex', alignItems:'center', gap:12,
                  }}>
                    <div style={{ fontSize:11, color:'#64748B' }}>
                      Vista previa — candidato promedio (70%):
                    </div>
                    <div style={{
                      fontSize:14, fontWeight:800,
                      color: matchPreview >= 80 ? '#059669' : matchPreview >= 60 ? '#D97706' : '#DC2626',
                    }}>
                      {matchPreview}% match
                    </div>
                  </div>
                )}

                {error && (
                  <div style={{ background:'#FEE2E2', color:'#DC2626', fontSize:12, padding:'10px 14px', borderRadius:8, marginTop:12 }}>
                    {error}
                  </div>
                )}

                {/* Botón guardar */}
                <button
                  onClick={() => guardarMut.mutate()}
                  disabled={guardarMut.isPending || !(selectedPrueba.dimensiones||[]).length}
                  style={{
                    width:'100%', marginTop:16, padding:'12px',
                    background: guardado ? '#059669' : 'linear-gradient(135deg,#6366F1,#8B5CF6)',
                    color:'#fff', border:'none', borderRadius:12, fontSize:14, fontWeight:700,
                    cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                    transition:'all 0.2s',
                  }}
                >
                  {guardado ? (
                    <><CheckCircle size={16}/> Perfil guardado</>
                  ) : guardarMut.isPending ? (
                    'Guardando...'
                  ) : (
                    <><Target size={16}/> Guardar perfil de puesto</>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
