const {chromium}=require('/home/user/.cache/browser-check/node_modules/playwright');
const fs=require('fs'),assert=require('assert');
const source=fs.readFileSync('/home/user/moonlit-sakura-village.html','utf8');
const marker='bakeCommonSprites();initGL();resize();schedule();';
assert.equal(source.split(marker).length,2);
const debug=source.replace(marker,`window.__sceneTest={state,get renderer(){return renderer;},get gl(){return gl;},windAt,windNow,updateWind,resize,get houseCount(){return houseList.length;},get worldPlanes(){return worldPlanes;},counts:{stars:stars.length,mist:mistBanks.length,blossoms:blossoms.length,petals:falling.length,embers:embers.length,birds:birds.length,foreground:fgParticles.length,extreme:extremeParticles.length},drawSkyFX,drawLife,drawForeground,render:()=>renderer?.render(state.time),pause:()=>{cancelAnimationFrame(frameTicket);frameTicket=0;},resume:()=>{lastTs=0;schedule();}};${marker}`);
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const reports=[];
 async function open(width,height,dpr,options={}){
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:dpr});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  if(options.packed)await page.addInitScript(()=>{const get=WebGL2RenderingContext.prototype.getExtension;WebGL2RenderingContext.prototype.getExtension=function(name){return name==='EXT_color_buffer_float'?null:get.call(this,name)};});
  if(options.fallback)await page.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type==='webgl2'?null:get.call(this,type,...args)};});
  if(options.noFloat16)await page.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,opts){if(type==='2d'&&opts?.colorType==='float16')throw new TypeError('Unsupported optional color type');return get.call(this,type,opts)};});
  await page.route('http://127.0.0.1:3000/**',route=>route.fulfill({contentType:'text/html',body:debug}));
  await page.goto('http://127.0.0.1:3000/');
  await page.waitForFunction(()=>window.__sceneTest?.state.time>.06,null,{timeout:45000});
  return{page,errors};
 }
 // Desktop: alpha contracts and real input interaction, not just syntax.
 {
  const {page,errors}=await open(1000,800,1.25);
  let check=await page.evaluate(()=>{
   const ids=['layer-moon','structure-rack','structure-cabin','structure-cherry','structure-hearth','village-buildings','village-glow'];
   return ids.map(id=>{const c=document.getElementById(id),g=c.getContext('2d');return{id,alpha:g.getContextAttributes().alpha,desync:g.getContextAttributes().desynchronized,corner:g.getImageData(0,0,1,1).data[3]};});
  });
  for(const c of check){assert(c.alpha,c.id+' must have alpha');assert(!c.desync,c.id+' must be composited');assert.equal(c.corner,0,c.id+' transparent border');}
  await page.click('#hud-header');
  await page.click('#btn-ray-debug');assert(await page.$eval('#layer-ray-overlay',c=>!c.hidden));
  await page.click('#btn-ray-debug');assert(await page.$eval('#layer-ray-overlay',c=>c.hidden));
  await page.click('[data-perf="high"]');
  await page.waitForFunction(()=>window.__sceneTest.state.perfMode==='high'&&document.getElementById('layer-raytrace-deck').width===1250);
  await page.keyboard.down('Shift');await page.mouse.move(800,220);await page.mouse.down();await page.mouse.move(580,260,{steps:4});await page.mouse.up();await page.keyboard.up('Shift');
  const moon=await page.evaluate(()=>window.__sceneTest.state.moonX);assert(moon>.5&&moon<.65,'moon drag '+moon);
  const before=await page.evaluate(()=>window.__sceneTest.state.rippleVersion);await page.mouse.click(640,690);const after=await page.evaluate(()=>window.__sceneTest.state.rippleVersion);assert(after>before,'deck tap produces ripple');
  await page.keyboard.press('h');assert(await page.$eval('#hud',c=>c.classList.contains('hidden-ui')));await page.keyboard.press('h');
  const wind=await page.evaluate(()=>{const t=window.__sceneTest;t.pause();let derivativeError=0;for(const x of [0,.5,7,30,1000]){const a=t.windAt(x-1e-4,new Float64Array(4)),b=t.windAt(x+1e-4,new Float64Array(4)),c=t.windAt(x,new Float64Array(4));for(let j=0;j<2;j++)derivativeError=Math.max(derivativeError,Math.abs((b[j+2]-a[j+2])/.0002-c[j]));}const before=Array.from(t.windAt(t.state.time,new Float64Array(4))),slider=document.getElementById('rng-wind');slider.value='1.8';slider.dispatchEvent(new Event('input',{bubbles:true}));const after=Array.from(t.windAt(t.state.time,new Float64Array(4)));return{derivativeError,displacementJump:Math.max(Math.abs(before[2]-after[2]),Math.abs(before[3]-after[3])),strength:t.state.windStrength,counts:t.counts};});
  assert(wind.derivativeError<1e-7,JSON.stringify(wind));assert(wind.displacementJump<1e-5);assert.equal(wind.strength,1.8);assert.deepEqual(wind.counts,{stars:120,mist:16,blossoms:248,petals:18,embers:10,birds:5,foreground:24,extreme:14});
  await page.click('[data-shadow="0"]');assert.equal(await page.evaluate(()=>window.__sceneTest.state.shadowMode),0);
  await page.click('[data-shadow="1"]');assert.equal(await page.evaluate(()=>window.__sceneTest.state.shadowMode),1);
  await page.click('[data-shadow="2"]');assert.equal(await page.evaluate(()=>window.__sceneTest.state.shadowMode),2);
  await page.$eval('#rng-shadow-soft',e=>{e.value='2.4';e.dispatchEvent(new Event('input',{bubbles:true}));});assert.equal(await page.evaluate(()=>window.__sceneTest.state.shadowSoftness),2.4);
  assert.equal(await page.evaluate(()=>window.__sceneTest.houseCount),15);
  await page.click('[data-solver="direct"]');assert.equal(await page.evaluate(()=>window.__sceneTest.state.fogCached),false);
  await page.click('[data-solver="cached"]');assert.equal(await page.evaluate(()=>window.__sceneTest.state.fogCached),true);
  await page.click('#btn-reset');
  const reset=await page.evaluate(()=>({wind:window.__sceneTest.state.windStrength,moon:window.__sceneTest.state.moonX,fog:window.__sceneTest.state.fogCached,shadow:window.__sceneTest.state.shadowMode,soft:window.__sceneTest.state.shadowSoftness}));assert.deepEqual(reset,{wind:1,moon:.8,fog:true,shadow:2,soft:1});
  // Render/read within the same JS task: check actual default framebuffer alpha.
  const gpu=await page.evaluate(()=>{window.__sceneTest.pause();window.__sceneTest.render();const c=document.getElementById('layer-raytrace-deck'),g=c.getContext('webgl2'),data=new Uint8Array(c.width*c.height*4);g.readPixels(0,0,c.width,c.height,g.RGBA,g.UNSIGNED_BYTE,data);let invalid=0,transparent=0;for(let i=0;i<data.length;i+=4){if(data[i]>data[i+3]||data[i+1]>data[i+3]||data[i+2]>data[i+3])invalid++;if(data[i+3]<255)transparent++;}return{invalid,transparent,error:g.getError(),attrs:g.getContextAttributes()};});
  assert.equal(gpu.error,0);assert.equal(gpu.invalid,0,'premultiplied alpha violation');assert(gpu.transparent>0);assert(!gpu.attrs.desynchronized);
  await page.screenshot({path:'/home/user/evidence-village/village-scene-desktop-verified.png'});
  await page.evaluate(()=>{const b=window.__sceneTest,ext=b.gl.getExtension('WEBGL_lose_context');window.__restoreVillage=()=>ext.restoreContext();ext.loseContext();});
  await page.waitForFunction(()=>!window.__sceneTest.renderer&&!document.getElementById('layer-deck-fallback').hidden);
  await page.evaluate(()=>window.__restoreVillage());await page.waitForFunction(()=>window.__sceneTest.renderer?.shadowVisibility&&window.__sceneTest.renderer?.shadowSATTexture,null,{timeout:60000});
  const restoredFloat=await page.evaluate(()=>{const b=window.__sceneTest;b.pause();b.render();return{error:b.gl.getError(),houses:b.houseCount,satUploads:b.renderer.satUploads,float:b.renderer.floatTargets};});assert.equal(restoredFloat.error,0);assert.equal(restoredFloat.houses,15);assert.equal(restoredFloat.satUploads,5);assert(restoredFloat.float);
  assert.deepEqual(errors,[]);reports.push({case:'desktop controls + GPU alpha + float context recovery',restoredFloat,result:'PASS',gpu,wind,canvases:check});await page.close();
 }
 // High quality and fractional backing pixels: damage clears must equal a full repaint.
 {
  const {page,errors}=await open(760,670,1.3);await page.click('#hud-header');await page.click('[data-perf="high"]');
  await page.waitForFunction(()=>Math.abs(window.__sceneTest.state.fxDpr-1.3)<.001);
  const damage=await page.evaluate(()=>{
   const t=window.__sceneTest;t.pause();const out=[];
   for(const [id,draw] of [['layer-sky-fx',t.drawSkyFX],['structure-life',t.drawLife],['layer-fg-petals',t.drawForeground]]){
    draw(t.state.time,0);const c=document.getElementById(id),g=c.getContext('2d');const dirty=g.getImageData(0,0,c.width,c.height).data;
    g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,c.width,c.height);draw(t.state.time,0);const full=g.getImageData(0,0,c.width,c.height).data;
    let residual=0,maxPremult=0,maxAlpha=0;for(let i=0;i<full.length;i+=4){const a=dirty[i+3],b=full[i+3];if(a>1&&b===0)residual++;maxAlpha=Math.max(maxAlpha,Math.abs(a-b));for(let j=0;j<3;j++)maxPremult=Math.max(maxPremult,Math.abs(dirty[i+j]*a-full[i+j]*b)/255);}out.push({id,residual,maxPremult,maxAlpha});
   }return out;
  });
  for(const c of damage){assert.equal(c.residual,0,c.id+' fractional-DPR trails');assert(c.maxAlpha<=2&&c.maxPremult<=2,c.id+' damage repaint differs beyond raster rounding: '+JSON.stringify(c));}
  await page.screenshot({path:'/home/user/evidence-village/village-scene-preview-verified.png'});assert.deepEqual(errors,[]);reports.push({case:'fractional DPR damage lattice',result:'PASS',damage});await page.close();
 }
 // Portrait, resizing, and a missing optional high-precision Canvas feature.
 {
  const {page,errors}=await open(430,932,1.5,{noFloat16:true});
  assert(await page.$eval('#layer-raytrace-deck',c=>!c.hidden));
  await page.setViewportSize({width:932,height:430});await page.waitForFunction(()=>window.__sceneTest.state.w===932);
  await page.setViewportSize({width:430,height:932});await page.waitForFunction(()=>window.__sceneTest.state.w===430);
  await page.screenshot({path:'/home/user/evidence-village/village-scene-portrait-verified.png'});assert.deepEqual(errors,[]);reports.push({case:'portrait + rotation + optional float16 fallback',result:'PASS'});await page.close();
 }
 {
  const {page,errors}=await open(760,670,1,{fallback:true});
  assert(await page.$eval('#layer-deck-fallback',c=>!c.hidden));assert(await page.$eval('#layer-raytrace-deck',c=>c.hidden));
  assert.deepEqual(errors,[]);reports.push({case:'WebGL unavailable fallback',result:'PASS'});await page.close();
 }
 // Real packed render targets, exact upper-sky specialization, and context recovery.
 {
  const {page,errors}=await open(800,600,1,{packed:true});
  const packed=await page.evaluate(()=>{
   const b=window.__sceneTest;b.pause();const r=b.renderer,g=b.gl;if(!r)throw Error('Missing packed renderer');r.extTimer=null;
   const read=()=>{const v=new Uint8Array(g.drawingBufferWidth*g.drawingBufferHeight*4);g.readPixels(0,0,g.drawingBufferWidth,g.drawingBufferHeight,g.RGBA,g.UNSIGNED_BYTE,v);return v;};
   r.render(b.state.time);const specialized=read(),high=r.skyHigh;r.skyHigh=r.sky;r.render(b.state.time);const plain=read();r.skyHigh=high;
   let max=0,different=0;for(let i=0;i<plain.length;i++){const d=Math.abs(specialized[i]-plain[i]);if(d)different++;max=Math.max(max,d);}
   return{floatTargets:r.floatTargets,glError:g.getError(),specializationMaxError:max,specializationDifferentChannels:different,field:[r.fogTarget.w,r.fogTarget.h],fieldBytes:r.fogTarget.w*r.fogTarget.h*8,waterCapacity:r.waterCapacity};
  });assert.equal(packed.floatTargets,false);assert.equal(packed.glError,0);assert(packed.specializationMaxError<=1,JSON.stringify(packed));
  await page.evaluate(()=>{const b=window.__sceneTest,ext=b.gl.getExtension('WEBGL_lose_context');if(!ext)throw Error('Context-loss extension missing');window.__restoreGL=()=>ext.restoreContext();ext.loseContext();});
  await page.waitForFunction(()=>!window.__sceneTest.renderer&&!document.getElementById('layer-deck-fallback').hidden);
  await page.evaluate(()=>window.__restoreGL());
  await page.waitForFunction(()=>window.__sceneTest.renderer?.ready&&!document.getElementById('layer-raytrace-deck').hidden,null,{timeout:45000});
  await page.waitForFunction(()=>window.__sceneTest.renderer.fogTarget?.w>0);
  const restored=await page.evaluate(()=>{const b=window.__sceneTest;b.pause();b.render();return{error:b.gl.getError(),ready:b.renderer.ready,packed:!b.renderer.floatTargets};});assert.deepEqual(restored,{error:0,ready:true,packed:true});
  assert.deepEqual(errors,[]);reports.push({case:'packed targets + upper specialization + actual context loss/restoration',result:'PASS',packed,restored});await page.close();
 }
 await browser.close();fs.writeFileSync('/home/user/evidence-village/browser-village.json',JSON.stringify(reports,null,2));console.log(JSON.stringify(reports,null,2));
})().catch(e=>{console.error(e);process.exit(1)});
