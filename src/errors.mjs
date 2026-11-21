export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}
export const fail = (status, message) => { throw new ApiError(status, message); };

export function mustText(value, field, max = 500) {
  if (typeof value !== 'string' || !value.trim()) fail(400, `El campo '${field}' es obligatorio.`);
  const result = value.trim();
  if (result.length > max) fail(400, `El campo '${field}' es demasiado largo.`);
  return result;
}
export function optionalText(value, max = 2000) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string' || value.length > max) fail(400, 'El texto proporcionado no es válido.');
  return value.trim() || null;
}
export function optionalNumber(value, field) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n)) fail(400, `El campo '${field}' debe ser numérico.`);
  return n;
}
export function positiveId(value, field = 'id') {
  if (value === null || value === undefined || value === '' || !/^\d+$/.test(String(value))) {
    fail(400, `El campo '${field}' debe ser un entero positivo.`);
  }
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 1) fail(400, `El campo '${field}' debe ser un entero positivo.`);
  return n;
}
export function normalize(entity, body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail(400, 'El cuerpo debe ser un objeto JSON.');
  if (entity === 'bridges') return {
    name: mustText(body.name, 'name', 150),
    city: mustText(body.city, 'city', 120),
    country_id: positiveId(body.country_id, 'country_id'),
    bridge_type_id: positiveId(body.bridge_type_id, 'bridge_type_id'),
    completion_year: optionalNumber(body.completion_year, 'completion_year'),
    length_m: optionalNumber(body.length_m, 'length_m'),
    main_span_m: optionalNumber(body.main_span_m, 'main_span_m'),
    description: mustText(body.description, 'description', 5000),
    image_url: optionalText(body.image_url, 1500),
    source_url: optionalText(body.source_url, 1500),
    latitude: optionalNumber(body.latitude, 'latitude'),
    longitude: optionalNumber(body.longitude, 'longitude')
  };
  if (entity === 'countries') return {
    name: mustText(body.name, 'name', 120),
    continent: mustText(body.continent, 'continent', 100),
    capital: mustText(body.capital, 'capital', 120),
    iso_code: mustText(body.iso_code, 'iso_code', 2).toUpperCase(),
    image_url: optionalText(body.image_url, 1500),
    description: optionalText(body.description, 5000)
  };
  if (entity === 'bridge_types') return {
    name: mustText(body.name, 'name', 120),
    description: mustText(body.description, 'description', 5000),
    structural_principle: mustText(body.structural_principle, 'structural_principle', 5000),
    typical_material: mustText(body.typical_material, 'typical_material', 500),
    image_url: optionalText(body.image_url, 1500)
  };
  fail(404, 'Recurso desconocido.');
}
