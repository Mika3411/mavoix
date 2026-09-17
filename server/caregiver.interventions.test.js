import {it,expect} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {createInterventionStore}=require('./caregiver/interventions');
it('finishes only an unfinished alert in the authorized room with server time',async()=>{
 const requests=[];
 const store=createInterventionStore(async(method,path,body)=>{requests.push({method,path,body});return {ok:true,data:[{id:'a',created_at:'2026-01-01T00:00:00Z',ended_at:body.ended_at}]};});
 const before=Date.now();const result=await store.finish('private-room','a');
 const query=new URL('http://test/'+requests[0].path).searchParams;
 expect(requests[0].method).toBe('PATCH');expect(query.get('room_key')).toBe('eq.private-room');expect(query.get('ended_at')).toBe('is.null');expect(query.get('id')).toBe('eq.a');expect(Date.parse(result.endedAt)).toBeGreaterThanOrEqual(before);
});
it('preserves the first finish on retries and rejects a foreign or absent id',async()=>{
 const ended='2026-01-01T01:00:00Z';
 const store=createInterventionStore(async method=>({ok:true,data:method==='PATCH'?[]:[{id:'a',ended_at:ended}]}));
 expect((await store.finish('room','a')).endedAt).toBe(ended);
 const missing=createInterventionStore(async()=>({ok:true,data:[]}));
 await expect(missing.finish('another-room','a')).rejects.toThrow('introuvable');
});
it('never acknowledges persistence failure as success',async()=>{
 const store=createInterventionStore(async()=>({ok:false}));
 await expect(store.finish('room','a')).rejects.toThrow();
 await expect(store.pending('room')).rejects.toThrow();
});
