// Source-mask min/max intervals: no light-space blur, no visibility approximation.
const SHADOW_BASE_FS=HEAD+`
uniform sampler2D u_src;
void main(){
 ivec2 p=ivec2(gl_FragCoord.xy)*4,limit=textureSize(u_src,0)-1;vec2 lo=vec2(1.0),hi=vec2(0.0);
 for(int y=0;y<4;y++)for(int x=0;x<4;x++){vec2 v=texelFetch(u_src,min(p+ivec2(x,y),limit),0).rg;lo=min(lo,v);hi=max(hi,v);}
 outColor=vec4(lo.r,hi.r,lo.g,hi.g);
}
`;
const SHADOW_REDUCE_FS=HEAD+`
uniform sampler2D u_src;
void main(){
 ivec2 p=ivec2(gl_FragCoord.xy)*2,limit=textureSize(u_src,0)-1;
 vec4 a=texelFetch(u_src,min(p,limit),0),b=texelFetch(u_src,min(p+ivec2(1,0),limit),0),c=texelFetch(u_src,min(p+ivec2(0,1),limit),0),d=texelFetch(u_src,min(p+ivec2(1,1),limit),0);
 outColor=vec4(min(min(a.r,b.r),min(c.r,d.r)),max(max(a.g,b.g),max(c.g,d.g)),min(min(a.b,b.b),min(c.b,d.b)),max(max(a.a,b.a),max(c.a,d.a)));
}
`;
const SHADOW_GUARD_FS=HEAD+`
uniform sampler2D u_src;
uniform vec2 u_guardOrigin;
void main(){
 ivec2 p=ivec2(gl_FragCoord.xy)-ivec2(u_guardOrigin),limit=textureSize(u_src,0)-1;vec2 lo=vec2(1.0),hi=vec2(0.0);
 for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec4 v=texelFetch(u_src,clamp(p+ivec2(x,y),ivec2(0),limit),0);lo=min(lo,v.rb);hi=max(hi,v.ga);}
 outColor=vec4(lo.r,hi.r,lo.g,hi.g);
}
`;
const GENERIC_SHADOW_GLSL=`
uniform sampler2D u_worldMask,u_intervalTex;
uniform vec4 u_planeTiles[5],u_maskMap[5],u_planeInfo[5],u_planeBounds[5];
uniform vec2 u_guardOrigins[5],u_worldAtlasSize;
uniform vec3 u_shadowLight;
uniform int u_shadowMode;
const vec2 SHADOW_DISK[12]=vec2[12](vec2(-0.326,-0.406),vec2(-0.840,-0.074),vec2(-0.696,0.457),vec2(-0.203,0.621),vec2(0.962,-0.195),vec2(0.473,-0.480),vec2(0.519,0.767),vec2(0.185,-0.893),vec2(0.507,0.064),vec2(0.896,0.412),vec2(-0.322,-0.933),vec2(-0.792,-0.598));
float maskTransmission(vec2 o){return 1.0-clamp(o.r+0.82*o.g*(1.0-o.r),0.0,1.0);}
vec2 maskCoord(int i,vec2 p){vec4 m=u_maskMap[i];return vec2(p.x*m.x+m.z,m.w-p.y*m.y);}
float planeTransmission(int i,vec2 p){
 vec2 uv=maskCoord(i,p);if(any(lessThan(uv,vec2(0.0)))||any(greaterThan(uv,vec2(1.0))))return 1.0;
 vec4 tile=u_planeTiles[i];vec2 texel=clamp(tile.xy+uv*tile.zw,tile.xy+0.5,tile.xy+tile.zw-0.5);
 return maskTransmission(texture(u_worldMask,texel/u_worldAtlasSize).rg);
}
// The selected macrocell's 3x3 neighborhood contains the complete ray-disk
// footprint plus bilinear support. A range that is not constant is NEVER used
// as a shadow approximation: it sends the native receiver to the twelve rays.
bool planeCertificate(int i,vec2 center,float distance,out float trans){
 vec4 tile=u_planeTiles[i],m=u_maskMap[i];vec2 texel=tile.xy+maskCoord(i,center)*tile.zw;
 vec2 radius=distance*u_shadowLight.z*vec2(1.0/u_aspect,1.0)*m.xy*tile.zw;
 vec2 support=radius+vec2(1.5);
 if(any(lessThan(texel-support,tile.xy))||any(greaterThan(texel+support,tile.xy+tile.zw)))return false;
 float r=max(support.x,support.y),cell=4.0;int level=0;
 if(u_shadowMode==1){if(r>8.0)return false;cell=8.0;level=1;}
 else{if(r>64.0)return false;if(r>4.0){cell=8.0;level=1;}if(r>8.0){cell=16.0;level=2;}if(r>16.0){cell=32.0;level=3;}if(r>32.0){cell=64.0;level=4;}}
 ivec2 p=ivec2(u_guardOrigins[level])+ivec2(floor(texel/cell));vec4 range=texelFetch(u_intervalTex,p,0);
 float lo=maskTransmission(range.ga),hi=maskTransmission(range.rb);
 if(lo==hi){trans=lo;return true;}return false;
}
vec2 shadowIntersection(vec2 ground,float d,vec2 disk){
 vec2 slope=u_shadowLight.xy+disk*u_shadowLight.z*vec2(1.0/u_aspect,1.0);
 return vec2(ground.x+d*slope.x,d*slope.y);
}
float shadowAudit(vec2 ground,out vec3 audit){
 int flags=0,single=0;float constantVis=1.0;audit=vec3(0.0);
 for(int i=0;i<5;i++){
  vec4 bounds=u_planeBounds[i];float d=ground.y-u_planeInfo[i].x;
  if(d<0.0||ground.x<bounds.x||ground.x>bounds.y||ground.y>bounds.w)continue;
  audit.x+=1.0;
  if(u_shadowMode!=0){float c;vec2 center=vec2(ground.x+d*u_shadowLight.x,d*u_shadowLight.y);
   if(planeCertificate(i,center,d,c)){audit.y+=1.0;constantVis*=c;if(constantVis==0.0)return 0.0;continue;}
  }
  flags|=(1<<i);single=i;audit.z+=1.0;
 }
 if(flags==0)return constantVis;
 float a=hash12(ground*vec2(500.0,500.0))*6.2831853;mat2 rotation=mat2(cos(a),-sin(a),sin(a),cos(a));float sum=0.0;
 if((flags&(flags-1))==0){
  float d=ground.y-u_planeInfo[single].x;
  for(int j=0;j<12;j++)sum+=planeTransmission(single,shadowIntersection(ground,d,rotation*SHADOW_DISK[j]));
 }else{
  for(int j=0;j<12;j++){
   vec2 disk=rotation*SHADOW_DISK[j];float vis=1.0;
   for(int i=0;i<5;i++)if((flags&(1<<i))!=0){float d=ground.y-u_planeInfo[i].x;vis*=planeTransmission(i,shadowIntersection(ground,d,disk));if(vis==0.0)break;}
   sum+=vis;
  }
 }
 return constantVis*(sum/12.0);
}
float worldShadow(vec2 ground){vec3 unused;return shadowAudit(ground,unused);}
`;
// Compile a genuinely direct reference, with interval code dead at compile time.
const DIRECT_SHADOW_GLSL=GENERIC_SHADOW_GLSL.replace('uniform int u_shadowMode;','').replaceAll('u_shadowMode','0');

// Compile-time caster indices expose the five fixed atlas planes to the GPU
// compiler. The geometric calculation and per-ray product stay unchanged.
const SHADOW_GLSL=(()=>{
 let code=GENERIC_SHADOW_GLSL.slice(0,GENERIC_SHADOW_GLSL.indexOf('float shadowAudit('));
 code+=`float shadowAudit(vec2 ground,out vec3 audit){float constantVis=1.0;audit=vec3(0.0);`;
 for(let i=0;i<5;i++){
  code+=`bool active${i}=false;float d${i}=ground.y-u_planeInfo[${i}].x;vec4 b${i}=u_planeBounds[${i}];
  if(!(d${i}<0.0||ground.x<b${i}.x||ground.x>b${i}.y||ground.y>b${i}.w)){
   audit.x+=1.0;float c${i};vec2 center${i}=vec2(ground.x+d${i}*u_shadowLight.x,d${i}*u_shadowLight.y);
   if(u_shadowMode!=0&&planeCertificate(${i},center${i},d${i},c${i})){audit.y+=1.0;constantVis*=c${i};if(constantVis==0.0)return 0.0;}
   else{active${i}=true;audit.z+=1.0;}
  }`;
 }
 code+=`if(!(active0||active1||active2||active3||active4))return constantVis;
 float a=hash12(ground*vec2(500.0,500.0))*6.2831853;mat2 rotation=mat2(cos(a),-sin(a),sin(a),cos(a));float sum=0.0;
 for(int j=0;j<12;j++){vec2 disk=rotation*SHADOW_DISK[j];float vis=1.0;`;
 for(let i=0;i<5;i++)code+=`if(active${i}&&vis!=0.0)vis*=planeTransmission(${i},shadowIntersection(ground,d${i},disk));`;
 code+=`sum+=vis;}return constantVis*(sum/12.0);}
 float worldShadow(vec2 ground){vec3 unused;return shadowAudit(ground,unused);}`;
 return code;
})();
