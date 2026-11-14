// Exact scanline factorization: light/camera/plane math is invariant across X.
// CPU packets contain affine source coordinates for EVERY native output row.
const NATIVE_SHADOW_GLSL=`
uniform sampler2D u_shadowVisibility;
uniform int u_shadowPacked;
float worldShadow(vec2 unused){vec4 p=texelFetch(u_shadowVisibility,ivec2(gl_FragCoord.xy),0);return u_shadowPacked==1?dot(p.rg,vec2(65280.0/65535.0,255.0/65535.0)):p.r;}
`;
const MATERIAL_DECK_FS=DECK_FS.replace(SHADOW_GLSL,NATIVE_SHADOW_GLSL);
const MATERIAL_VILLAGE_FS=VILLAGE_SKY_FS.replace(SHADOW_GLSL,NATIVE_SHADOW_GLSL);
function rowShadowShader(mask,direct){
 const planes=[];for(let i=0;i<5;i++)if(mask&(1<<i))planes.push(i);
 const get=(i,col)=>`texelFetch(u_rowTable,ivec2(${i*3+col},row),0)`;
 let setup='',cast='',tests=[];
 for(const i of planes){
  const t=worldPlanes[i].rect,lo=`vec2(${(t[0]+.5).toFixed(1)},${(t[1]+.5).toFixed(1)})`,hi=`vec2(${(t[0]+t[2]-.5).toFixed(1)},${(t[1]+t[3]-.5).toFixed(1)})`;
  setup+=`vec4 a${i}=${get(i,0)},b${i}=${get(i,1)};bool active${i}=false;vec2 center${i}=vec2(a${i}.x*fx+a${i}.y,a${i}.z);\n`;
  setup+=`if(b${i}.w>0.5&&center${i}.x+b${i}.x>=${t[0]}.0&&center${i}.x-b${i}.x<=${t[0]+t[2]}.0){\n`;
  if(direct)setup+=`active${i}=true;`;
  else setup+=`bool accepted${i}=false;if(a${i}.w>0.0&&center${i}.x-b${i}.x-1.5>=${t[0]}.0&&center${i}.x+b${i}.x+1.5<=${t[0]+t[2]}.0){ivec2 cp=ivec2(floor(center${i}*a${i}.w))+ivec2(0,int(b${i}.z));vec4 range=texelFetch(u_intervalTex,cp,0);float lo=maskTrans(range.ga),hi=maskTrans(range.rb);if(lo==hi){constantVis*=lo;accepted${i}=true;if(constantVis==0.0){outColor=encodeVis(0.0);return;}}}active${i}=!accepted${i};`;
  setup+='}\n';tests.push(`active${i}`);
  cast+=`if(active${i}&&vis!=0.0){vec2 q=clamp(center${i}+disk*vec2(b${i}.x,-b${i}.y),${lo},${hi});vis*=maskTrans(texture(u_worldMask,q*vec2(1.0/2048.0,1.0/768.0)).rg);}\n`;
 }

 return HEAD+NOISE_GLSL+`
 uniform sampler2D u_worldMask,u_intervalTex,u_rowTable;
 uniform int u_shadowPacked;
 const vec2 DISK[12]=vec2[12](vec2(-0.326,-0.406),vec2(-0.840,-0.074),vec2(-0.696,0.457),vec2(-0.203,0.621),vec2(0.962,-0.195),vec2(0.473,-0.480),vec2(0.519,0.767),vec2(0.185,-0.893),vec2(0.507,0.064),vec2(0.896,0.412),vec2(-0.322,-0.933),vec2(-0.792,-0.598));
 float maskTrans(vec2 o){return 1.0-clamp(o.r+.82*o.g*(1.0-o.r),0.0,1.0);}
 vec4 encodeVis(float v){if(u_shadowPacked==1){float q=floor(clamp(v,0.0,1.0)*65535.0+.5),hi=floor(q/256.0);return vec4(hi/255.0,(q-hi*256.0)/255.0,0.0,1.0);}return vec4(v,0.0,0.0,1.0);}
 void main(){
  int row=int(gl_FragCoord.y);float fx=gl_FragCoord.x,constantVis=1.0;
  ${setup}
  if(!(${tests.join('||')})){outColor=encodeVis(constantVis);return;}
  vec4 geo=texelFetch(u_rowTable,ivec2(15,row),0);vec2 ground=vec2(geo.x*fx+geo.y,geo.z);
  float angle=hash12(ground*500.0)*6.2831853;mat2 rotation=mat2(cos(angle),-sin(angle),sin(angle),cos(angle));float sum=0.0;
  for(int j=0;j<12;j++){vec2 disk=rotation*DISK[j];float vis=1.0;${cast}sum+=vis;}
  outColor=encodeVis(constantVis*(sum/12.0));
 }
 `;
}
