(() => {
 const canvas=document.getElementById('canvas');
 const root=document.createElement('div'); root.style.cssText='position:absolute;inset:0;pointer-events:none;overflow:hidden';canvas.append(root);
 const slots={}; for(const key of ['banner','tl','tr','bl','br']){const img=new Image();img.style.cssText='position:absolute;object-fit:contain;opacity:0;will-change:transform,opacity';root.append(img);slots[key]={img,url:'',ready:false};}
 let state=null,offset=0;
 const preload=new Map();
 const conn=io();conn.on('broadcastState',s=>{state=s;offset=s.serverNow-Date.now();for(const key of Object.keys(slots))for(const item of s[key].images){if(!preload.has(item.imageUrl)){const img=new Image();img.src=item.imageUrl;preload.set(item.imageUrl,img);}}});
 const ease=t=>t*t*(3-2*t);
 function frame(){
  if(state) for(const [key,slot] of Object.entries(slots)) {
   const s=state[key],img=slot.img,list=s.images.filter(x=>x.enabled!==false);
   if(!state.master||!s.enabled||!list.length){img.style.opacity=0;continue;}
   const elapsed=Math.max(0,Date.now()+offset-s.epoch),fade=s.fadeMs,base=Math.max(0,s.index||0);
   let index=base,alpha=1,slide=0;
   if(key==='banner'){
    // Interval is the clear gap after the previous banner has slid out.
    const cycle=2*fade+s.holdSec*1000+s.intervalSec*1000;
    const n=Math.floor(elapsed/cycle),t=elapsed%cycle;
    if(s.rotate)index+=n;
    if(t<fade)slide=1-ease(t/fade);
    else if(t<fade+s.holdSec*1000)slide=0;
    else if(t<2*fade+s.holdSec*1000)slide=ease((t-fade-s.holdSec*1000)/fade);
    else {slide=1;alpha=0;}
    img.style.width=s.width+'px';img.style.height=(s.width/10)+'px';img.style.left=(1920-s.width)/2+'px';img.style.top=s.y+'px';img.style.right='auto';img.style.bottom='auto';img.style.transform=`translateY(${-slide*(s.y+s.width/10+4)}px)`;
   } else {
    if(s.rotate){const cycle=2*fade+s.intervalSec*1000+s.gapSec*1000,n=Math.floor(elapsed/cycle),t=elapsed%cycle;index+=n;alpha=t<fade?t/fade:t<fade+s.intervalSec*1000?1:t<2*fade+s.intervalSec*1000?1-(t-fade-s.intervalSec*1000)/fade:0;}
    img.style.width=img.style.height=s.width+'px';img.style.left=key.endsWith('l')?s.x+'px':'auto';img.style.right=key.endsWith('r')?s.x+'px':'auto';img.style.top=key.startsWith('t')?s.y+'px':'auto';img.style.bottom=key.startsWith('b')?s.y+'px':'auto';
   }
   const url=list[index%list.length].imageUrl;
   if(slot.url!==url){slot.url=url;slot.ready=false;img.onload=()=>{if(slot.url===url)slot.ready=true};img.onerror=()=>{slot.ready=false};img.src=url;if(img.complete&&img.naturalWidth)slot.ready=true;}
   img.style.opacity=slot.ready?alpha:0;
  }
  requestAnimationFrame(frame);
 }frame();
})();
