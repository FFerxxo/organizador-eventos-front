# EventFlow (frontend)

Aplicación web del proyecto Organizador de Eventos Independientes (Equipo 6). Sirve para planificar las gestiones de cada evento, ver qué hay que hacer hoy y avisar cuando un día queda sobrecargado. Está hecha con React y Vite.

| | URL |
| --- | --- |
| Aplicación | https://eventflow-front-two.vercel.app |
| API | https://eventflow-back.onrender.com |
| Estado de la API | https://eventflow-back.onrender.com/api/health/ |
| Documentación de la API (Swagger) | https://eventflow-back.onrender.com/api/docs/ |
| Repositorio del backend | https://github.com/FFerxxo/organizador-eventos-back |

> La API está en el plan gratuito de Render: si lleva un rato sin uso, la primera petición puede tardar hasta un minuto. Conviene abrir primero `/api/health/` y esperar a que responda.

## Cuenta demo

| Correo | Contraseña |
| --- | --- |
| `demo@eventflow.com` | `demo1234` |

Trae tres eventos con gestiones vencidas, para hoy y próximas, hechas, una pospuesta con nota, un día lleno para probar el aviso de sobrecarga y un evento al 100 %. Cómo se vuelve a dejar como nueva está en el README del backend.

## Correrlo en local

Se necesita Node 20.19 o superior (o 22.12 o superior).

```bash
npm install
cp .env.example .env.local
npm run dev
```

Se abre en http://localhost:5173. Con `VITE_API_URL` vacía la app usa datos de prueba en memoria y se entra con `prueba1@correo.com` / `prueba123`. Los cambios se pierden al recargar.

Para usar la API real, en `.env.local`:

```
VITE_API_URL=https://eventflow-back.onrender.com
```

Sin `/api` al final y sin barra. Si se prefiere un backend local, se pone su dirección (por ejemplo `http://localhost:8000`); ese backend ya acepta `http://localhost:5173`.

## Variables

| Variable | Para qué |
| --- | --- |
| `VITE_API_URL` | Dirección del backend. Vacía: datos de prueba en memoria. |
| `VITE_USE_MOCK` | `true` fuerza los datos de prueba aunque haya `VITE_API_URL`. |

## Comandos

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run lint` | Revisa el código |
| `npm run build` | Genera la carpeta `dist` |
| `npm run preview` | Muestra el resultado de `build` |

## Pantallas

`/login`, `/registro`, `/hoy`, `/eventos`, `/crear`, `/evento/:id`, `/progreso` y `/configuracion`. Sin sesión, todas menos las dos primeras llevan a `/login`.

## Despliegue en Vercel

Cada merge a `main` se despliega solo. En Vercel hay que definir `VITE_API_URL` con la dirección de la API. El archivo `vercel.json` hace que al recargar una ruta como `/hoy` no salga un 404.
