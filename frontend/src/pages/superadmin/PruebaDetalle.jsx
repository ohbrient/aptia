import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Plus, X, Trash2, Upload, Download,
  ChevronDown, ChevronRight, ClipboardList, Layers, Pencil, Eye, Clock
} from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../../services/api';

const OPCIONES_LIKERT5 = [
  { texto:'Muy en desacuerdo', valor:1, orden:1 },
  { texto:'En desacuerdo',     valor:2, orden:2 },
  { texto:'Neutral',           valor:3, orden:3 },
  { texto:'De acuerdo',        valor:4, orden:4 },
  { texto:'Muy de acuerdo',    valor:5, orden:5 },
];

// ── Modal nueva dimensión ─────────────────────────────────────
function ModalDimension({ pruebaId, onClose, onSave }) {
  const [form, setForm] = useState({ nombre:'', codigo:'', descripcion:'', orden:0 });
  const [error, setError] = useState('');
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const mut = useMutation({
    mutationFn: d=>api.post(`/superadmin/pruebas/${pruebaId}/dimensiones`, d),
    onSuccess: ()=>{ onSave(); onClose(); },
    onError: err=>setError(err.response?.data?.error||'Error'),
  });
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-base font-bold">Nueva dimensión</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg"><X className="w-4 h-4 text-slate-400"/></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Nombre *</label>
              <input type="text" value={form.nombre} onChange={e=>set('nombre',e.target.value)} placeholder="Ej: Apertura" className="input"/>
            </div>
            <div><label className="label">Código *</label>
              <input type="text" value={form.codigo} onChange={e=>set('codigo',e.target.value.toUpperCase())} placeholder="Ej: O" maxLength={10} className="input"/>
            </div>
          </div>
          <div><label className="label">Descripción</label>
            <input type="text" value={form.descripcion} onChange={e=>set('descripcion',e.target.value)} placeholder="Breve descripción" className="input"/>
          </div>
          <div><label className="label">Orden</label>
            <input type="number" min="0" value={form.orden} onChange={e=>set('orden',e.target.value)} className="input"/>
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg">{error}</p>}
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end">
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button onClick={()=>mut.mutate(form)} disabled={mut.isPending||!form.nombre||!form.codigo} className="btn-primary">
            {mut.isPending?'Guardando...':'Crear dimensión'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal nuevo ítem manual ───────────────────────────────────
function ModalItem({ pruebaId, dimensiones, escala, totalItems, onClose, onSave }) {
  const [texto, setTexto] = useState('');
  const [dimId, setDimId] = useState('');
  const [error, setError] = useState('');

  // Opciones por defecto según escala
  const opcionesDefault = escala === 'likert5' ? OPCIONES_LIKERT5
    : escala === 'likert7' ? [
        {texto:'Totalmente en desacuerdo',valor:1,orden:1},{texto:'En desacuerdo',valor:2,orden:2},
        {texto:'Algo en desacuerdo',valor:3,orden:3},{texto:'Neutral',valor:4,orden:4},
        {texto:'Algo de acuerdo',valor:5,orden:5},{texto:'De acuerdo',valor:6,orden:6},
        {texto:'Totalmente de acuerdo',valor:7,orden:7},
      ]
    : escala === 'dicotomica' ? [{texto:'Sí',valor:1,orden:1},{texto:'No',valor:0,orden:2}]
    : [];

  const mut = useMutation({
    mutationFn: d=>api.post(`/superadmin/pruebas/${pruebaId}/items`, d),
    onSuccess: ()=>{ onSave(); onClose(); },
    onError: err=>setError(err.response?.data?.error||'Error'),
  });

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-base font-bold">Nuevo ítem</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg"><X className="w-4 h-4 text-slate-400"/></button>
        </div>
        <div className="p-6 space-y-4">
          <div><label className="label">Texto del ítem *</label>
            <textarea value={texto} onChange={e=>setTexto(e.target.value)} rows={3}
              placeholder="Ej: Disfruto explorar nuevas ideas y conceptos."
              className="input resize-none"/>
          </div>
          {dimensiones.length > 0 && (
            <div><label className="label">Dimensión <span className="text-slate-400 font-normal">(opcional)</span></label>
              <select value={dimId} onChange={e=>setDimId(e.target.value)} className="input">
                <option value="">Sin dimensión</option>
                {dimensiones.map(d=><option key={d.id} value={d.id}>{d.nombre} ({d.codigo})</option>)}
              </select>
            </div>
          )}
          {/* Preview de opciones */}
          {opcionesDefault.length > 0 && (
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Opciones de respuesta ({escala})</p>
              <div className="flex flex-wrap gap-2">
                {opcionesDefault.map(o=>(
                  <span key={o.orden} className="text-xs bg-white border border-slate-200 px-2 py-1 rounded-lg text-slate-600">
                    {o.valor}. {o.texto}
                  </span>
                ))}
              </div>
            </div>
          )}
          {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg">{error}</p>}
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end">
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button
            onClick={()=>mut.mutate({ texto, dimension_id:dimId||null, orden:totalItems+1, opciones:opcionesDefault })}
            disabled={mut.isPending||!texto.trim()}
            className="btn-primary"
          >
            {mut.isPending?'Guardando...':'Agregar ítem'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal editar ítem ────────────────────────────────────────
function ModalEditarItem({ item, dimensiones, onClose, onSave }) {
  const [texto,  setTexto]  = useState(item.texto || '');
  const [dimId,  setDimId]  = useState(item.dimension_id || '');
  const [orden,  setOrden]  = useState(item.orden || 0);
  const [opciones, setOpciones] = useState(
    item.opciones?.map(o => ({ ...o })) || []
  );
  const [error, setError] = useState('');

  const mut = useMutation({
    mutationFn: d => api.put(`/superadmin/items/${item.id}`, d),
    onSuccess: () => { onSave(); onClose(); },
    onError: err => setError(err.response?.data?.error || 'Error al guardar'),
  });

  const setOpcion = (i, k, v) => setOpciones(ops => ops.map((o, idx) => idx === i ? { ...o, [k]: v } : o));

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">Editar ítem #{item.orden}</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg"><X className="w-4 h-4 text-slate-400"/></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="label">Texto del ítem *</label>
            <textarea value={texto} onChange={e => setTexto(e.target.value)} rows={3} className="input resize-none" placeholder="Escribe la pregunta o afirmación..."/>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Dimensión</label>
              <select value={dimId} onChange={e => setDimId(e.target.value)} className="input">
                <option value="">Sin dimensión</option>
                {dimensiones.map(d => <option key={d.id} value={d.id}>{d.codigo} — {d.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Orden</label>
              <input type="number" min="1" value={orden} onChange={e => setOrden(e.target.value)} className="input"/>
            </div>
          </div>

          {/* Opciones editables */}
          {opciones.length > 0 && (
            <div>
              <label className="label">Opciones de respuesta</label>
              <div className="space-y-2">
                {opciones.map((op, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 w-5">{op.valor}.</span>
                    <input
                      type="text"
                      value={op.texto}
                      onChange={e => setOpcion(i, 'texto', e.target.value)}
                      className="input flex-1 py-1.5 text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg">{error}</p>}
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end">
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button
            onClick={() => mut.mutate({ texto, dimension_id: dimId || null, orden, opciones })}
            disabled={mut.isPending || !texto.trim()}
            className="btn-primary"
          >
            {mut.isPending ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal carga Excel ─────────────────────────────────────────
function ModalExcel({ pruebaId, dimensiones, onClose, onSave }) {
  const [preview,   setPreview]   = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [resultado, setResultado] = useState(null);
  const fileRef = useRef();

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setError('');
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb   = XLSX.read(ev.target.result, { type:'binary' });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { defval:'' });

        // Mapear columnas: texto, dimension, opcion1..opcionN, valor1..valorN
        const items = data.map((row, idx) => {
          const texto = row['texto'] || row['Texto'] || row['pregunta'] || row['Pregunta'] || '';
          const dim   = row['dimension'] || row['Dimension'] || row['codigo'] || '';
          // Opciones: buscar columnas opcion1, opcion2... y valor1, valor2...
          const opciones = [];
          for (let i = 1; i <= 10; i++) {
            const t = row[`opcion${i}`] || row[`Opcion${i}`] || row[`opción${i}`] || '';
            const v = row[`valor${i}`]  || row[`Valor${i}`]  || i;
            if (t) opciones.push({ texto:t, valor:parseFloat(v)||i, orden:i });
          }
          return { texto: texto.toString().trim(), dimension_codigo: dim.toString().trim().toUpperCase(), orden: idx+1, opciones };
        }).filter(it => it.texto);

        setPreview(items);
      } catch {
        setError('Error al leer el archivo. Verifica que sea .xlsx o .xls');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleUpload = async () => {
    setLoading(true);
    try {
      const res = await api.post(`/superadmin/pruebas/${pruebaId}/items/bulk`, { items: preview });
      setResultado(res.data.insertados);
      onSave();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cargar ítems');
    } finally {
      setLoading(false);
    }
  };

  // Descargar plantilla Excel
  const descargarPlantilla = () => {
    const dimCodigos = dimensiones.map(d=>d.codigo).join(', ') || 'O, C, E, A, N';
    const plantilla = [
      { texto:'Ejemplo: Disfruto explorar nuevas ideas.', dimension: dimensiones[0]?.codigo||'O', opcion1:'Muy en desacuerdo', valor1:1, opcion2:'En desacuerdo', valor2:2, opcion3:'Neutral', valor3:3, opcion4:'De acuerdo', valor4:4, opcion5:'Muy de acuerdo', valor5:5 },
      { texto:'Ejemplo: Soy una persona organizada.', dimension: dimensiones[1]?.codigo||'C', opcion1:'Muy en desacuerdo', valor1:1, opcion2:'En desacuerdo', valor2:2, opcion3:'Neutral', valor3:3, opcion4:'De acuerdo', valor4:4, opcion5:'Muy de acuerdo', valor5:5 },
    ];
    const ws  = XLSX.utils.json_to_sheet(plantilla);
    const wb  = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Items');
    XLSX.writeFile(wb, 'plantilla_items_aptia.xlsx');
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-base font-bold">Carga masiva desde Excel</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg"><X className="w-4 h-4 text-slate-400"/></button>
        </div>

        <div className="p-6">
          {resultado !== null ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <ClipboardList className="w-8 h-8 text-emerald-600"/>
              </div>
              <h4 className="text-lg font-bold text-slate-900 mb-2">¡Carga exitosa!</h4>
              <p className="text-slate-500">{resultado} ítems insertados correctamente.</p>
              <button onClick={onClose} className="btn-primary mx-auto mt-6">Cerrar</button>
            </div>
          ) : (
            <>
              {/* Instrucciones */}
              <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 mb-6">
                <p className="text-sm font-semibold text-brand-800 mb-2">Formato del archivo Excel:</p>
                <ul className="text-xs text-brand-700 space-y-1 list-disc list-inside">
                  <li><strong>texto</strong> — Texto de la pregunta (obligatorio)</li>
                  <li><strong>dimension</strong> — Código de la dimensión (ej: {dimensiones.map(d=>d.codigo).join(', ')||'O, C, E'})</li>
                  <li><strong>opcion1, opcion2...</strong> — Texto de cada opción de respuesta</li>
                  <li><strong>valor1, valor2...</strong> — Valor numérico de cada opción</li>
                </ul>
                <button onClick={descargarPlantilla} className="btn-secondary mt-3 text-xs py-1.5 px-3">
                  <Download className="w-3 h-3"/> Descargar plantilla
                </button>
              </div>

              {/* Upload */}
              <div
                onClick={()=>fileRef.current.click()}
                className="border-2 border-dashed border-slate-300 hover:border-brand-400 rounded-xl p-8 text-center cursor-pointer transition-colors mb-4"
              >
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2"/>
                <p className="text-sm font-semibold text-slate-700">Haz clic para seleccionar archivo</p>
                <p className="text-xs text-slate-400 mt-1">Formatos: .xlsx, .xls</p>
                <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile}/>
              </div>

              {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg mb-4">{error}</p>}

              {/* Preview */}
              {preview.length > 0 && (
                <div>
                  <p className="text-sm font-bold text-slate-800 mb-3">
                    Vista previa — {preview.length} ítem(s) detectados
                  </p>
                  <div className="border border-slate-200 rounded-xl overflow-hidden mb-4 max-h-64 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 sticky top-0">
                        <tr>
                          <th className="text-left px-4 py-2 font-semibold text-slate-500">#</th>
                          <th className="text-left px-4 py-2 font-semibold text-slate-500">Texto</th>
                          <th className="text-left px-4 py-2 font-semibold text-slate-500">Dim.</th>
                          <th className="text-left px-4 py-2 font-semibold text-slate-500">Opciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.map((it, i)=>(
                          <tr key={i} className="border-t border-slate-100">
                            <td className="px-4 py-2 text-slate-400">{i+1}</td>
                            <td className="px-4 py-2 text-slate-700 max-w-xs truncate">{it.texto}</td>
                            <td className="px-4 py-2">
                              {it.dimension_codigo
                                ? <span className="badge-blue">{it.dimension_codigo}</span>
                                : <span className="text-slate-300">—</span>}
                            </td>
                            <td className="px-4 py-2 text-slate-500">{it.opciones.length} opc.</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex gap-3 justify-end">
                    <button onClick={()=>setPreview([])} className="btn-secondary">Limpiar</button>
                    <button onClick={handleUpload} disabled={loading} className="btn-primary">
                      {loading ? 'Cargando...' : `Importar ${preview.length} ítems`}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Página principal ─────────────────────────────────────────
export default function PruebaDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [modalDim,     setModalDim]     = useState(false);
  const [editTiempo,   setEditTiempo]   = useState(false);
  const [nuevoTiempo,  setNuevoTiempo]  = useState('');
  const [modalItem,    setModalItem]    = useState(false);
  const [modalExcel,   setModalExcel]   = useState(false);
  const [editandoItem, setEditandoItem] = useState(null);
  const [tabActivo,  setTabActivo]  = useState('items');
  const [expandido,  setExpandido]  = useState({});

  const { data: prueba } = useQuery({
    queryKey: ['prueba-detalle', id],
    queryFn: ()=>api.get(`/superadmin/pruebas`).then(r=>r.data.find(p=>p.id===id)),
  });

  const { data: dimensiones=[] } = useQuery({
    queryKey: ['prueba-dims', id],
    queryFn: ()=>api.get(`/superadmin/pruebas/${id}/dimensiones`).then(r=>r.data),
  });

  const { data: items=[] } = useQuery({
    queryKey: ['prueba-items', id],
    queryFn: ()=>api.get(`/superadmin/pruebas/${id}/items`).then(r=>r.data),
  });

  const eliminarItem = useMutation({
    mutationFn: itemId=>api.delete(`/superadmin/items/${itemId}`),
    onSuccess: ()=>qc.invalidateQueries(['prueba-items', id]),
  });

  const eliminarDim = useMutation({
    mutationFn: dimId=>api.delete(`/superadmin/dimensiones/${dimId}`),
    onSuccess: ()=>qc.invalidateQueries(['prueba-dims', id]),
  });

  const actualizarTiempo = useMutation({
    mutationFn: t => api.put(`/superadmin/pruebas/${id}`, { tiempo_limite: t || null }),
    onSuccess: () => { invalidar(); setEditTiempo(false); },
  });

  const invalidar = () => {
    qc.invalidateQueries(['prueba-items', id]);
    qc.invalidateQueries(['prueba-dims', id]);
    qc.invalidateQueries(['superadmin-pruebas']);
  };

  const toggleExpand = (itemId) => setExpandido(e=>({...e,[itemId]:!e[itemId]}));

  // Agrupar ítems por dimensión
  const itemsPorDim = {};
  items.forEach(it => {
    const key = it.dimension_codigo || 'sin_dimension';
    if (!itemsPorDim[key]) itemsPorDim[key] = [];
    itemsPorDim[key].push(it);
  });

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={()=>navigate('/superadmin/pruebas')} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
          <ArrowLeft className="w-4 h-4 text-slate-600"/>
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">{prueba?.nombre || 'Cargando...'}</h1>
          <div className="flex items-center gap-3 flex-wrap">
            <p className="text-sm text-slate-500">{prueba?.tipo} · {items.length} ítems · {dimensiones.length} dimensiones</p>
            {editTiempo ? (
              <div className="flex items-center gap-2" onClick={e=>e.stopPropagation()}>
                <input
                  type="number" min="1" max="180"
                  value={nuevoTiempo}
                  onChange={e=>setNuevoTiempo(e.target.value)}
                  placeholder="min"
                  className="input py-1 px-2 text-xs w-20"
                  autoFocus
                />
                <span className="text-xs text-slate-400">min</span>
                <button
                  onClick={()=>actualizarTiempo.mutate(nuevoTiempo)}
                  disabled={actualizarTiempo.isPending}
                  className="text-xs bg-brand-600 text-white px-2 py-1 rounded-lg font-semibold"
                >
                  {actualizarTiempo.isPending?'...':'Guardar'}
                </button>
                <button onClick={()=>setEditTiempo(false)} className="text-xs text-slate-400 hover:text-slate-600">✕</button>
              </div>
            ) : (
              <button
                onClick={()=>{ setNuevoTiempo(prueba?.tiempo_limite||''); setEditTiempo(true); }}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-brand-600 bg-slate-100 hover:bg-brand-50 px-2 py-1 rounded-lg transition-all"
              >
                <Clock className="w-3 h-3"/>
                {prueba?.tiempo_limite ? `${prueba.tiempo_limite} min` : 'Sin límite'} · Editar
              </button>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={()=>window.open(`/preview/${id}`, '_blank')}
            className="btn-secondary"
          >
            <Eye className="w-4 h-4"/> Vista previa
          </button>
          <button onClick={()=>setModalExcel(true)} className="btn-secondary">
            <Upload className="w-4 h-4"/> Cargar Excel
          </button>
          <button onClick={()=>setModalItem(true)} className="btn-primary">
            <Plus className="w-4 h-4"/> Nuevo ítem
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-6 w-fit">
        {[['items','Ítems'],['dimensiones','Dimensiones']].map(([k,l])=>(
          <button key={k} onClick={()=>setTabActivo(k)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${tabActivo===k?'bg-white text-brand-600 shadow-sm':'text-slate-500 hover:text-slate-700'}`}>
            {l} {k==='items'?`(${items.length})`:`(${dimensiones.length})`}
          </button>
        ))}
      </div>

      {/* Tab: Dimensiones */}
      {tabActivo==='dimensiones' && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={()=>setModalDim(true)} className="btn-primary"><Plus className="w-4 h-4"/> Nueva dimensión</button>
          </div>
          {dimensiones.length===0 ? (
            <div className="card p-12 text-center">
              <Layers className="w-10 h-10 text-slate-200 mx-auto mb-3"/>
              <p className="text-slate-400 text-sm">No hay dimensiones definidas</p>
              <p className="text-xs text-slate-300 mt-1">Las dimensiones agrupan los ítems (ej. O, C, E, A, N en Big Five)</p>
              <button onClick={()=>setModalDim(true)} className="btn-primary mx-auto mt-4"><Plus className="w-4 h-4"/> Crear dimensión</button>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-slate-100 bg-slate-50">
                  {['Código','Nombre','Descripción','Ítems',''].map(h=>(
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {dimensiones.map(d=>(
                    <tr key={d.id} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="px-5 py-4"><span className="badge-blue font-mono">{d.codigo}</span></td>
                      <td className="px-5 py-4 font-semibold text-slate-800">{d.nombre}</td>
                      <td className="px-5 py-4 text-slate-500 text-xs">{d.descripcion||'—'}</td>
                      <td className="px-5 py-4 text-slate-600">{items.filter(i=>i.dimension_codigo===d.codigo).length}</td>
                      <td className="px-5 py-4">
                        <button onClick={()=>eliminarDim.mutate(d.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg">
                          <Trash2 className="w-4 h-4"/>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: Ítems */}
      {tabActivo==='items' && (
        <div>
          {items.length===0 ? (
            <div className="card p-12 text-center">
              <ClipboardList className="w-10 h-10 text-slate-200 mx-auto mb-3"/>
              <p className="text-slate-400 text-sm">No hay ítems en esta prueba</p>
              <div className="flex gap-3 justify-center mt-4">
                <button onClick={()=>setModalExcel(true)} className="btn-secondary"><Upload className="w-4 h-4"/> Cargar Excel</button>
                <button onClick={()=>setModalItem(true)}  className="btn-primary"><Plus className="w-4 h-4"/> Agregar ítem</button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(itemsPorDim).map(([dimCodigo, dimItems])=>(
                <div key={dimCodigo} className="card overflow-hidden">
                  <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                    {dimCodigo !== 'sin_dimension'
                      ? <span className="badge-blue font-mono text-xs">{dimCodigo}</span>
                      : <span className="badge-gray text-xs">Sin dimensión</span>}
                    <span className="text-xs text-slate-500">{dimItems[0]?.dimension_nombre||''}</span>
                    <span className="ml-auto text-xs text-slate-400">{dimItems.length} ítem(s)</span>
                  </div>
                  <div>
                    {dimItems.map((item, idx)=>(
                      <div key={item.id} className="border-b border-slate-50 last:border-0">
                        <div className="flex items-start gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
                          <span className="text-xs font-bold text-slate-400 mt-0.5 w-6 flex-shrink-0">{item.orden}</span>
                          <p className="flex-1 text-sm text-slate-700">{item.texto}</p>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button onClick={()=>toggleExpand(item.id)} className="p-1 text-slate-400 hover:text-slate-600 rounded">
                              {expandido[item.id]?<ChevronDown className="w-3.5 h-3.5"/>:<ChevronRight className="w-3.5 h-3.5"/>}
                            </button>
                            <button onClick={()=>setEditandoItem(item)} className="p-1 text-brand-400 hover:text-brand-600 hover:bg-brand-50 rounded">
                              <Pencil className="w-3.5 h-3.5"/>
                            </button>
                            <button onClick={()=>eliminarItem.mutate(item.id)} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded">
                              <Trash2 className="w-3.5 h-3.5"/>
                            </button>
                          </div>
                        </div>
                        {expandido[item.id] && item.opciones?.length > 0 && (
                          <div className="px-14 pb-3">
                            <div className="flex flex-wrap gap-2">
                              {item.opciones.map(op=>(
                                <span key={op.id} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-lg">
                                  {op.valor}. {op.texto}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {modalDim   && <ModalDimension pruebaId={id} onClose={()=>setModalDim(false)}   onSave={invalidar}/>}
      {modalItem  && <ModalItem pruebaId={id} dimensiones={dimensiones} escala={prueba?.escala_tipo} totalItems={items.length} onClose={()=>setModalItem(false)} onSave={invalidar}/>}
      {editandoItem && <ModalEditarItem item={editandoItem} dimensiones={dimensiones} onClose={()=>setEditandoItem(null)} onSave={invalidar}/>}
      {modalExcel && <ModalExcel pruebaId={id} dimensiones={dimensiones} onClose={()=>setModalExcel(false)} onSave={invalidar}/>}
    </div>
  );
}