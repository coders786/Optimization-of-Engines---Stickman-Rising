 initNativeShadows(){
  const g=this.gl;this.nativeShadowPrograms=this.nativeShadowPrograms||new Map();
  const tex=this.texture(deck.width,deck.height,this.floatTargets?g.R32F:g.RGBA8,this.floatTargets?g.RED:g.RGBA,this.floatTargets?g.FLOAT:g.UNSIGNED_BYTE),fbo=g.createFramebuffer();
  g.bindTexture(g.TEXTURE_2D,tex);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.NEAREST);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.NEAREST);
  g.bindFramebuffer(g.FRAMEBUFFER,fbo);g.framebufferTexture2D(g.FRAMEBUFFER,g.COLOR_ATTACHMENT0,g.TEXTURE_2D,tex,0);
  if(g.checkFramebufferStatus(g.FRAMEBUFFER)!==g.FRAMEBUFFER_COMPLETE)throw Error('Native shadow framebuffer unavailable');
  this.shadowVisibility={tex,fbo,w:deck.width,h:deck.height};this.targets.push(this.shadowVisibility);
  if(this.floatTargets){
   const rt=this.texture(10,deck.height,g.RGBA32F,g.RGBA,g.FLOAT),rf=g.createFramebuffer();g.bindTexture(g.TEXTURE_2D,rt);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.NEAREST);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.NEAREST);g.bindFramebuffer(g.FRAMEBUFFER,rf);g.framebufferTexture2D(g.FRAMEBUFFER,g.COLOR_ATTACHMENT0,g.TEXTURE_2D,rt,0);if(g.checkFramebufferStatus(g.FRAMEBUFFER)!==g.FRAMEBUFFER_COMPLETE)throw Error('Shadow row framebuffer unavailable');this.shadowRowTarget={tex:rt,fbo:rf,w:10,h:deck.height};this.targets.push(this.shadowRowTarget);this.initNativeVariant(this.shadowRows);
  }
  for(const p of [this.nativeDeck,this.nativeVillage]){g.useProgram(p.p);g.uniform1i(p.u.u_shadowVisibility,14);g.uniform1i(p.u.u_shadowPacked,this.floatTargets?0:1);}
  // A resize changes atlas mapping / DPR; refresh cached variant constants.
  for(const p of this.nativeShadowPrograms.values())this.initNativeVariant(p);
 }
 initNativeVariant(p){
  const g=this.gl,u=p.u;g.useProgram(p.p);g.uniform1i(u.u_worldMask,11);g.uniform1i(u.u_intervalTex,12);g.uniform1i(u.u_noiseTex,1);g.uniform1i(u.u_rowTable,15);g.uniform1i(u.u_shadowPacked,this.floatTargets?0:1);g.uniform1f(u.u_aspect,state.w/state.h);g.uniform2f(u.u_worldAtlasSize,WORLD_ATLAS_W,WORLD_ATLAS_H);g.uniform2fv(u['u_guardOrigins[0]'],this.guardOrigins);
  for(let i=0;i<5;i++)for(const [name,values]of [['u_planeTiles',planeRects],['u_maskMap',this.maskMap],['u_planeInfo',planeInfo]]){
   const k=i*4;g.uniform4f(g.getUniformLocation(p.p,name+'['+i+']'),values[k],values[k+1],values[k+2],values[k+3]);
  }
 }
 nativeVariant(mask){
  if(this.nativeShadowPrograms.has(mask))return this.nativeShadowPrograms.get(mask);
  const g=this.gl,vs=this.shader(g.VERTEX_SHADER,VERT),p=this.program(vs,nativeShadowFS(mask,this.floatTargets));g.deleteShader(vs);p.shadowSubset=mask;this.initNativeVariant(p);this.nativeShadowPrograms.set(mask,p);return p;
 }
 renderNativeShadows(t,mx,my){
  const g=this.gl,W=deck.width,H=deck.height,rows=Math.max(0,Math.min(H,Math.round((1-HY+state.camNY*.72)*H))),end=Math.max(rows,Math.min(H,Math.ceil((.56+state.camNY*.72)*H-.5)));
  if(this.floatTargets){this.bind(15,null);g.bindFramebuffer(g.FRAMEBUFFER,this.shadowRowTarget.fbo);g.viewport(0,0,10,H);g.disable(g.SCISSOR_TEST);this.common(this.shadowRows,t,mx,my);g.uniform1f(this.shadowRows.u.u_shadowDeckRows,rows);g.drawArrays(g.TRIANGLES,0,3);this.bind(15,this.shadowRowTarget.tex);}
  g.bindFramebuffer(g.FRAMEBUFFER,this.shadowVisibility.fbo);g.viewport(0,0,W,H);g.disable(g.SCISSOR_TEST);g.clearColor(1,1,1,1);g.clear(g.COLOR_BUFFER_BIT);g.enable(g.SCISSOR_TEST);this.bind(11,this.worldMaskTexture);this.bind(12,this.intervalTarget.tex);this.bind(1,this.noise);
  const bands=[];for(let y=0;y<end;y++){
   const sy=1-(y+.5)/H+state.camNY*.72,z=1-1/(1+(sy-HY)/(HY-VPY));let mask=0;
   // This CPU broad phase is padded by .001 world-depth. The shader still
   // applies the original exact bounds; padding only creates redundant work.
   for(let i=0;i<5;i++)if(z>=planeBounds[i*4+2]-.001&&z<=planeBounds[i*4+3]+.001)mask|=1<<i;
   if(!bands.length||bands[bands.length-1].mask!==mask)bands.push({start:y,end:y+1,mask});else bands[bands.length-1].end=y+1;
  }
  this.lastShadowBands=bands;
  for(const b of bands)if(b.mask){const p=this.nativeVariant(b.mask);this.common(p,t,mx,my);g.uniform1f(p.u.u_shadowDeckRows,rows);g.scissor(0,b.start,W,b.end-b.start);g.drawArrays(g.TRIANGLES,0,3);}
  g.disable(g.SCISSOR_TEST);g.bindFramebuffer(g.FRAMEBUFFER,null);g.viewport(0,0,W,H);this.bind(14,this.shadowVisibility.tex);
 }
