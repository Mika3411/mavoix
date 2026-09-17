const { supabaseRestRequest } = require('../supabase-rest');
const { requireCaregiverAccess } = require('./access');
const { enforceRateLimit } = require('./rateLimit');

function createInterventionStore(request = supabaseRestRequest) {
  async function query(method, filters, body) {
    const response = await request(method, `caregiver_alerts?${filters}`, body, {Prefer:'return=representation'});
    if (!response.ok || !Array.isArray(response.data)) throw new Error('Impossible d’enregistrer ou de lire les interventions. Réessayez une fois la connexion rétablie.');
    return response.data.map(row=>({id:row.id,createdAt:row.created_at,endedAt:row.ended_at||null,profileName:row.profile_name||''}));
  }
  async function pending(roomKey) {
    return query('GET',new URLSearchParams({room_key:`eq.${roomKey}`,ended_at:'is.null',select:'id,created_at,ended_at,profile_name',order:'created_at.desc,id.desc',limit:'100'}));
  }
  async function finish(roomKey,id) {
    const now=new Date().toISOString();
    const filters=new URLSearchParams({room_key:`eq.${roomKey}`,id:`eq.${id}`,ended_at:'is.null',created_at:`lte.${now}`,select:'id,created_at,ended_at,profile_name'});
    const updated=await query('PATCH',filters,{ended_at:now});
    if(updated.length)return updated[0];
    // Repeated taps/retries must preserve the original finishing timestamp.
    const existing=await query('GET',new URLSearchParams({room_key:`eq.${roomKey}`,id:`eq.${id}`,select:'id,created_at,ended_at,profile_name',limit:'1'}));
    if(!existing[0]?.endedAt)throw new Error('Intervention introuvable pour ce lien auxiliaire.');
    return existing[0];
  }
  return {pending,finish};
}
function registerInterventionRoutes(app,store=createInterventionStore()) {
  for(const action of ['pending','finish']) app.post(`/api/caregiver-alert/${action}`,async(req,res)=>{
    res.set('Cache-Control','no-store');
    const access=requireCaregiverAccess(req,res,'Le lien auxiliaire est invalide.');
    if(!access)return;
    if(!enforceRateLimit(req,res,`intervention-${action}`,60,60000,[access.roomKey]))return;
    const id=req.body?.id;
    if(action==='finish'&&(typeof id!=='string'||!/^[a-zA-Z0-9_-]{1,120}$/.test(id)))return res.status(400).json({error:'Identifiant d’intervention invalide.'});
    try {res.json(action==='pending'?{alerts:await store.pending(access.roomKey)}:{alert:await store.finish(access.roomKey,id)});}
    catch(error){res.status(503).json({error:error.message});}
  });
}
module.exports={createInterventionStore,registerInterventionRoutes};
