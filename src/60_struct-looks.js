// ================= 강화 단계별 외형 =================
// 키의 마지막 칸(stock 자리)에 단계(lv)가 들어가, 단계마다 별도의 SVG 에셋이 쓰인다 (tools/export-levels.js 로 굽는다).
const HESCO_COL=['#cfc197','#b5a778','#978b63'];
function hescoBlock(x0,y0,x1,y1,h0,h1,L,steel){
  const c=steel?['#7b8272','#5f6657','#474d41']:HESCO_COL;
  wbox(x0,y0,x1,y1,h0,h1,L(c[0]),L(c[1]),L(c[2]),'#4f4830');
  // 철망 격자 (남쪽·동쪽 면)
  const n=Math.max(2,Math.round(Math.hypot(x1-x0,y1-y0)*6)),hh=h1-h0;
  for(let k=1;k<n;k++){
    const t=k/n;
    wline(pt(x0+(x1-x0)*t,y1,h0),pt(x0+(x1-x0)*t,y1,h1),'rgba(40,36,20,.3)',.8);
    wline(pt(x1,y0+(y1-y0)*t,h0),pt(x1,y0+(y1-y0)*t,h1),'rgba(40,36,20,.3)',.8);
  }
  for(let k=1;k<3;k++){const h=h0+hh*k/3;wline(pt(x0,y1,h),pt(x1,y1,h),'rgba(40,36,20,.3)',.8);wline(pt(x1,y0,h),pt(x1,y1,h),'rgba(40,36,20,.3)',.8);}
}
function drawHescoOb(o,occ,L){
  const z=cam.z,lv=o.lv|0,cxw=o.x+.5,cyw=o.y+.5,h=lv>=2?20:14;
  shadowAt(cxw+.1,cyw+.08,30,12);
  // 뒤(북)·왼(서) 방벽
  hescoBlock(cxw-.4,cyw-.4,cxw+.4,cyw-.2,0,h,L,false);
  hescoBlock(cxw-.4,cyw-.2,cxw-.22,cyw+.4,0,h,L,false);
  // 병사와 총
  const gu=occ[0],fa=gu?gu.face:.8,ix=(Math.cos(fa)-Math.sin(fa))*.9,iy=(Math.cos(fa)+Math.sin(fa))*.5;
  const gp=pt(cxw,cyw+.02,lv>=2?12:9);
  if(gu){peek(pt(cxw-.04,cyw-.02,lv>=2?14:11),gu,1,true);}
  const l2=occ[1];if(l2)peek(pt(cxw-.16,cyw+.14,lv>=2?13:10),l2,.85,true);
  if(gu){cx.strokeStyle='#17170f';cx.lineWidth=2.4*z;cx.beginPath();cx.moveTo(gp[0],gp[1]);cx.lineTo(gp[0]+ix*15*z,gp[1]+iy*15*z);cx.stroke();muzzleAt([gp[0]+ix*15*z,gp[1]+iy*15*z],gu,ix*3,iy*3);}
  // 앞(동) 방벽 + 낮은 앞 방벽
  hescoBlock(cxw+.22,cyw-.2,cxw+.4,cyw+.4,0,h,L,false);
  if(lv>=2){
    // 방호진지: 강철 방패판 + 총안, 방벽 위 자루 한 줄, 강철 덮개
    hescoBlock(cxw-.4,cyw+.28,cxw+.2,cyw+.4,0,9,L,true);
    wline(pt(cxw-.24,cyw+.41,6),pt(cxw-.02,cyw+.41,6),'#0b0c08',2.4);
    wbox(cxw-.42,cyw-.42,cxw+.42,cyw-.18,h,h+2.5,L('#8a9180'),L('#5f6657'),L('#474d41'),'#2f342b');
    wbox(cxw+.2,cyw-.2,cxw+.42,cyw+.42,h,h+2.5,L('#8a9180'),L('#5f6657'),L('#474d41'),'#2f342b');
    sandbagRow(o,[[cxw-.3,cyw-.3],[cxw+.3,cyw-.3]],h+2,3,false);
    wline(pt(cxw+.4,cyw-.4,h+2),pt(cxw+.4,cyw-.4,h+26),'#d8d8cc',1.3);poly([pt(cxw+.4,cyw-.4,h+26),pt(cxw+.4,cyw-.4,h+21),pt(cxw+.52,cyw-.4,h+23.5)],TEAM_COL[o.team<0?0:o.team]);
  }else{
    sandbagRow(o,[[cxw-.36,cyw+.36],[cxw+.1,cyw+.36]],0,2,false);
    if(!o.natural){const p=pt(cxw-.4,cyw-.4,h+4);cx.fillStyle=TEAM_COL[o.team];cx.fillRect(p[0],p[1]-3*z,7*z,4*z);}
  }
  if(lv===1){
    // 위장막 초소: 사방에 말뚝을 세우고 위장망을 씌운다
    const t=26;
    for(const [px,py] of [[-.42,-.42],[.42,-.42],[-.42,.42],[.42,.42]])wline(pt(cxw+px,cyw+py,h-2),pt(cxw+px,cyw+py,t),L('#4d4330'),1.6);
    cx.globalAlpha=.88;
    poly([pt(cxw-.5,cyw-.5,t),pt(cxw+.5,cyw-.5,t-1),pt(cxw+.5,cyw+.5,t-4),pt(cxw-.5,cyw+.5,t-3)],L('#4c6a3a'),'#2c4020',1);
    cx.globalAlpha=1;
    const c=pt(cxw,cyw,t-2);
    for(let k=0;k<9;k++){
      const px=c[0]+(hsh(o.id,k)-.5)*66*z,py=c[1]+(hsh(o.id,k+7)-.5)*26*z;
      cx.fillStyle=k%3===0?'#6f8a48':k%3===1?'#3f5a30':'#8a7a45';cx.beginPath();cx.ellipse(px,py,(6+hsh(o.id,k+3)*6)*z,(2.6+hsh(o.id,k+5)*2)*z,0,0,6.3);cx.fill();
    }
    for(let k=0;k<7;k++){const q=pt(cxw-.5+k*.16,cyw+.5-k*.02,t-3);wline(q,[q[0]+(hsh(o.id,k+30)-.5)*4*z,q[1]+7*z],'#3f5a30',1.4);}
  }
}
function drawTowerLv(o,occ,L){
  const z=cam.z,lv=o.lv|0,cxw=o.x+.5,cyw=o.y+.5,H=33,tp=.2,rb=H+25;
  // 엄폐: 앞 난간에 강판을 덧대고 지붕에 위장망
  wbox(cxw-tp-.05,cyw+tp-.03,cxw+tp+.05,cyw+tp+.06,H+3,H+10,L('#6a7260'),L('#4e5546'),L('#3b4135'),'#272b22');
  wbox(cxw+tp-.03,cyw-tp-.05,cxw+tp+.06,cyw+tp+.05,H+3,H+10,L('#6a7260'),L('#4e5546'),L('#3b4135'),'#272b22');
  for(const [a,b] of [[-.12,0],[.1,0]]){wline(pt(cxw+a,cyw+tp+.07,H+4),pt(cxw+a,cyw+tp+.07,H+9),'rgba(0,0,0,.45)',1);}
  const c=pt(cxw,cyw,rb+5);
  for(let k=0;k<(lv>=2?12:7);k++){
    const px=c[0]+(hsh(o.id,k)-.5)*50*z,py=c[1]+(hsh(o.id,k+7)-.1)*14*z;
    cx.fillStyle=k%3===0?'#6f8a48':k%3===1?'#3f5a30':'#7a6c3e';cx.beginPath();cx.ellipse(px,py,(5+hsh(o.id,k+3)*5)*z,(2.4+hsh(o.id,k+5)*1.6)*z,0,0,6.3);cx.fill();
  }
  if(lv>=2){
    // 저격진지: 긴 저격총 + 조준경, 늘어진 위장 술, 바닥 자루 보강
    const q=pt(cxw,cyw,H+8),ix=.9,iy=.5;
    cx.strokeStyle='#15150f';cx.lineWidth=2.4*z;cx.beginPath();cx.moveTo(q[0]-ix*4*z,q[1]-iy*4*z);cx.lineTo(q[0]+ix*24*z,q[1]+iy*24*z);cx.stroke();
    cx.fillStyle='#262a22';cx.fillRect(q[0]+ix*5*z-3*z,q[1]+iy*5*z-5*z,6*z,2.6*z);
    cx.fillStyle='rgba(150,220,255,.9)';cx.fillRect(q[0]+ix*8*z-1*z,q[1]+iy*8*z-4.4*z,2*z,1.6*z);
    for(let k=0;k<10;k++){const e=pt(cxw-.34+k*.075,cyw+.38-k*.005,rb-1);wline(e,[e[0]+(hsh(o.id,k+11)-.5)*3*z,e[1]+(6+hsh(o.id,k+13)*6)*z],k%2?'#3f5a30':'#6f8a48',1.5);}
    sandbagRow(o,[[cxw-.4,cyw+.4],[cxw+.4,cyw+.4]],0,3,false);
    wline(pt(cxw-.3,cyw+.3,0),pt(cxw+tp,cyw+tp,H),'#58432a',1.6);
  }
}
function drawBarrierLv(o,L){
  const A=alongFn(o),a=A(.04),b=A(.96);
  // 방벽: 자루를 높이 쌓고 강철 말뚝·덮개판을 얹는다
  sandbagRow(o,[a,b],10,4,false);sandbagRow(o,[A(.16),A(.84)],15,3,false);
  for(const t of [.06,.5,.94]){const p=A(t);wline(pt(p[0],p[1],0),pt(p[0],p[1],27),L('#5f6657'),2.2);}
  wline(pt(a[0],a[1],24),pt(b[0],b[1],24),L('#59614f'),3.2);
  wline(pt(a[0],a[1],24),pt(b[0],b[1],24),'rgba(240,200,60,.8)',1.1);
}
// ---- 감시포 (자동 속사) · 소이포 · SAM 터렛 ----
const _dmoL=drawMortarOb;
drawMortarOb=function(o,occ,L){
  const lv=o.lv|0;
  if(lv===1){_dmoL(o,[],L);drawIncenDeco(o,L);return;}
  if(lv>=2){drawSamOb(o,L);return;}
  drawAutoTurretOb(o,L);
};
function drawAutoTurretOb(o,L){
  const z=cam.z,cxw=o.x+.5,cyw=o.y+.5,ang=o.aim||.78;
  shadowAt(cxw+.08,cyw+.06,26,11);
  sandbagRow(o,[[cxw-.4,cyw-.34],[cxw+.4,cyw-.34]],0,4,false);
  sandbagRow(o,[[cxw-.4,cyw-.26],[cxw-.4,cyw+.34]],0,3,false);
  sandbagRow(o,[[cxw+.4,cyw-.26],[cxw+.4,cyw+.34]],0,3,false);
  const b=pt(cxw,cyw+.02,0);
  cx.fillStyle=L('#3b3d34');cx.beginPath();cx.ellipse(b[0],b[1]-3*z,11*z,5.6*z,0,0,6.3);cx.fill();
  // 포탑 몸체
  wbox(cxw-.14,cyw-.12,cxw+.14,cyw+.16,3,12,L('#7d8470'),L('#5f6657'),L('#474d41'),'#2f342b');
  const gp=pt(cxw,cyw+.02,10),ix=(Math.cos(ang)-Math.sin(ang))*.9,iy=(Math.cos(ang)+Math.sin(ang))*.5;
  cx.strokeStyle=L('#17170f');cx.lineWidth=2.2*z;cx.lineCap='round';
  for(const d of [-2,2]){cx.beginPath();cx.moveTo(gp[0]+d*z,gp[1]+d*.4*z);cx.lineTo(gp[0]+ix*16*z+d*z,gp[1]+iy*16*z+d*.4*z);cx.stroke();}
  cx.lineCap='butt';
  // 센서 렌즈 + 탄약 상자
  const sp=pt(cxw,cyw+.02,14);cx.fillStyle=L('#3b4a40');cx.beginPath();cx.arc(sp[0],sp[1],3.6*z,0,6.3);cx.fill();
  cx.fillStyle=(o.muz>0)?'#ffd76a':'rgba(120,230,150,.9)';cx.beginPath();cx.arc(sp[0]+.8*z,sp[1]-.6*z,1.6*z,0,6.3);cx.fill();
  wbox(cxw+.18,cyw-.22,cxw+.36,cyw-.04,0,6,L('#8d7a4c'),L('#756439'),L('#5f5230'),'#3a2f1b');
  if(o.muz>0){const q=o.muz/.12;cx.fillStyle=`rgba(255,208,100,${Math.min(1,q)})`;cx.beginPath();cx.arc(gp[0]+ix*17*z,gp[1]+iy*17*z,5*z,0,6.3);cx.fill();}
  const pole=pt(cxw-.4,cyw-.34,6);wline(pole,pt(cxw-.4,cyw-.34,28),'#d8d8cc',1.3);
  poly([pt(cxw-.4,cyw-.34,28),pt(cxw-.4,cyw-.34,24),pt(cxw-.28,cyw-.34,26)],TEAM_COL[o.team<0?0:o.team]);
}
function drawIncenDeco(o,L){
  const z=cam.z,cxw=o.x+.5,cyw=o.y+.5,ang=o.aim||.78;
  // 연료 드럼 두 개 + 화염 표식, 포신에 붉은 띠
  for(const [dx,dy] of [[.3,.1],[.38,.28]]){
    const p=pt(cxw+dx,cyw+dy,0),q=pt(cxw+dx,cyw+dy,10);
    cx.fillStyle=L('#9b2f1c');cx.beginPath();cx.ellipse(p[0],p[1],5.4*z,2.8*z,0,0,6.3);cx.fill();
    cx.fillRect(q[0]-5.4*z,q[1],10.8*z,p[1]-q[1]);
    cx.fillStyle=L('#c4472b');cx.beginPath();cx.ellipse(q[0],q[1],5.4*z,2.8*z,0,0,6.3);cx.fill();
    cx.fillStyle='#ffb347';cx.beginPath();cx.moveTo(q[0],q[1]+7*z);cx.quadraticCurveTo(q[0]+3*z,q[1]+4*z,q[0],q[1]+1*z);cx.quadraticCurveTo(q[0]-3*z,q[1]+4*z,q[0],q[1]+7*z);cx.fill();
  }
  const bp=pt(cxw,cyw+.03,2),ix=(Math.cos(ang)-Math.sin(ang))*.9,iy=(Math.cos(ang)+Math.sin(ang))*.5;
  const bot=[bp[0]-ix*3*z,bp[1]-2*z],top=[bp[0]+ix*10*z,bp[1]+iy*10*z-21*z];
  cx.strokeStyle='#d2461f';cx.lineWidth=7.6*z;
  const m1=[bot[0]+(top[0]-bot[0])*.72,bot[1]+(top[1]-bot[1])*.72],m2=[bot[0]+(top[0]-bot[0])*.86,bot[1]+(top[1]-bot[1])*.86];
  cx.beginPath();cx.moveTo(m1[0],m1[1]);cx.lineTo(m2[0],m2[1]);cx.stroke();
  cx.fillStyle='#ff9a3c';cx.beginPath();cx.arc(top[0],top[1]-3*z,2.4*z,0,6.3);cx.fill();
}
function drawSamOb(o,L){
  const z=cam.z,cxw=o.x+.5,cyw=o.y+.5,ang=o.aim||.78;
  shadowAt(cxw+.1,cyw+.08,30,13);
  const b=pt(cxw,cyw,0);
  cx.fillStyle=L('#5b5d54');cx.beginPath();cx.ellipse(b[0],b[1]+1*z,28*z,14*z,0,0,6.3);cx.fill();
  cx.fillStyle=L('#7b7d72');cx.beginPath();cx.ellipse(b[0],b[1]-2*z,24*z,12*z,0,0,6.3);cx.fill();
  cx.strokeStyle='#44463e';cx.lineWidth=1.2*z;cx.stroke();
  sandbagRow(o,[[cxw-.44,cyw-.34],[cxw+.44,cyw-.34]],0,4,false);
  // 회전대 + 미사일 발사 상자 (4연장)
  wbox(cxw-.16,cyw-.14,cxw+.16,cyw+.16,2,9,L('#6a7260'),L('#4e5546'),L('#3b4135'),'#272b22');
  const ix=(Math.cos(ang)-Math.sin(ang))*.9,iy=(Math.cos(ang)+Math.sin(ang))*.5,bp=pt(cxw,cyw+.02,10);
  const tip=[bp[0]+ix*13*z,bp[1]+iy*13*z-17*z];
  cx.strokeStyle=L('#2c2f27');cx.lineWidth=12*z;cx.lineCap='butt';cx.beginPath();cx.moveTo(bp[0],bp[1]);cx.lineTo(tip[0],tip[1]);cx.stroke();
  const nx=-(tip[1]-bp[1]),ny=tip[0]-bp[0],nl=Math.hypot(nx,ny)||1;
  for(const k of [-1,1]){
    const ox=nx/nl*3.4*k*z,oy=ny/nl*3.4*k*z;
    cx.strokeStyle=L('#c9cbb8');cx.lineWidth=3.6*z;cx.beginPath();cx.moveTo(bp[0]+ox,bp[1]+oy);cx.lineTo(tip[0]+ox,tip[1]+oy);cx.stroke();
    cx.fillStyle='#c0392f';cx.beginPath();cx.arc(tip[0]+ox,tip[1]+oy,1.9*z,0,6.3);cx.fill();
  }
  cx.strokeStyle=L('#5c5f52');cx.lineWidth=1.8*z;cx.beginPath();cx.moveTo(bp[0]-6*z,bp[1]+5*z);cx.lineTo(bp[0]+4*z,bp[1]-2*z);cx.stroke();
  // 레이더 접시 (마스트 위)
  const mp=pt(cxw-.3,cyw+.12,0),mt=pt(cxw-.3,cyw+.12,24);
  wline(mp,mt,L('#44463e'),2.2);
  cx.fillStyle=L('#c9cbb8');cx.beginPath();cx.ellipse(mt[0],mt[1]-1*z,8*z,4.6*z,-.35,0,6.3);cx.fill();cx.strokeStyle='#5c5f52';cx.lineWidth=1*z;cx.stroke();
  cx.fillStyle='#5c5f52';cx.beginPath();cx.arc(mt[0]+1.6*z,mt[1]-1.6*z,1.5*z,0,6.3);cx.fill();
  if(o.muz>0){const q=Math.min(1,o.muz/.25);cx.fillStyle=`rgba(255,230,150,${q})`;cx.beginPath();cx.arc(tip[0],tip[1],7*z*(2-q),0,6.3);cx.fill();}
  const pole=pt(cxw+.4,cyw-.34,4);wline(pole,pt(cxw+.4,cyw-.34,30),'#d8d8cc',1.3);
  poly([pt(cxw+.4,cyw-.34,30),pt(cxw+.4,cyw-.34,26),pt(cxw+.52,cyw-.34,28)],TEAM_COL[o.team<0?0:o.team]);
}
// ---- 구급함 → 의무 막사 → 급조 병원 ----
const _dmbL=drawMedbayOb;
drawMedbayOb=function(o,occ,L){
  const lv=o.lv|0;
  if(lv===0){drawFirstAidBox(o,occ,L);return;}
  _dmbL(o,occ,L);
  if(lv>=2)drawFieldHospital(o,L);
};
function drawFirstAidBox(o,occ,L){
  const z=cam.z,cxw=o.x+.5,cyw=o.y+.5;
  shadowAt(cxw+.08,cyw+.06,20,8);
  // 들것 + 구급 상자 + 적십자 깃발
  const pat=(o.patients||[]).map(id=>G.uid.get(id)).filter(u=>u&&u.state==='med');
  const sp=pt(cxw-.2,cyw+.18,3);
  cx.fillStyle=L('#7a7b66');cx.beginPath();cx.ellipse(sp[0],sp[1],11*z,5.4*z,0,0,6.3);cx.fill();
  cx.fillStyle=pat.length?'#e9ecde':'rgba(220,225,205,.55)';cx.beginPath();cx.ellipse(sp[0],sp[1]-1*z,8.6*z,4*z,0,0,6.3);cx.fill();
  if(pat.length){cx.fillStyle='#d6b48f';cx.beginPath();cx.arc(sp[0]+5*z,sp[1]-3*z,2.4*z,0,6.3);cx.fill();cx.fillStyle=TEAM_COL[pat[0].team];cx.fillRect(sp[0]-6*z,sp[1]-2.6*z,7*z,2.4*z);}
  wbox(cxw+.04,cyw-.3,cxw+.4,cyw+.0,0,11,L('#c9cab0'),L('#a6a78c'),L('#84866d'),'#4b4a3d');
  const cp=pt(cxw+.22,cyw-.15,11);cx.fillStyle='#c0392f';cx.fillRect(cp[0]-1.8*z,cp[1]-5*z,3.6*z,10*z);cx.fillRect(cp[0]-5*z,cp[1]-1.8*z,10*z,3.6*z);
  const fp=pt(cxw+.22,cyw+.0,6),f2=pt(cxw+.22,cyw+.0,6);
  const lf=pt(cxw+.4,cyw-.02,5);cx.fillStyle='#c0392f';cx.fillRect(lf[0]-1.2*z,lf[1]-3.4*z,2.4*z,6.8*z);cx.fillRect(lf[0]-3.4*z,lf[1]-1.2*z,6.8*z,2.4*z);
  wline(pt(cxw-.38,cyw-.3,0),pt(cxw-.38,cyw-.3,26),'#d8d8cc',1.3);
  const fl=pt(cxw-.38,cyw-.3,25),wv=Math.sin(G.time*3+o.id)*1.1*z;
  cx.fillStyle='#f0efe6';cx.fillRect(fl[0],fl[1],10*z,7*z+wv);cx.fillStyle='#c0392f';cx.fillRect(fl[0]+4*z,fl[1]+1*z,2*z,5*z);cx.fillRect(fl[0]+2.4*z,fl[1]+2.6*z,5.2*z,1.8*z);
  if(occ[0])peek(pt(cxw-.1,cyw-.1,8),occ[0],.8,true);
}
function drawFieldHospital(o,L){
  const z=cam.z,cxw=o.x+.5,cyw=o.y+.5;
  // 급조 병원: 옆에 붙인 보조 천막 + 발전기 + 링거대 + 조명
  const x0=cxw-.62,x1=cxw-.3,y0=cyw+.05,y1=cyw+.5;
  wbox(x0,y0,x1,y1,0,9,L('#b7b89c'),L('#9b9c82'),L('#7e7f68'),'#4b4a3d');
  poly([pt(x0-.04,y1+.04,9),pt(x1+.04,y1+.04,9),pt(x1+.04,(y0+y1)/2,17),pt(x0-.04,(y0+y1)/2,17)],L('#dcdcc9'),'#6d6e56',1);
  poly([pt(x1+.04,y1+.04,9),pt(x1+.04,y0-.04,9),pt(x1+.04,(y0+y1)/2,17)],L('#c9cab3'),'#6d6e56',1);
  const cp=pt((x0+x1)/2,(y0+y1)/2+.12,13);cx.fillStyle='#c0392f';cx.fillRect(cp[0]-1.6*z,cp[1]-4.6*z,3.2*z,9.2*z);cx.fillRect(cp[0]-4.6*z,cp[1]-1.6*z,9.2*z,3.2*z);
  wbox(cxw+.3,cyw+.28,cxw+.52,cyw+.5,0,7,L('#6a7260'),L('#4e5546'),L('#3b4135'),'#272b22');
  const g=pt(cxw+.41,cyw+.39,7);cx.fillStyle='#e6c24a';cx.fillRect(g[0]-2*z,g[1]-1*z,4*z,2*z);
  wline(pt(cxw+.12,cyw+.42,0),pt(cxw+.12,cyw+.42,18),'#c9cbb8',1.2);wline(pt(cxw+.06,cyw+.42,18),pt(cxw+.18,cyw+.42,18),'#c9cbb8',1.2);
  const iv=pt(cxw+.18,cyw+.42,16);cx.fillStyle='rgba(180,230,255,.9)';cx.fillRect(iv[0]-1*z,iv[1]-1*z,2*z,4*z);
  const lp=pt(cxw+.4,cyw-.35,22);wline(pt(cxw+.4,cyw-.35,0),lp,'#44463e',1.6);
  cx.fillStyle='rgba(255,245,190,.95)';cx.beginPath();cx.arc(lp[0],lp[1],3*z,0,6.3);cx.fill();
}
