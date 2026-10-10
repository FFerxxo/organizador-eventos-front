import { useEffect, useState } from "react";
import { erroresDeApi } from "../api/client";
import { actualizarLimiteDiario, obtenerLimiteDiario } from "../api/limite";
import abejorroConfig from "../assets/brand/abejorro-config.svg";
import Campo from "../components/Campo";
import Layout from "../components/Layout";
import { LIMITE_DIARIO } from "../constants";
import { numeroDeHoras } from "../utils/horas";
import { validarLimiteDiario } from "../utils/validaciones";

// Valor para el campo de número: "6.00" -> "6", "4.50" -> "4.5"
const sinCeros = (horas) => String(Number(horas));

const enHoras = (horas) =>
  `${numeroDeHoras(horas)} ${Number(horas) === 1 ? "hora" : "horas"}`;

function Configuracion() {
  const [limite, setLimite] = useState(null);
  const [valor, setValor] = useState("");
  const [errorCarga, setErrorCarga] = useState("");
  const [errorCampo, setErrorCampo] = useState("");
  const [errorGeneral, setErrorGeneral] = useState("");
  const [mensajeExito, setMensajeExito] = useState("");
  const [guardando, setGuardando] = useState(false);
  // Cambia cada vez que se pulsa "Reintentar" para repetir la petición.
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let activo = true;

    obtenerLimiteDiario()
      .then((datos) => {
        if (!activo) return;
        setLimite(datos.limite_horas_dia);
        setValor(sinCeros(datos.limite_horas_dia));
      })
      .catch((err) => activo && setErrorCarga(err.message));

    return () => {
      activo = false;
    };
  }, [intento]);

  function reintentar() {
    setErrorCarga("");
    setIntento((actual) => actual + 1);
  }

  function handleChange(e) {
    setValor(e.target.value);
    setErrorCampo("");
    setMensajeExito("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorGeneral("");
    setMensajeExito("");

    const error = validarLimiteDiario(valor);
    setErrorCampo(error);
    if (error) return;

    setGuardando(true);
    try {
      const datos = await actualizarLimiteDiario(Number(valor));
      setLimite(datos.limite_horas_dia);
      setValor(sinCeros(datos.limite_horas_dia));
      setMensajeExito(
        `Listo. Tu límite ahora es de ${enHoras(datos.limite_horas_dia)} por día.`,
      );
    } catch (err) {
      const { campos, general } = erroresDeApi(err, ["limite_horas_dia"]);
      setErrorCampo(campos.limite_horas_dia ?? "");
      setErrorGeneral(campos.limite_horas_dia ? "" : general);
    } finally {
      setGuardando(false);
    }
  }

  if (errorCarga) {
    return (
      <Layout>
        <section className="panel hoy-state" role="alert">
          <h2>No pudimos cargar tu límite diario</h2>
          <p>{errorCarga}</p>
          <p>Tu límite no cambió. Revisa tu conexión e inténtalo de nuevo.</p>
          <button type="button" className="btn-link" onClick={reintentar}>
            Reintentar
          </button>
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      <header className="encabezado">
        <h1>Configuración</h1>
        <p className="sub">Ajustes de tu trabajo diario.</p>
      </header>

      <div className="config">
        <section className="panel panel-relleno formulario">
          <h2>Límite diario de horas</h2>
          <p>
            Es el máximo de horas de gestión que quieres dedicarle a tus eventos
            en un día. Si al reprogramar una gestión te pasas de este límite, te
            avisamos antes de guardar.
          </p>

          {limite === null ? (
            <p role="status">Cargando tu límite...</p>
          ) : (
            <>
              <p className="limite-actual">
                Tu límite actual: <strong>{enHoras(limite)} por día</strong>
              </p>

              <form className="form-grid" onSubmit={handleSubmit} noValidate>
                {errorGeneral && (
                  <p className="alert-error" role="alert">
                    {errorGeneral}
                  </p>
                )}
                {mensajeExito && (
                  <p className="alert-success" role="status">
                    {mensajeExito}
                  </p>
                )}

                <div className="campo-corto">
                  <Campo
                    type="number"
                    inputMode="decimal"
                    min={LIMITE_DIARIO.minimo}
                    max={LIMITE_DIARIO.maximo}
                    step="0.5"
                    label="Horas por día"
                    name="limite_horas_dia"
                    ayuda={`Por ahora el límite es de ${LIMITE_DIARIO.porDefecto} horas por día. Estamos trabajando para ti.`}
                    value={valor}
                    onChange={handleChange}
                    error={errorCampo}
                  />
                </div>

                <div className="form-actions">
                  <button type="submit" disabled={guardando}>
                    {guardando ? "Guardando..." : "Guardar límite"}
                  </button>
                </div>
              </form>
            </>
          )}
        </section>

        <aside className="vidrio config-adorno">
          <img src={abejorroConfig} alt="" />
          <strong>Todo a tu medida</strong>
          <p>Ajusta tu ritmo y la colmena trabaja contigo.</p>
        </aside>
      </div>
    </Layout>
  );
}

export default Configuracion;
