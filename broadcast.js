const fs = require('fs');
const path = require('path');
module.exports = function(io, {dataDir, can, saveDataUrl}) {
 const file = path.join(dataDir, 'broadcast.json');
 const defaults = (banner=false) => ({enabled:false, rotate:banner, intervalSec:banner?60:15, holdSec:10, fadeMs:banner?1200:800, gapSec:0, width:banner?1280:150, x:24, y:banner?38:24, index:0, epoch:Date.now(), images:[]});
 let state = {master:true, banner:defaults(true), tl:defaults(), tr:defaults(), bl:defaults(), br:defaults()};
 try { const saved=JSON.parse(fs.readFileSync(file)); for(const k of Object.keys(state)) if(k in saved) state[k]=k==='master'?!!saved[k]:{...state[k],...saved[k]}; } catch(e) {if(e.code!=='ENOENT') console.error('Unable to load broadcast settings:',e.message);}
 const keys=['banner','tl','tr','bl','br'];
 function emit(){io.emit('broadcastState',{...state,serverNow:Date.now()});}
 function commit(){fs.writeFileSync(file+'.tmp',JSON.stringify(state,null,2));fs.renameSync(file+'.tmp',file);emit();}
 io.on('connection',socket=>{
  socket.emit('broadcastState',{...state,serverNow:Date.now()});
  socket.on('broadcast', (p,ack=()=>{})=>{
   if(!can(socket)) return ack({ok:false,error:'Unlock the controller with your Control PIN first.'});
   try {
    if(!p||typeof p!=='object') throw Error('Invalid request');
    if(p.action==='master') state.master=!!p.value;
    else {
     if(!keys.includes(p.layer)) throw Error('Unknown layer');
     const s=state[p.layer];
     if(p.action==='update') {
      const patch=p.patch||{};
      for(const k of ['enabled','rotate']) if(k in patch) s[k]=!!patch[k];
      const bounds={intervalSec:[1,86400],holdSec:[1,3600],fadeMs:[0,5000],gapSec:[0,3600],width:p.layer==='banner'?[100,1920]:[20,500],x:[0,800],y:[0,900]};
      for(const [k,[min,max]] of Object.entries(bounds)) if(k in patch){const n=Number(patch[k]);if(!Number.isFinite(n)) throw Error('Invalid '+k);s[k]=Math.min(max,Math.max(min,n));}
      if(['enabled','rotate','intervalSec','holdSec','fadeMs','gapSec'].some(k=>k in patch)) s.epoch=Date.now();
     } else if(p.action==='upload') {
      if(s.images.length>=30) throw Error('Maximum 30 images per layer');
      s.images.push(saveDataUrl(p.dataUrl,p.name));
     } else if(p.action==='image') {
      const i=s.images.findIndex(x=>x.id===p.id);if(i<0) throw Error('Image not found');
      if(p.op==='delete') s.images.splice(i,1);
      else if(p.op==='toggle') s.images[i].enabled=!!p.enabled;
      else if(p.op==='up'||p.op==='down'){const j=Math.max(0,Math.min(s.images.length-1,i+(p.op==='up'?-1:1)));[s.images[i],s.images[j]]=[s.images[j],s.images[i]];}
      else if(p.op==='select') s.index=s.images.filter(x=>x.enabled).findIndex(x=>x.id===p.id);
      s.epoch=Date.now();
     } else if(p.action==='restart') s.epoch=Date.now();
     else throw Error('Unknown action');
    }
    commit();ack({ok:true});
   } catch(e){ack({ok:false,error:e.message});}
  });
 });
};
