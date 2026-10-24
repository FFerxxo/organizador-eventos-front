// Lleva el foco al primer campo con error, para que quien usa teclado o
// lector de pantalla no tenga que buscarlo. Espera a que React pinte los
// errores, porque `aria-invalid` se pone al volver a dibujar.
export function enfocarPrimerError(formulario) {
  requestAnimationFrame(() => {
    formulario.querySelector('[aria-invalid="true"]')?.focus();
  });
}

export const AVISO_REVISAR = "Revisa los campos marcados.";
