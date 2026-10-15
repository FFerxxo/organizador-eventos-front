const plural = (n, singular, pluralizado) =>
  `${n} ${n === 1 ? singular : pluralizado}`;

// Barra de avance de un evento con su conteo ("2 de 5 gestiones
// finalizadas. Faltan 3."). `idEtiqueta` es el id del título que la nombra
// para el lector de pantalla.
function BarraProgreso({ avance, idEtiqueta }) {
  const { total, finalizadas, pendientes, porcentaje } = avance;

  if (total === 0) {
    return (
      <p className="avance-conteo">Este evento todavía no tiene gestiones.</p>
    );
  }

  const conteo = `${finalizadas} de ${plural(total, "gestión finalizada", "gestiones finalizadas")}`;

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
        <div className="avance-relleno" style={{ width: `${porcentaje}%` }} />
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
