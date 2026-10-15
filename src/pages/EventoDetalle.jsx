import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ApiError } from "../api/client";
import {
  actualizarEvento,
  actualizarSubtarea,
  crearSubtarea,
  eliminarEvento,
  ejecutarSubtarea,
  eliminarSubtarea,
  listarSubtareas,
  obtenerEvento,
} from "../api/eventos";
import BarraProgreso from "../components/BarraProgreso";
import ConfirmDialog from "../components/ConfirmDialog";
import EventoForm from "../components/EventoForm";
import Layout from "../components/Layout";
import ReprogramarDialog from "../components/ReprogramarDialog";
import SubtareaForm from "../components/SubtareaForm";
import { claseEstado, etiquetaEstado } from "../constants";
import {
  fechaDeHoy,
  formatearFecha,
  formatearFechaHora,
  soloFecha,
} from "../utils/fechas";
import {
  avanceDe,
  mensajeHecha,
  mensajePospuesta,
  mensajeReprogramada,
} from "../utils/gestiones";
import { enHoras } from "../utils/horas";

// Clase de la rayita de color del borde izquierdo de cada tarea.
function claseRaya(subtarea, hoy) {
  const estado = claseEstado(subtarea.estado);
  if (estado === "finalizado") return "raya-finalizado";
  if (subtarea.fecha_objetivo < hoy) return "raya-vencida";
  if (estado === "en_progreso") return "raya-en_progreso";
  return "raya-pendiente";
}

function EventoDetalle() {
  const { id } = useParams();
  const hoy = fechaDeHoy();
  const { state, pathname } = useLocation();
  const navigate = useNavigate();

  const [datos, setDatos] = useState({
    id: null,
    evento: null,
    subtareas: [],
    error: "",
  });
  const [mensaje, setMensaje] = useState(state?.mensaje ?? "");
  const [editando, setEditando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState("");
  // Subtarea que se está reprogramando (null si el diálogo está cerrado).
  const [reprogramando, setReprogramando] = useState(null);
  // Cambios de "Editar gestión" que dejarían el día sobrecargado.
  const [sobrecargaAlEditar, setSobrecargaAlEditar] = useState(null);
  const [mensajeSubtareas, setMensajeSubtareas] = useState("");
  // Id de la subtarea que se está editando en la lista (null si ninguna).
  const [editandoSubtarea, setEditandoSubtarea] = useState(null);
  // Subtarea que se pidió eliminar y espera confirmación.
  const [subtareaAEliminar, setSubtareaAEliminar] = useState(null);
  const [eliminandoSubtarea, setEliminandoSubtarea] = useState(false);
  const [errorEliminarSubtarea, setErrorEliminarSubtarea] = useState("");
  // Selección para borrar varias tareas de una. `modoSeleccion` es el que se
  // activa con el botón "Seleccionar" en pantallas táctiles, donde no hay hover.
  const [seleccionadas, setSeleccionadas] = useState(() => new Set());
  const [modoSeleccion, setModoSeleccion] = useState(false);
  const [confirmandoVarias, setConfirmandoVarias] = useState(false);
  const [eliminandoVarias, setEliminandoVarias] = useState(false);
  const [errorSubtareas, setErrorSubtareas] = useState("");
  // Tarea recién marcada como hecha: { gestion, estado, mensaje }. "Deshacer"
  // solo sale mientras el aviso que se ve es el de esa tarea.
  const [hecha, setHecha] = useState(null);
  // Id de la tarea que se está guardando (Hecha o Deshacer).
  const [guardandoId, setGuardandoId] = useState(null);
  // Deshacer chocó con el límite del día: { gestion, estado, conflicto }.
  const [reabrir, setReabrir] = useState(null);
  const [moviendoAlReabrir, setMoviendoAlReabrir] = useState(false);
  const avisoTareasRef = useRef(null);

  // El botón "Hecha" desaparece al marcarla: el foco pasa al aviso.
  useEffect(() => {
    if (hecha || reabrir) avisoTareasRef.current?.focus();
  }, [hecha, reabrir]);

  // El aviso que llega al crear el evento se muestra una sola vez: se quita
  // del historial para que no vuelva a salir al recargar la página.
  useEffect(() => {
    if (state?.mensaje) navigate(pathname, { replace: true, state: null });
  }, [state, pathname, navigate]);

  useEffect(() => {
    let activo = true;

    Promise.all([obtenerEvento(id), listarSubtareas(id)])
      .then(([evento, subtareas]) => {
        if (activo) setDatos({ id, evento, subtareas, error: "" });
      })
      .catch((error) => {
        if (!activo) return;
        setDatos({
          id,
          evento: null,
          subtareas: [],
          error:
            error.status === 404
              ? "El evento no existe o fue eliminado."
              : error.message,
        });
      });

    return () => {
      activo = false;
    };
  }, [id]);

  const cargando = datos.id !== id;
  const { evento, subtareas } = datos;
  const avance = avanceDe(subtareas);
  const horasTotales = subtareas.reduce(
    (total, subtarea) => total + Number(subtarea.horas_estimadas || 0),
    0,
  );

  async function guardarEvento(cambios) {
    const actualizado = await actualizarEvento(id, cambios);
    setDatos((actuales) => ({ ...actuales, evento: actualizado }));
    setEditando(false);
    setMensaje("Evento actualizado correctamente.");
  }

  async function agregarSubtarea(nueva) {
    const creada = await crearSubtarea(id, nueva);
    setMensaje("");
    setDatos((actuales) => ({
      ...actuales,
      subtareas: [...actuales.subtareas, creada],
    }));
  }

  function limpiarAvisosTareas() {
    setMensajeSubtareas("");
    setReabrir(null);
  }

  function reemplazarSubtarea(actualizada) {
    setDatos((actuales) => ({
      ...actuales,
      subtareas: actuales.subtareas.map((subtarea) =>
        subtarea.id === actualizada.id ? actualizada : subtarea,
      ),
    }));
  }

  async function guardarSubtarea(subtarea, cambios) {
    let actualizada;
    try {
      actualizada = await actualizarSubtarea(subtarea.id, cambios);
    } catch (error) {
      // Si el día se pasa del límite, no se guarda nada y se abre el aviso
      // con las salidas (mover, reducir o posponer).
      if (
        error instanceof ApiError &&
        error.status === 409 &&
        error.data?.codigo === "sobrecarga_diaria"
      ) {
        setSobrecargaAlEditar({
          cambios,
          gestion: { ...subtarea, ...cambios },
          conflicto: { ...error.data.conflicto, mensaje: error.message },
        });
        return;
      }
      throw error;
    }
    reemplazarSubtarea(actualizada);
    setEditandoSubtarea(null);
    setMensaje("");
    setMensajeSubtareas(
      `Listo. Se guardaron los cambios de "${actualizada.titulo}".`,
    );
  }

  async function confirmarEliminarSubtarea() {
    setEliminandoSubtarea(true);
    setErrorEliminarSubtarea("");
    try {
      await eliminarSubtarea(subtareaAEliminar.id);
      setSeleccionadas((actuales) => {
        const nuevas = new Set(actuales);
        nuevas.delete(subtareaAEliminar.id);
        return nuevas;
      });
      setDatos((actuales) => ({
        ...actuales,
        subtareas: actuales.subtareas.filter(
          (subtarea) => subtarea.id !== subtareaAEliminar.id,
        ),
      }));
      setMensaje("");
      setMensajeSubtareas(`Listo. Se eliminó "${subtareaAEliminar.titulo}".`);
      setSubtareaAEliminar(null);
    } catch (error) {
      setErrorEliminarSubtarea(error.message);
    } finally {
      setEliminandoSubtarea(false);
    }
  }

  const enSeleccion = modoSeleccion || seleccionadas.size > 0;

  function alternarSeleccion(subtareaId) {
    setSeleccionadas((actuales) => {
      const nuevas = new Set(actuales);
      if (nuevas.has(subtareaId)) nuevas.delete(subtareaId);
      else nuevas.add(subtareaId);
      return nuevas;
    });
  }

  function salirDeSeleccion() {
    setSeleccionadas(new Set());
    setModoSeleccion(false);
  }

  async function eliminarSeleccionadas() {
    const ids = [...seleccionadas];
    setEliminandoVarias(true);

    const resultados = await Promise.allSettled(
      ids.map((subtareaId) => eliminarSubtarea(subtareaId)),
    );
    const borradas = ids.filter((_, i) => resultados[i].status === "fulfilled");
    const fallidas = ids.filter((_, i) => resultados[i].status === "rejected");

    setDatos((actuales) => ({
      ...actuales,
      subtareas: actuales.subtareas.filter(
        (subtarea) => !borradas.includes(subtarea.id),
      ),
    }));
    setMensaje("");
    setConfirmandoVarias(false);
    setEliminandoVarias(false);

    if (fallidas.length === 0) {
      salirDeSeleccion();
      setErrorSubtareas("");
      setMensajeSubtareas(
        borradas.length === 1
          ? "Listo. Se eliminó 1 tarea."
          : `Listo. Se eliminaron ${borradas.length} tareas.`,
      );
      return;
    }

    // Se quedan seleccionadas solo las que fallaron, para reintentar.
    setSeleccionadas(new Set(fallidas));
    limpiarAvisosTareas();
    setErrorSubtareas(
      borradas.length === 0
        ? "No se pudieron eliminar. Vuelve a intentarlo."
        : `Se eliminaron ${borradas.length} de ${ids.length}. Las otras no se pudieron eliminar, vuelve a intentarlo.`,
    );
  }

  function cancelarEliminarSubtarea() {
    setSubtareaAEliminar(null);
    setErrorEliminarSubtarea("");
  }

  // `enviado` llega del diálogo en modo posponer (con la nota que se mandó);
  // desde "Editar tarea" no hay nota.
  function alReprogramar(actualizada, enviado) {
    setReprogramando(null);
    setSobrecargaAlEditar(null);
    setEditandoSubtarea(null);
    setMoviendoAlReabrir(false);
    setReabrir(null);
    reemplazarSubtarea(actualizada);
    setMensaje("");
    setMensajeSubtareas(
      enviado
        ? mensajePospuesta(actualizada, enviado)
        : mensajeReprogramada(actualizada),
    );
  }

  // La barra se calcula con la lista local, así que cambia en el mismo
  // momento en que se reemplaza la tarea.
  async function marcarHecha(subtarea) {
    limpiarAvisosTareas();
    setErrorSubtareas("");
    setMensaje("");
    setGuardandoId(subtarea.id);
    try {
      const actualizada = await ejecutarSubtarea(subtarea.id);
      reemplazarSubtarea(actualizada);
      const avance = avanceDe(
        subtareas.map((s) => (s.id === actualizada.id ? actualizada : s)),
      );
      const texto = mensajeHecha(subtarea, avance);
      setMensajeSubtareas(texto);
      setHecha({ gestion: subtarea, estado: subtarea.estado, mensaje: texto });
    } catch {
      setErrorSubtareas(
        `No pudimos marcar "${subtarea.titulo}" como hecha. Inténtalo de nuevo.`,
      );
    } finally {
      setGuardandoId(null);
    }
  }

  // Igual que en /hoy: si al reabrirla el día se pasa del límite, se explica
  // y se ofrece moverla a otro día.
  async function deshacer() {
    const { gestion, estado: anterior } = hecha;
    setGuardandoId(gestion.id);
    setErrorSubtareas("");
    try {
      const actualizada = await actualizarSubtarea(gestion.id, {
        estado: anterior,
      });
      reemplazarSubtarea(actualizada);
      setHecha(null);
      setMensajeSubtareas(
        `Deshecho. "${gestion.titulo}" vuelve a estar ${etiquetaEstado(anterior).toLowerCase()}.`,
      );
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.status === 409 &&
        error.data?.codigo === "sobrecarga_diaria"
      ) {
        setHecha(null);
        setMensajeSubtareas("");
        setReabrir({
          gestion,
          estado: anterior,
          conflicto: { ...error.data.conflicto, mensaje: error.message },
        });
      } else {
        setErrorSubtareas("No pudimos deshacerlo. Inténtalo de nuevo.");
      }
    } finally {
      setGuardandoId(null);
    }
  }

  async function confirmarEliminar() {
    setEliminando(true);
    setErrorEliminar("");
    try {
      await eliminarEvento(id);
      navigate("/eventos", {
        state: { mensaje: "Evento eliminado correctamente." },
      });
    } catch (error) {
      setErrorEliminar(error.message);
      setEliminando(false);
    }
  }

  function cancelarEliminar() {
    setConfirmando(false);
    setErrorEliminar("");
  }

  if (cargando) {
    return (
      <Layout>
        <section className="content-card">
          <p>Cargando evento...</p>
        </section>
      </Layout>
    );
  }

  if (datos.error) {
    return (
      <Layout>
        <section className="content-card">
          <p className="alert-error" role="alert">
            {datos.error}
          </p>
          <Link to="/eventos">Volver a la lista de eventos</Link>
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      <Link className="volver" to="/eventos">
        ← Eventos
      </Link>

      <div className="encabezado-fila">
        <div>
          <h1>{evento.nombre}</h1>
          <p className="sub">{formatearFechaHora(evento.fecha_hora)}</p>
        </div>

        {!editando && (
          <div className="acciones">
            <button
              type="button"
              className="btn linea"
              onClick={() => {
                setMensaje("");
                setEditando(true);
              }}
            >
              Editar
            </button>
            <button
              type="button"
              className="btn linea peligro"
              onClick={() => setConfirmando(true)}
            >
              Eliminar
            </button>
          </div>
        )}
      </div>

      {mensaje && (
        <p className="alert-success" role="status">
          {mensaje}
        </p>
      )}

      {editando ? (
        <section className="panel panel-relleno formulario edicion-evento">
          <EventoForm
            evento={evento}
            textoBoton="Guardar cambios"
            onSubmit={guardarEvento}
            onCancelar={() => setEditando(false)}
          />
        </section>
      ) : (
        <dl className="panel detail-list">
          <div>
            <dt>Tipo</dt>
            <dd>{evento.tipo}</dd>
          </div>
          <div>
            <dt>Cliente</dt>
            <dd>{evento.cliente_nombre || evento.cliente_contacto}</dd>
          </div>
          {evento.cliente_telefono && (
            <div>
              <dt>Teléfono del cliente</dt>
              <dd>{evento.cliente_telefono}</dd>
            </div>
          )}
          {evento.cliente_correo && (
            <div>
              <dt>Correo del cliente</dt>
              <dd>{evento.cliente_correo}</dd>
            </div>
          )}
          <div>
            <dt>Lugar</dt>
            <dd>{evento.lugar}</dd>
          </div>
        </dl>
      )}

      <section className="panel hoy-group">
        <div className="grupo-cabecera section-header">
          <h2>Mis tareas</h2>
          {subtareas.length > 0 && (
            <button
              type="button"
              className="enlace"
              onClick={() =>
                modoSeleccion ? salirDeSeleccion() : setModoSeleccion(true)
              }
            >
              {modoSeleccion ? "Listo" : "Seleccionar"}
            </button>
          )}
          {subtareas.length > 0 && (
            <span className="grupo-resumen status">
              {subtareas.length === 1
                ? "1 tarea"
                : `${subtareas.length} tareas`}
              , {enHoras(horasTotales)} estimadas
            </span>
          )}
        </div>

        {subtareas.length > 0 && (
          <div className="avance-evento">
            <div className="avance-cabecera">
              <h3 id="avance-evento-titulo">Avance del evento</h3>
              <strong>{avance.porcentaje} %</strong>
            </div>
            <BarraProgreso avance={avance} idEtiqueta="avance-evento-titulo" />
          </div>
        )}

        {mensajeSubtareas && (
          <p
            className="alert-success aviso-con-accion"
            role="status"
            tabIndex={-1}
            ref={avisoTareasRef}
          >
            <span>{mensajeSubtareas}</span>
            {hecha?.mensaje === mensajeSubtareas && (
              <button
                type="button"
                className="enlace"
                disabled={guardandoId === hecha.gestion.id}
                onClick={deshacer}
              >
                {guardandoId === hecha.gestion.id
                  ? "Deshaciendo..."
                  : "Deshacer"}
              </button>
            )}
          </p>
        )}

        {reabrir && (
          <p
            className="alert-error aviso-con-accion"
            role="alert"
            tabIndex={-1}
            ref={avisoTareasRef}
          >
            <span>
              No pudimos reabrir "{reabrir.gestion.titulo}": ese día ya está
              lleno. {reabrir.conflicto.mensaje}.
            </span>
            <button
              type="button"
              className="enlace"
              onClick={() => setMoviendoAlReabrir(true)}
            >
              Posponer a otro día
            </button>
          </p>
        )}

        {errorSubtareas && (
          <p className="alert-error" role="alert">
            {errorSubtareas}
          </p>
        )}

        {enSeleccion && subtareas.length > 0 && (
          <div
            className="barra-seleccion"
            role="region"
            aria-label="Tareas seleccionadas"
          >
            <span aria-live="polite">
              {seleccionadas.size === 1
                ? "1 seleccionada"
                : `${seleccionadas.size} seleccionadas`}
            </span>
            <div>
              <button
                type="button"
                className="enlace"
                onClick={() =>
                  setSeleccionadas(new Set(subtareas.map((s) => s.id)))
                }
              >
                Seleccionar todas
              </button>
              <button
                type="button"
                className="enlace"
                onClick={salirDeSeleccion}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-danger"
                disabled={seleccionadas.size === 0}
                onClick={() => {
                  setErrorSubtareas("");
                  setConfirmandoVarias(true);
                }}
              >
                Eliminar
              </button>
            </div>
          </div>
        )}

        {subtareas.length === 0 ? (
          <p className="grupo-vacio">Este evento todavía no tiene tareas.</p>
        ) : (
          <ul className={`subtask-list${enSeleccion ? " en-seleccion" : ""}`}>
            {subtareas.map((subtarea) =>
              editandoSubtarea === subtarea.id ? (
                <li key={subtarea.id} className="editando">
                  <h3>Editar tarea</h3>
                  <SubtareaForm
                    subtarea={subtarea}
                    onSubmit={(cambios) => guardarSubtarea(subtarea, cambios)}
                    onCancelar={() => setEditandoSubtarea(null)}
                  />
                </li>
              ) : (
                <li
                  key={subtarea.id}
                  className={`${claseRaya(subtarea, hoy)}${seleccionadas.has(subtarea.id) ? " seleccionada" : ""}`}
                >
                  {/* Espacio reservado: la casilla flota encima, en su zona. */}
                  <span aria-hidden="true" />
                  <label className="zona-casilla">
                    <input
                      type="checkbox"
                      aria-label={`Seleccionar ${subtarea.titulo}`}
                      checked={seleccionadas.has(subtarea.id)}
                      onChange={() => alternarSeleccion(subtarea.id)}
                    />
                    <span className="caja" aria-hidden="true" />
                  </label>
                  <div>
                    <strong>{subtarea.titulo}</strong>
                    {subtarea.descripcion && <p>{subtarea.descripcion}</p>}
                    {subtarea.nota && (
                      <p className="fila-nota">Nota: {subtarea.nota}</p>
                    )}
                    <small>
                      {formatearFecha(subtarea.fecha_objetivo)} ·{" "}
                      {enHoras(subtarea.horas_estimadas)}
                    </small>
                  </div>
                  <div className="subtask-acciones">
                    <span
                      className={`subtask-status ${claseEstado(subtarea.estado)}`}
                    >
                      {etiquetaEstado(subtarea.estado)}
                    </span>
                    <div className="subtask-botones">
                      {subtarea.estado !== "finalizado" && (
                        <button
                          type="button"
                          className="btn chico"
                          aria-label={`Marcar ${subtarea.titulo} como hecha`}
                          disabled={guardandoId !== null}
                          onClick={() => marcarHecha(subtarea)}
                        >
                          {guardandoId === subtarea.id
                            ? "Guardando..."
                            : "Hecha"}
                        </button>
                      )}
                      <button
                        type="button"
                        className="enlace"
                        aria-label={`Editar ${subtarea.titulo}`}
                        onClick={() => {
                          limpiarAvisosTareas();
                          setEditandoSubtarea(subtarea.id);
                        }}
                      >
                        Editar
                      </button>
                      {subtarea.estado !== "finalizado" && (
                        <button
                          type="button"
                          className="enlace"
                          aria-label={`Posponer ${subtarea.titulo}`}
                          onClick={() => {
                            limpiarAvisosTareas();
                            setReprogramando(subtarea);
                          }}
                        >
                          Posponer
                        </button>
                      )}
                      <button
                        type="button"
                        className="enlace rojo"
                        aria-label={`Eliminar ${subtarea.titulo}`}
                        onClick={() => {
                          limpiarAvisosTareas();
                          setSubtareaAEliminar(subtarea);
                        }}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </li>
              ),
            )}
          </ul>
        )}
      </section>

      <section className="panel panel-relleno">
        <h2>Agregar tarea</h2>
        <SubtareaForm onSubmit={agregarSubtarea} />
      </section>

      {reprogramando && (
        <ReprogramarDialog
          key={reprogramando.id}
          gestion={reprogramando}
          fechaMaxima={soloFecha(evento.fecha_hora)}
          onCerrar={() => setReprogramando(null)}
          onGuardado={alReprogramar}
        />
      )}

      {reabrir && moviendoAlReabrir && (
        <ReprogramarDialog
          key={`reabrir-${reabrir.gestion.id}`}
          gestion={reabrir.gestion}
          fechaMaxima={soloFecha(evento.fecha_hora)}
          conflictoInicial={reabrir.conflicto}
          pendientes={{ estado: reabrir.estado }}
          onCerrar={() => setMoviendoAlReabrir(false)}
          onGuardado={alReprogramar}
        />
      )}

      {sobrecargaAlEditar && (
        <ReprogramarDialog
          key={`editar-${sobrecargaAlEditar.gestion.id}`}
          modo="editar"
          gestion={sobrecargaAlEditar.gestion}
          conflictoInicial={sobrecargaAlEditar.conflicto}
          pendientes={sobrecargaAlEditar.cambios}
          onCerrar={() => setSobrecargaAlEditar(null)}
          onGuardado={alReprogramar}
        />
      )}

      <ConfirmDialog
        abierto={subtareaAEliminar !== null}
        titulo="¿Deseas eliminar esta tarea?"
        mensaje={`Esta acción no se puede deshacer. Se eliminará "${subtareaAEliminar?.titulo ?? ""}".`}
        textoConfirmar="Sí, eliminar"
        procesando={eliminandoSubtarea}
        error={errorEliminarSubtarea}
        onConfirmar={confirmarEliminarSubtarea}
        onCancelar={cancelarEliminarSubtarea}
      />

      <ConfirmDialog
        abierto={confirmandoVarias}
        titulo={
          seleccionadas.size === 1
            ? "¿Eliminar esta tarea?"
            : `¿Eliminar ${seleccionadas.size} tareas?`
        }
        mensaje="Esta acción no se puede deshacer."
        textoConfirmar="Sí, eliminar"
        procesando={eliminandoVarias}
        onConfirmar={eliminarSeleccionadas}
        onCancelar={() => setConfirmandoVarias(false)}
      />

      <ConfirmDialog
        abierto={confirmando}
        titulo="¿Deseas eliminar este evento?"
        mensaje={`Esta acción no se puede deshacer. Se eliminará "${evento.nombre}" junto con sus tareas.`}
        textoConfirmar="Sí, eliminar"
        procesando={eliminando}
        error={errorEliminar}
        onConfirmar={confirmarEliminar}
        onCancelar={cancelarEliminar}
      />
    </Layout>
  );
}

export default EventoDetalle;
