// ================= 3D 보조: 회전 프레임 + 돌출 입체 =================
const PXT=46; // 높이(px) ↔ 타일 환산 (원통 단면이 둥글게 보이도록)
function shadeCol(hex,f){
  const n=parseInt(hex.slice(1),16);
  const r=Math.max(0,Math.min(255,Math.round(((n>>16)&255)*f))),g=Math.max(0,Math.min(255,Math.round(((n>>8)&255)*f))),b=Math.max(0,Math.min(255,Math.round((n&255)*f)));
  return `rgb(${r},${g},${b})`;
}
function litShade(hex,n){
  const l=Math.hypot(n[0],n[1],n[2])||1,d=(-.30*n[0]+.50*n[1]+.80*n[2])/l;
  return shadeCol(hex,.58+.52*Math.max(0,d));
}
function visN(n){return (n[0]+n[1])*.612+n[2]*.5>.0001;}
function mkFrame(x,y,ang){
  const c=Math.cos(ang),s=Math.sin(ang);
  return {x,y,c,s,P:(lx,ly,h)=>pt(x+c*lx-s*ly,y+s*lx+c*ly,h),N:(nx,ny,nz)=>[c*nx-s*ny,s*nx+c*ny,nz]};
}
function extrude(F,pl,h0,h1,col,opts){
  opts=opts||{};
  const n=pl.length;let area=0;
  for(let i=0;i<n;i++){const a=pl[i],b=pl[(i+1)%n];area+=a[0]*b[1]-b[0]*a[1];}
  const sg=area>0?1:-1,faces=[];
  for(let i=0;i<n;i++){
    const a=pl[i],b=pl[(i+1)%n],dx=b[0]-a[0],dy=b[1]-a[1];
    const nw=F.N(sg>0?dy:-dy,sg>0?-dx:dx,0);
    if(!visN(nw))continue;
    const mx_=F.x+F.c*(a[0]+b[0])/2-F.s*(a[1]+b[1])/2,my_=F.y+F.s*(a[0]+b[0])/2+F.c*(a[1]+b[1])/2;
    faces.push({a,b,nw,d:mx_+my_});
  }
  faces.sort((p,q)=>p.d-q.d);
  for(const f of faces)poly([F.P(f.a[0],f.a[1],h0),F.P(f.b[0],f.b[1],h0),F.P(f.b[0],f.b[1],h1),F.P(f.a[0],f.a[1],h1)],litShade(col,f.nw),opts.edge,.7);
  poly(pl.map(p=>F.P(p[0],p[1],h1)),opts.top?opts.top:litShade(col,[0,0,1]),opts.edge,.7);
}
function cyl(F,p0,p1,rpx,axis,col,capCol,seg){
  seg=seg||14;const rt=rpx/PXT,A=[],B=[];
  for(let i=0;i<seg;i++){
    const a=i/seg*6.2832,ca=Math.cos(a),sa=Math.sin(a);
    const mk=(p)=>axis==='x'?F.P(p[0],p[1]+rt*ca,p[2]+rpx*sa):F.P(p[0]+rt*ca,p[1],p[2]+rpx*sa);
    A.push(mk(p0));B.push(mk(p1));
  }
  for(let i=0;i<seg;i++){
    const a=(i+.5)/seg*6.2832,ca=Math.cos(a),sa=Math.sin(a);
    const nw=F.N(axis==='x'?0:ca,axis==='x'?ca:0,sa);
    if(!visN(nw))continue;
    const j=(i+1)%seg;poly([A[i],A[j],B[j],B[i]],litShade(col,nw));
  }
  for(const [pts,sgn] of [[A,-1],[B,1]]){
    const nw=F.N(axis==='x'?sgn:0,axis==='y'?sgn:0,0);
    if(visN(nw))poly(pts,litShade(capCol||col,nw));
  }
}
function disc(F,axis,lx,ly,h,rpx,col,seg){
  seg=seg||14;const rt=rpx/PXT,pts=[];
  for(let i=0;i<seg;i++){
    const a=i/seg*6.2832,ca=Math.cos(a),sa=Math.sin(a);
    pts.push(axis==='y'?F.P(lx+rt*ca,ly,h+rpx*sa):axis==='x'?F.P(lx,ly+rt*ca,h+rpx*sa):F.P(lx+rt*ca,ly+rt*sa,h));
  }
  poly(pts,col);
}
function facePoly(F,pts,col,stroke){poly(pts.map(p=>F.P(p[0],p[1],p[2])),col,stroke,.8);}
