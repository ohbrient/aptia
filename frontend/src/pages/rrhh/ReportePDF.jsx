import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../services/api';

function getNivel(pct) {
  const p = parseFloat(pct) || 0;
  if (p >= 81) return { label: 'Alto',           grado: 'A · Alto',            color: '#059669', light: '#D1FAE5', dot: '#34D399', border: '#A7F3D0' };
  if (p >= 56) return { label: 'Medio',          grado: 'B · Medio',           color: '#D97706', light: '#FEF3C7', dot: '#FCD34D', border: '#FDE68A' };
  if (p >= 26) return { label: 'Bajo',           grado: 'C · Bajo',            color: '#DC2626', light: '#FEE2E2', dot: '#F87171', border: '#FECACA' };
  return             { label: 'No desarrollada', grado: 'D · No desarrollada', color: '#6366F1', light: '#EEF2FF', dot: '#A5B4FC', border: '#C7D2FE' };
}

function formatInforme(text) {
  if (!text) return '';
  return text.split('\n\n').map(p => {
    if (p.startsWith('### ')) return `<h3>${p.slice(4)}</h3>`;
    const html = p.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>');
    return html.trim() ? `<p>${html}</p>` : '';
  }).join('');
}

export default function ReportePDF() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/rrhh/candidatos/${id}/reporte-pdf`)
      .then(r => setData(r.data))
      .catch(() => setError('No se pudo cargar el reporte'));
  }, [id]);

  useEffect(() => {
    if (data) document.title = `Informe — ${data.nombre} ${data.apellido || ''}`;
  }, [data]);

  if (error) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#0F172A' }}>
      <p style={{ color:'#F87171', fontSize:14, fontFamily:'sans-serif' }}>{error}</p>
    </div>
  );
  if (!data) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#0F172A' }}>
      <p style={{ color:'#475569', fontSize:13, fontFamily:'sans-serif' }}>Cargando informe...</p>
    </div>
  );

  const resultados = data.resultados || [];
  const fecha = data.fecha_completado
    ? new Date(data.fecha_completado).toLocaleDateString('es-DO', { year:'numeric', month:'long', day:'numeric' })
    : new Date().toLocaleDateString('es-DO', { year:'numeric', month:'long', day:'numeric' });

  const porPrueba = {};
  resultados.forEach(r => {
    const key = r.prueba_nombre || 'Evaluación';
    if (!porPrueba[key]) porPrueba[key] = { tipo: r.prueba_tipo, dims: [] };
    porPrueba[key].dims.push(r);
  });

  const promedio = resultados.length
    ? Math.round(resultados.reduce((s, r) => s + (parseFloat(r.puntaje) || 0), 0) / resultados.length)
    : 0;
  const nvProm = getNivel(promedio);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=DM+Serif+Display:ital@0;1&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', system-ui, sans-serif; background: #F1F5F9; color: #0F172A; -webkit-font-smoothing: antialiased; }

        .print-btn {
          position: fixed; top: 24px; right: 24px; z-index: 200;
          display: flex; align-items: center; gap: 8px;
          background: #0F172A; color: #fff; border: none; border-radius: 12px;
          padding: 11px 22px; font-size: 13px; font-weight: 600;
          font-family: 'DM Sans', sans-serif; cursor: pointer;
          box-shadow: 0 8px 32px rgba(15,23,42,0.3); transition: all 0.2s;
        }
        .print-btn:hover { background: #1E293B; transform: translateY(-2px); }

        .wrap { max-width: 860px; margin: 0 auto; padding: 32px 20px 60px; }

        /* ── HERO ── */
        .hero {
          background: #0F172A; border-radius: 24px; overflow: hidden;
          margin-bottom: 3px; position: relative;
        }
        .hero::before {
          content: '';
          position: absolute; width: 600px; height: 600px;
          background: radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 65%);
          top: -150px; right: -100px; pointer-events: none;
        }
        .hero::after {
          content: '';
          position: absolute; width: 400px; height: 400px;
          background: radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 65%);
          bottom: -80px; left: 80px; pointer-events: none;
        }
        .hero-nav {
          padding: 24px 40px; display: flex; justify-content: space-between; align-items: center;
          border-bottom: 1px solid rgba(255,255,255,0.06); position: relative; z-index: 1;
        }
        .brand { display: flex; align-items: center; gap: 12px; }
        .brand-icon {
          width: 34px; height: 34px; border-radius: 9px;
          background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%);
          display: flex; align-items: center; justify-content: center;
        }
        .brand-name { font-family: 'DM Serif Display', serif; font-size: 20px; color: #fff; }
        .brand-sub { font-size: 10px; color: rgba(255,255,255,0.35); margin-top: 1px; letter-spacing: 0.04em; }
        .hero-right { text-align: right; }
        .hero-company { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.85); margin-bottom: 2px; }
        .hero-date { font-size: 11px; color: rgba(255,255,255,0.3); text-transform: uppercase; letter-spacing: 0.06em; }

        .hero-main {
          padding: 36px 40px 28px; position: relative; z-index: 1;
          display: flex; justify-content: space-between; align-items: flex-start; gap: 24px;
        }
        .cand-name {
          font-family: 'DM Serif Display', serif;
          font-size: 42px; color: #fff; letter-spacing: -1.5px; line-height: 1;
          margin-bottom: 12px;
        }
        .cand-name span { color: rgba(255,255,255,0.4); }
        .cand-chips { display: flex; gap: 8px; flex-wrap: wrap; }
        .cand-chip {
          font-size: 11px; color: rgba(255,255,255,0.6);
          background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.1);
          padding: 4px 12px; border-radius: 100px;
        }
        .score-ring {
          width: 96px; height: 96px; border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.04);
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .score-num {
          font-family: 'DM Serif Display', serif; font-size: 28px; line-height: 1;
        }
        .score-lbl { font-size: 10px; margin-top: 3px; text-transform: uppercase; letter-spacing: 0.05em; }

        .hero-footer {
          padding: 0 40px 28px; display: flex; gap: 8px; flex-wrap: wrap;
          position: relative; z-index: 1;
        }
        .hf-tag {
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px; padding: 8px 16px; min-width: 110px;
        }
        .hf-tag-label { font-size: 9px; color: rgba(255,255,255,0.28); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 3px; }
        .hf-tag-val { font-size: 12px; font-weight: 500; color: rgba(255,255,255,0.8); }

        /* ── CARDS ── */
        .card {
          background: #fff; border-radius: 20px; padding: 28px 32px;
          margin-bottom: 3px; border: 1px solid #E2E8F0;
        }
        .card-title {
          font-family: 'DM Serif Display', serif; font-size: 22px; color: #0F172A;
          letter-spacing: -0.3px; margin-bottom: 22px;
          display: flex; align-items: center; gap: 14px;
        }
        .card-title-line { flex: 1; height: 1px; background: linear-gradient(90deg, #E2E8F0, transparent); }

        /* ── LEVELS ── */
        .levels-intro { font-size: 12px; color: #64748B; line-height: 1.75; margin-bottom: 18px; }
        .levels-intro strong { color: #0F172A; }
        .lvl-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
        .lvl-item { border-radius: 14px; padding: 14px; border: 1.5px solid; }
        .lvl-range { font-family: 'DM Serif Display', serif; font-size: 18px; font-weight: 700; margin-bottom: 3px; }
        .lvl-name { font-size: 12px; font-weight: 700; margin-bottom: 2px; }
        .lvl-desc { font-size: 10px; opacity: 0.65; line-height: 1.4; }

        /* ── BARS ── */
        .prueba-tag-row { display: flex; align-items: center; gap: 10px; margin-bottom: 18px; }
        .p-tag {
          font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
          color: #6366F1; background: #EEF2FF; padding: 4px 12px; border-radius: 100px;
        }
        .p-line { flex: 1; height: 1px; background: #F1F5F9; }

        .bar-row { display: grid; grid-template-columns: 195px 1fr 58px 98px; align-items: center; gap: 14px; padding: 9px 0; border-bottom: 1px solid #F8FAFC; }
        .bar-row:last-child { border-bottom: none; }
        .bar-row.prom { border-top: 1px solid #E2E8F0; border-bottom: none; margin-top: 4px; padding-top: 14px; }
        .bar-name { font-size: 13px; font-weight: 500; color: #334155; text-align: right; }
        .bar-name.b { font-weight: 700; color: #0F172A; }
        .bar-track { height: 10px; background: #F1F5F9; border-radius: 100px; overflow: hidden; }
        .bar-track.lg { height: 13px; }
        .bar-fill { height: 100%; border-radius: 100px; }
        .bar-pct { font-size: 13px; font-weight: 700; text-align: right; }
        .bar-pct.lg { font-family: 'DM Serif Display', serif; font-size: 16px; }
        .badge { font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 100px; text-align: center; border: 1.5px solid; white-space: nowrap; }
        .badge.lg { font-weight: 800; }

        .legend { display: flex; gap: 18px; margin-top: 18px; flex-wrap: wrap; }
        .leg-item { display: flex; align-items: center; gap: 6px; font-size: 11px; color: #64748B; }
        .leg-dot { width: 8px; height: 8px; border-radius: 50%; }

        /* ── SUMMARY TABLE ── */
        .sum-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .sum-table thead th { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #94A3B8; padding: 8px 14px; text-align: left; border-bottom: 2px solid #F1F5F9; }
        .sum-table tbody td { padding: 11px 14px; border-bottom: 1px solid #F8FAFC; }
        .sum-table tbody tr:last-child td { border-bottom: none; font-weight: 700; background: #FAFBFF; }
        .cat-tag { font-size: 10px; font-weight: 600; color: #6366F1; background: #EEF2FF; padding: 3px 10px; border-radius: 100px; }
        .dim-cell { font-weight: 500; color: #0F172A; }
        .puntaje-cell { font-family: 'DM Serif Display', serif; font-size: 15px; font-weight: 700; }

        /* ── IA INFORME ── */
        .ai-tag { display: inline-flex; align-items: center; gap: 7px; background: linear-gradient(135deg,#6366F1,#8B5CF6); color:#fff; font-size:11px; font-weight:700; padding:5px 14px; border-radius:100px; margin-bottom:20px; letter-spacing:0.02em; }
        .ai-dot { width:6px; height:6px; background:#A5F3FC; border-radius:50%; }
        .informe-body h3 { font-family:'DM Serif Display',serif; font-size:18px; color:#0F172A; margin:22px 0 9px; padding-bottom:8px; border-bottom:1px solid #F1F5F9; }
        .informe-body p { font-size:13px; color:#475569; line-height:1.85; margin-bottom:12px; text-align:justify; }
        .informe-body strong { color:#1E293B; font-weight:600; }

        /* ── FOOTER ── */
        .rpt-footer { display:flex; justify-content:space-between; align-items:center; padding:18px 4px 0; font-size:11px; color:#94A3B8; }
        .rpt-footer-lock { display:flex; align-items:center; gap:5px; font-size:10px; font-weight:700; color:#CBD5E1; text-transform:uppercase; letter-spacing:0.06em; }

        /* ── PRINT ── */
        @media print {
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
          body { background: #fff; }
          .print-btn { display: none !important; }
          .wrap { padding: 0; max-width: 100%; }
          .hero { border-radius: 0; background: #0F172A !important; margin-bottom: 0; }
          .hero::before, .hero::after { display: none; }
          .card { border-radius: 0; margin-bottom: 0; border-left: none; border-right: none; border-top: none; }
          .bar-fill, .brand-icon { print-color-adjust: exact !important; }
          @page { margin: 8mm; size: A4; }
        }
      `}</style>

      <button className="print-btn" onClick={() => window.print()}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <polyline points="6 9 6 2 18 2 18 9"/>
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
          <rect x="6" y="14" width="12" height="8"/>
        </svg>
        Imprimir / PDF
      </button>

      <div className="wrap">

        {/* ── HERO ── */}
        <div className="hero">
          <div className="hero-nav">
            <div className="brand">
              <div className="brand-icon">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z" fill="white"/>
                </svg>
              </div>
              <div>
                <div className="brand-name">Aptia</div>
                <div className="brand-sub">Plataforma Psicométrica</div>
              </div>
            </div>
            <div className="hero-right">
              <div className="hero-company">{data.empresa_rrhh_nombre}</div>
              <div className="hero-date">{fecha}</div>
            </div>
          </div>

          <div className="hero-main">
            <div>
              <div className="cand-name">
                {data.nombre} <span>{data.apellido || ''}</span>
              </div>
              <div className="cand-chips">
                {data.puesto && <span className="cand-chip">{data.puesto}</span>}
                {data.empresa_cliente_nombre && <span className="cand-chip">{data.empresa_cliente_nombre}</span>}
                <span className="cand-chip" style={{ color:'rgba(255,255,255,0.4)' }}>{data.email}</span>
              </div>
            </div>
            <div className="score-ring">
              <div className="score-num" style={{ color: nvProm.dot }}>{promedio}%</div>
              <div className="score-lbl" style={{ color: nvProm.dot }}>{nvProm.label}</div>
            </div>
          </div>

          <div className="hero-footer">
            {[
              { label:'Proceso', val: data.proceso_nombre },
              { label:'Evaluado', val: fecha },
              { label:'Pruebas', val: `${Object.keys(porPrueba).length} aplicada(s)` },
              { label:'Promedio', val: `${promedio}% — ${nvProm.label}`, color: nvProm.dot },
            ].map(t => (
              <div key={t.label} className="hf-tag">
                <div className="hf-tag-label">{t.label}</div>
                <div className="hf-tag-val" style={t.color ? { color: t.color } : {}}>{t.val}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── LEVELS ── */}
        <div className="card">
          <p className="levels-intro">
            Este informe refleja los resultados de la evaluación psicométrica del candidato.
            Debe utilizarse como <strong>guía para estructurar la entrevista de selección</strong>, no como
            criterio definitivo sin validación adicional.
          </p>
          <div className="lvl-grid">
            {[
              { rango:'81–100', label:'Alto',            desc:'Alto nivel de desarrollo', color:'#059669', light:'#D1FAE5', border:'#A7F3D0' },
              { rango:'56–80',  label:'Medio',           desc:'Nivel medio de desarrollo', color:'#D97706', light:'#FEF3C7', border:'#FDE68A' },
              { rango:'26–55',  label:'Bajo',            desc:'Bajo nivel de desarrollo', color:'#DC2626', light:'#FEE2E2', border:'#FECACA' },
              { rango:'0–25',   label:'No desarrollada', desc:'Dimensión no desarrollada', color:'#6366F1', light:'#EEF2FF', border:'#C7D2FE' },
            ].map(l => (
              <div key={l.label} className="lvl-item" style={{ background: l.light, borderColor: l.border }}>
                <div className="lvl-range" style={{ color: l.color }}>{l.rango}</div>
                <div className="lvl-name"  style={{ color: l.color }}>{l.label}</div>
                <div className="lvl-desc"  style={{ color: l.color }}>{l.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── RESULTADOS ── */}
        {Object.keys(porPrueba).length > 0 && (
          <div className="card">
            <div className="card-title">Resultados <div className="card-title-line"/></div>
            {Object.entries(porPrueba).map(([nombre, grupo]) => {
              const dims = [...grupo.dims].sort((a, b) => (parseFloat(b.puntaje)||0) - (parseFloat(a.puntaje)||0));
              const prom = dims.length ? dims.reduce((s, r) => s + (parseFloat(r.puntaje)||0), 0) / dims.length : 0;
              const nvP  = getNivel(prom);
              return (
                <div key={nombre} style={{ marginBottom: 28 }}>
                  <div className="prueba-tag-row">
                    <div className="p-tag">{nombre}</div>
                    <div className="p-line"/>
                  </div>
                  {dims.map(r => {
                    const pct = parseFloat(r.puntaje) || 0;
                    const nv  = getNivel(pct);
                    return (
                      <div key={r.codigo} className="bar-row">
                        <div className="bar-name">{r.dimension}</div>
                        <div className="bar-track">
                          <div className="bar-fill" style={{ width:`${pct}%`, background: nv.color }}/>
                        </div>
                        <div className="bar-pct" style={{ color: nv.color }}>{pct.toFixed(1)}%</div>
                        <div className="badge" style={{ color: nv.color, background: nv.light, borderColor: nv.border }}>{nv.label}</div>
                      </div>
                    );
                  })}
                  <div className="bar-row prom">
                    <div className="bar-name b">Promedio</div>
                    <div className="bar-track lg">
                      <div className="bar-fill" style={{ width:`${prom}%`, background: nvP.color }}/>
                    </div>
                    <div className="bar-pct lg" style={{ color: nvP.color }}>{prom.toFixed(1)}%</div>
                    <div className="badge lg" style={{ color: nvP.color, background: nvP.light, borderColor: nvP.border }}>{nvP.label}</div>
                  </div>
                  <div className="legend">
                    {[['#059669','Alto'],['#D97706','Medio'],['#DC2626','Bajo'],['#6366F1','No desarrollada']].map(([c,l]) => (
                      <div key={l} className="leg-item"><div className="leg-dot" style={{ background: c }}/>{l}</div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── CUADRO RESUMEN ── */}
        {Object.keys(porPrueba).length > 0 && (
          <div className="card">
            <div className="card-title">Cuadro General <div className="card-title-line"/></div>
            {Object.entries(porPrueba).map(([nombre, grupo]) => {
              const dims = [...grupo.dims].sort((a, b) => (parseFloat(b.puntaje)||0) - (parseFloat(a.puntaje)||0));
              const prom = dims.length ? dims.reduce((s, r) => s + (parseFloat(r.puntaje)||0), 0) / dims.length : 0;
              const nvP  = getNivel(prom);
              return (
                <div key={nombre} style={{ marginBottom: 24 }}>
                  <div className="prueba-tag-row">
                    <div className="p-tag">{nombre}</div>
                    <div className="p-line"/>
                  </div>
                  <table className="sum-table">
                    <thead>
                      <tr>
                        <th>Categoría</th>
                        <th>Dimensión</th>
                        <th>Puntaje</th>
                        <th>Nivel</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dims.map(r => {
                        const pct = parseFloat(r.puntaje) || 0;
                        const nv  = getNivel(pct);
                        return (
                          <tr key={r.codigo}>
                            <td><span className="cat-tag">{r.prueba_tipo || 'General'}</span></td>
                            <td className="dim-cell">{r.dimension}</td>
                            <td className="puntaje-cell" style={{ color: nv.color }}>{pct.toFixed(2)}</td>
                            <td><span className="badge" style={{ color: nv.color, background: nv.light, borderColor: nv.border }}>{nv.grado}</span></td>
                          </tr>
                        );
                      })}
                      <tr>
                        <td colSpan={2} style={{ color:'#0F172A' }}>Promedio general</td>
                        <td className="puntaje-cell" style={{ color: nvP.color, fontSize:17 }}>{prom.toFixed(2)}</td>
                        <td><span className="badge lg" style={{ color: nvP.color, background: nvP.light, borderColor: nvP.border }}>{nvP.grado}</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        )}

        {/* ── INFORME IA ── */}
        {data.informe && (
          <div className="card">
            <div className="card-title">Análisis e Interpretación <div className="card-title-line"/></div>
            <div className="ai-tag">
              <div className="ai-dot"/>
              Análisis generado por Inteligencia Artificial
            </div>
            <div className="informe-body" dangerouslySetInnerHTML={{ __html: formatInforme(data.informe) }}/>
          </div>
        )}

        {/* ── FOOTER ── */}
        <div className="rpt-footer">
          <span>Aptia · Plataforma Psicométrica · {data.empresa_rrhh_nombre}</span>
          <div className="rpt-footer-lock">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            Documento Confidencial
          </div>
        </div>

      </div>
    </>
  );
}