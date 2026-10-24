import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { USE_MOCK } from "../api/client";
import logo from "../assets/brand/logo-eventflow.svg";
import { useAuth } from "../context/AuthContext";
import ConfirmDialog from "./ConfirmDialog";
import "@fontsource-variable/schibsted-grotesk";
import "../interior.css";

// Íconos del menú: los mismos en la barra lateral y en la barra del celular.
const ICONOS = {
  hoy: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" />
    </>
  ),
  eventos: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </>
  ),
  crear: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" />
    </>
  ),
  progreso: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  configuracion: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </>
  ),
};

// Enlace del menú que también se marca como activo en las pantallas que son
// "parte" de esa sección: Hoy cuando se entra por "/" y Eventos dentro del
// detalle de un evento. NavLink solo mira su propia ruta.
function EnlaceMenu({ to, tambien = [], prefijos = [], children }) {
  const { pathname } = useLocation();
  const activo =
    pathname === to ||
    pathname.startsWith(`${to}/`) ||
    tambien.includes(pathname) ||
    prefijos.some((prefijo) => pathname.startsWith(prefijo));

  return (
    <Link
      to={to}
      className={activo ? "active" : undefined}
      aria-current={activo ? "page" : undefined}
    >
      {children}
    </Link>
  );
}

function Icono({ nombre }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {ICONOS[nombre]}
    </svg>
  );
}

// Botón con el nombre del usuario que abre el menú de Configuración y
// Cerrar sesión. Se cierra con un clic por fuera o con Escape.
function MenuUsuario({ nombre, email, onSalir }) {
  const [abierto, setAbierto] = useState(false);
  const menuRef = useRef(null);
  const botonRef = useRef(null);

  useEffect(() => {
    if (!abierto) return;

    function alHacerClic(e) {
      if (!menuRef.current.contains(e.target)) setAbierto(false);
    }
    function alPresionar(e) {
      if (e.key === "Escape") {
        setAbierto(false);
        botonRef.current.focus();
      }
    }

    document.addEventListener("mousedown", alHacerClic);
    document.addEventListener("keydown", alPresionar);
    return () => {
      document.removeEventListener("mousedown", alHacerClic);
      document.removeEventListener("keydown", alPresionar);
    };
  }, [abierto]);

  return (
    <div className="usuario" ref={menuRef}>
      <button
        type="button"
        className="usuario-boton"
        ref={botonRef}
        aria-haspopup="true"
        aria-expanded={abierto}
        onClick={() => setAbierto((estaba) => !estaba)}
      >
        <span className="usuario-inicial" aria-hidden="true">
          {nombre.charAt(0).toUpperCase()}
        </span>
        <span className="usuario-nombre">{nombre}</span>
        <svg className="usuario-flecha" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {abierto && (
        <div className="usuario-menu">
          <div className="usuario-quien">
            <b>{nombre}</b>
            {email && <small>{email}</small>}
            {USE_MOCK && (
              <small
                className="datos-prueba"
                title="Los datos viven en memoria y se pierden al recargar."
              >
                Modo datos de prueba
              </small>
            )}
          </div>
          <Link to="/configuracion" onClick={() => setAbierto(false)}>
            Configuración
          </Link>
          <button
            type="button"
            className="salir"
            onClick={() => {
              setAbierto(false);
              onSalir();
            }}
          >
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}

// Marco de todas las pantallas con sesión. En computador el menú va en una
// barra lateral fija; en pantallas angostas, en una barra arriba y, en
// celular, en una barra fija abajo.
function Layout({ children, ocultarCrear = false }) {
  const { organizador, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [confirmandoSalida, setConfirmandoSalida] = useState(false);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  // El perfil puede no haber cargado (backend caído) aunque haya sesión:
  // igual se permite abrir el menú y cerrar sesión.
  const nombre = organizador?.nombre ?? "Sesión activa";
  const mostrarCrear = !ocultarCrear && pathname !== "/crear";

  const marca = (
    <Link className="marca" to="/hoy">
      <img src={logo} alt="" width="30" height="30" />
      <span>
        Event<i>Flow</i>
      </span>
    </Link>
  );

  const botonCrear = mostrarCrear && (
    <Link className="btn btn-crear" to="/crear">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 5v14M5 12h14" />
      </svg>
      Crear evento
    </Link>
  );

  const menuUsuario = (
    <MenuUsuario
      nombre={nombre}
      email={organizador?.email}
      onSalir={() => setConfirmandoSalida(true)}
    />
  );

  return (
    <div className="interior">
      <aside className="barra-lateral">
        {marca}
        {botonCrear}

        <nav aria-label="Principal">
          <EnlaceMenu to="/hoy" tambien={["/"]}>
            <Icono nombre="hoy" />
            Hoy
          </EnlaceMenu>
          <EnlaceMenu to="/eventos" prefijos={["/evento/"]}>
            <Icono nombre="eventos" />
            Eventos
          </EnlaceMenu>
          <NavLink to="/progreso">
            <Icono nombre="progreso" />
            Progreso
          </NavLink>
        </nav>

        <div className="barra-lateral-pie">
          <NavLink to="/configuracion">
            <Icono nombre="configuracion" />
            Configuración
          </NavLink>
          {menuUsuario}
        </div>
      </aside>

      <header className="barra">
        <div className="barra-contenido">
          {marca}

          <nav className="pestanas" aria-label="Principal">
            <EnlaceMenu to="/hoy" tambien={["/"]}>Hoy</EnlaceMenu>
            <EnlaceMenu to="/eventos" prefijos={["/evento/"]}>Eventos</EnlaceMenu>
            <NavLink to="/progreso">Progreso</NavLink>
          </nav>

          <span className="espacio" />

          {botonCrear}
          {menuUsuario}
        </div>
      </header>

      <main className="contenido">{children}</main>

      <nav className="barra-inferior" aria-label="Principal">
        <EnlaceMenu to="/hoy" tambien={["/"]}>
          <Icono nombre="hoy" />
          Hoy
        </EnlaceMenu>
        <EnlaceMenu to="/eventos" prefijos={["/evento/"]}>
          <Icono nombre="eventos" />
          Eventos
        </EnlaceMenu>
        <NavLink to="/crear">
          <Icono nombre="crear" />
          Crear
        </NavLink>
        <NavLink to="/progreso">
          <Icono nombre="progreso" />
          Progreso
        </NavLink>
      </nav>

      <ConfirmDialog
        abierto={confirmandoSalida}
        titulo="¿Cerrar sesión?"
        mensaje="Tendrás que volver a ingresar con tu correo y tu contraseña."
        textoConfirmar="Cerrar sesión"
        onConfirmar={handleLogout}
        onCancelar={() => setConfirmandoSalida(false)}
      />
    </div>
  );
}

export default Layout;
