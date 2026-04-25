import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Download, Search, X } from 'lucide-react';
import api from '../../services/api';
import PageHeader from '../../components/ui/PageHeader';

const DIM_COLOR = { O:'#7C3AED', C:'#059669', E:'#D97706', A:'#DC2626', N:'#7C3AED', default:'#2563EB' };
const DIM_BG    = { O:'#EDE9FE', C:'#D1FAE5', E:'#FEF3C7', A:'#FEE2E2', N:'#EDE9FE', default:'#DBEAFE' };

function formatInforme(text) {
  if (!text) return '';
  return text.split('\n\n').map(p => {
    if (p.startsWith('### ')) return `<h3 style="font-size:15px;font-weight:700;color:#0F172A;margin:20px 0 8px">${p.slice(4)}</h3>`;
    const html = p.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\*(.+?)\*/g,'<em>$1</em>');
    return html.trim()?`<p style="color:#475569;line-height:1.8;margin-bottom:12px">${html}</p>`:'';
  }).join('');
}

// Abre el nuevo ReportePDF en una pestaña aparte
function generarPDF(c) {
  window.open(`/rrhh/reporte/${c.id}`, '_blank');
}

function ModalDetalle({ candidato: c, onClose }) {
  const resultados = c.resultados || [];
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div>
            <h3 className="text-base font-bold text-slate-900">{c.nombre} {c.apellido}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{c.proceso_nombre} · {c.puesto||'Sin puesto'}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={()=>generarPDF(c)} className="btn-primary py-2 px-4 text-xs">
              <Download className="w-3.5 h-3.5"/> Descargar PDF
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg"><X className="w-4 h-4 text-slate-400"/></button>
          </div>
        </div>
        <div className="p-6">
          <div className="bg-slate-50 rounded-xl p-4 mb-6 grid grid-cols-2 gap-4 text-sm">
            <div><p className="text-xs text-slate-400 mb-0.5">Email</p><p className="font-medium text-slate-800">{c.email}</p></div>
            <div><p className="text-xs text-slate-400 mb-0.5">Completado</p><p className="font-medium text-slate-800">{new Date(c.fecha_completado).toLocaleDateString('es-DO',{year:'numeric',month:'long',day:'numeric'})}</p></div>
          </div>

          {resultados.length>0&&(
            <div className="mb-6">
              <h4 className="text-sm font-bold text-slate-800 mb-4">Resultados por dimensión</h4>
              <div className="space-y-4">
                {resultados.map(r=>{
                  const color=DIM_COLOR[r.codigo]||DIM_COLOR.default;
                  const bg=DIM_BG[r.codigo]||DIM_BG.default;
                  const pct=parseFloat(r.puntaje_pct)||0;
                  return (
                    <div key={r.codigo}>
                      <div className="flex justify-between items-center mb-1.5">
                        <div className="flex items-center gap-2">
                          <span style={{background:bg,color}} className="text-xs font-bold px-2 py-0.5 rounded-full">{r.codigo}</span>
                          <span className="text-sm font-semibold text-slate-700">{r.dimension}</span>
                          <span className="text-xs text-slate-400 capitalize">{r.nivel?.replace('_',' ')}</span>
                        </div>
                        <span className="text-sm font-bold" style={{color}}>{pct}%</span>
                      </div>
                      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{width:`${pct}%`,background:color}}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {c.informe&&(
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-brand-600"/>
                <h4 className="text-sm font-bold text-brand-800">Análisis psicológico — IA</h4>
              </div>
              <div
                className="text-sm leading-relaxed [&_h3]:text-sm [&_h3]:font-bold [&_h3]:text-slate-900 [&_h3]:mt-4 [&_h3]:mb-2 [&_p]:text-slate-600 [&_p]:leading-relaxed [&_p]:mb-3 [&_strong]:text-slate-800"
                dangerouslySetInnerHTML={{__html:formatInforme(c.informe)}}
              />
            </div>
          )}

          {!c.informe&&resultados.length===0&&(
            <p className="text-slate-400 text-sm text-center py-8">No hay resultados disponibles.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Reportes({ endpoint='/empresa/reportes', showEmpresa=false }) {
  const [busqueda, setBusqueda] = useState('');
  const [detalle,  setDetalle]  = useState(null);

  const { data: reportes=[], isLoading } = useQuery({
    queryKey: ['reportes', endpoint],
    queryFn: ()=>api.get(endpoint).then(r=>r.data),
  });

  const filtrados = reportes.filter(r => {
    const q = busqueda.toLowerCase();
    return !q ||
      r.nombre?.toLowerCase().includes(q) ||
      r.apellido?.toLowerCase().includes(q) ||
      r.email?.toLowerCase().includes(q) ||
      r.proceso_nombre?.toLowerCase().includes(q) ||
      r.empresa_cliente_nombre?.toLowerCase().includes(q);
  });

  return (
    <div className="p-8">
      <PageHeader title="Reportes" subtitle="Resultados e informes psicométricos de candidatos completados"/>

      <div className="relative mb-6 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
        <input type="text" placeholder="Buscar candidato, proceso..." value={busqueda} onChange={e=>setBusqueda(e.target.value)} className="input pl-9"/>
      </div>

      {isLoading ? <p className="text-slate-400 text-sm">Cargando reportes...</p> :
      filtrados.length===0 ? (
        <div className="card p-12 text-center">
          <FileText className="w-10 h-10 text-slate-200 mx-auto mb-3"/>
          <p className="text-slate-400 text-sm">{reportes.length===0?'No hay candidatos que hayan completado una evaluación aún.':'No se encontraron resultados.'}</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {['Candidato', ...(showEmpresa?['Empresa']:[]), 'Proceso', 'Dimensiones', 'Fecha', ''].map(h=>(
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map(r=>{
                const resultados = r.resultados||[];
                return (
                  <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                          {r.nombre?.[0]}{r.apellido?.[0]||''}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{r.nombre} {r.apellido}</p>
                          <p className="text-xs text-slate-400">{r.email}</p>
                        </div>
                      </div>
                    </td>
                    {showEmpresa&&<td className="px-5 py-4 text-slate-600 text-xs">{r.empresa_cliente_nombre}</td>}
                    <td className="px-5 py-4">
                      <p className="text-slate-700 font-medium">{r.proceso_nombre}</p>
                      <p className="text-xs text-slate-400">{r.puesto||'—'}</p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1">
                        {resultados.slice(0,5).map(res=>{
                          const color=DIM_COLOR[res.codigo]||DIM_COLOR.default;
                          const bg=DIM_BG[res.codigo]||DIM_BG.default;
                          const pct=parseFloat(res.puntaje_pct)||0;
                          return <span key={res.codigo} style={{background:bg,color}} className="text-xs font-bold px-2 py-0.5 rounded-full">{res.codigo} {pct}%</span>;
                        })}
                        {resultados.length===0&&<span className="text-xs text-slate-400">Sin resultados</span>}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-500 text-xs">
                      {r.fecha_completado?new Date(r.fecha_completado).toLocaleDateString('es-DO'):'—'}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button onClick={()=>setDetalle(r)} className="btn-secondary py-1.5 px-3 text-xs">Ver informe</button>
                        <button onClick={()=>generarPDF(r)} title="Ver reporte completo" className="p-1.5 text-brand-600 hover:bg-brand-50 rounded-lg transition-colors">
                          <Download className="w-4 h-4"/>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {detalle&&<ModalDetalle candidato={detalle} onClose={()=>setDetalle(null)}/>}
    </div>
  );
}