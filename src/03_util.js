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
