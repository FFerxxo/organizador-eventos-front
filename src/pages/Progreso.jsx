import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listarEventos, listarSubtareas } from "../api/eventos";
import abejorroMoto from "../assets/brand/abejorro-moto.svg";
import BarraProgreso from "../components/BarraProgreso";
import Layout from "../components/Layout";
import { formatearFecha, soloFecha } from "../utils/fechas";
import { avanceDe } from "../utils/gestiones";
import { useTitulo } from "../utils/useTitulo";

const plural = (n, singular, pluralizado) =>
  `${n} ${n === 1 ? singular : pluralizado}`;

// Frase de ánimo según el avance de todos los eventos juntos.
function fraseDeAvance(porcentaje) {
  if (porcentaje === 0) return "Todavía no cierras ninguna tarea.";
  if (porcentaje < 50) {
    return "Vas empezando. Cada tarea que cierres suma a tus eventos.";
  }
  if (porcentaje < 100) return "Vas a buen ritmo.";
  return "Todo listo.";
}

function Progreso() {
  useTitulo("Progreso");
  const [eventos, setEventos] = useState(null);
  const [error, setError] = useState("");
  // Cambia cada vez que se pulsa "Reintentar" para repetir la petición.
  const [intento, setIntento] = useState(0);
  // Cambia al volver a la pestaña: se vuelve a pedir en silencio (sin el
  // "Cargando...") para que el avance refleje lo marcado en otra vista.
  const [refresco, setRefresco] = useState(0);

  useEffect(() => {
    function alVolver() {
      if (document.visibilityState === "visible") {
        setRefresco((actual) => actual + 1);
      }
    }
    window.addEventListener("focus", alVolver);
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      window.removeEventListener("focus", alVolver);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, []);

  useEffect(() => {
    let activo = true;

    // El backend manda las gestiones dentro de cada evento; si no vienen,
    // se piden aparte.
    listarEventos()
      .then((lista) =>
        Promise.all(
          lista.map(async (evento) => {
            const gestiones =
              evento.subtareas ?? (await listarSubtareas(evento.id));
            return { ...evento, gestiones, avance: avanceDe(gestiones) };
          }),
        ),
      )
      .then((lista) => {
        if (!activo) return;
        lista.sort((a, b) => a.fecha_hora.localeCompare(b.fecha_hora));
        setError("");
        setEventos(lista);
      })
      .catch((err) => activo && setError(err.message));

    return () => {
      activo = false;
    };
  }, [intento, refresco]);

  function reintentar() {
    setError("");
    setEventos(null);
    setIntento((actual) => actual + 1);
  }

  // Avance de todos los eventos juntos, para la franja de arriba. Usa la
  // misma fórmula (y el mismo redondeo) que cada evento.
  const general = avanceDe(
    (eventos ?? []).flatMap((evento) => evento.gestiones),
  );

  return (
    <Layout ocultarCrear={eventos?.length === 0}>
      <header className="encabezado">
        <h1>Progreso</h1>
        <p className="sub">Cómo va la preparación de cada evento.</p>
      </header>

      {error && (
        <section className="panel hoy-state" role="alert">
          <h2>No pudimos cargar el progreso</h2>
          <p>{error}</p>
          <div className="hoy-state-actions">
            <button type="button" className="btn-link" onClick={reintentar}>
              Reintentar
            </button>
          </div>
        </section>
      )}

      {!error && eventos === null && <p role="status">Cargando progreso...</p>}

      {eventos?.length === 0 && (
        <div className="panel empty-state">
          <h2>Aún no tienes eventos</h2>
          <p>
            Cuando crees un evento y le agregues tareas, aquí verás cuánto
            llevas y cuánto falta.
          </p>
          <Link className="btn-link" to="/crear">
            Crear evento
          </Link>
        </div>
      )}

      {general.total > 0 && (
        <div className="vidrio franja franja-progreso">
          <img src={abejorroMoto} alt="" />
          <div>
            <strong>
              {general.finalizadas} de{" "}
              {plural(
                general.total,
                "tarea hecha",
                "tareas hechas",
              )}
            </strong>
            <p>{fraseDeAvance(general.porcentaje)}</p>
          </div>
          <b>{general.porcentaje} %</b>
        </div>
      )}

      {eventos?.length > 0 && (
        <ul className="panel avance-lista">
          {eventos.map((evento) => {
            const { total, porcentaje } = evento.avance;
            const idNombre = `avance-${evento.id}`;

            return (
              <li key={evento.id}>
                <div className="avance-cabecera">
                  <div>
                    <h2 id={idNombre}>
                      <Link to={`/evento/${evento.id}`}>{evento.nombre}</Link>
                    </h2>
                    <p>{formatearFecha(soloFecha(evento.fecha_hora))}</p>
                  </div>
                  {total > 0 && <strong>{porcentaje} %</strong>}
                </div>

                <BarraProgreso avance={evento.avance} idEtiqueta={idNombre} />
              </li>
            );
          })}
        </ul>
      )}
    </Layout>
  );
}

export default Progreso;
