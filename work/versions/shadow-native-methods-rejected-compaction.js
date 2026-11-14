 initNativeShadows(){
  const g=this.gl;if(this.shadowSATTexture)g.deleteTexture(this.shadowSATTexture);this.bind(12,null);this.shadowSATTexture=this.texture(WORLD_ATLAS_W,WORLD_ATLAS_H,g.R32UI,g.RED_INTEGER,g.UNSIGNED_INT);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.NEAREST);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.NEAREST);this.satVersions=new Int32Array(5);this.satVersions.fill(-1);this.satUploads=0;this.satCpuMs=0;this.nativeShadowPrograms=this.nativeShadowPrograms||new Map();
  const tex=this.texture(deck.width,deck.height,this.floatTargets?g.R32F:g.RGBA8,this.floatTargets?g.RED:g.RGBA,this.floatTargets?g.FLOAT:g.UNSIGNED_BYTE),fbo=g.createFramebuffer();
  g.bindTexture(g.TEXTURE_2D,tex);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.NEAREST);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.NEAREST);
  g.bindFramebuffer(g.FRAMEBUFFER,fbo);g.framebufferTexture2D(g.FRAMEBUFFER,g.COLOR_ATTACHMENT0,g.TEXTURE_2D,tex,0);
  if(g.checkFramebufferStatus(g.FRAMEBUFFER)!==g.FRAMEBUFFER_COMPLETE)throw Error('Native shadow framebuffer unavailable');
  this.shadowVisibility={tex,fbo,w:deck.width,h:deck.height};this.targets.push(this.shadowVisibility);
  if(this.floatTargets){
   const rt=this.texture(10,deck.height,g.RGBA32F,g.RGBA,g.FLOAT),rf=g.createFramebuffer();g.bindTexture(g.TEXTURE_2D,rt);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.NEAREST);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.NEAREST);g.bindFramebuffer(g.FRAMEBUFFER,rf);g.framebufferTexture2D(g.FRAMEBUFFER,g.COLOR_ATTACHMENT0,g.TEXTURE_2D,rt,0);if(g.checkFramebufferStatus(g.FRAMEBUFFER)!==g.FRAMEBUFFER_COMPLETE)throw Error('Shadow row framebuffer unavailable');this.shadowRowTarget={tex:rt,fbo:rf,w:10,h:deck.height};this.targets.push(this.shadowRowTarget);this.initNativeVariant(this.shadowRows);
   const jt=this.texture(deck.width,deck.height,g.R32F,g.RED,g.FLOAT),jf=g.createFramebuffer();g.bindTexture(g.TEXTURE_2D,jt);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.NEAREST);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.NEAREST);g.bindFramebuffer(g.FRAMEBUFFER,jf);g.framebufferTexture2D(g.FRAMEBUFFER,g.COLOR_ATTACHMENT0,g.TEXTURE_2D,tex,0);g.framebufferTexture2D(g.FRAMEBUFFER,g.COLOR_ATTACHMENT1,g.TEXTURE_2D,jt,0);g.drawBuffers([g.COLOR_ATTACHMENT0,g.COLOR_ATTACHMENT1]);if(g.checkFramebufferStatus(g.FRAMEBUFFER)!==g.FRAMEBUFFER_COMPLETE)throw Error('Shadow jitter framebuffer unavailable');this.shadowJitterTarget={tex:jt,fbo:jf,w:deck.width,h:deck.height};this.targets.push(this.shadowJitterTarget);this.initNativeVariant(this.shadowJitter);
   this.shadowTileSize=state.shadowTileSize||4;const tw=Math.ceil(deck.width/this.shadowTileSize),th=Math.ceil(deck.height/this.shadowTileSize),tt=this.texture(tw,th,g.RGBA32F,g.RGBA,g.FLOAT),tf=g.createFramebuffer();g.bindTexture(g.TEXTURE_2D,tt);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.NEAREST);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.NEAREST);g.bindFramebuffer(g.FRAMEBUFFER,tf);g.framebufferTexture2D(g.FRAMEBUFFER,g.COLOR_ATTACHMENT0,g.TEXTURE_2D,tt,0);if(g.checkFramebufferStatus(g.FRAMEBUFFER)!==g.FRAMEBUFFER_COMPLETE)throw Error('Shadow proof framebuffer unavailable');this.shadowTileTarget={tex:tt,fbo:tf,w:tw,h:th};this.targets.push(this.shadowTileTarget);this.initNativeVariant(this.shadowTiles);
  }
  for(const p of [this.nativeDeck,this.nativeVillage]){g.useProgram(p.p);g.uniform1i(p.u.u_shadowVisibility,14);g.uniform1i(p.u.u_shadowPacked,this.floatTargets?0:1);}
  // A resize changes atlas mapping / DPR; refresh cached variant constants.
  for(const p of this.nativeShadowPrograms.values())this.initNativeVariant(p);
 }
 initNativeVariant(p){
  const g=this.gl,u=p.u;g.useProgram(p.p);g.uniform1i(u.u_worldMask,11);g.uniform1i(u.u_intervalTex,12);g.uniform1i(u.u_noiseTex,1);g.uniform1i(u.u_shadowJitter,6);g.uniform1i(u.u_rowTable,15);g.uniform1i(u.u_shadowTiles,13);g.uniform1i(u.u_shadowSAT,12);g.uniform1f(u.u_shadowTileSize,this.shadowTileSize||8);g.uniform2f(u.u_shadowSize,deck.width,deck.height);g.uniform1i(u.u_shadowPacked,this.floatTargets?0:1);g.uniform1f(u.u_aspect,state.w/state.h);g.uniform2f(u.u_worldAtlasSize,WORLD_ATLAS_W,WORLD_ATLAS_H);g.uniform2fv(u['u_guardOrigins[0]'],this.guardOrigins);
  for(let i=0;i<5;i++)for(const [name,values]of [['u_planeTiles',planeRects],['u_maskMap',this.maskMap],['u_planeInfo',planeInfo]]){
   const k=i*4;g.uniform4f(g.getUniformLocation(p.p,name+'['+i+']'),values[k],values[k+1],values[k+2],values[k+3]);
  }
 }
 nativeVariant(mask){
  const key=mask+(state.shadowMode===2?32:0);if(this.nativeShadowPrograms.has(key))return this.nativeShadowPrograms.get(key);
  const g=this.gl,vs=this.shader(g.VERTEX_SHADER,this.floatTargets&&state.shadowMode===2?SHADOW_TILE_VERT:VERT),p=this.program(vs,nativeShadowFS(mask,this.floatTargets,state.shadowMode===2));g.deleteShader(vs);p.shadowSubset=mask;this.initNativeVariant(p);this.nativeShadowPrograms.set(key,p);return p;
 }
 renderNativeShadows(t,mx,my){
  const g=this.gl,W=deck.width,H=deck.height,rows=Math.max(0,Math.min(H,Math.round((1-HY+state.camNY*.72)*H))),end=Math.max(rows,Math.min(H,Math.ceil((.56+state.camNY*.72)*H-.5)));
  this.bind(11,this.worldMaskTexture);this.bind(12,this.intervalTarget.tex);this.bind(1,this.noise);
  if(this.floatTargets){this.bind(15,null);g.bindFramebuffer(g.FRAMEBUFFER,this.shadowRowTarget.fbo);g.viewport(0,0,10,H);g.disable(g.SCISSOR_TEST);this.common(this.shadowRows,t,mx,my);g.uniform1f(this.shadowRows.u.u_shadowDeckRows,rows);g.drawArrays(g.TRIANGLES,0,3);this.bind(15,this.shadowRowTarget.tex);
   if(state.shadowMode===2){this.bind(12,this.shadowSATTexture);this.bind(13,null);g.bindFramebuffer(g.FRAMEBUFFER,this.shadowTileTarget.fbo);g.viewport(0,0,this.shadowTileTarget.w,this.shadowTileTarget.h);g.enable(g.SCISSOR_TEST);g.scissor(0,0,this.shadowTileTarget.w,Math.ceil(end/this.shadowTileSize));this.common(this.shadowTiles,t,mx,my);g.uniform1f(this.shadowTiles.u.u_shadowDeckRows,rows);g.drawArrays(g.TRIANGLES,0,3);this.bind(13,this.shadowTileTarget.tex);}
  }
  if(this.floatTargets&&state.shadowMode===2){this.bind(6,null);this.bind(14,null);g.bindFramebuffer(g.FRAMEBUFFER,this.shadowJitterTarget.fbo);g.viewport(0,0,W,H);g.enable(g.SCISSOR_TEST);g.scissor(0,0,W,end);this.common(this.shadowJitter,t,mx,my);g.uniform1f(this.shadowJitter.u.u_shadowDeckRows,rows);g.drawArrays(g.TRIANGLES,0,3);this.bind(6,this.shadowJitterTarget.tex);}
  g.bindFramebuffer(g.FRAMEBUFFER,this.shadowVisibility.fbo);g.viewport(0,0,W,H);g.disable(g.SCISSOR_TEST);if(!this.floatTargets||state.shadowMode!==2){g.clearColor(1,1,1,1);g.clear(g.COLOR_BUFFER_BIT);}g.enable(g.SCISSOR_TEST);this.bind(11,this.worldMaskTexture);this.bind(12,this.intervalTarget.tex);this.bind(1,this.noise);
  const bands=[];for(let y=0;y<end;y++){
   const sy=1-(y+.5)/H+state.camNY*.72,z=1-1/(1+(sy-HY)/(HY-VPY));let mask=0;
   // This CPU broad phase is padded by .001 world-depth. The shader still
   // applies the original exact bounds; padding only creates redundant work.
   for(let i=0;i<5;i++)if(z>=planeBounds[i*4+2]-.001&&z<=planeBounds[i*4+3]+.001)mask|=1<<i;
   if(!bands.length||bands[bands.length-1].mask!==mask)bands.push({start:y,end:y+1,mask});else bands[bands.length-1].end=y+1;
  }
  this.lastShadowBands=bands;
  for(const b of bands)if(b.mask){const p=this.nativeVariant(b.mask);this.common(p,t,mx,my);g.uniform1f(p.u.u_shadowDeckRows,rows);g.scissor(0,b.start,W,b.end-b.start);if(this.floatTargets&&state.shadowMode===2){const first=Math.floor(b.start/this.shadowTileSize),last=Math.ceil(b.end/this.shadowTileSize);g.uniform1f(p.u.u_shadowTileRowStart,first);g.drawArraysInstanced(g.TRIANGLES,0,6,this.shadowTileTarget.w*(last-first));}else g.drawArrays(g.TRIANGLES,0,3);}
  g.disable(g.SCISSOR_TEST);g.bindFramebuffer(g.FRAMEBUFFER,null);g.viewport(0,0,W,H);this.bind(14,this.shadowVisibility.tex);
 }

 updateShadowSAT(){
  const g=this.gl,start=performance.now();this.bind(12,this.shadowSATTexture);
  for(const p of worldPlanes)if(this.satVersions[p.index]!==p.version){
   const [x,y,w,h]=p.rect,data=ctx2(p.canvas).getImageData(0,0,w,h).data;
   if(!p.prefix||p.prefix.length!==w*h)p.prefix=new Uint32Array(w*h);
   const a=p.prefix;for(let j=0;j<h;j++){let row=0;const base=j*w,prev=base-w;for(let i=0;i<w;i++){const k=(base+i)*4,r=data[k],green=data[k+1],alpha=data[k+3];row+=(r===255&&alpha===255)?2:alpha>0&&(r>0||green>0)?1:0;a[base+i]=row+(j?a[prev+i]:0);}}
   g.pixelStorei(g.UNPACK_ALIGNMENT,4);g.texSubImage2D(g.TEXTURE_2D,0,x,y,w,h,g.RED_INTEGER,g.UNSIGNED_INT,a);this.satVersions[p.index]=p.version;this.satUploads++;
  }
  this.satCpuMs=performance.now()-start;
 }
