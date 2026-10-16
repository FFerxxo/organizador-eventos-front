import { normalizarEstado } from "../constants";
import { formatearFecha } from "./fechas";
import { enHoras } from "./horas";

// Avance de un evento: porcentaje = finalizadas / total, el mismo cálculo que
// GET /api/eventos/<id>/progreso/. Redondeo hacia arriba en .5 (Math.round):
// 1 de 8 = 12.5 % -> 13 %. Pendiente de acordar con el back, porque el
// round() de Python redondea .5 al par (12.5 -> 12).
export function avanceDe(gestiones) {
  const total = gestiones.length;
  const finalizadas = gestiones.filter(
    (gestion) => normalizarEstado(gestion.estado) === "hecha",
  ).length;
  const porcentaje = total === 0 ? 0 : Math.round((finalizadas / total) * 100);
  return { total, finalizadas, pendientes: total - finalizadas, porcentaje };
}

// La nota es opcional: solo viaja si trae texto. Si no se manda, el back
// conserva la que ya tenía la gestión.
function conNota(nota) {
  const texto = String(nota ?? "").trim();
  return texto ? { nota: texto } : {};
}

// Cuerpo de "Hecha". Es el mismo que llevará POST /ejecutar/ (más el estado,
// que el endpoint dedicado pondrá por su cuenta).
export function cambiosAlEjecutar({ nota } = {}) {
  return { estado: "hecha", ...conNota(nota) };
}

// Cuerpo de "Posponer": nueva fecha, horas si cambiaron, nota opcional y el
// estado "pospuesta". `estado` solo llega distinto cuando se reabre una
// gestión hecha (Deshacer con sobrecarga) para moverla y reabrirla en un
// solo guardado.
export function cambiosAlPosponer({ fecha_objetivo, horas_estimadas, nota, estado } = {}) {
  return {
    fecha_objetivo,
    ...(horas_estimadas ? { horas_estimadas } : {}),
    ...conNota(nota),
    estado: estado || "pospuesta",
  };
}

// Texto de confirmación después de reprogramar una gestión. Si el backend
// manda cómo quedó ese día, se incluye para que se vea que el plan cabe.
export function mensajeReprogramada(gestion) {
  const horas = Number(gestion.horas_estimadas);
  const carga = gestion.carga_dia
    ? ` Ese día quedas con ${enHoras(gestion.carga_dia.horas_planificadas)} de ${enHoras(gestion.carga_dia.limite_horas_dia)}.`
    : "";

  return `Listo. "${gestion.titulo}" quedó para el ${formatearFecha(gestion.fecha_objetivo)}, con ${enHoras(horas)} ${horas === 1 ? "estimada" : "estimadas"}.${carga}`;
}

// Aviso después de marcar una gestión como hecha, con cómo va su evento.
export function mensajeHecha(gestion, avance) {
  const progreso =
    avance?.total > 0
      ? ` Llevas ${avance.finalizadas} de ${avance.total} (${avance.porcentaje} %).`
      : "";
  return `Listo, marcaste "${gestion.titulo}" como hecha.${progreso}`;
}

// Aviso después de posponer. "Nota guardada" solo sale si el back devolvió
// la nota que se mandó: si todavía no la guarda, no se promete nada. Si la
// gestión se reabrió al moverla, se avisa como una reprogramación normal.
export function mensajePospuesta(gestion, { nota } = {}) {
  if (normalizarEstado(gestion.estado) !== "pospuesta") {
    return mensajeReprogramada(gestion);
  }
  const guardada = nota && gestion.nota === nota ? " Nota guardada." : "";
  return `Listo. "${gestion.titulo}" quedó pospuesta para el ${formatearFecha(gestion.fecha_objetivo)}.${guardada}`;
}
