from pathlib import Path
p=Path('/home/user/moonlit-sakura-optics.html');s=p.read_text()
def replace(a,b):
 global s
 assert s.count(a)==1,(s.count(a),a[:130])
 s=s.replace(a,b)
a=s.index('float puddle(vec2 w){',s.index('const DECK_FS='));b=s.index('\nvoid main(){',a);waterFunctions=s[a:b]
s=s[:a]+s[b:]
a=s.index(' if(wx>0.575&&wx<0.702&&wz>0.035&&wz<0.265){',s.index('const DECK_FS='));b=s.index('\n col*=mix(',a)
waterMain=s[a:b]
s=s[:a]+s[b:]
# Dry deck no longer contains the reflection/aurora branch.
replace('const DECK_FS=FINAL_COMMON+AURORA_GLSL+`','const DECK_FS=FINAL_COMMON+`')
waterMain=waterMain.replace('col*vec3(0.64,0.78,0.87)*absorption','col*vec3(0.64,0.78,0.87)*absorption').replace('mix(0.56,1.0,moonLit)','1.0').replace('0.035*moonDim*moonLit','0.006*moonDim')
# Strip outer domain condition; the renderer already clips exactly to that ROI.
waterMain=waterMain.split('\n',1)[1].rsplit('\n }',1)[0]
waterMain=waterMain.replace('float edgeAA=max(fwidth(ps),0.008),mask=down(-edgeAA,edgeAA,ps);', 'float edgeAA=max(fwidth(ps),0.008),mask=down(-edgeAA,edgeAA,ps);')
WATER='''
const WATER_FS=FINAL_COMMON+AURORA_GLSL+`
uniform sampler2D u_moonTex,u_skyTex,u_reflectionTex,u_waterBase;
uniform vec4 u_ripples[4],u_waves[3],u_skyAtlas,u_reflectionBounds,u_waterRect;
uniform float u_moonAtlasSize;
vec3 untone(vec3 y){
 y=pow(clamp(y,0.0,0.999),vec3(1.0/0.96));
 vec3 a=2.51-2.43*y,b=0.03-0.59*y;
 return max(vec3(0.0),(-b+sqrt(b*b+0.56*a*y))/(2.0*a));
}
'''+waterFunctions+'''
void main(){
 vec2 scr=vec2(v_uv.x,1.0-v_uv.y),moonScene=u_moonScr+u_camShift*0.64;
 float hy=HY-u_camShift.y*0.72,persp=1.0+(scr.y-hy)/(HY-VPY);
 float wx=VPX+(scr.x+u_camShift.x*(0.72+(persp-1.0)*1.48)-VPX)/persp,wz=1.0-1.0/persp;
 float moonDim=exp(-cloudField(u_moonScr+u_camShift*0.04)*0.95);
 vec3 base=texelFetch(u_waterBase,ivec2(gl_FragCoord.xy)-ivec2(u_waterRect.xy),0).rgb;
 vec3 col=untone(base)/1.18;
'''+waterMain+'''
 outColor=vec4(mix(base,tone(col*1.18),down(-0.015,0.015,puddle(vec2(wx,wz)))) ,1.0);
}
`;
'''
# The inner coverage mix is sufficient; avoid evaluating the puddle SDF twice.
WATER=WATER.replace('col=mix(col,water,mask);','outColor=vec4(mix(base,tone(water*1.18),mask),1.0);return;')
WATER=WATER.replace(' outColor=vec4(mix(base,tone(col*1.18),down(-0.015,0.015,puddle(vec2(wx,wz)))) ,1.0);',' discard;')
replace('\nlet gl=null,renderer=null,glLost=false;',WATER+'\nlet gl=null,renderer=null,glLost=false;')
replace('this.deck=this.program(vs,DECK_FS);g.deleteShader(vs);', 'this.deck=this.program(vs,DECK_FS);this.water=this.program(vs,WATER_FS);g.deleteShader(vs);')
replace("'u_waves[0]'];", "'u_waves[0]','u_waterBase','u_waterRect'];")
replace('for(const p of [this.sky,this.deck])', 'for(const p of [this.sky,this.deck,this.water])')
# Duplicate only static uniforms; inactive uniforms are harmless null locations.
start=s.index('  g.useProgram(this.deck.p);g.uniform1i(this.deck.u.u_skyTex,8);');end=s.index('\n }\n canvasTexture',start)
setup=s[start:end]
setup=setup.replace('this.deck','material').replace('  g.useProgram(material.p);','  for(const material of [this.deck,this.water]){g.useProgram(material.p);')+'}\n'
setup+='''  if(this.waterBase)g.deleteTexture(this.waterBase);
  this.waterCapacity=[Math.ceil(deck.width*.28)+32,Math.ceil(deck.height*.18)+32];
  this.waterBase=this.texture(this.waterCapacity[0],this.waterCapacity[1],g.RGBA8,g.RGBA,g.UNSIGNED_BYTE);
  g.useProgram(this.water.p);g.uniform1i(this.water.u.u_waterBase,10);this.lastWaterRipple=-1;
'''
s=s[:start]+setup+s[end:]
# Call the water material after dry-deck rendering; the copy is GPU-to-GPU.
replace('g.uniform3f(u.u_reflDir,rx/len,ry/len,rz/len);g.drawArrays(g.TRIANGLES,0,3);g.disable(g.SCISSOR_TEST);', 'g.uniform3f(u.u_reflDir,rx/len,ry/len,rz/len);g.drawArrays(g.TRIANGLES,0,3);this.renderWater(t,mx,my);g.disable(g.SCISSOR_TEST);')
marker=' canvasTexture(canvas){'
method=''' renderWater(t,mx,my){
  const g=this.gl,W=deck.width,H=deck.height,hy=HY-state.camNY*.72;
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  for(const x of [0.575,0.702])for(const z of [0.035,0.265]){
   const p=1/(1-z),sx=(VPX+(x-VPX)*p-state.camNX*(.72+(p-1)*1.48))*W,sy=(hy+(p-1)*(HY-VPY))*H;
   minX=Math.min(minX,sx);maxX=Math.max(maxX,sx);minY=Math.min(minY,sy);maxY=Math.max(maxY,sy);
  }
  const x0=Math.max(0,Math.floor(minX)-2),x1=Math.min(W,Math.ceil(maxX)+2),top=Math.max(0,Math.floor(minY)-2),bottom=Math.min(H,Math.ceil(maxY)+2);
  const w=x1-x0,h=bottom-top,y0=H-bottom;if(w<1||h<1)return;
  this.bind(10,this.waterBase);
  if(w>this.waterCapacity[0]||h>this.waterCapacity[1]){
   this.waterCapacity=[Math.ceil(w/64)*64,Math.ceil(h/64)*64];g.texImage2D(g.TEXTURE_2D,0,g.RGBA8,...this.waterCapacity,0,g.RGBA,g.UNSIGNED_BYTE,null);
  }
  g.copyTexSubImage2D(g.TEXTURE_2D,0,0,0,x0,y0,w,h);
  this.common(this.water,t,mx,my);
  if(this.lastWaterRipple!==state.rippleVersion){g.uniform4fv(this.water.u['u_ripples[0]'],state.ripples);this.lastWaterRipple=state.rippleVersion;}
  g.uniform4f(this.water.u.u_waterRect,x0,y0,w,h);g.scissor(x0,y0,w,h);g.drawArrays(g.TRIANGLES,0,3);
 }
'''
assert s.count(marker)==1;s=s.replace(marker,method+marker)
p.write_text(s);Path('/home/user/candidate-check.js').write_text(s.split('<script>',1)[1].split('</script>',1)[0])
