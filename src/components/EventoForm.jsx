import { useState } from "react";
import { erroresDeApi } from "../api/client";
import { TIPOS_EVENTO } from "../constants";
import { aInputFechaHora } from "../utils/fechas";
import { validarEvento } from "../utils/validaciones";
import Campo from "./Campo";

const CAMPOS = [
  "nombre",
  "tipo",
  "cliente_nombre",
  "cliente_telefono",
  "cliente_correo",
  "fecha_hora",
  "lugar",
];

function valoresIniciales(evento) {
  return {
    nombre: evento?.nombre ?? "",
    tipo: evento?.tipo ?? "",
    // Los eventos de antes solo tenían un texto de contacto: va como nombre.
    cliente_nombre: evento?.cliente_nombre ?? evento?.cliente_contacto ?? "",
    cliente_telefono: evento?.cliente_telefono ?? "",
    cliente_correo: evento?.cliente_correo ?? "",
    fecha_hora: aInputFechaHora(evento?.fecha_hora),
    lugar: evento?.lugar ?? "",
  };
}

function EventoForm({ evento, textoBoton, onSubmit, onCancelar }) {
  const [valores, setValores] = useState(() => valoresIniciales(evento));
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState("");
  const [enviando, setEnviando] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setValores((actuales) => ({ ...actuales, [name]: value }));
    setErrores((actuales) => ({ ...actuales, [name]: undefined }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const nuevosErrores = validarEvento(valores);
    setErrores(nuevosErrores);
    setErrorGeneral("");
    if (Object.keys(nuevosErrores).length > 0) return;

    const datos = Object.fromEntries(
      CAMPOS.map((campo) => [campo, valores[campo].trim()]),
    );

    setEnviando(true);
    try {
      await onSubmit(datos);
    } catch (error) {
      const { campos, general } = erroresDeApi(error, CAMPOS);
      setErrores(campos);
      setErrorGeneral(general);
      setEnviando(false);
    }
  }

  return (
    <form className="form-grid" onSubmit={handleSubmit} noValidate>
      {errorGeneral && (
        <p className="alert-error" role="alert">
          {errorGeneral}
        </p>
      )}

      <Campo
        label="Nombre del evento"
        name="nombre"
        placeholder="Ejemplo: Boda de Ana y Luis"
        value={valores.nombre}
        onChange={handleChange}
        error={errores.nombre}
      />

      <div className="form-row">
        <Campo
          as="select"
          label="Tipo de evento"
          name="tipo"
          value={valores.tipo}
          onChange={handleChange}
          error={errores.tipo}
        >
          <option value="">Selecciona un tipo</option>
          {TIPOS_EVENTO.map((tipo) => (
            <option key={tipo.value} value={tipo.value}>
              {tipo.label}
            </option>
          ))}
        </Campo>

        <Campo
          type="datetime-local"
          label="Fecha y hora del evento"
          name="fecha_hora"
          value={valores.fecha_hora}
          onChange={handleChange}
          error={errores.fecha_hora}
        />
      </div>

      <Campo
        label="Lugar"
        name="lugar"
        placeholder="Ejemplo: Hacienda El Roble"
        value={valores.lugar}
        onChange={handleChange}
        error={errores.lugar}
      />

      <Campo
        label="Nombre del cliente"
        name="cliente_nombre"
        placeholder="Ejemplo: Ana Gómez"
        autoComplete="off"
        value={valores.cliente_nombre}
        onChange={handleChange}
        error={errores.cliente_nombre}
      />

      <div className="form-row">
        <Campo
          type="tel"
          label="Teléfono del cliente"
          name="cliente_telefono"
          placeholder="Ejemplo: 300 123 4567"
          autoComplete="off"
          ayuda="Escribe el teléfono, el correo o los dos."
          value={valores.cliente_telefono}
          onChange={handleChange}
          error={errores.cliente_telefono}
        />

        <Campo
          type="email"
          label="Correo del cliente"
          name="cliente_correo"
          placeholder="Ejemplo: ana@correo.com"
          autoComplete="off"
          value={valores.cliente_correo}
          onChange={handleChange}
          error={errores.cliente_correo}
        />
      </div>

      <div className="form-actions">
        {onCancelar && (
          <button
            type="button"
            className="btn-secondary"
            onClick={onCancelar}
            disabled={enviando}
          >
            Cancelar
          </button>
        )}
        <button type="submit" disabled={enviando}>
          {enviando ? "Guardando..." : textoBoton}
        </button>
      </div>
    </form>
  );
}

export default EventoForm;
