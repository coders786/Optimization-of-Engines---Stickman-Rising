// Retained detailed inn only. No background buildings, village canvases or caster atlas.
const SCENE_KIND="minimalist-mountains",BACKGROUND_BUILDINGS=0,MOUNTAIN_RIDGES=4;
function poly(c,p){c.beginPath();for(let i=0;i<p.length;i++)i?c.lineTo(...p[i]):c.moveTo(...p[i]);c.closePath();}
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

const mainHouse={id:0,width:.29,wall:.112,roof:.090,kind:'inn',main:true,door:true,chimney:true,fence:false};mainHouse.parts=houseParts(mainHouse);
function bakeInn(){
 const u=state.u,d=state.dpr,b=mainHouse,pad=18,w=Math.ceil(b.width*u*2.1+pad*2),h=Math.ceil((b.wall+b.roof*1.35)*u+pad*2);
 island(cabin,geo.cabX*state.w-w*.5,HY*state.h-h+pad,w,h);
 const c=beginIsland(cabin);c.save();c.translate(geo.cabX*state.w,HY*state.h);c.scale(u,u);paintHouse(c,b);c.restore();
}
