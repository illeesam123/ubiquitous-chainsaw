// ================= AI 파츠 시스템 — AI 의 모든 행동을 이 파일 하나에서 조립한다 =================
// AI 는 '파츠' 여러 개를 매 틱 순서대로 실행하는 구조다. 파츠를 켜고 끄거나 새로 붙이는 것은 이 파일만 고치면 된다.
//
//  새 파츠 추가(3단계)
//   1) 어디든(보통 새 src/7x_*.js) 파츠 함수를 만든다:  function aiPartMine(T,dt){ ... }      // T: 팀, dt: 경과 초
//   2) 이 파일 아래 '파츠 카탈로그'에서 등록:             aiPart('myPart',{name:'이름',desc:'설명',run:aiPartMine,every:2});
//   3) 같은 파일 'AILOAD' 의 원하는 모드 배열에 id 를 추가(성향별로만 쓰려면 AIPERSONA 에).
//  끄기: AIOFF.add('sniper')  (콘솔에서도 가능) · 한 팀만 다르게: T.ai.parts=['core','economy']  · 현황: aiPartsInfo()
//
//  등록 옵션: run(T,dt) 필수 · every(초, 생략하면 매 틱 — 내부에서 자체 타이머를 쓰는 기존 파츠는 생략) ·
//             gate:true 이면 run 이 true 를 돌려줄 때 뒤쪽의 blockable 파츠를 이번 틱에 건너뛰게 한다 · blockable:true 면 앞의 gate 에 막힌다.
const AIPARTS={};
function aiPart(id,def){AIPARTS[id]=Object.assign({id,name:id,desc:'',every:0,gate:false,blockable:false},def);}
const AIOFF=new Set();

// ---------- 파츠 카탈로그 ----------
aiPart('purge',   {name:'자경단 소탕 개시',desc:'자경단을 소탕하는 작전 중이면 기본 본체를 멈춘다(통솔 병력 전체 동원 → 복귀).',run:aiPartPurge,gate:true});
aiPart('core',    {name:'기본 본체',desc:'구매 · 본진 방어 · 원정 · 기지 확장 · 건설 · 강화 · 채굴/수입 등 기존 AI 의 핵심.',run:aiCoreTick,blockable:true});
aiPart('smart',   {name:'고도화',desc:'위협 지도 · 저격수/기관총 역할 배치 · 수송(트럭/헬기) · 결과 학습.',run:aiPartSmart});
aiPart('economy', {name:'경제',desc:'채굴조 상시 운영 · 잉여 자원 환전 · 달러로 대량 증원.',run:aiPartEconomy});
aiPart('sniper',  {name:'저격수 운용',desc:'덤불 매복 · 사거리 끝 사격 · 쏘고 이동 · 접근 시 후퇴.',run:aiPartSniper});
aiPart('rcEconomy',{name:'탈환전 경제',desc:'탈환전용: 구매·시설·채굴·수입·강화만 하고 확장·원정은 하지 않는다.',run:aiPartRcEconomy});
aiPart('surface', {name:'지상 복귀',desc:'지하 작업이 끝난 병사를 지상으로 올려보낸다.',run:aiPartSurface});
aiPart('rcPurge', {name:'소탕 작전',desc:'탈환전용: 병력을 집결시켜 자경단 무리를 한꺼번에 돌입해 소탕한다.',run:aiPartRcPurge});

// ---------- 모드별 기본 구성(위에서 아래로 실행) ----------
const AILOAD={
  normal:['purge','core','smart','economy','sniper'],
  reclaim:['rcEconomy','surface','rcPurge','economy','sniper'],
  defense:[]                                   // 수비전: AI 는 웨이브 스크립트가 움직이므로 파츠 없음
};
// ---------- 성향별 추가 파츠(없으면 빈 배열) ----------
const AIPERSONA={aggressive:[],defensive:[],tricky:[],balanced:[]};

function aiPartIds(T){
  const A=T.ai;if(A&&A.parts)return A.parts;
  const mode=(G.cfg&&G.cfg.mode)||'normal';
  return (AILOAD[mode]||AILOAD.normal).concat(AIPERSONA[(A&&A.persona)||'balanced']||[],(A&&A.extraParts)||[]);
}
function aiTick(T,dt){
  if(!T.ai)return;
  const A=T.ai,tm=A.pt||(A.pt={});let blocked=false;
  for(const id of aiPartIds(T)){
    const p=AIPARTS[id];if(!p||AIOFF.has(id))continue;
    if(p.blockable&&blocked)continue;
    if(p.every){tm[id]=(tm[id]||0)-dt;if(tm[id]>0)continue;tm[id]=p.every*(.9+Math.random()*.2);}
    let r;try{r=p.run(T,p.every?Math.max(dt,p.every):dt);}catch(e){console.error('[AI파츠:'+id+']',e);}
    if(p.gate&&r)blocked=true;
  }
}
function aiPartsInfo(){return Object.values(AIPARTS).map(p=>({id:p.id,이름:p.name,설명:p.desc,모드:Object.keys(AILOAD).filter(m=>AILOAD[m].includes(p.id)).join('/'),꺼짐:AIOFF.has(p.id)}));}
