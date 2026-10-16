import { claseEstado } from "../constants";

// Círculo que muestra el estado de una gestión: vacío (pendiente), medio
// lleno (en progreso), con visto (hecha) o con "!" (vencida). Es
// decorativo: el estado siempre va también en texto.
function IconoEstado({ estado, vencida = false }) {
  const clase = claseEstado(estado);

  return (
    <svg className="icono-estado" viewBox="0 0 24 24" aria-hidden="true">
      {clase === "hecha" ? (
        <>
          <circle cx="12" cy="12" r="10.5" fill="#15803d" />
          <path
            d="M7.5 12.5l3 3 6-6.5"
            fill="none"
            stroke="#fff"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      ) : vencida ? (
        <>
          <circle
            cx="12"
            cy="12"
            r="9.5"
            fill="#fff"
            stroke="#b91c3c"
            strokeWidth="2.2"
          />
          <path
            d="M12 7v6"
            stroke="#b91c3c"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <circle cx="12" cy="16.6" r="1.4" fill="#b91c3c" />
        </>
      ) : clase === "en_progreso" ? (
        <>
          <circle
            cx="12"
            cy="12"
            r="9.5"
            fill="#fff"
            stroke="#a8480a"
            strokeWidth="2"
          />
          <path d="M12 2.5a9.5 9.5 0 0 1 0 19z" fill="#a8480a" />
        </>
      ) : (
        <circle
          cx="12"
          cy="12"
          r="9.5"
          fill="#fff"
          stroke="#8a90a6"
          strokeWidth="2"
        />
      )}
    </svg>
  );
}

export default IconoEstado;
