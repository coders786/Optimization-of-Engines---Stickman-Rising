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

 uniform highp usampler2D u_shadowSAT;
 uniform vec4 u_planeTiles[5],u_maskMap[5],u_planeInfo[5],u_planeBounds[5];
 uniform vec3 u_shadowLight;
 uint prefixAt(ivec2 p,ivec2 origin){if(any(lessThan(p,origin)))return 0u;return texelFetch(u_shadowSAT,p,0).r;}
 uniform vec2 u_shadowSize;
 uniform float u_shadowDeckRows,u_shadowTileSize;
 vec2 receiverAt(vec2 pixel,bool deckPart){
  vec2 scr=vec2(pixel.x/u_shadowSize.x,1.0-pixel.y/u_shadowSize.y);
  if(deckPart){float hy=HY-u_camShift.y*0.72,persp=1.0+(scr.y-hy)/(HY-VPY),parX=u_camShift.x*(0.72+(persp-1.0)*1.48);return vec2(VPX+(scr.x+parX-VPX)/persp,1.0-1.0/persp);}
  vec2 scene=scr+u_camShift*0.72;float persp=1.0+(scene.y-HY)/(HY-VPY);return vec2(VPX+(scene.x-VPX)/max(0.02,persp),1.0-1.0/max(0.02,persp));
 }
 void main(){
  vec2 first=floor(gl_FragCoord.xy)*u_shadowTileSize+0.5,last=min(first+u_shadowTileSize-1.0,u_shadowSize-0.5);
  vec2 low=vec2(1e9),high=vec2(-1e9);vec2 corners[8];int n=0;
  for(int region=0;region<2;region++){
   if(region==0&&first.y>=u_shadowDeckRows)continue;if(region==1&&last.y<u_shadowDeckRows)continue;
   // Both projection formulas are included if the tile crosses the deck seam.
   for(int y=0;y<2;y++)for(int x=0;x<2;x++){
    vec2 p=receiverAt(vec2(x==0?first.x:last.x,y==0?first.y:last.y),region==0);corners[n++]=p;low=min(low,p);high=max(high,p);
   }
  }

  int flags=0;
  for(int once4=0;once4<1;once4++){const int i=4;
   vec4 bounds=u_planeBounds[i];float z=u_planeInfo[i].x;
   if(high.y<z||low.y>bounds.w||high.x<bounds.x||low.x>bounds.y)continue;
   bool partial=low.y<z||high.y>bounds.w||low.x<bounds.x||high.x>bounds.y;
   vec4 tile=u_planeTiles[i],m=u_maskMap[i];vec2 qlo=vec2(1e9),qhi=vec2(-1e9);
   float maxD=max(0.0,high.y-z);
   for(int j=0;j<8;j++){if(j>=n)break;float d=corners[j].y-z;vec2 p=vec2(corners[j].x+d*u_shadowLight.x,d*u_shadowLight.y),q=tile.xy+vec2(p.x*m.x+m.z,m.w-p.y*m.y)*tile.zw;qlo=min(qlo,q);qhi=max(qhi,q);}
   vec2 radius=maxD*u_shadowLight.z*vec2(1.0/u_aspect,1.0)*m.xy*tile.zw;
   qlo-=radius+vec2(.002);qhi+=radius+vec2(.002);
   if(any(lessThan(qhi,tile.xy))||any(greaterThan(qlo,tile.xy+tile.zw)))continue;
   ivec2 origin=ivec2(tile.xy),limit=ivec2(tile.xy+tile.zw)-1;
   ivec2 a=clamp(ivec2(floor(qlo-0.5)),origin,limit),b=clamp(ivec2(floor(qhi-0.5))+1,origin,limit);
   uint sum=prefixAt(b,origin)-prefixAt(ivec2(a.x-1,b.y),origin)-prefixAt(ivec2(b.x,a.y-1),origin)+prefixAt(a-1,origin);
   if(sum==0u)continue;
   uint area=uint((b.x-a.x+1)*(b.y-a.y+1));
   if(sum==2u*area&&!partial&&all(greaterThanEqual(qlo,tile.xy))&&all(lessThanEqual(qhi,tile.xy+tile.zw))){outColor=vec4(0.0,0.0,0.0,1.0);return;}
   flags|=1<<i;
  }
  outColor=vec4(float(flags),1.0,0.0,1.0);
 }
