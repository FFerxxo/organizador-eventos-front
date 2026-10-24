import { useNavigate } from "react-router-dom";
import { crearEvento } from "../api/eventos";
import EventoForm from "../components/EventoForm";
import Layout from "../components/Layout";
import { useTitulo } from "../utils/useTitulo";

function CrearEvento() {
  useTitulo("Crear evento");
  const navigate = useNavigate();

  async function handleSubmit(datos) {
    const evento = await crearEvento({ ...datos, estado: "pendiente" });
    navigate(`/evento/${evento.id}`, {
      state: { mensaje: "Evento creado correctamente." },
    });
  }

  return (
    <Layout>
      <header className="encabezado">
        <h1>Crear evento</h1>
        <p className="sub">
          Registra los datos principales. Al guardar podrás agregar sus
          tareas.
        </p>
      </header>

      <section className="panel panel-relleno formulario">
        <EventoForm
          textoBoton="Guardar evento"
          onSubmit={handleSubmit}
          onCancelar={() => navigate("/eventos")}
        />
      </section>
    </Layout>
  );
}

export default CrearEvento;
