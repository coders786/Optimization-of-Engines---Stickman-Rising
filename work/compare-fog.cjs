const{chromium}=require('/home/user/.cache/browser-check/node_modules/playwright');const fs=require('fs'),assert=require('assert'),crypto=require('crypto');
const source=fs.readFileSync('moonlit-sakura-optics.html','utf8');
const hook=`bakeCommonSprites();initGL();resize();
window.__fogProof={state,gl,renderer,occCanvas,resize,updateWind,windAt,
setup(t){state.time=t;updateWind(t);applyParallax(t);updateGeometry(t);drawStructureIslands(t);updateOccluder(t);renderer.render(t);},
makeDiagnostic(){const fs=FINAL_COMMON+VISIBILITY_GLSL+\`void main(){vec2 p=vec2(v_uv.x,1.0-v_uv.y)+u_camShift*.72;outColor=vec4(fogSheet(p,u_moonScr+u_camShift*.64),1.0);}\`;const vs=renderer.shader(gl.VERTEX_SHADER,VERT),p=renderer.program(vs,fs);gl.deleteShader(vs);gl.useProgram(p.p);gl.uniform1f(p.u.u_aspect,state.w/state.h);gl.uniform1i(p.u.u_occluderTex,0);gl.uniform1i(p.u.u_noiseTex,1);gl.uniform1i(p.u.u_fogTex,7);return p;}
};`;
assert(source.includes('bakeCommonSprites();initGL();resize();schedule();'));
(async()=>{
 const browser=await chromium.launch({args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const reports=[];
 for(const screen of [{width:960,height:720,dpr:1},{width:430,height:932,dpr:1.5}]){
  const page=await browser.newPage({viewport:{width:screen.width,height:screen.height},deviceScaleFactor:screen.dpr});const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  await page.addInitScript(()=>{let a=9137;Math.random=()=>{a=(Math.imul(a,1664525)+1013904223)|0;return(a>>>0)/4294967296;};});
  await page.route('**/*',r=>r.fulfill({body:source.replace('bakeCommonSprites();initGL();resize();schedule();',hook),contentType:'text/html'}));await page.goto('http://proof.local/');
  const result=await page.evaluate(async({screen})=>{
   const b=window.__fogProof,s=b.state,r=b.renderer,g=b.gl;r.extTimer=null;const W=g.drawingBufferWidth,H=g.drawingBufferHeight;
   const diagnostic=b.makeDiagnostic(),data=()=>{const a=new Uint8Array(W*H*4);g.readPixels(0,0,W,H,g.RGBA,g.UNSIGNED_BYTE,a);return a;};
   const stats=(a,b,channels,diagnostic=false,edgeMask=null)=>{
    const hist=new Uint32Array(256),edgeHist=new Uint32Array(256);let sum=0,sq=0,max=0,maxPixel=null,count=0,edgeCount=0,edgeSum=0,edgeMax=0,changed=0,more3=0;
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){
     const sceneY=1-(y+.5)/H+s.camNY*.72;if(sceneY<.36||sceneY>=.740)continue;
     const i=(y*W+x)*4,edge=edgeMask?!!edgeMask[y*W+x]:(diagnostic?((b[i]>3&&b[i]<252)||(b[i+1]>3&&b[i+1]<252)):false);
     for(let j=0;j<channels;j++){const d=Math.abs(a[i+j]-b[i+j]);sum+=d;sq+=d*d;if(d>max){max=d;maxPixel={x,y:H-1-y,scene:[(x+.5)/W+s.camNX*.72,sceneY],cached:Array.from(a.slice(i,i+4)),direct:Array.from(b.slice(i,i+4))};}count++;hist[d]++;if(d)changed++;if(d>3)more3++;if(edge){edgeCount++;edgeSum+=d;edgeMax=Math.max(edgeMax,d);edgeHist[d]++;}}
    }
    const q=(h,n,f)=>{let a=0;for(let i=0;i<h.length;i++){a+=h[i];if(a>=n*f)return i;}return 0;};
    return{mean:sum/count,rmse:Math.sqrt(sq/count),p95:q(hist,count,.95),p99:q(hist,count,.99),max,maxPixel,percentOver3:100*more3/count,edge:edgeCount?{samples:edgeCount,mean:edgeSum/edgeCount,p95:q(edgeHist,edgeCount,.95),p99:q(edgeHist,edgeCount,.99),max:edgeMax}:null};
   };
   function drawDiag(cached){s.fogCached=cached;g.bindFramebuffer(g.FRAMEBUFFER,null);g.viewport(0,0,W,H);g.disable(g.SCISSOR_TEST);r.common(diagnostic,s.time,.5+(s.moonX-.5)*(1+.008*Math.sin(s.time*.45)),.5+(s.moonY-.5)*(1+.008*Math.sin(s.time*.45)));g.drawArrays(g.TRIANGLES,0,3);return data();}
   const out=[];
   const cases=[{name:'still',t:8,mx:.8,my:.275,cx:0,cy:0,lag:0},{name:'grazing-moon',t:16,mx:.18,my:.55,cx:0,cy:0,lag:0},{name:'parallax',t:26,mx:.85,my:.13,cx:.052,cy:-.031,lag:0},{name:'one-refresh-lag',t:41,mx:.6,my:.32,cx:-.04,cy:.03,lag:1/60}];
   for(const [w,h] of [[256,96],[384,144],[512,192],[768,288],[1024,384]]){
    const target=r.target(w,h,false,true),rawTarget=r.fogRawTarget?r.target(w,h,false,true):null;r.fogTarget=target;if(rawTarget)r.fogRawTarget=rawTarget;
    for(const c of cases){
     Object.assign(s,{moonX:c.mx,moonY:c.my,camNX:c.cx,camNY:c.cy,fogCached:true});r.lastFogTime=-100;b.setup(c.t);
     if(c.lag){s.time=c.t+c.lag;b.updateWind(s.time);/* same occluder version and cached field, simulating an intervening frame */r.fogMX=.5+(s.moonX-.5)*(1+.008*Math.sin(s.time*.45));r.fogMY=.5+(s.moonY-.5)*(1+.008*Math.sin(s.time*.45));r.lastFogTime=s.time;r.render(s.time);}
     const cached=data();s.fogCached=false;r.render(s.time);const direct=data();
     const cachedDiag=drawDiag(true),directDiag=drawDiag(false);
     const edges=new Uint8Array(W*H);
     for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){
      const i=(y*W+x)*4;let change=0;
      for(const offset of [-4,4,-4*W,4*W])for(let j=0;j<2;j++)change=Math.max(change,Math.abs(directDiag[i+j]-directDiag[i+offset+j]));
      if(change>4)edges[y*W+x]=1;
     }
     const fieldData=new Uint8Array(w*h*4),flagCounts=[0,0,0,0];g.bindFramebuffer(g.FRAMEBUFFER,target.fbo);g.readPixels(0,0,w,h,g.RGBA,g.UNSIGNED_BYTE,fieldData);g.bindFramebuffer(g.FRAMEBUFFER,null);for(let i=3;i<fieldData.length;i+=4)flagCounts[Math.round(fieldData[i]/85)]++;
     out.push({field:[w,h],bytes:w*h*4*(rawTarget?2:1),case:c.name,flagCounts,frameRGBA:stats(cached,direct,4,false,edges),visibilityRG:stats(cachedDiag,directDiag,2,true)});
    }
    g.deleteFramebuffer(target.fbo);g.deleteTexture(target.tex);if(rawTarget){g.deleteFramebuffer(rawTarget.fbo);g.deleteTexture(rawTarget.tex);}
   }
   return{screen,backing:[W,H],comparisons:out,glError:g.getError()};
  },{screen});assert.equal(result.glError,0);assert.deepEqual(errors,[]);result.sourceSHA256=crypto.createHash('sha256').update(source).digest('hex');reports.push(result);console.log(screen.width+'x'+screen.height,JSON.stringify(result));await page.close();
 }
 fs.writeFileSync('evidence/fog-error.json',JSON.stringify(reports,null,2));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
