from pathlib import Path
p=Path('/home/user/moonlit-sakura-optics.html');s=p.read_text()
def replace(a,b):
 global s
 assert s.count(a)==1,(s.count(a),a[:130])
 s=s.replace(a,b)
replace('fogCached:true,fogWidth:0,','fogCached:true,fogWidth:0,fogHeight:0,')
replace('const moved=Math.abs(mx-this.fogMX)+Math.abs(my-this.fogMY)>.0001;', '''const moved=Math.abs(mx-this.fogMX)+Math.abs(my-this.fogMY)+Math.abs(state.camNX-this.fogCX)*.64+Math.abs(state.camNY-this.fogCY)*.64>.0001;''')
replace('this.fogMX=mx;this.fogMY=my;this.lastFogTime=t;', 'this.fogMX=mx;this.fogMY=my;this.fogCX=state.camNX;this.fogCY=state.camNY;this.lastFogTime=t;')
replace('   float ps=puddle(vec2(wx,wz));\n  if(ps<0.04){\n   float edgeAA=max(fwidth(ps),0.008),mask=down(-edgeAA,edgeAA,ps);', '   float ps=puddle(vec2(wx,wz));float edgeAA=max(fwidth(ps),0.008);\n  if(ps<edgeAA){\n   float mask=down(-edgeAA,edgeAA,ps);') if '   float ps=puddle' in s else replace('  float ps=puddle(vec2(wx,wz));\n  if(ps<0.04){\n   float edgeAA=max(fwidth(ps),0.008),mask=down(-edgeAA,edgeAA,ps);', '  float ps=puddle(vec2(wx,wz));float edgeAA=max(fwidth(ps),0.008);\n  if(ps<edgeAA){\n   float mask=down(-edgeAA,edgeAA,ps);')
replace('vec3 reflection(vec2 w,vec3 n,vec2 moonScene,float moonDim){', '''vec3 linearPremult(vec4 c){return c.rgb*c.rgb/max(c.a,0.0001);}
vec3 reflection(vec2 w,vec3 n,vec2 moonScene,float moonDim){''')
replace('lunar.rgb*lunar.rgb*4.8*moonDim','linearPremult(lunar)*4.8*moonDim')
replace('object.rgb*object.rgb*1.15','linearPremult(object)*1.15')
replace('wn,moonScene,moonDim)*1.0;', 'wn,moonScene,moonDim);')
replace('  vec2 v=texelFetch(u_fogTex,clamp(p+ivec2(x,y),ivec2(0),limit),0).rg;', '  if(x==0&&y==0)continue;vec2 v=texelFetch(u_fogTex,clamp(p+ivec2(x,y),ivec2(0),limit),0).rg;')
a="$('rng-wind').addEventListener('input',e=>{windAt(state.time,windNow);const x=windNow[2],y=windNow[3];state.windStrength=+e.target.value;windAt(state.time,windKey);state.windOffsetX+=x-windKey[2];state.windOffsetY+=y-windKey[3];updateWind(state.time);if(renderer)renderer.cacheValid=false;});"
b="""function setWindStrength(strength){windAt(state.time,windNow);const x=windNow[2],y=windNow[3];state.windStrength=strength;windAt(state.time,windKey);state.windOffsetX+=x-windKey[2];state.windOffsetY+=y-windKey[3];updateWind(state.time);if(renderer)renderer.cacheValid=false;}
$('rng-wind').addEventListener('input',e=>setWindStrength(+e.target.value));"""
replace(a,b)
replace("state.moonDirty=true;parallaxRange.value='1.20';raysRange.value='1.15';", "state.moonDirty=true;parallaxRange.value='1.20';raysRange.value='1.15';setWindStrength(1);$('rng-wind').value='1';state.fogCached=true;activate($('fog-solver-group'),$('fog-solver-group').querySelector('[data-solver=\"cached\"]'));if(renderer)renderer.lastFogTime=-100;")
replace('a low-frequency reflection postage atlas, shared analytic wind, and a baked', 'a classified exact-edge fog path, a bounded reflection atlas, shared wind, and a baked')
replace('Fine aurora, wood, stones, ripples and occluder rays stay native resolution.', 'Fine aurora, wood, stones, ripples and final shading stay native resolution.')
replace('<button class="seg-btn active" data-solver="cached">Cached</button>', '<button class="seg-btn active" data-solver="cached" title="Scene-space cache with exact native-pixel visibility at classified shadow edges">Adaptive</button>')
replace('<button class="seg-btn" data-solver="direct">Direct reference</button>', '<button class="seg-btn" data-solver="direct" title="Reference: evaluate all fog visibility and noise directly at native output pixels">Direct</button>')
p.write_text(s);Path('/home/user/candidate-check.js').write_text(s.split('<script>',1)[1].split('</script>',1)[0])
