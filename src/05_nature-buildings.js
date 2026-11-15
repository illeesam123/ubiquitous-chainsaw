// ================= 자연 건축물 (아파트·창고·헛간·폐허) =================
function winPoly(a,b,hc,hh,hw,onX){ // 창문 사각형 (onX: 동면)
  return onX?[pt(a,b-hw,hc-hh),pt(a,b+hw,hc-hh),pt(a,b+hw,hc+hh),pt(a,b-hw,hc+hh)]:[pt(a-hw,b,hc-hh),pt(a+hw,b,hc-hh),pt(a+hw,b,hc+hh),pt(a-hw,b,hc+hh)];
}
function drawBuildingX(o,t,L,occ){
  const z=cam.z,x0=o.x,y0=o.y,x1=o.x+o.size,y1=o.y+o.size,cxw=o.x+o.size/2,cyw=o.y+o.size/2;
  const dmg=1-o.hp/o.max,v=o.v;
  if(t==='apartment'){
    const xa=x0+.08,xb=x1-.08,ya=y0+.08,yb=y1-.08,H=72,fh=(H-3)/5,cols=6;
    shadowAt(cxw+.4,cyw+.35,78,30);
    wbox(xa-.03,ya-.03,xb+.03,yb+.03,0,3,'#6f6c64','#5e5b54','#4f4d47');
    wbox(xa,ya,xb,yb,3,H,'#000',L('#b0ada3'),L('#8d8a81'),'rgba(40,38,34,.65)');
    for(let f=1;f<5;f++){const h=3+f*fh;wline(pt(xa,yb,h),pt(xb,yb,h),'rgba(40,38,34,.32)',1.2);wline(pt(xb,ya,h),pt(xb,yb,h),'rgba(40,38,34,.32)',1.2);}
    for(let f=1;f<5;f++)for(let c=0;c<cols;c++){
      const wx=xa+(c+.5)*(xb-xa)/cols,hc=3+f*fh+fh*.5,k=hsh(c+o.x,f+o.y*3);
      const ou=(f===2&&c<occ.length)?occ[c]:null;
      poly(winPoly(wx,yb,hc,3.4,.1,false),ou?'#14100b':k>.78?'#53614a':k>.5?'#2b3a44':'#202a31','#d9d4c4',1.1*z);
      if(!ou)wline(pt(wx,yb,hc),pt(wx,yb,hc),'rgba(255,255,255,.0)',0);else peek(pt(wx,yb,hc-2),ou,.8,false);
      wline(pt(wx-.12,yb,hc-3.8),pt(wx+.12,yb,hc-3.8),'#6e6b62',1.4);
      const wy=ya+(c+.5)*(yb-ya)/cols;
      poly(winPoly(xb,wy,hc,3.4,.1,true),k>.7?'#46543f':'#1c262d','#cfcabb',1);
    }
    // 1층 출입구 + 차양
    poly([pt(xa+(xb-xa)*.42,yb,3),pt(xa+(xb-xa)*.58,yb,3),pt(xa+(xb-xa)*.58,yb,16),pt(xa+(xb-xa)*.42,yb,16)],'#1b1612','#e2dcc9',1.2*z);
    wbox(xa+(xb-xa)*.38,yb,xa+(xb-xa)*.62,yb+.22,17,19,'#6e6c64','#5a5851','#4a4944');
    // 옥상
    wbox(xa-.03,ya-.03,xb+.03,yb+.03,H,H+4,'#7c7a72','#9a978d','#7a776f');
    poly([pt(xa+.14,ya+.14,H+4),pt(xb-.14,ya+.14,H+4),pt(xb-.14,yb-.14,H+4),pt(xa+.14,yb-.14,H+4)],'#68665e');
    wbox(xa+.3,ya+.3,xa+.8,ya+.75,H+4,H+14,'#85827a','#74716a','#615f58');
    wbox(xb-.75,yb-.7,xb-.4,yb-.4,H+4,H+10,'#8d8a82','#7a776f','#686660');
    wline(pt(xb-.35,ya+.4,H+4),pt(xb-.35,ya+.4,H+30),'#3d3d3a',1.6);wline(pt(xb-.55,ya+.4,H+22),pt(xb-.15,ya+.4,H+22),'#3d3d3a',1.2);
    if(dmg>.3){cx.globalAlpha=.8;poly([pt(xa+.5,yb,H-8),pt(xa+.95,yb,H-24),pt(xa+.8,yb,H-38),pt(xa+1.4,yb,H-30),pt(xa+1.25,yb,H-12)],'#2b2824');cx.globalAlpha=1;}
    if(dmg>.6){poly([pt(xb,ya+.4,H-6),pt(xb,ya+1.1,H-30),pt(xb,ya+.8,H-12)],'#2b2824');wline(pt(xa+1.8,yb,H-6),pt(xa+1.5,yb,H-34),'rgba(0,0,0,.55)',1.6);}
  }else if(t==='warehouse'){
    const xa=x0+.07,xb=x1-.07,ya=y0+.07,yb=y1-.07,ym=(ya+yb)/2,H=26;
    shadowAt(cxw+.3,cyw+.25,56,22);
    wbox(xa-.02,ya-.02,xb+.02,yb+.02,0,2,'#76726a','#65625b','#55534d');
    wbox(xa,ya,xb,yb,2,H,'#4f5b63',L('#8c9490'),L('#737b77'),'rgba(30,34,32,.6)');
    for(let k=1;k<7;k++){const tt=k/7,xx=xa+(xb-xa)*tt;wline(pt(xx,yb,2),pt(xx,yb,H),'rgba(0,0,0,.18)',1);}
    poly([pt(xb,ya,H),pt(xb,yb,H),pt(xb,ym,H+13)],L('#737b77'),'rgba(30,34,32,.6)',1);
    poly([pt(xa-.07,yb+.1,H-2),pt(xb+.07,yb+.1,H-2),pt(xb+.07,ym,H+14),pt(xa-.07,ym,H+14)],L('#5c6a72'),'rgba(25,30,34,.7)',1);
    for(let k=1;k<8;k++){const tt=k/8,hh=H-2+16*tt,yy=yb+.1+(ym-yb-.1)*tt;wline(pt(xa-.07,yy,hh),pt(xb+.07,yy,hh),'rgba(0,0,0,.22)',1);}
    wline(pt(xa-.07,ym,H+14),pt(xb+.07,ym,H+14),'#3c474e',2.2);
    poly([pt(xb,ya+.35,2),pt(xb,yb-.35,2),pt(xb,yb-.35,17),pt(xb,ya+.35,17)],'#4b5750','#2a322d',1.2);
    for(let k=1;k<5;k++)wline(pt(xb,ya+.35,2+k*3),pt(xb,yb-.35,2+k*3),'rgba(0,0,0,.3)',1);
    const sl=OB.warehouse.slots;
    for(let k=0;k<sl;k++){const wx=xa+(k+.5)*(xb-xa)/sl,ou=occ[k];poly(winPoly(wx,yb,19,2.4,.14,false),ou?'#14100b':'#26323a','#dcd7c6',1.1*z);if(ou)peek(pt(wx,yb,17.5),ou,.8,false);}
    if(dmg>.4){poly([pt(xa+.4,yb,H),pt(xa+.9,yb,H-9),pt(xa+.6,yb,H-3)],'#2a2d2b');}
  }else if(t==='shed'){
    const xa=x0+.14,xb=x1-.14,ya=y0+.16,yb=y1-.12,ym=(ya+yb)/2,H=11;
    shadowAt(cxw+.12,cyw+.1,26,11);
    wbox(xa,ya,xb,yb,0,H,'#5a4c3d',L('#9a784c'),L('#7a5c3a'),'rgba(40,26,12,.6)');
    for(let k=1;k<6;k++){const xx=xa+(xb-xa)*k/6;wline(pt(xx,yb,0),pt(xx,yb,H),'rgba(0,0,0,.25)',1);}
    poly([pt(xb,ya,H),pt(xb,yb,H),pt(xb,ym,H+7)],L('#7a5c3a'));
    poly([pt(xa-.07,yb+.09,H-1),pt(xb+.07,yb+.09,H-1),pt(xb+.07,ym,H+8),pt(xa-.07,ym,H+8)],L(v>.5?'#7b838a':'#6a5a4a'),'rgba(0,0,0,.5)',1);
    wline(pt(xa-.07,ym,H+8),pt(xb+.07,ym,H+8),'#3a3d40',1.8);
    poly(winPoly((xa+xb)/2-.06,yb,6,2.6,.12,false),occ[0]?'#14100b':'#1e1a14','#c9b48a',1);if(occ[0])peek(pt((xa+xb)/2-.06,yb,5),occ[0],.7,false);
    poly([pt(xb,ya+.2,0),pt(xb,ya+.38,0),pt(xb,ya+.38,8),pt(xb,ya+.2,8)],'#3b2a1a');
  }else if(t==='ruin'){
    shadowAt(cxw+.1,cyw+.1,46,18);
    const s=o.size;
    for(let k=0;k<12;k++){const px=x0+.1+hsh(o.x+k,o.y)*(s-.4),py=y0+.1+hsh(o.y+k,o.x*2)*(s-.4);cx.fillStyle=hsh(k,o.x)>.5?'#8d897f':'#6f6b62';const p=pt(px,py,0);cx.beginPath();cx.ellipse(p[0],p[1],(2+hsh(k,k)*3)*z,(1.2+hsh(k+1,k)*1.5)*z,0,0,6.3);cx.fill();}
    const segs=[[.1,.15,1.55,.32,24],[.1,.15,.3,1.4,17],[1.2,1.3,1.9,1.5,12],[.5,1.6,.9,1.9,9]];
    for(let k=0;k<segs.length;k++){const g=segs[k];if(k>1&&v<.3)continue;
      wbox(x0+g[0],y0+g[1],x0+Math.min(g[2],s-.08),y0+Math.min(g[3],s-.08),0,g[4]*(.85+hsh(k,o.x)*.3),L('#a39f94'),L('#8d897f'),L('#706c63'),'rgba(30,28,24,.6)');
      const ht=g[4]*(.85+hsh(k,o.x)*.3);poly([pt(x0+g[0],y0+g[3],ht),pt(x0+g[0]+.2,y0+g[3],ht+5),pt(x0+g[0]+.4,y0+g[3],ht)],L('#8d897f'));
    }
    wbox(x0+1.0,y0+.2,x0+1.5,y0+.62,0,5,'#7a6a52','#6a5b45','#5a4c39');
    if(occ[0])peek(pt(x0+.9,y0+1.45,11),occ[0],.85,true);
    if(occ[1])peek(pt(x0+1.5,y0+1.5,9),occ[1],.85,true);
  }
}
