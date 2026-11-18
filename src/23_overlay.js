// ================= 오버레이 그리기 =================
function uiGround(x0,y0,x1,y1){
  if(G.phase==='setup'){
    cx.fillStyle='rgba(208,88,63,.22)';
    for(const f of G.flags){const m=G.cfg.minDist;for(let y=Math.max(y0,f.y-m+1);y<=Math.min(y1,f.y+m-1);y++)for(let x=Math.max(x0,f.x-m+1);x<=Math.min(x1,f.x+m-1);x++){tileDia(x,y,.05);cx.fill();}}
    if(hover&&inb(hover[0],hover[1])){
      const bad=flagCheck(hover[0],hover[1]);
      tileDia(hover[0],hover[1],0);cx.fillStyle=bad?'rgba(208,88,63,.55)':'rgba(125,255,125,.45)';cx.fill();
      for(const [a,b] of padCells({x:hover[0]-1,y:hover[1]-1})){if(!inb(a,b))continue;tileDia(a,b,.1);cx.fillStyle=bad?'rgba(208,88,63,.22)':'rgba(240,230,160,.28)';cx.fill();cx.strokeStyle=bad?'rgba(208,88,63,.8)':'rgba(240,230,160,.8)';cx.lineWidth=1.2;cx.stroke();}
    }
    return;
  }
  const single=tool!=='dig'&&tool!=='demo'&&tool!=='sandbag'&&tool!=='wire'&&(!(tool.startsWith('u:')||tool.startsWith('r:'))||tool==='u:shaft'||tool==='u:climb');
  if(drag&&drag.mode==='path'){
    const tiles=single?[drag.tiles[0]]:(drag.rect&&drag.moved&&drag.cur?rectTiles(drag.t0,drag.cur):drag.tiles);
    for(const [x,y] of tiles){
      if(!inb(x,y))continue;
      const kind=tool==='dig'?(viewLay?'tun':'dig'):tool==='demo'?'demo':tool.startsWith('u:')?'upg':tool.startsWith('r:')?'road':'build';
      const bad=kind==='demo'?(G.obst[y*G.w+x]?!!OB[G.obst[y*G.w+x].type].nodemo:G.trench[y*G.w+x]!==255&&!G.brush[y*G.w+x]):!!taskCheck(0,kind,x,y,(kind==='upg'||kind==='road')?tool.slice(2):tool);
      const cells=kind==='build'?footprint(tool,x,y):[[x,y]];
      for(const [a,b] of cells){if(!inb(a,b))continue;tileDia(a,b,.1);cx.fillStyle=bad?'rgba(208,88,63,.35)':'rgba(125,255,125,.4)';cx.fill();}
    }
  }else if(hover&&inb(hover[0],hover[1])&&G.phase==='play'){
    const [x,y]=hover;
    if(tool!=='dig'&&tool!=='demo'&&!tool.startsWith('u:')&&!tool.startsWith('r:')){
      const bad=taskCheck(0,'build',x,y,tool);
      for(const [a,b] of footprint(tool,x,y)){if(!inb(a,b))continue;tileDia(a,b,.08);cx.fillStyle=bad?'rgba(208,88,63,.35)':'rgba(125,255,125,.35)';cx.fill();}
    }else{tileDia(x,y,.1);cx.strokeStyle='rgba(255,255,255,.5)';cx.lineWidth=1.5;cx.stroke();}
  }
  // 선택된 유닛이 향하는 작업 강조
  for(const u of selUnits())if(u.task){tileDia(u.task.x,u.task.y,.05);cx.strokeStyle='#7dff7d';cx.lineWidth=1.2;cx.stroke();}
}
function uiTop(){
  if(drag&&drag.mode==='box'){
    cx.strokeStyle='#7dff7d';cx.fillStyle='rgba(125,255,125,.1)';cx.lineWidth=1;
    const x=Math.min(drag.sx,drag.x),y=Math.min(drag.sy,drag.y),w=Math.abs(drag.x-drag.sx),h=Math.abs(drag.y-drag.sy);
    cx.fillRect(x,y,w,h);cx.strokeRect(x,y,w,h);
  }
}
