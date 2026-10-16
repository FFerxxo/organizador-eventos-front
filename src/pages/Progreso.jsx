import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listarEventos, listarSubtareas } from "../api/eventos";
import abejorroMoto from "../assets/brand/abejorro-moto.svg";
import Layout from "../components/Layout";
import { normalizarEstado } from "../constants";
import { formatearFecha, soloFecha } from "../utils/fechas";

const plural = (n, singular, pluralizado) =>
  `${n} ${n === 1 ? singular : pluralizado}`;

// Avance de un evento: cuántas de sus gestiones están finalizadas.
function avanceDe(gestiones) {
  const total = gestiones.length;
  const finalizadas = gestiones.filter(
    (gestion) => normalizarEstado(gestion.estado) === "finalizado",
  ).length;
  const porcentaje = total === 0 ? 0 : Math.round((finalizadas / total) * 100);
  return { total, finalizadas, porcentaje };
}

// Frase de ánimo según el avance de todos los eventos juntos.
function fraseDeAvance(porcentaje) {
  if (porcentaje === 0) return "Todavía no cierras ninguna gestión.";
  if (porcentaje < 50) {
    return "Vas empezando. Cada gestión que cierres suma a tus eventos.";
  }
  if (porcentaje < 100) return "Vas a buen ritmo.";
  return "Todo finalizado.";
}

function Progreso() {
  const [eventos, setEventos] = useState(null);
  const [error, setError] = useState("");
  // Cambia cada vez que se pulsa "Reintentar" para repetir la petición.
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let activo = true;

    // El backend manda las gestiones dentro de cada evento; si no vienen,
    // se piden aparte.
    listarEventos()
      .then((lista) =>
        Promise.all(
          lista.map(async (evento) => ({
            ...evento,
            avance: avanceDe(
              evento.subtareas ?? (await listarSubtareas(evento.id)),
            ),
          })),
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
  }, [intento]);

  function reintentar() {
    setError("");
    setEventos(null);
    setIntento((actual) => actual + 1);
  }

  // Avance de todos los eventos juntos, para la franja de arriba.
  const general = { total: 0, finalizadas: 0, porcentaje: 0 };
  for (const evento of eventos ?? []) {
    general.total += evento.avance.total;
    general.finalizadas += evento.avance.finalizadas;
  }
  if (general.total > 0) {
    general.porcentaje = Math.round(
      (general.finalizadas / general.total) * 100,
    );
  }

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
            Cuando crees un evento y le agregues gestiones, aquí verás cuánto
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
                "gestión finalizada",
                "gestiones finalizadas",
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
            const { total, finalizadas, porcentaje } = evento.avance;
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

                {total > 0 ? (
                  <>
                    <div
                      className="avance-pista"
                      role="progressbar"
                      aria-labelledby={idNombre}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={porcentaje}
                      aria-valuetext={`${finalizadas} de ${plural(total, "gestión finalizada", "gestiones finalizadas")}`}
                    >
                      <div
                        className="avance-relleno"
                        style={{ width: `${porcentaje}%` }}
                      />
                    </div>
                    <p className="avance-conteo">
                      {finalizadas} de{" "}
                      {plural(
                        total,
                        "gestión finalizada",
                        "gestiones finalizadas",
                      )}
                      {finalizadas === total
                        ? ". Todo listo."
                        : `. ${total - finalizadas === 1 ? "Falta" : "Faltan"} ${total - finalizadas}.`}
                    </p>
                  </>
                ) : (
                  <p className="avance-conteo">
                    Este evento todavía no tiene gestiones.
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Layout>
  );
}

export default Progreso;
