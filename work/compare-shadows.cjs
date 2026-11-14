const{chromium}=require('/home/user/.cache/browser-check/node_modules/playwright');const fs=require('fs'),assert=require('assert'),crypto=require('crypto');const{instrument}=require('./village-hooks.cjs');
(async()=>{
 const source=fs.readFileSync('moonlit-sakura-village.html','utf8'),browser=await chromium.launch({args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const reports=[];
 for(const screen of [{width:960,height:720,dpr:1},{width:430,height:932,dpr:1.5}]){
  const page=await browser.newPage({viewport:{width:screen.width,height:screen.height},deviceScaleFactor:screen.dpr}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});await page.route('**/*',r=>r.fulfill({body:instrument(source),contentType:'text/html'}));await page.goto('http://proof.local/');
  const result=await page.evaluate(async()=>{
   const v=window.__village,s=v.state,r=v.renderer,g=v.gl;if(!r)throw Error('No WebGL renderer');r.extTimer=null;r.shadowDebugIntervals=true;
   const PW=256,PH=192,points=new Float32Array(PW*PH*2);let seed=77191;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return(seed>>>0)/4294967296;};
   // Mix regular receiver coverage with exact input-bit random points. No
   // chaotic shader-side random positions can differ between compiled variants.
   for(let y=0;y<PH;y++)for(let x=0;x<PW;x++){const k=(y*PW+x)*2;if(y<PH/2){points[k]=-.8+3.1*(x+.5)/PW;points[k+1]=-2.8+3.7*(y+.5)/(PH/2);}else{points[k]=-.8+3.1*random();points[k+1]=-2.8+3.7*random();}}
   g.activeTexture(g.TEXTURE0+15);const pt=g.createTexture();g.bindTexture(g.TEXTURE_2D,pt);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.NEAREST);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.NEAREST);g.texImage2D(g.TEXTURE_2D,0,g.RG32F,PW,PH,0,g.RG,g.FLOAT,points);
   const target=g.createTexture();g.bindTexture(g.TEXTURE_2D,target);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.NEAREST);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.NEAREST);g.texImage2D(g.TEXTURE_2D,0,g.RGBA32F,PW,PH,0,g.RGBA,g.FLOAT,null);const fbo=g.createFramebuffer();g.bindFramebuffer(g.FRAMEBUFFER,fbo);g.framebufferTexture2D(g.FRAMEBUFFER,g.COLOR_ATTACHMENT0,g.TEXTURE_2D,target,0);if(g.checkFramebufferStatus(g.FRAMEBUFFER)!==g.FRAMEBUFFER_COMPLETE)throw Error('Float proof framebuffer unavailable');g.bindFramebuffer(g.FRAMEBUFFER,null);
   function program(direct){const src=v.FINAL_COMMON+(direct?v.DIRECT_SHADOW_GLSL:v.SHADOW_GLSL)+`\nuniform sampler2D u_testPoints;void main(){vec2 p=texelFetch(u_testPoints,ivec2(gl_FragCoord.xy),0).rg;vec3 a;float vis=shadowAudit(p,a);outColor=vec4(vis,a/5.0);}`;const vs=r.shader(g.VERTEX_SHADER,v.VERT),p=r.program(vs,src);g.deleteShader(vs);g.useProgram(p.p);g.uniform1i(g.getUniformLocation(p.p,'u_testPoints'),15);g.uniform1i(p.u.u_worldMask,11);g.uniform1i(p.u.u_intervalTex,12);g.uniform1i(p.u.u_noiseTex,1);g.uniform1f(p.u.u_aspect,s.w/s.h);g.uniform2f(p.u.u_worldAtlasSize,2048,768);g.uniform4fv(p.u['u_planeTiles[0]'],v.planeRects);g.uniform4fv(p.u['u_maskMap[0]'],r.maskMap);g.uniform4fv(p.u['u_planeInfo[0]'],v.planeInfo);g.uniform2fv(p.u['u_guardOrigins[0]'],r.guardOrigins);return p;}
   const adaptive=program(false),direct=program(true),cases=[];const nativeRead=()=>{const a=new Uint8Array(g.drawingBufferWidth*g.drawingBufferHeight*4);g.readPixels(0,0,g.drawingBufferWidth,g.drawingBufferHeight,g.RGBA,g.UNSIGNED_BYTE,a);return a;};
   function draw(p){g.bindFramebuffer(g.FRAMEBUFFER,fbo);g.viewport(0,0,PW,PH);g.disable(g.SCISSOR_TEST);r.bind(15,pt);r.bind(11,r.worldMaskTexture);r.bind(12,r.intervalTarget.tex);r.bind(1,r.noise);r.common(p,s.time,s.moonX,s.moonY);g.drawArrays(g.TRIANGLES,0,3);const a=new Float32Array(PW*PH*4);g.readPixels(0,0,PW,PH,g.RGBA,g.FLOAT,a);return a;}
   const poses=[{x:.8,y:.275,soft:1,cx:0,cy:0},{x:.13,y:.55,soft:2.4,cx:0,cy:0},{x:.90,y:.10,soft:.4,cx:0,cy:0},{x:.50,y:.57,soft:1,cx:.055,cy:-.03},{x:.17,y:.28,soft:.4,cx:-.04,cy:.03},{x:.84,y:.56,soft:2.4,cx:.02,cy:.02}];
   for(let n=0;n<poses.length;n++){
    const p=poses[n];Object.assign(s,{moonX:p.x,moonY:p.y,shadowSoftness:p.soft,camNX:p.cx,camNY:p.cy,shadowMode:2});v.staticStep(8+n*.71);const firstNative=nativeRead(),hier=draw(adaptive),ref=draw(direct);
    const metrics=a=>{let max=0,sum=0,over=0,certFalseAccept=0,certPixels=0,rays=0;for(let i=0;i<a.length;i+=4){const d=Math.abs(a[i]-ref[i]);if(!Number.isFinite(d))throw Error('Nonfinite shadow');max=Math.max(max,d);sum+=d;if(d>2e-6)over++;if(a[i+2]>.01){certPixels++;if(d>2e-6)certFalseAccept++;}if(a[i]!==0&&a[i+3]>.01)rays++;}return{receivers:a.length/4,maxVisibilityError:max,meanVisibilityError:sum/(a.length/4),overTolerance:over,certificateFalseAccepts:certFalseAccept,receiversWithCertificate:certPixels,fullRayReceivers:rays};};
    s.shadowMode=0;r.render(s.time);const nativeRef=nativeRead();const nativeMetrics=(a,b)=>{let max=0,sum=0,over=0;for(let i=0;i<a.length;i++){const d=Math.abs(a[i]-b[i]);max=Math.max(max,d);sum+=d;if(d>1)over++;}return{maxChannelError:max,meanChannelError:sum/a.length,channelsOver1:over};};
    const hierarchical=metrics(hier),nativeHier=nativeMetrics(firstNative,nativeRef);
    s.shadowMode=1;r.render(s.time);const flatNative=nativeRead(),flat=draw(adaptive);cases.push({pose:p,hierarchical,flat:metrics(flat),nativeHierarchical:nativeHier,nativeFlat:nativeMetrics(flatNative,nativeRef)});
   }
   // Prove that a pure light/camera edit does not refit geometry intervals.
   s.shadowMode=2;r.render(s.time);const before=r.intervalRefits;s.moonX=.31;s.moonY=.43;s.camNX=-.03;r.render(s.time);const refitsForLightEdit=r.intervalRefits-before;
   g.bindFramebuffer(g.FRAMEBUFFER,null);return{backing:[g.drawingBufferWidth,g.drawingBufferHeight],cases,refitsForLightEdit,glError:g.getError()};
  });
  result.screen=screen;result.sourceSHA256=crypto.createHash('sha256').update(source).digest('hex');reports.push(result);fs.writeFileSync('evidence-village/shadow-error.json',JSON.stringify(reports,null,2));console.log(JSON.stringify(result));assert.equal(result.glError,0);assert.deepEqual(errors,[]);assert.equal(result.refitsForLightEdit,0);await page.close();
 }
 await browser.close();
 const failures=reports.flatMap(r=>r.cases.flatMap(c=>[c.hierarchical.overTolerance,c.flat.overTolerance,c.nativeHierarchical.channelsOver1,c.nativeFlat.channelsOver1]));assert(failures.every(n=>n===0),'Shadow comparison failed; inspect evidence-village/shadow-error.json');
})().catch(e=>{console.error(e);process.exit(1)});
