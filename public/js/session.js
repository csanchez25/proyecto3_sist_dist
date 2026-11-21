window.authUser = function authUser() {
  if (!sessionStorage.getItem('puentes_jwt')) return null;
  try { return JSON.parse(sessionStorage.getItem('puentes_user') || 'null'); }
  catch { return null; }
};
window.authCanEdit = () => window.authUser()?.role === 'editor';
window.authSetSession = function authSetSession(data) {
  sessionStorage.setItem('puentes_jwt', data.token);
  sessionStorage.setItem('puentes_user', JSON.stringify(data.user));
};
window.authClearSession = function authClearSession() {
  sessionStorage.removeItem('puentes_jwt');
  sessionStorage.removeItem('puentes_user');
};
window.authGoToLogin = function authGoToLogin() {
  const next = window.location.pathname + window.location.search;
  window.location.assign(`/login.html?next=${encodeURIComponent(next)}`);
};

(function setupSessionNav() {
  const nav = document.querySelector('nav.nav');
  if (!nav) return;
  const user = authUser();
  if (user) {
    const label = document.createElement('span');
    label.className = 'nav-user';
    label.textContent = user.name;
    nav.append(label);
    const logout = document.createElement('button');
    logout.type = 'button';
    logout.className = 'nav-action';
    logout.textContent = 'Cerrar sesión';
    logout.addEventListener('click', () => {
      authClearSession();
      window.location.assign('/');
    });
    nav.append(logout);
    // Comprueba firma/expiración al cargar una página, incluso si solo se leen datos.
    apiRequest('/api/auth/me').catch(error => { console.warn('No se pudo validar la sesión:', error.message); });
  } else {
    const login = document.createElement('a');
    login.href = '/login.html';
    login.textContent = 'Iniciar sesión';
    const register = document.createElement('a');
    register.href = '/register.html';
    register.textContent = 'Registrarse';
    nav.append(login, register);
  }
})();
