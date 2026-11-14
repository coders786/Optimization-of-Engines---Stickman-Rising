// Conservative tile proof: bound every receiver and every rotated disk ray
// in an 8x8 NATIVE-pixel tile. A nonconstant or unsupported footprint retains
// its caster bit. No interpolation of shadow visibility is used.
const SHADOW_TILE_FS=FINAL_COMMON+SHADOW_GLSL.slice(0,SHADOW_GLSL.indexOf('float shadowAudit('))+`
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
  int flags=0;float constantVis=1.0;
  for(int i=0;i<5;i++){
   vec4 bounds=u_planeBounds[i];float z=u_planeInfo[i].x;
   if(high.y<z||low.y>bounds.w||high.x<bounds.x||low.x>bounds.y)continue;
   bool partial=low.y<z||high.y>bounds.w||low.x<bounds.x||high.x>bounds.y;
   vec4 tile=u_planeTiles[i],m=u_maskMap[i];vec2 qlo=vec2(1e9),qhi=vec2(-1e9);
   float maxD=max(0.0,high.y-z);
   for(int j=0;j<8;j++){if(j>=n)break;float d=corners[j].y-z;vec2 q=tile.xy+maskCoord(i,vec2(corners[j].x+d*u_shadowLight.x,d*u_shadowLight.y))*tile.zw;qlo=min(qlo,q);qhi=max(qhi,q);}
   vec2 radius=maxD*u_shadowLight.z*vec2(1.0/u_aspect,1.0)*m.xy*tile.zw;
   // 1.501 includes bilinear support and a rounding cushion relative to the
   // algebraically factored native sampler. Never use uncertain ranges.
   qlo-=radius+vec2(1.501);qhi+=radius+vec2(1.501);
   if(any(lessThan(qhi,tile.xy))||any(greaterThan(qlo,tile.xy+tile.zw)))continue;
   bool accept=false;float trans=1.0;
   if(all(greaterThanEqual(qlo,tile.xy))&&all(lessThanEqual(qhi,tile.xy+tile.zw))){
    vec2 center=(qlo+qhi)*0.5;float r=max((qhi.x-qlo.x)*0.5,(qhi.y-qlo.y)*0.5),cell=4.0;int level=0;bool valid=true;
    if(u_shadowMode==1){if(r>8.0)valid=false;cell=8.0;level=1;}
    else{if(r>64.0)valid=false;if(r>4.0){cell=8.0;level=1;}if(r>8.0){cell=16.0;level=2;}if(r>16.0){cell=32.0;level=3;}if(r>32.0){cell=64.0;level=4;}}
    if(valid){ivec2 cp=ivec2(u_guardOrigins[level])+ivec2(floor(center/cell));vec4 range=texelFetch(u_intervalTex,cp,0);float mn=maskTransmission(range.ga),mx=maskTransmission(range.rb);if(mn==mx&&(!partial||mn==1.0)){accept=true;trans=mn;}}
   }
   if(accept){constantVis*=trans;if(constantVis==0.0){outColor=vec4(0.0,0.0,0.0,1.0);return;}}
   else flags|=1<<i;
  }
  outColor=vec4(float(flags),constantVis,0.0,1.0);
 }
`;
