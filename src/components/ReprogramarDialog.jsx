import { useEffect, useRef, useState } from "react";
import { ApiError, erroresDeApi } from "../api/client";
import { actualizarSubtarea } from "../api/eventos";
import { formatearFecha, formatearFechaConDia } from "../utils/fechas";
import { enHoras } from "../utils/horas";
import Campo from "./Campo";

// Flechita al final de cada salida del aviso de sobrecarga.
function Flecha() {
  return (
    <svg className="flecha" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

// Diálogo para cambiar la fecha y las horas de una gestión. Si el día elegido
// queda por encima del límite diario, el backend responde 409 con las cifras y
// aquí se ofrecen las tres salidas: mover a otro día, reducir las horas o
// posponer.
//
// Desde "Editar gestión" se abre ya en el aviso (`conflictoInicial`) y
// `pendientes` trae el resto de lo que la persona cambió (título, estado...),
// para que se guarde junto con la salida que elija.
function ReprogramarDialog({
  gestion,
  conflictoInicial = null,
  pendientes = {},
  onCerrar,
  onGuardado,
}) {
  const dialogRef = useRef(null);
  const tituloRef = useRef(null);

  // "fecha" (elegir día), "conflicto" (aviso con cifras) o "reducir" (horas).
  const [paso, setPaso] = useState(conflictoInicial ? "conflicto" : "fecha");
  const [fecha, setFecha] = useState(gestion.fecha_objetivo);
  const [horasGestion, setHorasGestion] = useState(
    String(Number(gestion.horas_estimadas)),
  );
  const [horas, setHoras] = useState("");
  const [conflicto, setConflicto] = useState(conflictoInicial);
  const [errorCampo, setErrorCampo] = useState("");
  const [errorHoras, setErrorHoras] = useState("");
  const [errorGeneral, setErrorGeneral] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    dialogRef.current.showModal();
  }, []);

  // En cada paso el foco va al campo que hay que llenar; si el paso no tiene
  // campo (el aviso de conflicto), va al título para que el lector de
  // pantalla anuncie dónde quedó la persona.
  useEffect(() => {
    const campo = dialogRef.current.querySelector("input");
    (campo ?? tituloRef.current)?.focus();
  }, [paso]);

  function cerrar() {
    if (guardando) return;
    dialogRef.current.close();
    onCerrar();
  }

  function irA(nuevoPaso) {
    setErrorCampo("");
    setErrorHoras("");
    setErrorGeneral("");
    setPaso(nuevoPaso);
  }

  async function guardar(cambios) {
    setGuardando(true);
    setErrorCampo("");
    setErrorHoras("");
    setErrorGeneral("");

    try {
      const actualizada = await actualizarSubtarea(gestion.id, {
        ...pendientes,
        ...cambios,
      });
      dialogRef.current.close();
      onGuardado(actualizada);
    } catch (error) {
      setGuardando(false);

      if (
        error instanceof ApiError &&
        error.status === 409 &&
        error.data?.codigo === "sobrecarga_diaria"
      ) {
        setConflicto({ ...error.data.conflicto, mensaje: error.message });
        setPaso("conflicto");
        return;
      }

      const { campos, general } = erroresDeApi(error, [
        "fecha_objetivo",
        "horas_estimadas",
      ]);
      setErrorCampo(campos.fecha_objetivo ?? "");
      setErrorHoras(campos.horas_estimadas ?? "");
      setErrorGeneral(
        campos.fecha_objetivo || campos.horas_estimadas ? "" : general,
      );
    }
  }

  // Si en el formulario cambiaron las horas, las salidas "otro día" y
  // "posponer" las llevan consigo.
  function horasCambiadas() {
    const nuevas = Number(horasGestion);
    return nuevas > 0 && nuevas !== Number(gestion.horas_estimadas)
      ? { horas_estimadas: nuevas }
      : {};
  }

  function enviarFecha(e) {
    e.preventDefault();

    const nuevasHoras = Number(horasGestion);
    const cambiaFecha = fecha !== gestion.fecha_objetivo;
    const cambiaHoras = nuevasHoras !== Number(gestion.horas_estimadas);

    setErrorCampo("");
    setErrorHoras("");
    if (!fecha) {
      setErrorCampo("Elige la nueva fecha.");
      return;
    }
    if (horasGestion === "" || Number.isNaN(nuevasHoras) || nuevasHoras <= 0) {
      setErrorHoras("Las horas estimadas deben ser mayores a 0.");
      return;
    }
    if (!cambiaFecha && !cambiaHoras) {
      setErrorCampo("No hay nada que cambiar. Elige otro día u otras horas.");
      return;
    }
    guardar({
      fecha_objetivo: fecha,
      ...horasCambiadas(),
    });
  }

  function enviarHoras(e) {
    e.preventDefault();

    const nuevas = Number(horas);
    if (horas === "" || Number.isNaN(nuevas) || nuevas <= 0) {
      setErrorCampo("Escribe las nuevas horas, mayores a 0.");
      return;
    }
    if (nuevas > horasLibres) {
      setErrorCampo("Es más de lo que cabe ese día.");
      return;
    }
    if (nuevas >= horasAReducir) {
      setErrorCampo(
        `Para reducir, escribe menos de las ${enHoras(horasAReducir)} que tiene ahora.`,
      );
      return;
    }
    guardar({ fecha_objetivo: conflicto.fecha, horas_estimadas: nuevas });
  }

  // Horas con las que la gestión chocó ese día (puede ser más de las que tenía
  // guardadas, si se las subieron al editar).
  const horasAReducir = Number(
    conflicto?.horas_gestion ?? gestion.horas_estimadas,
  );

  // Para la barra del aviso: lo planificado frente al límite del día.
  const planificadas = Number(conflicto?.horas_planificadas ?? 0);
  const limite = Number(conflicto?.limite_horas_dia ?? 0);
  const escala = Math.max(planificadas, limite, 1);
  const porcentaje = (horas) => `${(Math.max(horas, 0) / escala) * 100}%`;

  // Horas que todavía caben ese día con las demás gestiones ya planificadas.
  const horasLibres = conflicto
    ? Number(
        conflicto.horas_disponibles ??
          Math.max(
            0,
            Number(conflicto.limite_horas_dia) -
              Number(conflicto.horas_otras_gestiones),
          ),
      )
    : 0;

  // Días cercanos donde la gestión sí cabe, calculados por el backend.
  const sugeridas = conflicto?.fechas_sugeridas;

  // Primer día posterior donde la gestión cabe: null si no hay ninguno antes
  // del evento.
  const posponer = conflicto?.fecha_posponer;

  return (
    <dialog
      ref={dialogRef}
      className="confirm-dialog reprogramar-dialog"
      aria-labelledby="reprogramar-titulo"
      onCancel={(e) => {
        e.preventDefault();
        cerrar();
      }}
    >
      {paso === "fecha" && (
        <form onSubmit={enviarFecha} noValidate>
          <h3 id="reprogramar-titulo" ref={tituloRef} tabIndex={-1}>
            {conflicto ? "Mover a otro día" : "Reprogramar gestión"}
          </h3>
          {!conflicto && (
            <p>
              <strong>{gestion.titulo}</strong> está para el{" "}
              {formatearFecha(gestion.fecha_objetivo)} y toma{" "}
              {enHoras(gestion.horas_estimadas)}.
            </p>
          )}

          {sugeridas?.length > 0 && (
            <div className="fechas-sugeridas">
              <p id="sugeridas-titulo">Días cercanos donde sí te cabe:</p>
              <ul aria-labelledby="sugeridas-titulo">
                {sugeridas.map((sugerida) => (
                  <li key={sugerida.fecha}>
                    <button
                      type="button"
                      className="btn-suave"
                      disabled={guardando}
                      onClick={() =>
                        guardar({
                          fecha_objetivo: sugerida.fecha,
                          ...horasCambiadas(),
                        })
                      }
                    >
                      <strong>{formatearFechaConDia(sugerida.fecha)}</strong>
                      <span>
                        quedarías con {enHoras(sugerida.horas_planificadas)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {sugeridas?.length === 0 && (
            <p>
              No hay un día cercano con espacio antes del evento. Elige tú la
              fecha o vuelve y reduce las horas.
            </p>
          )}

          <div className="form-grid">
            {errorGeneral && (
              <p className="alert-error" role="alert">
                {errorGeneral}
              </p>
            )}

            <Campo
              type="date"
              label={
                sugeridas?.length > 0 ? "O elige otra fecha" : "Nueva fecha"
              }
              name="fecha_objetivo"
              value={fecha}
              onChange={(e) => {
                setFecha(e.target.value);
                setErrorCampo("");
              }}
              error={errorCampo}
            />

            <Campo
              type="number"
              inputMode="decimal"
              min="0.5"
              step="0.5"
              label="Horas estimadas"
              name="horas_estimadas"
              value={horasGestion}
              onChange={(e) => {
                setHorasGestion(e.target.value);
                setErrorCampo("");
                setErrorHoras("");
              }}
              error={errorHoras}
            />
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={cerrar}
              disabled={guardando}
            >
              Cancelar
            </button>
            <button type="submit" disabled={guardando}>
              {guardando ? "Guardando..." : "Reprogramar"}
            </button>
          </div>
        </form>
      )}

      {paso === "conflicto" && (
        <div className="conflicto">
          <span className="conflicto-icono" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path
                d="M12 3.5 2.5 20h19L12 3.5z"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <path
                d="M12 10v4.5"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
              <circle cx="12" cy="17.2" r="1.2" fill="currentColor" />
            </svg>
          </span>

          <h3
            id="reprogramar-titulo"
            className="conflicto-titulo"
            ref={tituloRef}
            tabIndex={-1}
          >
            Ese día quedaría sobrecargado
          </h3>

          <p className="conflicto-cifras" role="alert">
            {conflicto.mensaje}
          </p>

          <div className="conflicto-barra" aria-hidden="true">
            <span className="dentro" style={{ width: porcentaje(Math.min(planificadas, limite)) }} />
            <span className="exceso" style={{ width: porcentaje(planificadas - limite) }} />
            <i style={{ left: porcentaje(limite) }} />
          </div>

          {errorGeneral && (
            <p className="alert-error" role="alert">
              {errorGeneral}
            </p>
          )}

          <div className="conflicto-opciones">
            <button type="button" onClick={() => irA("fecha")}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
                <path d="M3.5 10h17M8 3v4M16 3v4" />
              </svg>
              <span>Mover a otro día</span>
              <Flecha />
            </button>
            <button
              type="button"
              onClick={() => {
                setHoras("");
                irA("reducir");
              }}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="8.5" />
                <path d="M12 7.5V12l3 2" />
              </svg>
              <span>Reducir horas estimadas</span>
              <Flecha />
            </button>
            {posponer && (
              <button
                type="button"
                disabled={guardando}
                onClick={() =>
                  guardar({
                    fecha_objetivo: posponer.fecha,
                    ...horasCambiadas(),
                  })
                }
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5 6l7 6-7 6M13 6l7 6-7 6" />
                </svg>
                <span>
                  {guardando
                    ? "Guardando..."
                    : "Posponer al siguiente día disponible"}
                </span>
                <Flecha />
              </button>
            )}
          </div>

          <button
            type="button"
            className="conflicto-cancelar"
            onClick={cerrar}
            disabled={guardando}
          >
            Cancelar
          </button>
        </div>
      )}

      {paso === "reducir" && (
        <form onSubmit={enviarHoras} noValidate>
          <h3 id="reprogramar-titulo" ref={tituloRef} tabIndex={-1}>
            Reducir horas estimadas
          </h3>
          {horasLibres === 0 && (
            <p>Ese día ya está lleno con tus otras gestiones. Mejor muévela a otro día.</p>
          )}

          {horasLibres > 0 && (
            <div className="form-grid">
              {errorGeneral && (
                <p className="alert-error" role="alert">
                  {errorGeneral}
                </p>
              )}

              <Campo
                type="number"
                inputMode="decimal"
                min="0.5"
                step="0.5"
                label="Nuevas horas estimadas"
                name="horas_estimadas"
                ayuda={`Máximo ${enHoras(horasLibres)} para que quepa ese día.`}
                value={horas}
                onChange={(e) => {
                  setHoras(e.target.value);
                  setErrorCampo("");
                }}
                error={errorCampo}
              />
            </div>
          )}

          <div className="form-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => irA("conflicto")}
              disabled={guardando}
            >
              Volver
            </button>
            {horasLibres > 0 ? (
              <button type="submit" disabled={guardando}>
                {guardando ? "Guardando..." : "Guardar horas"}
              </button>
            ) : (
              <button type="button" onClick={() => irA("fecha")}>
                Mover a otro día
              </button>
            )}
          </div>
        </form>
      )}
    </dialog>
  );
}

export default ReprogramarDialog;
