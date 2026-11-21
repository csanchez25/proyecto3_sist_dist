const { createApp } = Vue;
createApp({
  data() {
    return {
      isRegister: document.body.dataset.authPage === 'register',
      name: '', email: '', password: '',
      busy: false, error: ''
    };
  },
  methods: {
    async submit() {
      this.busy = true;
      this.error = '';
      try {
        const data = await apiRequest(this.isRegister ? '/api/auth/register' : '/api/auth/login', {
          method: 'POST',
          body: JSON.stringify(this.isRegister
            ? { name: this.name, email: this.email, password: this.password }
            : { email: this.email, password: this.password })
        });
        authSetSession(data);
        const destination = new URLSearchParams(window.location.search).get('next') || '/bridges.html';
        // Solo permitir rutas relativas internas para evitar redirecciones a sitios ajenos.
        window.location.assign(destination.startsWith('/') && !destination.startsWith('//') && !destination.startsWith('/\\') ? destination : '/bridges.html');
      } catch (e) { this.error = e.message; }
      finally { this.busy = false; }
    }
  }
}).mount('#app');
