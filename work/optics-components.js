// A shared, analytically integrated gust carrier. Velocity is the exact time
// derivative of displacement: no integrated drift mismatch between time keys.
const windNow=new Float32Array(4),windKey=new Float32Array(4);
function windAt(t,out){
 const s=state.windStrength;
 out[0]=s*(-.60-.18*Math.sin(.37*t)-.07*Math.sin(.91*t+1.3));
 out[1]=s*(.23+.10*Math.sin(.23*t+.6));
 out[2]=s*(-.60*t+.18/.37*(Math.cos(.37*t)-1)+.07/.91*(Math.cos(.91*t+1.3)-Math.cos(1.3)));
 out[3]=s*(.23*t-.10/.23*(Math.cos(.23*t+.6)-Math.cos(.6)));
 return out;
}
function updateWind(t){windAt(t,windNow);}
// Wave-vector, frequency, height. Real-world lengths assume an 8 m scene unit.
// omega^2 = g*k + (surface tension / density)*k^3, evaluated just once.
const waveData=new Float32Array(12);
for(let i=0;i<3;i++){
 const angle=[.25,1.10,-.65][i],lambda=[.48,.23,.11][i];
 const k=TAU/lambda,kw=k*8;
 waveData.set([Math.cos(angle)*kw,Math.sin(angle)*kw,Math.sqrt(9.81*k+.000074*k*k*k),[.00027,.00012,.000045][i]],i*4);
}
let lunarSurface=null;
function buildLunarSurface(){
 if(lunarSurface)return lunarSurface;
 const N=640,H=new Float32Array(N*N),A=new Float32Array(N*N),random=rng(81033);
 const mares=[[-.33,-.08,.31,.44,.26],[-.18,-.39,.26,.19,.19],[.18,-.27,.20,.18,.23],[.39,-.05,.16,.20,.16],[-.39,.28,.17,.19,.17],[.05,.16,.21,.14,.09]];
 for(let y=0;y<N;y++)for(let x=0;x<N;x++){
  const nx=(x+.5)/N*2-1,ny=(y+.5)/N*2-1,k=y*N+x;
  if(nx*nx+ny*ny>1.015)continue;
  const n=hashCPU(nx*.43+17,ny*.43+31),d=hashCPU(nx*2.7-9,ny*2.7+11),micro=hashCPU(nx*13+19,ny*13-7);
  let a=.84+(n-.5)*.16+(d-.5)*.12+(micro-.5)*.055;
  for(const m of mares){const dx=(nx-m[0])/(m[2]*(.84+.27*n)),dy=(ny-m[1])/m[3];a-=m[4]*Math.exp(-(dx*dx+dy*dy)*1.65);}
  A[k]=a;H[k]=(d-.5)*.0015+(micro-.5)*.0004;
 }
 function crater(cx,cy,r,depth){
  const z=Math.sqrt(Math.max(.06,1-cx*cx-cy*cy)),squash=.60+.40*z;
  const rx=r,ry=r*squash,px=(cx*.5+.5)*N,py=(cy*.5+.5)*N;
  const wx=rx*N*.5,wy=ry*N*.5;
  const x0=Math.max(1,Math.floor(px-wx*1.65)),x1=Math.min(N-2,Math.ceil(px+wx*1.65));
  const y0=Math.max(1,Math.floor(py-wy*1.65)),y1=Math.min(N-2,Math.ceil(py+wy*1.65));
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
   const dx=(x+.5-px)/wx,dy=(y+.5-py)/wy,d=Math.sqrt(dx*dx+dy*dy);if(d>1.65)continue;
   const k=y*N+x,rim=Math.exp(-Math.pow((d-.98)/.115,2)),bowl=Math.max(0,1-d*d);
   H[k]+=depth*(rim*.55-bowl*.75);
   A[k]+=rim*.035+Math.exp(-Math.pow((d-1.17)/.29,2))*.016-bowl*.018;
  }
 }
 for(let i=0;i<540;i++){
  const a=random()*TAU,d=Math.sqrt(random())*.965,r=.004+Math.pow(random(),3.3)*.062;
  crater(Math.cos(a)*d,Math.sin(a)*d,r,r*.12);
 }
 crater(.08,.55,.053,.007);crater(-.49,.14,.062,.006);
 lunarSurface=newCanvas();lunarSurface.width=lunarSurface.height=N;
 const c=ctx2(lunarSurface),im=c.createImageData(N,N),data=im.data;
 const lx=-.23,ly=-.14,lz=Math.sqrt(1-lx*lx-ly*ly);
 for(let y=1;y<N-1;y++)for(let x=1;x<N-1;x++){
  const nx=(x+.5)/N*2-1,ny=(y+.5)/N*2-1,r2=nx*nx+ny*ny;if(r2>=1)continue;
  const k=y*N+x,z=Math.sqrt(1-r2);
  let bx=nx-(H[k+1]-H[k-1])*N*.48,by=ny-(H[k+N]-H[k-N])*N*.48,bz=z;
  const inv=1/Math.hypot(bx,by,bz);bx*=inv;by*=inv;bz*=inv;
  const nl=Math.max(0,bx*lx+by*ly+bz*lz),nv=Math.max(.015,z);
  // Diffuse + Lommel-Seeliger-like regolith response; no shiny lunar plastic.
  const light=.045+.30*nl+1.25*nl/(nl+nv+.035),a=Math.max(.12,Math.min(1,A[k]));
  const intensity=Math.min(.97,a*light*1.10),j=k*4;
  data[j]=intensity*244;data[j+1]=intensity*247;data[j+2]=intensity*255;
  data[j+3]=Math.min(1,(1-Math.sqrt(r2))*N*.5)*255;
 }
 c.putImageData(im,0,0);return lunarSurface;
}
function bakeMoon(){
 const r=.148*state.u,R=r*2.25;moonSize=Math.ceil(R*2+8);
 sizeCanvas(moon,moonSize,moonSize,state.dpr);const c=ctx2(moon),x=moonSize*.5;
 c.setTransform(state.dpr,0,0,state.dpr,0,0);
 const halo=c.createRadialGradient(x,x,r*.98,x,x,R);
 for(const s of [[0,'rgba(235,246,255,.36)'],[.10,'rgba(174,214,241,.21)'],[.31,'rgba(98,162,215,.10)'],[.50,'rgba(126,198,177,.065)'],[.61,'rgba(218,190,134,.055)'],[.72,'rgba(209,131,165,.035)'],[1,'rgba(60,95,120,0)']])halo.addColorStop(...s);
 c.fillStyle=halo;c.beginPath();c.arc(x,x,R,0,TAU);c.fill();
 c.drawImage(buildLunarSurface(),x-r,x-r,r*2,r*2);state.moonDirty=true;
}
const reflectionCanvas=newCanvas(),reflectionBounds=new Float32Array(4);
let reflectionVersion=0,lastReflectionTime=-100;
function setupReflectionAtlas(){
 const boxes=[rack,cabin,hearth,cherry].map(c=>islandBoxes.get(c));
 let x0=Infinity,y0=Infinity,x1=-Infinity;
 for(const b of boxes){x0=Math.min(x0,b.x);y0=Math.min(y0,b.y);x1=Math.max(x1,b.x+b.w);}
 reflectionBounds.set([x0/state.w,y0/state.h,(x1-x0)/state.w,HY+.012-y0/state.h]);
 reflectionCanvas.width=state.perfMode==='high'?768:512;reflectionCanvas.height=state.perfMode==='high'?256:192;
 lastReflectionTime=-100;
}
function updateReflectionAtlas(t){
 if(t-lastReflectionTime<1/20)return;
 lastReflectionTime=t;const c=ctx2(reflectionCanvas),W=reflectionCanvas.width,H=reflectionCanvas.height,b=reflectionBounds;
 c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,W,H);
 c.setTransform(W/(b[2]*state.w),0,0,H/(b[3]*state.h),-b[0]/b[2]*W,-b[1]/b[3]*H);
 for(const canvas of [rack,cabin,hearth,cherry]){const q=islandBoxes.get(canvas);c.drawImage(canvas,q.x,q.y,q.w,q.h);}
 reflectionVersion++;
}
