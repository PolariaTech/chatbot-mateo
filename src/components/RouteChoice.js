import { RUTA_OPCIONES } from '../lib/route-choice';

export default function RouteChoice({ onElegir, disabled = false, layout = 'hero' }) {
  return (
    <div className={`route-choice route-choice--${layout}`} role="group" aria-label="Elige Ventas o Pedidos">
      {RUTA_OPCIONES.map((opcion) => (
        <button
          key={opcion.id}
          type="button"
          className="route-choice__btn"
          disabled={disabled}
          onClick={() => onElegir(opcion.texto)}
          aria-label={`Elegir ${opcion.titulo}`}
        >
          <span className="route-choice__num" aria-hidden="true">{opcion.numero}</span>
          <span className="route-choice__title">{opcion.titulo}</span>
        </button>
      ))}
    </div>
  );
}
