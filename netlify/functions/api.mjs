import { getRedis } from '../../src/redis.mjs';
import { createApiHandler } from '../../src/router.mjs';

// Modern Netlify Functions API: Request -> Response.
export default createApiHandler(getRedis);
