import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { listarEventos, obtenerGestionesHoy } from "../api/eventos";
import { obtenerLimiteDiario } from "../api/limite";
import abejorroEscudo from "../assets/brand/abejorro-escudo.svg";
import IconoEstado from "../components/IconoEstado";
import Layout from "../components/Layout";
import ReglaOrden from "../components/ReglaOrden";
import ReprogramarDialog from "../components/ReprogramarDialog";
import {
  claseEstado,
  ESTADOS_FILTRO_HOY,
  etiquetaEstado,
  normalizarEstado,
} from "../constants";
import {
  diasEntre,
  formatearFecha,
  formatearFechaLarga,
  partesDeFecha,
  soloFecha,
} from "../utils/fechas";
import { mensajeReprogramada } from "../utils/gestiones";
import { enHoras } from "../utils/horas";

// Los grupos se muestran en este orden: primero lo vencido, después lo de
// hoy y al final lo próximo. El orden de las gestiones dentro de cada grupo
// es el que entrega la API; no se reordena.
const GRUPOS = [
  {
    clave: "vencidas",
    titulo: "Vencidas",
    descripcion: "Su fecha objetivo ya pasó. Atiéndelas primero.",
    vacio: "No tienes gestiones vencidas.",
  },
  {
    clave: "para_hoy",
    titulo: "Para hoy",
    descripcion: "Su fecha objetivo es hoy.",
    vacio: "No tienes gestiones para hoy.",
  },
  {
    clave: "proximas",
    titulo: "Próximas",
    descripcion: "Todavía tienen tiempo; no requieren atención inmediata.",
    vacio: "No tienes gestiones próximas.",
  },
];

const plural = (n, singular, pluralizado) =>
  `${n} ${n === 1 ? singular : pluralizado}`;

// Texto de urgencia de una gestión, calculado contra la fecha que el backend
// considera "hoy" para que coincida con el grupo en el que la puso.
function textoUrgencia(grupo, fechaObjetivo, fechaActual) {
  if (grupo === "para_hoy") return "Vence hoy";

  const dias = Math.abs(diasEntre(fechaActual, fechaObjetivo));
  if (grupo === "vencidas") {
    return dias === 1 ? "Venció ayer" : `Venció hace ${dias} días`;
  }
  return dias === 1 ? "Vence mañana" : `Faltan ${dias} días`;
}

// Tarjeta "Tu día": cuántas horas hay planificadas para hoy frente al límite
// diario. Cuenta las gestiones sin finalizar de todos los eventos, igual que
// el aviso de sobrecarga.
function TuDia({ horas, limite }) {
  const libres = limite - horas;
  const lleno = libres <= 0;

  return (
    <section
      className={lleno ? "vidrio tu-dia lleno" : "vidrio tu-dia"}
      aria-labelledby="tu-dia-titulo"
    >
      <div className="tu-dia-cabecera">
        <img src={abejorroEscudo} alt="" />
        <div>
          <h2 id="tu-dia-titulo">Tu día</h2>
          <p>
            {enHoras(horas)} de {enHoras(limite)} planificadas
          </p>
        </div>
      </div>
      <div className="avance-pista" aria-hidden="true">
        <div
          className="avance-relleno"
          style={{ width: `${Math.min(100, (horas / limite) * 100)}%` }}
        />
      </div>
      <p>
        {libres > 0
          ? `Te quedan ${enHoras(libres)} libres. Si te pasas, te avisamos.`
          : libres === 0
            ? "Tu día está lleno."
            : `Te pasas ${enHoras(-libres)} del límite.`}
      </p>
    </section>
  );
}

// Mientras llegan los datos se muestra la silueta de la vista, para que el
// contenido no "salte" al aparecer.
function Cargando() {
  return (
    <div role="status" aria-live="polite">
      <span className="visually-hidden">Cargando tus gestiones...</span>
      <div className="hoy-skeleton hoy-skeleton-hero" aria-hidden="true" />
      <div className="hoy-list hoy-skeleton-list" aria-hidden="true">
        <div className="hoy-skeleton" />
        <div className="hoy-skeleton" />
        <div className="hoy-skeleton" />
      </div>
    </div>
  );
}

function Hoy() {
  // Los filtros viven en la dirección (?evento=3&estado=en curso) para que
  // se conserven al recargar o al volver atrás.
  const [parametros, setParametros] = useSearchParams();
  const eventoId = parametros.get("evento") ?? "";
  const estado = parametros.get("estado") ?? "";
  const hayFiltros = Boolean(eventoId || estado);

  const [datos, setDatos] = useState(null);
  const [error, setError] = useState("");
  // Cambia cada vez que se pulsa "Reintentar" para repetir la petición.
  const [intento, setIntento] = useState(0);
  // Gestión que se está reprogramando (null si el diálogo está cerrado).
  const [reprogramando, setReprogramando] = useState(null);
  const [mensaje, setMensaje] = useState("");
  const mensajeRef = useRef(null);

  // La gestión reprogramada puede cambiar de grupo y su botón desaparece de
  // donde estaba: el foco pasa al aviso de confirmación.
  useEffect(() => {
    if (mensaje) mensajeRef.current?.focus();
  }, [mensaje]);

  useEffect(() => {
    let activo = true;

    // La API de /hoy solo trae el id del evento; los nombres salen de la
    // lista de eventos del organizador.
    // Si el límite diario no carga, la vista sigue: solo no sale "Tu día".
    Promise.all([
      obtenerGestionesHoy({ eventoId, estado }),
      listarEventos(),
      obtenerLimiteDiario().catch(() => null),
    ])
      .then(([gestiones, eventos, limite]) => {
        if (!activo) return;
        const nombres = Object.fromEntries(
          eventos.map((evento) => [evento.id, evento.nombre]),
        );
        setError("");
        setDatos({ gestiones, nombres, eventos, limite });
      })
      .catch((err) => activo && setError(err.message));

    return () => {
      activo = false;
    };
  }, [intento, eventoId, estado]);

  function cambiarFiltro(nombre, valor) {
    setMensaje("");
    setParametros((actuales) => {
      const nuevos = new URLSearchParams(actuales);
      if (valor) nuevos.set(nombre, valor);
      else nuevos.delete(nombre);
      return nuevos;
    });
  }

  function limpiarFiltros() {
    setMensaje("");
    setError("");
    setParametros({});
  }

  function reintentar() {
    setError("");
    setDatos(null);
    setIntento((actual) => actual + 1);
  }

  // Tras reprogramar se vuelve a pedir /hoy para que la gestión salga en el
  // grupo y en el orden que le da el backend, sin recargar la página.
  async function alReprogramar(actualizada) {
    setReprogramando(null);
    try {
      const [gestiones, eventos] = await Promise.all([
        obtenerGestionesHoy({ eventoId, estado }),
        listarEventos(),
      ]);
      setDatos((actuales) => ({ ...actuales, gestiones, eventos }));
      setMensaje(mensajeReprogramada(actualizada));
    } catch (err) {
      setError(err.message);
    }
  }

  if (error) {
    return (
      <Layout>
        <section className="panel hoy-state" role="alert">
          <h1>No pudimos cargar tus gestiones</h1>
          <p>{error}</p>
          <p>
            Tus datos no se perdieron. Revisa tu conexión e inténtalo de nuevo.
          </p>
          <div className="hoy-state-actions">
            <button type="button" className="btn-link" onClick={reintentar}>
              Reintentar
            </button>
            {hayFiltros && (
              <button
                type="button"
                className="btn-suave"
                onClick={limpiarFiltros}
              >
                Quitar filtros
              </button>
            )}
          </div>
        </section>
      </Layout>
    );
  }

  if (datos === null) {
    return (
      <Layout>
        <Cargando />
      </Layout>
    );
  }

  const { gestiones, nombres, eventos, limite } = datos;
  const hayEventos = eventos.length > 0;
  const cantidad = (clave) => gestiones[clave]?.length ?? 0;
  const urgentes = cantidad("vencidas") + cantidad("para_hoy");
  const total = urgentes + cantidad("proximas");

  // Hasta tres eventos que todavía no han pasado, del más cercano al más lejano.
  const proximosEventos = eventos
    .map((evento) => ({ ...evento, dia: soloFecha(evento.fecha_hora) }))
    .filter((evento) => evento.dia >= gestiones.fecha_actual)
    .sort((a, b) => a.dia.localeCompare(b.dia))
    .slice(0, 3);

  // Horas de hoy sin importar los filtros: salen de las gestiones que el
  // backend manda dentro de cada evento.
  const horasDeHoy = eventos
    .flatMap((evento) => evento.subtareas ?? [])
    .filter(
      (gestion) =>
        gestion.fecha_objetivo === gestiones.fecha_actual &&
        normalizarEstado(gestion.estado) !== "finalizado",
    )
    .reduce((total, gestion) => total + Number(gestion.horas_estimadas), 0);
  const limiteDiario = Number(limite?.limite_horas_dia);
  const hayTuDia = limiteDiario > 0;
  const hayDerecha = proximosEventos.length > 0 || hayTuDia;

  return (
    <Layout>
      <p className="hoy-dia">{formatearFechaLarga(gestiones.fecha_actual)}</p>
      <h1 className="hoy-titular">
        {urgentes > 0
          ? `Tienes ${plural(urgentes, "gestión", "gestiones")} para atender hoy`
          : "Gestiones urgentes del día"}
      </h1>

      <div className={hayDerecha ? "hoy" : "hoy sin-lateral"}>
        <div>
          <section
            className="panel stats-grid"
            aria-label="Resumen de gestiones"
          >
            {GRUPOS.map((grupo) => (
              <a key={grupo.clave} href={`#grupo-${grupo.clave}`}>
                <strong className={`color-${grupo.clave}`}>
                  {cantidad(grupo.clave)}
                </strong>
                <span>{grupo.titulo}</span>
              </a>
            ))}
          </section>

          <ReglaOrden />

          {hayEventos && (
            <form
              className="hoy-filtros"
              aria-label="Filtrar gestiones"
              onSubmit={(e) => e.preventDefault()}
            >
              <label>
                Evento
                <select
                  value={eventoId}
                  onChange={(e) => cambiarFiltro("evento", e.target.value)}
                >
                  <option value="">Todos los eventos</option>
                  {eventos.map((evento) => (
                    <option key={evento.id} value={evento.id}>
                      {evento.nombre}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Estado
                <select
                  value={estado}
                  onChange={(e) => cambiarFiltro("estado", e.target.value)}
                >
                  <option value="">Todos los estados</option>
                  {ESTADOS_FILTRO_HOY.map((opcion) => (
                    <option key={opcion.value} value={opcion.value}>
                      {opcion.label}
                    </option>
                  ))}
                </select>
              </label>

              {hayFiltros && (
                <button
                  type="button"
                  className="btn-suave"
                  onClick={limpiarFiltros}
                >
                  Limpiar filtros
                </button>
              )}

              <p role="status">
                {hayFiltros
                  ? `Con este filtro: ${plural(total, "gestión", "gestiones")}.`
                  : ""}
              </p>
            </form>
          )}

          {mensaje && (
            <p
              className="alert-success aviso-suelto"
              role="status"
              tabIndex={-1}
              ref={mensajeRef}
            >
              {mensaje}
            </p>
          )}

          {total === 0 && hayFiltros ? (
            <section className="panel hoy-state">
              <h2>No hay gestiones con ese filtro</h2>
              <p>Prueba con otro evento u otro estado, o quita el filtro.</p>
              <div className="hoy-state-actions">
                <button
                  type="button"
                  className="btn-link"
                  onClick={limpiarFiltros}
                >
                  Limpiar filtros
                </button>
              </div>
            </section>
          ) : total === 0 ? (
            <section className="panel hoy-state">
              <h2>
                {hayEventos
                  ? "No tienes gestiones pendientes"
                  : "Aún no tienes gestiones"}
              </h2>
              <p>
                {hayEventos
                  ? "Estás al día. Cuando agregues gestiones a tus eventos, aquí las verás ordenadas por urgencia."
                  : "Crea tu primer evento y agrégale gestiones para verlas aquí ordenadas por urgencia."}
              </p>
              <div className="hoy-state-actions">
                <Link className="btn-link" to="/crear">
                  Crear evento
                </Link>
                {hayEventos && <Link to="/eventos">Ver mis eventos</Link>}
              </div>
            </section>
          ) : (
            GRUPOS.map((grupo) => {
              const lista = gestiones[grupo.clave] ?? [];
              const idTitulo = `hoy-${grupo.clave}`;

              return (
                <section
                  key={grupo.clave}
                  id={`grupo-${grupo.clave}`}
                  className={`panel hoy-group ${grupo.clave}`}
                  aria-labelledby={idTitulo}
                >
                  <div className="grupo-cabecera">
                    <h2 id={idTitulo}>{grupo.titulo}</h2>
                    <span
                      className="grupo-cantidad"
                      aria-label={plural(lista.length, "gestión", "gestiones")}
                    >
                      {lista.length}
                    </span>
                  </div>

                  {lista.length === 0 ? (
                    <p className="grupo-vacio">{grupo.vacio}</p>
                  ) : (
                    <ul className="filas">
                      {lista.map((gestion) => (
                        <li key={gestion.id} className="fila">
                          <IconoEstado
                            estado={gestion.estado}
                            vencida={grupo.clave === "vencidas"}
                          />
                          <div>
                            <h3>{gestion.titulo}</h3>
                            <p className="fila-evento">
                              <Link to={`/evento/${gestion.evento}`}>
                                {nombres[gestion.evento] ?? "Ver evento"}
                              </Link>
                              {claseEstado(gestion.estado) !== "pendiente" && (
                                <span className="subtask-status">
                                  {" · "}
                                  {etiquetaEstado(gestion.estado).toLowerCase()}
                                </span>
                              )}
                            </p>
                            {gestion.descripcion && (
                              <p>{gestion.descripcion}</p>
                            )}
                          </div>
                          <div className="fila-fin">
                            <div className="cuando">
                              <b
                                className={`urgency-badge color-${grupo.clave}`}
                              >
                                {textoUrgencia(
                                  grupo.clave,
                                  gestion.fecha_objetivo,
                                  gestiones.fecha_actual,
                                )}
                              </b>
                              {formatearFecha(gestion.fecha_objetivo)} ·{" "}
                              {enHoras(gestion.horas_estimadas)}
                            </div>
                            <button
                              type="button"
                              className="btn linea chico"
                              aria-label={`Reprogramar ${gestion.titulo}`}
                              onClick={() => {
                                setMensaje("");
                                setReprogramando(gestion);
                              }}
                            >
                              Reprogramar
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              );
            })
          )}
        </div>

        {hayDerecha && (
          <div className="hoy-derecha">
            {proximosEventos.length > 0 && (
              <aside
                className="panel lateral"
                aria-labelledby="proximos-titulo"
              >
                <h2 id="proximos-titulo">Próximos eventos</h2>
                {proximosEventos.map((evento) => {
                  const { dia, mes } = partesDeFecha(evento.dia);
                  const faltan = diasEntre(gestiones.fecha_actual, evento.dia);

                  return (
                    <Link
                      key={evento.id}
                      className="proximo"
                      to={`/evento/${evento.id}`}
                    >
                      <span className="dia-mes">
                        <b>{dia}</b>
                        <span>{mes}</span>
                      </span>
                      <span>
                        <strong>{evento.nombre}</strong>
                        <small>
                          {faltan === 0
                            ? "Hoy"
                            : faltan === 1
                              ? "Mañana"
                              : `En ${faltan} días`}
                        </small>
                        {evento.subtareas?.length === 0 && (
                          <small className="sin-gestiones">
                            Sin gestiones todavía
                          </small>
                        )}
                      </span>
                    </Link>
                  );
                })}
              </aside>
            )}
            {hayTuDia && <TuDia horas={horasDeHoy} limite={limiteDiario} />}
          </div>
        )}
      </div>

      {reprogramando && (
        <ReprogramarDialog
          key={reprogramando.id}
          gestion={reprogramando}
          onCerrar={() => setReprogramando(null)}
          onGuardado={alReprogramar}
        />
      )}
    </Layout>
  );
}

export default Hoy;
