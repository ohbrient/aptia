import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { ShieldCheck, ChevronRight, ChevronLeft, CheckCircle, Loader2, AlertTriangle, Maximize } from 'lucide-react';

const ESTADO = { CARGANDO: 'cargando', BIENVENIDA: 'bienvenida', PRUEBA: 'prueba', ENVIANDO: 'enviando', RESULTADOS: 'resultados', ERROR: 'error' };

const DIM_COLOR = {
  O: 'bg-violet-100 text-violet-700',
  C: 'bg-emerald-100 text-emerald-700',
  E: 'bg-amber-100 text-amber-700',
  A: 'bg-rose-100 text-rose-700',
  N: 'bg-purple-100 text-purple-700',
};
const DIM_BAR = {
  O: 'bg-violet-500',
  C: 'bg-emerald-500',
  E: 'bg-amber-500',
  A: 'bg-rose-500',
  N: 'bg-purple-500',
};


// ── Hook Anti-trampa ─────────────────────────────────────────
function useAntiTrampa({ token, activo, onViolacion }) {
  const [violaciones, setViolaciones] = useState(0);
  const [advertencia,  setAdvertencia]  = useState(null);
  const [bloqueado,    setBloqueado]    = useState(false);
  const MAX_VIOLACIONES = 3;

  const registrar = useCallback(async (tipo, detalle) => {
    if (!activo || !token) return;
    try {
      await fetch(`/api/prueba/${token}/violacion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo, detalle }),
      });
    } catch {}

    setViolaciones(v => {
      const nuevas = v + 1;
      if (nuevas >= MAX_VIOLACIONES) {
        setBloqueado(true);
        onViolacion?.('bloqueado');
      } else {
        setAdvertencia(tipo);
        setTimeout(() => setAdvertencia(null), 4000);
      }
      return nuevas;
    });
  }, [activo, token, onViolacion]);

  // Detectar cambio de pestaña / ventana
  useEffect(() => {
    if (!activo) return;
    const handler = () => {
      if (document.hidden) registrar('cambio_pestana', 'El candidato cambió de pestaña o minimizó la ventana');
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [activo, registrar]);

  // Detectar clic fuera de la ventana
  useEffect(() => {
    if (!activo) return;
    const handler = () => {
      if (!document.hasFocus()) registrar('foco_perdido', 'El candidato perdió el foco de la ventana');
    };
    window.addEventListener('blur', handler);
    return () => window.removeEventListener('blur', handler);
  }, [activo, registrar]);

  // Deshabilitar clic derecho
  useEffect(() => {
    if (!activo) return;
    const handler = (e) => e.preventDefault();
    document.addEventListener('contextmenu', handler);
    return () => document.removeEventListener('contextmenu', handler);
  }, [activo]);

  // Deshabilitar copiar/pegar
  useEffect(() => {
    if (!activo) return;
    const handler = (e) => e.preventDefault();
    document.addEventListener('copy',  handler);
    document.addEventListener('paste', handler);
    document.addEventListener('cut',   handler);
    return () => {
      document.removeEventListener('copy',  handler);
      document.removeEventListener('paste', handler);
      document.removeEventListener('cut',   handler);
    };
  }, [activo]);

  return { violaciones, advertencia, bloqueado, MAX_VIOLACIONES };
}

// ── Componente de advertencia anti-trampa ────────────────────
function AdvertenciaAntiTrampa({ tipo, violaciones, max }) {
  if (!tipo) return null;
  const msgs = {
    cambio_pestana: 'No puedes cambiar de pestaña durante la evaluación.',
    foco_perdido:   'Mantén el foco en esta ventana durante la evaluación.',
  };
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-bounce">
      <div className="bg-red-600 text-white px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 max-w-sm">
        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
        <div>
          <p className="text-sm font-bold">¡Advertencia! ({violaciones}/{max})</p>
          <p className="text-xs opacity-90">{msgs[tipo] || 'Comportamiento no permitido detectado.'}</p>
        </div>
      </div>
    </div>
  );
}

// ── Timer por pregunta ───────────────────────────────────────
function TimerPregunta({ segundos, onTimeout }) {
  const [restante, setRestante] = useState(segundos);

  useEffect(() => {
    setRestante(segundos);
  }, [segundos]);

  useEffect(() => {
    if (restante <= 0) { onTimeout?.(); return; }
    const t = setTimeout(() => setRestante(r => r - 1), 1000);
    return () => clearTimeout(t);
  }, [restante, onTimeout]);

  const pct = (restante / segundos) * 100;
  const color = pct > 50 ? '#059669' : pct > 25 ? '#D97706' : '#DC2626';

  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }}/>
      </div>
      <span className="font-mono font-bold" style={{ color }}>
        {String(Math.floor(restante/60)).padStart(2,'0')}:{String(restante%60).padStart(2,'0')}
      </span>
    </div>
  );
}


// ── Bloque DISC selección forzada ────────────────────────────
function BloqueDisc({ item, respActual, onResponder }) {
  const opciones = (item.opciones || []).sort((a, b) => a.orden - b.orden);
  const mas  = respActual?.mas;
  const menos = respActual?.menos;

  const seleccionar = (opId, tipo) => {
    const actual = respActual || {};
    // Si ya estaba seleccionado lo deselecciona
    if (actual[tipo] === opId) {
      onResponder({ ...actual, [tipo]: null });
      return;
    }
    // No puede ser MÁS y MENOS al mismo tiempo
    if (tipo === 'mas'  && actual.menos === opId) return;
    if (tipo === 'menos' && actual.mas  === opId) return;
    onResponder({ ...actual, [tipo]: opId });
  };

  return (
    <div className="space-y-3">
      {/* Leyenda */}
      <div className="flex gap-4 justify-center mb-6">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-brand-600 flex items-center justify-center">
            <span className="text-white text-xs font-bold">+</span>
          </div>
          <span className="text-xs font-semibold text-slate-600">MÁS me describe</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-slate-400 flex items-center justify-center">
            <span className="text-white text-xs font-bold">−</span>
          </div>
          <span className="text-xs font-semibold text-slate-600">MENOS me describe</span>
        </div>
      </div>

      {opciones.map(op => {
        const esMas   = mas   === op.id;
        const esMenos = menos === op.id;
        return (
          <div key={op.id} className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
            esMas   ? 'border-brand-500 bg-brand-50' :
            esMenos ? 'border-slate-400 bg-slate-50' :
            'border-slate-200 bg-white hover:border-slate-300'
          }`}>
            <span className={`text-base font-semibold flex-1 ${
              esMas ? 'text-brand-700' : esMenos ? 'text-slate-600' : 'text-slate-800'
            }`}>{op.texto}</span>
            <div className="flex gap-2">
              {/* Botón MÁS */}
              <button
                onClick={() => seleccionar(op.id, 'mas')}
                disabled={!!menos && menos === op.id}
                title="MÁS me describe"
                className={`w-9 h-9 rounded-full border-2 flex items-center justify-center font-bold text-sm transition-all ${
                  esMas
                    ? 'bg-brand-600 border-brand-600 text-white scale-110'
                    : 'border-brand-300 text-brand-400 hover:border-brand-500 hover:text-brand-600 disabled:opacity-30 disabled:cursor-not-allowed'
                }`}
              >+</button>
              {/* Botón MENOS */}
              <button
                onClick={() => seleccionar(op.id, 'menos')}
                disabled={!!mas && mas === op.id}
                title="MENOS me describe"
                className={`w-9 h-9 rounded-full border-2 flex items-center justify-center font-bold text-sm transition-all ${
                  esMenos
                    ? 'bg-slate-500 border-slate-500 text-white scale-110'
                    : 'border-slate-300 text-slate-400 hover:border-slate-500 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed'
                }`}
              >−</button>
            </div>
          </div>
        );
      })}

      {/* Indicador de completitud */}
      <div className="flex justify-center gap-6 pt-2">
        <span className={`text-xs font-semibold flex items-center gap-1 ${mas ? 'text-brand-600' : 'text-slate-300'}`}>
          {mas ? '✓' : '○'} MÁS seleccionado
        </span>
        <span className={`text-xs font-semibold flex items-center gap-1 ${menos ? 'text-slate-600' : 'text-slate-300'}`}>
          {menos ? '✓' : '○'} MENOS seleccionado
        </span>
      </div>
    </div>
  );
}

export default function PruebaPage() {
  const params = useParams();
  const token = params.token;
  const previewId = params.previewId;
  const isPreview = !!previewId;

  const [estado,     setEstado]     = useState(ESTADO.CARGANDO);
  const [datos,      setDatos]      = useState(null);   // { candidato, pruebas }
  const [pruebaIdx,  setPruebaIdx]  = useState(0);      // índice de prueba actual
  const [itemIdx,    setItemIdx]    = useState(0);      // índice de ítem actual
  const [respuestas, setRespuestas] = useState({});     // { item_id: { opcion_id, valor } }
  const [resultados, setResultados] = useState([]);
  const [informe,    setInforme]    = useState('');
  const [enPrueba,   setEnPrueba]   = useState(false);
  const TIEMPO_POR_PREGUNTA = 90; // segundos
  const [errorMsg,   setErrorMsg]   = useState('');

  const informeRef = useRef('');

  const { violaciones, advertencia, bloqueado, MAX_VIOLACIONES } = useAntiTrampa({
    token,
    activo: enPrueba,
    onViolacion: (tipo) => {
      if (tipo === 'bloqueado') setEstado(ESTADO.ERROR);
    },
  });

  // ── Cargar datos del candidato ──────────────────────────────
  useEffect(() => {
    const url = isPreview
      ? `/api/prueba/preview/${previewId}`
      : `/api/prueba/${token}`;
    if (!isPreview && !token) return;
    if (isPreview && !previewId) { setErrorMsg('ID de prueba no especificado'); setEstado(ESTADO.ERROR); return; }
    fetch(url)
      .then(r => r.json())
      .then(d => {
        if (d.error === 'ya_completado') { setEstado(ESTADO.RESULTADOS); return; }
        if (d.error)  { setErrorMsg(d.error); setEstado(ESTADO.ERROR); return; }
        // Normalizar estructura: preview devuelve { prueba: {pruebas:[]} }
        // normal devuelve { pruebas: [], candidato, ... }
        if (d.prueba && !d.pruebas) {
          const pruebas = d.prueba.pruebas || [d.prueba];
          // Asegurar que escala_tipo se propague a cada prueba
          d.pruebas = pruebas.map(p => ({
            ...p,
            escala_tipo: p.escala_tipo || d.prueba.escala_tipo,
          }));
        }
        setDatos(d);
        setEstado(ESTADO.BIENVENIDA);
      })
      .catch(() => { setErrorMsg('No se pudo cargar la evaluación.'); setEstado(ESTADO.ERROR); });
  }, [token, isPreview, previewId]);

  const prueba  = datos?.pruebas?.[pruebaIdx];
  const items   = prueba?.items || [];
  const item    = items[itemIdx];
  const totalItems = items.length;
  const progreso   = totalItems ? Math.round((itemIdx / totalItems) * 100) : 0;

  // ── Iniciar prueba ──────────────────────────────────────────
  const iniciar = async () => {
    if (!isPreview) {
      await fetch(`/api/prueba/${token}/iniciar`, { method: 'POST' });
      setEnPrueba(true);
      try { await document.documentElement.requestFullscreen(); } catch {}
    } else {
      setEnPrueba(true);
    }
    setEstado(ESTADO.PRUEBA);
  };

  // ── Seleccionar respuesta ────────────────────────────────────
  const seleccionar = (opcion) => {
    setRespuestas(r => ({
      ...r,
      [item.id]: { opcion_id: opcion.id, valor_numerico: parseFloat(opcion.valor) },
    }));
  };

  // ── Navegar ──────────────────────────────────────────────────
  const siguiente = async () => {
    if (itemIdx < totalItems - 1) {
      setItemIdx(i => i + 1);
    } else {
      // Fin de esta prueba → enviar respuestas
      await enviarRespuestas();
    }
  };

  const anterior = () => {
    if (itemIdx > 0) setItemIdx(i => i - 1);
  };

  // ── Enviar respuestas ─────────────────────────────────────────
  const enviarRespuestas = async () => {
    setEstado(ESTADO.ENVIANDO);

    let payload = [];
    if (prueba.escala_tipo === 'seleccion_forzada') {
      // DISC: cada bloque genera 2 respuestas (MÁS=1, MENOS=-1)
      items.forEach(it => {
        const resp = respuestas[it.id];
        if (!resp?.mas || !resp?.menos) return;
        payload.push({ item_id: it.id, opcion_id: resp.mas,   valor_numerico: 1  });
        payload.push({ item_id: it.id, opcion_id: resp.menos, valor_numerico: -1 });
      });
    } else {
      payload = items.map(it => ({
        item_id:        it.id,
        opcion_id:      respuestas[it.id]?.opcion_id,
        valor_numerico: respuestas[it.id]?.valor_numerico,
      })).filter(r => r.opcion_id);
    }

    if (isPreview) {
      // Modo preview: simular resultados
      setEstado(ESTADO.RESULTADOS);
      setResultados([]);
      setInforme('**Modo preview** — En la evaluación real, aquí aparecería el informe IA generado automáticamente para este candidato.');
      return;
    }

    const res = await fetch(`/api/prueba/${token}/responder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prueba_id: prueba.id, respuestas: payload }),
    });
    const data = await res.json();
    setResultados(data.resultados || []);
    await generarInforme(data.resultados || []);
  };

  // ── Informe IA streaming ──────────────────────────────────────
  const generarInforme = async (res) => {
    setEstado(ESTADO.RESULTADOS);
    const response = await fetch(`/api/prueba/${token}/informe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prueba_id: prueba.id, resultados: res }),
    });
    const reader  = response.body.getReader();
    const decoder = new TextDecoder();
    informeRef.current = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      informeRef.current += decoder.decode(value, { stream: true });
      setInforme(informeRef.current);
    }
  };

  // ── Formatear informe markdown → HTML ─────────────────────────
  const formatInforme = (text) =>
    text
      .split('\n\n')
      .map(p => {
        if (p.startsWith('### ')) return `<h3>${p.slice(4)}</h3>`;
        return `<p>${p.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>')}</p>`;
      })
      .filter(Boolean)
      .join('');

  // ═══════════════════════════════════════════════════════════
  //  RENDERS
  // ═══════════════════════════════════════════════════════════

  if (estado === ESTADO.CARGANDO) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
    </div>
  );

  if (estado === ESTADO.ERROR) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="card p-10 max-w-md text-center">
        <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <ShieldCheck className="w-7 h-7 text-red-500" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-2">Enlace no disponible</h2>
        <p className="text-sm text-slate-500">{errorMsg}</p>
      </div>
    </div>
  );

  // ── Bienvenida ────────────────────────────────────────────────
  if (estado === ESTADO.BIENVENIDA) {
    const c = datos?.candidato;
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-xl">
          {/* Logo */}
          <div className="flex items-center gap-2 justify-center mb-8">
            <ShieldCheck className="w-6 h-6 text-brand-600" />
            <span className="font-bold text-slate-900 text-lg">Aptia</span>
          </div>

          <div className="card p-8">
            <div className="w-16 h-16 bg-brand-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <ShieldCheck className="w-8 h-8 text-brand-600" />
            </div>

            <h1 className="text-2xl font-bold text-slate-900 text-center mb-2">
              Hola, {c?.nombre}
            </h1>
            <p className="text-slate-500 text-sm text-center mb-6">
              <strong>{c?.empresa_nombre}</strong> te invita a completar la siguiente evaluación para el proceso de <strong>{c?.puesto || c?.proceso_nombre}</strong>.
            </p>

            {/* Info pills */}
            <div className="flex justify-center gap-3 flex-wrap mb-8">
              {[
                `📋 ${datos?.pruebas?.length} prueba(s)`,
                `❓ ${datos?.pruebas?.reduce((acc, p) => acc + p.items.length, 0)} preguntas`,
                `⏱️ ${datos?.pruebas?.reduce((acc, p) => acc + (p.tiempo_limite || 0), 0)} min aprox.`,
                `🤖 Informe IA al finalizar`,
                `🔒 Confidencial`,
              ].filter(t => !t.includes('0 min')).map(t => (
                <span key={t} className="badge-blue px-3 py-1.5 text-xs">{t}</span>
              ))}
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-sm text-amber-800">
              <strong>Importante:</strong> No hay respuestas correctas o incorrectas. Responde con sinceridad para obtener los mejores resultados.
            </div>

            <button onClick={iniciar} className="btn-primary w-full justify-center py-3 text-base">
              Comenzar evaluación <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Enviando ───────────────────────────────────────────────────
  if (estado === ESTADO.ENVIANDO) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <Loader2 className="w-10 h-10 text-brand-600 animate-spin mx-auto mb-4" />
        <p className="text-slate-600 font-medium">Procesando tus respuestas…</p>
      </div>
    </div>
  );

  // ── Pregunta ───────────────────────────────────────────────────
  if (estado === ESTADO.PRUEBA && item) {
    const respActual = respuestas[item.id];
    // Obtener código de dimensión para el badge de color
    const dimCodigo = item.dimension_id
      ? prueba.items.find(i => i.id === item.id)?.dimension_id
      : null;

    if (bloqueado) return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center p-6">
        <div className="card p-10 max-w-md text-center border-red-200">
          <AlertTriangle className="w-14 h-14 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-slate-900 mb-2">Evaluación bloqueada</h2>
          <p className="text-sm text-slate-500">Se detectaron {MAX_VIOLACIONES} violaciones a las reglas de la evaluación. Tu sesión ha sido suspendida. Por favor contacta al equipo de Recursos Humanos.</p>
        </div>
      </div>
    );

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <AdvertenciaAntiTrampa tipo={advertencia} violaciones={violaciones} max={MAX_VIOLACIONES} />
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-3 sticky top-0 z-10">
          <ShieldCheck className="w-5 h-5 text-brand-600" />
          <span className="font-bold text-slate-900 text-sm">Aptia</span>
          <div className="flex-1 mx-6">
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-600 rounded-full transition-all duration-500"
                style={{ width: `${progreso}%` }}
              />
            </div>
          </div>
          <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
            {itemIdx + 1} / {totalItems}
          </span>
          <TimerPregunta
            key={`${pruebaIdx}-${itemIdx}`}
            segundos={TIEMPO_POR_PREGUNTA}
            onTimeout={() => {
              if (!respuestas[item.id]) selectAnswer(item.opciones?.[2]);
              goNext();
            }}
          />
        </div>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-xl">
            {/* Badge dimensión */}
            <div className="mb-6">
              <div className="flex items-center justify-center gap-2">
              <span className="badge-blue text-xs">{prueba.nombre}</span>
              {isPreview && <span className="badge-yellow text-xs">👁️ Modo Preview</span>}
            </div>
            </div>

            {/* Pregunta */}
            <h2 className="text-xl font-semibold text-slate-900 leading-snug mb-8">
              {item.texto}
            </h2>

            {/* Opciones según tipo de escala */}
            {prueba.escala_tipo === 'seleccion_forzada' ? (
              <div className="mb-8">
                <BloqueDisc
                  item={item}
                  respActual={respActual}
                  onResponder={(val) => setRespuestas(r => ({ ...r, [item.id]: val }))}
                />
              </div>
            ) : (
              <>
                {prueba.escala_tipo === 'multiple' ? (
                  /* Opciones múltiple con texto */
                  <div className="space-y-3 mb-8">
                    {(item.opciones || []).sort((a, b) => a.orden - b.orden).map((op, idx) => (
                      <button
                        key={op.id}
                        onClick={() => seleccionar(op)}
                        className={`w-full text-left px-5 py-3.5 rounded-xl border-2 text-sm font-medium transition-all duration-150 flex items-center gap-3 ${
                          respActual?.opcion_id === op.id
                            ? 'border-brand-600 bg-brand-50 text-brand-700'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:bg-slate-50'
                        }`}
                      >
                        <span className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          respActual?.opcion_id === op.id
                            ? 'border-brand-600 bg-brand-600 text-white'
                            : 'border-slate-300 text-slate-500'
                        }`}>
                          {String.fromCharCode(65 + idx)}
                        </span>
                        {op.texto}
                      </button>
                    ))}
                  </div>
                ) : (
                  <>
                    {/* Escala labels */}
                    <div className="flex justify-between text-xs text-slate-400 mb-3 px-1">
                      <span>Muy en desacuerdo</span>
                      <span>Muy de acuerdo</span>
                    </div>
                    {/* Opciones Likert */}
                    <div className="flex gap-3 mb-8">
                      {(item.opciones || []).sort((a, b) => a.orden - b.orden).map(op => (
                        <button
                          key={op.id}
                          onClick={() => seleccionar(op)}
                          className={`flex-1 aspect-square max-w-[80px] rounded-xl border-2 text-lg font-bold transition-all duration-150 ${
                            respActual?.opcion_id === op.id
                              ? 'border-brand-600 bg-brand-600 text-white scale-110 shadow-lg shadow-brand-200'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-brand-400 hover:text-brand-600 hover:scale-105'
                          }`}
                        >
                          {op.valor}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}

            {/* Acciones */}
            <div className="flex gap-3">
              {itemIdx > 0 && (
                <button onClick={anterior} className="btn-secondary">
                  <ChevronLeft className="w-4 h-4" /> Anterior
                </button>
              )}
              <button
                onClick={siguiente}
                disabled={prueba.escala_tipo === 'seleccion_forzada' ? (!respActual?.mas || !respActual?.menos) : !respActual}
                className="btn-primary flex-1 justify-center"
              >
                {itemIdx === totalItems - 1 ? 'Finalizar prueba' : 'Siguiente'}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Resultados + Informe IA ───────────────────────────────────
  if (estado === ESTADO.RESULTADOS) return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-brand-600" />
        <span className="font-bold text-slate-900 text-sm">Aptia</span>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* Success */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">¡Evaluación completada!</h1>
          <p className="text-slate-500 text-sm">Aquí están tus resultados de personalidad</p>
        </div>

        {/* Resultados por dimensión */}
        {resultados.length > 0 && (
          <div className="card p-6 mb-6">
            <h2 className="text-sm font-bold text-slate-800 mb-5">Resultados por dimensión</h2>
            <div className="space-y-4">
              {resultados.map(r => (
                <div key={r.dimension}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-sm font-semibold text-slate-700">{r.dimension}</span>
                    <span className="text-sm font-bold text-slate-900">{r.puntaje_pct}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${DIM_BAR[r.codigo] || 'bg-brand-600'}`}
                      style={{ width: `${r.puntaje_pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Informe IA */}
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-brand-50 to-white flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-brand-600 animate-pulse" />
            <h2 className="text-sm font-bold text-brand-800">Informe generado por IA</h2>
          </div>
          <div className="p-6">
            {!informe ? (
              <div className="flex items-center gap-3 py-4 text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Analizando tu perfil de personalidad…</span>
              </div>
            ) : (
              <div
                className="prose prose-sm prose-slate max-w-none
                  [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-slate-900 [&_h3]:mt-5 [&_h3]:mb-2
                  [&_p]:text-slate-600 [&_p]:leading-relaxed [&_p]:mb-3
                  [&_strong]:text-slate-800"
                dangerouslySetInnerHTML={{ __html: formatInforme(informe) }}
              />
            )}
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Este informe es confidencial y será revisado por el equipo de Recursos Humanos.<br />
          Powered by <strong>Aptia</strong> · Plataforma psicométrica
        </p>
      </div>
    </div>
  );

  return null;
}