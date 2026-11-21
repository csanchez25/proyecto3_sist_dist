import { readFile } from 'node:fs/promises';
import { getRedis } from '../src/redis.mjs';
import { recordKey, indexKey, sequenceKey } from '../src/store.mjs';

const seed = JSON.parse(await readFile(new URL('../data/seed.json', import.meta.url), 'utf8'));
const db = await getRedis();
for (const kind of ['countries', 'bridge_types', 'bridges']) {
  let added = 0;
  for (const doc of seed[kind]) {
    // Respeta los registros preexistentes: no sobrescribir modificaciones del estudiante.
    const ok = await db.set(recordKey(kind, doc.id), JSON.stringify(doc), { NX: true });
    if (ok) added++;
    await db.sAdd(indexKey(kind), String(doc.id));
  }
  // El contador nunca debe retroceder (p. ej., si se ejecuta seed después de nuevos CRUD).
  const high = Math.max(...seed[kind].map(d => d.id));
  const current = Number((await db.get(sequenceKey(kind))) ?? 0);
  if (current < high) await db.set(sequenceKey(kind), String(high));
  console.log(`${kind}: ${seed[kind].length} registros semilla, ${added} añadidos`);
}
await db.quit();
console.log('Carga inicial de Redis completada.');
