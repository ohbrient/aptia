import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, ClipboardList, Settings, Brain, Target, Zap, Briefcase, Code, Users, Star } from 'lucide-react';
import api from '../../services/api';
import PageHeader from '../../components/ui/PageHeader';

const CATEGORIAS = [
  { key: 'personalidad',    label: 'Personalidad',    color: '#7C3AED', bg: '#EDE9FE', icon: Brain,      desc: 'Big Five, MBTI, Eneagrama' },
  { key: 'comportamiento',  label: 'Comportamiento',  color: '#F97316', bg: '#FFF7ED', icon: Target,     desc: 'DISC y estilos de trabajo' },
  { key: 'inteligencia',    label: 'Inteligencia',    color: '#2563EB', bg: '#DBEAFE', icon: Zap,        desc: 'CI, razonamiento, aptitudes' },
  { key: 'competencias',    label: 'Competencias',    color: '#059669', bg: '#D1FAE5', icon: Star,       desc: 'Liderazgo, trabajo en equipo' },
  { key: 'laborales',       label: 'Laborales',       color: '#D97706', bg: '#FEF3C7', icon: Briefcase,  desc: 'Clima, satisfacción, engagement' },
  { key: 'tecnica',         label: 'Técnicas',        color: '#0891B2', bg: '#CFFAFE', icon: Code,       desc: 'Conocimientos específicos' },
  { key: '360',             label: 'Evaluación 360°', color: '#DC2626', bg: '#FEE2E2', icon: Users,      desc: 'Evaluación por múltiples fuentes' },
];

const ESCALAS = ['likert5','likert7','dicotomica','multiple','seleccion_forzada','abierta'];

const ESCALA_INFO = {
  likert5:          { label: 'Likert 5',           emoji: '⭐', desc: 'Muy en desacuerdo → Muy de acuerdo. La más usada en personalidad y competencias.' },
  likert7:          { label: 'Likert 7',           emoji: '📊', desc: '7 niveles de acuerdo. Mayor precisión para clima laboral y satisfacción.' },
  dicotomica:       { label: 'Dicotómica',         emoji: '✅', desc: 'Solo Sí / No. Para preguntas directas de conocimiento o experiencia.' },
  multiple:         { label: 'Múltiple opción',    emoji: '🔘', desc: 'Varias opciones con peso diferente. Ideal para pruebas técnicas y situacionales.' },
  seleccion_forzada:{ label: 'Selección forzada',  emoji: '🔄', desc: 'Elige MÁS y MENOS de un grupo de palabras. Exclusivo para DISC.' },
  abierta:          { label: 'Respuesta abierta',  emoji: '✏️', desc: 'El candidato escribe texto libre. Para preguntas cualitativas.' },
};

function ModalPrueba({ onClose, onSave }) {
  const [form, setForm] = useState({ nombre:'', descripcion:'', tipo:'personalidad', categoria:'personalidad', instrucciones:'', tiempo_limite:'', escala_tipo:'likert5' });
  const [error, setError] = useState('');
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const mut = useMutation({
    mutationFn: d=>api.post('/superadmin/pruebas',d),
    onSuccess: ()=>{ onSave(); onClose(); },
    onError: err=>setError(err.response?.data?.error||'Error al crear prueba'),
  });
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">Nueva prueba</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg"><X className="w-4 h-4 text-slate-400"/></button>
        </div>
        <div className="p-6 space-y-4">
          <div><label className="label">Nombre *</label>
            <input type="text" value={form.nombre} onChange={e=>set('nombre',e.target.value)} placeholder="Ej: Test de Inteligencia Emocional" className="input"/>
          </div>
          <div><label className="label">Descripción</label>
            <textarea value={form.descripcion} onChange={e=>set('descripcion',e.target.value)} rows={2} className="input resize-none"/>
          </div>
          <div><label className="label">Categoría *</label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIAS.map(cat=>(
                <label key={cat.key} className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all ${form.categoria===cat.key?'border-brand-400 bg-brand-50':'border-slate-200 hover:border-slate-300'}`}>
                  <input type="radio" name="categoria" checked={form.categoria===cat.key} onChange={()=>{ set('categoria',cat.key); set('tipo',cat.key); }} className="sr-only"/>
                  <cat.icon className="w-3.5 h-3.5 flex-shrink-0" style={{color:cat.color}}/>
                  <span className="text-xs font-medium text-slate-700">{cat.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Escala de respuesta *</label>
            <div className="space-y-2">
              {ESCALAS.map(e => {
                const info = ESCALA_INFO[e];
                const sel  = form.escala_tipo === e;
                return (
                  <label key={e} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${sel?'border-brand-400 bg-brand-50':'border-slate-200 hover:border-slate-300'}`}>
                    <input type="radio" name="escala" checked={sel} onChange={()=>set('escala_tipo',e)} className="mt-0.5 w-4 h-4 text-brand-600 flex-shrink-0"/>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">{info.emoji}</span>
                        <span className={`text-sm font-semibold ${sel?'text-brand-700':'text-slate-800'}`}>{info.label}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{info.desc}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
          <div>
            <label className="label">Tiempo límite <span className="text-slate-400 font-normal">(minutos, opcional)</span></label>
            <input type="number" min="1" value={form.tiempo_limite} onChange={e=>set('tiempo_limite',e.target.value)} placeholder="Ej: 20" className="input"/>
          </div>
          <div><label className="label">Instrucciones para el candidato</label>
            <textarea value={form.instrucciones} onChange={e=>set('instrucciones',e.target.value)} rows={2} className="input resize-none"/>
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg">{error}</p>}
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end">
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button onClick={()=>mut.mutate(form)} disabled={mut.isPending||!form.nombre} className="btn-primary">
            {mut.isPending?'Guardando...':'Crear prueba'}
          </button>
        </div>
      </div>
    </div>
  );
}

function DiscBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
      <Target className="w-3 h-3"/> DISC
    </span>
  );
}

export default function Pruebas() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [modalCrear, setModalCrear] = useState(false);
  const [categoriaActiva, setCategoriaActiva] = useState('todas');

  const { data: pruebas=[], isLoading } = useQuery({
    queryKey: ['superadmin-pruebas'],
    queryFn: ()=>api.get('/superadmin/pruebas').then(r=>r.data),
  });

  const invalidar = ()=>qc.invalidateQueries(['superadmin-pruebas']);

  const pruebasFiltradas = categoriaActiva === 'todas'
    ? pruebas
    : pruebas.filter(p => (p.categoria||p.tipo) === categoriaActiva);

  const conteoCategoria = (key) => pruebas.filter(p => (p.categoria||p.tipo) === key).length;

  return (
    <div className="p-8">
      <PageHeader
        title="Banco de pruebas"
        subtitle="Gestiona el catálogo de evaluaciones psicométricas"
        action={
          <button onClick={()=>setModalCrear(true)} className="btn-primary">
            <Plus className="w-4 h-4"/> Nueva prueba
          </button>
        }
      />

      {/* Grid de categorías */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <button
          onClick={()=>setCategoriaActiva('todas')}
          className={`p-4 rounded-2xl border text-left transition-all ${categoriaActiva==='todas'?'border-brand-400 bg-brand-50':'border-slate-200 bg-white hover:border-slate-300'}`}
        >
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Total</p>
          <p className="text-2xl font-bold text-slate-900">{pruebas.length}</p>
          <p className="text-xs text-slate-400 mt-1">todas las pruebas</p>
        </button>
        {CATEGORIAS.slice(0,3).map(cat=>(
          <button
            key={cat.key}
            onClick={()=>setCategoriaActiva(cat.key)}
            className={`p-4 rounded-2xl border text-left transition-all ${categoriaActiva===cat.key?'border-2':'border-slate-200 bg-white hover:border-slate-300'}`}
            style={categoriaActiva===cat.key?{borderColor:cat.color, background:cat.bg}:{}}
          >
            <div className="flex items-center gap-2 mb-2">
              <cat.icon className="w-4 h-4" style={{color:cat.color}}/>
              <p className="text-xs font-bold uppercase tracking-wider" style={{color:cat.color}}>{cat.label}</p>
            </div>
            <p className="text-2xl font-bold text-slate-900">{conteoCategoria(cat.key)}</p>
            <p className="text-xs text-slate-400 mt-1">{cat.desc}</p>
          </button>
        ))}
      </div>

      {/* Tabs de categorías */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {[{key:'todas',label:'Todas'},...CATEGORIAS].map(cat=>(
          <button
            key={cat.key}
            onClick={()=>setCategoriaActiva(cat.key)}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${categoriaActiva===cat.key?'text-white':'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'}`}
            style={categoriaActiva===cat.key?{background:cat.color||'#2563EB'}:{}}
          >
            {cat.label}{cat.key!=='todas'?` (${conteoCategoria(cat.key)})`:''}
          </button>
        ))}
      </div>

      {/* Lista de pruebas */}
      {isLoading ? <p className="text-slate-400 text-sm">Cargando...</p> : (
        <div className="space-y-3">
          {pruebasFiltradas.length === 0 ? (
            <div className="card p-12 text-center">
              <ClipboardList className="w-10 h-10 text-slate-200 mx-auto mb-3"/>
              <p className="text-slate-400 text-sm">No hay pruebas en esta categoría</p>
              <button onClick={()=>setModalCrear(true)} className="btn-primary mx-auto mt-4">
                <Plus className="w-4 h-4"/> Crear primera prueba
              </button>
            </div>
          ) : pruebasFiltradas.map(p => {
            const cat = CATEGORIAS.find(c=>c.key===(p.categoria||p.tipo)) || CATEGORIAS[0];
            const CatIcon = cat.icon;
            return (
              <div key={p.id} className="card p-5 flex items-center gap-4 hover:shadow-sm transition-all">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{background:cat.bg}}>
                  <CatIcon className="w-5 h-5" style={{color:cat.color}}/>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-semibold text-slate-800">{p.nombre}</p>
                    {p.es_disc && <DiscBadge/>}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold`}
                      style={{background:cat.bg, color:cat.color}}>
                      {cat.label}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 truncate">{p.descripcion || 'Sin descripción'}</p>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0 text-xs text-slate-500">
                  <span>{p.total_items} ítems</span>
                  <span>{p.escala_tipo}</span>
                  {p.tiempo_limite && <span>{p.tiempo_limite} min</span>}
                  <span className={p.activa?'badge-green':'badge-gray'}>{p.activa?'Activa':'Inactiva'}</span>
                  <button
                    onClick={()=>navigate(`/superadmin/pruebas/${p.id}`)}
                    className="p-1.5 text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                    title="Gestionar ítems"
                  >
                    <Settings className="w-4 h-4"/>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalCrear && <ModalPrueba onClose={()=>setModalCrear(false)} onSave={invalidar}/>}
    </div>
  );
}