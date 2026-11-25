// ================= 미니맵 (지형 캐시) =================
let mmLayer=null,mmStamp=-9;
function drawMini(){
  const s=mmScale(),ox=(mini.width-G.w*s)/2;
  if(!mmLayer||mmLayer.width!==G.w||mmLayer.height!==G.h||mmLayer.__g!==G){mmLayer=document.createElement('canvas');mmLayer.width=G.w;mmLayer.height=G.h;mmLayer.__g=G;mmStamp=-9;}
  const now=performance.now();
  if(now-mmStamp>450){
    mmStamp=now;const m=mmLayer.getContext('2d');
    m.fillStyle=BIOME[G.biome].mm;m.fillRect(0,0,G.w,G.h);
    for(let y=0;y<G.h;y++)for(let x=0;x<G.w;x++){
      const i=y*G.w+x;let c=null;
      {const k=G.tt[i];if(k===1)c=G.biome==='snow'?'#6f6458':G.biome==='arid'?'#7c6a44':'#4a3a26';else if(k===2)c='#3f6c7c';else if(k===4)c='#b9d6df';}
      const o=G.obst[i];
      if(o)c=o.type==='tree'?'#1f3d1c':o.type==='rock'?'#77766f':o.natural?'#8b5a3c':o.type==='mortar'?'#d7c07a':TEAM_COL[o.team];
      if(G.trench[i]&&G.trench[i]!==255)c=TEAM_COL[G.trench[i]-1];
      if(c){m.fillStyle=c;m.fillRect(x,y,1,1);}
      if(G.hill&&G.lv[i]!==GROUND_LV){const d=(G.lv[i]-GROUND_LV)/2;m.fillStyle=d>0?`rgba(255,236,190,${(.1*d).toFixed(2)})`:`rgba(0,0,0,${(-.1*d).toFixed(2)})`;m.fillRect(x,y,1,1);}
    }
    for(const T of G.teams){if(!T.pad)continue;m.fillStyle='#d8d6c4';for(const [x,y] of padCells(T.pad))m.fillRect(x,y,1,1);m.fillStyle=TEAM_COL[T.id];m.fillRect(T.pad.x+1,T.pad.y+1,1,1);}
  }
  mx.clearRect(0,0,mini.width,mini.height);
  mx.imageSmoothingEnabled=false;mx.drawImage(mmLayer,ox,0,G.w*s,G.h*s);
  for(const f of G.flags){mx.fillStyle='#fff';mx.fillRect(ox+f.x*s-1,f.y*s-1,4,4);}
  for(const v of G.vehicles){mx.fillStyle=v.type==='tank'?'#d8d2a0':'#b7a16d';mx.fillRect(ox+v.x*s-2,v.y*s-2,4,4);}
  for(const u of G.units){if(u.team!==0&&(hiddenUnit(u)||(u.lay&&!isAllyT(u.team,0))))continue;mx.fillStyle=TEAM_COL[u.team];mx.fillRect(ox+u.x*s-1,u.y*s-1,2.5,2.5);}
  for(const T of G.teams){const ps=T.heli&&heliPose(T);if(ps){mx.fillStyle='#fff';mx.fillRect(ox+ps.x*s-2,ps.y*s-2,4,4);mx.fillStyle=TEAM_COL[T.id];mx.fillRect(ox+ps.x*s-1,ps.y*s-1,2,2);}}
  const cs=[[0,0],[W,0],[W,H],[0,H]].map(p=>toW(p[0],p[1]));
  mx.strokeStyle='#fff';mx.lineWidth=1;mx.beginPath();cs.forEach((c,i)=>{const px=ox+c[0]*s,py=c[1]*s;i?mx.lineTo(px,py):mx.moveTo(px,py);});mx.closePath();mx.stroke();
}
