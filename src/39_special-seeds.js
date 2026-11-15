// ================= 특수 시드 (superflat · urbanwar · coast · mineshaft) =================
const SPECIAL={
  superflat:{n:'Superflat',desc:'드넓게 펼쳐진 대평원. 장애물도 자원도 없고, 모두가 동등하게 빈곤합니다.'},
  urbanwar:{n:'Urban War',desc:'건물로 가득 찬 대도시와 그 사이를 가르는 강. 다리 몇 개가 유일한 통로입니다.'},
  coast:{n:'Coast',desc:'여러 갈래의 넓은 강이 사방을 가로막습니다. 차량은 다리 없이는 무용지물입니다.'},
  mineshaft:{n:'Mineshaft',desc:'과거 거대한 채굴지. 엄청난 크기의 지하 동굴망이 이미 존재합니다.'}
};
function specialOf(seed){const k=String(seed||'').trim().toLowerCase();return SPECIAL[k]?k:null;}
function carveRiver(r,ori,pos,wid,amp){
  const w=G.w,h=G.h,L=ori==='h'?w:h,span=ori==='h'?h:w;
  const ph=r()*6.28,ph2=r()*6.28,f1=.03+r()*.03,f2=.1+r()*.05;let walk=0;
  for(let a=0;a<L;a++){
    walk=clamp(walk+(r()-.5)*.6,-span*.05,span*.05);
    const c=span*pos+Math.sin(a*f1+ph)*span*amp+Math.sin(a*f2+ph2)*span*amp*.3+walk;
    const hw=wid/2*(.85+.3*Math.sin(a*.17+ph2));
    for(let d=-Math.ceil(hw)-1;d<=Math.ceil(hw)+1;d++){
      if(Math.abs(d)>hw)continue;
      const b=Math.round(c+d);if(b<0||b>=span)continue;
      const x=ori==='h'?a:b,y=ori==='h'?b:a,i=y*w+x;
      G.tt[i]=2;G.mm[i]=0;G.dec[i]=0;G.ground[i]=tileColor(G.biome,2,hsh(x,y));G.gq[i]=Math.min(3,(hsh(x,y)*4)|0);
    }
  }
}
function genBridges(r,ori,n){
  const w=G.w,h=G.h,L=ori==='h'?w:h,span=ori==='h'?h:w;
  for(let k=0;k<n;k++){
    const a0=Math.round(L*(k+.5)/n+(r()-.5)*L*.08);
    for(let a=a0;a<a0+2&&a<L;a++)for(let b=0;b<span;b++){
      const x=ori==='h'?a:b,y=ori==='h'?b:a,i=y*w+x;if(G.tt[i]===2)G.up[i]=1;
    }
  }
}
function genCity(r){
  const w=G.w,h=G.h,P=8,TY=['apartment','house','warehouse','shed','ruin','house','apartment'];
  const want=()=>{const q=r();return q<.3?'apartment':q<.43?'warehouse':q<.7?'house':q<.8?'shed':'ruin';};
  for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){if((((x-3)%P+P)%P>=6||((y-3)%P+P)%P>=6)&&G.tt[y*w+x]!==2)G.road[y*w+x]=1;}
  {const rows=Math.floor((h-9)/P),yr=3+P*Math.max(0,Math.floor(rows/3))+6;roadLine(1,yr,w-2,yr,3,true,r);}
  for(let by=3;by+6<h-2;by+=P)for(let bx=3;bx+6<w-2;bx+=P){
    if(r()<.1){ // 광장
      addOb('crate',bx+rint(r,1,4),by+rint(r,1,4));addOb('crate',bx+rint(r,1,4),by+rint(r,1,4));continue;
    }
    for(let yy=by;yy<by+6;yy++)for(let xx=bx;xx<bx+6;xx++){
      if(G.obst[yy*w+xx]||G.tt[yy*w+xx]===2)continue;
      const t0=want(),order=t0==='apartment'?['apartment','warehouse','house','shed']:t0==='warehouse'?['warehouse','house','shed']:t0==='ruin'?['ruin','house','shed']:[t0,'shed'];
      for(const t of order){
        const sz=OB[t].size||1;
        if(xx+sz>bx+6||yy+sz>by+6)continue;
        if(addOb(t,xx,yy))break;
      }
    }
  }
}
function genMine(r){
  const w=G.w,h=G.h,sc=Math.max(1,w/90),n=Math.round(w*h/850)+3,cav=[];
  const carve=(x,y)=>{if(x>=2&&y>=2&&x<w-2&&y<h-2&&G.tt[y*w+x]!==2)G.under[y*w+x]=CAVE;};
  const ns=lat(r);
  for(let k=0;k<n;k++){
    let cx=0,cy=0,ok=false;
    for(let t=0;t<40&&!ok;t++){cx=rint(r,12,w-13);cy=rint(r,12,h-13);ok=cav.every(c=>Math.hypot(c.x-cx,c.y-cy)>w/7);}
    if(!ok)continue;
    const R=Math.round(rint(r,5,9)*sc);cav.push({x:cx,y:cy,R});
    for(let dy=-R-2;dy<=R+2;dy++)for(let dx=-R-2;dx<=R+2;dx++){
      const d=Math.hypot(dx,dy),lim=R*(.72+.4*vn(ns,(cx+dx)*.3,(cy+dy)*.3));
      if(d<lim)carve(cx+dx,cy+dy);
    }
  }
  // 동굴 사이를 구불구불한 갱도로 연결 (가장 가까운 이웃 + 추가 연결)
  const link=(a,b)=>{
    let x=a.x,y=a.y,guard=0;const rail=r()<.75;
    while((Math.abs(x-b.x)>1||Math.abs(y-b.y)>1)&&guard++<600){
      const dx=b.x-x,dy=b.y-y;
      if(r()<.65){if(Math.abs(dx)>Math.abs(dy))x+=Math.sign(dx);else y+=Math.sign(dy);}
      else{if(r()<.5)x+=r()<.5?1:-1;else y+=r()<.5?1:-1;}
      carve(x,y);carve(x+1,y);carve(x,y+1);if(rail&&G.under[y*w+x]===CAVE)G.urail[y*w+x]=1;
    }
  };
  for(let i=1;i<cav.length;i++){
    let bj=0,bd=1e9;for(let j=0;j<i;j++){const d=Math.hypot(cav[i].x-cav[j].x,cav[i].y-cav[j].y);if(d<bd){bd=d;bj=j;}}
    link(cav[i],cav[bj]);
  }
  for(let k=0;k<Math.floor(cav.length/3);k++){const a=cav[rint(r,0,cav.length-1)],b=cav[rint(r,0,cav.length-1)];if(a!==b)link(a,b);}
  // 갱구(입구) + 채굴 시설
  const mouths=[];
  for(const c of cav){
    const m=1+(r()<.6?1:0);
    for(let k=0;k<m;k++){
      for(let t=0;t<60;t++){
        const x=c.x+rint(r,-c.R,c.R),y=c.y+rint(r,-c.R,c.R),i=y*w+x;
        if(!inb(x,y)||G.under[i]!==CAVE||G.tt[i]===2||G.mouth[i]||mouths.some(q=>Math.hypot(q[0]-x,q[1]-y)<4))continue;
        const o=G.obst[i];if(o)removeOb(o);
        G.trench[i]=0;G.mouth[i]=1;G.trans.push(i);mouths.push([x,y]);
        const ob=['shed','ruin','warehouse','shed','ruin'];
        for(let j=0;j<rint(r,2,4);j++){const t2=ob[rint(r,0,4)],sz=OB[t2].size||1,ax=x+rint(r,-5,5),ay=y+rint(r,-5,5);
          if(Math.hypot(ax-x,ay-y)>=2.2&&!G.mouth[ay*w+ax])addOb(t2,ax,ay);}
        for(let j=0;j<3;j++)addOb('crate',x+rint(r,-3,3),y+rint(r,-3,3));
        break;
      }
    }
  }
}
function specialHint(){
  const e=$('spHint');if(!e)return;
  const k=specialOf($('fSeed').value);
  e.textContent=k?`특수 시드 · ${SPECIAL[k].desc}`:'특수 시드: superflat · urbanwar · coast · mineshaft';
  e.classList.toggle('on',!!k);
}
