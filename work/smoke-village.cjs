const fs=require('fs'),vm=require('vm');
const code=fs.readFileSync('village-check.js','utf8');
function test(useGL,floatTargets){
 let now=0,rafId=0,nextRAF=null,draws=0,seq=0;const shaders=[],programs=[];
 const events=new Map();
 function listen(el,n,f){const k=el.id+':'+n;if(!events.has(k))events.set(k,[]);events.get(k).push(f);}
 function emit(id,n,e={}){for(const f of events.get(id+':'+n)||[])f({target:elements[id],currentTarget:elements[id],...e});}
 const no=(...args)=>{for(const a of args)if(typeof a==='number'&&!Number.isFinite(a))throw Error('Nonfinite canvas arg');};
 function context2(){return new Proxy({globalAlpha:1,getImageData:(x,y,w,h)=>({data:new Uint8ClampedArray(w*h*4),width:w,height:h}),createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4),width:w,height:h}),createLinearGradient:(...a)=>{no(...a);return {addColorStop:no}},createRadialGradient:(...a)=>{no(...a);return {addColorStop:no}}},{get:(o,k)=>k in o?o[k]:no,set:(o,k,v)=>{if(k==='globalAlpha'&&!(v>=0&&v<=1))throw Error('Bad alpha '+v);o[k]=v;return true;}});}
 const glConstants={MAX_TEXTURE_SIZE:8192,COMPILE_STATUS:1,LINK_STATUS:2,FRAMEBUFFER_COMPLETE:3};
 const gl=new Proxy({
  getExtension:n=>n==='EXT_color_buffer_float'&&floatTargets?{}:null,
  getParameter:k=>k===8192?8192:0,
  createShader:t=>({id:++seq,t}),shaderSource:(s,src)=>{s.source=src;shaders.push(s)},compileShader:no,getShaderParameter:()=>true,
  createProgram:()=>{let p={id:++seq,shaders:[]};programs.push(p);return p;},attachShader:(p,s)=>p.shaders.push(s),getProgramParameter:()=>true,
  getUniformLocation:(p,n)=>({p,n}),checkFramebufferStatus:()=>3,drawArrays:()=>draws++,
 },{get:(o,k)=>{if(k in o)return o[k];if(k in glConstants)return glConstants[k];if(k.startsWith('create'))return()=>({id:++seq});if(k.toUpperCase()===k)return glConstants[k]??(glConstants[k]=++seq+9000);return no;}});
 function element(id){const classes=new Set();let c=null;const e={id,style:{},dataset:{},width:300,height:150,hidden:false,value:'1',classList:{contains:k=>classes.has(k),toggle:(k,v)=>{if(v===undefined)v=!classes.has(k);if(v)classes.add(k);else classes.delete(k);return v;}},getContext:t=>t==='webgl2'?(useGL?gl:null):(c??=context2()),addEventListener:(n,f)=>listen(e,n,f),querySelectorAll:()=>[],closest(){return this;},setPointerCapture:no};return e;}
 const elements=new Proxy({},{get:(o,k)=>o[k]??(o[k]=element(k))});
 const document={id:'document',hidden:false,getElementById:id=>elements[id],createElement:()=>element('created-'+(++seq)),addEventListener:(n,f)=>listen(document,n,f)};
 const window={id:'window',innerWidth:1600,innerHeight:900,devicePixelRatio:1.5,addEventListener:(n,f)=>listen(window,n,f)};
 const sandbox={document,window,navigator:{hardwareConcurrency:8,deviceMemory:8},performance:{now:()=>now},console:{warn:(...a)=>{if(useGL)throw new Error(a.join(' '));}},requestAnimationFrame:f=>{nextRAF=f;return ++rafId},cancelAnimationFrame:()=>{nextRAF=null},Math,Float32Array,Uint8Array,WeakMap,Object,Array,Infinity};
 sandbox.__mockShadowSAT=true;
 vm.runInNewContext(code.replace('updateShadowSAT(){','updateShadowSAT(){if(globalThis.__mockShadowSAT)return;'),sandbox,{timeout:10000});
 for(let i=0;i<2500;i++){
  now+=1000/(i<500?144:60);
  if(i===100)emit('stage','pointerdown',{clientX:1250,clientY:240,shiftKey:true,pointerId:1});
  if(i>100&&i<190)emit('window','pointermove',{clientX:1200+(i-100)*2,clientY:230+(i-100),pointerId:1});
  if(i===190)emit('window','pointerup');
  if(i===300){elements['btn-ray-debug'].closest=()=>elements['btn-ray-debug'];emit('btn-ray-debug','click');}
  if(i===400)emit('btn-ray-debug','click');
  if(i===600){elements['rng-wind'].value='1.8';emit('rng-wind','input');}
  if(i===900){elements['rng-wind'].value='0';emit('rng-wind','input');}
  if(i===1300){const b=element('shadowDirect');b.dataset.shadow='0';emit('shadow-engine-group','click',{target:b});}
  if(i===1600){const b=element('shadowFlat');b.dataset.shadow='1';emit('shadow-engine-group','click',{target:b});}
  if(i===1900){const b=element('shadowSAT');b.dataset.shadow='2';emit('shadow-engine-group','click',{target:b});}
  if(i===2000){elements['rng-shadow-soft'].value='2.4';emit('rng-shadow-soft','input');}
  if(i===1200){const b=element('fogDirect');b.dataset.solver='direct';emit('fog-solver-group','click',{target:b});}
  if(i===1500){const b=element('fogCached');b.dataset.solver='cached';emit('fog-solver-group','click',{target:b});}
  if(i===500){window.innerWidth=430;window.innerHeight=932;emit('window','resize');}
  if(i===800){window.innerWidth=2560;window.innerHeight=1440;emit('window','resize');}
  if(i===1000)emit('stage','pointerdown',{clientX:1600,clientY:1300,shiftKey:false,pointerId:2});
  if(i===1100){const b=element('button');b.dataset.perf='high';emit('perf-mode-group','click',{target:b});}
  if(i===1400){const b=element('syncButton');b.dataset.sync='60';emit('vsync-group','click',{target:b});}
  const f=nextRAF;nextRAF=null;if(!f)throw Error('Missing rAF');f(now);
 }
 if(useGL){fs.mkdirSync('shaders-village-final',{recursive:true});for(let i=0;i<programs.length;i++){const shader=programs[i].shaders.find(s=>s.source.includes('out vec4'));fs.writeFileSync('shaders-village-final/shader-'+(floatTargets?'float-':'packed-')+String(i).padStart(2,'0')+'.frag',shader.source);}fs.writeFileSync('shaders-village-final/shader.vert',shaders[0].source);}


 console.log('PASS',useGL?'WebGL mock':'Canvas fallback',floatTargets?'float':'packed',draws,'GL draws',programs.length,'programs');
}
test(false,false);test(true,true);test(true,false);
