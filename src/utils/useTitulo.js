import { useEffect } from "react";

// Pone el título de la pestaña ("Hoy · EventFlow") para que cada pantalla
// tenga el suyo y se distinga en el historial y con el lector de pantalla.
export function useTitulo(pantalla) {
  useEffect(() => {
    document.title = `${pantalla} · EventFlow`;
  }, [pantalla]);
}
