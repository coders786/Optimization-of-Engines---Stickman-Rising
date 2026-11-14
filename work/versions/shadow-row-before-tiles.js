// Scanline Invariant Packets. Five planes x two RGBA32F texels per native
// receiver row. No spatial/temporal downsampling: this stores coefficients,
// not filtered shadows. The light disk and all 12 correlated samples remain.
const SHADOW_ROW_FS=FINAL_COMMON+SHADOW_GLSL.slice(0,SHADOW_GLSL.indexOf('float shadowAudit('))+`
 uniform float u_shadowDeckRows;
 void main(){
  int col=int(gl_FragCoord.x),i=col/2;vec2 scr=vec2(0.5,1.0-v_uv.y);float wz;
  if(gl_FragCoord.y<u_shadowDeckRows){float hy=HY-u_camShift.y*0.72,persp=1.0+(scr.y-hy)/(HY-VPY);wz=1.0-1.0/persp;}
  else{vec2 scene=scr+u_camShift*0.72;float persp=1.0+(scene.y-HY)/(HY-VPY);wz=1.0-1.0/max(0.02,persp);}
  float d=wz-u_planeInfo[i].x;vec4 tile=u_planeTiles[i],m=u_maskMap[i];
  vec2 radius=d*u_shadowLight.z*vec2(1.0/u_aspect,1.0)*m.xy*tile.zw;
  float r=max(radius.x+1.5,radius.y+1.5),cell=4.0;int level=0;bool valid=true;
  if(u_shadowMode==1){if(r>8.0)valid=false;cell=8.0;level=1;}
  else{if(r>64.0)valid=false;if(r>4.0){cell=8.0;level=1;}if(r>8.0){cell=16.0;level=2;}if(r>16.0){cell=32.0;level=3;}if(r>32.0){cell=64.0;level=4;}}
  if(col%2==0){outColor=vec4(m.x*tile.z,tile.x+(m.z+d*u_shadowLight.x*m.x)*tile.z,tile.y+(m.w-d*u_shadowLight.y*m.y)*tile.w,valid?1.0/cell:0.0);}
  else{outColor=vec4(radius,u_guardOrigins[level].y,(d>=0.0&&wz<=u_planeBounds[i].w)?1.0:0.0);}
 }
`;
function rowCasterGLSL(mask){
 let code=`uniform sampler2D u_worldMask,u_intervalTex,u_rowTable;uniform vec4 u_planeBounds[5];
 const vec2 SHADOW_DISK[12]=vec2[12](vec2(-0.326,-0.406),vec2(-0.840,-0.074),vec2(-0.696,0.457),vec2(-0.203,0.621),vec2(0.962,-0.195),vec2(0.473,-0.480),vec2(0.519,0.767),vec2(0.185,-0.893),vec2(0.507,0.064),vec2(0.896,0.412),vec2(-0.322,-0.933),vec2(-0.792,-0.598));
 float maskTransmission(vec2 o){return 1.0-clamp(o.r+0.82*o.g*(1.0-o.r),0.0,1.0);}
 float worldShadow(vec2 ground){int row=int(gl_FragCoord.y);float constantVis=1.0;`;
 const active=[];
 for(let i=0;i<5;i++)if(mask&(1<<i)){
  active.push(`active${i}`);
  const t=worldPlanes[i].rect,lo=`vec2(${t[0]}.0,${t[1]}.0)`,hi=`vec2(${t[0]+t[2]}.0,${t[1]+t[3]}.0)`;
  code+=`vec4 a${i}=texelFetch(u_rowTable,ivec2(${i*2},row),0),b${i}=texelFetch(u_rowTable,ivec2(${i*2+1},row),0);vec2 center${i}=vec2(ground.x*a${i}.x+a${i}.y,a${i}.z);bool active${i}=false;
  if(b${i}.w>.5&&ground.x>=u_planeBounds[${i}].x&&ground.x<=u_planeBounds[${i}].y){
   bool accepted=false;vec2 support=b${i}.xy+vec2(1.5);
   if(a${i}.w>0.0&&all(greaterThanEqual(center${i}-support,${lo}))&&all(lessThanEqual(center${i}+support,${hi}))){
    ivec2 p=ivec2(floor(center${i}*a${i}.w))+ivec2(0,int(b${i}.z));vec4 range=texelFetch(u_intervalTex,p,0);float mn=maskTransmission(range.ga),mx=maskTransmission(range.rb);
    if(mn==mx){constantVis*=mn;accepted=true;if(constantVis==0.0)return 0.0;}
   }active${i}=!accepted;
  }`;
 }
 code+=`if(!(${active.join('||')||'false'}))return constantVis;
 float angle=hash12(ground*vec2(500.0,500.0))*6.2831853;mat2 rotation=mat2(cos(angle),-sin(angle),sin(angle),cos(angle));float sum=0.0;
 for(int j=0;j<12;j++){vec2 disk=rotation*SHADOW_DISK[j];float vis=1.0;`;
 for(let i=0;i<5;i++)if(mask&(1<<i)){
  const t=worldPlanes[i].rect,lo=`vec2(${t[0]}.0,${t[1]}.0)`,hi=`vec2(${t[0]+t[2]}.0,${t[1]+t[3]}.0)`;
  code+=`if(active${i}&&vis!=0.0){vec2 q=center${i}+disk*vec2(b${i}.x,-b${i}.y);if(all(greaterThanEqual(q,${lo}))&&all(lessThanEqual(q,${hi})))vis*=maskTransmission(texture(u_worldMask,clamp(q,${lo}+0.5,${hi}-0.5)/vec2(2048.0,768.0)).rg);}`;
 }
 return code+`sum+=vis;}return constantVis*(sum/12.0);}`;
}
