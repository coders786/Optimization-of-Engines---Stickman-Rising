from pathlib import Path
root=Path('/home/user');s=(root/'versions/moonlit-sakura-before-optics.html').read_text()
def replace(a,b):
 global s
 assert s.count(a)==1,(s.count(a),a[:150])
 s=s.replace(a,b)
replace('Seamless Lightfield Edition','Wind & Water Optics Edition')
replace('cacheHz:30,pointerX:', 'cacheHz:30,fogCached:true,fogWidth:0,windStrength:1,pointerX:')
# Keep source statements honestly scoped to the 2.5D scene.
replace('   No particle-count, octave, PCF-tap or output-resolution governor is used.', '''   Optics additions: scene-space visibility sheet (with direct reference),
   a low-frequency reflection postage atlas, shared analytic wind, and a baked
   regolith/crater surface. Reflections are a 2.5D proxy, not full scene tracing.
   No particle-count, octave, PCF-tap or output-resolution governor is used.''')
start=s.index('let moonSize=1;');end=s.index('function drawStaticMidground()',start)
s=s[:start]+'let moonSize=1;\n'+(root/'optics-components.js').read_text()+'\n'+s[end:]
# Extract and share the native aurora instead of maintaining two copies.
a=s.index('vec3 aurora(vec2 p,float t){',s.index('const SKY_FS='));b=s.index('float doorRay(',a)
aurora=s[a:b]
shader=(root/'optics-shaders.js').read_text().replace('// AURORA_GLSL is inserted from the existing high-detail aurora implementation.', 'const AURORA_GLSL=`\n'+aurora+'`;')
a=s.index('const DENSITY_FS=');b=s.index('const DECK_FS=',a)
s=s[:a]+shader+s[b:]
replace('const DECK_FS=FINAL_COMMON+`','const DECK_FS=FINAL_COMMON+AURORA_GLSL+`')
replace('uniform sampler2D u_moonTex;\nuniform float u_moonAtlasSize;', 'uniform sampler2D u_moonTex,u_skyTex,u_reflectionTex;\nuniform float u_moonAtlasSize;\nuniform vec4 u_skyAtlas,u_reflectionBounds,u_waves[3];')
a=s.index('float puddle(vec2 w){',s.index('const DECK_FS='));b=s.index('\nvoid main(){',a)
new='''float puddle(vec2 w){
 vec2 d=(w-vec2(0.636,0.145))/vec2(0.046,0.078);float a=atan(d.y,d.x);
 return length(d)-(1.0+0.11*sin(a*3.0+0.8)+0.07*cos(a*5.0-1.2)+0.04*sin(a*7.0));
}
vec3 reflection(vec2 w,vec3 n,vec2 moonScene,float moonDim){
 // Environment probe projection appropriate to this layered 2.5D scene.
 vec2 p=vec2(w.x+0.155+n.x*0.19,HY-0.43-(w.y-0.08)*1.5+n.z*0.15);
 vec2 skyP=p+u_camShift*(0.03-0.72);
 vec3 col=texture(u_skyTex,u_skyAtlas.xy+skyP*u_skyAtlas.zw).rgb;
 col=col*col*0.80+aurora(skyP,u_time)*0.85;
 vec2 moonUV=vec2(0.5)+(p-moonScene)*vec2(u_aspect,1.0)/u_moonAtlasSize;
 vec4 lunar=texture(u_moonTex,moonUV);
 col=col*(1.0-lunar.a)+lunar.rgb*lunar.rgb*4.8*moonDim;
 vec4 clouds=media(p+u_camShift*(0.12-0.72));
 col=col*(1.0-clouds.a)+clouds.rgb*1.10;
 vec2 reflectedPoint=vec2(w.x+0.045+n.x*0.065,HY-0.03-w.y*1.15+n.z*0.055);
 vec2 proxyUV=(reflectedPoint-u_reflectionBounds.xy)/u_reflectionBounds.zw;
 if(all(greaterThanEqual(proxyUV,vec2(0.0)))&&all(lessThanEqual(proxyUV,vec2(1.0)))){
  vec4 object=texture(u_reflectionTex,proxyUV);
  col=col*(1.0-object.a)+object.rgb*object.rgb*1.15;
 }
 return col;
}'''
s=s[:a]+new+s[b:]
replace('mix(1.0,0.48,cloudField(u_moonScr+u_camShift*0.04))', 'exp(-cloudField(u_moonScr+u_camShift*0.04)*0.95)')
replace('(vec2(wx,wz)-vec2(0.636,0.107))/vec2(0.026,0.038)', '(vec2(wx,wz)-vec2(0.636,0.145))/vec2(0.046,0.078)')
a=s.index(' if(wx>0.585&&wx<0.685&&wz>0.045&&wz<0.175){',s.index('const DECK_FS='));b=s.index('\n col*=mix(',a)
new=''' if(wx>0.575&&wx<0.702&&wz>0.035&&wz<0.265){
  float ps=puddle(vec2(wx,wz));
  if(ps<0.04){
   float edgeAA=max(fwidth(ps),0.008),mask=down(-edgeAA,edgeAA,ps);
   float sx=0.0,sz=0.0,windGain=0.45+0.80*abs(u_wind.x);
   for(int i=0;i<3;i++){
    vec4 wave=u_waves[i];float slope=cos(dot(wave.xy,vec2(wx,wz))-wave.z*u_time)*wave.w*windGain;
    sx+=wave.x*slope;sz+=wave.y*slope;
   }
   for(int i=0;i<4;i++){
    vec4 rp=u_ripples[i];float age=u_time-rp.z;
    if(age>0.0&&age<3.5&&rp.w>0.01){
     vec2 dr=vec2(wx-rp.x,(wz-rp.y)*0.72);float d=length(dr),q=(d-age*0.024)/0.010;
     float env=exp(-q*q)*exp(-age*1.1)*rp.w,wave=cos((d-age*0.024)*390.0)*env*0.15;
     vec2 dir=dr/max(0.0005,d);sx+=dir.x*wave;sz+=dir.y*wave;
    }
   }
   vec3 wn=normalize(vec3(-sx,1.0,-sz)),V=normalize(vec3((VPX-wx)*0.38,0.32,1.0-wz));
   float nv=clamp(dot(wn,V),0.0,1.0),fc=1.0-nv;fc=fc*fc*fc*fc*fc;
   // Air/water IOR 1.333: F0 = ((1.333-1)/(1.333+1))^2.
   float fresnel=0.02037+0.97963*fc;
   float depth=0.008+0.045*down(-0.85,-0.04,ps);
   vec3 absorption=exp(-vec3(3.0,1.3,0.55)*depth/max(0.15,nv));
   vec3 bottom=col*vec3(0.64,0.78,0.87)*absorption;
   vec3 reflected=reflection(vec2(wx,wz),wn,moonScene,moonDim)*mix(0.56,1.0,moonLit);
   vec3 water=bottom*(1.0-fresnel)+reflected*fresnel;
   float rim=exp(-ps*ps/0.003)*0.035*moonDim*moonLit;
   water+=vec3(0.50,0.66,0.76)*rim;
   col=mix(col,water,mask);
  }
 }'''
s=s[:a]+new+s[b:]
# Shared air affects all moving elements without adding particles or noise queries.
replace('g.rackTop=.291+Math.sin(t*.58)*.0035;g.chSway=Math.sin(t*.62+.5)*.003;', 'g.rackTop=.291+Math.sin(t*.58)*(.0028+.0018*Math.abs(windNow[0]));g.chSway=Math.sin(t*.62+.5)*(.0024+.0015*Math.abs(windNow[0]));')
replace('Math.sin(t*.55)*.007','Math.sin(t*.55)*(.005+.004*Math.abs(windNow[0]))')
replace('((m.x+t*m.speed)%1.3)-.15', '((m.x+t*m.speed+windNow[2]*.003)%1.3+1.3)%1.3-.15')
replace('p.x+=(p.vx+Math.sin(t*1.1+p.phase)*.008)*dt;', 'p.x+=(p.vx+windNow[0]*.010+Math.sin(t*1.1+p.phase)*.008)*dt;')
replace('p.rot+=p.vr*dt;\n', 'p.rot+=(p.vr+windNow[0]*.28)*dt;\n') if 'p.rot+=p.vr*dt;\n' in s else None
replace('if(p.x>.625&&p.x<.672&&p.y>p.landY)', 'if(p.x>.585&&p.x<.694&&p.y>p.landY)')
replace('p.x=(p.x+p.vx*dt+1.2)%1.2;p.y=(p.y+p.vy*dt+1.1)%1.1;p.rot+=p.vr*dt;', 'p.x=(p.x+(p.vx+windNow[0]*.006)*dt+1.2)%1.2;p.y=(p.y+(p.vy+windNow[1]*.002)*dt+1.1)%1.1;p.rot+=(p.vr+windNow[0]*.14)*dt;')
replace('applyParallax(t);updateGeometry(t);', 'updateWind(t);applyParallax(t);updateGeometry(t);')
replace('updateGeometry(state.time);', 'updateWind(state.time);updateGeometry(state.time);')
replace('bakeStructureSprites();occCanvas.width=', 'bakeStructureSprites();setupReflectionAtlas();occCanvas.width=')
# New controls do not alter presentation resolution.
replace('<div class="hint-line"><span>Shift+Drag sky to move Moon</span>', '<div class="ctrl-row"><span class="ctrl-label">Wind / surface air</span><input aria-label="Wind strength" type="range" id="rng-wind" min="0" max="1.8" step=".05" value="1"></div>\n<div class="ctrl-row"><span class="ctrl-label">Fog visibility</span><div class="seg-group" id="fog-solver-group"><button class="seg-btn active" data-solver="cached">Cached</button><button class="seg-btn" data-solver="direct">Direct reference</button></div></div>\n<div class="hint-line"><span>Shift+Drag sky to move Moon</span>')
replace("raysRange.addEventListener('input',e=>{state.rayIntensity=+e.target.value;});", "raysRange.addEventListener('input',e=>{state.rayIntensity=+e.target.value;});\n$('rng-wind').addEventListener('input',e=>{state.windStrength=+e.target.value;});\n$('fog-solver-group').addEventListener('click',e=>{const b=e.target.closest('[data-solver]');if(!b)return;activate(e.currentTarget,b);state.fogCached=b.dataset.solver==='cached';});")
# Main file remains untouched until comparison and acceptance tests pass.
(root/'moonlit-sakura-optics.html').write_text(s)
print('Built candidate',len(s),'characters')
