const plural = (n, singular, pluralizado) =>
  `${n} ${n === 1 ? singular : pluralizado}`;

// Barra de avance de un evento con su conteo ("2 de 5 tareas
// hechas. Faltan 3."). `idEtiqueta` es el id del título que la nombra
// para el lector de pantalla.
function BarraProgreso({ avance, idEtiqueta }) {
  const { total, finalizadas, pendientes, porcentaje } = avance;

  if (total === 0) {
    return (
      <p className="avance-conteo">
        Este evento todavía no tiene tareas. Agrega la primera abajo para
        empezar a ver tu avance.
      </p>
    );
  }

  const conteo = `${finalizadas} de ${plural(total, "tarea hecha", "tareas hechas")}`;
  // Gris sin avance, naranja a medias y verde al terminar.
  const nivel =
    porcentaje === 0 ? "cero" : porcentaje === 100 ? "completo" : "medio";

  return (
    <>
      <div
        className="avance-pista"
        role="progressbar"
        aria-labelledby={idEtiqueta}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={porcentaje}
        aria-valuetext={`${porcentaje} %: ${conteo}`}
      >
        <div
          className={`avance-relleno avance-${nivel}`}
          style={{ width: `${porcentaje}%` }}
        />
      </div>
      <p className="avance-conteo">
        {conteo}
        {pendientes === 0
          ? ". Todo listo."
          : `. ${pendientes === 1 ? "Falta" : "Faltan"} ${pendientes}.`}
      </p>
    </>
  );
}

export default BarraProgreso;
