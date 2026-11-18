// ================= 날씨 이펙트 =================
// 날씨가 바뀌면 효과가 서서히 번지고 사라진다 (rain/snow/fog/night 는 0~1 강도).
const WFX={rain:0,snow:0,fog:0,night:0,acc:0,flash:0,nextFlash:6,t:0,last:0,nc:null,nx:null};
const wmod=(a,b)=>((a%b)+b)%b;
function updateWfx(){
  const now=performance.now(),dt=Math.min(.1,(now-(WFX.last||now))/1000);WFX.last=now;
  if(!G||!G.weather)return;
  WFX.t+=dt;
  const ty=G.weather.type,tg={rain:ty==='rain'?1:0,snow:ty==='snow'?1:0,fog:ty==='fog'?1:0,night:G.weather.night?1:0};
  for(const k in tg){const d=tg[k]-WFX[k],r=(k==='night'?.16:.4)*dt;WFX[k]+=Math.abs(d)<r?d:Math.sign(d)*r;}
  WFX.acc=clamp(WFX.acc+(WFX.snow>.5?.03:-(.01+(WFX.rain>.5?.03:0)))*dt,0,1);
  if(WFX.rain>.6){WFX.nextFlash-=dt;if(WFX.nextFlash<=0){WFX.flash=1;WFX.nextFlash=8+Math.random()*16;}}
  WFX.flash=Math.max(0,WFX.flash-dt*2.2);
}
// 쌓인 눈: 지면 타일 위에 불규칙한 흰 덮개. 참호·구덩이·물·동굴 입구·다리처럼 지면 모양이 바뀐 곳은 덮지 않고,
// 투명도가 같은 타일끼리 한 경로로 모아 한 번에 칠한다(타일마다 fill 하지 않음).
function snowCover(x0,y0,x1,y1){
  const a=WFX.acc,B=[[],[],[],[]],w=G.w,hill=G.hill;
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
    const i=y*w+x;
    if(G.trench[i]||G.tt[i]===2||G.mouth[i]||G.up[i]===1||G.up[i]===4)continue;
    B[Math.min(3,((hsh(x*1.7,y*2.3))*4)|0)].push(x,y);
  }
  cx.fillStyle='rgb(233,239,245)';
  for(let b=0;b<4;b++){
    const L=B[b];if(!L.length)continue;
    cx.globalAlpha=a*(.3+.32*(b+.5)/4);cx.beginPath();
    for(let q=0;q<L.length;q+=2){
      const x=L[q],y=L[q+1];
      if(hill){const i=y*w+x;[[0,0],[1,0],[1,1],[0,1]].forEach(([fx,fy],k)=>{const p=rawS(x+fx,y+fy,elevIn(i,fx,fy));k?cx.lineTo(p[0],p[1]):cx.moveTo(p[0],p[1]);});cx.closePath();}
      else{const [sx,sy]=toS(x+.5,y+.5),z=cam.z;cx.moveTo(sx,sy-16*z);cx.lineTo(sx+32*z,sy);cx.lineTo(sx,sy+16*z);cx.lineTo(sx-32*z,sy);cx.closePath();}
    }
    cx.fill();
  }
  cx.globalAlpha=1;
}
// 빗방울이 땅에 닿아 퍼지는 물결 (월드 좌표)
function drawWeatherGround(x0,y0,x1,y1){
  const k=WFX.rain;if(k<.05)return;
  const z=cam.z,t=WFX.t,span=Math.max(6,Math.min(x1-x0,y1-y0));
  const n=Math.floor(clamp(span*3.2,24,70));
  cx.lineWidth=1.1;
  for(let i=0;i<n;i++){
    const ph=t*1.5+hsh(i,7)*5,seed=Math.floor(ph),p=ph-seed;
    const wx=x0+hsh(i,seed*3+11)*(x1-x0+1),wy=y0+hsh(i,seed*3+23)*(y1-y0+1);
    if(!inb(Math.floor(wx),Math.floor(wy)))continue;
    if(G.hill&&(OCQ[Math.floor(wy)*G.w+Math.floor(wx)]||G.sl[Math.floor(wy)*G.w+Math.floor(wx)]))continue;   // 가려질 수 있는 칸은 물결을 그리지 않는다
    const [sx,sy]=toS(wx,wy);
    cx.strokeStyle=`rgba(215,230,240,${(1-p)*.5*k})`;
    cx.beginPath();cx.ellipse(sx,sy,(2+p*12)*z,(1+p*6)*z,0,0,6.3);cx.stroke();
  }
  // 젖은 땅: 약한 푸른 반사
  cx.globalAlpha=.1*k;cx.fillStyle='#8fb0c8';
  for(let y=y0;y<=y1;y+=1)for(let x=x0;x<=x1;x++){if(hsh(x*3.1,y*1.9)>.86&&!(G.hill&&(OCQ[y*G.w+x]||G.sl[y*G.w+x]))){tileDia(x,y,.18);cx.fill();}}
  cx.globalAlpha=1;
}
function drawRainLayers(){
  const k=WFX.rain;if(k<.02)return;
  const t=WFX.t,sc=clamp(W*H/(1280*700),.5,2);
  const Ls=[{n:80,sp:880,len:28,a:.30,w:1.25},{n:70,sp:660,len:18,a:.23,w:1},{n:60,sp:480,len:11,a:.16,w:.8}];
  cx.lineCap='round';
  for(let l=0;l<3;l++){
    const q=Ls[l],n=Math.floor(q.n*sc);
    cx.strokeStyle=`rgba(196,212,226,${q.a*k})`;cx.lineWidth=q.w;cx.beginPath();
    for(let i=0;i<n;i++){
      const x=wmod(hsh(i,l*3+1)*(W+160)-t*q.sp*.27,W+160)-80,y=wmod(hsh(i,l*3+2)*(H+80)+t*q.sp,H+80)-40;
      cx.moveTo(x,y);cx.lineTo(x+q.len*.27,y-q.len);
    }
    cx.stroke();
  }
  cx.lineCap='butt';
}
function drawSnowLayers(){
  const k=WFX.snow;if(k<.02)return;
  const t=WFX.t,sc=clamp(W*H/(1280*700),.5,2);
  const Ls=[{n:80,sp:24,r:1.1,a:.5,sw:14},{n:55,sp:42,r:1.9,a:.7,sw:22},{n:34,sp:68,r:2.9,a:.88,sw:34}];
  for(let l=0;l<3;l++){
    const q=Ls[l],n=Math.floor(q.n*sc);
    cx.fillStyle=`rgba(247,249,252,${q.a*k})`;cx.beginPath();
    for(let i=0;i<n;i++){
      const x=wmod(hsh(i,l*2+5)*(W+90)+Math.sin(t*.8+i*1.7)*q.sw-t*q.sp*.4,W+90)-45,y=wmod(hsh(i,l*2+6)*(H+60)+t*q.sp,H+60)-30;
      cx.moveTo(x+q.r,y);cx.arc(x,y,q.r,0,6.2832);
    }
    cx.fill();
  }
}
function drawFogLayers(){
  const k=WFX.fog;if(k<.02)return;
  const t=G.time*.25+WFX.t*.2;
  // 먼 곳(화면 위)일수록 짙은 대기
  const g=cx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,`rgba(198,205,198,${.66*k})`);g.addColorStop(.55,`rgba(198,205,198,${.34*k})`);g.addColorStop(1,`rgba(198,205,198,${.14*k})`);
  cx.fillStyle=g;cx.fillRect(0,0,W,H);
  // 맵 위를 천천히 흐르는 안개 덩어리 (월드 좌표라 카메라를 따라 움직임)
  for(let i=0;i<22;i++){
    const wx=wmod(hsh(i,1)*G.w+t*(.5+hsh(i,2)),G.w+16)-8,wy=hsh(i,3)*G.h,r=(5+hsh(i,4)*6)*32*cam.z,[sx,sy]=toS(wx,wy);
    if(sx<-r||sx>W+r||sy<-r||sy>H+r)continue;
    const rg=cx.createRadialGradient(sx,sy,0,sx,sy,r);
    rg.addColorStop(0,`rgba(214,220,212,${.30*k})`);rg.addColorStop(1,'rgba(214,220,212,0)');
    cx.fillStyle=rg;cx.fillRect(sx-r,sy-r,r*2,r*2);
  }
}
// 밤: 반해상도 마스크에 어둠을 깔고, 광원 자리만 뚫어서 메인 캔버스에 얹는다
function collectLights(){
  const L=[],z=cam.z,add=(wx,wy,h,r,a,c)=>{const [sx,sy]=toS(wx,wy);const rr=r*z;if(sx<-rr||sx>W+rr||sy<-rr||sy>H+rr)return;L.push({x:sx,y:sy-h*z,r:rr,a,c});};
  for(const T of G.teams){
    if(!T.pad)continue;
    const p=T.pad,pulse=.75+.25*Math.sin(G.time*3+T.id);
    add(p.x+1.5,p.y+1.5,3,120,.95*pulse,'255,228,150');
    const ps=heliPose(T);if(ps){add(ps.x,ps.y,0,150,1,'255,245,210');add(ps.x,ps.y,ps.alt,70,.7,'255,240,200');}
  }
  for(const f of G.flags)add(f.x+.5,f.y+.5,30,52,.7,'255,214,130');
  for(const o of G.obSet){
    const cxw=o.x+o.size/2,cyw=o.y+o.size/2,occN=o.occ?o.occ.length:0;
    if((o.type==='house'||o.type==='apartment'||o.type==='warehouse'||o.type==='shed')&&occN)add(cxw,cyw,12,62,.8,'255,200,120');
    else if(o.type==='bunker'&&occN)add(cxw,cyw,10,70,.7,'255,210,140');
    else if(o.type==='tower'&&!o.natural)add(cxw,cyw,50,86,.8,'255,240,190');
    else if(o.type==='medbay'&&!o.natural)add(cxw,cyw,14,70,.85,'210,255,215');
    else if(o.type==='mg'&&occN)add(cxw,cyw,8,40,.5,'255,214,140');
    if(o.muz>0)add(cxw,cyw,18,90,o.muz/.22,'255,210,120');
  }
  for(const u of G.units){if(u.muz>0&&u.state!=='crew')add(u.x,u.y,10,44,.9,'255,214,130');}
  for(const v of G.vehicles){
    const c=Math.cos(v.face),s=Math.sin(v.face);
    add(v.x+c*1.2,v.y+s*1.2,10,92,.55,'255,246,215');
    if(v.muz>0)add(v.x+c*.9,v.y+s*.9,22,130,1,'255,205,110');
  }
  for(const sh of G.shells){const p=Math.min(1,sh.t/sh.d);add(sh.x+(sh.tx-sh.x)*p,sh.y+(sh.ty-sh.y)*p,Math.sin(p*Math.PI)*60,34,.6,'255,190,110');}
  for(const f of G.fx){
    if(f.k==='boom')add(f.x,f.y,10,150,Math.max(0,1-f.t/f.d),'255,170,80');
    else if(f.k==='trace')add(f.x1,f.y1,10,26,.6,'255,226,150');
  }
  return L.length>150?L.slice(0,150):L;
}
function nightPass(){
  const k=WFX.night;if(k<.02)return;
  const sw=Math.ceil(W/2),sh=Math.ceil(H/2);
  if(!WFX.nc||WFX.nc.width!==sw||WFX.nc.height!==sh){WFX.nc=document.createElement('canvas');WFX.nc.width=sw;WFX.nc.height=sh;WFX.nx=WFX.nc.getContext('2d');}
  const n=WFX.nx,lights=collectLights();
  n.setTransform(1,0,0,1,0,0);n.globalCompositeOperation='source-over';n.clearRect(0,0,sw,sh);
  n.fillStyle=`rgba(4,8,26,${.7*k})`;n.fillRect(0,0,sw,sh);
  n.globalCompositeOperation='destination-out';
  for(const l of lights){
    const x=l.x/2,y=l.y/2,r=l.r/2,g=n.createRadialGradient(x,y,0,x,y,r);
    g.addColorStop(0,`rgba(0,0,0,${Math.min(1,l.a)})`);g.addColorStop(.55,`rgba(0,0,0,${Math.min(1,l.a)*.5})`);g.addColorStop(1,'rgba(0,0,0,0)');
    n.fillStyle=g;n.fillRect(x-r,y-r,r*2,r*2);
  }
  cx.drawImage(WFX.nc,0,0,W,H);
  cx.globalCompositeOperation='lighter';
  for(const l of lights){
    const g=cx.createRadialGradient(l.x,l.y,0,l.x,l.y,l.r*.75);
    g.addColorStop(0,`rgba(${l.c},${.26*Math.min(1,l.a)*k})`);g.addColorStop(1,`rgba(${l.c},0)`);
    cx.fillStyle=g;cx.fillRect(l.x-l.r,l.y-l.r,l.r*2,l.r*2);
  }
  cx.globalCompositeOperation='source-over';
}
function drawWeatherOverlay(){
  if(!G||!G.weather)return;
  // 색조: 비는 차갑고 어둡게, 눈은 밝고 푸르게
  if(WFX.rain>.02){cx.globalCompositeOperation='multiply';cx.fillStyle=`rgba(150,168,184,${.5*WFX.rain})`;cx.fillRect(0,0,W,H);cx.globalCompositeOperation='source-over';}
  if(WFX.snow>.02){cx.fillStyle=`rgba(214,226,238,${.14*WFX.snow})`;cx.fillRect(0,0,W,H);}
  drawFogLayers();
  nightPass();
  drawRainLayers();
  drawSnowLayers();
  // 번개
  if(WFX.flash>0){const f=WFX.flash,v=f>.55?f:f>.4?.12:f*.6;cx.fillStyle=`rgba(225,235,255,${.55*v})`;cx.fillRect(0,0,W,H);}
  // 비네팅: 악천후와 밤에 시야 가장자리를 눌러 분위기를 만든다
  const vg=Math.max(WFX.rain*.7,WFX.fog*.5,WFX.snow*.4,WFX.night*.8);
  if(vg>.02){const g=cx.createRadialGradient(W/2,H/2,Math.min(W,H)*.35,W/2,H/2,Math.max(W,H)*.75);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,`rgba(4,8,16,${.4*vg})`);cx.fillStyle=g;cx.fillRect(0,0,W,H);}
}
