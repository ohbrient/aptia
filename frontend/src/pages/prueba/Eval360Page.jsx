import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

const ROL_CONFIG = {
  auto:        { label:'Autoevaluación',   color:'#6366F1', bg:'#EEF2FF', emoji:'🪞' },
  jefe:        { label:'Jefe directo',     color:'#D97706', bg:'#FEF3C7', emoji:'👔' },
  par:         { label:'Par / Compañero',  color:'#059669', bg:'#D1FAE5', emoji:'🤝' },
  subordinado: { label:'Subordinado',      color:'#DC2626', bg:'#FEE2E2', emoji:'📋' },
};

export default function Eval360Page() {
  const { token } = useParams();
  const [data,       setData]       = useState(null);
  const [error,      setError]      = useState('');
  const [respuestas, setRespuestas] = useState({});
  const [enviando,   setEnviando]   = useState(false);
  const [completado, setCompletado] = useState(false);

  useEffect(() => {
    fetch(`/api/eval360/${token}`)
      .then(r=>r.json())
      .then(d=>{
        if (d.error==='ya_completado') { setError('ya_completado'); return; }
        if (d.error==='eval_no_activa') { setError('no_activa'); return; }
        if (d.error) { setError(d.error); return; }
        setData(d);
      })
      .catch(()=>setError('Error al cargar la evaluación'));
  }, [token]);

  const setResp = (pregId, valor, esTexto=false) => {
    setRespuestas(r=>({...r,[pregId]:esTexto?{texto_respuesta:valor}:{valor_numerico:valor}}));
  };

  const enviar = async () => {
    const preguntas = data?.preguntas||[];
    const obligatorias = preguntas.filter(p=>p.tipo_respuesta!=='texto');
    if (obligatorias.some(p=>respuestas[p.id]===undefined)) {
      alert(`Por favor responde todas las preguntas (${obligatorias.filter(p=>respuestas[p.id]===undefined).length} pendiente(s))`);
      return;
    }
    setEnviando(true);
    try {
      await fetch(`/api/eval360/${token}/responder`, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ respuestas: Object.entries(respuestas).map(([pregunta_id,val])=>({pregunta_id,...val})) }),
      });
      setCompletado(true);
    } catch { alert('Error al enviar. Intenta de nuevo.'); }
    finally { setEnviando(false); }
  };

  if (completado) return (
    <div style={{minHeight:'100vh',background:'#F8FAFC',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'system-ui,sans-serif'}}>
      <div style={{background:'#fff',borderRadius:20,padding:'48px 40px',maxWidth:480,textAlign:'center',boxShadow:'0 4px 32px rgba(0,0,0,0.08)'}}>
        <div style={{fontSize:56,marginBottom:16}}>🎉</div>
        <h2 style={{fontSize:22,fontWeight:800,color:'#0F172A',marginBottom:8}}>¡Gracias por tu evaluación!</h2>
        <p style={{fontSize:14,color:'#64748B',lineHeight:1.6}}>Tu retroalimentación ha sido registrada exitosamente. Tu opinión es fundamental para el desarrollo del evaluado.</p>
        <p style={{fontSize:12,color:'#94A3B8',marginTop:20}}>Puedes cerrar esta ventana.</p>
      </div>
    </div>
  );

  if (error==='ya_completado') return (
    <div style={{minHeight:'100vh',background:'#F8FAFC',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'system-ui,sans-serif'}}>
      <div style={{background:'#fff',borderRadius:20,padding:'48px 40px',maxWidth:480,textAlign:'center',boxShadow:'0 4px 32px rgba(0,0,0,0.08)'}}>
        <div style={{fontSize:56,marginBottom:16}}>✅</div>
        <h2 style={{fontSize:20,fontWeight:700,color:'#0F172A',marginBottom:8}}>Ya completaste esta evaluación</h2>
        <p style={{fontSize:14,color:'#64748B'}}>Gracias por tu participación. No puedes responder dos veces.</p>
      </div>
    </div>
  );

  if (error==='no_activa') return (
    <div style={{minHeight:'100vh',background:'#F8FAFC',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'system-ui,sans-serif'}}>
      <div style={{background:'#fff',borderRadius:20,padding:'48px 40px',maxWidth:480,textAlign:'center',boxShadow:'0 4px 32px rgba(0,0,0,0.08)'}}>
        <div style={{fontSize:56,marginBottom:16}}>🔒</div>
        <h2 style={{fontSize:20,fontWeight:700,color:'#0F172A',marginBottom:8}}>Evaluación no disponible</h2>
        <p style={{fontSize:14,color:'#64748B'}}>Esta evaluación no está activa actualmente.</p>
      </div>
    </div>
  );

  if (error) return (
    <div style={{minHeight:'100vh',background:'#F8FAFC',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <p style={{color:'#DC2626',fontSize:14,fontFamily:'system-ui,sans-serif'}}>{error}</p>
    </div>
  );

  if (!data) return (
    <div style={{minHeight:'100vh',background:'#F8FAFC',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <p style={{color:'#94A3B8',fontSize:14,fontFamily:'system-ui,sans-serif'}}>Cargando evaluación...</p>
    </div>
  );

  const { evaluador, preguntas } = data;
  const rolCfg = ROL_CONFIG[evaluador.rol] || ROL_CONFIG.par;
  const esAuto = evaluador.rol === 'auto';
  const respondidas = Object.keys(respuestas).length;
  const total = preguntas.length;
  const pct = total>0?Math.round((respondidas/total)*100):0;

  return (
    <div style={{minHeight:'100vh',background:'#F1F5F9',fontFamily:'system-ui,-apple-system,sans-serif'}}>
      {/* Header */}
      <div style={{background:'#0F172A',padding:'16px 24px',position:'sticky',top:0,zIndex:10}}>
        <div style={{maxWidth:680,margin:'0 auto',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:32,height:32,background:'linear-gradient(135deg,#6366F1,#8B5CF6)',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z" fill="white"/></svg>
            </div>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:'#fff'}}>Aptia</div>
              <div style={{fontSize:10,color:'rgba(255,255,255,0.4)'}}>Evaluación 360°</div>
            </div>
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{fontSize:11,color:'rgba(255,255,255,0.4)'}}>{respondidas}/{total} respondidas</div>
            <div style={{width:120,height:4,background:'rgba(255,255,255,0.15)',borderRadius:100,marginTop:4,overflow:'hidden'}}>
              <div style={{height:'100%',width:`${pct}%`,background:rolCfg.color,borderRadius:100,transition:'width 0.3s'}}/>
            </div>
          </div>
        </div>
      </div>

      <div style={{maxWidth:680,margin:'0 auto',padding:'24px 16px 80px'}}>
        {/* Encabezado */}
        <div style={{background:'#fff',borderRadius:16,padding:'24px',marginBottom:16,boxShadow:'0 1px 4px rgba(0,0,0,0.06)'}}>
          <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:12}}>
            <div style={{fontSize:32}}>{rolCfg.emoji}</div>
            <div>
              <div style={{fontSize:12,color:'#94A3B8',marginBottom:2}}>Tu rol en esta evaluación</div>
              <div style={{background:rolCfg.bg,color:rolCfg.color,fontSize:13,fontWeight:700,padding:'4px 14px',borderRadius:100,display:'inline-block'}}>
                {rolCfg.label}
              </div>
            </div>
          </div>
          <h1 style={{fontSize:20,fontWeight:800,color:'#0F172A',marginBottom:6}}>
            {esAuto ? 'Tu autoevaluación' : `Evaluación de ${evaluador.nombre_evaluado}`}
          </h1>
          {evaluador.puesto&&<p style={{fontSize:13,color:'#64748B'}}>Puesto: <strong>{evaluador.puesto}</strong></p>}
          {evaluador.proceso_nombre&&<p style={{fontSize:13,color:'#64748B',marginTop:2}}>{evaluador.proceso_nombre}</p>}
          <p style={{fontSize:12,color:'#94A3B8',marginTop:8}}>
            {esAuto
              ? 'Por favor evalúa tu propio desempeño de manera honesta. Tus respuestas son confidenciales.'
              : `Evalúa el desempeño de ${evaluador.nombre_evaluado}. Tu retroalimentación es confidencial.`
            }
          </p>
          {evaluador.fecha_cierre&&(
            <div style={{marginTop:8,fontSize:11,color:'#DC2626'}}>
              ⏰ Fecha límite: {new Date(evaluador.fecha_cierre).toLocaleDateString('es-DO',{year:'numeric',month:'long',day:'numeric'})}
            </div>
          )}
        </div>

        {/* Preguntas agrupadas por categoría */}
        {(() => {
          const categorias = [...new Set(preguntas.map(p=>p.categoria||'General'))];
          return categorias.map(cat=>{
            const ps = preguntas.filter(p=>(p.categoria||'General')===cat);
            return (
              <div key={cat} style={{marginBottom:16}}>
                <div style={{fontSize:11,fontWeight:700,color:rolCfg.color,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:8,paddingLeft:4}}>
                  {cat}
                </div>
                {ps.map(p=>{
                  const respondida = respuestas[p.id]!==undefined;
                  return (
                    <div key={p.id} style={{background:'#fff',borderRadius:16,padding:'20px 24px',marginBottom:10,boxShadow:'0 1px 4px rgba(0,0,0,0.06)',border:`2px solid ${respondida?rolCfg.color+'40':'transparent'}`,transition:'border-color 0.2s'}}>
                      <div style={{display:'flex',alignItems:'flex-start',gap:8,marginBottom:16}}>
                        <div style={{flex:1}}>
                          <p style={{fontSize:15,fontWeight:600,color:'#0F172A',lineHeight:1.5}}>{p.texto}</p>
                        </div>
                        {respondida&&<span style={{fontSize:16,flexShrink:0}}>✅</span>}
                      </div>

                      {p.tipo_respuesta==='texto'?(
                        <textarea value={respuestas[p.id]?.texto_respuesta||''} onChange={e=>setResp(p.id,e.target.value,true)} placeholder="Escribe tu respuesta..." rows={3}
                          style={{width:'100%',border:'1px solid #E2E8F0',borderRadius:10,padding:'10px 14px',fontSize:14,color:'#0F172A',resize:'none',outline:'none',fontFamily:'inherit'}}/>
                      ):p.tipo_respuesta==='si_no'?(
                        <div style={{display:'flex',gap:12}}>
                          {(p.opciones||[]).map(op=>(
                            <button key={op.valor} onClick={()=>setResp(p.id,op.valor)} style={{flex:1,padding:'12px',borderRadius:12,fontWeight:600,fontSize:14,cursor:'pointer',transition:'all 0.15s',border:`2px solid ${respuestas[p.id]?.valor_numerico===op.valor?rolCfg.color:'#E2E8F0'}`,background:respuestas[p.id]?.valor_numerico===op.valor?rolCfg.bg:'#fff',color:respuestas[p.id]?.valor_numerico===op.valor?rolCfg.color:'#475569'}}>
                              {op.texto}
                            </button>
                          ))}
                        </div>
                      ):(
                        <div>
                          <div style={{display:'flex',gap:8}}>
                            {(p.opciones||[]).map(op=>(
                              <button key={op.valor} onClick={()=>setResp(p.id,op.valor)} style={{flex:1,padding:'10px 4px',borderRadius:10,fontWeight:700,fontSize:14,cursor:'pointer',transition:'all 0.15s',textAlign:'center',border:`2px solid ${respuestas[p.id]?.valor_numerico===op.valor?rolCfg.color:'#E2E8F0'}`,background:respuestas[p.id]?.valor_numerico===op.valor?rolCfg.color:'#fff',color:respuestas[p.id]?.valor_numerico===op.valor?'#fff':'#64748B'}}>
                                {op.valor}
                              </button>
                            ))}
                          </div>
                          <div style={{display:'flex',justifyContent:'space-between',marginTop:6}}>
                            <span style={{fontSize:11,color:'#94A3B8'}}>{p.opciones?.[0]?.texto}</span>
                            <span style={{fontSize:11,color:'#94A3B8'}}>{p.opciones?.[p.opciones.length-1]?.texto}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          });
        })()}

        {/* Botón enviar */}
        <button onClick={enviar} disabled={enviando||respondidas<preguntas.filter(p=>p.tipo_respuesta!=='texto').length}
          style={{width:'100%',padding:'16px',borderRadius:14,fontWeight:700,fontSize:16,cursor:'pointer',background:enviando?'#94A3B8':`linear-gradient(135deg,${rolCfg.color},${rolCfg.color}cc)`,color:'#fff',border:'none',boxShadow:`0 4px 16px ${rolCfg.color}40`,transition:'all 0.2s'}}>
          {enviando?'Enviando...':`Enviar evaluación (${respondidas}/${total})`}
        </button>
      </div>
    </div>
  );
}
