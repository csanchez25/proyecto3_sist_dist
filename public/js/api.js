window.apiRequest = async function apiRequest(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (options.body !== undefined && !headers.has('content-type')) headers.set('Content-Type', 'application/json');
  const authEndpoint = /^\/api\/auth\/(?:register|login)$/.test(path);
  const token = authEndpoint ? null : sessionStorage.getItem('puentes_jwt');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(path, { ...options, headers });
  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await response.json() : await response.text();
  if (response.status === 401 && token) {
    sessionStorage.removeItem('puentes_jwt');
    sessionStorage.removeItem('puentes_user');
    const next = window.location.pathname + window.location.search;
    window.location.assign(`/login.html?next=${encodeURIComponent(next)}`);
    throw new Error('La sesión ha expirado. Inicie sesión nuevamente.');
  }
  if (!response.ok) {
    throw new Error(typeof body === 'object' && body?.error ? body.error : `Error HTTP ${response.status}`);
  }
  return body;
};
window.imageFallback = function imageFallback(event) {
  if (event.target.src.startsWith('data:')) return;
  event.target.src = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
    <svg xmlns='http://www.w3.org/2000/svg' width='800' height='500'>
      <rect width='100%' height='100%' fill='#e9eef5'/>
      <text x='50%' y='50%' text-anchor='middle' dominant-baseline='middle' fill='#667085' font-size='28'>Imagen no disponible</text>
    </svg>
  `);
};
