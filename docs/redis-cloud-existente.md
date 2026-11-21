# Reutilizar Redis Cloud: `tarea5-bookstore`

Este proyecto puede compartir la base de datos gratuita de Redis Cloud que ya se usó para la **Tarea 5 — Bookstore**. **No necesita crear otra base de datos** ni cambiar el código del catálogo.

## 1. Verificar la instancia existente

1. Ingresar a https://cloud.redis.io/ y abrir la lista **Databases**.
2. Seleccionar **`tarea5-bookstore`**.
3. Confirmar que está activa y que aún tiene memoria disponible.
4. Seleccionar **Connect** y consultar el **endpoint**, **puerto**, **usuario**, **contraseña** y si requiere **TLS**. Las credenciales pueden estar ocultas o gestionarse desde la configuración de seguridad de la base.
5. Confirmar que el endpoint es alcanzable desde Netlify; si hay una restricción de red/IP, las funciones pueden no conectar hasta permitir el acceso apropiado.

El nombre `tarea5-bookstore` es la etiqueta de la instancia en la consola; **no** se escribe como nombre de base de datos dentro de la cadena de conexión.

## 2. Configurar `REDIS_URL` y `JWT_SECRET`

Tomar los valores **reales** de **Connect** y construir la URL compatible con Node Redis:

```text
redis://default:CONTRASENA@HOST:PUERTO
```

Si el endpoint requiere TLS:

```text
rediss://default:CONTRASENA@HOST:PUERTO
```

Si Redis muestra otro usuario, sustituir `default`; si la contraseña tiene caracteres reservados de URL (como `@`, `#` o `/`), codificarlos para URL. **Nunca incluir la URL real, la contraseña o `JWT_SECRET` en GitHub, capturas públicas o el ZIP de entrega.**

En **Netlify → Project configuration → Environment variables**, agregar `REDIS_URL` y `JWT_SECRET` con alcance disponible para **Functions**; generar `JWT_SECRET` con al menos 32 bytes. Esas variables se utilizan en tiempo de ejecución, no deben guardarse en `netlify.toml`.

## 3. Cargar el catálogo sin tocar la librería

En la terminal local, con las variables configuradas para `tarea5-bookstore`, ejecutar:

```bash
npm install
npm test
npm run seed
```

`npm run seed` agrega 12 puentes, 8 países y 6 tipos del proyecto original. Solo escribe en las claves del catálogo de puentes y no usa comandos que vacíen la base de datos (`FLUSHDB` / `FLUSHALL`). Es idempotente: al repetirlo, usa `SET NX` para no reemplazar registros que ya existen con la misma clave.

| Proyecto | Ejemplos de claves |
|---|---|
| Tarea 5 Bookstore | Se respetan sus claves existentes; no se renombran ni se borran |
| Proyecto 2 Puentes | `catalog:v2:bridges:1`, `catalog:v2:index:bridges`, `catalog:v2:seq:bridges` |
| Proyecto 2 Países | `catalog:v2:countries:1`, `catalog:v2:index:countries` |
| Proyecto 2 Tipos | `catalog:v2:bridge_types:1`, `catalog:v2:index:bridge_types` |
| Proyecto 2 Usuarios | `catalog:v2:users:id:1`, `catalog:v2:users:email:<correo>` |

**Antes de ejecutar la carga:** si la aplicación Bookstore original ya utiliza alguna clave que empieza por `catalog:v2:`, hay que cambiar el prefijo del Proyecto 2 para evitar conflictos. Si el plan gratuito está casi lleno, no realizar la carga sin liberar espacio de forma controlada o ampliar el plan. No eliminar registros que todavía utiliza Bookstore.

## 4. Comprobar la conexión y el despliegue

1. En Netlify ejecutar el despliegue del frontend y las funciones.
2. Acceder a `https://TU-SITIO.netlify.app/api/health` para comprobar que la función responde y conecta a Redis.
3. Visitar las rutas `/api/bridges`, `/api/countries`, `/api/bridge-types`; deben mostrar respectivamente 12, 8 y 6 registros después de la carga.
4. Registrar un usuario, iniciar sesión y verificar creación, edición y borrado de un **registro de prueba del catálogo de puentes**.
5. Verificar que la aplicación Bookstore original sigue mostrando sus datos.

## 5. Precauciones

- Redis Cloud Free limita los recursos de la base; ambas aplicaciones comparten capacidad y conexiones.
- No enviar credenciales por chat ni subir `.env` a repositorios.
- No cambiar el endpoint de Bookstore si esa aplicación todavía lo usa.
- Si las funciones de Netlify no conectan, primero comprobar TLS, puerto, contraseña y reglas de acceso de red antes de modificar el código.
