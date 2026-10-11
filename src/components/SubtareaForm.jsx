import { useState } from "react";
import { erroresDeApi } from "../api/client";
import { ESTADOS_SUBTAREA, normalizarEstado } from "../constants";
import { validarSubtarea } from "../utils/validaciones";
import Campo from "./Campo";

const CAMPOS = [
  "titulo",
  "descripcion",
  "fecha_objetivo",
  "horas_estimadas",
  "estado",
];

const VALORES_INICIALES = {
  titulo: "",
  descripcion: "",
  fecha_objetivo: "",
  horas_estimadas: "",
  estado: ESTADOS_SUBTAREA[0].value,
};

function valoresDe(subtarea) {
  return {
    titulo: subtarea.titulo ?? "",
    descripcion: subtarea.descripcion ?? "",
    fecha_objetivo: subtarea.fecha_objetivo,
    horas_estimadas: String(Number(subtarea.horas_estimadas)),
    estado: normalizarEstado(subtarea.estado),
  };
}

// Sin `subtarea` es el formulario para agregar; con ella, el de editar.
function SubtareaForm({ subtarea, onSubmit, onCancelar }) {
  const editando = Boolean(subtarea);
  const [valores, setValores] = useState(() =>
    editando ? valoresDe(subtarea) : VALORES_INICIALES,
  );
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

    const nuevosErrores = validarSubtarea(valores);
    setErrores(nuevosErrores);
    setErrorGeneral("");
    if (Object.keys(nuevosErrores).length > 0) return;

    setEnviando(true);
    try {
      const datos = {
        titulo: valores.titulo.trim(),
        descripcion: valores.descripcion.trim(),
        estado: valores.estado,
        fecha_objetivo: valores.fecha_objetivo,
        horas_estimadas: Number(valores.horas_estimadas),
      };

      await onSubmit(datos);
      if (!editando) setValores(VALORES_INICIALES);
    } catch (error) {
      const { campos, general } = erroresDeApi(error, CAMPOS);
      setErrores(campos);
      setErrorGeneral(general);
    } finally {
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
        label="Título"
        name="titulo"
        placeholder="Ejemplo: Confirmar catering"
        value={valores.titulo}
        onChange={handleChange}
        error={errores.titulo}
      />

      <Campo
        as="textarea"
        rows={3}
        label="Descripción"
        name="descripcion"
        placeholder="Detalles opcionales"
        value={valores.descripcion}
        onChange={handleChange}
        error={errores.descripcion}
      />

      <div className="form-row">
        <Campo
          type="date"
          label="Fecha objetivo"
          name="fecha_objetivo"
          value={valores.fecha_objetivo}
          onChange={handleChange}
          error={errores.fecha_objetivo}
        />

        <Campo
          type="number"
          min="0"
          step="0.5"
          inputMode="decimal"
          label="Horas estimadas"
          name="horas_estimadas"
          placeholder="Ejemplo: 2"
          value={valores.horas_estimadas}
          onChange={handleChange}
          error={errores.horas_estimadas}
        />

        <Campo
          as="select"
          label="Estado"
          name="estado"
          value={valores.estado}
          onChange={handleChange}
          error={errores.estado}
        >
          {ESTADOS_SUBTAREA.map((estado) => (
            <option key={estado.value} value={estado.value}>
              {estado.label}
            </option>
          ))}
        </Campo>
      </div>

      <div className="form-actions">
        {editando && (
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
          {editando
            ? enviando
              ? "Guardando..."
              : "Guardar cambios"
            : enviando
              ? "Agregando..."
              : "Agregar tarea"}
        </button>
      </div>
    </form>
  );
}

export default SubtareaForm;
