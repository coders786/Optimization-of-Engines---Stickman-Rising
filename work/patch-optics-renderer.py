from pathlib import Path
p=Path('/home/user/moonlit-sakura-optics.html');s=p.read_text()
def replace(a,b):
 global s
 assert s.count(a)==1,(s.count(a),a[:150])
 s=s.replace(a,b)
replace('this.media=this.program(vs,MEDIA_FS);this.sky=', 'this.media=this.program(vs,MEDIA_FS);this.fogPass=this.program(vs,FOG_FS);this.sky=')
replace('this.moonTexture=null;this.occW=0;', 'this.moonTexture=null;this.skyTexture=null;this.reflectionTexture=null;this.fogTarget=null;this.lastFogTime=-100;this.lastReflectionVersion=-1;this.occW=0;')
replace("'u_moonTex','u_moonAtlasSize'];", "'u_moonTex','u_moonAtlasSize','u_fogTex','u_fogCached','u_wind','u_skyTex','u_reflectionTex','u_skyAtlas','u_reflectionBounds','u_waves[0]'];")
replace('target(w,h,density){const g=this.gl;let internal=this.floatTargets?(density?g.R16F:g.RGBA16F):g.RGBA8,format=this.floatTargets?(density?g.RED:g.RGBA):g.RGBA,type=this.floatTargets?g.HALF_FLOAT:g.UNSIGNED_BYTE,', 'target(w,h,density,byte=false){const g=this.gl,useFloat=this.floatTargets&&!byte;let internal=useFloat?(density?g.R16F:g.RGBA16F):g.RGBA8,format=useFloat?(density?g.RED:g.RGBA):g.RGBA,type=useFloat?g.HALF_FLOAT:g.UNSIGNED_BYTE,')
replace('g.bindFramebuffer(g.FRAMEBUFFER,null);if(this.occluder)', '''this.fogTarget=this.target(state.fogWidth||(high?768:512),state.fogHeight||(high?288:192),false,true);this.targets.push(this.fogTarget);
  g.bindFramebuffer(g.FRAMEBUFFER,null);
  if(this.skyTexture)g.deleteTexture(this.skyTexture);if(this.reflectionTexture)g.deleteTexture(this.reflectionTexture);
  this.skyTexture=this.canvasTexture(sky);this.reflectionTexture=this.texture(reflectionCanvas.width,reflectionCanvas.height,g.RGBA8,g.RGBA,g.UNSIGNED_BYTE);
  this.lastReflectionVersion=-1;this.lastFogTime=-100;
  if(this.occluder)''')
replace('g.uniform1i(u.u_media1,5);g.uniform2f(u.u_densityDecode', 'g.uniform1i(u.u_media1,5);g.uniform1i(u.u_fogTex,7);g.uniform2f(u.u_densityDecode')
replace('g.useProgram(this.deck.p);g.uniform1i(this.deck.u.u_moonTex,6);', '''g.useProgram(this.fogPass.p);g.uniform1i(this.fogPass.u.u_occluderTex,0);g.uniform1i(this.fogPass.u.u_noiseTex,1);g.uniform1f(this.fogPass.u.u_aspect,state.w/state.h);
  g.useProgram(this.deck.p);g.uniform1i(this.deck.u.u_skyTex,8);g.uniform1i(this.deck.u.u_reflectionTex,9);
  const pad=PADS.sky;g.uniform4f(this.deck.u.u_skyAtlas,pad.x*state.dpr/sky.width,pad.y*state.dpr/sky.height,state.w*state.dpr/sky.width,state.h*state.dpr/sky.height);
  g.uniform4fv(this.deck.u.u_reflectionBounds,reflectionBounds);g.uniform4fv(this.deck.u['u_waves[0]'],waveData);
  g.uniform1i(this.deck.u.u_moonTex,6);''')
marker=' densityKey(slot,t){'
assert s.count(marker)==1
new=''' canvasTexture(canvas){
  const g=this.gl,t=this.texture(canvas.width,canvas.height,g.RGBA8,g.RGBA,g.UNSIGNED_BYTE);
  g.pixelStorei(g.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);g.texSubImage2D(g.TEXTURE_2D,0,0,0,g.RGBA,g.UNSIGNED_BYTE,canvas);g.pixelStorei(g.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);return t;
 }
 fogKey(t,mx,my,occluderChanged){
  if(!state.fogCached)return;
  const moved=Math.abs(mx-this.fogMX)+Math.abs(my-this.fogMY)>.0001;
  if(!occluderChanged&&!state.draggingMoon&&!moved&&t-this.lastFogTime<1/30)return;
  const g=this.gl,target=this.fogTarget;
  g.disable(g.SCISSOR_TEST);this.bind(7,null);g.bindFramebuffer(g.FRAMEBUFFER,target.fbo);g.viewport(0,0,target.w,target.h);
  this.common(this.fogPass,t,mx,my);g.drawArrays(g.TRIANGLES,0,3);
  this.fogMX=mx;this.fogMY=my;this.lastFogTime=t;
 }
 densityKey(slot,t){'''
s=s.replace(marker,new)
replace('g.uniform1f(p.u.u_time,t);g.uniform1f(p.u.u_aspect', 'g.uniform1f(p.u.u_time,t);g.uniform4fv(p.u.u_wind,windAt(t,windKey));g.uniform1f(p.u.u_aspect')
replace('updateKeys(t,mx,my){const g=this.gl,step=1/state.cacheHz;', 'updateKeys(t,mx,my){if(this.keyWind!==state.windStrength){this.cacheValid=false;this.keyWind=state.windStrength;}const g=this.gl,step=1/state.cacheHz;')
replace('g.uniform1f(u.u_cacheBlend,this.blend);}', 'g.uniform1f(u.u_cacheBlend,this.blend);g.uniform4fv(u.u_wind,windNow);g.uniform1i(u.u_fogCached,state.fogCached?1:0);}')
replace('my=.5+(state.moonY-.5)*breath;this.beginTiming();', 'my=.5+(state.moonY-.5)*breath;updateReflectionAtlas(t);this.beginTiming();')
replace('this.bind(0,this.occluder);if(occDirty){', 'this.bind(0,this.occluder);const occluderChanged=occDirty;if(occDirty){')
replace('this.bind(1,this.noise);this.bind(2,this.a.density.tex);', '''this.bind(1,this.noise);
  this.fogKey(t,mx,my,occluderChanged);g.bindFramebuffer(g.FRAMEBUFFER,null);g.viewport(0,0,deck.width,deck.height);
  this.bind(9,this.reflectionTexture);
  if(this.lastReflectionVersion!==reflectionVersion){g.pixelStorei(g.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);g.texSubImage2D(g.TEXTURE_2D,0,0,0,g.RGBA,g.UNSIGNED_BYTE,reflectionCanvas);g.pixelStorei(g.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);this.lastReflectionVersion=reflectionVersion;}
  this.bind(0,this.occluder);this.bind(1,this.noise);this.bind(2,this.a.density.tex);''')
replace('this.bind(6,this.moonTexture);\n  const rows=', 'this.bind(6,this.moonTexture);this.bind(7,this.fogTarget.tex);this.bind(8,this.skyTexture);\n  const rows=')
replace('windStrength:1,pointerX:', 'windStrength:1,windOffsetX:0,windOffsetY:0,pointerX:')
replace("$('rng-wind').addEventListener('input',e=>{state.windStrength=+e.target.value;});", "$('rng-wind').addEventListener('input',e=>{windAt(state.time,windNow);const x=windNow[2],y=windNow[3];state.windStrength=+e.target.value;windAt(state.time,windKey);state.windOffsetX+=x-windKey[2];state.windOffsetY+=y-windKey[3];updateWind(state.time);if(renderer)renderer.cacheValid=false;});")
# Analytic displacement remains continuous across an interactive speed change.
replace('out[2]=s*(-.60*t+.18/.37*(Math.cos(.37*t)-1)+.07/.91*(Math.cos(.91*t+1.3)-Math.cos(1.3)));', 'out[2]=s*(-.60*t+.18/.37*(Math.cos(.37*t)-1)+.07/.91*(Math.cos(.91*t+1.3)-Math.cos(1.3)))+state.windOffsetX;')
replace('out[3]=s*(.23*t-.10/.23*(Math.cos(.23*t+.6)-Math.cos(.6)));', 'out[3]=s*(.23*t-.10/.23*(Math.cos(.23*t+.6)-Math.cos(.6)))+state.windOffsetY;')
p.write_text(s)
Path('/home/user/candidate-check.js').write_text(s.split('<script>',1)[1].split('</script>',1)[0])
print('Patched renderer',len(s),'characters')
