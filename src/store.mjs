import { fail, normalize } from './errors.mjs';

export const COLLECTIONS = Object.freeze({ 'bridges': 'bridges', 'countries': 'countries', 'bridge-types': 'bridge_types' });
const root = 'catalog:v2';
export const recordKey = (kind, id) => `${root}:${kind}:${id}`;
export const indexKey = kind => `${root}:index:${kind}`;
export const sequenceKey = kind => `${root}:seq:${kind}`;

export async function listRecords(db, kind) {
  const ids = await db.sMembers(indexKey(kind));
  if (!ids.length) return [];
  const values = await db.mGet(ids.map(id => recordKey(kind, id)));
  return values.filter(Boolean).map(value => JSON.parse(value)).sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
}
export async function findRecord(db, kind, id) {
  const json = await db.get(recordKey(kind, id));
  return json ? JSON.parse(json) : null;
}
const countFor = (bridges, kind, id) => bridges.filter(b => b[kind] === id).length;
const fold = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

async function ensureRelations(db, values) {
  if (!(await findRecord(db, 'countries', values.country_id))) fail(422, 'El país indicado no existe.');
  if (!(await findRecord(db, 'bridge_types', values.bridge_type_id))) fail(422, 'El tipo de puente indicado no existe.');
}
async function checkUnique(db, kind, data, id = null) {
  const others = (await listRecords(db, kind)).filter(item => item.id !== id);
  if (others.some(item => fold(item.name) === fold(data.name))) fail(409, 'Ya existe un registro con ese nombre.');
  if (kind === 'countries' && others.some(item => item.iso_code === data.iso_code)) fail(409, 'El código ISO ya existe.');
}

export async function listEntities(db, kind, query = new URLSearchParams()) {
  const [items, bridges, countries, types] = await Promise.all([
    listRecords(db, kind), listRecords(db, 'bridges'), listRecords(db, 'countries'), listRecords(db, 'bridge_types')
  ]);
  if (kind === 'countries') return items.map(item => ({ ...item, bridge_count: countFor(bridges, 'country_id', item.id) }));
  if (kind === 'bridge_types') return items.map(item => ({ ...item, bridge_count: countFor(bridges, 'bridge_type_id', item.id) }));
  const countryMap = new Map(countries.map(c => [c.id, c]));
  const typeMap = new Map(types.map(t => [t.id, t]));
  let results = items.map(b => ({ ...b, country_name: countryMap.get(b.country_id)?.name ?? '', country_iso_code: countryMap.get(b.country_id)?.iso_code ?? '', bridge_type_name: typeMap.get(b.bridge_type_id)?.name ?? '' }));
  const search = query.get('search')?.trim();
  const country = query.get('country_id');
  const type = query.get('bridge_type_id');
  if (search) results = results.filter(b => [b.name, b.city, b.country_name].some(v => fold(v).includes(fold(search))));
  if (country !== null && country !== '') {
    const id = Number(country);
    if (!Number.isSafeInteger(id) || id < 1) fail(400, "El campo 'country_id' debe ser un entero positivo.");
    results = results.filter(b => b.country_id === id);
  }
  if (type !== null && type !== '') {
    const id = Number(type);
    if (!Number.isSafeInteger(id) || id < 1) fail(400, "El campo 'bridge_type_id' debe ser un entero positivo.");
    results = results.filter(b => b.bridge_type_id === id);
  }
  return results;
}

export async function getEntity(db, kind, id) {
  const entity = await findRecord(db, kind, id);
  if (!entity) fail(404, kind === 'bridges' ? 'Puente no encontrado.' : kind === 'countries' ? 'País no encontrado.' : 'Tipo de puente no encontrado.');
  if (kind === 'bridges') {
    const [country, type] = await Promise.all([findRecord(db, 'countries', entity.country_id), findRecord(db, 'bridge_types', entity.bridge_type_id)]);
    return {
      ...entity,
      country_name: country?.name ?? '', country_continent: country?.continent ?? '',
      country_capital: country?.capital ?? '', country_iso_code: country?.iso_code ?? '',
      bridge_type_name: type?.name ?? '', bridge_type_description: type?.description ?? '',
      structural_principle: type?.structural_principle ?? '', typical_material: type?.typical_material ?? ''
    };
  }
  const bridges = await listRecords(db, 'bridges');
  return { ...entity, bridge_count: countFor(bridges, kind === 'countries' ? 'country_id' : 'bridge_type_id', id) };
}

export async function relatedBridges(db, kind, id) {
  await getEntity(db, kind, id); // 404 si no existe.
  const [bridges, countries, types] = await Promise.all([listRecords(db, 'bridges'), listRecords(db, 'countries'), listRecords(db, 'bridge_types')]);
  const field = kind === 'countries' ? 'country_id' : 'bridge_type_id';
  return bridges.filter(b => b[field] === id).map(b => ({ ...b,
    country_name: countries.find(c => c.id === b.country_id)?.name ?? '',
    bridge_type_name: types.find(t => t.id === b.bridge_type_id)?.name ?? ''
  }));
}

export async function createEntity(db, kind, raw) {
  const data = normalize(kind, raw);
  if (kind === 'bridges') await ensureRelations(db, data);
  await checkUnique(db, kind, data);
  const id = await db.incr(sequenceKey(kind));
  const doc = { id, ...data };
  await db.set(recordKey(kind, id), JSON.stringify(doc));
  await db.sAdd(indexKey(kind), String(id));
  return doc;
}
export async function updateEntity(db, kind, id, raw) {
  if (!(await findRecord(db, kind, id))) await getEntity(db, kind, id);
  const data = normalize(kind, raw);
  if (kind === 'bridges') await ensureRelations(db, data);
  await checkUnique(db, kind, data, id);
  const doc = { id, ...data };
  await db.set(recordKey(kind, id), JSON.stringify(doc));
  return getEntity(db, kind, id);
}
export async function deleteEntity(db, kind, id) {
  if (!(await findRecord(db, kind, id))) await getEntity(db, kind, id);
  if (kind !== 'bridges') {
    const bridges = await listRecords(db, 'bridges');
    const field = kind === 'countries' ? 'country_id' : 'bridge_type_id';
    if (bridges.some(b => b[field] === id)) fail(409, kind === 'countries'
      ? 'No se puede eliminar el país porque tiene puentes asociados.'
      : 'No se puede eliminar el tipo porque tiene puentes asociados.');
  }
  await db.del(recordKey(kind, id));
  await db.sRem(indexKey(kind), String(id));
  return { message: kind === 'bridges' ? 'Puente eliminado correctamente.' : kind === 'countries' ? 'País eliminado correctamente.' : 'Tipo eliminado correctamente.' };
}
