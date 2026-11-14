// Shared architectural profiles drive artwork, atmospheric masks and world-depth shadows.
const villageFloor=$('village-floor'),villageBody=$('village-buildings'),villageGlow=$('village-glow');
const villageFogMask=newCanvas();
const worldPlanes=[],houseList=[];
let mainHouse=null,worldMaskVersion=0,villageGlowAlpha=1;
const WORLD_ATLAS_W=2048,WORLD_ATLAS_H=768;
const planeRects=new Float32Array(20),planeWorld=new Float32Array(20),planeInfo=new Float32Array(20),planeBounds=new Float32Array(20);
function poly(c,p){c.beginPath();for(let i=0;i<p.length;i++)i?c.lineTo(...p[i]):c.moveTo(...p[i]);c.closePath();}
function villageProject(X,Y,Z){const p=1/(1-Z);return [(VPX+(X-VPX)*p)*state.w,(HY+(p-1)*(HY-VPY)-Y*p)*state.h,p];}
function houseParts(b){
 const w=b.width,h=b.wall,r=b.roof;
 const parts=[[[ -w*.50,0],[w*.50,0],[w*.50,-h],[-w*.50,-h]],[[w*.50,0],[w*.61,-.013],[w*.61,-h-.009],[w*.50,-h]],
 [[-w*.69,-h+.010],[-w*.53,-h-.005],[-w*.12,-h-r*.96],[w*.035,-h-r*1.05],[w*.18,-h-r*.91],[w*.70,-h+.010],[w*.58,-h+.014],[w*.04,-h-r*.12],[-w*.56,-h+.015]]];
 if(b.chimney)parts.push([[w*.26,-h-r*.42],[w*.34,-h-r*.42],[w*.34,-h-r*.83-.025],[w*.26,-h-r*.83-.025]]);
 if(b.kind==='tower'){
  parts.push([[-w*.30,-h-r*.76],[-w*.30,-h-r*1.38],[w*.30,-h-r*1.38],[w*.30,-h-r*.76]]);
  parts.push([[-w*.46,-h-r*1.32],[0,-h-r*1.92],[w*.46,-h-r*1.32],[w*.34,-h-r*1.27],[-w*.34,-h-r*1.27]]);
 }
 if(b.fence){
  parts.push([[-w*1.00,-.023],[-w*.53,-.023],[-w*.53,-.029],[-w*1.00,-.029]]);
  for(let i=0;i<4;i++){const x=-w*(.56+i*.14);parts.push([[x-.002,0],[x+.002,0],[x+.002,-.047],[x-.002,-.047]]);}
 }
 return parts;
}
function paintHouseMask(c,b){
 c.fillStyle='#f00';for(const part of b.parts){poly(c,part);c.fill();}
 // Open door, shared with the artwork. Window glass is not an invented hole.
 if(b.door){const dw=b.width*.20;c.globalCompositeOperation='destination-out';c.fillRect(-dw*.42,-b.wall*.78,dw,b.wall*.78+.002);c.globalCompositeOperation='source-over';}
}
function houseWindows(b){const w=b.width,h=b.wall;return [[-w*.32,-h*.70,w*.16,h*.39],[w*.20,-h*.70,w*.17,h*.39]];}
function paintHouseEmission(c,b){
 const w=b.width,h=b.wall;
 for(const [x,y,ww,hh]of houseWindows(b)){
  const g=c.createRadialGradient(x+ww*.5,y+hh*.5,ww*.2,x+ww*.5,y+hh*.5,ww*2.1);
  g.addColorStop(0,'rgba(255,203,119,.46)');g.addColorStop(.30,'rgba(255,151,70,.16)');g.addColorStop(1,'rgba(255,115,45,0)');c.fillStyle=g;c.fillRect(x-ww*1.8,y-hh*1.6,ww*4.6,hh*4.4);
  c.fillStyle='rgba(255,221,151,.72)';c.fillRect(x+.002,y+.002,ww-.004,hh-.004);
 }
 const lx=w*.61,ly=-h*.51,rr=w*.15;
 const g=c.createRadialGradient(lx,ly,0,lx,ly,rr);g.addColorStop(0,'rgba(255,221,149,.78)');g.addColorStop(.20,'rgba(255,162,72,.30)');g.addColorStop(1,'rgba(255,139,57,0)');c.fillStyle=g;c.fillRect(lx-rr,ly-rr,rr*2,rr*2);
}
function paintHouse(c,b){
 const w=b.width,h=b.wall,r=b.roof,random=rng(17000+b.id*911);
 c.lineJoin='round';c.lineCap='round';
 // Stone plinth, recessed stair treads and broad ground-contact shade.
 let g=c.createRadialGradient(0,0,w*.15,0,0,w*.66);g.addColorStop(0,'rgba(0,2,5,.75)');g.addColorStop(1,'rgba(0,2,5,0)');c.save();c.scale(1,.16);c.fillStyle=g;c.fillRect(-w*.72,-w*.70,w*1.44,w*1.40);c.restore();
 c.fillStyle='#293843';c.fillRect(-w*.52,-.010,w*1.14,.019);c.strokeStyle='#071018';c.lineWidth=.0018;
 for(let i=0;i<9;i++){const x=-w*.52+i*w*.125;c.beginPath();c.moveTo(x,-.010);c.lineTo(x+.006,.008);c.stroke();}
 for(let i=3;i>=0;i--){const sw=w*(.18+i*.028),y=.003+i*.0035;c.fillStyle=i%2?'#52616a':'#34434d';c.fillRect(-sw*.5,y,sw,.004);c.fillStyle='rgba(165,196,211,.34)';c.fillRect(-sw*.5,y,sw,.0009);}
 // Deep side wall and cold plaster with visible timber framing.
 g=c.createLinearGradient(-w*.5,-h,w*.6,0);g.addColorStop(0,'#61717a');g.addColorStop(.45,'#3d515e');g.addColorStop(1,'#182b39');c.fillStyle=g;poly(c,b.parts[0]);c.fill();
 c.fillStyle='#152331';poly(c,b.parts[1]);c.fill();
 c.strokeStyle='rgba(4,12,19,.78)';c.lineWidth=.0045;
 for(const xx of [-.50,-.13,.14,.50]){c.beginPath();c.moveTo(w*xx,0);c.lineTo(w*xx,-h);c.stroke();c.strokeStyle='rgba(134,164,179,.34)';c.lineWidth=.0010;c.beginPath();c.moveTo(w*xx+.002,0);c.lineTo(w*xx+.002,-h);c.stroke();c.strokeStyle='rgba(4,12,19,.78)';c.lineWidth=.0045;}
 for(const yy of [-h*.20,-h*.86]){c.beginPath();c.moveTo(-w*.5,yy);c.lineTo(w*.5,yy);c.stroke();}
 c.strokeStyle='rgba(8,19,29,.58)';c.lineWidth=.0010;
 for(let row=0;row<11;row++){const y=-h*.19+row*h*.019;c.beginPath();c.moveTo(-w*.49,y);c.lineTo(w*.49,y+(random()-.5)*.001);c.stroke();}
 // Windows: warm glass, timber surround, crossbars and slatted shutters.
 for(const [x,y,ww,hh]of houseWindows(b)){
  c.fillStyle='#0a0e14';c.fillRect(x-.004,y-.004,ww+.008,hh+.008);g=c.createLinearGradient(x,y,x+ww,y+hh);g.addColorStop(0,'#fff0b4');g.addColorStop(.35,'#dcaa64');g.addColorStop(1,'#8d522f');c.fillStyle=g;c.fillRect(x,y,ww,hh);
  c.fillStyle='#14232b';for(let k=1;k<4;k++)c.fillRect(x+ww*k/4-.0008,y,.0016,hh);c.fillRect(x,y+hh*.48,ww,.0017);
  c.fillStyle='#17232c';c.fillRect(x-ww*.29,y-.002,ww*.24,hh+.004);c.fillRect(x+ww+.003,y-.002,ww*.24,hh+.004);
  c.strokeStyle='rgba(130,156,164,.35)';c.lineWidth=.0008;for(let k=1;k<6;k++){const yy=y+hh*k/6;c.beginPath();c.moveTo(x-ww*.27,yy);c.lineTo(x-.003,yy);c.moveTo(x+ww+.005,yy);c.lineTo(x+ww*1.23,yy);c.stroke();}
  c.fillStyle='#6d6048';c.fillRect(x-.005,y+hh,ww+.010,.0025);
 }
 const dw=w*.20,dh=h*.78;c.fillStyle='#080e15';c.fillRect(-dw*.42-.003,-dh-.003,dw+.006,dh+.003);
 if(!b.main){g=c.createLinearGradient(-dw*.42,-dh,dw*.58,0);g.addColorStop(0,'#a56a39');g.addColorStop(.6,'#ffd391');g.addColorStop(1,'#62482f');c.fillStyle=g;c.fillRect(-dw*.42,-dh,dw,dh);c.fillStyle='#16222a';c.fillRect(-dw*.42,-dh,dw*.16,dh);c.fillRect(-dw*.42,-dh*.52,dw,.002);}
 // Overhanging roof: shared silhouette, curved tile rows and offset channels.
 g=c.createLinearGradient(-w*.55,-h-r,w*.56,-h+.02);g.addColorStop(0,'#122331');g.addColorStop(.44,'#263f52');g.addColorStop(1,'#648396');c.fillStyle=g;poly(c,b.parts[2]);c.fill();
 c.save();poly(c,b.parts[2]);c.clip();
 c.fillStyle='rgba(1,8,16,.25)';poly(c,[[-w*.8,-h],[0,-h-r*1.3],[w*.01,-h-r*.05],[-w*.8,-h+.04]]);c.fill();
 for(let row=1;row<=9;row++){
  const f=row/9,y=-h-r*1.03+f*(r*1.05),left=-w*.57*f,right=w*.64*f;
  c.strokeStyle='rgba(1,9,17,.85)';c.lineWidth=.0021;c.beginPath();c.moveTo(left,y+.0015);c.quadraticCurveTo(0,y-.003,right,y+.0015);c.stroke();
  c.strokeStyle='rgba(169,205,222,.31)';c.lineWidth=.0008;c.beginPath();c.moveTo(left,y-.0004);c.quadraticCurveTo(0,y-.004,right,y-.0004);c.stroke();
  const n=4+row*2;for(let k=0;k<n;k++){const xx=left+(right-left)*(k+.5)/n;c.strokeStyle=k%3?'rgba(5,15,24,.55)':'rgba(172,204,217,.29)';c.lineWidth=.0009;c.beginPath();c.moveTo(xx,y-.009);c.quadraticCurveTo(xx+.002,y-.004,xx+.004,y);c.stroke();}
 }
 c.restore();c.strokeStyle='#101d29';c.lineWidth=.006;poly(c,b.parts[2]);c.stroke();c.strokeStyle='rgba(180,215,232,.65)';c.lineWidth=.0016;c.beginPath();c.moveTo(w*.035,-h-r*1.05);c.lineTo(w*.18,-h-r*.91);c.lineTo(w*.70,-h+.010);c.stroke();
 // Ridge caps and deep brackets under the eaves.
 c.strokeStyle='#86a4b4';c.lineWidth=.0038;c.beginPath();c.moveTo(-w*.13,-h-r*.97);c.lineTo(w*.035,-h-r*1.05);c.lineTo(w*.18,-h-r*.92);c.stroke();
 c.strokeStyle='#0b1721';c.lineWidth=.003;for(let k=0;k<6;k++){const xx=-w*.44+k*w*.174;c.beginPath();c.moveTo(xx,-h+.008);c.lineTo(xx+.008,-h+.019);c.lineTo(xx+.016,-h+.008);c.stroke();}
 if(b.chimney){const p=b.parts[3];c.fillStyle='#40515d';poly(c,p);c.fill();c.strokeStyle='#0b1822';c.lineWidth=.0018;for(let i=0;i<4;i++){const yy=p[0][1]-(i+1)*.009;c.beginPath();c.moveTo(w*.26,yy);c.lineTo(w*.34,yy);c.stroke();}c.fillStyle='#81919a';c.fillRect(w*.25,p[2][1]-.002,w*.10,.004);}
 if(b.kind==='tower'){
  c.fillStyle='#293c4c';poly(c,b.parts[b.chimney?4:3]);c.fill();c.fillStyle='#3b566b';poly(c,b.parts[b.chimney?5:4]);c.fill();c.strokeStyle='#9bb9c8';c.lineWidth=.0015;c.beginPath();c.moveTo(0,-h-r*1.92);c.lineTo(w*.46,-h-r*1.32);c.stroke();c.fillStyle='#e6b971';for(let k=-1;k<=1;k++)c.fillRect(k*w*.15-w*.045,-h-r*1.28,w*.09,r*.26);
 }
 if(b.fence){c.fillStyle='#20313e';for(const p of b.parts.slice(b.parts.length-5)){poly(c,p);c.fill();}c.strokeStyle='#7998a9';c.lineWidth=.001;c.beginPath();c.moveTo(-w,-.030);c.lineTo(-w*.53,-.030);c.stroke();}
 // Lantern, hanging sign and rain gutter: detail is baked, not regenerated each frame.
 c.strokeStyle='#121e28';c.lineWidth=.0022;c.beginPath();c.moveTo(w*.53,-h*.88);c.lineTo(w*.63,-h*.77);c.lineTo(w*.61,-h*.58);c.stroke();c.fillStyle='#d6ab65';c.beginPath();c.ellipse(w*.61,-h*.51,w*.023,h*.075,0,0,TAU);c.fill();c.fillStyle='#1c2528';c.fillRect(w*.58,-h*.60,w*.06,h*.025);c.fillRect(w*.58,-h*.44,w*.06,h*.020);
 c.fillStyle='#6b5b3e';c.fillRect(-w*.57,-h*.71,w*.05,h*.39);c.strokeStyle='#242b29';c.lineWidth=.0012;for(let k=0;k<3;k++){const yy=-h*.65+k*h*.09;c.beginPath();c.moveTo(-w*.561,yy);c.lineTo(-w*.533,yy+.004);c.moveTo(-w*.552,yy-.004);c.lineTo(-w*.548,yy+.008);c.stroke();}
}
function makeHouse(id,depth,sx,width=.28,wall=.112,roof=.090,kind='house'){
 const p=1/(1-depth),X=VPX+(sx-VPX)/p;
 const b={id,depth,X,width,wall,roof,kind,main:depth===0,door:true,chimney:id%3===0,fence:id%4===1};b.parts=houseParts(b);return b;
}
function bakeInn(){
 const u=state.u,d=state.dpr,b=mainHouse,pad=18,w=Math.ceil(b.width*u*2.1+pad*2),h=Math.ceil((b.wall+b.roof*1.35)*u+pad*2);
 island(cabin,geo.cabX*state.w-w*.5,HY*state.h-h+pad,w,h);
 const c=beginIsland(cabin);c.save();c.translate(geo.cabX*state.w,HY*state.h);c.scale(u,u);paintHouse(c,b);c.restore();
}
function setupVillage(){
 houseList.length=0;worldPlanes.length=0;
 mainHouse=makeHouse(0,0,geo.cabX,.29,.112,.090);mainHouse.main=true;mainHouse.chimney=true;mainHouse.fence=false;mainHouse.parts=houseParts(mainHouse);houseList.push(mainHouse);
 const specs=[{z:-.36,x:[.13,.86,.025],w:[.25,.28,.12],tower:2},{z:-.82,x:[.25,.48,.72]},{z:-1.45,x:[.10,.36,.61,.86]},{z:-2.4,x:[.20,.43,.67,.92]}];
 const pack=[[0,0,1024,384],[1024,0,1024,256],[1024,256,1024,256],[0,384,1024,256],[1024,512,1024,256]];
 const depths=[0,...specs.map(s=>s.z)];
 for(let i=0;i<5;i++)worldPlanes.push({z:depths[i],index:i,canvas:newCanvas(),rect:pack[i],houses:[],version:0});worldPlanes[0].houses.push(mainHouse);
 for(let i=0;i<specs.length;i++){const s=specs[i];for(let j=0;j<s.x.length;j++){const tower=s.tower===j,b=makeHouse(houseList.length,s.z,s.x[j],s.w?.[j]||(.255+(j%2)*.028),tower?.15:.112,tower?.070:.085,tower?'tower':'house');houseList.push(b);worldPlanes[i+1].houses.push(b);}}
 const u=state.u,W=state.w,H=state.h;
 for(const plane of worldPlanes){
  let x0=Infinity,x1=-Infinity,ymax=.01;
  for(const b of plane.houses)for(const part of b.parts)for(const [x,y]of part){x0=Math.min(x0,b.X+x*u/W);x1=Math.max(x1,b.X+x*u/W);ymax=Math.max(ymax,-y*u/H);}
  if(plane.index===0){x0=Math.min(x0,.22);x1=Math.max(x1,geo.chX+.19*u/W);ymax=Math.max(ymax,geo.rackH+.04,.30*u/H);}
  plane.world=[x0-.045,-.025,x1-x0+.090,ymax+.050];plane.canvas.width=plane.rect[2];plane.canvas.height=plane.rect[3];
  planeRects.set(plane.rect,plane.index*4);planeWorld.set(plane.world,plane.index*4);planeInfo.set([plane.z,plane.world[1]+plane.world[3],x0,x1],plane.index*4);
  drawWorldPlane(plane);plane.version++;
 }
 worldMaskVersion++;
 bakeVillageArt();bakeInn();
}
function drawWorldPlane(plane){
 const c=ctx2(plane.canvas),[x0,y0,ww,hh]=plane.world,W=plane.canvas.width,H=plane.canvas.height,sx=W/ww,sy=H/hh,u=state.u;
 c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,W,H);
 for(const b of plane.houses){c.save();c.setTransform(sx*u/state.w,0,0,sy*u/state.h,(b.X-x0)*sx,(y0+hh)*sy);paintHouseMask(c,b);c.restore();}
 if(plane.index===0){
  c.save();c.setTransform(sx/state.w,0,0,sy/state.h,-x0*sx,(y0+hh-HY)*sy);paintRack(c,true);paintCherryWood(c,true);
  const S=state.u,sh=-geo.chSway*state.w/(.22*S);c.save();c.transform(1,0,sh,1,geo.chX*state.w-.16*S-sh*.26*S,HY*state.h-.26*S);c.drawImage(occFoliage,0,0,occFoliage.width,occFoliage.height,0,0,.32*S,.28*S);c.restore();c.restore();
 }
}
function updateWorldOccluders(t){
 const p=worldPlanes[0];if(!p)return;drawWorldPlane(p);p.version++;worldMaskVersion++;
}
function bakeVillageArt(){
 const W=state.w,H=state.h,u=state.u,d=state.dpr,pad=100,y0=H*.36;
 sizeCanvas(villageFloor,W+2*pad,H*(HY-.36)+30,d,-pad,y0);
 const c=ctx2(villageFloor);c.setTransform(d,0,0,d,d*pad,-d*y0);
 const g=c.createLinearGradient(0,H*.43,0,HY*H);g.addColorStop(0,'rgba(15,29,42,0)');g.addColorStop(.20,'rgba(24,40,53,.68)');g.addColorStop(.44,'#273d4d');g.addColorStop(1,'#152837');c.fillStyle=g;c.fillRect(-pad,H*.43,W+2*pad,H*.33);
 // Retaining walls/terraces, all projected from the same receiver plane.
 for(const z of [-2.45,-1.46,-.83,-.37]){
  const [,y,p]=villageProject(VPX,0,z);c.fillStyle='#152735';c.fillRect(-pad,y,W+2*pad,.013*u*p);c.strokeStyle='rgba(135,167,184,.38)';c.lineWidth=Math.max(.7,.002*u*p);c.beginPath();c.moveTo(-pad,y);c.lineTo(W+pad,y);c.stroke();
  c.strokeStyle='rgba(3,13,23,.75)';c.lineWidth=Math.max(.6,.0014*u*p);for(let x=-pad;x<W+pad;x+=.05*u*p){c.beginPath();c.moveTo(x,y);c.lineTo(x+.006*u*p,y+.012*u*p);c.stroke();}
 }
 const random=rng(44471);
 for(let row=0;row<44;row++){
  const z=-2.9+row*(2.91/44),p=1/(1-z),roadX=VPX+.035*Math.sin(z*2.6),half=.13;
  for(let col=-4;col<=4;col++){
   const xx=roadX+col*.028+(row%2)*.014,zz=z+.012*(random()-.5),corners=[[xx-.013,zz-.026],[xx+.013,zz-.026],[xx+.012,zz+.025],[xx-.012,zz+.025]].map(v=>villageProject(v[0],0,v[1]));
   const k=random(),v=Math.floor(42+k*24);c.fillStyle=`rgb(${v-8},${v+8},${v+20})`;poly(c,corners.map(q=>[q[0],q[1]]));c.fill();c.strokeStyle='rgba(9,23,35,.68)';c.lineWidth=Math.max(.5,.001*u*p);c.stroke();
  }
 }
 for(const b of houseList.filter(b=>!b.main)){
  const [x,y,p]=villageProject(b.X,0,b.depth),r=.14*u*p;
  c.save();c.translate(x,y);c.scale(1,.23);const l=c.createRadialGradient(0,0,0,0,0,r);l.addColorStop(0,'rgba(211,136,66,.24)');l.addColorStop(.5,'rgba(156,91,47,.09)');l.addColorStop(1,'rgba(121,70,38,0)');c.fillStyle=l;c.fillRect(-r,-r,r*2,r*2);c.restore();
 }
 island(villageBody,-pad,y0,W+2*pad,H*(HY-.36)+30);island(villageGlow,-pad,y0,W+2*pad,H*(HY-.36)+30);
 const body=beginIsland(villageBody),emit=beginIsland(villageGlow);
 for(const b of houseList.filter(b=>!b.main).sort((a,b)=>a.depth-b.depth)){
  const [x,y,p]=villageProject(b.X,0,b.depth),s=u*p,margin=.035*s,ww=Math.ceil(b.width*s*2.15+margin*2),hh=Math.ceil((b.wall+b.roof*(b.kind==='tower'?2.05:1.35))*s+margin*2),sprite=newCanvas();sprite.width=Math.max(1,Math.ceil(ww*d));sprite.height=Math.max(1,Math.ceil(hh*d));
  const bc=ctx2(sprite),base=hh-margin;bc.setTransform(d*s,0,0,d*s,d*ww*.5,d*base);paintHouse(bc,b);
  // Atmospheric color is applied inside the silhouette, not as transparent walls.
  bc.setTransform(1,0,0,1,0,0);bc.globalCompositeOperation='source-atop';bc.fillStyle=`rgba(57,80,99,${Math.min(.47,-b.depth*.14)})`;bc.fillRect(0,0,sprite.width,sprite.height);bc.globalCompositeOperation='source-over';body.drawImage(sprite,x-ww*.5,y-base,ww,hh);sprite.width=1;sprite.height=1;
  emit.save();emit.translate(x,y);emit.scale(s,s);emit.globalAlpha=Math.exp(b.depth*.30)*.72;paintHouseEmission(emit,b);emit.restore();
 }
 // Small lantern cords bridge gaps; they remain a single baked layer.
 body.strokeStyle='rgba(4,15,25,.78)';body.lineWidth=Math.max(.7,u*.0015);
 for(const [z,x0,x1]of [[-.36,.08,.29],[-.82,.35,.61],[-1.45,.50,.78]]){
  const a=villageProject(VPX+(x0-VPX)*(1-z),.12*u/H,z),b=villageProject(VPX+(x1-VPX)*(1-z),.12*u/H,z);body.beginPath();body.moveTo(a[0],a[1]);body.quadraticCurveTo((a[0]+b[0])*.5,Math.max(a[1],b[1])+u*.025,a[0]+(b[0]-a[0]),b[1]);body.stroke();
  for(let i=1;i<5;i++){const f=i/5,x=a[0]+(b[0]-a[0])*f,y=a[1]+u*.05*f*(1-f),r=Math.max(1.3,u*.004*a[2]);body.fillStyle='#bd985e';body.beginPath();body.ellipse(x,y+r*1.2,r,r*1.45,0,0,TAU);body.fill();radial(emit,x,y+r*1.2,r*4,[[0,'rgba(255,201,119,.55)'],[.28,'rgba(230,140,56,.15)'],[1,'rgba(190,90,30,0)']]);}
 }
}
function bakeVillageFogMask(){
 villageFogMask.width=occCanvas.width;villageFogMask.height=occCanvas.height;const c=ctx2(villageFogMask),sx=occCanvas.width/state.w,sy=occCanvas.height/(HY*state.h);
 for(const b of houseList.filter(b=>!b.main)){
  const [x,y,p]=villageProject(b.X,0,b.depth);c.save();c.setTransform(sx*state.u*p,0,0,sy*state.u*p,sx*x,sy*y);paintHouseMask(c,b);c.restore();
 }
}
function updateVillageGlow(t){villageGlowAlpha=.88+.06*Math.sin(t*2.1)+.035*Math.sin(t*5.7+.9);villageGlow.style.opacity=villageGlowAlpha.toFixed(3);}
function setPlaneShadowBounds(ax,ay,soft){
 for(const p of worldPlanes){const maxD=p.infoMaxD=p.world[3]/Math.max(.035,ay-soft),xmin=p.infoMinX=p.world[0]-Math.max(0,(ax+soft/(state.w/state.h))*maxD),xmax=p.infoMaxX=p.world[0]+p.world[2]-Math.min(0,(ax-soft/(state.w/state.h))*maxD);planeBounds.set([xmin,xmax,p.z,p.z+maxD],p.index*4);}
}
