import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { erroresDeApi } from "../api/client";
import Campo from "../components/Campo";
import PortadaAcceso from "../components/PortadaAcceso";
import { useAuth } from "../context/AuthContext";
import { validarRegistro } from "../utils/validaciones";
import { useTitulo } from "../utils/useTitulo";

const CAMPOS = ["nombre", "email", "password"];

function Registro() {
  useTitulo("Crear cuenta");
  const { registrar, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [valores, setValores] = useState({
    nombre: "",
    email: "",
    password: "",
    confirmacion: "",
  });
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState("");
  const [enviando, setEnviando] = useState(false);

  // Quien ya tiene sesión no necesita crear otra cuenta.
  if (isAuthenticated) {
    return <Navigate to="/hoy" replace />;
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setValores((actuales) => ({ ...actuales, [name]: value }));
    setErrores((actuales) => ({ ...actuales, [name]: undefined }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const nuevosErrores = validarRegistro(valores);
    setErrores(nuevosErrores);
    setErrorGeneral("");
    if (Object.keys(nuevosErrores).length > 0) return;

    setEnviando(true);
    try {
      await registrar(
        valores.nombre.trim(),
        valores.email.trim(),
        valores.password,
      );
      navigate("/hoy", { replace: true });
    } catch (error) {
      const { campos, general } = erroresDeApi(error, CAMPOS);
      setErrores(campos);
      setErrorGeneral(general);
      setEnviando(false);
    }
  }

  return (
    <PortadaAcceso larga>
      <h2>Crear cuenta</h2>
      <p>Regístrate para empezar a organizar tus eventos.</p>

      <form className="form-grid" onSubmit={handleSubmit} noValidate>
        {errorGeneral && (
          <p className="alert-error" role="alert">
            {errorGeneral}
          </p>
        )}

        <Campo
          label="Nombre"
          name="nombre"
          autoComplete="name"
          placeholder="Ana Gómez"
          value={valores.nombre}
          onChange={handleChange}
          error={errores.nombre}
        />

        <Campo
          label="Correo electrónico"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="usuario@correo.com"
          value={valores.email}
          onChange={handleChange}
          error={errores.email}
        />

        <div className="form-row">
          <Campo
            label="Contraseña"
            name="password"
            type="password"
            autoComplete="new-password"
            ayuda="Mínimo 6 caracteres."
            value={valores.password}
            onChange={handleChange}
            error={errores.password}
          />

          <Campo
            label="Confirmar contraseña"
            name="confirmacion"
            type="password"
            autoComplete="new-password"
            value={valores.confirmacion}
            onChange={handleChange}
            error={errores.confirmacion}
          />
        </div>

        <button type="submit" disabled={enviando}>
          {enviando ? "Creando cuenta..." : "Crear cuenta"}
        </button>
      </form>

      <p className="login-enlace">
        ¿Ya tienes cuenta? <Link to="/login">Iniciar sesión</Link>
      </p>
    </PortadaAcceso>
  );
}

export default Registro;
