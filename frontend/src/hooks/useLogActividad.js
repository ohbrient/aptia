import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const RUTAS = {
  '/rrhh':              'Dashboard',
  '/rrhh/clientes':     'Empresas Cliente',
  '/rrhh/procesos':     'Procesos',
  '/rrhh/candidatos':   'Candidatos',
  '/rrhh/reportes':     'Reportes',
  '/rrhh/analytics':    'Analytics',
  '/rrhh/mapa-talento': 'Mapa de Talento',
  '/rrhh/banco':        'Mis Pruebas',
  '/rrhh/usuarios':     'Usuarios',
  '/rrhh/actividad':    'Log de Actividad',
  '/rrhh/licencias':    'Licencias',
  '/rrhh/clima':        'Clima Laboral',
  '/rrhh/eval360':      'Evaluación 360°',
};

export function useLogActividad() {
  const { user } = useAuth();
  const location = useLocation();
  const lastPath = useRef(null);

  useEffect(() => {
    if (!user || user.rol !== 'rrhh') return;
    if (location.pathname === lastPath.current) return;
    lastPath.current = location.pathname;

    // Buscar etiqueta — exacta primero, luego prefijo para rutas con parámetros
    let seccion = RUTAS[location.pathname];
    if (!seccion) {
      for (const [ruta, label] of Object.entries(RUTAS)) {
        if (location.pathname.startsWith(ruta + '/')) { seccion = label; break; }
      }
    }
    if (!seccion) return;

    api.post('/rrhh/actividad', {
      tipo:        'navegacion',
      descripcion: `${user.nombre} visitó ${seccion}`,
      metadata:    { ruta: location.pathname, seccion },
    }).catch(() => {});
  }, [location.pathname, user]);
}