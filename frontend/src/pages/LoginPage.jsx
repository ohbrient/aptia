import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff } from 'lucide-react';

const REDIRECT = { superadmin: '/superadmin', rrhh: '/rrhh', empresa: '/empresa' };
const ROLES = ['superadmin', 'rrhh', 'empresa'];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPwd,  setShowPwd]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    let loggedIn = false;
    for (const rol of ROLES) {
      try {
        const user = await login(email.trim().toLowerCase(), password, rol);
        loggedIn = true;
        navigate(REDIRECT[user.rol]);
        break;
      } catch (err) {
        const msg = err?.response?.data?.error || '';
        if (msg === 'Credenciales incorrectas') continue;
        if (err?.response?.status >= 500) {
          setError('Error del servidor. Intenta de nuevo.');
          setLoading(false);
          return;
        }
      }
    }
    if (!loggedIn) {
      setError('Correo o contraseña incorrectos');
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .lg-root {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Nunito', sans-serif;
          background: #F0F2FF;
          position: relative;
          overflow: hidden;
          padding: 20px;
        }

        /* Fondo con formas decorativas */
        .lg-bg {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
        }

        /* Círculo grande top-left */
        .lg-shape1 {
          position: absolute;
          width: 600px; height: 600px;
          border-radius: 50%;
          border: 2px solid rgba(147,112,219,0.15);
          top: -200px; left: -100px;
        }
        .lg-shape2 {
          position: absolute;
          width: 400px; height: 400px;
          border-radius: 50%;
          border: 2px solid rgba(147,112,219,0.1);
          top: -80px; left: 0px;
        }

        /* Blob naranja/rojo bottom-left */
        .lg-blob1 {
          position: absolute;
          bottom: 60px; left: 80px;
          width: 160px; height: 160px;
        }

        /* Bolitas decorativas */
        .lg-dot1 {
          position: absolute;
          width: 18px; height: 18px;
          border-radius: 50%;
          background: #FF6B6B;
          bottom: 120px; left: 200px;
          animation: float1 4s ease-in-out infinite;
        }
        .lg-dot2 {
          position: absolute;
          width: 12px; height: 12px;
          border-radius: 50%;
          background: #4ECDC4;
          bottom: 80px; left: 160px;
          animation: float2 3s ease-in-out infinite;
        }
        .lg-dot3 {
          position: absolute;
          width: 14px; height: 14px;
          border-radius: 50%;
          background: #FFE66D;
          top: 100px; right: 200px;
          animation: float1 5s ease-in-out infinite;
        }
        .lg-dot4 {
          position: absolute;
          width: 10px; height: 10px;
          border-radius: 50%;
          background: #A29BFE;
          top: 150px; right: 280px;
          animation: float2 4.5s ease-in-out infinite;
        }

        @keyframes float1 {
          0%,100% { transform: translateY(0); }
          50%      { transform: translateY(-12px); }
        }
        @keyframes float2 {
          0%,100% { transform: translateY(0); }
          50%      { transform: translateY(-8px); }
        }

        /* Forma blob naranja */
        .lg-blob-orange {
          position: absolute;
          bottom: 40px; left: 60px;
          width: 180px; height: 80px;
          background: linear-gradient(135deg, #FF8C42, #FF6B6B);
          border-radius: 60px;
          transform: rotate(-30deg);
          opacity: 0.85;
          filter: blur(1px);
        }

        /* Ilustración esquina top-right */
        .lg-illustration {
          position: absolute;
          top: 20px; right: 60px;
          width: 200px;
          opacity: 0.9;
        }

        /* ── Tarjeta principal ── */
        .lg-card {
          background: #fff;
          border-radius: 24px;
          padding: 44px 40px 36px;
          width: 100%;
          max-width: 480px;
          box-shadow: 0 20px 60px rgba(100,80,200,0.1), 0 4px 16px rgba(0,0,0,0.06);
          position: relative;
          z-index: 10;
          animation: card-in 0.45s cubic-bezier(0.22,1,0.36,1) both;
        }
        @keyframes card-in {
          from { opacity:0; transform: translateY(24px) scale(0.98); }
          to   { opacity:1; transform: translateY(0) scale(1); }
        }

        /* Logo */
        .lg-logo {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 20px;
        }
        .lg-logo-icon {
          width: 36px; height: 36px;
          background: linear-gradient(135deg, #6C63FF, #A29BFE);
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 12px rgba(108,99,255,0.3);
        }
        .lg-logo-name {
          font-size: 18px;
          font-weight: 800;
          color: #2D3748;
          letter-spacing: -0.3px;
        }

        /* Heading */
        .lg-heading {
          font-size: 28px;
          font-weight: 800;
          color: #1A1A2E;
          letter-spacing: -0.5px;
          margin-bottom: 6px;
        }
        .lg-sub {
          font-size: 14px;
          color: #718096;
          margin-bottom: 28px;
          font-weight: 500;
        }
        .lg-sub strong {
          color: #6C63FF;
          font-weight: 700;
        }

        /* Campo */
        .lg-field { margin-bottom: 18px; }
        .lg-label {
          display: block;
          font-size: 13px;
          font-weight: 700;
          color: #4A5568;
          margin-bottom: 8px;
          letter-spacing: 0.1px;
        }
        .lg-input-wrap { position: relative; }
        .lg-input-icon {
          position: absolute;
          left: 14px; top: 50%;
          transform: translateY(-50%);
          color: #CBD5E0;
          pointer-events: none;
          display: flex;
        }
        .lg-input {
          width: 100%;
          background: #F7F8FF;
          border: 2px solid #EDF2F7;
          border-radius: 12px;
          padding: 13px 14px 13px 42px;
          font-size: 14px;
          color: #2D3748;
          font-family: 'Nunito', sans-serif;
          font-weight: 500;
          outline: none;
          transition: all 0.15s;
        }
        .lg-input::placeholder { color: #CBD5E0; font-weight: 400; }
        .lg-input:focus {
          border-color: #6C63FF;
          background: #fff;
          box-shadow: 0 0 0 4px rgba(108,99,255,0.1);
        }
        .lg-eye {
          position: absolute;
          right: 13px; top: 50%;
          transform: translateY(-50%);
          background: none; border: none;
          cursor: pointer; padding: 4px;
          color: #CBD5E0; display: flex;
          transition: color 0.15s;
        }
        .lg-eye:hover { color: #6C63FF; }

        /* Row forgot */
        .lg-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .lg-forgot {
          font-size: 13px;
          font-weight: 700;
          color: #6C63FF;
          text-decoration: none;
        }
        .lg-forgot:hover { text-decoration: underline; }

        /* Error */
        .lg-error {
          background: #FFF5F5;
          border: 1.5px solid #FED7D7;
          color: #C53030;
          font-size: 13px;
          font-weight: 600;
          padding: 11px 14px;
          border-radius: 10px;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 7px;
        }

        /* Botón */
        .lg-btn {
          width: 100%;
          background: linear-gradient(135deg, #6C63FF, #7C73FF);
          border: none;
          border-radius: 14px;
          padding: 15px;
          color: #fff;
          font-size: 16px;
          font-weight: 800;
          font-family: 'Nunito', sans-serif;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          letter-spacing: 0.2px;
          box-shadow: 0 6px 20px rgba(108,99,255,0.35);
          transition: all 0.15s;
          margin-top: 6px;
        }
        .lg-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 28px rgba(108,99,255,0.45);
        }
        .lg-btn:active:not(:disabled) { transform: scale(0.99); }
        .lg-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .lg-spinner {
          width: 18px; height: 18px;
          border: 2.5px solid rgba(255,255,255,0.35);
          border-top-color: #fff;
          border-radius: 50%;
          animation: lg-spin 0.6s linear infinite;
        }
        @keyframes lg-spin { to { transform: rotate(360deg); } }

        .lg-footer {
          text-align: center;
          margin-top: 20px;
          font-size: 13px;
          color: #A0AEC0;
          font-weight: 500;
        }
        .lg-footer a {
          color: #6C63FF;
          font-weight: 700;
          text-decoration: none;
        }
        .lg-footer a:hover { text-decoration: underline; }

        .lg-secure {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          margin-top: 12px;
          font-size: 11px;
          color: #CBD5E0;
          font-weight: 600;
          letter-spacing: 0.3px;
          text-transform: uppercase;
        }
      `}</style>

      <div className="lg-root">

        {/* Fondo decorativo */}
        <div className="lg-bg">
          <div className="lg-shape1"/>
          <div className="lg-shape2"/>
          <div className="lg-blob-orange"/>
          <div className="lg-dot1"/>
          <div className="lg-dot2"/>
          <div className="lg-dot3"/>
          <div className="lg-dot4"/>

          {/* Ilustración SVG top-right — persona con laptop */}
          <svg className="lg-illustration" viewBox="0 0 200 180" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Cuerpo */}
            <ellipse cx="120" cy="95" rx="35" ry="45" fill="#7C3AED" opacity="0.9"/>
            {/* Cabeza */}
            <circle cx="120" cy="45" r="22" fill="#FBBF24"/>
            {/* Cabello */}
            <path d="M100 38 Q110 18 130 25 Q145 18 140 38" fill="#92400E"/>
            {/* Laptop */}
            <rect x="80" y="110" width="70" height="42" rx="6" fill="#4338CA"/>
            <rect x="85" y="115" width="60" height="30" rx="3" fill="#818CF8"/>
            {/* Pantalla contenido */}
            <rect x="90" y="120" width="25" height="4" rx="2" fill="white" opacity="0.6"/>
            <rect x="90" y="128" width="40" height="3" rx="1.5" fill="white" opacity="0.4"/>
            <rect x="90" y="134" width="30" height="3" rx="1.5" fill="white" opacity="0.4"/>
            {/* Brazo */}
            <path d="M100 100 Q85 115 88 130" stroke="#FBBF24" strokeWidth="12" strokeLinecap="round"/>
            {/* Robot pequeño */}
            <rect x="150" y="55" width="32" height="28" rx="8" fill="#A78BFA"/>
            <circle cx="160" cy="67" r="4" fill="white"/>
            <circle cx="174" cy="67" r="4" fill="white"/>
            <circle cx="160" cy="67" r="2" fill="#7C3AED"/>
            <circle cx="174" cy="67" r="2" fill="#7C3AED"/>
            <rect x="158" y="75" width="16" height="3" rx="1.5" fill="white" opacity="0.5"/>
            <rect x="163" y="50" width="6" height="8" rx="3" fill="#A78BFA"/>
          </svg>
        </div>

        {/* Tarjeta */}
        <div className="lg-card">

          {/* Logo */}
          <div className="lg-logo">
            <div className="lg-logo-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z" fill="white"/>
              </svg>
            </div>
            <span className="lg-logo-name">AptiaPsi</span>
          </div>

          <h2 className="lg-heading">¡Bienvenido a Aptia!</h2>
          <p className="lg-sub">Ingresa tus <strong>credenciales</strong> para acceder a tu cuenta</p>

          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div className="lg-field">
              <label className="lg-label">Correo electrónico</label>
              <div className="lg-input-wrap">
                <span className="lg-input-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                </span>
                <input
                  type="email" required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="johndoe@empresa.com"
                  className="lg-input"
                />
              </div>
            </div>

            {/* Contraseña */}
            <div className="lg-field">
              <div className="lg-row">
                <label className="lg-label" style={{marginBottom:0}}>Contraseña</label>
                <a href="#" className="lg-forgot" tabIndex={-1}>¿Olvidaste tu contraseña?</a>
              </div>
              <div className="lg-input-wrap" style={{marginTop:8}}>
                <span className="lg-input-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <rect x="3" y="11" width="18" height="11" rx="2"/>
                    <path d="M7 11V7a5 5 0 0110 0v4"/>
                  </svg>
                </span>
                <input
                  type={showPwd ? 'text' : 'password'} required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  className="lg-input"
                  style={{paddingRight: 44}}
                />
                <button type="button" className="lg-eye" tabIndex={-1} onClick={() => setShowPwd(v => !v)}>
                  {showPwd ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>

            {error && (
              <div className="lg-error">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="lg-btn">
              {loading
                ? <div className="lg-spinner"/>
                : <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                      <polyline points="9 22 9 12 15 12 15 22"/>
                    </svg>
                    Entrar
                  </>
              }
            </button>
          </form>

          <p className="lg-footer">
            ¿Problemas para acceder?{' '}
            <a href="mailto:soporte@aptia.io">Contactar soporte</a>
          </p>

          <div className="lg-secure">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            Conexión segura SSL
          </div>
        </div>
      </div>
    </>
  );
}