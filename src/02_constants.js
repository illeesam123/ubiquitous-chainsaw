// ================= 상수 / 정의 =================
const TEAM_COL=['#4f8fd6','#d9534f','#e0a82e','#a56bd6'];
const TEAM_NAME=['아군','적군 A','적군 B','적군 C'];
const SPEED=2.1, DIG_WORK=4, MAXW=5, VIS_R=9.5;
const RIFLE={dmg:14,int:.95,range:8,cost:.5,acc:.9};
const RK=['money','bullets','metal','wood'];
const RN={money:'달러',bullets:'총알',metal:'금속',wood:'나무'};
const OB={
  tree:{n:'나무',hp:60,absorb:.25,block:false,demo:4,gain:{wood:[3,6]}},
  rock:{n:'바위',hp:240,absorb:.6,block:true,demo:8,gain:{metal:[3,6]}},
  house:{n:'폐가',building:true,ammo:12,hp:320,absorb:.55,block:true,demo:14,gain:{wood:[8,12],metal:[2,4],money:[10,30]},slots:3,gun:{dmg:20,int:.8,range:9.5,cost:.6,acc:.9},collapse:25},
  shed:{n:'헛간',building:true,ammo:6,hp:170,absorb:.45,block:true,demo:8,gain:{wood:[5,9],money:[0,14]},slots:1,gun:{dmg:16,int:.9,range:8.5,cost:.5,acc:.9},collapse:12},
  ruin:{n:'무너진 건물',building:true,ammo:4,size:2,hp:300,absorb:.68,block:false,demo:11,gain:{metal:[3,7],wood:[1,4]},slots:2,gun:{dmg:15,int:.9,range:8,cost:.5,acc:.85},collapse:6},
  warehouse:{n:'창고',building:true,ammo:24,size:2,hp:640,absorb:.6,block:true,demo:20,gain:{wood:[12,20],metal:[8,14],money:[20,50]},slots:4,gun:{dmg:18,int:.75,range:9,cost:.55,acc:.9},collapse:20},
  apartment:{n:'콘크리트 아파트',building:true,ammo:45,size:3,hp:1400,absorb:.74,block:true,demo:34,gain:{metal:[18,30],wood:[4,8],money:[40,90]},slots:6,gun:{dmg:22,int:.7,range:11,cost:.6,acc:.92},collapse:30},
  rubble:{n:'건물 잔해',nodemo:true,size:1,hp:420,absorb:.7,block:false,slots:1,gun:{dmg:14,int:.95,range:7.5,cost:.5,acc:.82},collapse:0},
  rubble2:{n:'건물 잔해',nodemo:true,size:2,hp:850,absorb:.72,block:false,slots:2,gun:{dmg:15,int:.9,range:8,cost:.5,acc:.85},collapse:0},
  rubble3:{n:'건물 잔해',nodemo:true,size:3,hp:1500,absorb:.76,block:false,slots:4,gun:{dmg:16,int:.9,range:8.5,cost:.5,acc:.86},collapse:0},
  fence:{n:'울타리',hp:110,absorb:.35,block:false,demo:3,gain:{wood:[2,4]},slots:1,gun:{dmg:16,int:.85,range:8.5,cost:.5,acc:.9},collapse:6},
  crate:{n:'보급 상자',hp:40,absorb:.2,block:false,demo:2,gain:'crate'},
  sandbag:{n:'모래주머니',hp:150,absorb:.5,block:false,demo:2,build:3,cost:{money:6,wood:2}},
  wire:{n:'철조망',hp:70,absorb:.1,block:false,demo:2,build:3,cost:{metal:3,wood:1}},
  tower:{n:'감시탑',hp:230,absorb:.5,block:false,demo:6,build:12,cost:{money:20,wood:14,metal:4},slots:1,gun:{dmg:26,int:1.1,range:11,cost:1,acc:.95},collapse:30},
  mg:{n:'기관총좌',hp:260,absorb:.6,block:false,demo:6,build:14,cost:{money:40,wood:6,metal:12,bullets:20},slots:2,gun:{dmg:9,int:.2,range:9.5,cost:.5,acc:.8},collapse:18},
  bunker:{n:'벙커',hp:900,absorb:.75,block:true,size:2,demo:16,build:40,cost:{money:50,wood:16,metal:14},slots:4,gun:{dmg:16,int:.6,range:8.5,cost:.5,acc:.9},collapse:12},
  mortar:{n:'박격포 진지',hp:300,absorb:.45,block:false,demo:9,build:34,cost:{money:55,wood:8,metal:22,bullets:30},slots:2,range:16,interval:7.5,shell:58,trenchDmg:105},
  medbay:{n:'의무 막사',hp:380,absorb:.5,block:false,demo:10,build:26,cost:{money:48,wood:18,metal:8},slots:2,staff:1,beds:2,heal:5,healRange:5.2,retreatAt:.45},
  workshop:{n:'공방',building:true,size:2,hp:560,absorb:.55,block:true,demo:16,build:45,cost:{metal:250}},
  drone:{n:'폭발 드론',size:1,build:18,cost:{metal:70}},
  // 차량은 작업 시스템의 비용·제작 시간만 공유하며, 장애물 대신 독립 엔티티로 생성된다.
  tank:{n:'전차',size:1,build:48,cost:{money:130,metal:45,bullets:60}},
  truck:{n:'수송트럭',size:1,build:28,cost:{money:75,metal:18,wood:6,bullets:10}},
  heli:{n:'헬리콥터',size:1,build:50,cost:{money:140,metal:50,bullets:60}}
};
const BUILDS=['sandbag','wire','tower','mg','bunker','mortar','medbay','workshop','tank','truck','heli','drone'];
const VEH={
  tank:{hp:850,speed:1.25,range:12,interval:3.5,damage:38,ammo:4,blast:1.35,trenchDmg:72,armor:.35,crew:3},
  truck:{hp:430,speed:1.8,range:0,interval:0,damage:0,ammo:0,blast:0,trenchDmg:0,armor:.15,cargo:180,supply:2.2,supplyRange:5.5,crew:1,seats:8},
  heli:{hp:340,speed:3.3,range:0,interval:0,damage:0,ammo:0,blast:0,trenchDmg:0,armor:.1,crew:1,seats:4,air:true,rangeBonus:4,takeoff:2.4,landing:2.2},
  drone:{hp:95,speed:3.6,range:0,interval:0,damage:0,ammo:0,blast:0,trenchDmg:0,armor:0,crew:0,air:true}
};
let G=null;
const WEATHER={clear:{name:'맑음',icon:'☀',sight:1,acc:1,speed:1,work:1},rain:{name:'비',icon:'🌧',sight:.82,acc:.88,speed:.86,work:.82},snow:{name:'눈',icon:'❄',sight:.72,acc:.78,speed:.72,work:.68},fog:{name:'안개',icon:'〰',sight:.52,acc:.76,speed:1,work:1}};
function weatherSight(){return WEATHER[G?.weather?.type||'clear'].sight*(G?.weather?.night?.72:1);}
function weatherAccuracy(){return WEATHER[G?.weather?.type||'clear'].acc*(G?.weather?.night?.84:1);}
function weatherSpeed(){return WEATHER[G?.weather?.type||'clear'].speed;}
function weatherWork(){return WEATHER[G?.weather?.type||'clear'].work;}
let controlGroups=Array.from({length:5},()=>[]);
