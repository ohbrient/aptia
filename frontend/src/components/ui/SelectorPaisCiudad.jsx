import { PAISES, PAISES_CIUDADES } from '../../data/paisesCiudades';

export default function SelectorPaisCiudad({ pais, ciudad, onPaisChange, onCiudadChange }) {
  const ciudades = pais ? (PAISES_CIUDADES[pais] || []) : [];

  const handlePais = (e) => {
    onPaisChange(e.target.value);
    onCiudadChange(''); // Reset ciudad al cambiar país
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="label">País</label>
        <select value={pais} onChange={handlePais} className="input">
          <option value="">Seleccionar país...</option>
          {PAISES.map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Ciudad</label>
        {ciudades.length > 0 ? (
          <select value={ciudad} onChange={e => onCiudadChange(e.target.value)} className="input" disabled={!pais}>
            <option value="">Seleccionar ciudad...</option>
            {ciudades.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            value={ciudad}
            onChange={e => onCiudadChange(e.target.value)}
            placeholder={pais ? "Escribe la ciudad..." : "Selecciona un país primero"}
            className="input"
            disabled={!pais}
          />
        )}
      </div>
    </div>
  );
}
