// ================= 고품질 장애물 / 참호 그리기 =================
const hsh=(a,b)=>{const s=Math.sin(a*12.9898+b*78.233)*43758.5453;return s-Math.floor(s);};
function pt(wx,wy,h){const [a,b]=toS(wx,wy);return [a,b-h*cam.z];}
function poly(pts,fill,stroke,lw){
  cx.beginPath();for(let i=0;i<pts.length;i++){i?cx.lineTo(pts[i][0],pts[i][1]):cx.moveTo(pts[i][0],pts[i][1]);}cx.closePath();
  if(fill){cx.fillStyle=fill;cx.fill();}
  if(stroke){cx.strokeStyle=stroke;cx.lineWidth=lw||1;cx.stroke();}
}
function wline(a,b,col,lw){cx.strokeStyle=col;cx.lineWidth=lw*cam.z;cx.beginPath();cx.moveTo(a[0],a[1]);cx.lineTo(b[0],b[1]);cx.stroke();}
function wbox(x0,y0,x1,y1,h0,h1,top,left,right,line){
  poly([pt(x0,y1,h0),pt(x1,y1,h0),pt(x1,y1,h1),pt(x0,y1,h1)],left,line);
  poly([pt(x1,y0,h0),pt(x1,y1,h0),pt(x1,y1,h1),pt(x1,y0,h1)],right,line);
  poly([pt(x0,y0,h1),pt(x1,y0,h1),pt(x1,y1,h1),pt(x0,y1,h1)],top,line);
}
function shadowAt(wx,wy,rx,ry){const [a,b]=toS(wx,wy),z=cam.z;cx.fillStyle='rgba(0,0,0,.27)';cx.beginPath();cx.ellipse(a+3*z,b+1*z,rx*z,ry*z,0,0,6.3);cx.fill();}
function axisOf(o){
  const a=(dx,dy)=>{const x=o.x+dx,y=o.y+dy;if(!inb(x,y))return false;const q=G.obst[y*G.w+x];return !!q&&q.type===o.type;};
  const ax=a(1,0)||a(-1,0),ay=a(0,1)||a(0,-1);
  if(ax&&!ay)return 'x';if(ay&&!ax)return 'y';return o.v>.5?'x':'y';
}
function alongFn(o){const ax=axisOf(o);return ax==='x'?(t)=>[o.x+t,o.y+.5]:(t)=>[o.x+.5,o.y+t];}
function occUnits(o){const r=[];for(const id of o.occ){const u=G.uid.get(id);if(u)r.push(u);}return r;}
// 숨은 병사: 헬멧 + 총구
function peek(p,u,sc,shoulders){
  const z=cam.z*(sc||1),x=p[0],y=p[1],col=TEAM_COL[u.team];
  if(shoulders){cx.fillStyle=u.flash>0?'#fff':col;cx.beginPath();cx.ellipse(x,y+5*z,6.5*z,4.2*z,0,Math.PI,0);cx.fill();cx.fillRect(x-6.5*z,y+5*z,13*z,3*z);}
  cx.fillStyle='#d2b28a';cx.beginPath();cx.arc(x,y+1*z,3.4*z,0,6.3);cx.fill();
  cx.fillStyle=u.flash>0?'#fff':'#41492f';cx.beginPath();cx.arc(x,y,4.2*z,Math.PI,0);cx.fill();
  cx.fillRect(x-4.6*z,y-.2*z,9.2*z,1.4*z);
  cx.fillStyle=col;cx.fillRect(x-3.4*z,y-2.2*z,6.8*z,1.2*z);
  const c=Math.cos(u.face),s=Math.sin(u.face),ix=(c-s)*.9,iy=(c+s)*.5;
  const bx=x+ix*13*z,by=y+4*z+iy*13*z;
  cx.strokeStyle='#15150f';cx.lineWidth=2.2*z;cx.beginPath();cx.moveTo(x+ix*3*z,y+4*z+iy*3*z);cx.lineTo(bx,by);cx.stroke();
  if(u.muz>0){cx.fillStyle='#ffd76a';cx.beginPath();cx.arc(bx+ix*2*z,by+iy*2*z,4.2*z,0,6.3);cx.fill();cx.fillStyle='#fff6c8';cx.beginPath();cx.arc(bx+ix*2*z,by+iy*2*z,2*z,0,6.3);cx.fill();}
}
function muzzleAt(p,u,dx,dy){
  if(!(u.muz>0))return;const z=cam.z;
  cx.fillStyle='#ffd76a';cx.beginPath();cx.arc(p[0]+dx*z,p[1]+dy*z,4.5*z,0,6.3);cx.fill();
  cx.fillStyle='#fff6c8';cx.beginPath();cx.arc(p[0]+dx*z,p[1]+dy*z,2*z,0,6.3);cx.fill();
}
function sandbagRow(o,pts,h,n,tint){
  // pts: [(wx,wy) 시작, (wx,wy) 끝]; n개의 자루를 시작→끝 순서로
  const z=cam.z;
  for(let i=0;i<n;i++){
    const t=(i+.5)/n,wx=pts[0][0]+(pts[1][0]-pts[0][0])*t,wy=pts[0][1]+(pts[1][1]-pts[0][1])*t;
    const p=pt(wx,wy,h+3),k=((o.id+i+h)|0)%3;
    const base=tint?'#fff':['#b9a370','#a89265','#c3ae7d'][k];
    cx.fillStyle='rgba(0,0,0,.22)';cx.beginPath();cx.ellipse(p[0]+1*z,p[1]+3*z,8.5*z,4.6*z,0,0,6.3);cx.fill();
    cx.fillStyle=base;cx.beginPath();cx.ellipse(p[0],p[1],8*z,4.8*z,0,0,6.3);cx.fill();
    cx.strokeStyle=tint?'#aaa':'#6d5d3b';cx.lineWidth=.9*z;cx.stroke();
    if(!tint){cx.strokeStyle='rgba(255,246,210,.55)';cx.lineWidth=1*z;cx.beginPath();cx.arc(p[0]-1*z,p[1]-1*z,4.5*z,3.5,5.2);cx.stroke();
      cx.strokeStyle='rgba(80,64,36,.5)';cx.beginPath();cx.moveTo(p[0]-5*z,p[1]+.5*z);cx.lineTo(p[0]+5*z,p[1]+.5*z);cx.stroke();}
  }
}
const LODH={house:20,apartment:52,warehouse:24,shed:13,ruin:12,crate:8,fence:5,wire:4,sandbag:5,rubble:6};
const LODC={house:['#c9b79a','#9c8d74','#7a6c58'],apartment:['#b9b4a6','#8f8a7d','#706c61'],warehouse:['#7d8794','#646d78','#4e5660'],shed:['#8a7b62','#6b5f4c','#564c3d'],ruin:['#8a8478','#6c675d','#55514a'],crate:['#9a7a4a','#7c6239','#634e2d'],fence:['#8a7a5a','#6c5f46','#54492f'],wire:['#777','#555','#444'],sandbag:['#b7a273','#9a8860','#7d6e4d'],rubble:['#8c867a','#6e695f','#57534b']};
function drawOb(o){
  const z=cam.z;
  if(z<.8&&!o.fl&&!(o.occ&&o.occ.size)&&!o.occ?.length){
    const t=o.type;
    if(t==='tree'){const s=.8+o.v*.55,b=pt(o.x+o.size/2,o.y+o.size/2+.05,0),pine=o.v<.4,c=TREEPAL[G.biome];
      cx.fillStyle='rgba(0,0,0,.22)';cx.fillRect(b[0]-9*z*s,b[1]-1*z,18*z*s,3*z);
      cx.fillStyle=pine?c.pine[1]:c.leaf[(o.id%3)];cx.beginPath();if(pine){cx.moveTo(b[0]-12*z*s,b[1]-6*z*s);cx.lineTo(b[0],b[1]-42*z*s);cx.lineTo(b[0]+12*z*s,b[1]-6*z*s);}else{cx.arc(b[0],b[1]-28*z*s,13*z*s,0,6.3);}cx.fill();return;}
    if(t==='rock'){const s=.9+o.v*.5,b=pt(o.x+o.size/2,o.y+o.size/2,0);cx.fillStyle='#7d7b73';cx.beginPath();cx.ellipse(b[0],b[1]-6*z*s,15*z*s,9*z*s,0,0,6.3);cx.fill();return;}
    const C=LODC[t];
    if(C){const h=LODH[t]*(t==='apartment'||t==='house'||t==='warehouse'?1:1);wbox(o.x+.04,o.y+.04,o.x+o.size-.04,o.y+o.size-.04,0,h,C[0],C[1],C[2],null);return;}
  }
  return drawObFull(o);
}
function drawObHp(o){
  if(!(o.hp<o.max))return;
  const z=cam.z,t=o.type,[sx,sy]=toS(o.x+o.size/2,o.y+o.size/2);
  const top=t==='apartment'?-100:t==='warehouse'?-52:t==='shed'?-32:t==='ruin'?-34:t==='house'?-46:t==='tower'?-84:t==='bunker'?-40:-34;
  hpBar(sx,sy+top*z,Math.max(24,o.size*26)*z,Math.max(0,o.hp/o.max),'#d0583f');
}
// 점령 표시(슬롯 점·병사 체력) / 선택 테두리 — 스프라이트 모드에서도 매 프레임 위에 덧그린다
function drawOccMarks(o,occ){
  const z=cam.z,t=o.type,x0=o.x,y0=o.y,x1=o.x+o.size,y1=o.y+o.size,cxw=o.x+o.size/2;
  const d0=OB[t];
  if(d0.slots){
    const pb=pt(cxw,y1+.02,-2);
    for(let k=0;k<d0.slots;k++){
      const ou=occ[k],px=pb[0]+(k-(d0.slots-1)/2)*8*z;
      if(ou){const c=TEAM_COL[o.occTeam];cx.fillStyle='rgba(0,0,0,.45)';cx.beginPath();cx.ellipse(px,pb[1]+6.4*z,4*z,1.6*z,0,0,6.3);cx.fill();
        cx.fillStyle=c;cx.beginPath();cx.moveTo(px-3.6*z,pb[1]+6*z);cx.quadraticCurveTo(px-3.4*z,pb[1]+1.2*z,px,pb[1]+1.2*z);cx.quadraticCurveTo(px+3.4*z,pb[1]+1.2*z,px+3.6*z,pb[1]+6*z);cx.closePath();cx.fill();
        cx.fillStyle='#e0c4a0';cx.beginPath();cx.arc(px,pb[1]-1.2*z,2.1*z,0,6.3);cx.fill();cx.fillStyle=c;cx.beginPath();cx.arc(px,pb[1]-1.9*z,2.3*z,Math.PI,6.3);cx.fill();cx.strokeStyle='rgba(0,0,0,.6)';cx.lineWidth=Math.max(.6,.7*z);cx.stroke();}
      else{cx.fillStyle='rgba(0,0,0,.5)';cx.beginPath();cx.arc(px,pb[1]+4*z,2.6*z,0,6.3);cx.fill();}
      if(ou&&ou.hp<ou.max){cx.fillStyle='rgba(0,0,0,.6)';cx.fillRect(px-3.5*z,pb[1]+8*z,7*z,2*z);cx.fillStyle=ou.hp>ou.max*.35?'#86b45e':'#d0583f';cx.fillRect(px-3.5*z,pb[1]+8*z,7*z*ou.hp/ou.max,2*z);}
    }
  }
  if(occ.some(u=>u.sel&&u.team===0)){
    cx.strokeStyle='#7dff7d';cx.lineWidth=1.8;
    const p0=toS(x0,y0),p1=toS(x1,y0),p2=toS(x1,y1),p3=toS(x0,y1);
    cx.beginPath();cx.moveTo(p0[0],p0[1]);cx.lineTo(p1[0],p1[1]);cx.lineTo(p2[0],p2[1]);cx.lineTo(p3[0],p3[1]);cx.closePath();cx.stroke();
  }
}
function drawObFull(o){
  const z=cam.z,t=o.type,fl=o.fl>0,L=(c)=>fl?'#fff':c;
  const cxw=o.x+o.size/2,cyw=o.y+o.size/2,[sx,sy]=toS(cxw,cyw);
  const occ=occUnits(o),sway=Math.sin(G.time*1.4+o.x*.7+o.y*.5)*1.4*z;
  const x0=o.x,y0=o.y,x1=o.x+o.size,y1=o.y+o.size;
  if(t==='tree'){
    const s=.8+o.v*.55,pine=o.v<.4;
    shadowAt(cxw+.08,cyw+.05,15*s,7*s);
    const base=pt(cxw,cyw+.05,0);
    cx.fillStyle=L('#4a3322');cx.beginPath();cx.moveTo(base[0]-3*z*s,base[1]);cx.lineTo(base[0]-1.6*z*s,base[1]-22*z*s);cx.lineTo(base[0]+1.6*z*s,base[1]-22*z*s);cx.lineTo(base[0]+3*z*s,base[1]);cx.closePath();cx.fill();
    if(pine){
      for(let k=0;k<4;k++){
        const by=base[1]-(8+k*9)*z*s,w=(17-k*3.4)*z*s,hh=15*z*s,off=sway*(k+1)/4;
        poly([[base[0]-w+off*0,by],[base[0]+off,by-hh],[base[0]+w,by]],L(TREEPAL[G.biome].pine[k]));
        poly([[base[0]+off,by-hh],[base[0]+w,by],[base[0]+w*.2,by]],L(`rgba(255,255,255,${TREEPAL[G.biome].cap})`));
      }
    }else{
      const cols=TREEPAL[G.biome].leaf;
      const n=6;
      for(let k=0;k<n;k++){
        const a=hsh(o.id,k)*6.28,r=(5+hsh(o.id,k+9)*8)*s,
              px=base[0]+Math.cos(a)*r*1.1+sway*.7,py=base[1]-(24+Math.sin(a)*r*.55+k*1.6)*z*s;
        cx.fillStyle=L(cols[(k*7+o.id)%4<2?k%2:2+k%2]);cx.beginPath();cx.arc(px,py,(9+hsh(o.id,k+3)*3)*z*s,0,6.3);cx.fill();
      }
      cx.fillStyle=L(TREEPAL[G.biome].leaf[3]);cx.beginPath();cx.arc(base[0]-4*z*s+sway,base[1]-33*z*s,7*z*s,0,6.3);cx.fill();
      cx.fillStyle='rgba(255,255,220,.1)';cx.beginPath();cx.arc(base[0]-6*z*s+sway,base[1]-36*z*s,4*z*s,0,6.3);cx.fill();
    }
  }else if(t==='rock'){
    const s=.9+o.v*.5,n=9;
    shadowAt(cxw+.1,cyw+.06,19*s,8.5*s);
    const bp=[],tp=[];
    for(let k=0;k<n;k++){
      const a=k/n*6.283,r=(.30+.14*hsh(o.id,k))*s,rt=r*(.55+.2*hsh(o.id,k+20));
      bp.push(pt(cxw+Math.cos(a)*r*1.0,cyw+Math.sin(a)*r*1.0,0));
      tp.push(pt(cxw+Math.cos(a)*rt*.9+.02,cyw+Math.sin(a)*rt*.9,(11+9*hsh(o.id,k+40))*s));
    }
    for(let k=0;k<n;k++){
      const j=(k+1)%n,a=(k+.5)/n*6.283,lum=Math.cos(a-.8);
      const g=Math.round(86+lum*34);
      poly([bp[k],bp[j],tp[j],tp[k]],L(`rgb(${g},${g-1},${g-6})`));
    }
    poly(tp,L('#9c9b93'));
    cx.fillStyle='rgba(95,130,70,.45)';cx.beginPath();cx.ellipse(tp[0][0]-3*z,tp[0][1]+1*z,7*z*s,3*z*s,0,0,6.3);cx.fill();
    cx.strokeStyle='rgba(0,0,0,.25)';cx.lineWidth=.8*z;cx.beginPath();cx.moveTo(tp[2][0],tp[2][1]);cx.lineTo(bp[3][0],bp[3][1]-6*z);cx.stroke();
  }else if(t==='house'){
    const xa=x0+.06,xb=x1-.06,ya=y0+.08,yb=y1-.06,ym=(ya+yb)/2,wh=22,rh=37;
    const pal=[['#cdbc9c','#ad9d7e','#8e4a36'],['#bba68c','#9c8a70','#6f4a3a'],['#c2c2b2','#a3a396','#7d3f31']][(o.v*3)|0];
    shadowAt(cxw+.12,cyw+.1,34,14);
    wbox(xa-.02,ya-.02,xb+.02,yb+.02,0,3,'#7c776a','#6e6a5e','#5b5850');
    wbox(xa,ya,xb,yb,3,wh,'#000',L(pal[0]),L(pal[1]));
    // 굴뚝
    wbox(xa+.12,ya+.1,xa+.27,ya+.25,28,46,'#6a6258','#5e564c','#4c463e');
    // 박공
    poly([pt(xb,ya,wh),pt(xb,yb,wh),pt(xb,ym,rh-2)],L(pal[1]));
    // 지붕(남쪽 경사)
    poly([pt(xa-.06,yb+.08,wh-2),pt(xb+.06,yb+.08,wh-2),pt(xb+.06,ym,rh),pt(xa-.06,ym,rh)],L(pal[2]));
    for(let k=1;k<5;k++){const tt=k/5,h2=wh-2+(rh-wh+2)*tt,yy=yb+.08+(ym-yb-.08)*tt;wline(pt(xa-.06,yy,h2),pt(xb+.06,yy,h2),'rgba(0,0,0,.2)',1);}
    wline(pt(xa-.06,ym,rh),pt(xb+.06,ym,rh),'#4a2519',2.2);
    wline(pt(xb+.06,yb+.08,wh-2),pt(xb+.06,ym,rh),'#4a2519',2);
    // 창문 3개 (왼쪽 면)
    const sl=OB.house.slots;
    for(let k=0;k<sl;k++){
      const wx=xa+(k+.5)*(xb-xa)/sl,wa=[pt(wx-.1,yb,9),pt(wx+.1,yb,9),pt(wx+.1,yb,18),pt(wx-.1,yb,18)];
      const ou=occ[k];
      poly(wa,ou?'#1a150f':'#2b3a44','#e7dfc9',1.4*z);
      if(!ou){wline(pt(wx-.1,yb,13.5),pt(wx+.1,yb,13.5),'rgba(255,255,255,.25)',.8);}
      else peek(pt(wx,yb,12.5),ou,.9,false);
      wline(pt(wx-.13,yb,8.5),pt(wx+.13,yb,8.5),'#6c5a3d',1.6);
    }
    // 문 (오른쪽 면)
    poly([pt(xb,ya+.22,3),pt(xb,ya+.4,3),pt(xb,ya+.4,15),pt(xb,ya+.22,15)],'#4b3321','#2b1c10',1);
    if(o.hp<o.max*.55){wline(pt(xa+.3,yb,20),pt(xa+.4,yb,13),'rgba(0,0,0,.6)',1.4);wline(pt(xa+.4,yb,13),pt(xa+.33,yb,8),'rgba(0,0,0,.6)',1.4);}
  }else if(t==='apartment'||t==='warehouse'||t==='shed'||t==='ruin'){
    drawBuildingX(o,t,L,occ);
  }else if(t==='rubble'||t==='rubble2'||t==='rubble3'){
    drawRubble(o,L,occ);
  }else if(t==='fence'){
    const A=alongFn(o),post=[.06,.5,.94];
    for(const tt of post){const p=A(tt);shadowAt(p[0]+.04,p[1]+.03,4,2);}
    for(const h of [5,10.5]){wline(pt(...A(0),h),pt(...A(1),h),L('#7c6240'),2.2);wline(pt(...A(0),h+.9),pt(...A(1),h+.9),'rgba(255,230,180,.25)',.8);}
    for(const tt of post){const p=A(tt),b=pt(p[0],p[1],0),tp=pt(p[0],p[1],15);wline(b,tp,L('#5a4228'),3);cx.fillStyle=L('#8b6d47');cx.beginPath();cx.arc(tp[0],tp[1],1.9*z,0,6.3);cx.fill();}
    if(occ[0]){const m=A(.5);peek(pt(m[0],m[1],17),occ[0],.95,true);wline(pt(...A(0),5),pt(...A(1),5),L('#7c6240'),2.2);}
  }else if(t==='crate'){
    const a=cxw-.2,b=cxw+.2,c=cyw-.2,d=cyw+.2;shadowAt(cxw+.1,cyw+.08,12,5.5);
    wbox(a,c,b,d,0,13,L('#bd9054'),L('#9a6f3a'),L('#7c5830'),'#47301a');
    wline(pt(a,d,6.5),pt(b,d,6.5),'rgba(60,40,20,.55)',1);wline(pt(b,c,6.5),pt(b,d,6.5),'rgba(60,40,20,.55)',1);
    wline(pt(a,c,13),pt(b,d,13),'rgba(70,48,24,.6)',1.2);wline(pt(b,c,13),pt(a,d,13),'rgba(70,48,24,.6)',1.2);
    poly([pt(cxw-.07,d,5),pt(cxw+.07,d,5),pt(cxw+.07,d,9.5),pt(cxw-.07,d,9.5)],'#d8d0b8');
  }else if(t==='sandbag'){
    const A=alongFn(o),a=A(.04),b=A(.96);
    sandbagRow(o,[a,b],0,4,false);sandbagRow(o,[A(.16),A(.84)],5,3,false);
    if(!o.natural){const p=pt(cxw,cyw,11);cx.fillStyle=TEAM_COL[o.team];cx.fillRect(p[0]-1*z,p[1]-6*z,2*z,6*z);cx.fillRect(p[0],p[1]-6*z,6*z,3.5*z);}
  }else if(t==='wire'){
    const A=alongFn(o);
    for(const tt of [.08,.92]){const p=A(tt);wline(pt(p[0],p[1],0),pt(p[0],p[1],13),L('#4a3b2a'),2.4);wline(pt(p[0],p[1],9),pt(p[0],p[1],14.5),L('#4a3b2a'),1.6);}
    cx.strokeStyle=L('#d6d6ce');cx.lineWidth=1.15*z;
    for(let k=0;k<5;k++){
      const p=A(.14+k*.18),c=pt(p[0],p[1],6.5);
      cx.beginPath();cx.ellipse(c[0],c[1],7.5*z,6.5*z,0,0,6.3);cx.stroke();
      cx.beginPath();cx.ellipse(c[0]+3*z,c[1],4*z,6*z,0,0,6.3);cx.stroke();
    }
    wline(pt(...A(.04),12),pt(...A(.96),12),L('#c4c4bb'),.9);wline(pt(...A(.04),2.5),pt(...A(.96),2.5),L('#b4b4ab'),.9);
  }else if(t==='tower'){
    const b=.3,tp=.2,H=33,legs=[[-b,-b,-tp,-tp],[b,-b,tp,-tp],[-b,b,-tp,tp],[b,b,tp,tp]];
    shadowAt(cxw+.12,cyw+.1,22,9);
    const leg=(l)=>wline(pt(cxw+l[0],cyw+l[1],0),pt(cxw+l[2],cyw+l[3],H),L('#6b5133'),3);
    leg(legs[0]);leg(legs[1]);leg(legs[2]);leg(legs[3]);
    // 대각 보강
    wline(pt(cxw-b,cyw+b,0),pt(cxw+tp,cyw+tp,H),L('#58432a'),1.6);wline(pt(cxw+b,cyw+b,0),pt(cxw-tp,cyw+tp,H),L('#58432a'),1.6);
    wline(pt(cxw+b,cyw-b,0),pt(cxw+tp,cyw+tp,H),L('#58432a'),1.4);wline(pt(cxw+b,cyw+b,0),pt(cxw+tp,cyw-tp,H),L('#58432a'),1.4);
    wline(pt(cxw-b*.85,cyw+b*.85,15),pt(cxw+b*.85,cyw+b*.85,15),L('#58432a'),1.6);
    // 사다리
    wline(pt(cxw+b+.02,cyw-.08,0),pt(cxw+tp+.02,cyw-.08,H),L('#8a6d46'),1.5);wline(pt(cxw+b+.02,cyw+.08,0),pt(cxw+tp+.02,cyw+.08,H),L('#8a6d46'),1.5);
    // 플랫폼
    wbox(cxw-tp-.05,cyw-tp-.05,cxw+tp+.05,cyw+tp+.05,H,H+3,L('#94764c'),L('#755a38'),L('#5f482c'),'#3a2a18');
    // 뒤 난간 + 병사 + 앞 난간
    wbox(cxw-tp-.03,cyw-tp-.03,cxw+tp+.03,cyw-tp+.02,H+3,H+11,L('#7c6240'),L('#6b5233'),L('#5a4429'));
    wbox(cxw-tp-.03,cyw-tp-.03,cxw-tp+.02,cyw+tp+.03,H+3,H+11,L('#7c6240'),L('#6b5233'),L('#5a4429'));
    if(occ[0]){peek(pt(cxw,cyw,H+11),occ[0],1.15,true);}
    wbox(cxw-tp-.03,cyw+tp-.02,cxw+tp+.03,cyw+tp+.03,H+3,H+8,L('#8a6d46'),L('#755a38'),L('#5f482c'));
    wbox(cxw+tp-.02,cyw-tp-.03,cxw+tp+.03,cyw+tp+.03,H+3,H+8,L('#8a6d46'),L('#755a38'),L('#5f482c'));
    // 지붕
    const rb=H+25,ov=.3;
    for(const [px,py] of [[-tp,-tp],[tp,-tp],[-tp,tp],[tp,tp]])wline(pt(cxw+px,cyw+py,H+3),pt(cxw+px,cyw+py,rb),L('#5c4529'),1.8);
    const ap=pt(cxw,cyw,rb+13);
    poly([ap,pt(cxw-tp-ov,cyw+tp+ov,rb),pt(cxw+tp+ov,cyw+tp+ov,rb)],L('#6a4630'),'#3a2418',1);
    poly([ap,pt(cxw+tp+ov,cyw+tp+ov,rb),pt(cxw+tp+ov,cyw-tp-ov,rb)],L('#563826'),'#3a2418',1);
    if(!o.natural){wline(ap,pt(cxw,cyw,rb+22),'#ccc',1.2);cx.fillStyle=TEAM_COL[o.team];const q=pt(cxw,cyw,rb+22);cx.fillRect(q[0],q[1],9*z,5*z);}
  }else if(t==='mg'){
    const d=.3;shadowAt(cxw+.1,cyw+.08,26,10);
    // 뒤쪽 자루 벽 (북, 서)
    sandbagRow(o,[[cxw-d-.08,cyw-d],[cxw+d+.08,cyw-d]],0,3,false);
    sandbagRow(o,[[cxw-d,cyw-d+.06],[cxw-d,cyw+d]],0,2,false);
    sandbagRow(o,[[cxw-d-.04,cyw-d],[cxw+d+.04,cyw-d]],5,3,false);
    // 삼각대 + 기관총
    const gu=occ[0],fa=gu?gu.face:.8,ix=(Math.cos(fa)-Math.sin(fa))*.9,iy=(Math.cos(fa)+Math.sin(fa))*.5;
    const gp=pt(cxw,cyw,9);
    wline(pt(cxw,cyw,0),gp,'#222',1.8);wline(pt(cxw-.12,cyw+.1,0),gp,'#222',1.6);wline(pt(cxw+.12,cyw+.08,0),gp,'#222',1.6);
    if(gu)peek(pt(cxw-.1,cyw-.12,11),gu,1,true);
    const l2=occ[1];if(l2)peek(pt(cxw-.22,cyw+.04,10),l2,.85,true);
    cx.fillStyle='#34362f';cx.fillRect(gp[0]-5*z,gp[1]-4*z,10*z,6*z);
    cx.strokeStyle='#17170f';cx.lineWidth=2.6*z;cx.beginPath();cx.moveTo(gp[0],gp[1]-1*z);cx.lineTo(gp[0]+ix*17*z,gp[1]-1*z+iy*17*z);cx.stroke();
    cx.strokeStyle='#17170f';cx.lineWidth=1*z;cx.beginPath();cx.moveTo(gp[0]+ix*11*z,gp[1]-1*z+iy*11*z);cx.lineTo(gp[0]+ix*11*z-3*z,gp[1]+4*z+iy*11*z);cx.stroke();
    if(gu)muzzleAt([gp[0]+ix*17*z,gp[1]-1*z+iy*17*z],gu,ix*3,iy*3);
    poly([[gp[0]+ix*5*z-4*z,gp[1]-6*z],[gp[0]+ix*5*z+4*z,gp[1]-6*z],[gp[0]+ix*5*z+4*z,gp[1]+3*z],[gp[0]+ix*5*z-4*z,gp[1]+3*z]],'#555a50');
    // 앞쪽 낮은 자루 (남, 동)
    sandbagRow(o,[[cxw-d-.05,cyw+d],[cxw+d+.05,cyw+d]],0,3,false);
    sandbagRow(o,[[cxw+d,cyw-d+.06],[cxw+d,cyw+d-.06]],0,2,false);
    if(!o.natural){const p=pt(cxw-d-.05,cyw-d,14);cx.fillStyle=TEAM_COL[o.team];cx.fillRect(p[0],p[1]-3*z,7*z,4*z);}
  }else if(t==='mortar'){drawMortarOb(o,occ,L);
  }else if(t==='armory'){drawArmoryOb(o,L);
  }else if(t==='medbay'){drawMedbayOb(o,occ,L);
  }else if(t==='bunker'){
    const a=x0+.1,b=x1-.1,c=y0+.1,d=y1-.1,H=17,Hr=22;
    shadowAt(cxw+.15,cyw+.12,60,24);
    wbox(a-.04,c-.04,b+.04,d+.04,0,2,'#6f7064','#62635a','#50514a');
    wbox(a,c,b,d,2,H,'#000',L('#8a8c80'),L('#6c6e63'),'#4a4c43');
    // 콘크리트 거푸집 줄
    for(const h of [7,12]){wline(pt(a,d,h),pt(b,d,h),'rgba(0,0,0,.18)',1);wline(pt(b,c,h),pt(b,d,h),'rgba(0,0,0,.18)',1);}
    // 지붕 슬래브 + 위장
    wbox(a-.07,c-.07,b+.07,d+.07,H,Hr,L('#7c7e72'),L('#74766b'),L('#5c5e54'),'#44463e');
    const tc=pt(cxw,cyw,Hr);
    for(let k=0;k<7;k++){
      const px=tc[0]+(hsh(o.id,k)-.5)*70*z,py=tc[1]+(hsh(o.id,k+7)-.5)*24*z;
      cx.fillStyle=k%2?'rgba(70,104,52,.85)':'rgba(92,120,60,.8)';cx.beginPath();cx.ellipse(px,py,(7+hsh(o.id,k+3)*6)*z,(3+hsh(o.id,k+5)*2)*z,0,0,6.3);cx.fill();
    }
    wbox(cxw+.35,cyw-.4,cxw+.5,cyw-.25,Hr,Hr+7,'#55574d','#4b4d44','#3f4139');
    // 총안구 4개: 왼쪽면 2, 오른쪽면 2
    const sl=[[0,o.x+.5],[0,o.x+1.5],[1,o.y+.5],[1,o.y+1.5]];
    for(let k=0;k<4;k++){
      const side=sl[k][0],q=sl[k][1];
      const P=(u,h)=>side===0?pt(q+u,d,h):pt(b,q+u,h);
      poly([P(-.2,8.5),P(.2,8.5),P(.2,13.5),P(-.2,13.5)],'#0b0c08','#3f4137',1.3*z);
      const ou=occ[k];
      if(ou){
        const m=P(0,11);
        cx.fillStyle='#e8dca0';cx.fillRect(m[0]-3*z,m[1]-1.4*z,2*z,1.4*z);cx.fillRect(m[0]+1.2*z,m[1]-1.4*z,2*z,1.4*z);
        cx.fillStyle=ou.flash>0?'#fff':'#41492f';cx.fillRect(m[0]-5*z,m[1]-4.2*z,10*z,2.4*z);
        const out=side===0?pt(q,d+.3,11.4):pt(b+.3,q,11.4);
        cx.strokeStyle='#15150f';cx.lineWidth=2.4*z;cx.beginPath();cx.moveTo(m[0],m[1]+1*z);cx.lineTo(out[0],out[1]);cx.stroke();
        muzzleAt(out,ou,side===0?-2:2,2);
      }
    }
    // 앞쪽 모래주머니 보강
    sandbagRow(o,[[a+.15,d+.1],[b-.15,d+.1]],0,5,false);
    if(!o.natural){const p=pt(a,d,Hr);cx.fillStyle=TEAM_COL[o.team];cx.fillRect(p[0],p[1]-4*z,12*z,3.5*z);}
  }
  drawOccMarks(o,occ);
  if(!REC)drawObHp(o);
}

// ---- 참호 ----
function diaPath(x,y){if(G&&G.hill&&!REC&&viewLay!==1&&x>=0&&y>=0&&x<G.w&&y<G.h){const i=y*G.w+x;[[0,0],[1,0],[1,1],[0,1]].forEach(([fx,fy],k)=>{const p=rawS(x+fx,y+fy,elevIn(i,fx,fy));k?cx.lineTo(p[0],p[1]):cx.moveTo(p[0],p[1]);});cx.closePath();return;}
  const [sx,sy]=toS(x+.5,y+.5),z=cam.z;cx.moveTo(sx,sy-16*z);cx.lineTo(sx+32*z,sy);cx.lineTo(sx,sy+16*z);cx.lineTo(sx-32*z,sy);cx.closePath();}
function drawCrater(x,y){
  const [sx,sy]=toS(x+.5,y+.5),z=cam.z;
  cx.fillStyle='#6a5a3e';cx.beginPath();cx.ellipse(sx,sy,27*z,13.5*z,0,0,6.3);cx.fill();
  cx.fillStyle='#2b2216';cx.beginPath();cx.ellipse(sx,sy+1.5*z,21*z,10*z,0,0,6.3);cx.fill();
  cx.fillStyle='#1b150d';cx.beginPath();cx.ellipse(sx,sy+3*z,14*z,6*z,0,0,6.3);cx.fill();
  cx.strokeStyle='rgba(255,240,200,.18)';cx.lineWidth=1.3*z;cx.beginPath();cx.ellipse(sx,sy,27*z,13.5*z,0,3.4,5.6);cx.stroke();
}
function drawTrenchTile(x,y,v){
  const w=G.w,z=cam.z,d=8,[X,Y]=VT(x,y),P=toSV;
  const nb=(va,vb)=>{const [dx,dy]=unrotDir(va,vb),a=x+dx,b=y+dy;const q=inb(a,b)?G.trench[b*w+a]:0;return q>0&&q!==255;};
  const W=nb(-1,0),Nn=nb(0,-1),E=nb(1,0),S=nb(0,1);
  cx.save();
  cx.beginPath();diaPath(x,y);
  {const dp=(va,vb)=>{const [dx,dy]=unrotDir(va,vb);diaPath(x+dx,y+dy);};if(W)dp(-1,0);if(Nn)dp(0,-1);if(E)dp(1,0);if(S)dp(0,1);}
  cx.clip();
  // 바닥
  poly([P(X,Y,-d),P(X+1,Y,-d),P(X+1,Y+1,-d),P(X,Y+1,-d)],'#3a2d1e');
  poly([P(X,Y,-d),P(X+1,Y,-d),P(X+1,Y+1,-d),P(X,Y+1,-d)],TEAM_COL[v-1]+'1f');
  // 발판 널
  for(let k=0;k<4;k++){const f=.14+k*.24;wline(P(X+f,Y,-d),P(X+f,Y+1,-d),'rgba(104,82,52,.7)',2.4);wline(P(X+f+.07,Y,-d),P(X+f+.07,Y+1,-d),'rgba(20,14,8,.35)',1);}
  // 벽면 (뒤쪽 두 변)
  if(!W){
    poly([P(X,Y,0),P(X,Y+1,0),P(X,Y+1,-d),P(X,Y,-d)],'#6d583b');
    for(let k=1;k<4;k++){const hh=-d*k/4;wline(P(X,Y,hh),P(X,Y+1,hh),'rgba(40,28,14,.35)',1);}
    for(let k=0;k<5;k++){const yy=Y+.1+k*.2;wline(P(X,yy,0),P(X,yy,-d),'rgba(40,28,14,.5)',1.6);}
  }
  if(!Nn){
    poly([P(X,Y,0),P(X+1,Y,0),P(X+1,Y,-d),P(X,Y,-d)],'#5a4730');
    for(let k=1;k<4;k++){const hh=-d*k/4;wline(P(X,Y,hh),P(X+1,Y,hh),'rgba(30,20,10,.4)',1);}
    for(let k=0;k<5;k++){const xx=X+.1+k*.2;wline(P(xx,Y,0),P(xx,Y,-d),'rgba(30,20,10,.5)',1.6);}
  }
  // 앞쪽 가장자리 그림자
  if(!S)wline(P(X,Y+1,-d),P(X+1,Y+1,-d),'rgba(0,0,0,.35)',2);
  if(!E)wline(P(X+1,Y,-d),P(X+1,Y+1,-d),'rgba(0,0,0,.35)',2);
  cx.restore();
  // 흙더미 (뒤쪽 바깥) + 앞쪽 입술
  if(!Nn){poly([P(X-.02,Y,0),P(X+1.02,Y,0),P(X+1.02,Y-.22,3.2),P(X-.02,Y-.22,3.2)],'#7d6845');wline(P(X,Y-.22,3.2),P(X+1,Y-.22,3.2),'rgba(255,235,190,.3)',1);}
  if(!W){poly([P(X,Y-.02,0),P(X,Y+1.02,0),P(X-.22,Y+1.02,3.2),P(X-.22,Y-.02,3.2)],'#6b5838');}
  if(!E)wline(P(X+1,Y,0),P(X+1,Y+1,0),'#8f7a52',3);
  if(!S)wline(P(X,Y+1,0),P(X+1,Y+1,0),'#8f7a52',3);
  if(!E||!S){ if(!E)wline(P(X+1,Y,0),P(X+1,Y+1,0),'rgba(255,240,200,.25)',1);if(!S)wline(P(X,Y+1,0),P(X+1,Y+1,0),'rgba(255,240,200,.25)',1);}
  const ti=y*w+x,hp=G.trenchHP[ti]||0;if(hp>0&&hp<80){const q=P(X+.5,Y+.5,1);cx.strokeStyle='rgba(25,17,10,.8)';cx.lineWidth=1.8*z;cx.beginPath();cx.moveTo(q[0]-5*z,q[1]-3*z);cx.lineTo(q[0]-1*z,q[1]+1*z);cx.lineTo(q[0]-3*z,q[1]+5*z);cx.moveTo(q[0]+2*z,q[1]-4*z);cx.lineTo(q[0]+5*z,q[1]);cx.stroke();}
}
