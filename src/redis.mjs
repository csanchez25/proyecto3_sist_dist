
import { createClient } from 'redis';

let client;
let connecting;

export async function getRedis() {
  if (!client) {
    const host = process.env.REDIS_HOST?.trim();
    const port = Number(process.env.REDIS_PORT);
    const username = process.env.REDIS_USERNAME || 'default';
    const password = process.env.REDIS_PASSWORD;
    const tlsValue = (process.env.REDIS_TLS || 'false')
      .trim().toLowerCase();

    if (!host || !Number.isInteger(port) ||
        port < 1 || port > 65535 || !password) {
      throw new Error('Configuracion de Redis incompleta');
    }

    if (!['true', 'false'].includes(tlsValue)) {
      throw new Error('Valor de REDIS_TLS invalido');
    }

    client = createClient({
      username,
      password,
      socket: {
        host,
        port,
        tls: tlsValue === 'true',
        connectTimeout: 7000,
        reconnectStrategy: retries =>
          retries < 3
            ? Math.min(100 * 2 ** retries, 1000)
            : new Error('No se pudo conectar a Redis')
      }
    });

    client.on('error', (err) => {
      console.error('Redis connection error:', err.code || err.name);
    });
  }

  if (!client.isReady && !client.isOpen) {
    connecting ||= client.connect().finally(() => {
      connecting = null;
    });

    await connecting;
  }

  return client;
}
