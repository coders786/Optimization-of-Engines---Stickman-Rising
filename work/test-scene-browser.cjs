const {chromium}=require('/home/user/.cache/browser-check/node_modules/playwright');
const fs=require('fs'),assert=require('assert');
const source=fs.readFileSync('/home/user/moonlit-sakura-optimized.html','utf8');
const marker='bakeCommonSprites();initGL();resize();schedule();';
assert.equal(source.split(marker).length,2);
const debug=source.replace(marker,`window.__sceneTest={state,drawSkyFX,drawLife,drawForeground,render:()=>renderer?.render(state.time),pause:()=>{cancelAnimationFrame(frameTicket);frameTicket=0;},resume:()=>{lastTs=0;schedule();}};${marker}`);
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const reports=[];
 async function open(width,height,dpr,options={}){
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:dpr});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  if(options.fallback)await page.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type==='webgl2'?null:get.call(this,type,...args)};});
  if(options.noFloat16)await page.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,opts){if(type==='2d'&&opts?.colorType==='float16')throw new TypeError('Unsupported optional color type');return get.call(this,type,opts)};});
  await page.route('http://127.0.0.1:3000/**',route=>route.fulfill({contentType:'text/html',body:debug}));
  await page.goto('http://127.0.0.1:3000/');
  await page.waitForFunction(()=>window.__sceneTest?.state.time>.06,{timeout:45000});
  return{page,errors};
 }
 // Desktop: alpha contracts and real input interaction, not just syntax.
 {
  const {page,errors}=await open(1000,800,1.25);
  let check=await page.evaluate(()=>{
   const ids=['layer-moon','structure-rack','structure-cabin','structure-cherry','structure-hearth'];
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
  await page.click('#btn-reset');
  // Render/read within the same JS task: check actual default framebuffer alpha.
  const gpu=await page.evaluate(()=>{window.__sceneTest.pause();window.__sceneTest.render();const c=document.getElementById('layer-raytrace-deck'),g=c.getContext('webgl2'),data=new Uint8Array(c.width*c.height*4);g.readPixels(0,0,c.width,c.height,g.RGBA,g.UNSIGNED_BYTE,data);let invalid=0,transparent=0;for(let i=0;i<data.length;i+=4){if(data[i]>data[i+3]||data[i+1]>data[i+3]||data[i+2]>data[i+3])invalid++;if(data[i+3]<255)transparent++;}return{invalid,transparent,error:g.getError(),attrs:g.getContextAttributes()};});
  assert.equal(gpu.error,0);assert.equal(gpu.invalid,0,'premultiplied alpha violation');assert(gpu.transparent>0);assert(!gpu.attrs.desynchronized);
  await page.screenshot({path:'/home/user/scene-desktop-verified.png'});
  assert.deepEqual(errors,[]);reports.push({case:'desktop controls + GPU alpha',result:'PASS',gpu,canvases:check});await page.close();
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
  await page.screenshot({path:'/home/user/scene-preview-verified.png'});assert.deepEqual(errors,[]);reports.push({case:'fractional DPR damage lattice',result:'PASS',damage});await page.close();
 }
 // Portrait, resizing, and a missing optional high-precision Canvas feature.
 {
  const {page,errors}=await open(430,932,1.5,{noFloat16:true});
  assert(await page.$eval('#layer-raytrace-deck',c=>!c.hidden));
  await page.setViewportSize({width:932,height:430});await page.waitForFunction(()=>window.__sceneTest.state.w===932);
  await page.setViewportSize({width:430,height:932});await page.waitForFunction(()=>window.__sceneTest.state.w===430);
  await page.screenshot({path:'/home/user/scene-portrait-verified.png'});assert.deepEqual(errors,[]);reports.push({case:'portrait + rotation + optional float16 fallback',result:'PASS'});await page.close();
 }
 {
  const {page,errors}=await open(760,670,1,{fallback:true});
  assert(await page.$eval('#layer-deck-fallback',c=>!c.hidden));assert(await page.$eval('#layer-raytrace-deck',c=>c.hidden));
  assert.deepEqual(errors,[]);reports.push({case:'WebGL unavailable fallback',result:'PASS'});await page.close();
 }
 await browser.close();fs.writeFileSync('/home/user/browser-test-results.json',JSON.stringify(reports,null,2));console.log(JSON.stringify(reports,null,2));
})().catch(e=>{console.error(e);process.exit(1)});
