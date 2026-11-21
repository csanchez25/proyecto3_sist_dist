# Proyecto 2 — Catálogo de Puentes Famosos (Redis Cloud + Netlify + JWT)

**Estudiante:** Caleb Sánchez Solórzano  
**Enlace de publicación en Netlify: https://proyecto3sistdistcalebsanchez.netlify.app/

## Qué incluye

- Vue.js 3, con los mismos frontends de Puentes, Países y Tipos del Proyecto 1 y nuevas vistas de login y registro.
- Servicio REST de Netlify Functions disponible con las **mismas rutas** `/api/bridges`, `/api/countries`, `/api/bridge-types` y relaciones (`/:id/bridges`).
- Redis Cloud: registros JSON por clave, conjuntos de identificadores, secuencias de IDs y referencias entre colecciones.
- 12 puentes, 8 países y 6 tipos con imágenes, migrados **íntegramente** desde el SQL de carga del Proyecto 1 a `data/seed.json`.
- JWT HMAC-SHA256 con `sub`, `iat`, `exp` y `iss`; validez de 1 hora.
- Usuarios en Redis, contraseña hasheada mediante scrypt y rol `editor`; no se almacenan contraseñas en texto plano.
- GET públicos. POST, PUT y DELETE requieren `Authorization: Bearer TOKEN`. Se devuelve **401** sin JWT válido y **403** cuando el rol no permite cambios.
- Sesión guardada en `sessionStorage` del navegador; cuando el servidor responde 401, el cliente borra la sesión y redirige al login. El logout borra el token.

> Nota de seguridad: todos los usuarios registrados públicamente reciben el rol `editor` para permitir administrar el catálogo académico. El servidor también admite el rol `viewer` (solo lectura) si se asigna desde administración de Redis; el registro público no acepta un rol arbitrario enviado por el cliente.

## 1. Requisitos

- Node.js 22 o posterior.
- Cuenta en [Redis Cloud](https://redis.io/cloud/) y una base de datos existente y accesible desde Netlify. **Se reutiliza `tarea5-bookstore`; no es necesario crear otra base de datos.**
- Cuenta en [Netlify](https://app.netlify.com/).
- Acceso a una terminal local (macOS, Linux o PowerShell en Windows).

## 2. Reutilizar la base de datos Redis Cloud `tarea5-bookstore`

**No crear otra base de datos.** El catálogo de puentes se almacena en la misma instancia que la aplicación de librería, sin borrar sus registros. El nombre `tarea5-bookstore` es el nombre visible en Redis Cloud, **no** el valor de la variable `REDIS_URL`.

1. Acceder a Redis Cloud y abrir **Databases → tarea5-bookstore → Connect**.
2. Confirmar que la base de datos sigue activa, con espacio libre y accesible desde Netlify.
3. Utilizar el **endpoint, puerto, usuario, contraseña y modo TLS** que aparecen en la conexión de esa base de datos para crear la URL `REDIS_URL`.
4. Configurar la URL como variable de entorno en Netlify y en la terminal donde se ejecute la carga de datos.
5. Ejecutar `npm run seed` **únicamente después de confirmar que `REDIS_URL` apunta a `tarea5-bookstore`**. Este script crea claves nuevas con prefijo `catalog:v2:` y no elimina los datos de librería.

**Separación de datos:** las claves de puentes son `catalog:v2:bridges:<id>`, países `catalog:v2:countries:<id>`, tipos `catalog:v2:bridge_types:<id>` y usuarios `catalog:v2:users:*`. Las claves originales de la librería se mantienen intactas, siempre que no utilicen ya el prefijo `catalog:v2:`. No ejecutar `FLUSHDB`, `FLUSHALL` ni borrar la base de datos para realizar esta práctica. Redis Cloud Free puede tener límites de memoria y conexiones que comparten ambos proyectos.

Hay una guía paso a paso en [`docs/redis-cloud-existente.md`](docs/redis-cloud-existente.md).

## 3. Variables de entorno obligatorias

**NO incluir claves ni contraseñas en Git, `netlify.toml`, archivos `.env` o dentro del ZIP de entrega.**

| Variable | Contenido | Ejemplo ilustrativo (NO real) |
|---|---|---|
| `REDIS_URL` | Dirección de conexión **de la base existente `tarea5-bookstore`**, con usuario, contraseña, host y puerto. Usar `rediss://` cuando el endpoint admita TLS. | `rediss://default:TU_PASSWORD@TU_HOST:TU_PUERTO` |
| `JWT_SECRET` | Clave aleatoria privada, al menos 32 bytes de longitud; debe mantenerse estable entre despliegues. | Generar con `openssl rand -hex 32` |

En **Netlify → Project configuration → Environment variables**, crear `REDIS_URL` y `JWT_SECRET`, con alcance disponible para **Functions**. Añadir los valores reales desde Netlify UI. Configurar Redis Cloud para aceptar conexiones desde la plataforma Netlify usando los ajustes de seguridad/red de Redis Cloud; conservar TLS y autenticación. Si el servicio Redis tiene una allowlist de IP muy restrictiva, las IP de salida variables de Netlify pueden impedir la conexión, y se requiere un mecanismo de salida permitido.

## 4. Instalación local

```bash
npm install
npm test
```

El proyecto es un sitio Vue.js estático que carga Vue 3 mediante CDN, por lo que **no necesita ejecutar `vite build` ni compilar frontends**.

En una terminal con `npm` instalado, definir las variables **sin guardarlas en archivos**:

**macOS / Linux:**

```bash
export REDIS_URL='rediss://default:TU_PASSWORD@TU_HOST:TU_PUERTO'
export JWT_SECRET='TU_CLAVE_ALEATORIA_DE_32_BYTES_O_MAS'
npm run seed
npm run dev
```

**Windows PowerShell:**

```powershell
$env:REDIS_URL = 'rediss://default:TU_PASSWORD@TU_HOST:TU_PUERTO'
$env:JWT_SECRET = 'TU_CLAVE_ALEATORIA_DE_32_BYTES_O_MAS'
npm run seed
npm run dev
```

Cambiar los marcadores por valores propios. Si Redis Cloud indica una conexión no TLS, usar el esquema `redis://` indicado por el proveedor; no desactivar validaciones TLS para forzar la conexión. Abrir la URL local que imprime `netlify dev` (normalmente `http://localhost:8888`). **No usar `file://` ni levantar únicamente la carpeta `public`**: la API requiere Netlify Functions.

## 5. Migración inicial: datos a Redis Cloud

Ejecutar **una vez** `npm run seed` después de configurar `REDIS_URL` **para `tarea5-bookstore`** y antes de probar la aplicación. El script lee `data/seed.json`, crea los registros del Proyecto 1 sin sobrescribir datos que ya existan y actualiza los índices. Se esperan:

| Colección | Cantidad |
|---|---:|
| `bridges` | 12 |
| `countries` | 8 |
| `bridge_types` | 6 |

No es necesario ejecutar SQL ni usar Cloudflare D1. Este comando **no corre automáticamente al desplegar** para evitar modificar datos en producción.


## 7. Cómo probar en el navegador

1. Abrir Inicio; debe mostrar las cantidades de registros.
2. Abrir Puentes, Países y Tipos **sin iniciar sesión**; se pueden consultar fichas y relaciones, pero **no** aparecen los botones de crear, editar o eliminar.
3. Entrar a **Registrarse** y crear usuario (nombre, email, contraseña de mínimo 8 caracteres). Debe quedar autenticado.
4. Crear, editar y eliminar un registro de prueba. Verificar que no se pueda borrar un país/tipo utilizado por un puente (HTTP 409).
5. Cerrar sesión y verificar que desaparezcan las acciones de edición.
6. Probar inicio de sesión. El JWT tiene 1 hora de validez; una API protegida responde 401 cuando expira y el frontend lleva al login.

