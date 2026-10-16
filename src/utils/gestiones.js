import { etiquetaEstado, normalizarEstado } from "../constants";
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

// Frase del aviso de sobrecarga, armada con las cifras del conflicto (el
// texto del back trae las horas pegadas: "13h").
export function textoSobrecarga(conflicto) {
  return `Ese día quedarías con ${enHoras(conflicto?.horas_planificadas)} y tu límite es de ${enHoras(conflicto?.limite_horas_dia)}.`;
}

// "Ese día tendrás 2 h ocupadas de 6 h." Solo si el back manda cómo quedó el día.
function textoCarga(gestion) {
  if (!gestion.carga_dia) return "";
  return ` Ese día tendrás ${enHoras(gestion.carga_dia.horas_planificadas)} ocupadas de ${enHoras(gestion.carga_dia.limite_horas_dia)}.`;
}

// Texto de confirmación después de reprogramar una tarea.
export function mensajeReprogramada(gestion) {
  const horas = Number(gestion.horas_estimadas);
  return `Listo. «${gestion.titulo}» quedó para el ${formatearFecha(gestion.fecha_objetivo)}, con ${enHoras(horas)} ${horas === 1 ? "estimada" : "estimadas"}.${textoCarga(gestion)}`;
}

// Aviso después de marcar una tarea como hecha, con cómo va su evento.
export function mensajeHecha(gestion, avance, nombreEvento) {
  const de = nombreEvento ? ` de «${nombreEvento}»` : "";
  const progreso =
    avance?.total > 0
      ? ` Llevas ${avance.finalizadas} de ${avance.total} ${avance.total === 1 ? "tarea" : "tareas"}${de} (${avance.porcentaje} %).`
      : "";
  return `Listo, marcaste «${gestion.titulo}» como hecha.${progreso}`;
}

// Aviso después de deshacer: la tarea vuelve al estado que tenía.
export function mensajeDeshecha(gestion, estadoAnterior) {
  return `Listo, «${gestion.titulo}» vuelve a estar ${etiquetaEstado(estadoAnterior).toLowerCase()}.`;
}

// Aviso después de posponer. "Nota guardada" solo sale si el back devolvió
// la nota que se mandó: si todavía no la guarda, no se promete nada. Si la
// tarea se reabrió al moverla, se avisa como una reprogramación normal.
export function mensajePospuesta(gestion, { nota } = {}) {
  if (normalizarEstado(gestion.estado) !== "pospuesta") {
    return mensajeReprogramada(gestion);
  }
  const guardada = nota && gestion.nota === nota ? " Nota guardada." : "";
  return `Listo. «${gestion.titulo}» quedó pospuesta para el ${formatearFecha(gestion.fecha_objetivo)}.${textoCarga(gestion)}${guardada}`;
}
