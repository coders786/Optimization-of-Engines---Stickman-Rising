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

uniform sampler2D u_shadowVisibility;
uniform int u_shadowPacked;
float worldShadow(vec2 unused){vec4 p=texelFetch(u_shadowVisibility,ivec2(gl_FragCoord.xy),0);return u_shadowPacked==1?dot(p.rgb,vec3(16711680.0,65280.0,255.0)/16777215.0):p.r;}

uniform vec4 u_ripples[4],u_shadowAABB[3],u_stones[13];
uniform float u_stoneSeeds[13],u_specF;
uniform vec3 u_moonDir,u_halfVec,u_reflDir;
uniform sampler2D u_moonTex,u_skyTex,u_reflectionTex;
uniform float u_moonAtlasSize;
uniform vec4 u_skyAtlas,u_reflectionBounds,u_waves[3];

float specular(vec3 N,float rough){
 const vec3 V=vec3(0.0,0.611447501,0.791285001);
 float nh=max(0.0,dot(N,u_halfVec)),nl=max(0.0,dot(N,u_moonDir)),nv=max(0.001,dot(N,V));
 float a=rough*rough;a*=a;float d=nh*nh*(a-1.0)+1.0,D=a/(3.14159*d*d+0.00001),k=(rough+1.0)*(rough+1.0)*0.125;
 float G=(nl/(nl*(1.0-k)+k))*(nv/(nv*(1.0-k)+k));return clamp(D*u_specF*G/(4.0*nv*nl+0.05),0.0,2.5);
}
float stones(vec2 w,out int hit,out vec2 uv){
 hit=-1;uv=vec2(0.0);float best=0.008;int center=int(floor((w.y-0.015)*(12.0/0.352)+0.5));
 for(int j=-1;j<=1;j++){int i=center+j;if(i<0||i>12)continue;vec4 s=u_stones[i];vec2 d=(w-s.xy)/s.zw;
  if((max(abs(d.x),abs(d.y))-1.22)*s.w>best)continue;
  float a=atan(d.y,d.x),fi=float(i),dist=(length(d)-(1.0+0.14*cos(a*3.0+fi*1.9)+0.08*sin(a*5.0-fi)))*s.w;
  if(dist<best){best=dist;hit=i;uv=d;}
 }return best;
}

void main(){
 vec2 scr=vec2(v_uv.x,1.0-v_uv.y),moonScene=u_moonScr+u_camShift*0.64;
 float hy=HY-u_camShift.y*0.72,moonDim=exp(-cloudField(u_moonScr+u_camShift*0.04)*0.95);
 float persp=1.0+(scr.y-hy)/(HY-VPY),parX=u_camShift.x*(0.72+(persp-1.0)*1.48);
 float wx=VPX+(scr.x+parX-VPX)/persp,wz=1.0-1.0/persp;
 if(wz>0.365){vec3 edge=mix(vec3(0.14,0.18,0.22),vec3(0.015,0.02,0.03),smoothstep(0.365,0.371,wz));outColor=vec4(tone(edge*(0.72+0.38*fbm3(vec2(wx*22.0,wz*48.0)))),1.0);return;}
 float plank=wx*29.0,id=floor(plank),pu=fract(plank),seed=hash12(vec2(id,7.3));
 float sw=mix(0.034,0.018,clamp(wz*2.5,0.0,1.0));
 float seamAA=max(fwidth(plank)*0.5,0.0001);
 float seam=smoothstep(0.0,max(sw,seamAA),pu)*down(1.0-max(sw,seamAA),1.0,pu),joint=fract(wz*4.4+seed*5.3);
 seam*=mix(0.25,1.0,smoothstep(0.0,0.014,joint)*down(0.986,1.0,joint));
 float g1=fbm3(vec2(pu*6.0+seed*19.0,wz*11.0+seed*7.0)),g2=noise2(vec2(pu*24.0+seed*5.0,wz*26.0));
 vec3 albedo=mix(vec3(0.075,0.098,0.125),vec3(0.27,0.32,0.37),g1*0.72+g2*0.28)*(0.74+0.40*seed)*mix(0.08,1.0,seam);
 float bevel=(smoothstep(0.0,0.12,pu)-1.0)+(1.0-smoothstep(0.88,1.0,pu));
 vec3 N=normalize(vec3(bevel*0.56+(g2-0.5)*0.20,1.0,(g1-0.5)*0.16));float rough=mix(0.36,0.56,g1);
 float pd=length((vec2(wx,wz)-vec2(0.636,0.145))/vec2(0.046,0.078)),damp=down(0.98,1.55,pd);albedo*=mix(1.0,0.54,damp);rough=mix(rough,0.14,damp);
 if(wx>0.66&&wx<0.77&&wz>0.0&&wz<0.38){int sid;vec2 suv;float sd=stones(vec2(wx,wz),sid,suv),mask=1.0-smoothstep(-0.0012,0.0014,sd);if(mask>0.01&&sid>=0){float ns=fbm3(suv*4.5+u_stoneSeeds[sid]*11.0);vec3 stoneCol=mix(vec3(0.09,0.12,0.16),vec3(0.30,0.37,0.44),ns),sn=normalize(vec3(suv.x*0.58,0.78+clamp(1.0-length(suv),0.0,1.0)*0.5,suv.y*0.58));albedo=mix(albedo,stoneCol,mask);N=normalize(mix(N,sn,mask));rough=mix(rough,0.32,mask);}albedo*=mix(0.22,1.0,smoothstep(-0.001,0.007,sd));}
 float moonLit=worldShadow(vec2(wx,wz));
 float doorVis=0.0;
 if(wz<0.25&&abs(wx-u_doorCenter)<0.19){vec2 bulb=vec2(u_doorCenter+0.007,-0.036);float gate=wx+(wz/(wz-bulb.y))*(bulb.x-wx),jamb=smoothstep(u_doorWindow.x-0.002,u_doorWindow.x+0.002,gate)*down(u_doorWindow.y-0.002,u_doorWindow.y+0.002,gate);vec2 dd=bulb-vec2(wx,wz);doorVis=jamb*(1.0-sampleOcc(vec2(gate,HY-0.015)).r)/(1.0+dot(dd,dd)*120.0)*4.2*u_flicker*down(0.18,0.25,wz)*down(0.15,0.19,abs(wx-u_doorCenter));}
 float spec=specular(N,rough)*0.72*moonLit*moonDim,diff=max(0.14,dot(N,u_moonDir));
 vec3 light=vec3(0.075,0.100,0.140)+vec3(0.95,1.14,1.34)*(diff*1.55*moonDim+spec)*moonLit+vec3(1.38,0.72,0.24)*doorVis;
 vec3 col=albedo*light;float backFog=exp(-wz*18.0)*0.30*clamp(u_rayIntensity,0.4,1.4),fw=(wx-u_doorCenter)/0.13,warm=exp(-fw*fw)*0.45*u_flicker;
 vec3 fogCol=mix(vec3(0.10,0.17,0.24)*(0.45+0.65*moonLit*moonDim),vec3(0.68,0.40,0.18),warm);col=mix(col,fogCol,clamp(backFog,0.0,0.68));

 col*=mix(0.46,1.06,1.0-smoothstep(0.36,0.92,length((scr-vec2(0.5,0.55))*vec2(1.05,1.25))));outColor=vec4(tone(col*1.18),1.0);
}
