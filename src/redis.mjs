import { createClient } from 'redis';

// Module-scope singleton: a warm Netlify Function may reuse the socket.
let client;
let connecting;

export async function getRedis() {
  const url = process.env.REDIS_URL;
  if (!url) throw new Error('Falta configurar REDIS_URL en el entorno de Netlify.');
  if (!client) {
    client = createClient({
      url,
      socket: { connectTimeout: 7000, reconnectStrategy: retries => retries < 3 ? Math.min(100 * 2 ** retries, 1000) : new Error('Sin conexión a Redis') }
    });
    client.on('error', () => { /* No mostrar credenciales ni URL en logs. */ });
  }
  if (!client.isReady && !client.isOpen) {
    connecting ||= client.connect().finally(() => { connecting = null; });
    await connecting;
  }
  return client;
}
