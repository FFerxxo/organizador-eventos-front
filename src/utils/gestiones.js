import { formatearFecha } from "./fechas";
import { enHoras } from "./horas";

// Texto de confirmación después de reprogramar una gestión. Si el backend
// manda cómo quedó ese día, se incluye para que se vea que el plan cabe.
export function mensajeReprogramada(gestion) {
  const horas = Number(gestion.horas_estimadas);
  const carga = gestion.carga_dia
    ? ` Ese día quedas con ${enHoras(gestion.carga_dia.horas_planificadas)} de ${enHoras(gestion.carga_dia.limite_horas_dia)}.`
    : "";

  return `Listo. "${gestion.titulo}" quedó para el ${formatearFecha(gestion.fecha_objetivo)}, con ${enHoras(horas)} ${horas === 1 ? "estimada" : "estimadas"}.${carga}`;
}
