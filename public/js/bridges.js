const { createApp } = window.Vue;

const emptyBridge = () => ({
  name: "", city: "", country_id: "", bridge_type_id: "", completion_year: "",
  length_m: "", main_span_m: "", description: "", image_url: "", source_url: "",
  latitude: "", longitude: ""
});

createApp({
  data() {
    return {
      bridges: [], countries: [], types: [], loading: true,
      search: "", countryFilter: "", typeFilter: "",
      showForm: false, editingId: null, form: emptyBridge(), detail: null,
      message: "", messageType: "success"
    };
  },
  computed: {
    canEdit() { return authCanEdit(); },
    filteredBridges() {
      const s = this.search.trim().toLowerCase();
      return this.bridges.filter(b => {
        const matchesSearch = !s || [b.name, b.city, b.country_name, b.bridge_type_name].some(v => String(v || "").toLowerCase().includes(s));
        const matchesCountry = !this.countryFilter || String(b.country_id) === this.countryFilter;
        const matchesType = !this.typeFilter || String(b.bridge_type_id) === this.typeFilter;
        return matchesSearch && matchesCountry && matchesType;
      });
    }
  },
  methods: {
    imageFallback,
    formatNumber(value) { return value === null || value === undefined ? "—" : Number(value).toLocaleString("es-CR"); },
    formatYear(value) { return Number(value) === 50 ? "Siglo I d. C." : (value || "—"); },
    notify(text, type = "success") { this.message = text; this.messageType = type; window.scrollTo({ top: 0, behavior: "smooth" }); setTimeout(() => { if (this.message === text) this.message = ""; }, 4500); },
    async load() {
      this.loading = true;
      try {
        [this.bridges, this.countries, this.types] = await Promise.all([
          apiRequest("/api/bridges"), apiRequest("/api/countries"), apiRequest("/api/bridge-types")
        ]);
      } catch (e) { this.notify(e.message, "error"); }
      finally { this.loading = false; }
    },
    startCreate() { if (!authCanEdit()) return authGoToLogin(); this.editingId = null; this.form = emptyBridge(); this.showForm = true; },
    startEdit(bridge) { if (!authCanEdit()) return authGoToLogin();
      this.editingId = bridge.id;
      this.form = {
        name: bridge.name, city: bridge.city, country_id: bridge.country_id, bridge_type_id: bridge.bridge_type_id,
        completion_year: bridge.completion_year ?? "", length_m: bridge.length_m ?? "", main_span_m: bridge.main_span_m ?? "",
        description: bridge.description, image_url: bridge.image_url || "", source_url: bridge.source_url || "",
        latitude: bridge.latitude ?? "", longitude: bridge.longitude ?? ""
      };
      this.showForm = true;
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    cancelForm() { this.showForm = false; this.editingId = null; this.form = emptyBridge(); },
    async save() {
      try {
        const method = this.editingId ? "PUT" : "POST";
        const path = this.editingId ? `/api/bridges/${this.editingId}` : "/api/bridges";
        await apiRequest(path, { method, body: JSON.stringify(this.form) });
        this.notify(this.editingId ? "Puente actualizado." : "Puente creado.");
        this.cancelForm();
        await this.load();
      } catch (e) { this.notify(e.message, "error"); }
    },
    async viewBridge(id) {
      try { this.detail = await apiRequest(`/api/bridges/${id}`); }
      catch (e) { this.notify(e.message, "error"); }
    },
    async removeBridge(bridge) {
      if (!confirm(`¿Eliminar '${bridge.name}'?`)) return;
      try { await apiRequest(`/api/bridges/${bridge.id}`, { method: "DELETE" }); this.notify("Puente eliminado."); await this.load(); }
      catch (e) { this.notify(e.message, "error"); }
    }
  },
  mounted() { this.load(); }
}).mount("#app");
