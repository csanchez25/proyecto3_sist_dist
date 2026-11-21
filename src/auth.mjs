import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { fail, mustText } from './errors.mjs';
const scrypt = promisify(scryptCallback);
const ROOT = 'catalog:v2:users';
const utf8 = value => Buffer.from(JSON.stringify(value)).toString('base64url');

function jwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || Buffer.byteLength(secret, 'utf8') < 32) throw new Error('JWT_SECRET debe estar configurado y tener por lo menos 32 bytes.');
  return secret;
}
export function createToken(user, ttlSeconds = 3600) {
  const now = Math.floor(Date.now() / 1000);
  const head = utf8({ alg: 'HS256', typ: 'JWT' });
  const body = utf8({ sub: String(user.id), role: user.role, iat: now, exp: now + ttlSeconds, iss: 'catalogo-puentes' });
  const message = `${head}.${body}`;
  return `${message}.${createHmac('sha256', jwtSecret()).update(message).digest('base64url')}`;
}
export function verifyToken(token) {
  if (typeof token !== 'string' || token.length > 4096) fail(401, 'Token inválido o expirado.');
  const parts = token.split('.');
  if (parts.length !== 3) fail(401, 'Token inválido o expirado.');
  const [h, p, s] = parts;
  let header, payload;
  try { header = JSON.parse(Buffer.from(h, 'base64url').toString()); payload = JSON.parse(Buffer.from(p, 'base64url').toString()); }
  catch { fail(401, 'Token inválido o expirado.'); }
  if (header?.alg !== 'HS256' || header?.typ !== 'JWT') fail(401, 'Token inválido o expirado.');
  const sig = createHmac('sha256', jwtSecret()).update(`${h}.${p}`).digest();
  let received;
  try { received = Buffer.from(s, 'base64url'); } catch { fail(401, 'Token inválido o expirado.'); }
  if (received.length !== sig.length || !timingSafeEqual(sig, received)) fail(401, 'Token inválido o expirado.');
  const now = Math.floor(Date.now() / 1000);
  if (payload?.iss !== 'catalogo-puentes' || !/^\d+$/.test(String(payload.sub || '')) || !Number.isSafeInteger(payload.exp) || payload.exp <= now || !Number.isSafeInteger(payload.iat) || payload.iat > now + 30) {
    fail(401, 'Token inválido o expirado.');
  }
  return payload;
}
async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = await scrypt(password, salt, 64);
  return `scrypt:${salt}:${hash.toString('hex')}`;
}
async function comparePassword(password, stored) {
  if (typeof stored !== 'string') return false;
  const [algorithm, salt, h] = stored.split(':');
  if (algorithm !== 'scrypt' || !/^[a-f0-9]{32}$/.test(salt || '') || !/^[a-f0-9]{128}$/.test(h || '')) return false;
  const actual = await scrypt(password, salt, 64);
  return timingSafeEqual(actual, Buffer.from(h, 'hex'));
}
const publicUser = ({ password_hash, ...user }) => user;
const normalizeEmail = value => {
  const mail = mustText(value, 'email', 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) fail(400, 'Correo electrónico inválido.');
  return mail;
};
const passwordOk = value => typeof value === 'string' && value.length >= 8 && Buffer.byteLength(value) <= 128;
export async function register(db, body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail(400, 'Datos de registro inválidos.');
  const name = mustText(body.name, 'name', 120);
  const email = normalizeEmail(body.email);
  if (!passwordOk(body.password)) fail(400, 'La contraseña debe contener al menos 8 caracteres (máximo 128 bytes).');
  // No se permite asignar roles especiales desde el registro público.
  const id = await db.incr(`${ROOT}:seq`);
  const unique = await db.set(`${ROOT}:email:${email}`, String(id), { NX: true });
  if (!unique) fail(409, 'Este correo ya está registrado.');
  try {
    const user = { id, name, email, password_hash: await hashPassword(body.password), role: 'editor' };
    await db.set(`${ROOT}:id:${id}`, JSON.stringify(user));
    return { user: publicUser(user), token: createToken(user) };
  } catch (err) {
    await db.del(`${ROOT}:email:${email}`);
    await db.del(`${ROOT}:id:${id}`);
    throw err;
  }
}
export async function login(db, body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail(400, 'Datos de acceso inválidos.');
  const email = normalizeEmail(body.email);
  if (typeof body.password !== 'string') fail(401, 'Credenciales incorrectas.');
  const id = await db.get(`${ROOT}:email:${email}`);
  const raw = id ? await db.get(`${ROOT}:id:${id}`) : null;
  const user = raw ? JSON.parse(raw) : null;
  if (!user || !(await comparePassword(body.password, user.password_hash))) fail(401, 'Credenciales incorrectas.');
  return { user: publicUser(user), token: createToken(user) };
}
export async function requireUser(db, request, allowReadOnly = false) {
  const match = /^Bearer ([A-Za-z0-9_.-]+)$/.exec(request.headers.get('authorization') || '');
  if (!match) fail(401, 'Debe iniciar sesión para realizar esta operación.');
  const jwt = verifyToken(match[1]);
  const raw = await db.get(`${ROOT}:id:${jwt.sub}`);
  if (!raw) fail(401, 'La sesión ya no es válida.');
  const user = JSON.parse(raw);
  if (user.role !== jwt.role) fail(401, 'La sesión ya no es válida.');
  if (!allowReadOnly && user.role !== 'editor') fail(403, 'No tiene permisos para modificar registros.');
  return publicUser(user);
}
