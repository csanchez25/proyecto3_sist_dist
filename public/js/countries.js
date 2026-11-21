const { createApp } = window.Vue;
const emptyCountry = () => ({ name: "", continent: "", capital: "", iso_code: "", image_url: "", description: "" });
createApp({
  data: () => ({ countries: [], showForm: false, editingId: null, form: emptyCountry(), detail: null, message: "", messageType: "success" }),
  computed: { canEdit() { return authCanEdit(); } },
  methods: {
    imageFallback,
    notify(text, type = "success") { this.message = text; this.messageType = type; window.scrollTo({ top: 0, behavior: "smooth" }); setTimeout(() => { if (this.message === text) this.message = "" }, 4500); },
    async load() { try { this.countries = await apiRequest("/api/countries"); } catch (e) { this.notify(e.message, "error"); } },
    startCreate() { if (!authCanEdit()) return authGoToLogin(); this.editingId = null; this.form = emptyCountry(); this.showForm = true; },
    startEdit(c) { if (!authCanEdit()) return authGoToLogin(); this.editingId = c.id; this.form = { name: c.name, continent: c.continent, capital: c.capital, iso_code: c.iso_code, image_url: c.image_url || "", description: c.description || "" }; this.showForm = true; window.scrollTo({ top: 0, behavior: "smooth" }); },
    cancelForm() { this.showForm = false; this.editingId = null; this.form = emptyCountry(); },
    async save() { try { const method = this.editingId ? "PUT" : "POST"; const path = this.editingId ? `/api/countries/${this.editingId}` : "/api/countries"; await apiRequest(path, { method, body: JSON.stringify(this.form) }); this.notify(this.editingId ? "País actualizado." : "País creado."); this.cancelForm(); await this.load(); } catch (e) { this.notify(e.message, "error"); } },
    async viewCountry(id) { try { const [country, bridges] = await Promise.all([apiRequest(`/api/countries/${id}`), apiRequest(`/api/countries/${id}/bridges`)]); this.detail = { country, bridges }; } catch (e) { this.notify(e.message, "error"); } },
    async removeCountry(c) { if (!confirm(`¿Eliminar '${c.name}'?`)) return; try { await apiRequest(`/api/countries/${c.id}`, { method: "DELETE" }); this.notify("País eliminado."); await this.load(); } catch (e) { this.notify(e.message, "error"); } }
  }, mounted() { this.load(); }
}).mount("#app");
