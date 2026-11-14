 initNativeFog(){
  if(!this.floatTargets)return;
  const g=this.gl,tex=this.texture(deck.width,deck.height,g.RG32F,g.RG,g.FLOAT),fbo=g.createFramebuffer();g.bindTexture(g.TEXTURE_2D,tex);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.NEAREST);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.NEAREST);g.bindFramebuffer(g.FRAMEBUFFER,fbo);g.framebufferTexture2D(g.FRAMEBUFFER,g.COLOR_ATTACHMENT0,g.TEXTURE_2D,tex,0);if(g.checkFramebufferStatus(g.FRAMEBUFFER)!==g.FRAMEBUFFER_COMPLETE)throw Error('Native fog framebuffer unavailable');this.nativeFogTarget={tex,fbo,w:deck.width,h:deck.height};this.targets.push(this.nativeFogTarget);
  for(const p of [this.refinedSky,this.refinedVillage]){g.useProgram(p.p);g.uniform1i(p.u.u_nativeFog,15);}
 }
 renderNativeFog(t,mx,my){
  const g=this.gl,H=deck.height,rows=Math.max(0,Math.min(H,Math.round((1-HY+state.camNY*.72)*H))),end=Math.max(rows,Math.min(H,Math.ceil((.64+state.camNY*.72)*H-.5)));
  this.bind(15,null);g.bindFramebuffer(g.FRAMEBUFFER,this.nativeFogTarget.fbo);g.viewport(0,0,deck.width,H);g.enable(g.SCISSOR_TEST);g.scissor(0,rows,deck.width,end-rows);this.bind(0,this.occluder);this.bind(1,this.noise);this.bind(7,this.fogTarget.tex);this.common(this.nativeFogPass,t,mx,my);g.drawArrays(g.TRIANGLES,0,3);g.disable(g.SCISSOR_TEST);g.bindFramebuffer(g.FRAMEBUFFER,null);this.bind(15,this.nativeFogTarget.tex);
 }
