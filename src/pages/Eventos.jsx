import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { listarEventos } from "../api/eventos";
import abejorroEventos from "../assets/brand/abejorro-eventos.svg";
import Layout from "../components/Layout";
import { partesDeFecha, soloFecha } from "../utils/fechas";

const hora = (valor) =>
  new Date(valor).toLocaleTimeString("es", {
    hour: "numeric",
    minute: "2-digit",
  });

function Eventos() {
  const { state } = useLocation();
  const [eventos, setEventos] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let activo = true;
    listarEventos()
      .then((lista) => activo && setEventos(lista))
      .catch((err) => activo && setError(err.message));
    return () => {
      activo = false;
    };
  }, []);

  // Sin eventos, el único botón de crear es el del aviso de la página.
  return (
    <Layout ocultarCrear={eventos?.length === 0}>
      <header className="encabezado encabezado-eventos">
        <div>
          <h1>Eventos</h1>
          <p className="sub">Todo lo que estás organizando.</p>
        </div>
        <img src={abejorroEventos} alt="" />
      </header>

      {state?.mensaje && (
        <p className="alert-success" role="status">
          {state.mensaje}
        </p>
      )}

      {error && (
        <p className="alert-error" role="alert">
          {error}
        </p>
      )}

      {!error && eventos === null && <p role="status">Cargando eventos...</p>}

      {eventos?.length === 0 && (
        <div className="panel empty-state">
          <h2>Aún no tienes eventos</h2>
          <p>
            Crea tu primer evento para comenzar a organizar tus tareas
            logísticas.
          </p>
          <Link className="btn-link" to="/crear">
            Crear evento
          </Link>
        </div>
      )}

      {eventos?.length > 0 && (
        <ul className="panel event-list">
          {eventos.map((evento) => {
            const { dia, mes } = partesDeFecha(soloFecha(evento.fecha_hora));

            return (
              <li key={evento.id}>
                <Link to={`/evento/${evento.id}`}>
                  <span className="dia-mes">
                    <b>{dia}</b>
                    <span>{mes}</span>
                  </span>
                  <div>
                    <h3>{evento.nombre}</h3>
                    <p>
                      {evento.tipo}, {hora(evento.fecha_hora)}, {evento.lugar}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Layout>
  );
}

export default Eventos;
