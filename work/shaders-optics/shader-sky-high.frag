#version 300 es
precision highp float;
precision highp int;
in vec2 v_uv;
out vec4 outColor;
const float HY=0.740,VPX=0.565,VPY=0.340;
const vec2 FIELD_MIN=vec2(-0.18,-0.025),FIELD_SIZE=vec2(1.36,0.53);
float down(float a,float b,float x){return 1.0-smoothstep(a,b,x);}
vec2 fieldUV(vec2 p){return (p-FIELD_MIN)/FIELD_SIZE;}

uniform sampler2D u_noiseTex;
float noise2(vec2 p){return texture(u_noiseTex,p*0.0625).r;}
float hash12(vec2 p){return texture(u_noiseTex,p*0.19).b;}
float fbm3(vec2 p){return dot(texture(u_noiseTex,p*0.0625).rgb,vec3(0.54,0.30,0.16));}

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

vec3 aurora(vec2 p,float t){
 if(p.y<0.02||p.y>0.50||p.x>0.82)return vec3(0.0);
 float fade=smoothstep(0.01,0.16,p.x)*down(0.50,0.80,p.x);if(fade<0.005)return vec3(0.0);
 float y1=0.25-0.04*p.x+0.048*sin(p.x*5.2+t*0.22)+0.022*cos(p.x*9.5-t*0.16),dy1=y1-p.y,c1=0.0;
 if(dy1>0.0&&dy1<0.22){float n1=texture(u_noiseTex,vec2(p.x*0.42+0.015*sin(p.x*11.0+t*0.35)+t*0.011,p.y*0.05-t*0.008)).r;float n2=texture(u_noiseTex,vec2(p.x*0.95-t*0.008,p.y*0.08+0.3)).g;float rays=0.35+0.65*smoothstep(0.25,0.85,n1*0.62+n2*0.38);c1=smoothstep(0.0,0.026,dy1)*exp(-dy1*11.5)*rays*down(0.18,0.22,dy1);}
 float y2=0.33-0.03*p.x+0.038*sin(p.x*4.3-t*0.18+1.5),dy2=y2-p.y,c2=0.0;
 if(dy2>0.0&&dy2<0.18){float n=texture(u_noiseTex,vec2(p.x*0.65-t*0.013,p.y*0.06+0.6)).g;c2=smoothstep(0.0,0.024,dy2)*exp(-dy2*13.5)*(0.30+0.70*smoothstep(0.28,0.86,n))*down(0.145,0.18,dy2);}
 vec3 a=mix(vec3(0.06,0.95,0.72),vec3(0.48,0.28,0.92),clamp(dy1/0.16,0.0,1.0));
 vec3 b=mix(vec3(0.10,0.84,0.92),vec3(0.68,0.24,0.86),clamp(dy2/0.14,0.0,1.0));
 return(a*c1*0.56+b*c2*0.44)*fade*(0.82+0.18*sin(t*0.45+p.x*4.0));
}

float doorRay(vec2 from,vec2 light){
 vec2 delta=light-from;if(dot(delta,delta)<0.000016)return 1.0;
 float vis=1.0;
 for(int i=1;i<=9;i++){vec2 o=sampleOcc(from+delta*(float(i)*0.1));vis*=1.0-clamp((o.r*0.92+o.g*0.58)*0.75,0.0,0.95);if(vis<0.02)break;}
 return vis;
}
float moonVisibility(vec2 scene,vec2 moonScene){
 float trans=1.0;
 float above=max(0.0,HY-scene.y);
 if(above<0.26&&scene.y>0.06){
  vec2 d=moonScene-scene;float len=length(d);vec2 stepV=d*(min(len,0.45)/max(len,0.0001))*0.1;
  for(int s=1;s<=10;s++){vec2 o=sampleOcc(scene+stepV*float(s));trans*=1.0-o.r*0.36-o.g*0.16;if(trans<0.002)break;}
 }
 return trans;
}
vec2 visibilityPair(vec2 scene,vec2 moonScene){
 vec2 door=vec2(u_doorCenter,HY-0.024);
 float doorVis=length((scene-door)*vec2(u_aspect,1.0))<0.32?doorRay(scene,door):1.0;
 return vec2(moonVisibility(scene,moonScene),doorVis);
}
float fogNoise(vec2 p){return fbm3(p*vec2(3.4,5.6)-u_wind.zw*vec2(0.018,0.008));}
vec3 fogSheet(vec2 scene,vec2 moonScene){
 vec2 uv=(scene-FOG_MIN)/FOG_SIZE;
 if(u_fogCached==1&&all(greaterThanEqual(uv,vec2(0.0)))&&all(lessThanEqual(uv,vec2(1.0)))){
  vec3 sheet=texture(u_fogTex,uv).rgb;
  // The nearest classified cell's 3x3 neighborhood contains all four
  // bilinear contributors. Separate bits avoid recomputing the other light.
  ivec2 size=textureSize(u_fogTex,0),cell=clamp(ivec2(uv*vec2(size)),ivec2(0),size-1);
  int flags=int(texelFetch(u_fogTex,cell,0).a*3.0+0.5);
  if((flags&1)!=0)sheet.r=moonVisibility(scene,moonScene);
  vec2 door=vec2(u_doorCenter,HY-0.024);float dd=length((scene-door)*vec2(u_aspect,1.0));
  if(dd>=0.32)sheet.g=1.0;
  else if((flags&2)!=0||dd<0.055)sheet.g=doorRay(scene,door);
  return sheet;
 }
 return vec3(visibilityPair(scene,moonScene),fogNoise(scene));
}

void main(){
 vec2 scr=vec2(v_uv.x,1.0-v_uv.y),scene=scr+u_camShift*0.72,cloudPos=scr+u_camShift*0.12;
 vec2 moonScene=u_moonScr+u_camShift*0.64,moonCloud=u_moonScr+u_camShift*0.04;
 float moonDim=exp(-cloudField(moonCloud)*0.95);
 vec4 m=media(cloudPos);float T=1.0-m.a;
 vec3 emit=aurora(scr+u_camShift*0.03,u_time)*T+m.rgb;
 float above=max(0.0,HY-scene.y);
 vec3 sheet=vec3(1.0,1.0,0.5);
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
