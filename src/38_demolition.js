// ================= 건물 해체: 폭약 설치 → 대피 → 폭파 · 잔해 =================
function spawnRubble(o){
  const ty=o.size>=3?'rubble3':o.size===2?'rubble2':'rubble';
  const r=addOb(ty,o.x,o.y);if(r)r.from=o.type==='ruin'?(o.from||'apartment'):o.type;
  return r;
}
function startFuse(t){
  const o=G.obst[t.idx];if(!o){return;}
  t.phase=1;t.fuseMax=t.fuse=3.2+o.size*.45;t.beep=0;t.prog=t.work*.72;
  for(const id of [...o.occ]){const u=G.uid.get(id);if(u)leaveGar(u);}
  const cxw=o.x+o.size/2,cyw=o.y+o.size/2,R=o.size/2+5.8;
  for(const id of [...t.workers]){
    const u=G.uid.get(id);if(!u||u.dead)continue;
    let a0=Math.atan2(u.y-cyw,u.x-cxw);if(Math.hypot(u.x-cxw,u.y-cyw)<.3)a0=Math.random()*6.28;
    let done=false;
    for(const da of [0,.45,-.45,.9,-.9,1.4,-1.4,2.0,-2.0]){
      const a=a0+da,tx=Math.round(cxw+Math.cos(a)*R-.5),ty=Math.round(cyw+Math.sin(a)*R-.5);
      if(!inb(tx,ty)||G.obst[ty*G.w+tx]||G.tt[ty*G.w+tx]===2||G.trench[ty*G.w+tx]===255)continue;
      const p=findPath(Math.floor(u.x),Math.floor(u.y),tx,ty,false,1);
      if(p!==null){u.path=p;u.state='flee';u.face=a;done=true;break;}
    }
    if(!done){u.state='fuse';u.path=[];}
  }
  sfx('alarm',cxw,cyw);
}
function stepBomb(t,dt){
  if(!t.phase){
    const n=t.workers.size;
    if(n>0){
      t.prog+=n*dt*weatherWork();
      if(Math.random()<dt*3){fxPush({k:'chip',x:t.x+.5,y:t.y+.5,t:0,d:.3,kind:'demo'});sfx('plant',t.x+.5,t.y+.5);}
      if(t.prog>=t.work*.72)startFuse(t);
    }
    return;
  }
  t.fuse-=dt;
  const o=G.obst[t.idx];
  t.prog=t.work*(.72+.28*(1-Math.max(0,t.fuse)/t.fuseMax));
  t.beep-=dt;
  if(t.beep<=0){t.beep=Math.max(.16,t.fuse/7);sfx('beep',t.x+.5,t.y+.5);if(o)o.fl=.09;}
  if(t.fuse<=0)detonate(t);
}
function detonate(t){
  const o=G.obst[t.idx];
  if(!o){G.tasks.delete(t.key);return;}
  const cxw=o.x+o.size/2,cyw=o.y+o.size/2,R=o.size/2+2.6,d=OB[o.type];
  for(const u of G.units){
    if(u.dead||u.lay)continue;
    const dd=Math.hypot(u.x-cxw,u.y-cyw);
    if(dd<R)hurt(u,Math.max(14,95*(1-dd/R)),null);
  }
  for(const v of G.vehicles)if(!v.dead&&Math.hypot(v.x-cxw,v.y-cyw)<R)damageVehicle(v,60,null);
  for(let k=0;k<4+o.size*2;k++){
    const a=Math.random()*6.28,r=Math.random()*o.size*.55;
    fxPush({k:'boom',x:cxw+Math.cos(a)*r,y:cyw+Math.sin(a)*r,t:0,d:.5+Math.random()*.4});
    fxPush({k:'dust',x:cxw+Math.cos(a)*r*1.3,y:cyw+Math.sin(a)*r*1.3,t:0,d:.9+Math.random()*.7});
  }
  fxPush({k:'smoke',x:cxw,y:cyw,t:0,d:2.6});
  sfx('boom',cxw,cyw);setTimeout(()=>sfx('boom',cxw,cyw),130);
  finishTask(t);
}
function drawCharges(o){
  const d=OB[o.type];if(!d||!d.building)return;
  const t=G.tasks.get(tkey('demo',o.idx));if(!t||!t.bomb||(!t.phase&&t.prog<=0))return;
  const K=2*o.size+2,frac=t.phase?1:Math.min(1,t.prog/(t.work*.72));
  const n=Math.max(1,Math.ceil(K*frac-1e-6)),z=cam.z;
  const x0=o.x+.06,y0=o.y+.06,x1=o.x+o.size-.06,y1=o.y+o.size-.06;
  const hh1=5,hh2=o.type==='apartment'?26:o.type==='shed'?7:13;
  const blink=t.phase?Math.sin(G.time*(10+(1-t.fuse/t.fuseMax)*26))>0:Math.sin(G.time*4)>0;
  const prev=[null,null],per=Math.ceil(K/2);
  for(let k=0;k<n;k++){
    const face=k%2,a=k>>1,f=(a%per+.5)/per,h=(a%2)?hh2:hh1;
    const p=face?pt(x1+.03,y0+(y1-y0)*f,h):pt(x0+(x1-x0)*f,y1+.03,h);
    if(prev[face])wline(prev[face],[p[0],p[1]-2*z],'rgba(15,15,15,.85)',Math.max(1,1.1*z));
    prev[face]=[p[0],p[1]-2*z];
    drawChargeSpr(p[0],p[1],blink,blink&&t.phase);
  }
}
function drawRubble(o,L,occ){
  const z=cam.z,s=o.size,from=o.from||'house';
  const PAL={apartment:['#a39f94','#8d897f','#706c63'],house:['#a8654c','#8a5240','#6d3f31'],warehouse:['#7d8a92','#667078','#4f585e'],shed:['#9a784c','#7a5c3a','#5d4429']};
  const pal=PAL[from]||PAL.apartment;
  shadowAt(o.x+s/2+.1,o.y+s/2+.1,26*s,10*s);
  for(let k=0;k<s*s*9;k++){
    const px=o.x+.08+hsh(o.idx+k,k*3)*(s-.16),py=o.y+.08+hsh(k*5,o.idx+k)*(s-.16),p=pt(px,py,0);
    cx.fillStyle=hsh(k,o.idx)>.55?'#8d897f':'#6a665d';cx.beginPath();cx.ellipse(p[0],p[1],(1.8+hsh(k,7)*3)*z,(1+hsh(k,9)*1.5)*z,0,0,6.3);cx.fill();
  }
  const pcs=[];
  for(let k=0;k<s*s*4+2;k++){
    const w=.22+hsh(o.idx+k,11)*.34,dd=.22+hsh(o.idx+k,13)*.34;
    const px=o.x+.05+hsh(o.idx+k,17)*(s-w-.1),py=o.y+.05+hsh(o.idx+k,19)*(s-dd-.1);
    pcs.push({px,py,w,dd,h:3+hsh(o.idx+k,23)*(5+s*1.6),c:k%3});
  }
  for(let k=0;k<s;k++){ // 서 있는 벽 조각 (엄폐)
    const horiz=hsh(o.idx+k,29)>.5,len=.7+hsh(o.idx+k,31)*.8,px=o.x+.05+hsh(o.idx+k,37)*(s-.3-(horiz?len:0)),py=o.y+.05+hsh(o.idx+k,41)*(s-.3-(horiz?0:len));
    pcs.push({px,py,w:horiz?len:.14,dd:horiz?.14:len,h:11+hsh(o.idx+k,43)*8,c:0,wall:1});
  }
  pcs.sort((a,b)=>(a.px+a.py+a.w/2+a.dd/2)-(b.px+b.py+b.w/2+b.dd/2));
  for(const c of pcs){
    wbox(c.px,c.py,c.px+c.w,c.py+c.dd,0,c.h,L(pal[0]),L(pal[c.c===1?1:0]),L(pal[c.c===2?2:1]),'rgba(25,22,18,.55)');
    if(c.wall&&from==='apartment'){wline(pt(c.px+c.w*.3,c.py+c.dd*.5,c.h),pt(c.px+c.w*.3,c.py+c.dd*.5,c.h+6),'#4b3f35',1.1);}
  }
  const q=[[.5,.5],[1.3,1.3],[.8,1.6],[2,.8]];
  for(let k=0;k<Math.min(occ.length,q.length);k++){const pp=q[k];peek(pt(o.x+Math.min(pp[0],s-.3),o.y+Math.min(pp[1],s-.3),12),occ[k],.85,true);}
}
