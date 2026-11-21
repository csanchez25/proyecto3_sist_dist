# API REST del Proyecto 2

**Base URL**: `/api` (misma URL pública en Netlify mediante redirección interna). Los GET de catálogo son públicos. POST, PUT y DELETE requieren JWT válido en `Authorization: Bearer <TOKEN>` y rol editor.

| Método | Endpoint | Acción | Acceso |
|---|---|---|---|
| GET | `/api/health` | Salud Redis | Público |
| POST | `/api/auth/register` | Registro; devuelve usuario y JWT | Público |
| POST | `/api/auth/login` | Inicio de sesión; devuelve usuario y JWT | Público |
| GET | `/api/auth/me` | Perfil del usuario de la sesión | Autenticado |
| GET | `/api/bridges` | Lista los puentes; filtros `search`, `country_id`, `bridge_type_id` | Público |
| GET | `/api/bridges/:id` | Detalle de puente (incluye país y tipo) | Público |
| POST | `/api/bridges` | Crear puente | Editor |
| PUT | `/api/bridges/:id` | Editar puente | Editor |
| DELETE | `/api/bridges/:id` | Eliminar puente | Editor |
| GET | `/api/countries` | Lista países y cuenta puentes | Público |
| GET | `/api/countries/:id` | Consultar país | Público |
| GET | `/api/countries/:id/bridges` | Puentes del país | Público |
| POST | `/api/countries` | Crear país | Editor |
| PUT | `/api/countries/:id` | Actualizar país | Editor |
| DELETE | `/api/countries/:id` | Eliminar país sin puentes | Editor |
| GET | `/api/bridge-types` | Lista tipos de puente | Público |
| GET | `/api/bridge-types/:id` | Consultar tipo | Público |
| GET | `/api/bridge-types/:id/bridges` | Puentes del tipo | Público |
| POST | `/api/bridge-types` | Crear tipo | Editor |
| PUT | `/api/bridge-types/:id` | Actualizar tipo | Editor |
| DELETE | `/api/bridge-types/:id` | Eliminar tipo sin puentes | Editor |

## Peticiones ejemplo

```bash
curl -X POST https://TU-SITIO.netlify.app/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Ejemplo","email":"ejemplo@example.com","password":"ClaveDePruebaSegura123"}'

curl -X POST https://TU-SITIO.netlify.app/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"ejemplo@example.com","password":"ClaveDePruebaSegura123"}'

curl -X POST https://TU-SITIO.netlify.app/api/bridges \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer TU_TOKEN' \
  -d '{"name":"Puente de ejemplo","city":"Ciudad","country_id":1,"bridge_type_id":1,"description":"Registro de prueba"}'
```

## Códigos de estado

- **200** éxito de GET/PUT/DELETE/login.
- **201** registro de usuario o entidad creada.
- **400** campos incorrectos o JSON inválido.
- **401** token ausente, inválido, expirado o credenciales erróneas.
- **403** usuario autenticado sin permiso de escritura.
- **404** entidad o ruta no encontrada.
- **405** método no permitido.
- **409** valores únicos duplicados o intento de borrar país/tipo usado.
- **413** cuerpo demasiado grande.
- **422** referencia a país o tipo inexistente.
- **503** problema de configuración/conectividad del servicio.
