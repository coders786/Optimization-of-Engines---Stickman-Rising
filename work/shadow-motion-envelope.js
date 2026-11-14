// A kinematic uncertainty envelope replaces repeated Canvas pixel reads.
// Prefix codes are static: 0 / 2 are certified clear / opaque, while every
// texel that moving geometry could ever touch is permanently 1 (uncertain).
// The real mask keeps animating. Uncertainty always retains the 12 real rays.
function nearMotionEnvelope(p,maxWind){
 const [,,w,h]=p.rect,canvas=Object.assign(newCanvas(),{_isShadowMask:true});canvas.width=w;canvas.height=h;
 drawWorldPlane({...p,canvas,houses:[]});const pixels=ctx2(canvas).getImageData(0,0,w,h).data;
 const rack=.0028+.0018*.85*maxWind,cherry=.0024+.0015*.85*maxWind;
 const dx=2*Math.max(rack,cherry*(.26/.22))*state.w+.009*state.u,dy=.0036*state.h+.009*state.u;
 const rx=Math.ceil(dx/state.w*w/p.world[2])+3,ry=Math.ceil(dy/state.h*h/p.world[3])+3;
 const horizontal=new Uint8Array(w*h),envelope=new Uint8Array(w*h);
 // Separable exact binary dilation. The extra stroke-width/cap and three
 // source-texel padding is conservative, never an opacity approximation.
 for(let y=0;y<h;y++){
  const base=y*w;let count=0;
  for(let x=0;x<Math.min(w,rx);x++)if(pixels[(base+x)*4+3]>0)count++;
  for(let x=0;x<w;x++){
   const add=x+rx,drop=x-rx-1;if(add<w&&pixels[(base+add)*4+3]>0)count++;if(drop>=0&&pixels[(base+drop)*4+3]>0)count--;horizontal[base+x]=count>0?1:0;
  }
 }
 for(let x=0;x<w;x++){
  let count=0;for(let y=0;y<Math.min(h,ry);y++)count+=horizontal[y*w+x];
  for(let y=0;y<h;y++){const add=y+ry,drop=y-ry-1;if(add<h)count+=horizontal[add*w+x];if(drop>=0)count-=horizontal[drop*w+x];envelope[y*w+x]=count>0?1:0;}
 }
 canvas.width=canvas.height=1;p.envelopeWind=maxWind;p.envelopeRadius=[rx,ry];return envelope;
}
