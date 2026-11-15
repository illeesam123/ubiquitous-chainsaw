// ================= 바이옴 (시드별 지형) =================
const BIOME={
  plain:{n:'평원',mm:'#2e3a1e',speed:1,dig:1,tree:1,rock:1},
  swamp:{n:'습지',mm:'#2b3a27',speed:1,dig:.8,tree:1.3,rock:.35},
  snow:{n:'설원',mm:'#aeb9c2',speed:.92,dig:.75,tree:.9,rock:1.3},
  arid:{n:'황무지',mm:'#6f6040',speed:.95,dig:1.1,tree:.22,rock:2.1}
};
const BIOME_KEYS=['plain','swamp','snow','arid'];
const TREEPAL={
  plain:{pine:['#244a2a','#2a5530','#30603a','#37693f'],leaf:['#2a4d27','#35602e','#3f7234','#4b8139'],cap:.07},
  swamp:{pine:['#1f3d2a','#244a30','#2a5436','#305f3b'],leaf:['#34482a','#3f5a30','#4b6a38','#587a40'],cap:.07},
  snow:{pine:['#2f5a48','#3a6a55','#4a7c66','#5c8f78'],leaf:['#74827c','#8a9993','#a1b0aa','#b9c6c1'],cap:.8},
  arid:{pine:['#5a5a30','#666636','#73743c','#818244'],leaf:['#7a6a38','#8a7840','#9c8948','#b09c52'],cap:.07}
};
// kind: 0 일반 · 1 진흙/언땅 · 2 얕은 물 · 4 얼음
function tileColor(b,kind,g){
  if(kind===2)return `hsl(${(192+g*10)|0} ${(30+g*8)|0}% ${(27+g*8)|0}%)`;
  if(kind===4)return `hsl(${(196+g*8)|0} ${(42+g*10)|0}% ${(74+g*8)|0}%)`;
  if(b==='swamp')return kind?`hsl(${(58+g*6)|0} 22% ${(19+g*6)|0}%)`:`hsl(${(86+g*12)|0} ${(24+g*6)|0}% ${(25+g*8)|0}%)`;
  if(b==='snow')return kind?`hsl(${(28+g*8)|0} 12% ${(36+g*6)|0}%)`:`hsl(${(208+g*8)|0} ${(18+g*10)|0}% ${(84+g*8)|0}%)`;
  if(b==='arid')return kind?`hsl(${(24+g*6)|0} 30% ${(32+g*6)|0}%)`:`hsl(${(38+g*8)|0} ${(36+g*8)|0}% ${(52+g*9)|0}%)`;
  return kind?`hsl(${(30+g*6)|0} 26% ${(26+g*7)|0}%)`:`hsl(${(74+g*10)|0} 27% ${(31+g*9)|0}%)`;
}
function terrainSpeed(x,y){
  const i=Math.floor(y)*G.w+Math.floor(x);
  if(G.trench[i]===255)return .55;
  if(G.up[i]===1)return 1;
  if(G.trench[i]>0)return 1.1;
  if(G.brush[i])return BIOME[G.biome].speed*.62;
  const k=G.tt[i];
  return BIOME[G.biome].speed*(k===2?.5:k===1?.88:k===4?1.08:1);
}
function pickWeather(prev){
  const b=G.biome;
  let o=b==='swamp'?['clear','rain','fog','fog','rain']:b==='snow'?['clear','snow','snow','fog']:b==='arid'?['clear','clear','clear','fog']:['clear','rain','snow','fog'];
  const f=o.filter(x=>x!==prev);return f[Math.floor(Math.random()*f.length)];
}
function drawWaterTile(x,y,i){
  const z=cam.z,[sx,sy]=toS(x+.5,y+.5),t=(typeof WFX!=='undefined'?WFX.t:0)||0,k=hsh(x,y);
  if(G.tt[i]===2){
    cx.globalAlpha=.14+.08*Math.sin(t*1.3+k*6);cx.fillStyle='#c4e8f2';tileDia(x,y,.2);cx.fill();cx.globalAlpha=1;
    for(let r=0;r<2;r++){
      const ph=(t*.33+k+r*.5)%1;
      cx.strokeStyle=`rgba(215,238,245,${((1-ph)*.5).toFixed(3)})`;cx.lineWidth=Math.max(.6,1*z);cx.beginPath();
      cx.ellipse(sx+(hsh(x+r,y)-.5)*18*z,sy+(hsh(x,y+r)-.5)*8*z,(3+ph*13)*z,(1.5+ph*6.5)*z,0,0,6.3);cx.stroke();
    }
  }else{
    cx.strokeStyle='rgba(255,255,255,.55)';cx.lineWidth=Math.max(.7,1.3*z);cx.beginPath();
    const a=(k-.5)*14*z;cx.moveTo(sx-10*z+a,sy-2*z);cx.lineTo(sx-3*z+a,sy-5*z);cx.moveTo(sx+4*z-a,sy+3*z);cx.lineTo(sx+11*z-a,sy);cx.stroke();
    cx.strokeStyle='rgba(60,100,125,.4)';cx.lineWidth=Math.max(.5,.9*z);cx.beginPath();
    cx.moveTo(sx-12*z,sy+2*z);cx.lineTo(sx-4*z+k*6*z,sy-z);cx.lineTo(sx+3*z,sy+4*z);cx.lineTo(sx+12*z,sy+z);cx.stroke();
  }
}
function drawReeds(x,y){
  const z=cam.z,[sx,sy]=toS(x+.5,y+.5);
  for(let k=0;k<4;k++){
    const bx=sx+(hsh(x,k)-.5)*30*z,by=sy+(hsh(y,k+3)-.5)*12*z,hgt=(9+hsh(x+k,y)*6)*z,lean=(k-1.5)*1.3*z;
    cx.strokeStyle=k%2?'#4a6a30':'#3a5626';cx.lineWidth=Math.max(.8,1.5*z);cx.beginPath();cx.moveTo(bx,by);cx.lineTo(bx+lean,by-hgt);cx.stroke();
    if(k%2===0){cx.fillStyle='#6a4a2a';cx.beginPath();cx.ellipse(bx+lean,by-hgt-1.5*z,1.3*z,2.6*z,0,0,6.3);cx.fill();}
  }
}
