// ================= 맵 로딩창: 시작할 때 청크·스프라이트·아틀라스를 전부 미리 만든다 =================
// 1) 맵 전체를 화면 크기 단위로 훑으며 한 번 그려 에셋을 불러오게 하고  2) 모두 읽힐 때까지 기다린 뒤  3) 다시 훑어 청크 캐시·아틀라스·가림 타일을 완성한다.
// 로딩 중에는 시뮬레이션과 일반 렌더가 멈춘다(frame 이 LOAD.on 을 본다).
const LOAD={on:false};
const _ldStart=startGame;
startGame=function(cfg){
  VROT=0;chunkMap.clear();
  LOAD.on=true;const el=document.getElementById('loading');if(el)el.hidden=false;
  try{_ldStart(cfg);}catch(e){LOAD.on=false;if(el)el.hidden=true;throw e;}
  ldRun(el).catch(e=>console.error('로딩 오류:',e)).finally(()=>{LOAD.on=false;if(el)el.hidden=true;});
};
const ldRaf=()=>new Promise(r=>requestAnimationFrame(()=>r()));
async function ldRun(el){
  const bar=document.getElementById('loadBar'),msg=document.getElementById('loadMsg');
  const set=(p,t)=>{if(bar)bar.style.width=Math.round(p*100)+'%';if(msg)msg.textContent=t;};
  set(0,'전장 준비 중…');await ldRaf();
  const t0=performance.now();
  while(!GL.ready&&!GL.fail&&performance.now()-t0<4000)await ldRaf();
  const sv={x:cam.x,y:cam.y,z:cam.z};
  const z=1,w=G.w,h=G.h,pad=G.hill?120:40;
  const X0=-(h*32+40)*z,X1=(w*32+40)*z,Y0=-pad*z,Y1=((w+h)*16+60)*z;
  const sx=Math.max(200,W*.8),sy=Math.max(160,H*.8),steps=[];
  for(let y=Y0;y<Y1;y+=sy)for(let x=X0;x<X1;x+=sx)steps.push([x,y]);
  const sweep=async(from,span,label)=>{
    for(let i=0;i<steps.length;i++){
      cam.z=z;cam.x=-steps[i][0];cam.y=-steps[i][1];render();
      set(from+span*(i+1)/steps.length,`${label} ${i+1}/${steps.length}`);
      if(i%2)await ldRaf();
    }
  };
  await sweep(0,.35,'에셋 읽는 중');
  // 에셋(SVG)이 전부 읽힐 때까지 기다린다
  const t1=performance.now();
  for(;;){
    const left=[...SPR.map.values()].filter(e=>!e.ready&&!e.fail).length;
    if(!left||performance.now()-t1>8000)break;
    set(.35,`에셋 대기 중 (${left}개 남음)`);await ldRaf();
  }
  await sweep(.4,.55,'청크·스프라이트 생성');
  if(G.hill){   // 언덕 가림용 타일 비트맵도 미리 만든다
    cam.z=z;const hs=[];for(let j=0;j<G.N;j++)if(G.hl[j])hs.push(j);
    for(let i=0;i<hs.length;i+=40){for(let k=i;k<Math.min(hs.length,i+40);k++)tileBmp(hs[k],1);set(.95+.04*i/hs.length,'언덕 타일 준비 중');await ldRaf();}
  }
  set(.99,'마무리…');
  cam.x=sv.x;cam.y=sv.y;cam.z=sv.z;clampCamera();render();await ldRaf();set(1,'완료');
}

// ---- 화면 회전 (90° 단위) ----
function setRot(r){
  r=((r%4)+4)%4;if(!G||r===VROT||LOAD.on)return;
  const c=toW(W/2,H/2);                          // 화면 가운데에 있던 월드 지점을 회전 후에도 가운데에 둔다
  VROT=r;chunkMap.clear();TBM.clear();
  if(G.hill)computeShade();                      // 해가 화면 왼쪽 위에서 비추도록 그림자를 다시 계산
  centerCam(c[0],c[1]);
  if(typeof toast==='function')toast('화면 방향 '+(r*90)+'°');
}
{const l=document.getElementById('bRotL'),r=document.getElementById('bRotR');if(l)l.onclick=()=>setRot(VROT-1);if(r)r.onclick=()=>setRot(VROT+1);}
