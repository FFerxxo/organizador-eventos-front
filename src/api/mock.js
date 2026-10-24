import { normalizarEstado, ocupaElDia } from "../constants";
import { cambiosAlEjecutar, cambiosAlPosponer } from "../utils/gestiones";
import { numeroDeHoras } from "../utils/horas";
import { ApiError } from "./client";

// Fecha local (AAAA-MM-DD) a `dias` de distancia de hoy, para que los datos de
// prueba siempre tengan gestiones vencidas, para hoy y próximas.
function enDias(dias) {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + dias);
  const dosDigitos = (n) => String(n).padStart(2, "0");
  return `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(
    fecha.getDate(),
  )}`;
}

// Datos en memoria para trabajar sin backend. Se reinician al recargar la página.
let eventos = [
  {
    id: 1,
    nombre: "Boda de Ana y Luis",
    tipo: "Boda",
    cliente_contacto: "Ana Gómez · 300 123 4567",
    cliente_nombre: "Ana Gómez",
    cliente_telefono: "300 123 4567",
    cliente_correo: "",
    fecha_hora: "2026-11-14T17:00",
    lugar: "Hacienda El Roble",
    plazo_limite: "2026-11-07",
  },
  {
    id: 2,
    nombre: "Cumpleaños de Laura",
    tipo: "Cumpleaños",
    cliente_contacto: "Laura Pérez · laura@correo.com",
    cliente_nombre: "Laura Pérez",
    cliente_telefono: "",
    cliente_correo: "laura@correo.com",
    fecha_hora: "2026-10-20T19:30",
    lugar: "Salón Las Palmas",
    plazo_limite: "2026-10-15",
  },
];

let subtareas = [
  {
    id: 1,
    evento: 1,
    titulo: "Reservar salón",
    descripcion: "Confirmar fecha y pagar anticipo.",
    fecha_objetivo: enDias(-3),
    horas_estimadas: 2,
    estado: "por hacer",
    nota: "Esperando confirmación del salón",
  },
  {
    id: 2,
    evento: 1,
    titulo: "Confirmar catering",
    descripcion: "Menú para 120 personas.",
    fecha_objetivo: enDias(0),
    horas_estimadas: 3,
    estado: "en curso",
    nota: "",
  },
  {
    id: 3,
    evento: 2,
    titulo: "Llamar al proveedor de sonido",
    descripcion: "",
    fecha_objetivo: enDias(0),
    horas_estimadas: 1,
    estado: "por hacer",
    nota: "",
  },
  {
    id: 4,
    evento: 2,
    titulo: "Enviar invitaciones",
    descripcion: "Lista de 40 invitados.",
    fecha_objetivo: enDias(-1),
    horas_estimadas: 1.5,
    estado: "por hacer",
    nota: "",
  },
  {
    id: 5,
    evento: 1,
    titulo: "Definir decoración",
    descripcion: "",
    fecha_objetivo: enDias(4),
    horas_estimadas: 2,
    estado: "por hacer",
    nota: "",
  },
  {
    id: 6,
    evento: 2,
    titulo: "Comprar la torta",
    descripcion: "",
    fecha_objetivo: enDias(9),
    horas_estimadas: 1,
    estado: "hecha",
    nota: "",
  },
];

let siguienteEventoId = 3;
let siguienteSubtareaId = 7;

function responder(valor) {
  return new Promise((resolve) =>
    setTimeout(() => resolve(structuredClone(valor)), 300),
  );
}

function noEncontrado() {
  return Promise.reject(new ApiError(404, { detail: "Evento no encontrado." }));
}

function buscarEvento(id) {
  return eventos.find((evento) => evento.id === Number(id));
}

// Como el backend, cada evento de la lista trae sus gestiones.
export function listarEventos() {
  return responder(
    eventos.map((evento) => ({
      ...evento,
      subtareas: subtareas.filter((subtarea) => subtarea.evento === evento.id),
    })),
  );
}

export function obtenerEvento(id) {
  const evento = buscarEvento(id);
  return evento ? responder(evento) : noEncontrado();
}

// Igual que el backend: el texto único de contacto se arma con los tres campos.
const contactoDe = (evento) =>
  [evento.cliente_nombre, evento.cliente_telefono, evento.cliente_correo]
    .filter(Boolean)
    .join(" · ");

// Igual que el backend: un evento nuevo no puede tener una fecha que ya pasó.
export function crearEvento(datos) {
  if (new Date(datos.fecha_hora) < new Date()) {
    return Promise.reject(
      new ApiError(400, {
        fecha_hora: ["Esa fecha ya pasó. Revisa el día y la hora."],
      }),
    );
  }
  const evento = { id: siguienteEventoId++, ...datos };
  evento.cliente_contacto = contactoDe(evento);
  eventos = [...eventos, evento];
  return responder(evento);
}

export function actualizarEvento(id, datos) {
  const actual = buscarEvento(id);
  if (!actual) return noEncontrado();

  // Igual que el backend: el día nuevo no puede quedar antes de la última tarea.
  const ultima = subtareas
    .filter((subtarea) => subtarea.evento === actual.id)
    .map((subtarea) => subtarea.fecha_objetivo)
    .sort()
    .at(-1);
  const diaNuevo = datos.fecha_hora && String(datos.fecha_hora).slice(0, 10);
  if (diaNuevo && diaNuevo !== String(actual.fecha_hora).slice(0, 10) && ultima > diaNuevo) {
    const [, mes, dia] = ultima.split("-").map(Number);
    const mesCorto = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"][mes - 1];
    return Promise.reject(
      new ApiError(400, {
        fecha_hora: [`Pasa esas tareas a un día anterior o elige un día desde el ${dia} ${mesCorto}.`],
      }),
    );
  }

  const actualizado = { ...actual, ...datos, id: actual.id };
  actualizado.cliente_contacto = contactoDe(actualizado);
  eventos = eventos.map((evento) =>
    evento.id === actual.id ? actualizado : evento,
  );
  return responder(actualizado);
}

export function eliminarEvento(id) {
  if (!buscarEvento(id)) return noEncontrado();

  eventos = eventos.filter((evento) => evento.id !== Number(id));
  subtareas = subtareas.filter((subtarea) => subtarea.evento !== Number(id));
  return responder(null);
}

export function listarSubtareas(eventoId) {
  if (!buscarEvento(eventoId)) return noEncontrado();
  return responder(
    subtareas.filter((subtarea) => subtarea.evento === Number(eventoId)),
  );
}

// Igual que el backend: la tarea no puede quedar después del día del evento.
function errorDeFechaTarde(evento, fecha) {
  const dia = String(evento.fecha_hora).slice(0, 10);
  if (!fecha || fecha <= dia) return null;
  const [, mes, numero] = dia.split("-").map(Number);
  const mesCorto = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"][mes - 1];
  return Promise.reject(
    new ApiError(400, {
      fecha_objetivo: [`Elige un día hasta el del evento (${numero} ${mesCorto}).`],
    }),
  );
}

export function crearSubtarea(eventoId, datos) {
  const evento = buscarEvento(eventoId);
  if (!evento) return noEncontrado();
  const tarde = errorDeFechaTarde(evento, datos.fecha_objetivo);
  if (tarde) return tarde;

  const subtarea = {
    id: siguienteSubtareaId++,
    evento: Number(eventoId),
    ...datos,
  };
  subtareas = [...subtareas, subtarea];
  return responder(subtarea);
}

// Horas por hacer planificadas para un día, sin contar una gestión.
function horasDelDia(fecha, sinId) {
  return subtareas
    .filter(
      (subtarea) =>
        subtarea.id !== sinId &&
        ocupaElDia(subtarea.estado) &&
        subtarea.fecha_objetivo === fecha,
    )
    .reduce((total, subtarea) => total + Number(subtarea.horas_estimadas), 0);
}

function sumarDias(fecha, dias) {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  const nueva = new Date(anio, mes - 1, dia + dias);
  const dosDigitos = (n) => String(n).padStart(2, "0");
  return `${nueva.getFullYear()}-${dosDigitos(nueva.getMonth() + 1)}-${dosDigitos(nueva.getDate())}`;
}

// Igual que el backend: los 3 días más cercanos donde la gestión cabe, sin
// días que ya pasaron ni posteriores al evento.
function sugerirFechas(gestion, fecha, horas) {
  const hoy = enDias(0);
  const diaDelEvento = String(buscarEvento(gestion.evento)?.fecha_hora).slice(0, 10);
  const sugeridas = [];

  for (let distancia = 1; distancia <= 14 && sugeridas.length < 3; distancia++) {
    for (const candidata of [
      sumarDias(fecha, distancia),
      sumarDias(fecha, -distancia),
    ]) {
      if (candidata < hoy || candidata > diaDelEvento) continue;
      const planificadas = horasDelDia(candidata, gestion.id) + horas;
      if (planificadas <= limiteHorasDia) {
        sugeridas.push({
          fecha: candidata,
          horas_planificadas: planificadas.toFixed(2),
        });
      }
    }
  }

  return sugeridas
    .slice(0, 3)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

// Igual que el backend: el primer día posterior donde la gestión cabe, sin
// pasar del día del evento.
function fechaParaPosponer(gestion, fecha, horas) {
  const hoy = enDias(0);
  const diaDelEvento = String(buscarEvento(gestion.evento)?.fecha_hora).slice(0, 10);
  let candidata = sumarDias(fecha, 1);
  if (candidata < hoy) candidata = hoy;

  for (; candidata <= diaDelEvento; candidata = sumarDias(candidata, 1)) {
    const planificadas = horasDelDia(candidata, gestion.id) + horas;
    // El día en que la gestión ya está no se propone: no cambiaría nada.
    if (planificadas <= limiteHorasDia && candidata !== gestion.fecha_objetivo) {
      return { fecha: candidata, horas_planificadas: planificadas.toFixed(2) };
    }
  }
  return null;
}

// Misma regla que PATCH /api/subtareas/<id>/: si el cambio le agrega horas a
// un día y el total pasa del límite diario, no guarda y responde 409.
export function actualizarSubtarea(id, cambios) {
  const actual = subtareas.find((subtarea) => subtarea.id === Number(id));
  if (!actual) {
    return Promise.reject(
      new ApiError(404, { detail: "Subtarea no encontrada." }),
    );
  }

  if (
    "fecha_objetivo" in cambios &&
    cambios.fecha_objetivo !== actual.fecha_objetivo
  ) {
    const tarde = errorDeFechaTarde(
      buscarEvento(actual.evento),
      cambios.fecha_objetivo,
    );
    if (tarde) return tarde;
  }

  const nueva = { ...actual, ...cambios, id: actual.id, evento: actual.evento };
  const horas = Number(nueva.horas_estimadas);
  const horasAntes =
    actual.fecha_objetivo === nueva.fecha_objetivo &&
    ocupaElDia(actual.estado)
      ? Number(actual.horas_estimadas)
      : 0;

  if (ocupaElDia(nueva.estado) && horas > horasAntes) {
    const otras = horasDelDia(nueva.fecha_objetivo, actual.id);
    const planificadas = otras + horas;

    if (planificadas > limiteHorasDia) {
      return Promise.reject(
        new ApiError(409, {
          detail: `Quedarías con ${numeroDeHoras(planificadas)}h planificadas (límite ${numeroDeHoras(limiteHorasDia)}h)`,
          codigo: "sobrecarga_diaria",
          conflicto: {
            fecha: nueva.fecha_objetivo,
            horas_planificadas: planificadas.toFixed(2),
            limite_horas_dia: limiteHorasDia.toFixed(2),
            excede_por: (planificadas - limiteHorasDia).toFixed(2),
            horas_otras_gestiones: otras.toFixed(2),
            horas_gestion: horas.toFixed(2),
            horas_disponibles: Math.max(0, limiteHorasDia - otras).toFixed(2),
            fechas_sugeridas: sugerirFechas(
              actual,
              nueva.fecha_objetivo,
              horas,
            ),
            fecha_posponer: fechaParaPosponer(
              actual,
              nueva.fecha_objetivo,
              horas,
            ),
          },
        }),
      );
    }
  }

  subtareas = subtareas.map((subtarea) =>
    subtarea.id === actual.id ? nueva : subtarea,
  );
  return responder({
    ...nueva,
    carga_dia: {
      fecha: nueva.fecha_objetivo,
      horas_planificadas: horasDelDia(nueva.fecha_objetivo).toFixed(2),
      limite_horas_dia: limiteHorasDia.toFixed(2),
    },
  });
}

// Mismo cuerpo que manda el front al back real; el mock sí guarda la nota
// para poder probar la interfaz.
export function ejecutarSubtarea(id, datos) {
  return actualizarSubtarea(id, cambiosAlEjecutar(datos));
}

export function posponerSubtarea(id, datos) {
  return actualizarSubtarea(id, cambiosAlPosponer(datos));
}

export function eliminarSubtarea(id) {
  if (!subtareas.some((subtarea) => subtarea.id === Number(id))) {
    return Promise.reject(
      new ApiError(404, { detail: "Subtarea no encontrada." }),
    );
  }

  subtareas = subtareas.filter((subtarea) => subtarea.id !== Number(id));
  return responder(null);
}

// Misma agrupación y orden que GET /api/subtareas/hoy/: no incluye las
// hechas (las pospuestas salen en su nueva fecha); ordena por fecha objetivo y, en empate, por menos horas.
export function obtenerGestionesHoy({ eventoId, estado } = {}) {
  if (eventoId && !buscarEvento(eventoId)) {
    return Promise.reject(
      new ApiError(404, {
        detail: "Evento no encontrado para este organizador.",
      }),
    );
  }

  const hoy = enDias(0);
  const pendientes = subtareas.filter(
    (subtarea) =>
      ocupaElDia(subtarea.estado) &&
      (!eventoId || subtarea.evento === Number(eventoId)) &&
      (!estado || normalizarEstado(subtarea.estado) === normalizarEstado(estado)),
  );
  const porFechaYHoras = (a, b) =>
    a.fecha_objetivo.localeCompare(b.fecha_objetivo) ||
    a.horas_estimadas - b.horas_estimadas;

  return responder({
    fecha_actual: hoy,
    filtros: { evento_id: eventoId ?? null, estado: estado ?? null },
    regla:
      "Se muestran primero las vencidas, luego las de hoy y después las próximas. Dentro de cada grupo van por fecha objetivo y, si empatan, primero la de menor esfuerzo estimado.",
    vencidas: pendientes
      .filter((subtarea) => subtarea.fecha_objetivo < hoy)
      .sort(porFechaYHoras),
    para_hoy: pendientes
      .filter((subtarea) => subtarea.fecha_objetivo === hoy)
      .sort(porFechaYHoras),
    proximas: pendientes
      .filter((subtarea) => subtarea.fecha_objetivo > hoy)
      .sort(porFechaYHoras),
  });
}

// --- Sesión ---
// Simulada en memoria, con las mismas reglas del backend: solo entran las
// cuentas registradas. Hay una cuenta lista para probar sin registrarse:
// prueba1@correo.com / prueba123. Como no hay backend real detrás, la sesión
// y las cuentas nuevas no sobreviven un refresh de la página.
let cuentas = [
  {
    id: "mock-organizador-1",
    nombre: "prueba1",
    email: "prueba1@correo.com",
    password: "prueba123",
  },
];
let organizadorActual = null;

function abrirSesion(cuenta, mensaje) {
  organizadorActual = {
    id: cuenta.id,
    nombre: cuenta.nombre,
    email: cuenta.email,
  };

  return responder({
    message: mensaje,
    token: "mock-token",
    organizador: organizadorActual,
  });
}

export function login(email, password) {
  if (!email) {
    return Promise.reject(
      new ApiError(400, { email: ["Este campo es obligatorio."] }),
    );
  }
  if (!password) {
    return Promise.reject(
      new ApiError(400, { password: ["Este campo es obligatorio."] }),
    );
  }

  const cuenta = cuentas.find(
    (c) => c.email === email.trim().toLowerCase() && c.password === password,
  );
  if (!cuenta) {
    return Promise.reject(
      new ApiError(401, {
        detail:
          "Ups, el correo o la contraseña no son correctos. Revisa tus datos e intenta de nuevo.",
      }),
    );
  }

  return abrirSesion(cuenta, "Login correcto");
}

export function registrar(nombre, email, password) {
  const correo = email.trim().toLowerCase();

  if (cuentas.some((c) => c.email === correo)) {
    return Promise.reject(
      new ApiError(400, { email: ["Ya existe una cuenta con este correo."] }),
    );
  }
  if (password.length < 6) {
    return Promise.reject(
      new ApiError(400, {
        password: ["La contraseña debe tener al menos 6 caracteres."],
      }),
    );
  }

  const cuenta = {
    id: `mock-organizador-${cuentas.length + 1}`,
    nombre,
    email: correo,
    password,
  };
  cuentas = [...cuentas, cuenta];
  return abrirSesion(cuenta, "Cuenta creada");
}

export function obtenerPerfil() {
  if (!organizadorActual) {
    return Promise.reject(new ApiError(401, { detail: "No autenticado." }));
  }
  return responder(organizadorActual);
}

// --- Límite diario (Sprint 3) ---
// Mismo contrato que /api/organizador/limite-diario/: 6 por defecto y solo
// acepta valores entre 1 y 16.
let limiteHorasDia = 6;

export function obtenerLimiteDiario() {
  return responder({ limite_horas_dia: limiteHorasDia.toFixed(2) });
}

export function actualizarLimiteDiario(horas) {
  const valor = Number(horas);
  if (Number.isNaN(valor) || valor < 1 || valor > 16) {
    return Promise.reject(
      new ApiError(400, {
        limite_horas_dia: ["El límite debe estar entre 1 y 16 horas por día."],
      }),
    );
  }

  limiteHorasDia = valor;
  return responder({ limite_horas_dia: limiteHorasDia.toFixed(2) });
}
