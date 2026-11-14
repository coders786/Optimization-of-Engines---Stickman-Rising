const DENSITY_FS=HEAD+NOISE_GLSL+`
uniform float u_time,u_aspect;
uniform vec4 u_wind;
uniform int u_pack;
float field(vec2 p){
 if(p.y<0.01||p.y>0.48)return 0.0;
 // Coordinate advection uses integrated wind, not a second noise simulation.
 float ix=p.x*u_aspect*2.45-u_wind.z*0.022,iy=p.y*2.45-u_wind.w*0.006;
 vec3 lut=texture(u_noiseTex,vec2(ix*0.78,iy*0.95)*0.0625).rgb;
 float macro=0.62*lut.r+0.38*noise2(vec2(ix*1.50+3.1,iy*1.70+1.9));
 vec2 q=vec2(ix*1.85+0.14*lut.g,iy*2.15+0.06*(lut.b-0.5));
 float detail=0.0,a=0.50;
 for(int i=0;i<4;i++){detail+=a*noise2(q);q=mat2(1.62,1.24,-1.24,1.62)*q+vec2(3.1,1.7);a*=0.50;}
 float shape=macro*0.56+detail*0.50;
 float alt=smoothstep(0.015,0.11,p.y)*down(0.22,0.47,p.y);
 float cycle=0.5+0.5*sin(u_time*0.11-p.x*1.8);
 return clamp((shape*(0.18+0.88*alt)+0.095*alt*cycle-0.45)/0.25,0.0,1.0);
}
void main(){float d=field(FIELD_MIN+v_uv*FIELD_SIZE);if(u_pack==1){float hi=floor(d*255.0)/255.0;outColor=vec4(hi,(d-hi)*255.0,0.0,1.0);}else outColor=vec4(d,0.0,0.0,1.0);}
`;
const MEDIA_FS=HEAD+`
uniform sampler2D u_density;
uniform vec2 u_densityDecode,u_moonCloud;
uniform float u_aspect,u_rayIntensity;
uniform int u_pack;
float cloud(vec2 p){if(p.y<0.01||p.y>0.48)return 0.0;return dot(texture(u_density,fieldUV(p)).rg,u_densityDecode);}
void main(){
 vec2 p=FIELD_MIN+v_uv*FIELD_SIZE;
 if(p.y<0.01||p.y>0.48){outColor=vec4(0.0);return;}
 vec2 delta=u_moonCloud-p;float dist=length(delta),dMoon=length(delta*vec2(u_aspect,1.0));
 float dens=cloud(p);
 if(dens<=0.005&&dMoon>=0.56){outColor=vec4(0.0);return;}
 vec2 dir=delta/max(0.003,dist);
 float densUp=cloud(p+dir*0.013);
 float edge=mix(0.75,clamp((dens-densUp)*3.2+0.62,0.12,1.5),smoothstep(0.004,0.035,dist));
 float optical=0.0;
 for(int s=0;s<6;s++){float f=(float(s)+0.5)/6.0;optical+=cloud(p+dir*(dist*0.72*f))*(1.0-0.08*float(s));}
 float trans=exp(-optical*(3.3/3.4));
 // Normalized Henyey-Greenstein lobe, using a 2D angular proxy (g = .64).
 float mu=inversesqrt(1.0+4.0*dMoon*dMoon),denom=max(0.1296,1.4096-1.28*mu);
 float phase=0.14+2.65*pow(0.1296/denom,1.5);
 float opacity=1.0-exp(-dens*1.55);
 vec3 ambient=vec3(0.018,0.031,0.054)*opacity;
 vec3 single=vec3(0.92,1.09,1.31)*(trans*phase*edge*opacity);
 vec3 softFill=vec3(0.055,0.079,0.11)*(1.0-trans)*opacity;
 float spill=(1.0-opacity)*trans*trans*(exp(-dMoon*3.2)*0.33+exp(-dMoon*9.0)*0.26)*down(0.02,0.55,dist)*u_rayIntensity;
 float boundary=smoothstep(0.01,0.045,p.y)*down(0.38,0.48,p.y);
 vec3 radiance=(ambient+single+softFill+vec3(0.47,0.68,0.93)*spill)*boundary;
 if(u_pack==1)radiance=sqrt(clamp(radiance/8.0,0.0,1.0));
 outColor=vec4(radiance,opacity*boundary);
}
`;
const FINAL_COMMON=HEAD+NOISE_GLSL+`
uniform sampler2D u_occluderTex,u_density0,u_density1,u_media0,u_media1,u_fogTex;
uniform vec2 u_camShift,u_moonScr,u_doorWindow,u_densityDecode;
uniform vec4 u_wind;
uniform float u_time,u_aspect,u_flicker,u_rayIntensity,u_doorCenter,u_cacheBlend;
uniform int u_mediaPacked,u_fogCached;
const vec2 FOG_MIN=vec2(-0.10,0.36),FOG_SIZE=vec2(1.20,0.41);
float cloudField(vec2 p){if(p.y<0.01||p.y>0.48)return 0.0;vec2 uv=fieldUV(p);return dot(mix(texture(u_density0,uv).rg,texture(u_density1,uv).rg,u_cacheBlend),u_densityDecode);}
vec2 sampleOcc(vec2 p){if(p.x<0.0||p.x>1.0||p.y<=0.0||p.y>=HY)return vec2(0.0);return texture(u_occluderTex,vec2(p.x,p.y/HY)).rg;}
vec3 tone(vec3 x){vec3 a=clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14),0.0,1.0);return pow(a,vec3(0.96));}
vec4 unpackMedia(vec4 m){if(u_mediaPacked==1)m.rgb=m.rgb*m.rgb*8.0;return m;}
vec4 media(vec2 p){if(p.y<0.01||p.y>0.48)return vec4(0.0);vec2 uv=fieldUV(p);return mix(unpackMedia(texture(u_media0,uv)),unpackMedia(texture(u_media1,uv)),u_cacheBlend);}
`;
const VISIBILITY_GLSL=`
float doorRay(vec2 from,vec2 light){
 vec2 delta=light-from;if(dot(delta,delta)<0.000016)return 1.0;
 float vis=1.0;
 for(int i=1;i<=9;i++){vec2 o=sampleOcc(from+delta*(float(i)*0.1));vis*=1.0-clamp((o.r*0.92+o.g*0.58)*0.75,0.0,0.95);if(vis<0.02)break;}
 return vis;
}
vec2 visibilityPair(vec2 scene,vec2 moonScene){
 float trans=1.0,doorVis=1.0;
 float above=max(0.0,HY-scene.y);
 if(above<0.26&&scene.y>0.06){
  vec2 d=moonScene-scene;float len=length(d);vec2 stepV=d*(min(len,0.45)/max(len,0.0001))*0.1;
  for(int s=1;s<=10;s++){vec2 o=sampleOcc(scene+stepV*float(s));trans*=1.0-o.r*0.36-o.g*0.16;if(trans<0.002)break;}
 }
 vec2 door=vec2(u_doorCenter,HY-0.024);
 if(length((scene-door)*vec2(u_aspect,1.0))<0.32)doorVis=doorRay(scene,door);
 return vec2(trans,doorVis);
}
float fogNoise(vec2 p){return fbm3(p*vec2(3.4,5.6)-u_wind.zw*vec2(0.018,0.008));}
vec3 fogSheet(vec2 scene,vec2 moonScene){
 vec2 uv=(scene-FOG_MIN)/FOG_SIZE;
 if(u_fogCached==1&&all(greaterThanEqual(uv,vec2(0.0)))&&all(lessThanEqual(uv,vec2(1.0)))){
  vec3 sheet=texture(u_fogTex,uv).rgb;
  // The compact light source is a measured high-gradient exception. Keep its
  // original visibility integral exact instead of blurring/leaking its spill.
  vec2 door=vec2(u_doorCenter,HY-0.024);
  if(length((scene-door)*vec2(u_aspect,1.0))<0.055)sheet.g=doorRay(scene,door);
  return sheet;
 }
 return vec3(visibilityPair(scene,moonScene),fogNoise(scene));
}
`;
const FOG_FS=FINAL_COMMON+VISIBILITY_GLSL+`
void main(){vec2 p=FOG_MIN+v_uv*FOG_SIZE;vec2 m=u_moonScr+u_camShift*0.64;outColor=vec4(visibilityPair(p,m),fogNoise(p),1.0);}
`;
// AURORA_GLSL is inserted from the existing high-detail aurora implementation.
const SKY_FS=FINAL_COMMON+AURORA_GLSL+VISIBILITY_GLSL+`
void main(){
 vec2 scr=vec2(v_uv.x,1.0-v_uv.y),scene=scr+u_camShift*0.72,cloudPos=scr+u_camShift*0.12;
 vec2 moonScene=u_moonScr+u_camShift*0.64,moonCloud=u_moonScr+u_camShift*0.04;
 float moonDim=exp(-cloudField(moonCloud)*0.95);
 vec4 m=media(cloudPos);float T=1.0-m.a;
 vec3 emit=aurora(scr+u_camShift*0.03,u_time)*T+m.rgb;
 float above=max(0.0,HY-scene.y);
 vec3 sheet=scene.y>0.36?fogSheet(scene,moonScene):vec3(1.0,1.0,0.5);
 // Beer-Lambert optical depth, not an alpha painted independently of color.
 float tau=exp(-above*18.5)*(0.48+0.22*sheet.b)*clamp(u_rayIntensity,0.4,1.8);
 float fog=1.0-exp(-tau),dMoon=length((scene-moonScene)*vec2(u_aspect,1.0));
 vec3 fogCol=vec3(0.026,0.045,0.072)+vec3(0.35,0.52,0.73)*exp(-dMoon*2.5)*0.52*moonDim;
 vec2 door=vec2(u_doorCenter,HY-0.024);float dd=length((scene-door)*vec2(u_aspect,1.0));
 if(dd<0.32){float fall=exp(-dd*11.0)*sheet.g*u_flicker*u_rayIntensity*down(0.24,0.32,dd);fogCol+=vec3(1.25,0.66,0.22)*fall*0.95;emit+=vec3(1.20,0.68,0.26)*fall*0.34;}
 if(above<0.26){emit+=vec3(0.58,0.80,0.98)*(sheet.r*exp(-dMoon*2.1)*exp(-above*8.5)*0.22*moonDim*u_rayIntensity*down(0.20,0.26,above));}
 vec3 color=tone(emit*(1.0-fog)+fogCol*fog);
 float extinction=clamp(1.0-T*(1.0-fog),0.0,1.0);
 outColor=vec4(color,max(extinction,max(color.r,max(color.g,color.b))));
}
`;
