 initAuroraColumns(){
  if(!this.floatTargets)return;const g=this.gl,tex=this.texture(deck.width,2,g.RGBA32F,g.RGBA,g.FLOAT),fbo=g.createFramebuffer();g.bindTexture(g.TEXTURE_2D,tex);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.NEAREST);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.NEAREST);g.bindFramebuffer(g.FRAMEBUFFER,fbo);g.framebufferTexture2D(g.FRAMEBUFFER,g.COLOR_ATTACHMENT0,g.TEXTURE_2D,tex,0);if(g.checkFramebufferStatus(g.FRAMEBUFFER)!==g.FRAMEBUFFER_COMPLETE)throw Error('Aurora column framebuffer unavailable');this.auroraColumnTarget={tex,fbo,w:deck.width,h:2};this.targets.push(this.auroraColumnTarget);
  for(const p of [this.columnSky,this.columnHigh]){g.useProgram(p.p);g.uniform1i(p.u.u_auroraColumns,13);}
 }
 renderAuroraColumns(t,mx,my){
  const g=this.gl;this.bind(13,null);g.bindFramebuffer(g.FRAMEBUFFER,this.auroraColumnTarget.fbo);g.viewport(0,0,deck.width,2);g.disable(g.SCISSOR_TEST);this.common(this.auroraColumns,t,mx,my);g.drawArrays(g.TRIANGLES,0,3);g.bindFramebuffer(g.FRAMEBUFFER,null);g.viewport(0,0,deck.width,deck.height);this.bind(13,this.auroraColumnTarget.tex);
 }
