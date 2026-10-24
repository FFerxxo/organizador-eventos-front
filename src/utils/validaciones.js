import { LIMITE_DIARIO } from "../constants";
import { aInputFechaHora, formatearDiaCorto } from "./fechas";

const estaVacio = (valor) => String(valor ?? "").trim() === "";

const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Solo números, espacios, +, - y paréntesis, con 7 a 15 dígitos en total.
function esTelefono(texto) {
  const digitos = texto.replace(/\D/g, "").length;
  return /^[\d\s+\-()]+$/.test(texto) && digitos >= 7 && digitos <= 15;
}

// `esNuevo`: solo al crear se revisa que la fecha no haya pasado, para poder
// seguir editando eventos que ya fueron.
export function validarEvento(valores, { esNuevo = false } = {}) {
  const errores = {};

  if (estaVacio(valores.nombre)) {
    errores.nombre = "El nombre del evento es obligatorio.";
  }
  if (estaVacio(valores.tipo)) {
    errores.tipo = "Selecciona el tipo de evento.";
  }
  if (estaVacio(valores.cliente_nombre)) {
    errores.cliente_nombre = "El nombre del cliente es obligatorio.";
  }

  const telefono = String(valores.cliente_telefono ?? "").trim();
  const correo = String(valores.cliente_correo ?? "").trim();
  if (!telefono && !correo) {
    errores.cliente_telefono =
      "Agrega un teléfono o un correo para contactar al cliente.";
  }
  if (telefono && !esTelefono(telefono)) {
    errores.cliente_telefono = "Escribe un teléfono válido, de 7 a 15 dígitos.";
  }
  if (correo && !CORREO_VALIDO.test(correo)) {
    errores.cliente_correo = "Escribe un correo válido.";
  }
  if (estaVacio(valores.fecha_hora)) {
    errores.fecha_hora = "Indica la fecha y hora del evento.";
  } else if (esNuevo && valores.fecha_hora <= aInputFechaHora(new Date())) {
    errores.fecha_hora = "Esa fecha ya pasó. Revisa el día y la hora.";
  }
  if (estaVacio(valores.lugar)) {
    errores.lugar = "El lugar del evento es obligatorio.";
  }

  return errores;
}

// `fechaMaxima`: el día del evento; la tarea no puede quedar después.
export function validarSubtarea(valores, fechaMaxima = "") {
  const errores = {};

  if (estaVacio(valores.titulo)) {
    errores.titulo = "El título de la tarea es obligatorio.";
  }
  if (estaVacio(valores.fecha_objetivo)) {
    errores.fecha_objetivo = "Indica la fecha objetivo.";
  } else if (fechaMaxima && valores.fecha_objetivo > fechaMaxima) {
    errores.fecha_objetivo = `Elige un día hasta el del evento (${formatearDiaCorto(fechaMaxima)}).`;
  }
  if (estaVacio(valores.horas_estimadas)) {
    errores.horas_estimadas = "Indica las horas estimadas.";
  } else if (!(Number(valores.horas_estimadas) > 0)) {
    errores.horas_estimadas = "Las horas estimadas deben ser mayores a 0.";
  }
  if (estaVacio(valores.estado)) {
    errores.estado = "Selecciona el estado de la tarea.";
  }

  return errores;
}

// Devuelve el mensaje de error, o "" si el límite es válido.
export function validarLimiteDiario(valor) {
  if (estaVacio(valor)) {
    return "Escribe cuántas horas por día quieres como límite.";
  }

  // Por ahora el único límite permitido es el de por defecto (6 h).
  if (Number(valor) !== LIMITE_DIARIO.porDefecto) {
    return `Ups, en este momento solo puedes tener ${LIMITE_DIARIO.porDefecto} h por día.`;
  }

  return "";
}

export function validarRegistro(valores) {
  const errores = {};

  if (estaVacio(valores.nombre)) {
    errores.nombre = "Escribe tu nombre.";
  }
  if (estaVacio(valores.email)) {
    errores.email = "Escribe tu correo.";
  } else if (!CORREO_VALIDO.test(valores.email.trim())) {
    errores.email = "Escribe un correo válido, por ejemplo ana@correo.com.";
  }
  if (String(valores.password ?? "").length < 6) {
    errores.password = "La contraseña debe tener al menos 6 caracteres.";
  }
  if (estaVacio(valores.confirmacion)) {
    errores.confirmacion = "Escribe la contraseña otra vez.";
  } else if (valores.confirmacion !== valores.password) {
    errores.confirmacion = "Las contraseñas no coinciden.";
  }

  return errores;
}
