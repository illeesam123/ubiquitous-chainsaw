// ================= 야전 의무 막사 =================
function drawMedbayOb(o,occ,L){
  const z=cam.z,xa=o.x+.04,xb=o.x+.96,ya=o.y+.08,yb=o.y+.96,ym=(ya+yb)/2,cxw=(xa+xb)/2,wh=12,rh=28;
  shadowAt(cxw+.12,ym+.1,34,14);
  wbox(xa-.03,ya-.03,xb+.03,yb+.03,0,2.5,'#6d6a58','#5b594a','#4b4a3d');
  wbox(xa,ya,xb,yb,2.5,wh,'#000',L('#a6a78c'),L('#84866d'));
  // 입구: 열린 천막 + 어두운 내부
  facePoly({P:(a,b,c)=>pt(a,b,c)},[[cxw-.17,yb+.001,2.5],[cxw+.17,yb+.001,2.5],[cxw+.17,yb+.001,11],[cxw-.17,yb+.001,11]],'#16130e');
  // 내부 간이침대 (환자)
  const pat=(o.patients||[]).map(id=>G.uid.get(id)).filter(u=>u&&u.state==='med');
  for(let k=0;k<2;k++){
    const p=pt(cxw-.08+k*.17,yb-.12,3.4);
    cx.fillStyle=k<pat.length?'#e9ecde':'rgba(220,225,205,.35)';cx.beginPath();cx.ellipse(p[0],p[1],6.5*z,3.4*z,0,0,6.3);cx.fill();
    if(k<pat.length){cx.fillStyle='#d6b48f';cx.beginPath();cx.arc(p[0]+4*z,p[1]-2*z,2.2*z,0,6.3);cx.fill();cx.fillStyle=TEAM_COL[pat[k].team];cx.fillRect(p[0]-5*z,p[1]-1.5*z,6*z,2*z);}
  }
  // 걷어 올린 입구 천
  poly([pt(cxw-.2,yb+.004,11),pt(cxw-.17,yb+.004,11),pt(cxw-.17,yb+.004,2.5),pt(cxw-.23,yb+.004,2.5)],L('#b7b89c'));
  poly([pt(cxw+.2,yb+.004,11),pt(cxw+.17,yb+.004,11),pt(cxw+.17,yb+.004,2.5),pt(cxw+.23,yb+.004,2.5)],L('#b7b89c'));
  // 지붕 (남쪽 경사 + 동쪽 박공)
  poly([pt(xb+.06,ya-.06,wh-1),pt(xb+.06,yb+.08,wh-1),pt(xb+.06,ym,rh)],L('#c9cab3'));
  poly([pt(xa-.07,yb+.09,wh-1),pt(xb+.07,yb+.09,wh-1),pt(xb+.07,ym,rh),pt(xa-.07,ym,rh)],L('#dcdcc9'));
  for(let k=1;k<4;k++){const tt=k/4,h2=wh-1+(rh-wh+1)*tt,yy=yb+.09+(ym-yb-.09)*tt;wline(pt(xa-.07,yy,h2),pt(xb+.07,yy,h2),'rgba(90,92,70,.28)',1);}
  wline(pt(xa-.07,ym,rh),pt(xb+.07,ym,rh),'#6d6e56',2);
  wline(pt(xa-.07,yb+.09,wh-1),pt(xb+.07,yb+.09,wh-1),'#6d6e56',1.6);wline(pt(xb+.07,yb+.09,wh-1),pt(xb+.07,ym,rh),'#6d6e56',1.6);
  // 적십자
  const cp=pt(cxw,(ym+yb+.09)/2,(wh+rh)/2-1);
  cx.fillStyle='#c0392f';cx.fillRect(cp[0]-2.8*z,cp[1]-8*z,5.6*z,16*z);cx.fillRect(cp[0]-8*z,cp[1]-2.8*z,16*z,5.6*z);
  const gp=pt(xb+.07,(yb+ym)/2,(wh+rh)/2-2);cx.fillStyle='#c0392f';cx.fillRect(gp[0]-1.3*z,gp[1]-4*z,2.6*z,8*z);cx.fillRect(gp[0]-4*z,gp[1]-1.3*z,8*z,2.6*z);
  // 줄과 말뚝
  for(const [sx_,sy_,ex,ey] of [[xa-.07,yb+.09,xa-.3,yb+.34],[xb+.07,yb+.09,xb+.18,yb+.38],[xb+.07,ya-.06,xb+.24,ya-.2]]){wline(pt(sx_,sy_,wh-1),pt(ex,ey,0),'rgba(220,220,205,.7)',.9);wline(pt(ex,ey,0),pt(ex,ey,5),'#5a4a30',1.8);}
  // 깃대와 적십자 깃발
  wline(pt(xa+.02,ya+.02,rh-2),pt(xa+.02,ya+.02,rh+16),'#d8d8cc',1.4);
  const fp=pt(xa+.02,ya+.02,rh+15),wv=Math.sin(G.time*3+o.id)*1.2*z;
  cx.fillStyle='#f0efe6';cx.fillRect(fp[0],fp[1],13*z,9*z+wv);cx.fillStyle='#c0392f';cx.fillRect(fp[0]+5*z,fp[1]+1.2*z,2.4*z,6.6*z);cx.fillRect(fp[0]+2.8*z,fp[1]+3.4*z,6.8*z,2.4*z);
  // 보급 상자
  wbox(xb+.0,yb-.12,xb+.2,yb+.1,0,8,L('#8c7447'),L('#725f38'),L('#5d4d2e'),'#3a2f1b');
  const sp=pt(xb+.1,yb+.1,4);cx.fillStyle='#e8e5d8';cx.fillRect(sp[0]-2.4*z,sp[1]-2.4*z,4.8*z,4.8*z);cx.fillStyle='#c0392f';cx.fillRect(sp[0]-.7*z,sp[1]-2*z,1.4*z,4*z);cx.fillRect(sp[0]-2*z,sp[1]-.7*z,4*z,1.4*z);
  // 치료 중이면 입구 위로 초록 십자가 올라간다
  if(pat.length&&occ.length>=1){const p=((G.time*.8+o.id*.37)%1),q=pt(cxw,yb,14+p*16);cx.globalAlpha=1-p;cx.fillStyle='#8be39a';cx.fillRect(q[0]-1.2*z,q[1]-4*z,2.4*z,8*z);cx.fillRect(q[0]-4*z,q[1]-1.2*z,8*z,2.4*z);cx.globalAlpha=1;}
  if(occ[0])peek(pt(cxw-.3,yb+.04,10),occ[0],.85,true);
  if(occ[1])peek(pt(cxw+.3,yb+.04,10),occ[1],.85,true);
}
