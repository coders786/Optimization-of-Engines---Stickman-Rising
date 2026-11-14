from pathlib import Path
p=Path('/home/user/moonlit-sakura-optimized.html')
s=p.read_text()
def replace(a,b):
 global s
 n=s.count(a)
 assert n==1,(n,a[:140])
 s=s.replace(a,b)
replace('Moonlit Sakura Sanctuary — Coherent Lightfield Edition','Moonlit Sakura Sanctuary — Seamless Lightfield Edition')
replace('function ctx2(canvas,alpha=true){let c=contexts.get(canvas);if(!c){c=canvas.getContext(\'2d\',{alpha,desynchronized:true});contexts.set(canvas,c);}return c;}', '''// Transparent layers must use the browser's alpha-aware compositor. Low-latency
// desynchronized surfaces can become opaque overlay planes on some Windows GPUs.
function ctx2(canvas,alpha=true){
 let c=contexts.get(canvas);
 if(!c){
  c=canvas.getContext('2d',{alpha,desynchronized:false,colorSpace:'srgb'});
  contexts.set(canvas,c);
 }
 return c;
}''')
replace('preserveDrawingBuffer:false,desynchronized:true,powerPreference:', 'preserveDrawingBuffer:false,desynchronized:false,powerPreference:')
replace('.island{position:absolute;pointer-events:none}', '.island{position:absolute;pointer-events:none}\ncanvas{background:transparent}[hidden]{display:none!important}')
old=' clear(){const c=this.c,n=this.cols,t=this.tile,a=this.old,b=this.next;c.setTransform(this.ratio,0,0,this.ratio,0,0);c.globalAlpha=1;let count=0;for(let i=0;i<a.length;i++)count+=a[i]|b[i];if(count>a.length*.58){c.clearRect(0,0,this.w,this.h);return;}for(let y=0;y<this.rows;y++){let x=0;while(x<n){while(x<n&&!(a[y*n+x]|b[y*n+x]))x++;const start=x;while(x<n&&(a[y*n+x]|b[y*n+x]))x++;if(x>start)c.clearRect(start*t,y*t,(x-start)*t,t);}}}'
new=''' clear(){
  const c=this.c,n=this.cols,t=this.tile,a=this.old,b=this.next,r=this.ratio;
  c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;
  let count=0;
  for(let i=0;i<a.length;i++)count+=a[i]|b[i];
  if(count>a.length*.58)c.clearRect(0,0,this.canvas.width,this.canvas.height);
  else for(let y=0;y<this.rows;y++){
   let x=0;
   while(x<n){
    while(x<n&&!(a[y*n+x]|b[y*n+x]))x++;
    const start=x;
    while(x<n&&(a[y*n+x]|b[y*n+x]))x++;
    if(x>start){
     const left=Math.floor(start*t*r),top=Math.floor(y*t*r);
     c.clearRect(left,top,Math.ceil(x*t*r)-left,Math.ceil((y+1)*t*r)-top);
    }
   }
  }
  c.setTransform(r,0,0,r,0,0);
 }'''
replace(old,new)
replace(' float ign=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(0.06711056,0.00583715))));\n float optical=0.0;\n for(int s=0;s<6;s++){float f=(float(s)+0.32+0.34*ign)/6.0;optical+=cloud(p+dir*(dist*0.72*f))*(1.0-0.08*float(s));}', ''' // Stable midpoint quadrature avoids magnified low-resolution noise grids.
 float optical=0.0;
 for(int s=0;s<6;s++){float f=(float(s)+0.5)/6.0;optical+=cloud(p+dir*(dist*0.72*f))*(1.0-0.08*float(s));}''')
replace(' vec3 radiance=dark+rim+vec3(0.54,0.82,1.12)*spill;\n if(u_pack==1)radiance=sqrt(clamp(radiance/8.0,0.0,1.0));\n outColor=vec4(radiance,clamp(dens*0.92,0.0,0.93));', ''' // Both radiance and extinction approach zero BEFORE the cache boundary.
 // This removes the horizontal atmospheric rectangle without hiding detail.
 float boundary=smoothstep(0.01,0.045,p.y)*down(0.38,0.48,p.y);
 vec3 radiance=(dark+rim+vec3(0.54,0.82,1.12)*spill)*boundary;
 if(u_pack==1)radiance=sqrt(clamp(radiance/8.0,0.0,1.0));
 outColor=vec4(radiance,clamp(dens*0.92,0.0,0.93)*boundary);''')
replace('c1=smoothstep(0.0,0.026,dy1)*exp(-dy1*11.5)*rays;', 'c1=smoothstep(0.0,0.026,dy1)*exp(-dy1*11.5)*rays*down(0.18,0.22,dy1);')
replace('c2=smoothstep(0.0,0.024,dy2)*exp(-dy2*13.5)*(0.30+0.70*smoothstep(0.28,0.86,n));', 'c2=smoothstep(0.0,0.024,dy2)*exp(-dy2*13.5)*(0.30+0.70*smoothstep(0.28,0.86,n))*down(0.145,0.18,dy2);')
replace(' outColor=vec4(tone(emit*(1.0-fog)+fogCol*fog),clamp(1.0-T*(1.0-fog),0.0,1.0));', ''' vec3 color=tone(emit*(1.0-fog)+fogCol*fog);
 float extinction=clamp(1.0-T*(1.0-fog),0.0,1.0);
 // Valid premultiplied output: RGB must never exceed coverage. Otherwise
 // transparent glow adds on top of an already-white moon and destroys craters.
 float coverage=max(extinction,max(color.r,max(color.g,color.b)));
 outColor=vec4(color,coverage);''')
replace("[0,`rgba(92,112,128,${a*.48})`],[.65,`rgba(112,134,150,${a*.24})`]", "[0,`rgba(92,112,128,${a*.62})`],[.65,`rgba(112,134,150,${a*.32})`]")
# Keep normals native but antialias tiny plank joints using the actual pixel footprint.
replace('float seam=smoothstep(0.0,sw,pu)*down(1.0-sw,1.0,pu),joint=fract(wz*4.4+seed*5.3);', '''float seamAA=max(fwidth(plank)*0.5,0.0001);
 float seam=smoothstep(0.0,max(sw,seamAA),pu)*down(1.0-max(sw,seamAA),1.0,pu),joint=fract(wz*4.4+seed*5.3);''')
# Document runtime fixes, not speculative performance claims.
replace('   No particle-count, octave, PCF-tap or output-resolution governor is used.', '''   Compositor-safe transparent surfaces, bounded premultiplied lighting,
   continuous atmosphere boundaries and physical-pixel damage clears prevent
   black layer boxes, lunar clipping, cache seams and fractional-DPR trails.
   No particle-count, octave, PCF-tap or output-resolution governor is used.''')
p.write_text(s)
Path('/home/user/scene-check.js').write_text(s.split('<script>',1)[1].split('</script>',1)[0])
