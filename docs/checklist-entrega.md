# Checklist de entrega — Proyecto 2

## Ya incorporado en el código

- [x] Mismo tema y mismas tres entidades del Proyecto 1.
- [x] API migrada de Cloudflare Workers a Netlify Functions.
- [x] Rutas públicas `/api/*` configuradas por `netlify.toml`.
- [x] Frontends Vue incluidos en `public/` y publicables junto a las funciones.
- [x] Repositorio sin credenciales en archivos.
- [x] Persistencia adaptada de D1/SQLite a Redis (documentos JSON e índices).
- [x] Importación de 12 puentes, 8 países y 6 tipos con imágenes.
- [x] Relaciones mediante IDs y verificación de borrados restringidos.
- [x] CRUD de las tres entidades; filtros y vistas de detalle.
- [x] Cliente Redis conectado desde un singleton reutilizable por proceso.
- [x] Registro de usuarios, almacenamiento scrypt, inicio de sesión y JWT con expiración.
- [x] Validación de JWT en POST/PUT/DELETE, 401 y 403.
- [x] Vistas Vue para registro/login, token de sesión y logout.
- [x] UI con creación/edición/borrado solo para usuario con rol editor.
- [x] Pruebas automatizadas del backend con Redis simulado (`npm test`).
- [x] README con estudiante e instrucciones de variables y despliegue.

## Pendiente en las cuentas del estudiante

- [ ] Crear/configurar Redis Cloud y habilitar acceso seguro desde Netlify.
- [ ] Configurar `REDIS_URL` y `JWT_SECRET` en Netlify (secretos nunca en el ZIP).
- [ ] `npm install` y `npm run seed` apuntando a Redis Cloud real.
- [ ] Publicar en Netlify y probar `/api/health`.
- [ ] Verificar en el sitio publicado las vistas, CRUD, autenticación y fotografías.
- [ ] Copiar la **URL real de Netlify** al campo de publicación del README.
- [ ] Preparar capturas de pantalla si las solicita el profesor.
