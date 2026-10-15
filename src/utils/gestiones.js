import { formatearFecha } from "./fechas";
import { enHoras } from "./horas";

// La nota es opcional: solo viaja si trae texto. Si no se manda, el back
// conserva la que ya tenía la gestión.
function conNota(nota) {
  const texto = String(nota ?? "").trim();
  return texto ? { nota: texto } : {};
}

// Cuerpo de "Hecha". Es el mismo que llevará POST /ejecutar/ (más el estado,
// que el endpoint dedicado pondrá por su cuenta).
export function cambiosAlEjecutar({ nota } = {}) {
  return { estado: "finalizado", ...conNota(nota) };
}

// Cuerpo de "Posponer": nueva fecha, horas si cambiaron y nota opcional.
// `estado` solo llega cuando se reabre una gestión hecha (Deshacer con
// sobrecarga) para moverla y reabrirla en un solo guardado.
export function cambiosAlPosponer({ fecha_objetivo, horas_estimadas, nota, estado } = {}) {
  return {
    fecha_objetivo,
    ...(horas_estimadas ? { horas_estimadas } : {}),
    ...conNota(nota),
    ...(estado ? { estado } : {}),
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
