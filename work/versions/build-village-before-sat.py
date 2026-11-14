from pathlib import Path
import re,hashlib,subprocess
root=Path('/home/user');s=(root/'versions/moonlit-sakura-before-village.html').read_text()
def replace(a,b):
 global s
 assert s.count(a)==1,(s.count(a),a[:160])
 s=s.replace(a,b)
replace('Wind &amp; Water Optics Edition','Village Interval Edition') if 'Wind &amp;' in s else replace('Wind & Water Optics Edition','Village Interval Edition')
replace('#layer-mist{z-index:5}', '#village-floor{z-index:4}#layer-mist{z-index:5}')
replace('<canvas id="layer-mist" class="p-layer"></canvas>', '<canvas id="village-floor" class="p-layer"></canvas>\n<canvas id="layer-mist" class="p-layer"></canvas>')
replace('<div id="layer-structures" class="p-layer">','<div id="layer-structures" class="p-layer"><canvas id="village-buildings" class="island"></canvas><canvas id="village-glow" class="island"></canvas>')
replace('#hud-body{padding:10px 12px 12px;', '#hud-body{max-height:calc(100vh - 76px);overflow:auto;padding:10px 12px 12px;')
replace('<div class="ctrl-row"><span class="ctrl-label">Wind / surface air</span>', '<div class="ctrl-row"><span class="ctrl-label">Shadow engine</span><div class="seg-group" id="shadow-engine-group"><button class="seg-btn" data-shadow="0">Direct</button><button class="seg-btn" data-shadow="1">One level</button><button class="seg-btn active" data-shadow="2">Intervals</button></div></div>\n<div class="ctrl-row"><span class="ctrl-label">Shadow softness</span><input aria-label="Shadow softness" type="range" id="rng-shadow-soft" min=".4" max="2.4" step=".05" value="1"></div>\n<div class="ctrl-row"><span class="ctrl-label">Wind / surface air</span>')
replace('fogCached:true,fogWidth:0,','shadowMode:2,shadowSoftness:1,fogCached:true,fogWidth:0,')
marker='function rosette(c,x,y,r,a)'
assert s.count(marker)==1;s=s.replace(marker,(root/'village-components.js').read_text()+'\n'+marker)
a=s.index('const cw=.186*u',s.index('function bakeStructureSprites'));b=s.index(' island(rack,',a)
s=s[:a]+'setupVillage();\n'+s[b:]
replace('g.cabW=.186*state.u/w;g.cabH=.072*state.u/h;g.roofH=.058*state.u/h;', 'g.cabW=.29*state.u/w;g.cabH=.112*state.u/h;g.roofH=.090*state.u/h;')
# Shared detailed profile, replacing the old rectangular/triangular mask.
a=s.index("c.fillStyle='#f00';c.fillRect((g.cabX",s.index('function bakeOccluder'));b=s.index('const S=occScale;',a)
s=s[:a]+'''c.save();c.translate(g.cabX*state.w,HY*state.h);c.scale(state.u,state.u);paintHouseMask(c,mainHouse);c.restore();'''+s[b:]
replace('lastOccTime=-100;occDirty=true;}\nfunction updateOccluder', 'lastOccTime=-100;occDirty=true;bakeVillageFogMask();updateWorldOccluders(state.time);}\nfunction updateOccluder')
replace('occ.drawImage(occCabin,0,0);occ.save();','occ.drawImage(villageFogMask,0,0);occ.drawImage(occCabin,0,0);occ.save();')
replace('occ.restore();occDirty=true;}\nfunction choosePerch', 'occ.restore();occDirty=true;updateWorldOccluders(t);}\nfunction choosePerch')
replace('[mist,.44],[structures,.72]', '[mist,.44],[villageFloor,.72],[structures,.72]')
replace('function drawStructureIslands(t){paintRack', 'function drawStructureIslands(t){updateVillageGlow(t);paintRack')
# Put the source-independent interval shaders before sky/deck declarations.
marker='const DECK_FS=FINAL_COMMON+`'
assert s.count(marker)==1
s=s.replace(marker,(root/'shadow-engine.js').read_text()+'\n'+'''const VILLAGE_SKY_FS=SKY_FS.replace('void main(){',SHADOW_GLSL+'\\nvoid main(){').replace('vec3 emit=aurora(scr+u_camShift*0.03,u_time)*T+m.rgb;','vec3 emit=m.rgb;').replace('outColor=vec4(color,max(extinction,max(color.r,max(color.g,color.b))));',`
 float alpha=max(extinction,max(color.r,max(color.g,color.b)));
 float persp=1.0+(scene.y-HY)/(HY-VPY),wx=VPX+(scene.x-VPX)/max(0.02,persp),wz=1.0-1.0/max(0.02,persp);
 float vis=worldShadow(vec2(wx,wz)),coverage=smoothstep(0.44,0.51,scene.y);
 float shade=(1.0-vis)*0.78*moonDim*coverage;
 outColor=vec4(color+vec3(0.006,0.012,0.020)*shade*(1.0-alpha),alpha+shade*(1.0-alpha));`);
const VILLAGE_SKY_DIRECT_FS=VILLAGE_SKY_FS.replace(SHADOW_GLSL,DIRECT_SHADOW_GLSL);
const DECK_FS=FINAL_COMMON+SHADOW_GLSL+`''')
# Existing twelve Poisson taps are represented in SHADOW_GLSL.
a=s.index('const vec2 POISSON[12]',s.index('const DECK_FS='));b=s.index('\nfloat specular',a);s=s[:a]+s[b:]
a=s.index(' float moonLit=1.0;',s.index('const DECK_FS='));b=s.index('\n float doorVis=',a)
s=s[:a]+' float moonLit=worldShadow(vec2(wx,wz));'+s[b:]
replace('vec3 light=vec3(0.055,0.078,0.110)+vec3(0.95,1.14,1.34)*(diff*1.08*moonDim+spec)*moonLit', 'vec3 light=vec3(0.075,0.100,0.140)+vec3(0.95,1.14,1.34)*(diff*1.55*moonDim+spec)*moonLit')
replace('const WATER_FS=FINAL_COMMON+AURORA_GLSL+`', 'const DECK_DIRECT_FS=DECK_FS.replace(SHADOW_GLSL,DIRECT_SHADOW_GLSL);\nconst WATER_FS=FINAL_COMMON+AURORA_GLSL+`')
# Programs and fields. Direct variants compile out certificate branches.
replace('this.skyHigh=this.program(vs,HIGH_SKY_FS);this.deck=this.program(vs,DECK_FS);', 'this.skyHigh=this.program(vs,HIGH_SKY_FS);this.villageSky=this.program(vs,VILLAGE_SKY_FS);this.villageSkyDirect=this.program(vs,VILLAGE_SKY_DIRECT_FS);this.deck=this.program(vs,DECK_FS);this.deckDirect=this.program(vs,DECK_DIRECT_FS);this.shadowBase=this.program(vs,SHADOW_BASE_FS);this.shadowReduce=this.program(vs,SHADOW_REDUCE_FS);this.shadowGuard=this.program(vs,SHADOW_GUARD_FS);')
replace("'u_waterBase','u_waterRect'];", "'u_waterBase','u_waterRect','u_src','u_guardOrigin','u_worldMask','u_intervalTex','u_planeTiles[0]','u_maskMap[0]','u_planeInfo[0]','u_planeBounds[0]','u_guardOrigins[0]','u_worldAtlasSize','u_shadowLight','u_shadowMode'];")
replace('for(const p of [this.sky,this.skyHigh,this.deck,this.water])', 'for(const p of [this.sky,this.skyHigh,this.villageSky,this.villageSkyDirect,this.deck,this.deckDirect,this.water])')
replace('for(const material of [this.deck,this.water])', 'for(const material of [this.deck,this.deckDirect,this.water])')
replace('this.lastWaterRipple=-1;\n\n }', 'this.lastWaterRipple=-1;this.shadowLight=new Float32Array(3);this.initWorldShadows();\n\n }')
marker=' canvasTexture(canvas){';assert s.count(marker)==1;s=s.replace(marker,(root/'shadow-renderer-methods.js').read_text()+'\n'+marker)
replace('g.uniform1i(u.u_fogCached,state.fogCached?1:0);}', 'g.uniform1i(u.u_fogCached,state.fogCached?1:0);if(u.u_shadowLight)this.shadowUniforms(p);}')
replace('updateReflectionAtlas(t);this.beginTiming();', '''updateReflectionAtlas(t);this.beginTiming();
  const ax=mx+state.camNX*.64-.5,ay=Math.max(.14,(HY-my-state.camNY*.64)*1.10),soft=.025*state.shadowSoftness;
  this.shadowLight[0]=ax;this.shadowLight[1]=ay;this.shadowLight[2]=soft;setPlaneShadowBounds(ax,ay,soft);''')
replace('this.fogKey(t,mx,my,occluderChanged);', 'this.updateShadowIntervals();this.fogKey(t,mx,my,occluderChanged);')
replace('this.bind(7,this.fogTarget.tex);this.bind(8,this.skyTexture);', 'this.bind(7,this.fogTarget.tex);this.bind(8,this.skyTexture);this.bind(11,this.worldMaskTexture);this.bind(12,this.intervalTarget.tex);')
replace('if(split>rows){g.scissor(0,rows,deck.width,split-rows);this.common(this.sky,t,mx,my);g.drawArrays(g.TRIANGLES,0,3);}', '''const groundSplit=Math.max(rows,Math.min(split,Math.ceil((.56+state.camNY*.72)*deck.height-.5)));
  if(split>groundSplit){g.scissor(0,groundSplit,deck.width,split-groundSplit);this.common(this.sky,t,mx,my);g.drawArrays(g.TRIANGLES,0,3);}
  if(groundSplit>rows){g.scissor(0,rows,deck.width,groundSplit-rows);this.common(state.shadowMode===0?this.villageSkyDirect:this.villageSky,t,mx,my);g.drawArrays(g.TRIANGLES,0,3);}''')
replace('this.common(this.deck,t,mx,my);const u=this.deck.u;updateShadowBounds(mx+state.camNX*.64,my+state.camNY*.64);g.uniform4fv(u[\'u_shadowAABB[0]\'],state.shadow);', 'const deckMaterial=state.shadowMode===0?this.deckDirect:this.deck;this.common(deckMaterial,t,mx,my);const u=deckMaterial.u;')
replace('let lx=mx+state.camNX*.64-.5,ly=.65,lz=-.45,', 'let lx=ax*(state.w/state.h),ly=ay,lz=-1,')
# Never repurpose the fog control for geometric shadow softness.
replace("$('rng-wind').addEventListener('input',e=>setWindStrength(+e.target.value));", "$('rng-wind').addEventListener('input',e=>setWindStrength(+e.target.value));\n$('rng-shadow-soft').addEventListener('input',e=>{state.shadowSoftness=+e.target.value;});\n$('shadow-engine-group').addEventListener('click',e=>{const b=e.target.closest('[data-shadow]');if(!b)return;activate(e.currentTarget,b);state.shadowMode=+b.dataset.shadow;});")
replace("setWindStrength(1);$('rng-wind').value='1';", "setWindStrength(1);$('rng-wind').value='1';state.shadowSoftness=1;$('rng-shadow-soft').value='1';state.shadowMode=2;activate($('shadow-engine-group'),$('shadow-engine-group').querySelector('[data-shadow=\"2\"]'));")
# Mark the 2D inspector honestly; ground visibility has a distinct depth-aware engine.
replace('2D Ray Inspector</span>', 'Atmospheric Ray Inspector</span>')
replace('/* Scene-specific optimizations, followed by conventional GPU/Canvas practices:', '/* Depth-aware village: shared profile geometry, five caster depths, and\n   conservative source-mask ray-footprint certificates. Constant cells skip\n   twelve equivalent reads; all uncertain / overlapping cells retain twelve\n   correlated rays. The min/max hierarchy is independent of light and camera.\n   Scene-specific optimizations, followed by conventional GPU/Canvas practices:')
# Exact native visibility / row-band specialization; keep the direct reference.
replace('this.villageSky=this.program(vs,VILLAGE_SKY_FS);', 'this.nativeDeck=this.program(vs,NATIVE_DECK_FS);this.nativeVillage=this.program(vs,NATIVE_VILLAGE_FS);this.villageSky=this.program(vs,VILLAGE_SKY_FS);')
replace("'u_shadowLight','u_shadowMode'];", "'u_shadowLight','u_shadowMode','u_shadowVisibility','u_shadowPacked','u_shadowDeckRows'];")
replace('const WATER_FS=FINAL_COMMON+AURORA_GLSL+`', (root/'shadow-native.js').read_text()+'\nconst WATER_FS=FINAL_COMMON+AURORA_GLSL+`')
replace('for(const p of [this.sky,this.skyHigh,this.villageSky,this.villageSkyDirect,this.deck,this.deckDirect,this.water])', 'for(const p of [this.sky,this.skyHigh,this.villageSky,this.villageSkyDirect,this.deck,this.deckDirect,this.nativeDeck,this.nativeVillage,this.water])')
replace('for(const material of [this.deck,this.deckDirect,this.water])', 'for(const material of [this.deck,this.deckDirect,this.nativeDeck,this.water])')
replace('this.initWorldShadows();', 'this.initWorldShadows();this.initNativeShadows();')
replace(' canvasTexture(canvas){', (root/'shadow-native-methods.js').read_text()+'\n canvasTexture(canvas){')
replace('this.updateShadowIntervals();this.fogKey(t,mx,my,occluderChanged);', 'this.updateShadowIntervals();if(state.shadowMode!==0)this.renderNativeShadows(t,mx,my);this.fogKey(t,mx,my,occluderChanged);')
replace('this.common(state.shadowMode===0?this.villageSkyDirect:this.villageSky,t,mx,my)', 'this.common(state.shadowMode===0?this.villageSkyDirect:this.nativeVillage,t,mx,my)')
replace('const deckMaterial=state.shadowMode===0?this.deckDirect:this.deck;', 'const deckMaterial=state.shadowMode===0?this.deckDirect:this.nativeDeck;')
# Scanline coefficient packets are available on the floating-point path.
replace('const WATER_FS=FINAL_COMMON+AURORA_GLSL+`', (root/'shadow-row-shaders.js').read_text()+'\nconst WATER_FS=FINAL_COMMON+AURORA_GLSL+`')
replace('this.nativeDeck=this.program(vs,NATIVE_DECK_FS);', 'this.shadowRows=this.program(vs,SHADOW_ROW_FS);this.nativeDeck=this.program(vs,NATIVE_DECK_FS);')
replace("'u_shadowDeckRows'];", "'u_shadowDeckRows','u_rowTable'];")
replace('if(u.u_shadowLight)this.shadowUniforms(p);', 'if(u.u_shadowLight||p.shadowSubset)this.shadowUniforms(p);')
# Tile certificates cover complete native receiver tiles, not interpolated shadows.
replace('const WATER_FS=FINAL_COMMON+AURORA_GLSL+`', (root/'shadow-tiles.js').read_text()+'\nconst WATER_FS=FINAL_COMMON+AURORA_GLSL+`')
replace('this.shadowRows=this.program(vs,SHADOW_ROW_FS);', 'this.shadowTiles=this.program(vs,SHADOW_TILE_FS);this.shadowRows=this.program(vs,SHADOW_ROW_FS);')
replace("'u_rowTable'];", "'u_rowTable','u_shadowTiles','u_shadowTileSize','u_shadowSize'];")
out=root/'moonlit-sakura-village.html';out.write_text(s);(root/'village-check.js').write_text(s.split('<script>',1)[1].split('</script>',1)[0]);subprocess.run(['node','--check','village-check.js'],cwd=root,check=True)
print('Built village candidate',len(out.read_bytes()),'bytes',hashlib.sha256(out.read_bytes()).hexdigest())
