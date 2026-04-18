import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../services/api';

const DIM_COLORS = {
  O:'#7C3AED', C:'#059669', E:'#D97706', A:'#DC2626', N:'#6366F1',
  D:'#F97316', I:'#2563EB', S:'#059669', default:'#2563EB',
  V:'#0891B2', N2:'#7C3AED', LID:'#2563EB', EQ:'#059669',
  COM:'#D97706', RES:'#DC2626', ORI:'#0891B2',
  SAT:'#2563EB', BIE:'#059669', COMP:'#7C3AED',
};

function getNivel(pct) {
  if (pct >= 80) return { label: 'Muy alto', color: '#059669' };
  if (pct >= 60) return { label: 'Alto',     color: '#2563EB' };
  if (pct >= 40) return { label: 'Moderado', color: '#D97706' };
  if (pct >= 20) return { label: 'Bajo',     color: '#EA580C' };
  return              { label: 'Muy bajo',   color: '#DC2626' };
}

function formatInforme(text) {
  if (!text) return '';
  return text
    .split('\n\n')
    .map(p => {
      if (p.startsWith('### '))
        return `<h3>${p.slice(4)}</h3>`;
      const html = p
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>');
      return html.trim() ? `<p>${html}</p>` : '';
    })
    .join('');
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
    if (data) {
      document.title = `Informe — ${data.nombre} ${data.apellido || ''}`;
    }
  }, [data]);

  if (error) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',fontFamily:'sans-serif'}}>
      <p style={{color:'#DC2626'}}>{error}</p>
    </div>
  );

  if (!data) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',fontFamily:'sans-serif'}}>
      <p style={{color:'#94A3B8'}}>Generando reporte...</p>
    </div>
  );

  const resultados = data.resultados || [];
  const fecha = data.fecha_completado
    ? new Date(data.fecha_completado).toLocaleDateString('es-DO', {year:'numeric',month:'long',day:'numeric'})
    : new Date().toLocaleDateString('es-DO', {year:'numeric',month:'long',day:'numeric'});

  // Agrupar resultados por prueba
  const porPrueba = {};
  resultados.forEach(r => {
    if (!porPrueba[r.prueba_nombre]) porPrueba[r.prueba_nombre] = [];
    porPrueba[r.prueba_nombre].push(r);
  });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', sans-serif; background: #F8FAFC; }

        .pdf-wrap {
          max-width: 800px;
          margin: 0 auto;
          padding: 24px;
        }

        /* Botón imprimir */
        .print-btn {
          position: fixed;
          top: 20px; right: 20px;
          background: #2563EB;
          color: #fff;
          border: none;
          border-radius: 10px;
          padding: 10px 20px;
          font-size: 14px;
          font-weight: 600;
          font-family: 'Inter', sans-serif;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 4px 14px rgba(37,99,235,0.35);
          z-index: 100;
          transition: all 0.15s;
        }
        .print-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(37,99,235,0.4); }

        /* Página */
        .page {
          background: #fff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 24px rgba(0,0,0,0.08);
          margin-bottom: 20px;
        }

        /* Header */
        .header {
          background: linear-gradient(135deg, #1E40AF 0%, #2563EB 60%, #3B82F6 100%);
          padding: 32px 40px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .header-brand {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .header-logo {
          width: 36px; height: 36px;
          background: rgba(255,255,255,0.2);
          border-radius: 9px;
          display: flex; align-items: center; justify-content: center;
        }
        .header-name {
          font-size: 18px;
          font-weight: 800;
          color: #fff;
          letter-spacing: -0.3px;
        }
        .header-title {
          font-size: 12px;
          color: rgba(255,255,255,0.6);
          font-weight: 500;
          margin-top: 2px;
        }
        .header-date {
          text-align: right;
          color: rgba(255,255,255,0.6);
          font-size: 12px;
        }

        /* Candidato info */
        .candidate-section {
          padding: 32px 40px;
          border-bottom: 1px solid #F1F5F9;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }
        .candidate-main h1 {
          font-size: 26px;
          font-weight: 800;
          color: #0F172A;
          letter-spacing: -0.5px;
          margin-bottom: 4px;
        }
        .candidate-main p {
          font-size: 14px;
          color: #64748B;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .info-item label {
          display: block;
          font-size: 10px;
          font-weight: 700;
          color: #94A3B8;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 3px;
        }
        .info-item p {
          font-size: 13px;
          font-weight: 600;
          color: #334155;
        }

        /* Status badge */
        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: #D1FAE5;
          color: #065F46;
          font-size: 12px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 100px;
          margin-top: 8px;
        }

        /* Resultados */
        .results-section {
          padding: 32px 40px;
          border-bottom: 1px solid #F1F5F9;
        }
        .section-title {
          font-size: 13px;
          font-weight: 800;
          color: #0F172A;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .section-title::after {
          content: '';
          flex: 1;
          height: 1px;
          background: #F1F5F9;
        }

        .prueba-group { margin-bottom: 24px; }
        .prueba-label {
          font-size: 12px;
          font-weight: 700;
          color: #64748B;
          margin-bottom: 14px;
          padding: 4px 10px;
          background: #F8FAFC;
          border-radius: 6px;
          display: inline-block;
        }

        .dim-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }
        .dim-name {
          font-size: 13px;
          font-weight: 600;
          color: #374151;
          width: 160px;
          flex-shrink: 0;
        }
        .dim-bar-wrap {
          flex: 1;
          height: 8px;
          background: #F1F5F9;
          border-radius: 100px;
          overflow: hidden;
        }
        .dim-bar {
          height: 100%;
          border-radius: 100px;
          transition: width 0.3s;
        }
        .dim-pct {
          font-size: 13px;
          font-weight: 700;
          width: 40px;
          text-align: right;
          flex-shrink: 0;
        }
        .dim-nivel {
          font-size: 11px;
          font-weight: 600;
          width: 64px;
          text-align: right;
          flex-shrink: 0;
        }

        /* Informe IA */
        .informe-section {
          padding: 32px 40px;
        }
        .informe-body h3 {
          font-size: 14px;
          font-weight: 700;
          color: #0F172A;
          margin: 20px 0 8px;
          padding-left: 10px;
          border-left: 3px solid #2563EB;
        }
        .informe-body p {
          font-size: 13px;
          color: #475569;
          line-height: 1.8;
          margin-bottom: 10px;
        }
        .informe-body strong { color: #334155; }

        /* Footer */
        .footer {
          background: #F8FAFC;
          border-top: 1px solid #E2E8F0;
          padding: 16px 40px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .footer p {
          font-size: 11px;
          color: #94A3B8;
        }
        .footer-confidential {
          font-size: 11px;
          color: #CBD5E1;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        /* Print styles */
        @media print {
          body { background: #fff; }
          .print-btn { display: none !important; }
          .pdf-wrap { padding: 0; max-width: 100%; }
          .page {
            border-radius: 0;
            box-shadow: none;
            margin: 0;
            page-break-after: avoid;
          }
          .informe-section { page-break-before: auto; }
          @page { margin: 15mm; size: A4; }
        }
      `}</style>

      {/* Botón imprimir */}
      <button className="print-btn" onClick={() => window.print()}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <polyline points="6 9 6 2 18 2 18 9"/>
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
          <rect x="6" y="14" width="12" height="8"/>
        </svg>
        Descargar PDF
      </button>

      <div className="pdf-wrap">
        <div className="page">

          {/* Header */}
          <div className="header">
            <div>
              <div className="header-brand">
                <div className="header-logo">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z" fill="white"/>
                  </svg>
                </div>
                <div>
                  <div className="header-name">Aptia</div>
                  <div className="header-title">Informe Psicométrico</div>
                </div>
              </div>
            </div>
            <div className="header-date">
              <p style={{color:'rgba(255,255,255,0.9)',fontWeight:600,marginBottom:2}}>{data.empresa_rrhh_nombre}</p>
              <p>Generado el {fecha}</p>
            </div>
          </div>

          {/* Candidato */}
          <div className="candidate-section">
            <div className="candidate-main">
              <h1>{data.nombre} {data.apellido || ''}</h1>
              <p>{data.email}</p>
              <div className="status-badge">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
                Evaluación completada
              </div>
            </div>
            <div className="info-grid">
              <div className="info-item">
                <label>Empresa cliente</label>
                <p>{data.empresa_cliente_nombre}</p>
              </div>
              <div className="info-item">
                <label>Proceso</label>
                <p>{data.proceso_nombre}</p>
              </div>
              <div className="info-item">
                <label>Puesto</label>
                <p>{data.puesto || '—'}</p>
              </div>
              <div className="info-item">
                <label>Fecha de evaluación</label>
                <p>{fecha}</p>
              </div>
            </div>
          </div>

          {/* Resultados */}
          {Object.keys(porPrueba).length > 0 && (
            <div className="results-section">
              <div className="section-title">Resultados por dimensión</div>
              {Object.entries(porPrueba).map(([prueba, dims]) => (
                <div key={prueba} className="prueba-group">
                  <span className="prueba-label">{prueba}</span>
                  {dims.sort((a,b) => (b.puntaje||0)-(a.puntaje||0)).map(r => {
                    const pct = parseFloat(r.puntaje) || 0;
                    const color = DIM_COLORS[r.codigo] || DIM_COLORS.default;
                    const nivel = getNivel(pct);
                    return (
                      <div key={r.codigo} className="dim-row">
                        <span className="dim-name">{r.dimension}</span>
                        <div className="dim-bar-wrap">
                          <div className="dim-bar" style={{width:`${pct}%`, background: color}}/>
                        </div>
                        <span className="dim-pct" style={{color}}>{pct}%</span>
                        <span className="dim-nivel" style={{color: nivel.color}}>{nivel.label}</span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}

          {/* Informe IA */}
          {data.informe && (
            <div className="informe-section">
              <div className="section-title">Análisis psicológico — Generado por IA</div>
              <div
                className="informe-body"
                dangerouslySetInnerHTML={{ __html: formatInforme(data.informe) }}
              />
            </div>
          )}

          {/* Footer */}
          <div className="footer">
            <p>Aptia · Plataforma Psicométrica · {data.empresa_rrhh_nombre}</p>
            <span className="footer-confidential">🔒 Confidencial</span>
          </div>

        </div>
      </div>
    </>
  );
}
