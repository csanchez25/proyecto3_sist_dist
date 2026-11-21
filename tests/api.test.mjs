import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createApiHandler } from '../src/router.mjs';
import { createToken } from '../src/auth.mjs';
import { recordKey, indexKey, sequenceKey } from '../src/store.mjs';

process.env.JWT_SECRET = 'test-only-32-or-more-byte-secret-that-is-not-used-in-production';
const data = JSON.parse(readFileSync(new URL('../data/seed.json', import.meta.url)));

class FakeRedis {
  constructor() { this.values = new Map(); this.sets = new Map(); }
  async ping() { return 'PONG'; }
  async get(k) { return this.values.get(k) ?? null; }
  async set(k, v, opts = {}) {
    if (opts.NX && this.values.has(k)) return null;
    this.values.set(k, String(v));
    return 'OK';
  }
  async del(k) { return Number(this.values.delete(k)); }
  async incr(k) { const next = Number(this.values.get(k) ?? 0) + 1; this.values.set(k, String(next)); return next; }
  async sMembers(k) { return [...(this.sets.get(k) || new Set())]; }
  async sAdd(k, v) { this.sets.set(k, this.sets.get(k) || new Set()); this.sets.get(k).add(String(v)); return 1; }
  async sRem(k, v) { return Number(this.sets.get(k)?.delete(String(v)) || false); }
  async mGet(keys) { return keys.map(k => this.values.get(k) ?? null); }
}
const db = new FakeRedis();
for (const kind of ['bridges', 'countries', 'bridge_types']) {
  for (const item of data[kind]) {
    await db.set(recordKey(kind, item.id), JSON.stringify(item));
    await db.sAdd(indexKey(kind), item.id);
  }
  await db.set(sequenceKey(kind), String(Math.max(...data[kind].map(d => d.id))));
}
const handle = createApiHandler(async () => db);
const req = async (url, method = 'GET', body, token) => {
  const response = await handle(new Request('https://catalogo.test' + url, {
    method,
    headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(body !== undefined ? { 'content-type': 'application/json' } : {}) },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {})
  }));
  const json = await response.json();
  return { status: response.status, json };
};

let jwt;
let newId;
test('El catálogo original mantiene 12 puentes, 8 países y 6 tipos con imágenes y referencias', async () => {
  for (const [endpoint, expected] of [['bridges', 12], ['countries', 8], ['bridge-types', 6]]) {
    const res = await req(`/api/${endpoint}`);
    assert.equal(res.status, 200);
    assert.equal(res.json.length, expected);
    assert(res.json.every(row => row.image_url && row.id > 0));
  }
  const detalle = await req('/api/bridges/1');
  assert.equal(detalle.json.country_name, 'Estados Unidos');
  assert.equal(detalle.json.bridge_type_name, 'Puente colgante');
  const relating = await req('/api/countries/1/bridges');
  assert(relating.json.some(bridge => bridge.name === 'Golden Gate Bridge'));
});

test('Filtros y consulta del catálogo siguen funcionando', async () => {
  const result = await req('/api/bridges?search=golden&country_id=1&bridge_type_id=1');
  assert.equal(result.json.length, 1);
  assert.equal(result.json[0].name, 'Golden Gate Bridge');
  assert.equal((await req('/api/bridges?country_id=xyz')).status, 400);
  assert.equal((await req('/api/countries/9999')).status, 404);
  assert.equal((await req('/.netlify/functions/api/health')).json.database, 'Redis Cloud');
});

test('Los cambios requieren JWT, y la inscripción almacena hash (no texto plano)', async () => {
  assert.equal((await req('/api/bridges', 'POST', data.bridges[0])).status, 401);
  assert.equal((await req('/api/bridges/1', 'DELETE')).status, 401);
  const r = await req('/api/auth/register', 'POST', { name: 'Caleb', email: 'caleb@test.example', password: 'MuySegura123' });
  assert.equal(r.status, 201);
  assert.equal(r.json.user.role, 'editor');
  jwt = r.json.token;
  const userStored = JSON.parse(await db.get('catalog:v2:users:id:1'));
  assert.equal(userStored.password_hash.startsWith('scrypt:'), true);
  assert.equal(userStored.password_hash.includes('MuySegura123'), false);
  assert.equal((await req('/api/auth/register', 'POST', { name: 'Duplicado', email: 'Caleb@TEST.example', password: 'MuySegura123' })).status, 409);
  assert.equal((await req('/api/auth/login', 'POST', { email: 'caleb@test.example', password: 'contraseña incorrecta' })).status, 401);
  const login = await req('/api/auth/login', 'POST', { email: 'caleb@test.example', password: 'MuySegura123' });
  assert.equal(login.status, 200);
  assert.equal((await req('/api/auth/me', 'GET', undefined, login.json.token)).json.email, 'caleb@test.example');
  assert.equal((await req('/api/auth/me', 'GET', undefined, createToken(r.json.user, -1))).status, 401);
  assert.equal((await req('/api/auth/me', 'GET', undefined, jwt.slice(0, -1) + 'X')).status, 401);
});

test('CRUD de puentes con referencias, validación y bloqueo del borrado relacionado', async () => {
  const ejemplo = { ...data.bridges[0], name: 'Puente de prueba', country_id: 1, bridge_type_id: 1 };
  const missing = await req('/api/bridges', 'POST', { ...ejemplo, country_id: 999 }, jwt);
  assert.equal(missing.status, 422);
  assert.equal((await req('/api/bridges', 'POST', { ...ejemplo, name: 'Golden Gate Bridge' }, jwt)).status, 409);
  const created = await req('/api/bridges', 'POST', ejemplo, jwt);
  assert.equal(created.status, 201);
  newId = created.json.id;
  assert.equal(newId, 13);
  const updated = await req(`/api/bridges/${newId}`, 'PUT', { ...ejemplo, name: 'Puente actualizado' }, jwt);
  assert.equal(updated.status, 200);
  assert.equal(updated.json.name, 'Puente actualizado');
  assert.equal((await req('/api/countries/1', 'DELETE', undefined, jwt)).status, 409);
  assert.equal((await req(`/api/bridges/${newId}`, 'DELETE', undefined, jwt)).status, 200);
  assert.equal((await req(`/api/bridges/${newId}`)).status, 404);
});

test('CRUD de países y tipos y rol de solo lectura con código 403', async () => {
  const country = await req('/api/countries', 'POST', {
    name: 'Canadá', continent: 'América del Norte', capital: 'Ottawa', iso_code: 'CA', image_url: 'https://example.test/ca.png'
  }, jwt);
  assert.equal(country.status, 201);
  const id = country.json.id;
  assert.equal((await req(`/api/countries/${id}`, 'PUT', { ...country.json, name: 'Canadá actualizado' }, jwt)).status, 200);
  assert.equal((await req(`/api/countries/${id}`, 'DELETE', undefined, jwt)).status, 200);
  const type = await req('/api/bridge-types', 'POST', {
    name: 'Otro tipo', description: 'Descripción', structural_principle: 'Tracción', typical_material: 'Acero'
  }, jwt);
  assert.equal(type.status, 201);
  assert.equal((await req(`/api/bridge-types/${type.json.id}`, 'DELETE', undefined, jwt)).status, 200);
  await db.set('catalog:v2:users:id:1', JSON.stringify({ ...JSON.parse(await db.get('catalog:v2:users:id:1')), role: 'viewer' }));
  const viewer = createToken({ id: 1, role: 'viewer' });
  assert.equal((await req('/api/bridges', 'POST', data.bridges[0], viewer)).status, 403);
});
