// Exact rectangle occupancy certificates. Prefix integers are 0/1/2 for
// clear/uncertain/opaque source texels, NOT averaged shadow visibility.
const SHADOW_TILE_FS=FINAL_COMMON+`
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
  for(int i=0;i<5;i++){
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
`;
function specializedTileFS(mask){
 const start=SHADOW_TILE_FS.indexOf('for(int i=0;i<5;i++){'),tail=SHADOW_TILE_FS.lastIndexOf('\n  outColor=vec4(float(flags)');
 const block=SHADOW_TILE_FS.slice(start+'for(int i=0;i<5;i++){'.length,tail),body=block.slice(0,block.lastIndexOf('}'));let loops='';
 for(let i=0;i<5;i++)if(mask&(1<<i))loops+=`for(int once${i}=0;once${i}<1;once${i}++){const int i=${i};${body}}`;
 return SHADOW_TILE_FS.slice(0,start)+loops+SHADOW_TILE_FS.slice(tail);
}
