// Las horas se muestran igual en toda la app: sin ceros de más y con punto
// decimal. "1.00" -> "1", "1.50" -> "1.5".
export function numeroDeHoras(horas) {
  return String(Number(Number(horas).toFixed(2)));
}

// "1.00" -> "1 h", "1.50" -> "1 h 30 min", "0.50" -> "30 min"
export function enHoras(horas) {
  const minutos = Math.round(Number(horas) * 60);
  const h = Math.trunc(minutos / 60);
  const min = Math.abs(minutos % 60);
  if (min === 0) return `${h} h`;
  if (h === 0) return `${minutos} min`;
  return `${h} h ${min} min`;
}
