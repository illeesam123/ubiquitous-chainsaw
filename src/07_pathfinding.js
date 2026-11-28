// ================= 길찾기 (A*) =================
let pfN=0,pfG,pfP,pfS,pfC,pfStamp=0;
let MILD=null,MILD_ON=false;   // 자경단·인지 위협 격자. AI 의 이동 명령에서만 적용된다 (src/64_ai-advanced.js)
function findPath(sx,sy,gx,gy,adj,size,vehicle){
  const w=G.w,N=G.N,gs=size||1;
  if(pfN!==N){pfN=N;pfG=new Float32Array(N);pfP=new Int32Array(N);pfS=new Uint32Array(N);pfC=new Uint32Array(N);}
  pfStamp++;
  const st=sy*w+sx,gi=gy*w+gx;
  const isGoal=adj?(i)=>{
    const x=i%w,y=(i/w)|0;
    const ddx=Math.max(gx-x,0,x-(gx+gs-1)),ddy=Math.max(gy-y,0,y-(gy+gs-1));
    return Math.max(ddx,ddy)===1;
  }:(i)=>i===gi;
  if(isGoal(st))return [];
  const hf=[],hi=[];
  const push=(f,i)=>{let k=hf.length;hf.push(f);hi.push(i);while(k>0){const p=(k-1)>>1;if(hf[p]<=hf[k])break;[hf[p],hf[k]]=[hf[k],hf[p]];[hi[p],hi[k]]=[hi[k],hi[p]];k=p;}};
  const pop=()=>{const r=hi[0],lf=hf.pop(),li=hi.pop();if(hf.length){hf[0]=lf;hi[0]=li;let k=0;for(;;){let l=k*2+1,rr=l+1,m=k;if(l<hf.length&&hf[l]<hf[m])m=l;if(rr<hf.length&&hf[rr]<hf[m])m=rr;if(m===k)break;[hf[m],hf[k]]=[hf[k],hf[m]];[hi[m],hi[k]]=[hi[k],hi[m]];k=m;}}return r;};
  const hh=(x,y)=>{const dx=Math.abs(x-gx),dy=Math.abs(y-gy);return Math.max(0,(dx+dy)-.586*Math.min(dx,dy)-(adj?gs:0));};
  // Build a per-search spatial index so each expanded A* node checks nearby vehicles only.
  const vehicleGrid=new Map();
  for(const v of G.vehicles){if(v.dead||v.alt>.02)continue;const x=Math.floor(v.x),y=Math.floor(v.y),i=y*w+x;let a=vehicleGrid.get(i);if(!a)vehicleGrid.set(i,a=[]);a.push(v);}
  const nearVehicle=(i,except,r)=>{const x=i%w,y=(i/w)|0,r2=r*r;for(let yy=Math.max(0,y-1);yy<=Math.min(G.h-1,y+1);yy++)for(let xx=Math.max(0,x-1);xx<=Math.min(w-1,x+1);xx++){const a=vehicleGrid.get(yy*w+xx);if(a)for(const v of a)if(v!==except&&(v.x-(x+.5))**2+(v.y-(y+.5))**2<r2)return true;}return false;};
  const pass=(i)=>{if(pfLay===1)return G.under[i]!==0&&G.open[pfTeam][i]===1;const o=G.obst[i];if(vehicle){if(G.trench[i]>0&&G.up[i]!==1)return false;if(G.tt[i]===2&&G.up[i]!==1)return false;if(o&&o.type!=='crate'&&!OB[o.type].mine)return false;return !nearVehicle(i,vehicle,.85);}return !nearVehicle(i,null,.9)&&(!o||!(OB[o.type].block||o.blk));};
  pfG[st]=0;pfS[st]=pfStamp;pfP[st]=-1;push(hh(sx,sy),st);
  const D8=[[1,0,1],[-1,0,1],[0,1,1],[0,-1,1],[1,1,1.414],[1,-1,1.414],[-1,1,1.414],[-1,-1,1.414]];
  let goal=-1,guard=0;
  while(hf.length&&guard++<N*3){
    const c=pop();if(pfC[c]===pfStamp)continue;pfC[c]=pfStamp;
    if(isGoal(c)){goal=c;break;}
    const cx=c%w,cy=(c/w)|0;
    for(const [dx,dy,cs] of D8){
      const nx=cx+dx,ny=cy+dy;if(nx<0||ny<0||nx>=w||ny>=G.h)continue;
      const n=ny*w+nx;
      if(!(pass(n)||(!adj&&n===gi)))continue;
      if(dx&&dy&&(!pass(cy*w+nx)||!pass(ny*w+cx)||(G.hill&&(!stepH(c,cy*w+nx)||!stepH(c,ny*w+cx)))))continue;
      if(!pfLay){if(!stepOK(c,n))continue;if(dx&&dy&&(roofedI(c)||roofedI(n)))continue;}
      const tr=pfLay?1:(G.trench[n]===255?3:G.trench[n]>0?.8:1)*(G.tt[n]===2&&G.up[n]!==1?2.4:G.tt[n]===1?1.15:1)*(vehicle?roadCost(n):(G.brush[n]?1.4:1))*(MILD_ON&&MILD?MILD[n]||1:1),ng=pfG[c]+cs*tr+(G.cl&&G.cl.size&&ladderLink(c,n)?4:0);
      if(pfS[n]!==pfStamp||ng<pfG[n]){pfS[n]=pfStamp;pfG[n]=ng;pfP[n]=c;push(ng+hh(nx,ny),n);}
    }
  }
  if(goal<0)return null;
  const path=[];for(let c=goal;c!==st&&c>=0;c=pfP[c])path.push(c);
  return path.reverse();
}
