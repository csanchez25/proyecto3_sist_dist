import { ApiError, fail, positiveId } from './errors.mjs';
import { COLLECTIONS, listEntities, getEntity, relatedBridges, createEntity, updateEntity, deleteEntity } from './store.mjs';
import { register, login, requireUser } from './auth.mjs';

const headers = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' };
const reply = (value, status = 200) => new Response(JSON.stringify(value), { status, headers });

function apiPath(url) {
  // Netlify puede pasar la ruta pública o la ruta reescrita a la Function.
  const path = url.pathname.replace(/^\/\.netlify\/functions\/api(?=\/|$)/, '/api');
  return path.split('/').filter(Boolean);
}
async function requestJSON(request) {
  const body = await request.text();
  if (body.length > 100_000) fail(413, 'El cuerpo excede el tamaño permitido.');
  try { return JSON.parse(body); } catch { fail(400, 'El cuerpo de la solicitud debe ser JSON válido.'); }
}

export function createApiHandler(getRedis) {
  return async function apiHandler(request) {
    try {
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { allow: 'GET, POST, PUT, DELETE, OPTIONS' } });
      const url = new URL(request.url);
      const parts = apiPath(url);
      if (parts[0] !== 'api') fail(404, 'Ruta no encontrada.');
      const db = await getRedis();
      if (parts.length === 2 && parts[1] === 'health' && request.method === 'GET') {
        return reply({ ok: (await db.ping()) === 'PONG', service: 'Catálogo de puentes famosos', database: 'Redis Cloud' });
      }
      if (parts.length === 3 && parts[1] === 'auth' && request.method === 'POST') {
        const input = await requestJSON(request);
        if (parts[2] === 'register') return reply(await register(db, input), 201);
        if (parts[2] === 'login') return reply(await login(db, input));
      }
      if (parts.length === 3 && parts[1] === 'auth' && parts[2] === 'me' && request.method === 'GET') {
        return reply(await requireUser(db, request, true));
      }
      const kind = COLLECTIONS[parts[1]];
      if (!kind || parts.length > 4 || parts.length === 1) fail(404, 'Ruta no encontrada.');
      const id = parts[2] === undefined ? null : positiveId(parts[2]);
      const relation = parts[3];
      if (relation && !(relation === 'bridges' && kind !== 'bridges')) fail(404, 'Ruta no encontrada.');
      if (request.method === 'GET') {
        if (id === null && !relation) return reply(await listEntities(db, kind, url.searchParams));
        if (id !== null && !relation) return reply(await getEntity(db, kind, id));
        if (id !== null && relation === 'bridges') return reply(await relatedBridges(db, kind, id));
      }
      if (['POST', 'PUT', 'DELETE'].includes(request.method) && !relation) {
        await requireUser(db, request);
        if (request.method === 'POST' && id === null) return reply(await createEntity(db, kind, await requestJSON(request)), 201);
        if (request.method === 'PUT' && id !== null) return reply(await updateEntity(db, kind, id, await requestJSON(request)));
        if (request.method === 'DELETE' && id !== null) return reply(await deleteEntity(db, kind, id));
      }
      fail(405, 'Método no permitido para esta ruta.');

    } catch (err) {
      if (err instanceof ApiError) {
        return reply({ error: err.message }, err.status);
      }

      // Diagnóstico sin exponer credenciales
      const details = [
        err?.code,
        err?.message,
        err?.cause?.code,
        err?.cause?.message,
        err?.cause?.cause?.code
      ].filter(Boolean).join(' ').toUpperCase();

      let diagnostic_code = 'INTERNAL_ERROR';

      if (/WRONGPASS|NOAUTH|AUTHENTICATION|INVALID PASSWORD/.test(details)) {
        diagnostic_code = 'REDIS_AUTH';
      } else if (/ENOTFOUND|EAI_AGAIN/.test(details)) {
        diagnostic_code = 'REDIS_DNS';
      } else if (/ETIMEDOUT|TIMEOUT/.test(details)) {
        diagnostic_code = 'REDIS_TIMEOUT';
      } else if (/ECONNREFUSED|ECONNRESET|EPIPE/.test(details)) {
        diagnostic_code = 'REDIS_NETWORK';
      } else if (/TLS|SSL|CERTIFICATE/.test(details)) {
        diagnostic_code = 'REDIS_TLS';
      } else if (/REDIS_URL|REDIS_HOST|REDIS_PORT|REDIS_TLS DEBE/.test(details)) {
        diagnostic_code = 'REDIS_CONFIG';
      } else if (/SIN CONEXI[ÓO]N A REDIS/.test(details)) {
        diagnostic_code = 'REDIS_UNREACHABLE';
      }

      console.error('Diagnóstico API:', diagnostic_code);

      return reply({
        ok: false,
        error: 'Error al conectar o procesar Redis.',
        diagnostic_code
      }, 503);
    }

  };
}
