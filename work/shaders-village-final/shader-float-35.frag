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
uniform sampler2D u_worldMask,u_intervalTex,u_rowTable;uniform vec4 u_planeBounds[5];
 const vec2 SHADOW_DISK[12]=vec2[12](vec2(-0.326,-0.406),vec2(-0.840,-0.074),vec2(-0.696,0.457),vec2(-0.203,0.621),vec2(0.962,-0.195),vec2(0.473,-0.480),vec2(0.519,0.767),vec2(0.185,-0.893),vec2(0.507,0.064),vec2(0.896,0.412),vec2(-0.322,-0.933),vec2(-0.792,-0.598));
 float maskTransmission(vec2 o){return 1.0-clamp(o.r+0.82*o.g*(1.0-o.r),0.0,1.0);}
 float worldShadow(vec2 ground){int row=int(gl_FragCoord.y);float constantVis=1.0;vec4 a2=texelFetch(u_rowTable,ivec2(4,row),0),b2=texelFetch(u_rowTable,ivec2(5,row),0);vec2 center2=vec2(ground.x*a2.x+a2.y,a2.z);bool active2=false;
  if(b2.w>.5&&ground.x>=u_planeBounds[2].x&&ground.x<=u_planeBounds[2].y){
   bool accepted=false;vec2 support=b2.xy+vec2(1.5);
   if(a2.w>0.0&&all(greaterThanEqual(center2-support,vec2(1024.0,256.0)))&&all(lessThanEqual(center2+support,vec2(2048.0,512.0)))){
    ivec2 p=ivec2(floor(center2*a2.w))+ivec2(0,int(b2.z));vec4 range=texelFetch(u_intervalTex,p,0);float mn=maskTransmission(range.ga),mx=maskTransmission(range.rb);
    if(mn==mx){constantVis*=mn;accepted=true;if(constantVis==0.0)return 0.0;}
   }active2=!accepted;
  }vec4 a3=texelFetch(u_rowTable,ivec2(6,row),0),b3=texelFetch(u_rowTable,ivec2(7,row),0);vec2 center3=vec2(ground.x*a3.x+a3.y,a3.z);bool active3=false;
  if(b3.w>.5&&ground.x>=u_planeBounds[3].x&&ground.x<=u_planeBounds[3].y){
   bool accepted=false;vec2 support=b3.xy+vec2(1.5);
   if(a3.w>0.0&&all(greaterThanEqual(center3-support,vec2(0.0,384.0)))&&all(lessThanEqual(center3+support,vec2(1024.0,640.0)))){
    ivec2 p=ivec2(floor(center3*a3.w))+ivec2(0,int(b3.z));vec4 range=texelFetch(u_intervalTex,p,0);float mn=maskTransmission(range.ga),mx=maskTransmission(range.rb);
    if(mn==mx){constantVis*=mn;accepted=true;if(constantVis==0.0)return 0.0;}
   }active3=!accepted;
  }if(!(active2||active3))return constantVis;
 float angle=hash12(ground*vec2(500.0,500.0))*6.2831853;mat2 rotation=mat2(cos(angle),-sin(angle),sin(angle),cos(angle));float sum=0.0;
 for(int j=0;j<12;j++){vec2 disk=rotation*SHADOW_DISK[j];float vis=1.0;if(active2&&vis!=0.0){vec2 q=center2+disk*vec2(b2.x,-b2.y);if(all(greaterThanEqual(q,vec2(1024.0,256.0)))&&all(lessThanEqual(q,vec2(2048.0,512.0))))vis*=maskTransmission(texture(u_worldMask,clamp(q,vec2(1024.0,256.0)+0.5,vec2(2048.0,512.0)-0.5)/vec2(2048.0,768.0)).rg);}if(active3&&vis!=0.0){vec2 q=center3+disk*vec2(b3.x,-b3.y);if(all(greaterThanEqual(q,vec2(0.0,384.0)))&&all(lessThanEqual(q,vec2(1024.0,640.0))))vis*=maskTransmission(texture(u_worldMask,clamp(q,vec2(0.0,384.0)+0.5,vec2(1024.0,640.0)-0.5)/vec2(2048.0,768.0)).rg);}sum+=vis;}return constantVis*(sum/12.0);}
 uniform int u_shadowPacked;
 uniform float u_shadowDeckRows;
 vec4 encodeVisibility(float v){if(u_shadowPacked==0)return vec4(v,0.0,0.0,1.0);float q=floor(clamp(v,0.0,1.0)*16777215.0+.5),hi=floor(q/65536.0),mid=floor((q-hi*65536.0)/256.0);return vec4(hi,mid,q-hi*65536.0-mid*256.0,255.0)/255.0;}
 void main(){
  // Preserve the reference's exact projection arithmetic in each region.
  vec2 scr=vec2(v_uv.x,1.0-v_uv.y);float wx,wz;
  if(gl_FragCoord.y<u_shadowDeckRows){
   float hy=HY-u_camShift.y*0.72,persp=1.0+(scr.y-hy)/(HY-VPY),parX=u_camShift.x*(0.72+(persp-1.0)*1.48);
   wx=VPX+(scr.x+parX-VPX)/persp;wz=1.0-1.0/persp;
   if(wz>0.365){outColor=encodeVisibility(1.0);return;}
  }else{
   vec2 scene=scr+u_camShift*0.72;float persp=1.0+(scene.y-HY)/(HY-VPY);
   wx=VPX+(scene.x-VPX)/max(0.02,persp);wz=1.0-1.0/max(0.02,persp);
  }
  outColor=encodeVisibility(worldShadow(vec2(wx,wz)));
 }
 