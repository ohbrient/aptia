import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../services/api';

export default function ClimaPage() {
  const { token } = useParams();
  const [data,       setData]       = useState(null);
  const [error,      setError]      = useState('');
  const [respuestas, setRespuestas] = useState({});
  const [enviando,   setEnviando]   = useState(false);
  const [completado, setCompletado] = useState(false);

  const esPublico = window.location.pathname.includes('/clima/publica/');

  useEffect(() => {
    const url = esPublico ? `/api/clima/publica/${token}` : `/api/clima/${token}`;
    fetch(url)
      .then(r => r.json())
      .then(d => {
        if (d.error === 'ya_completado') { setError('ya_completado'); return; }
        if (d.error === 'encuesta_no_activa') { setError('no_activa'); return; }
        if (d.error) { setError(d.error); return; }
        setData(d);
      })
      .catch(() => setError('Error al cargar la encuesta'));
  }, [token]);

  const setRespuesta = (preguntaId, valor, esTexto=false) => {
    setRespuestas(r => ({
      ...r,
      [preguntaId]: esTexto ? { texto_respuesta: valor } : { valor_numerico: valor }
    }));
  };

  const enviar = async () => {
    if (!data) return;
    const preguntas = data.preguntas || [];
    const obligatorias = preguntas.filter(p => p.tipo_respuesta !== 'texto');
    const sinResponder = obligatorias.filter(p => respuestas[p.id] === undefined);
    if (sinResponder.length > 0) {
      alert(`Por favor responde todas las preguntas (${sinResponder.length} pendiente(s))`);
      return;
    }

    setEnviando(true);
    try {
      const payload = Object.entries(respuestas).map(([pregunta_id, val]) => ({
        pregunta_id,
        ...val,
      }));
      await fetch(`/api/clima/${data.participante.token_acceso}/responder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ respuestas: payload }),
      });
      setCompletado(true);
    } catch {
      alert('Error al enviar respuestas. Intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  // ── Pantallas de estado ───────────────────────────────
  if (completado) return (
    <div style={{ minHeight:'100vh', background:'#F8FAFC', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'system-ui,sans-serif' }}>
      <div style={{ background:'#fff', borderRadius:20, padding:'48px 40px', maxWidth:480, textAlign:'center', boxShadow:'0 4px 32px rgba(0,0,0,0.08)' }}>
        <div style={{ width:64, height:64, background:'#D1FAE5', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h2 style={{ fontSize:22, fontWeight:800, color:'#0F172A', marginBottom:8 }}>¡Gracias por tu participación!</h2>
        <p style={{ fontSize:14, color:'#64748B', lineHeight:1.6 }}>Tus respuestas han sido registradas exitosamente. Tu opinión es muy valiosa para mejorar el ambiente de trabajo.</p>
        <p style={{ fontSize:12, color:'#94A3B8', marginTop:20 }}>Puedes cerrar esta ventana.</p>
      </div>
    </div>
  );

  if (error === 'ya_completado') return (
    <div style={{ minHeight:'100vh', background:'#F8FAFC', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'system-ui,sans-serif' }}>
      <div style={{ background:'#fff', borderRadius:20, padding:'48px 40px', maxWidth:480, textAlign:'center', boxShadow:'0 4px 32px rgba(0,0,0,0.08)' }}>
        <div style={{ fontSize:48, marginBottom:16 }}>✅</div>
        <h2 style={{ fontSize:20, fontWeight:700, color:'#0F172A', marginBottom:8 }}>Ya completaste esta encuesta</h2>
        <p style={{ fontSize:14, color:'#64748B' }}>Gracias por tu participación anterior. No puedes responder dos veces.</p>
      </div>
    </div>
  );

  if (error === 'no_activa') return (
    <div style={{ minHeight:'100vh', background:'#F8FAFC', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'system-ui,sans-serif' }}>
      <div style={{ background:'#fff', borderRadius:20, padding:'48px 40px', maxWidth:480, textAlign:'center', boxShadow:'0 4px 32px rgba(0,0,0,0.08)' }}>
        <div style={{ fontSize:48, marginBottom:16 }}>🔒</div>
        <h2 style={{ fontSize:20, fontWeight:700, color:'#0F172A', marginBottom:8 }}>Encuesta no disponible</h2>
        <p style={{ fontSize:14, color:'#64748B' }}>Esta encuesta no está activa actualmente.</p>
      </div>
    </div>
  );

  if (error) return (
    <div style={{ minHeight:'100vh', background:'#F8FAFC', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'system-ui,sans-serif' }}>
      <p style={{ color:'#DC2626', fontSize:14 }}>{error}</p>
    </div>
  );

  if (!data) return (
    <div style={{ minHeight:'100vh', background:'#F8FAFC', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <p style={{ color:'#94A3B8', fontSize:14, fontFamily:'system-ui,sans-serif' }}>Cargando encuesta...</p>
    </div>
  );

  const { participante, preguntas } = data;
  const respondidas = Object.keys(respuestas).length;
  const total = preguntas.length;
  const pct = total > 0 ? Math.round((respondidas/total)*100) : 0;

  return (
    <div style={{ minHeight:'100vh', background:'#F1F5F9', fontFamily:'system-ui,-apple-system,sans-serif' }}>
      {/* Header */}
      <div style={{ background:'#0F172A', padding:'20px 24px', position:'sticky', top:0, zIndex:10 }}>
        <div style={{ maxWidth:680, margin:'0 auto', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:32, height:32, background:'linear-gradient(135deg,#6366F1,#8B5CF6)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z" fill="white"/></svg>
            </div>
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:'#fff' }}>Aptia</div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,0.4)' }}>{participante.empresa_nombre}</div>
            </div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)' }}>{respondidas}/{total} respondidas</div>
            <div style={{ width:120, height:4, background:'rgba(255,255,255,0.15)', borderRadius:100, marginTop:4, overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${pct}%`, background:'#6366F1', borderRadius:100, transition:'width 0.3s' }}/>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth:680, margin:'0 auto', padding:'24px 16px 80px' }}>
        {/* Encabezado encuesta */}
        <div style={{ background:'#fff', borderRadius:16, padding:'24px', marginBottom:16, boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
          <h1 style={{ fontSize:22, fontWeight:800, color:'#0F172A', marginBottom:8, lineHeight:1.2 }}>{participante.encuesta_nombre}</h1>
          {participante.encuesta_descripcion && <p style={{ fontSize:14, color:'#64748B', lineHeight:1.6, marginBottom:12 }}>{participante.encuesta_descripcion}</p>}
          {participante.anonimo && (
            <div style={{ display:'flex', alignItems:'center', gap:6, background:'#F0FDF4', border:'1px solid #BBF7D0', borderRadius:8, padding:'8px 12px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              <span style={{ fontSize:12, color:'#15803D', fontWeight:500 }}>Tu participación es completamente anónima</span>
            </div>
          )}
        </div>

        {/* Preguntas */}
        {preguntas.map((p, i) => {
          const respondida = respuestas[p.id] !== undefined;
          return (
            <div key={p.id} style={{
              background:'#fff', borderRadius:16, padding:'20px 24px', marginBottom:12,
              boxShadow:'0 1px 4px rgba(0,0,0,0.06)',
              border:`2px solid ${respondida?'#C7D2FE':'transparent'}`,
              transition:'border-color 0.2s',
            }}>
              <div style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:16 }}>
                <span style={{ background:'#EEF2FF', color:'#6366F1', fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:100, flexShrink:0, marginTop:2 }}>
                  {i+1}
                </span>
                <div style={{ flex:1 }}>
                  {p.categoria && <div style={{ fontSize:11, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>{p.categoria}</div>}
                  <p style={{ fontSize:15, fontWeight:600, color:'#0F172A', lineHeight:1.5 }}>{p.texto}</p>
                </div>
                {respondida && <span style={{ fontSize:16, flexShrink:0 }}>✅</span>}
              </div>

              {/* Opciones según tipo */}
              {p.tipo_respuesta === 'texto' ? (
                <textarea
                  value={respuestas[p.id]?.texto_respuesta || ''}
                  onChange={e=>setRespuesta(p.id, e.target.value, true)}
                  placeholder="Escribe tu respuesta aquí..."
                  rows={3}
                  style={{ width:'100%', border:'1px solid #E2E8F0', borderRadius:10, padding:'10px 14px', fontSize:14, color:'#0F172A', resize:'none', outline:'none', fontFamily:'inherit' }}
                />
              ) : p.tipo_respuesta === 'si_no' ? (
                <div style={{ display:'flex', gap:12 }}>
                  {(p.opciones||[{texto:'No',valor:0},{texto:'Sí',valor:1}]).map(op=>(
                    <button
                      key={op.id||op.valor}
                      onClick={()=>setRespuesta(p.id, op.valor)}
                      style={{
                        flex:1, padding:'12px', borderRadius:12, fontWeight:600, fontSize:14, cursor:'pointer', transition:'all 0.15s',
                        border:`2px solid ${respuestas[p.id]?.valor_numerico===op.valor?'#6366F1':'#E2E8F0'}`,
                        background: respuestas[p.id]?.valor_numerico===op.valor?'#EEF2FF':'#fff',
                        color: respuestas[p.id]?.valor_numerico===op.valor?'#6366F1':'#475569',
                      }}
                    >{op.texto}</button>
                  ))}
                </div>
              ) : (
                // Likert
                <div>
                  <div style={{ display:'flex', gap:8 }}>
                    {(p.opciones||[]).map(op=>(
                      <button
                        key={op.id||op.valor}
                        onClick={()=>setRespuesta(p.id, op.valor)}
                        style={{
                          flex:1, padding:'10px 4px', borderRadius:10, fontWeight:700,
                          fontSize: p.opciones?.length > 6 ? 13 : 14,
                          cursor:'pointer', transition:'all 0.15s', textAlign:'center',
                          border:`2px solid ${respuestas[p.id]?.valor_numerico===op.valor?'#6366F1':'#E2E8F0'}`,
                          background: respuestas[p.id]?.valor_numerico===op.valor?'#6366F1':'#fff',
                          color: respuestas[p.id]?.valor_numerico===op.valor?'#fff':'#64748B',
                        }}
                      >{op.valor}</button>
                    ))}
                  </div>
                  {p.opciones?.length && (
                    <div style={{ display:'flex', justifyContent:'space-between', marginTop:6 }}>
                      <span style={{ fontSize:11, color:'#94A3B8' }}>{p.opciones[0]?.texto}</span>
                      <span style={{ fontSize:11, color:'#94A3B8' }}>{p.opciones[p.opciones.length-1]?.texto}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Botón enviar */}
        <button
          onClick={enviar}
          disabled={enviando || respondidas < preguntas.filter(p=>p.tipo_respuesta!=='texto').length}
          style={{
            width:'100%', padding:'16px', borderRadius:14, fontWeight:700, fontSize:16, cursor:'pointer',
            background: enviando ? '#94A3B8' : 'linear-gradient(135deg,#6366F1,#8B5CF6)',
            color:'#fff', border:'none', boxShadow:'0 4px 16px rgba(99,102,241,0.35)',
            transition:'all 0.2s',
          }}
        >
          {enviando ? 'Enviando...' : `Enviar respuestas (${respondidas}/${total})`}
        </button>
      </div>
    </div>
  );
}
