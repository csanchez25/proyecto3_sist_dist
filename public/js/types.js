const { createApp } = window.Vue;
const emptyType = () => ({ name:"", description:"", structural_principle:"", typical_material:"", image_url:"" });
createApp({
  data:()=>({ types:[], showForm:false, editingId:null, form:emptyType(), detail:null, message:"", messageType:"success" }),
  computed:{ canEdit(){ return authCanEdit(); } },
  methods:{
    imageFallback,
    notify(text,type="success"){ this.message=text; this.messageType=type; window.scrollTo({top:0,behavior:"smooth"}); setTimeout(()=>{if(this.message===text)this.message=""},4500); },
    async load(){ try{ this.types=await apiRequest("/api/bridge-types"); }catch(e){ this.notify(e.message,"error"); } },
    startCreate(){ if(!authCanEdit())return authGoToLogin(); this.editingId=null; this.form=emptyType(); this.showForm=true; },
    startEdit(t){ if(!authCanEdit())return authGoToLogin(); this.editingId=t.id; this.form={name:t.name,description:t.description,structural_principle:t.structural_principle,typical_material:t.typical_material,image_url:t.image_url||""}; this.showForm=true; window.scrollTo({top:0,behavior:"smooth"}); },
    cancelForm(){ this.showForm=false; this.editingId=null; this.form=emptyType(); },
    async save(){ try{ const method=this.editingId?"PUT":"POST"; const path=this.editingId?`/api/bridge-types/${this.editingId}`:"/api/bridge-types"; await apiRequest(path,{method,body:JSON.stringify(this.form)}); this.notify(this.editingId?"Tipo actualizado.":"Tipo creado."); this.cancelForm(); await this.load(); }catch(e){ this.notify(e.message,"error"); } },
    async viewType(id){ try{ const [type,bridges]=await Promise.all([apiRequest(`/api/bridge-types/${id}`),apiRequest(`/api/bridge-types/${id}/bridges`)]); this.detail={type,bridges}; }catch(e){ this.notify(e.message,"error"); } },
    async removeType(t){ if(!confirm(`¿Eliminar '${t.name}'?`))return; try{ await apiRequest(`/api/bridge-types/${t.id}`,{method:"DELETE"}); this.notify("Tipo eliminado."); await this.load(); }catch(e){ this.notify(e.message,"error"); } }
  }, mounted(){ this.load(); }
}).mount("#app");
