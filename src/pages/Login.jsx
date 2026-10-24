import { useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import Campo from "../components/Campo";
import PortadaAcceso from "../components/PortadaAcceso";
import { erroresDeApi } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useTitulo } from "../utils/useTitulo";

function Login() {
  useTitulo("Iniciar sesión");
  const { login, isAuthenticated, olvidarCierreVoluntario } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [valores, setValores] = useState({ email: "", password: "" });
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState("");
  const [enviando, setEnviando] = useState(false);

  // Al llegar a /login, el "Cerrar sesión" que nos trajo ya cumplió su papel.
  useEffect(() => {
    olvidarCierreVoluntario();
  }, [olvidarCierreVoluntario]);

  // A dónde quería ir el usuario (con sus filtros en la URL), o /hoy por
  // defecto.
  const from = location.state?.from;
  const destino = from
    ? `${from.pathname}${from.search ?? ""}${from.hash ?? ""}`
    : "/hoy";

  // Ya hay sesión (ej. se refrescó la página en /login): manda directo ahí.
  if (isAuthenticated) {
    return <Navigate to={destino} replace />;
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setValores((actuales) => ({ ...actuales, [name]: value }));
    setErrores((actuales) => ({ ...actuales, [name]: undefined }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrores({});
    setErrorGeneral("");
    setEnviando(true);

    try {
      await login(valores.email.trim(), valores.password);
      navigate(destino, { replace: true });
    } catch (error) {
      const { campos, general } = erroresDeApi(error, ["email", "password"]);
      setErrores(campos);
      setErrorGeneral(general);
      setEnviando(false);
    }
  }

  return (
    <PortadaAcceso>
      <h2>Iniciar sesión</h2>
      <p>Ingresa con tu correo y tu contraseña.</p>

      <form className="form-grid" onSubmit={handleSubmit} noValidate>
        {errorGeneral && (
          <p className="alert-error" role="alert">
            {errorGeneral}
          </p>
        )}

        <Campo
          label="Correo electrónico"
          name="email"
          type="email"
          placeholder="usuario@correo.com"
          value={valores.email}
          onChange={handleChange}
          error={errores.email}
          required
        />

        <Campo
          label="Contraseña"
          name="password"
          type="password"
          placeholder="********"
          value={valores.password}
          onChange={handleChange}
          error={errores.password}
          required
        />

        <button type="submit" disabled={enviando}>
          {enviando ? "Ingresando..." : "Ingresar"}
        </button>
      </form>

      <p className="login-enlace">
        ¿Aún no tienes cuenta? <Link to="/registro">Crear cuenta</Link>
      </p>
    </PortadaAcceso>
  );
}

export default Login;
