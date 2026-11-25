// 손으로 그린 보조 SVG 에셋 정의. `node tools/add-svg.js` 가 assets/sprites/ 에 파일을 쓰고 manifest.js · catalog.json 에 더한다.
// (기존 파일은 지우지 않는다 — `npm run sprites` 와 달리 비파괴적.) 좌표는 기준점(발 밑 중앙)이 (0,0) 인 viewBox.
const wrap=(vb,body)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${vb[2]}" height="${vb[3]}" viewBox="${vb.join(' ')}"><rect id="bounds" x="${vb[0]}" y="${vb[1]}" width="${vb[2]}" height="${vb[3]}" fill="#000" fill-opacity="0"/>${body}</svg>`;
const D=[];
// ---- 방호구: 몸통(어깨~허리, 기준 y -16 … -6) · 머리(헬멧, 기준 y -25 … -16) ----
const AB=[-8,-17,16,12],AH=[-6,-26,12,10];
const arm={
 wood:{name:'나무판자',
  body:`<path d="M-4.6 -15.6L4.6 -15.6L5.6 -13L5.2 -6.4L-5.2 -6.4L-5.6 -13Z" fill="#a98450" stroke="#5f4524" stroke-width=".7" stroke-linejoin="round"/><path d="M-5.4 -12.6H5.4M-5.2 -9.6H5.2" stroke="#5f4524" stroke-width=".7"/><path d="M-3.6 -15.2V-6.6M0 -15.4V-6.4M3.6 -15.2V-6.6" stroke="#c9a468" stroke-width=".5" opacity=".8"/><circle cx="-3.6" cy="-13.9" r=".5" fill="#3b2a14"/><circle cx="3.6" cy="-13.9" r=".5" fill="#3b2a14"/>`,
  head:`<path d="M-3.9 -19.2A3.9 4.2 0 0 1 3.9 -19.2L3.9 -17.8L-3.9 -17.8Z" fill="#a98450" stroke="#5f4524" stroke-width=".7" stroke-linejoin="round"/><path d="M-3.8 -20.8H3.8M-3.9 -19.1H3.9" stroke="#5f4524" stroke-width=".6"/><path d="M-1.4 -23.1V-17.9M1.4 -23.1V-17.9" stroke="#c9a468" stroke-width=".5" opacity=".8"/>`},
 plate:{name:'장갑판',
  body:`<path d="M-4.9 -15.8L4.9 -15.8L5.8 -12.4L5 -6.2L-5 -6.2L-5.8 -12.4Z" fill="#9aa6b2" stroke="#4c5560" stroke-width=".7" stroke-linejoin="round"/><path d="M-4.4 -15L4.4 -15L5 -12.6L-5 -12.6Z" fill="#c4cdd6" opacity=".75"/><path d="M0 -15.6V-6.4" stroke="#4c5560" stroke-width=".6"/><circle cx="-3.4" cy="-13.4" r=".55" fill="#4c5560"/><circle cx="3.4" cy="-13.4" r=".55" fill="#4c5560"/><circle cx="-3.4" cy="-8" r=".55" fill="#4c5560"/><circle cx="3.4" cy="-8" r=".55" fill="#4c5560"/>`,
  head:`<path d="M-4.1 -19A4.1 4.6 0 0 1 4.1 -19L4.3 -17.4L-4.3 -17.4Z" fill="#9aa6b2" stroke="#4c5560" stroke-width=".7" stroke-linejoin="round"/><path d="M-3 -22.2Q0 -24.2 3 -22.2" fill="none" stroke="#d6dde4" stroke-width=".7"/><path d="M0 -23.4V-18.4" stroke="#4c5560" stroke-width=".6"/>`},
 stone:{name:'석재 갑주',
  body:`<path d="M-5.2 -16.4L5.2 -16.4L6.8 -13.6L6 -6L-6 -6L-6.8 -13.6Z" fill="#868a82" stroke="#3d413b" stroke-width=".8" stroke-linejoin="round"/><path d="M-4.6 -15.6L-1 -15.6L-2 -11.2L-5.6 -12.2Z" fill="#a7aba2" opacity=".8"/><path d="M-1 -16L1.2 -11.4L-.4 -8.4L1.6 -6.2M3 -13.6L4.8 -11.6" fill="none" stroke="#3d413b" stroke-width=".6"/><path d="M-8 -14.8Q-7 -17 -5 -16.2L-5.4 -12.6Q-7.6 -12.4 -8 -14.8ZM8 -14.8Q7 -17 5 -16.2L5.4 -12.6Q7.6 -12.4 8 -14.8Z" fill="#7a7e76" stroke="#3d413b" stroke-width=".7"/>`,
  head:`<path d="M-4.4 -18.8A4.4 5 0 0 1 4.4 -18.8L4.6 -16.6L-4.6 -16.6Z" fill="#868a82" stroke="#3d413b" stroke-width=".8" stroke-linejoin="round"/><path d="M-3.4 -21.8L-1 -23.6L-1.2 -20Z" fill="#a7aba2" opacity=".85"/><path d="M1 -24L2 -20.6L.4 -18.2" fill="none" stroke="#3d413b" stroke-width=".6"/><path d="M-3.2 -18.4H3.2" stroke="#2c2f2a" stroke-width="1.1"/>`}
};
for(const [k,a] of Object.entries(arm)){
  D.push({key:`armor|${k}|body`,file:`armor_${k}_body.svg`,vb:AB,svg:wrap(AB,a.body),id:`armor_${k}`,name:`방호구: ${a.name}`,group:'unit',axes:{part:'몸통'}});
  D.push({key:`armor|${k}|head`,file:`armor_${k}_head.svg`,vb:AH,svg:wrap(AH,a.head),id:`armor_${k}`,name:`방호구: ${a.name}`,group:'unit',axes:{part:'머리'}});
}
module.exports=D;
