// ================= 유틸 / 난수 =================
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const rint=(r,a,b)=>a+Math.floor(r()*(b-a+1));
function hashStr(s){let h=1779033703^s.length;for(let i=0;i<s.length;i++){h=Math.imul(h^s.charCodeAt(i),3432918353);h=h<<13|h>>>19;}
  return ()=>{h=Math.imul(h^h>>>16,2246822507);h=Math.imul(h^h>>>13,3266489909);return (h^=h>>>16)>>>0;};}
function mulberry(a){return ()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function lat(r){const a=new Float32Array(1024);for(let i=0;i<1024;i++)a[i]=r();return a;}
function vn(l,x,y){const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);
  const a=l[((yi&31)<<5)|(xi&31)],b=l[((yi&31)<<5)|((xi+1)&31)],c=l[(((yi+1)&31)<<5)|(xi&31)],d=l[(((yi+1)&31)<<5)|((xi+1)&31)];
  return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;}
const inb=(x,y)=>x>=0&&y>=0&&x<G.w&&y<G.h;
function fxPush(f){if(G.fx.length<400)G.fx.push(f);}

// ================= 툴팁 · 능력치 표시 (일괄) =================
// 목록(상점·건설·무기고·강화)에는 기본적으로 능력치 한 줄(statLine)만 보이고, 설명문은 마우스를 올리면 툴팁으로 뜬다.
// 새 항목 추가 방법: 해당 데이터(WEAP·EXP·OB·VEH·UPT …)에 수치와 desc 만 넣으면 된다.
//   · 새 종류가 필요하면 tipReg('종류', (id,n)=>({t:이름, col:색, stats:[[라벨,값],…], d:설명, ex:부가문구})) 로 한 번 등록
//   · 템플릿에서는 `${tipStats('종류:id')}` 로 능력치 줄, `${tipAttr('종류:id')}` 로 호버 속성을 붙인다.
const TIPREG={};
function tipReg(kind,fn){TIPREG[kind]=fn;}
function tipGet(key){const p=String(key).split(':'),f=TIPREG[p[0]];if(!f)return null;try{return f(p[1],p[2]);}catch(e){return null;}}
function statLine(stats){return (stats||[]).filter(s=>s&&s[1]!==undefined&&s[1]!==null&&s[1]!=='').map(s=>`${s[0]} ${s[1]}`).join(' · ');}
function tipStats(key){const d=tipGet(key);return d?statLine(d.stats):'';}
function statRows(key){const d=tipGet(key);return d?(d.stats||[]).filter(x=>x&&x[1]!==undefined&&x[1]!=='').map(x=>`${x[0]} ${x[1]}`).join('<br>'):'';}
function tipAttr(key){return `data-tip="${key}"`;}
(function(){
  const el=document.createElement('div');el.id='tip';el.hidden=true;document.body.appendChild(el);
  let cur=null;
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  function show(k,e){
    const d=tipGet(k);if(!d||(!d.d&&!(d.stats&&d.stats.length))){el.hidden=true;return;}
    if(cur!==k){cur=k;
      el.innerHTML=`<b${d.col?` style="color:${d.col}"`:''}>${esc(d.t||'')}</b>${d.stats&&d.stats.length?`<div class="ts">${d.stats.filter(x=>x&&x[1]!==undefined&&x[1]!=='').map(x=>`<div><span>${esc(x[0])}</span> ${esc(x[1])}</div>`).join('')}</div>`:''}${d.d?`<div class="td">${esc(d.d)}</div>`:''}${d.ex?`<div class="ts">${esc(d.ex)}</div>`:''}`;}
    el.hidden=false;
    const W=innerWidth,H=innerHeight,w=el.offsetWidth,h=el.offsetHeight;
    let x=e.clientX+14,y=e.clientY+16;if(x+w>W-6)x=Math.max(6,e.clientX-w-14);if(y+h>H-6)y=Math.max(6,e.clientY-h-12);
    el.style.left=x+'px';el.style.top=y+'px';
  }
  document.addEventListener('mousemove',e=>{
    const t=e.target&&e.target.closest?e.target.closest('[data-tip]'):null;
    if(!t){if(!el.hidden){el.hidden=true;cur=null;}return;}
    show(t.dataset.tip,e);
  },{passive:true});
  document.addEventListener('mouseleave',()=>{el.hidden=true;cur=null;});
  document.addEventListener('scroll',()=>{el.hidden=true;cur=null;},true);
})();
// 공통 종류: 건물(OB) · 차량(VEH)
const OBDESC={
  sandbag:'가벼운 엄폐물. 병사가 지나갈 수 있고 총탄을 일부 막아 줍니다. 강화하면 통행 불가 방벽이 됩니다.',
  wire:'넘어가는 모든 적에게 체력 피해를 줍니다. 방어선 앞에 깔아 두세요.',
  tower:'주둔 병사의 사거리와 성능을 높이는 감시 시설. 강화하면 엄폐·저격 진지가 됩니다.',
  mg:'HESCO 방벽 초소. 2명이 주둔해 속사하며 강화하면 위장·방호가 좋아집니다.',
  bunker:'튼튼한 콘크리트 거점. 4명이 주둔하고 주둔병의 무기 성능 평균이 전원에게 적용됩니다.',
  mortar:'병사 없이 근거리 목표를 자동 사격하는 감시포. 강화하면 소이포·SAM 터렛이 됩니다.',
  medbay:'부상병을 치료하는 구급함. 주둔할 수 없는 장애물이며 강화하면 동시에 치료하는 인원이 늘어납니다.',
  tank:'중장갑 전차. 승무원 3명이 필요하며 사거리가 길고 범위 피해를 줍니다.',
  truck:'병력과 보급품을 실어 나르는 수송트럭. 가까운 아군 참호에 탄약을 공급합니다.',
  heli:'병력을 태워 빠르게 이동시키는 수송 헬리콥터.'
};
// 건물·차량 공통 능력치 순서: 체력 | 주둔 | 피해(단일/광역) | 사거리 | 건설 | 재료
function dmgText(one,area){return [one?'단일 '+one:'',area?'광역 '+area:''].filter(Boolean).join(' / ')||'—';}
tipReg('ob',id=>{
  const d=OB[id],v=VEH[id],g=d.gun,c=Object.entries(d.cost||{}).map(([k,n])=>`${RN[k]} ${n}`).join(' · ');
  const one=v?v.damage:g?g.dmg:0,area=v?(v.blast?v.damage:0):d.shell||0,rng=v?v.range:g?g.range:d.range;
  return {t:d.n,stats:[['체력',v?v.hp:d.hp],['주둔',v?(v.seats?v.seats+'명 탑승':'—'):d.slots?d.slots+'명':'—'],['피해',dmgText(one,area)],['사거리',rng||'—'],['건설',d.build+'초'],['재료',c]],d:OBDESC[id]||d.desc};
});
