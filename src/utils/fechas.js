const dosDigitos = (n) => String(n).padStart(2, "0");

// Las fechas sin hora ("2026-10-05") se leen como fecha local para evitar
// que se corran un día por la zona horaria.
function leerFecha(valor) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    const [anio, mes, dia] = valor.split("-").map(Number);
    return new Date(anio, mes - 1, dia);
  }
  return new Date(valor);
}

// Valor que espera un <input type="datetime-local"> (AAAA-MM-DDTHH:MM).
export function aInputFechaHora(valor) {
  if (!valor) return "";
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(valor)) return valor;

  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return "";

  return `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(
    fecha.getDate(),
  )}T${dosDigitos(fecha.getHours())}:${dosDigitos(fecha.getMinutes())}`;
}

// Valor que espera un <input type="date"> (AAAA-MM-DD).
export function aInputFecha(valor) {
  return valor ? String(valor).slice(0, 10) : "";
}

export function formatearFecha(valor) {
  if (!valor) return "—";
  return leerFecha(valor).toLocaleDateString("es", { dateStyle: "medium" });
}

// Con el día de la semana, para elegir entre varias fechas: "lunes, 12 oct".
export function formatearFechaConDia(valor) {
  if (!valor) return "—";
  return leerFecha(valor).toLocaleDateString("es", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
}

export function formatearFechaHora(valor) {
  if (!valor) return "—";
  return leerFecha(valor).toLocaleString("es", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

// Hoy como "AAAA-MM-DD", en la zona horaria de quien usa la app.
export function fechaDeHoy() {
  const ahora = new Date();
  return `${ahora.getFullYear()}-${dosDigitos(ahora.getMonth() + 1)}-${dosDigitos(ahora.getDate())}`;
}

// Día siguiente a una fecha "AAAA-MM-DD".
export function diaSiguiente(valor) {
  const fecha = leerFecha(valor);
  fecha.setDate(fecha.getDate() + 1);
  return `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(fecha.getDate())}`;
}

// Días completos entre dos fechas sin hora ("AAAA-MM-DD"). Negativo si
// `hasta` es anterior a `desde`.
export function diasEntre(desde, hasta) {
  const MS_POR_DIA = 24 * 60 * 60 * 1000;
  return Math.round((leerFecha(hasta) - leerFecha(desde)) / MS_POR_DIA);
}

// "Viernes 9 de octubre": para encabezados.
export function formatearFechaLarga(valor) {
  if (!valor) return "—";
  const texto = leerFecha(valor)
    .toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" })
    .replace(",", "");
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// "20 de octubre"
export function formatearDiaYMes(valor) {
  if (!valor) return "—";
  return leerFecha(valor).toLocaleDateString("es", {
    day: "numeric",
    month: "long",
  });
}

// Día y mes abreviado por separado ({ dia: "24", mes: "oct" }), para mostrar
// el día en grande.
export function partesDeFecha(valor) {
  const fecha = leerFecha(valor);
  return {
    dia: String(fecha.getDate()),
    mes: fecha.toLocaleDateString("es", { month: "short" }).replace(".", ""),
  };
}

// "14 nov": el día del evento dentro de un mensaje.
export function formatearDiaCorto(valor) {
  const { dia, mes } = partesDeFecha(valor);
  return `${dia} ${mes}`;
}

// Fecha local (AAAA-MM-DD) de un valor con hora, para compararla con otras.
export function soloFecha(valor) {
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return String(valor).slice(0, 10);
  return `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(fecha.getDate())}`;
}
