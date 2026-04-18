import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShieldCheck, Building2, Users, ClipboardList,
  ChevronRight, Check, ArrowRight, Sparkles
} from 'lucide-react';
import api from '../../services/api';

const PASOS = [
  { id: 1, label: 'Bienvenida',         icon: Sparkles    },
  { id: 2, label: 'Tu empresa',         icon: Building2   },
  { id: 3, label: 'Primer cliente',     icon: Users       },
  { id: 4, label: 'Primer proceso',     icon: ClipboardList },
];

const SECTORES = [
  'Tecnología', 'Banca y Finanzas', 'Salud', 'Retail / Comercio',
  'Manufactura', 'Educación', 'Consultoría', 'Logística', 'Hotelería',
  'Telecomunicaciones', 'Gobierno', 'Otro',
];

export default function Onboarding({ onComplete }) {
  const navigate  = useNavigate();
  const qc        = useQueryClient();
  const [paso,    setPaso]    = useState(1);
  const [error,   setError]   = useState('');

  // Paso 2 — Perfil empresa
  const [perfil, setPerfil] = useState({
    nombre: '', sector: '', pais: 'República Dominicana', ciudad: '', telefono: '', sitio_web: '',
  });

  // Paso 3 — Primera empresa cliente
  const [cliente, setCliente] = useState({
    nombre: '', sector: '', email_contacto: '',
    admin_nombre: '', admin_email: '', admin_password: '',
  });

  // Paso 4 — Primer proceso
  const [proceso, setProceso] = useState({ nombre: '', puesto: '' });
  const [pruebasDisp, setPruebasDisp] = useState([]);
  const [pruebasSelec, setPruebasSelec] = useState([]);
  const [clienteCreado, setClienteCreado] = useState(null);

  const setP = (set) => (k, v) => set(f => ({ ...f, [k]: v }));

  // Mutations
  const guardarPerfilMut = useMutation({
    mutationFn: () => api.put('/rrhh/onboarding-perfil', perfil),
    onSuccess: () => { setError(''); avanzar(); },
    onError: err => setError(err.response?.data?.error || 'Error al guardar'),
  });

  const crearClienteMut = useMutation({
    mutationFn: () => api.post('/rrhh/empresas-cliente', cliente),
    onSuccess: async (res) => {
      setClienteCreado(res.data);
      setError('');
      // Cargar pruebas disponibles
      const { data } = await api.get('/rrhh/pruebas-disponibles');
      setPruebasDisp(data);
      avanzar();
    },
    onError: err => setError(err.response?.data?.error || 'Error al crear empresa'),
  });

  const crearProcesoMut = useMutation({
    mutationFn: () => api.post('/rrhh/procesos', {
      empresa_cliente_id: clienteCreado?.id,
      nombre: proceso.nombre,
      puesto: proceso.puesto,
      prueba_ids: pruebasSelec,
    }),
    onSuccess: async () => {
      await api.post('/rrhh/onboarding-completar');
      qc.invalidateQueries(['rrhh-onboarding']);
      onComplete?.();
      navigate('/rrhh');
    },
    onError: err => setError(err.response?.data?.error || 'Error al crear proceso'),
  });

  const completarSinProceso = async () => {
    await api.post('/rrhh/onboarding-completar');
    qc.invalidateQueries(['rrhh-onboarding']);
    onComplete?.();
    navigate('/rrhh');
  };

  const avanzar = () => { setError(''); setPaso(p => p + 1); };

  const handleSiguiente = () => {
    setError('');
    if (paso === 1) { avanzar(); return; }
    if (paso === 2) { if (!perfil.nombre || !perfil.sector) { setError('Completa nombre y sector'); return; } guardarPerfilMut.mutate(); return; }
    if (paso === 3) { if (cliente.nombre) { if (!cliente.admin_email || !cliente.admin_password) { setError('Completa email y contraseña del administrador'); return; } crearClienteMut.mutate(); } else { avanzar(); } return; }
    if (paso === 4) { if (!proceso.nombre || pruebasSelec.length === 0) { setError('Agrega un nombre y selecciona al menos una prueba'); return; } crearProcesoMut.mutate(); return; }
  };

  const isPending = guardarPerfilMut.isPending || crearClienteMut.isPending || crearProcesoMut.isPending;

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #EFF6FF 0%, #F8FAFF 50%, #F0FDF4 100%)',
      fontFamily: "'Inter', sans-serif", padding: 20,
    }}>

      <div style={{width: '100%', maxWidth: 560}}>

        {/* Logo */}
        <div style={{display:'flex',alignItems:'center',gap:10,justifyContent:'center',marginBottom:32}}>
          <div style={{width:36,height:36,background:'linear-gradient(135deg,#2563EB,#4F46E5)',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 14px rgba(37,99,235,0.3)'}}>
            <ShieldCheck size={18} color="white"/>
          </div>
          <span style={{fontWeight:800,fontSize:20,color:'#0F172A',letterSpacing:'-0.3px'}}>Aptia</span>
        </div>

        {/* Stepper */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:0,marginBottom:32}}>
          {PASOS.map((p, i) => {
            const done    = paso > p.id;
            const active  = paso === p.id;
            const Icon    = p.icon;
            return (
              <div key={p.id} style={{display:'flex',alignItems:'center'}}>
                <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: done ? '#059669' : active ? '#2563EB' : '#E2E8F0',
                    color: done || active ? '#fff' : '#94A3B8',
                    transition: 'all 0.2s',
                    boxShadow: active ? '0 0 0 4px rgba(37,99,235,0.15)' : 'none',
                  }}>
                    {done ? <Check size={16}/> : <Icon size={16}/>}
                  </div>
                  <span style={{fontSize:10,fontWeight:600,color: active ? '#2563EB' : done ? '#059669' : '#94A3B8', whiteSpace:'nowrap'}}>
                    {p.label}
                  </span>
                </div>
                {i < PASOS.length - 1 && (
                  <div style={{width:48,height:2,background: paso > p.id ? '#059669' : '#E2E8F0',marginBottom:18,marginLeft:4,marginRight:4,transition:'background 0.3s'}}/>
                )}
              </div>
            );
          })}
        </div>

        {/* Card */}
        <div style={{background:'#fff',borderRadius:20,boxShadow:'0 8px 32px rgba(0,0,0,0.08)',overflow:'hidden'}}>

          {/* ═══ PASO 1: Bienvenida ═══ */}
          {paso === 1 && (
            <div style={{padding:'48px 40px',textAlign:'center'}}>
              <div style={{width:72,height:72,background:'linear-gradient(135deg,#EFF6FF,#DBEAFE)',borderRadius:20,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 24px'}}>
                <Sparkles size={32} color="#2563EB"/>
              </div>
              <h1 style={{fontSize:26,fontWeight:800,color:'#0F172A',letterSpacing:'-0.5px',marginBottom:12}}>
                ¡Bienvenido a Aptia! 🎉
              </h1>
              <p style={{fontSize:15,color:'#64748B',lineHeight:1.7,marginBottom:32,maxWidth:400,margin:'0 auto 32px'}}>
                En solo 4 pasos tendrás tu plataforma lista para evaluar candidatos. Te guiamos en cada paso.
              </p>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:36}}>
                {[
                  {icon:'🏢', text:'Configura tu empresa'},
                  {icon:'👥', text:'Agrega tu primer cliente'},
                  {icon:'📋', text:'Crea un proceso'},
                  {icon:'🚀', text:'¡Listo para evaluar!'},
                ].map(item => (
                  <div key={item.text} style={{background:'#F8FAFF',borderRadius:12,padding:'14px 16px',display:'flex',alignItems:'center',gap:10,border:'1px solid #E2E8F0'}}>
                    <span style={{fontSize:20}}>{item.icon}</span>
                    <span style={{fontSize:13,fontWeight:500,color:'#374151'}}>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══ PASO 2: Perfil empresa ═══ */}
          {paso === 2 && (
            <div style={{padding:'40px'}}>
              <div style={{marginBottom:28}}>
                <h2 style={{fontSize:22,fontWeight:800,color:'#0F172A',marginBottom:6}}>Cuéntanos sobre tu empresa</h2>
                <p style={{fontSize:14,color:'#94A3B8'}}>Esta información aparecerá en los reportes</p>
              </div>
              <div style={{display:'grid',gap:16}}>
                <div>
                  <label style={{display:'block',fontSize:12,fontWeight:600,color:'#374151',marginBottom:6}}>Nombre de tu empresa *</label>
                  <input className="input" value={perfil.nombre} onChange={e=>setP(setPerfil)('nombre',e.target.value)} placeholder="Ej: Consultores de Gestión Humana"/>
                </div>
                <div>
                  <label style={{display:'block',fontSize:12,fontWeight:600,color:'#374151',marginBottom:6}}>Sector *</label>
                  <select className="input" value={perfil.sector} onChange={e=>setP(setPerfil)('sector',e.target.value)}>
                    <option value="">Seleccionar sector...</option>
                    {SECTORES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                  <div>
                    <label style={{display:'block',fontSize:12,fontWeight:600,color:'#374151',marginBottom:6}}>País</label>
                    <input className="input" value={perfil.pais} onChange={e=>setP(setPerfil)('pais',e.target.value)} placeholder="República Dominicana"/>
                  </div>
                  <div>
                    <label style={{display:'block',fontSize:12,fontWeight:600,color:'#374151',marginBottom:6}}>Ciudad</label>
                    <input className="input" value={perfil.ciudad} onChange={e=>setP(setPerfil)('ciudad',e.target.value)} placeholder="Santo Domingo"/>
                  </div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                  <div>
                    <label style={{display:'block',fontSize:12,fontWeight:600,color:'#374151',marginBottom:6}}>Teléfono</label>
                    <input className="input" value={perfil.telefono} onChange={e=>setP(setPerfil)('telefono',e.target.value)} placeholder="+1 809 000 0000"/>
                  </div>
                  <div>
                    <label style={{display:'block',fontSize:12,fontWeight:600,color:'#374151',marginBottom:6}}>Sitio web</label>
                    <input className="input" value={perfil.sitio_web} onChange={e=>setP(setPerfil)('sitio_web',e.target.value)} placeholder="www.tuempresa.com"/>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══ PASO 3: Primera empresa cliente ═══ */}
          {paso === 3 && (
            <div style={{padding:'40px'}}>
              <div style={{marginBottom:28}}>
                <h2 style={{fontSize:22,fontWeight:800,color:'#0F172A',marginBottom:6}}>Agrega tu primer cliente</h2>
                <p style={{fontSize:14,color:'#94A3B8'}}>¿A qué empresa vas a evaluar candidatos?</p>
              </div>
              <div style={{display:'grid',gap:14}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                  <div>
                    <label style={{display:'block',fontSize:12,fontWeight:600,color:'#374151',marginBottom:6}}>Nombre empresa *</label>
                    <input className="input" value={cliente.nombre} onChange={e=>setP(setCliente)('nombre',e.target.value)} placeholder="Ej: BHD León"/>
                  </div>
                  <div>
                    <label style={{display:'block',fontSize:12,fontWeight:600,color:'#374151',marginBottom:6}}>Sector</label>
                    <input className="input" value={cliente.sector} onChange={e=>setP(setCliente)('sector',e.target.value)} placeholder="Banca"/>
                  </div>
                </div>
                <div>
                  <label style={{display:'block',fontSize:12,fontWeight:600,color:'#374151',marginBottom:6}}>Email de contacto</label>
                  <input type="email" className="input" value={cliente.email_contacto} onChange={e=>setP(setCliente)('email_contacto',e.target.value)} placeholder="contacto@bhd.com"/>
                </div>
                <div style={{borderTop:'1px solid #F1F5F9',paddingTop:16}}>
                  <p style={{fontSize:12,fontWeight:700,color:'#94A3B8',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:12}}>Administrador del cliente</p>
                  <div style={{display:'grid',gap:10}}>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                      <div>
                        <label style={{display:'block',fontSize:12,fontWeight:600,color:'#374151',marginBottom:6}}>Nombre *</label>
                        <input className="input" value={cliente.admin_nombre} onChange={e=>setP(setCliente)('admin_nombre',e.target.value)} placeholder="Juan Pérez"/>
                      </div>
                      <div>
                        <label style={{display:'block',fontSize:12,fontWeight:600,color:'#374151',marginBottom:6}}>Email *</label>
                        <input type="email" className="input" value={cliente.admin_email} onChange={e=>setP(setCliente)('admin_email',e.target.value)} placeholder="juan@bhd.com"/>
                      </div>
                    </div>
                    <div>
                      <label style={{display:'block',fontSize:12,fontWeight:600,color:'#374151',marginBottom:6}}>Contraseña *</label>
                      <input type="password" className="input" value={cliente.admin_password} onChange={e=>setP(setCliente)('admin_password',e.target.value)} placeholder="Mínimo 6 caracteres"/>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══ PASO 4: Primer proceso ═══ */}
          {paso === 4 && (
            <div style={{padding:'40px'}}>
              <div style={{marginBottom:28}}>
                <h2 style={{fontSize:22,fontWeight:800,color:'#0F172A',marginBottom:6}}>Crea tu primer proceso</h2>
                <p style={{fontSize:14,color:'#94A3B8'}}>Para <strong style={{color:'#374151'}}>{clienteCreado?.nombre}</strong> — ¿qué puesto estás evaluando?</p>
              </div>
              <div style={{display:'grid',gap:14}}>
                <div>
                  <label style={{display:'block',fontSize:12,fontWeight:600,color:'#374151',marginBottom:6}}>Nombre del proceso *</label>
                  <input className="input" value={proceso.nombre} onChange={e=>setProceso(f=>({...f,nombre:e.target.value}))} placeholder="Ej: Reclutamiento Q2 2025"/>
                </div>
                <div>
                  <label style={{display:'block',fontSize:12,fontWeight:600,color:'#374151',marginBottom:6}}>Puesto a evaluar</label>
                  <input className="input" value={proceso.puesto} onChange={e=>setProceso(f=>({...f,puesto:e.target.value}))} placeholder="Ej: Analista de Riesgos"/>
                </div>
                <div>
                  <label style={{display:'block',fontSize:12,fontWeight:600,color:'#374151',marginBottom:8}}>Pruebas a aplicar *</label>
                  {pruebasDisp.length === 0 ? (
                    <div style={{background:'#FFF7ED',border:'1px solid #FED7AA',borderRadius:10,padding:'12px 14px',fontSize:13,color:'#92400E'}}>
                      No tienes pruebas disponibles. Puedes agregarlas desde el Banco de Pruebas luego.
                    </div>
                  ) : (
                    <div style={{display:'grid',gap:8}}>
                      {pruebasDisp.map(p => {
                        const sel = pruebasSelec.includes(p.id);
                        return (
                          <label key={p.id} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 14px',background: sel ? '#EFF6FF' : '#F8FAFC',border:`1.5px solid ${sel ? '#2563EB' : '#E2E8F0'}`,borderRadius:12,cursor:'pointer',transition:'all 0.15s'}}>
                            <input type="checkbox" checked={sel} onChange={()=>setPruebasSelec(prev => prev.includes(p.id) ? prev.filter(x=>x!==p.id) : [...prev, p.id])} style={{width:16,height:16,accentColor:'#2563EB',cursor:'pointer'}}/>
                            <div>
                              <p style={{fontSize:13,fontWeight:600,color: sel ? '#1D4ED8' : '#374151'}}>{p.nombre}</p>
                              <p style={{fontSize:11,color:'#94A3B8'}}>{p.total_items} ítems · {p.tiempo_limite || 20} min</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{margin:'0 40px 16px',padding:'10px 14px',background:'#FEF2F2',border:'1px solid #FECACA',borderRadius:10,fontSize:13,color:'#DC2626',fontWeight:500}}>
              {error}
            </div>
          )}

          {/* Footer del card */}
          <div style={{padding:'20px 40px',borderTop:'1px solid #F1F5F9',display:'flex',alignItems:'center',justifyContent:'space-between',background:'#FAFAFA'}}>
            <span style={{fontSize:12,color:'#CBD5E1'}}>Paso {paso} de {PASOS.length}</span>
            <div style={{display:'flex',gap:10}}>
              {(paso === 3 || paso === 4) && (
                <button onClick={completarSinProceso} style={{background:'none',border:'1px solid #E2E8F0',borderRadius:10,padding:'10px 18px',fontSize:13,fontWeight:600,color:'#64748B',cursor:'pointer'}}>
                  Omitir por ahora
                </button>
              )}
              <button
                onClick={handleSiguiente}
                disabled={isPending}
                style={{background:'linear-gradient(135deg,#1D4ED8,#2563EB)',color:'#fff',border:'none',borderRadius:10,padding:'10px 22px',fontSize:14,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:8,boxShadow:'0 4px 14px rgba(37,99,235,0.3)',opacity: isPending ? 0.7 : 1,transition:'all 0.15s'}}>
                {isPending ? 'Guardando...' : paso === 4 ? '¡Comenzar! 🚀' : <>Siguiente <ArrowRight size={16}/></>}
              </button>
            </div>
          </div>
        </div>

        {/* Indicador de progreso */}
        <div style={{marginTop:20,height:4,background:'#E2E8F0',borderRadius:100,overflow:'hidden'}}>
          <div style={{height:'100%',background:'linear-gradient(90deg,#2563EB,#4F46E5)',borderRadius:100,width:`${(paso/PASOS.length)*100}%`,transition:'width 0.4s ease'}}/>
        </div>
      </div>
    </div>
  );
}