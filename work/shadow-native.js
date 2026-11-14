// Native-resolution shadow field: separate visibility from the expensive
// material shaders. Row bands select COMPILE-TIME caster sets, but uncertain
// receivers still combine all applicable planes inside each of the 12 rays.
// Neither the number of rays nor final-pixel resolution is reduced.
const SHADOW_READ_GLSL=`
uniform sampler2D u_shadowVisibility;
uniform int u_shadowPacked;
float worldShadow(vec2 unused){vec4 p=texelFetch(u_shadowVisibility,ivec2(gl_FragCoord.xy),0);return u_shadowPacked==1?dot(p.rgb,vec3(16711680.0,65280.0,255.0)/16777215.0):p.r;}
`;
const NATIVE_DECK_FS=DECK_FS.replace(SHADOW_GLSL,SHADOW_READ_GLSL);
const NATIVE_VILLAGE_FS=VILLAGE_SKY_FS.replace(SHADOW_GLSL,SHADOW_READ_GLSL);
function casterSubsetGLSL(mask){
 let code=SHADOW_GLSL.slice(0,SHADOW_GLSL.indexOf('float shadowAudit(')),active=[];
 code+=`float worldShadow(vec2 ground){float constantVis=1.0;`;
 for(let i=0;i<5;i++)if(mask&(1<<i)){
  active.push(`active${i}`);
  code+=`bool active${i}=false;float d${i}=ground.y-u_planeInfo[${i}].x;vec4 b${i}=u_planeBounds[${i}];
  if(!(d${i}<0.0||ground.x<b${i}.x||ground.x>b${i}.y||ground.y>b${i}.w)){
   float c${i};vec2 center${i}=vec2(ground.x+d${i}*u_shadowLight.x,d${i}*u_shadowLight.y);
   if(u_shadowMode!=0&&planeCertificate(${i},center${i},d${i},c${i})){constantVis*=c${i};if(constantVis==0.0)return 0.0;}
   else active${i}=true;
  }`;
 }
 code+=`if(!(${active.join('||')||'false'}))return constantVis;
 float a=hash12(ground*vec2(500.0,500.0))*6.2831853;mat2 rotation=mat2(cos(a),-sin(a),sin(a),cos(a));float sum=0.0;
 for(int j=0;j<12;j++){vec2 disk=rotation*SHADOW_DISK[j];float vis=1.0;`;
 for(let i=0;i<5;i++)if(mask&(1<<i))code+=`if(active${i}&&vis!=0.0)vis*=planeTransmission(${i},shadowIntersection(ground,d${i},disk));`;
 return code+`sum+=vis;}return constantVis*(sum/12.0);}`;
}
function nativeShadowFS(mask,useRows=false,useTiles=true){return FINAL_COMMON+(useRows?rowCasterGLSL(mask,useTiles):casterSubsetGLSL(mask))+`
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
 `;}
