const {chromium}=require('/home/user/.cache/browser-check/node_modules/playwright');
const fs=require('fs'),crypto=require('crypto');
const marker='bakeCommonSprites();initGL();resize();schedule();';
const expose=`bakeCommonSprites();initGL();resize();
window.__proof={state,get renderer(){return renderer},gl,resize,
step(t,dt=1/60){state.time=t;state.cullTotal=0;state.cullSkipped=0;if(typeof updateWind==='function')updateWind(t);applyParallax(t);updateGeometry(t);drawSkyFX(t,dt);drawDeadTree(t);drawMist(t);drawStructureIslands(t);drawLife(t,dt);updateOccluder(t);renderer.render(t);drawForeground(t,dt);},
staticStep(t){state.time=t;if(typeof updateWind==='function')updateWind(t);updateGeometry(t);drawStructureIslands(t);updateOccluder(t);renderer.render(t);},
};`;
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const variants=process.argv.slice(2).length?process.argv.slice(2):['baseline'];
 const reports=[];
 for(const name of variants){
  const file=name.startsWith('baseline')?'versions/moonlit-sakura-before-optics.html':'moonlit-sakura-optics.html';
  const originalSource=fs.readFileSync('/home/user/'+file,'utf8'),sourceSHA256=crypto.createHash('sha256').update(originalSource).digest('hex');
  const html=originalSource.replace(marker,expose);
  if(!html.includes('window.__proof'))throw new Error('No test hook');
  const p=await browser.newPage({viewport:{width:960,height:720},deviceScaleFactor:1});
  const errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await p.addInitScript(()=>{let a=9137;Math.random=()=>{a=(Math.imul(a,1664525)+1013904223)|0;return(a>>>0)/4294967296;};});
  await p.route('http://127.0.0.1:3000/**',r=>r.fulfill({body:html,contentType:'text/html'}));
  await p.goto('http://127.0.0.1:3000/');
  const metrics=await p.evaluate(async ({name})=>{
   const b=window.__proof,g=b.gl,r=b.renderer;if(!g||!r)throw Error('WebGL not active');
   const ext=g.getExtension('WEBGL_debug_renderer_info');
   const renderer=ext?g.getParameter(ext.UNMASKED_RENDERER_WEBGL):g.getParameter(g.RENDERER);
   r.extTimer=null;b.state.fogCached=!name.startsWith('reference');b.state.cacheHz=30;
   if(name.startsWith('field-')){const [w,h]=name.slice(6).split('x').map(Number);b.state.fogWidth=w;b.state.fogHeight=h;r.resize();}
   let draws=0;const original=g.drawArrays.bind(g);g.drawArrays=(...a)=>{draws++;return original(...a)};
   const pixel=new Uint8Array(4),timer=g.getExtension('EXT_disjoint_timer_query_webgl2');
   for(let i=0;i<12;i++){b.step(8+i/60);g.readPixels(0,0,1,1,g.RGBA,g.UNSIGNED_BYTE,pixel);}
   const results=[];
   for(let trial=0;trial<3;trial++){
    if('cacheValid'in r)r.cacheValid=false;
    const samples=[],submit=[],counts=[],queries=[],gpu=[];
    for(let i=0;i<32;i++){
     const q=timer?g.createQuery():null;if(q)g.beginQuery(timer.TIME_ELAPSED_EXT,q);const before=draws,start=performance.now();b.step(10+trial*2+i/60);const queued=performance.now();if(q)g.endQuery(timer.TIME_ELAPSED_EXT);g.readPixels(0,0,1,1,g.RGBA,g.UNSIGNED_BYTE,pixel);samples.push(performance.now()-start);submit.push(queued-start);counts.push(draws-before);if(q)queries.push(q);
    }
    if(queries.length){await new Promise(resolve=>{const poll=()=>{if(g.getQueryParameter(queries.at(-1),g.QUERY_RESULT_AVAILABLE))resolve();else setTimeout(poll,8)};poll()});if(g.getParameter(timer.GPU_DISJOINT_EXT))throw Error('GPU timer disjoint');for(const q of queries){gpu.push(g.getQueryParameter(q,g.QUERY_RESULT)/1e6);g.deleteQuery(q);}}
    const stats=a=>{a=[...a].sort((a,b)=>a-b);return{median:a[Math.floor(a.length*.5)],p95:a[Math.floor(a.length*.95)],mean:a.reduce((x,y)=>x+y,0)/a.length,min:a[0],max:a.at(-1)}};
    results.push({gpuMs:gpu.length?stats(gpu):null,completedReadbackMs:stats(samples),submissionMs:stats(submit),draws:stats(counts),samples,gpuSamples:gpu});
   }
   b.staticStep(14.5);g.finish();
   return{renderer,userAgent:navigator.userAgent,cacheHz:b.state.cacheHz,fogCached:b.state.fogCached,fogField:r.fogTarget?[r.fogTarget.w,r.fogTarget.h]:null,fogFieldBytes:r.fogTarget?r.fogTarget.w*r.fogTarget.h*(r.fogRawTarget?8:4):0,viewport:[innerWidth,innerHeight],backing:[g.drawingBufferWidth,g.drawingBufferHeight],trials:results,glError:g.getError(),timerExtension:!!g.getExtension('EXT_disjoint_timer_query_webgl2')};
  },{name});
  await p.screenshot({path:'/home/user/evidence/'+name+'-960.png'});
  if(errors.length)throw Error(errors.join('\n'));
  reports.push({variant:name,sourceSHA256,metrics,errors});
  fs.writeFileSync('/home/user/evidence/benchmark-'+name+'.json',JSON.stringify(reports.at(-1),null,2));
  console.log(name,JSON.stringify({...metrics,trials:metrics.trials.map(({samples,gpuSamples,...s})=>s)}));
  await p.close();
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
