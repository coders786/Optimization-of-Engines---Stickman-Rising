 initWorldShadows(){
  const g=this.gl;if(this.worldMaskTexture)g.deleteTexture(this.worldMaskTexture);
  this.bind(11,null);this.worldMaskTexture=this.texture(WORLD_ATLAS_W,WORLD_ATLAS_H,g.RGBA8,g.RGBA,g.UNSIGNED_BYTE);
  this.shadowLevels=[];this.guardOrigins=new Float32Array(10);this.maskMap=new Float32Array(20);
  let height=0;for(let i=0;i<5;i++){const cell=4<<i,t=this.target(WORLD_ATLAS_W/cell,WORLD_ATLAS_H/cell,false,true);this.targets.push(t);this.shadowLevels.push(t);this.guardOrigins[i*2]=0;this.guardOrigins[i*2+1]=height;height+=t.h;}
  this.intervalTarget=this.target(WORLD_ATLAS_W/4,height,false,true);this.targets.push(this.intervalTarget);
  for(const t of [...this.shadowLevels,this.intervalTarget]){g.bindTexture(g.TEXTURE_2D,t.tex);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.NEAREST);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.NEAREST);}
  this.worldUploadedVersions=new Int32Array(5);this.worldUploadedVersions.fill(-1);this.intervalVersion=-1;this.intervalMode=-1;this.intervalRefits=0;this.worldUploads=0;
  for(const p of worldPlanes){const k=p.index*4,w=p.world;this.maskMap[k]=1/w[2];this.maskMap[k+1]=1/w[3];this.maskMap[k+2]=-w[0]/w[2];this.maskMap[k+3]=(w[1]+w[3])/w[3];}
  for(const p of [this.deck,this.deckDirect,this.villageSky,this.villageSkyDirect]){
   g.useProgram(p.p);const u=p.u;g.uniform1i(u.u_worldMask,11);g.uniform1i(u.u_intervalTex,12);g.uniform2f(u.u_worldAtlasSize,WORLD_ATLAS_W,WORLD_ATLAS_H);g.uniform4fv(u['u_planeTiles[0]'],planeRects);g.uniform4fv(u['u_maskMap[0]'],this.maskMap);g.uniform4fv(u['u_planeInfo[0]'],planeInfo);g.uniform2fv(u['u_guardOrigins[0]'],this.guardOrigins);
  }
  for(const p of [this.shadowBase,this.shadowReduce,this.shadowGuard]){g.useProgram(p.p);g.uniform1i(p.u.u_src,13);}
  g.bindFramebuffer(g.FRAMEBUFFER,null);
 }
 updateShadowIntervals(){
  const g=this.gl;let dirty=null;
  this.bind(11,this.worldMaskTexture);
  for(const p of worldPlanes)if(this.worldUploadedVersions[p.index]!==p.version){
   const [x,y,w,h]=p.rect;g.pixelStorei(g.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);g.texSubImage2D(g.TEXTURE_2D,0,x,y,g.RGBA,g.UNSIGNED_BYTE,p.canvas);g.pixelStorei(g.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);this.worldUploadedVersions[p.index]=p.version;this.worldUploads++;
   if(!dirty)dirty=[x,y,x+w,y+h];else{dirty[0]=Math.min(dirty[0],x);dirty[1]=Math.min(dirty[1],y);dirty[2]=Math.max(dirty[2],x+w);dirty[3]=Math.max(dirty[3],y+h);}
  }
  if(state.shadowMode===0||(state.shadowMode===2&&this.floatTargets&&!this.shadowDebugIntervals))return;
  if(this.intervalMode!==state.shadowMode||this.intervalVersion<0||(!dirty&&this.intervalVersion!==worldMaskVersion))dirty=[0,0,WORLD_ATLAS_W,WORLD_ATLAS_H];
  if(!dirty)return;
  // Exact dirty-region refit. Reduced grids are aligned; guard windows extend
  // one cell beyond the changed parents so their conservative ranges stay valid.
  const levels=state.shadowMode===1?2:5;g.enable(g.SCISSOR_TEST);this.bind(12,null);
  for(let i=0;i<levels;i++){
   const t=this.shadowLevels[i],cell=4<<i,x0=Math.floor(dirty[0]/cell),y0=Math.floor(dirty[1]/cell),x1=Math.ceil(dirty[2]/cell),y1=Math.ceil(dirty[3]/cell);
   this.bind(13,i===0?this.worldMaskTexture:this.shadowLevels[i-1].tex);g.bindFramebuffer(g.FRAMEBUFFER,t.fbo);g.viewport(0,0,t.w,t.h);g.scissor(x0,y0,x1-x0,y1-y0);g.useProgram((i===0?this.shadowBase:this.shadowReduce).p);g.drawArrays(g.TRIANGLES,0,3);
   if(state.shadowMode===1&&i!==1)continue;
   const gx0=Math.max(0,x0-1),gy0=Math.max(0,y0-1),gx1=Math.min(t.w,x1+1),gy1=Math.min(t.h,y1+1),origin=this.guardOrigins[i*2+1];
   this.bind(13,t.tex);g.bindFramebuffer(g.FRAMEBUFFER,this.intervalTarget.fbo);g.viewport(0,0,this.intervalTarget.w,this.intervalTarget.h);g.scissor(gx0,origin+gy0,gx1-gx0,gy1-gy0);g.useProgram(this.shadowGuard.p);g.uniform2f(this.shadowGuard.u.u_guardOrigin,0,origin);g.drawArrays(g.TRIANGLES,0,3);
  }
  this.intervalVersion=worldMaskVersion;this.intervalMode=state.shadowMode;this.intervalRefits++;g.disable(g.SCISSOR_TEST);
 }
 shadowUniforms(p){
  const g=this.gl,u=p.u;g.uniform1i(u.u_shadowMode,state.shadowMode);g.uniform3fv(u.u_shadowLight,this.shadowLight);if(p.shadowSubset){for(let i=0;i<5;i++){const k=i*4;g.uniform4f(p.boundLocations[i],planeBounds[k],planeBounds[k+1],planeBounds[k+2],planeBounds[k+3]);}}else g.uniform4fv(u['u_planeBounds[0]'],planeBounds);
 }
