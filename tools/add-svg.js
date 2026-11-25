// 비파괴 SVG 추가기: tools/extra-svgs.js 의 정의를 assets/sprites/ 에 쓰고 manifest.js · catalog.json 에 항목을 더한다. (기존 항목은 같은 key 만 교체)
const fs=require('fs'),path=require('path'),out=path.join(__dirname,'..','assets','sprites');
function addDefs(defs){const manP=path.join(out,'manifest.js');
const man=JSON.parse(/var SPRITE_MANIFEST=(.*);\s*$/s.exec(fs.readFileSync(manP,'utf8'))[1]),cat=JSON.parse(fs.readFileSync(path.join(out,'catalog.json'),'utf8'));
for(const d of defs){
  fs.writeFileSync(path.join(out,d.file),d.svg);man[d.key]=[d.file,...d.vb];
  let a=cat.find(c=>c.id===d.id);if(!a){a={id:d.id,name:d.name,search:d.name+' '+d.id,cells:[],axes:[],group:d.group||'unit'};cat.push(a);}
  const cell={key:d.key,file:d.file,axes:d.axes||{},vb:d.vb},i=a.cells.findIndex(c=>c.key===d.key);if(i>=0)a.cells[i]=cell;else a.cells.push(cell);
  a.axes=[...new Set([...(a.axes||[]),...Object.keys(d.axes||{})])];
}
fs.writeFileSync(manP,'// 자동 생성: npm run sprites\nvar SPRITE_MANIFEST='+JSON.stringify(man)+';\n');
fs.writeFileSync(path.join(out,'catalog.json'),JSON.stringify(cat));
console.log(defs.length+' 에셋 추가/갱신');}
module.exports=addDefs;
if(require.main===module)addDefs(require('./extra-svgs.js'));
