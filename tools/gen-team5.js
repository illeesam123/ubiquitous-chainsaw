// 5번째 팀(흰색) 차량 SVG: 팀 1(파랑) 에셋의 팀색을 흰색으로 바꿔 비파괴 추가한다.  node tools/gen-team5.js
const fs=require('fs'),path=require('path'),addDefs=require('./add-svg.js');
const dir=path.join(__dirname,'..','assets','sprites'),cat=JSON.parse(fs.readFileSync(path.join(dir,'catalog.json'),'utf8')),defs=[];
for(const a of cat){
  if(a.group!=='veh')continue;
  for(const c of a.cells){
    const m=/^veh\|(\w+)\|0\|(\d+)$/.exec(c.key);if(!m)continue;
    const svg=fs.readFileSync(path.join(dir,c.file),'utf8').replace(/#4f8fd6/gi,'#f2f2f2');
    defs.push({id:a.id,name:a.name,group:'veh',key:`veh|${m[1]}|4|${m[2]}`,file:`veh_${m[1]}_4_${m[2]}.svg`,svg,vb:c.vb,axes:{team:'팀 5',dir:c.axes.dir}});
  }
}
addDefs(defs);
