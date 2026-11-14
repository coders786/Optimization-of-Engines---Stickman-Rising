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

uniform sampler2D u_moonTex,u_skyTex,u_reflectionTex,u_waterBase;
uniform vec4 u_ripples[4],u_waves[3],u_skyAtlas,u_reflectionBounds,u_waterRect;
uniform float u_moonAtlasSize;
vec3 untone(vec3 y){
 y=pow(clamp(y,0.0,0.999),vec3(1.0/0.96));
 vec3 a=2.51-2.43*y,b=0.03-0.59*y;
 return max(vec3(0.0),(-b+sqrt(b*b+0.56*a*y))/(2.0*a));
}
float puddle(vec2 w){
 vec2 d=(w-vec2(0.636,0.145))/vec2(0.046,0.078);float a=atan(d.y,d.x);
 return length(d)-(1.0+0.11*sin(a*3.0+0.8)+0.07*cos(a*5.0-1.2)+0.04*sin(a*7.0));
}
vec3 linearPremult(vec4 c){return c.rgb*c.rgb/max(c.a,0.0001);}
vec3 reflection(vec2 w,vec3 n,vec2 moonScene,float moonDim){
 // Environment probe projection appropriate to this layered 2.5D scene.
 vec2 p=vec2(w.x+0.155+n.x*0.19,HY-0.43-(w.y-0.08)*1.5+n.z*0.15);
 vec2 skyP=p+u_camShift*(0.03-0.72);
 vec3 col=texture(u_skyTex,u_skyAtlas.xy+skyP*u_skyAtlas.zw).rgb;
 col=col*col*0.80+aurora(skyP,u_time)*0.85;
 vec2 moonUV=vec2(0.5)+(p-moonScene)*vec2(u_aspect,1.0)/u_moonAtlasSize;
 vec4 lunar=texture(u_moonTex,moonUV);
 col=col*(1.0-lunar.a)+linearPremult(lunar)*4.8*moonDim;
 vec4 clouds=media(p+u_camShift*(0.12-0.72));
 col=col*(1.0-clouds.a)+clouds.rgb*1.10;
 vec2 reflectedPoint=vec2(w.x+0.045+n.x*0.065,HY-0.03-w.y*1.15+n.z*0.055);
 vec2 proxyUV=(reflectedPoint-u_reflectionBounds.xy)/u_reflectionBounds.zw;
 if(all(greaterThanEqual(proxyUV,vec2(0.0)))&&all(lessThanEqual(proxyUV,vec2(1.0)))){
  vec4 object=texture(u_reflectionTex,proxyUV);
  col=col*(1.0-object.a)+linearPremult(object)*1.15;
 }
 return col;
}
void main(){
 vec2 scr=vec2(v_uv.x,1.0-v_uv.y),moonScene=u_moonScr+u_camShift*0.64;
 float hy=HY-u_camShift.y*0.72,persp=1.0+(scr.y-hy)/(HY-VPY);
 float wx=VPX+(scr.x+u_camShift.x*(0.72+(persp-1.0)*1.48)-VPX)/persp,wz=1.0-1.0/persp;
 float moonDim=exp(-cloudField(u_moonScr+u_camShift*0.04)*0.95);
 vec3 base=texelFetch(u_waterBase,ivec2(gl_FragCoord.xy)-ivec2(u_waterRect.xy),0).rgb;
 vec3 col=untone(base)/1.18;
  float ps=puddle(vec2(wx,wz));float edgeAA=max(fwidth(ps),0.008);
  if(ps<edgeAA){
   float mask=down(-edgeAA,edgeAA,ps);
   float sx=0.0,sz=0.0,windGain=0.45+0.80*abs(u_wind.x);
   for(int i=0;i<3;i++){
    vec4 wave=u_waves[i];float slope=cos(dot(wave.xy,vec2(wx,wz))-wave.z*u_time)*wave.w*windGain;
    sx+=wave.x*slope;sz+=wave.y*slope;
   }
   for(int i=0;i<4;i++){
    vec4 rp=u_ripples[i];float age=u_time-rp.z;
    if(age>0.0&&age<3.5&&rp.w>0.01){
     vec2 dr=vec2(wx-rp.x,(wz-rp.y)*0.72);float d=length(dr),q=(d-age*0.024)/0.010;
     float env=exp(-q*q)*exp(-age*1.1)*rp.w,wave=cos((d-age*0.024)*390.0)*env*0.15;
     vec2 dir=dr/max(0.0005,d);sx+=dir.x*wave;sz+=dir.y*wave;
    }
   }
   vec3 wn=normalize(vec3(-sx,1.0,-sz)),V=normalize(vec3((VPX-wx)*0.38,0.32,1.0-wz));
   float nv=clamp(dot(wn,V),0.0,1.0),fc=1.0-nv;fc=fc*fc*fc*fc*fc;
   // Air/water IOR 1.333: F0 = ((1.333-1)/(1.333+1))^2.
   float fresnel=0.02037+0.97963*fc;
   float depth=0.008+0.045*down(-0.85,-0.04,ps);
   vec3 absorption=exp(-vec3(3.0,1.3,0.55)*depth/max(0.15,nv));
   vec3 bottom=col*vec3(0.64,0.78,0.87)*absorption;
   vec3 reflected=reflection(vec2(wx,wz),wn,moonScene,moonDim);
   vec3 water=bottom*(1.0-fresnel)+reflected*fresnel;
   float rim=exp(-ps*ps/0.003)*0.006*moonDim;
   water+=vec3(0.50,0.66,0.76)*rim;
   outColor=vec4(mix(base,tone(water*1.18),mask),1.0);return;
  }
 discard;
}
