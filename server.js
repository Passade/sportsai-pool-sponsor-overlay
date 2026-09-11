const express=require('express');
const http=require('http');
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const {Server}=require('socket.io');

const app=express();
const server=http.createServer(app);
const io=new Server(server,{cors:{origin:'*'},maxHttpBufferSize:10*1024*1024});
const PORT=Number(process.env.PORT||3000);
const CONTROL_PIN=String(process.env.CONTROL_PIN||'').trim();
const publicDir=path.join(__dirname,'public');
const uploadDir=path.join('/tmp','sportsai-overlay-uploads');
fs.mkdirSync(uploadDir,{recursive:true});

app.use(express.static(publicDir));
app.use('/media',express.static(uploadDir));
app.get('/',(_r,res)=>res.redirect('/control.html'));
app.get('/health',(_r,res)=>res.json({ok:true}));

let state={
 images:[{id:'aura',name:'AURA Group / Starlink',imageUrl:'https://ik.imagekit.io/sportsaizim/Aura%201.png',enabled:true}],
 currentImageId:'aura',visible:true,x:1030,y:570,width:1050,opacity:.92,
 rotateZ:-3,skewX:-8,skewY:0,rotateX:0,rotateY:0,scaleX:1,scaleY:1,perspective:1200,
 autoEnabled:false,intervalSec:600,durationSec:30,transitionMs:350,
 rotationMode:'sequential',breakBehavior:'one',imageDurationSec:5,nextBreakAt:null
};

let autoTimer=null,hideTimer=null,cycleTimer=null;
const enabled=()=>state.images.filter(x=>x.enabled!==false&&x.imageUrl);
function ensureCurrent(){const list=enabled();if(!list.length){state.currentImageId=null;state.visible=false;return null;}let cur=list.find(x=>x.id===state.currentImageId);if(!cur){cur=list[0];state.currentImageId=cur.id;}return cur;}
function publicState(){const c=ensureCurrent();return {...state,currentImageUrl:c?.imageUrl||'',currentImageName:c?.name||'',imageCount:state.images.length,enabledImageCount:enabled().length};}
function emit(){io.emit('state',publicState());}
function clearBreak(){if(hideTimer)clearTimeout(hideTimer);if(cycleTimer)clearInterval(cycleTimer);hideTimer=cycleTimer=null;}
function step(dir=1){const list=enabled();if(!list.length)return;const i=Math.max(0,list.findIndex(x=>x.id===state.currentImageId));let n;if(state.rotationMode==='random'&&list.length>1){const choices=list.map((_,j)=>j).filter(j=>j!==i);n=choices[Math.floor(Math.random()*choices.length)];}else n=(i+dir+list.length)%list.length;state.currentImageId=list[n].id;}
function adBreak(){clearBreak();if(!enabled().length){state.visible=false;return emit();}ensureCurrent();state.visible=true;emit();if(state.breakBehavior==='cycle'&&enabled().length>1){cycleTimer=setInterval(()=>{step(1);emit();},Math.max(1,Number(state.imageDurationSec)||5)*1000);}hideTimer=setTimeout(()=>{if(cycleTimer)clearInterval(cycleTimer);cycleTimer=null;state.visible=false;if(state.breakBehavior==='one')step(1);emit();},Math.max(1,Number(state.durationSec)||30)*1000);}
function restartSchedule(){if(autoTimer)clearInterval(autoTimer);autoTimer=null;clearBreak();state.nextBreakAt=null;if(!state.autoEnabled)return emit();state.visible=false;const ms=Math.max(1,Number(state.intervalSec)||600)*1000;state.nextBreakAt=Date.now()+ms;emit();autoTimer=setInterval(()=>{state.nextBreakAt=Date.now()+ms;adBreak();},ms);}
function can(socket){return !CONTROL_PIN||socket.data.canControl;}
function guard(socket,ack){if(can(socket))return true;if(ack)ack({ok:false,error:'Control PIN required'});socket.emit('controlDenied');return false;}
function safeName(s){return String(s||'Sponsor').replace(/[<>]/g,'').slice(0,80)||'Sponsor';}
function saveDataUrl(dataUrl,name){const m=/^data:(image\/(?:png|jpeg|webp|gif));base64,(.+)$/i.exec(dataUrl||'');if(!m)throw new Error('Use PNG, JPG, WEBP or GIF');const ext=m[1].includes('png')?'png':m[1].includes('webp')?'webp':m[1].includes('gif')?'gif':'jpg';const id=crypto.randomUUID();const file=`${id}.${ext}`;fs.writeFileSync(path.join(uploadDir,file),Buffer.from(m[2],'base64'));return {id,name:safeName(path.parse(name||'Sponsor').name),imageUrl:`/media/${file}`,enabled:true};}

io.on('connection',socket=>{
 socket.data.canControl=!CONTROL_PIN||String(socket.handshake.auth?.pin||'')===CONTROL_PIN;
 socket.emit('auth',{requiresPin:Boolean(CONTROL_PIN),canControl:socket.data.canControl});
 socket.emit('state',publicState());
 socket.on('unlock',(pin,ack)=>{socket.data.canControl=!CONTROL_PIN||String(pin||'')===CONTROL_PIN;socket.emit('auth',{requiresPin:Boolean(CONTROL_PIN),canControl:socket.data.canControl});ack?.({ok:socket.data.canControl});});
 socket.on('update',(patch,ack)=>{if(!guard(socket,ack))return;const allow=['x','y','width','opacity','rotateZ','skewX','skewY','rotateX','rotateY','scaleX','scaleY','perspective','autoEnabled','intervalSec','durationSec','transitionMs','rotationMode','breakBehavior','imageDurationSec'];for(const k of allow)if(Object.prototype.hasOwnProperty.call(patch||{},k))state[k]=patch[k];state.intervalSec=Math.max(1,Number(state.intervalSec)||600);state.durationSec=Math.max(1,Number(state.durationSec)||30);state.imageDurationSec=Math.max(1,Number(state.imageDurationSec)||5);if(['autoEnabled','intervalSec'].some(k=>Object.prototype.hasOwnProperty.call(patch||{},k)))restartSchedule();else emit();ack?.({ok:true});});
 socket.on('showNow',(_,ack)=>{if(!guard(socket,ack))return;clearBreak();state.visible=true;ensureCurrent();emit();ack?.({ok:true});});
 socket.on('hideNow',(_,ack)=>{if(!guard(socket,ack))return;clearBreak();state.visible=false;emit();ack?.({ok:true});});
 socket.on('triggerAd',(_,ack)=>{if(!guard(socket,ack))return;adBreak();ack?.({ok:true});});
 socket.on('nextImage',(_,ack)=>{if(!guard(socket,ack))return;step(1);emit();ack?.({ok:true});});
 socket.on('prevImage',(_,ack)=>{if(!guard(socket,ack))return;step(-1);emit();ack?.({ok:true});});
 socket.on('selectImage',(id,ack)=>{if(!guard(socket,ack))return;if(state.images.some(x=>x.id===id)){state.currentImageId=id;emit();ack?.({ok:true});}else ack?.({ok:false,error:'Image not found'});});
 socket.on('toggleImage',({id,enabled:en},ack)=>{if(!guard(socket,ack))return;const x=state.images.find(x=>x.id===id);if(!x)return ack?.({ok:false,error:'Image not found'});x.enabled=!!en;ensureCurrent();emit();ack?.({ok:true});});
 socket.on('moveImage',({id,direction},ack)=>{if(!guard(socket,ack))return;const i=state.images.findIndex(x=>x.id===id);if(i<0)return ack?.({ok:false,error:'Image not found'});const j=Math.max(0,Math.min(state.images.length-1,i+(Number(direction)<0?-1:1)));if(i!==j){const [x]=state.images.splice(i,1);state.images.splice(j,0,x);}emit();ack?.({ok:true});});
 socket.on('deleteImage',(id,ack)=>{if(!guard(socket,ack))return;const i=state.images.findIndex(x=>x.id===id);if(i<0)return ack?.({ok:false,error:'Image not found'});state.images.splice(i,1);ensureCurrent();emit();ack?.({ok:true});});
 socket.on('uploadImage',(p,ack)=>{if(!guard(socket,ack))return;try{if(state.images.length>=10)throw new Error('Maximum of 10 images');const item=saveDataUrl(p?.dataUrl,p?.name);state.images.push(item);state.currentImageId=item.id;emit();ack?.({ok:true,image:item});}catch(e){ack?.({ok:false,error:e.message});}});
 socket.on('addImageUrl',(p,ack)=>{if(!guard(socket,ack))return;try{if(state.images.length>=10)throw new Error('Maximum of 10 images');const url=String(p?.url||'').trim();if(!/^https?:\/\//i.test(url))throw new Error('Enter a full http/https URL');const item={id:crypto.randomUUID(),name:safeName(p?.name),imageUrl:url,enabled:true};state.images.push(item);state.currentImageId=item.id;emit();ack?.({ok:true,image:item});}catch(e){ack?.({ok:false,error:e.message});}});
 socket.on('resetTransform',(_,ack)=>{if(!guard(socket,ack))return;Object.assign(state,{x:1030,y:570,width:1050,opacity:.92,rotateZ:-3,skewX:-8,skewY:0,rotateX:0,rotateY:0,scaleX:1,scaleY:1,perspective:1200});emit();ack?.({ok:true});});
});

server.listen(PORT,'0.0.0.0',()=>console.log(`SportsAI overlay running on ${PORT}`));
