// ================= 깃발 / 시작 =================
function flagCheck(tx,ty){
  if(tx<2||ty<2||tx>=G.w-2||ty>=G.h-2)return '맵 가장자리에는 꽂을 수 없습니다';
  if(G.obst[ty*G.w+tx])return '장애물 위에는 꽂을 수 없습니다';
  if(G.tt[ty*G.w+tx]===2)return '물 위에는 꽂을 수 없습니다';
  if(G.mouth[ty*G.w+tx])return '동굴 입구 위에는 꽂을 수 없습니다';
  for(const f of G.flags)if(Math.max(Math.abs(f.x-tx),Math.abs(f.y-ty))<G.cfg.minDist)return `다른 깃발과 ${G.cfg.minDist}칸 이상 떨어져야 합니다`;
  return null;
}
function mkUnit(team,x,y){
  const u={id:G.nextId++,team,x,y,hp:150,max:150,state:'idle',path:[],queue:[],task:null,gar:null,garTarget:null,dest:null,
    cd:Math.random()*.6,face:Math.random()*6.28,anim:Math.random()*6,wait:0,flash:0,sel:false,sx:x,sy:y};
  G.units.push(u);G.uid.set(u.id,u);return u;
}
function placeFlag(team,tx,ty){
  const T=G.teams[team],w=G.w;
  G.flags.push({team,x:tx,y:ty});T.flag={x:tx,y:ty};
  for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){const o=G.obst[(ty+dy)*w+tx+dx];if(o)removeOb(o);G.brush[(ty+dy)*w+tx+dx]=0;}
  for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){const j=(ty+dy)*w+tx+dx;if(G.tt[j]===2||G.tt[j]===4){G.tt[j]=0;G.mm[j]=0;{const gg=((tx+dx)*7+(ty+dy)*13)%10/10;G.ground[j]=tileColor(G.biome,0,gg);G.gq[j]=Math.min(3,(gg*4)|0);}}if(G.dec[j]===3)G.dec[j]=0;}
  T.pad={x:tx-1,y:ty-1};
  for(const [px,py] of padCells(T.pad)){const j=py*w+px;G.trench[j]=0;G.trenchHP[j]=0;}
  const ti=ty*w+tx+2;G.trench[ti]=team+1;G.trenchHP[ti]=220;T.trench.push(ti);
  const cand=[];
  for(let dy=-6;dy<=6;dy++)for(let dx=-6;dx<=6;dx++){const x=tx+dx,y=ty+dy;if(!inb(x,y)||G.obst[y*w+x]||padAt(x,y)>=0||G.trench[y*w+x]===255||G.tt[y*w+x]===2)continue;cand.push([x,y,Math.hypot(dx,dy)+Math.random()*1.2]);}
  cand.sort((a,b)=>a[2]-b[2]);
  for(let k=0;k<G.cfg.soldiers;k++){const c=cand[k%cand.length];mkUnit(team,c[0]+.25+Math.random()*.5,c[1]+.25+Math.random()*.5);}
}
function aiPlaceFlags(){
  for(let t=1;t<G.teams.length;t++){
    const pref=Math.max(G.cfg.minDist,Math.round(G.w*.5));let best=null,bs=-1;
    for(let k=0;k<600;k++){
      const x=rint(Math.random,2,G.w-3),y=rint(Math.random,2,G.h-3);
      if(flagCheck(x,y))continue;
      let md=1e9;for(const f of G.flags)md=Math.min(md,Math.max(Math.abs(f.x-x),Math.abs(f.y-y)));
      if(md>bs){bs=md;best=[x,y];}
      if(md>=pref)break;
    }
    if(!best){for(let y=2;y<G.h-2&&!best;y++)for(let x=2;x<G.w-2;x++)if(!flagCheck(x,y)){best=[x,y];break;}}
    if(best)placeFlag(t,best[0],best[1]);
  }
}
function beginCountdown(){G.phase='countdown';G.countdown=2.5;}
