// Every surviving tile still shades its native pixels. The vertex shader
// discards only tiles carrying a proof that ALL their rays are transparent.
// This is work compaction, not resolution reduction or shadow upsampling.
const SHADOW_TILE_VERT=`#version 300 es
precision highp float;
precision highp int;
uniform sampler2D u_shadowTiles;
uniform vec2 u_shadowSize;
uniform float u_shadowTileSize,u_shadowTileRowStart;
out vec2 v_uv;
flat out vec2 v_tileProof;
void main(){
 int width=int(ceil(u_shadowSize.x/u_shadowTileSize)),row=gl_InstanceID/width+int(u_shadowTileRowStart),col=gl_InstanceID%width;
 v_tileProof=texelFetch(u_shadowTiles,ivec2(col,row),0).rg;
 if(v_tileProof.x==0.0&&v_tileProof.y==1.0){v_uv=vec2(0.0);gl_Position=vec4(3.0,3.0,0.0,1.0);return;}
 const int corners[6]=int[6](0,1,2,2,1,3);int c=corners[gl_VertexID];
 vec2 pixel=min((vec2(col,row)+vec2(c&1,c>>1))*u_shadowTileSize,u_shadowSize);
 v_uv=pixel/u_shadowSize;gl_Position=vec4(v_uv*2.0-1.0,0.0,1.0);
}
`;
// Preserve the reference's screen-space jitter bit pattern when compacted
// quads use different interpolators. One native fullscreen evaluation supplies
// the same angle; the MRT also initializes visibility to exactly one.
const SHADOW_JITTER_FS=FINAL_COMMON.replace('out vec4 outColor;','layout(location=0) out vec4 outColor;')+`
 uniform float u_shadowDeckRows;
 layout(location=1) out vec4 outJitter;
 void main(){vec2 scr=vec2(v_uv.x,1.0-v_uv.y);float wx,wz;
  if(gl_FragCoord.y<u_shadowDeckRows){float hy=HY-u_camShift.y*0.72,persp=1.0+(scr.y-hy)/(HY-VPY),parX=u_camShift.x*(0.72+(persp-1.0)*1.48);wx=VPX+(scr.x+parX-VPX)/persp;wz=1.0-1.0/persp;}
  else{vec2 scene=scr+u_camShift*0.72;float persp=1.0+(scene.y-HY)/(HY-VPY);wx=VPX+(scene.x-VPX)/max(0.02,persp);wz=1.0-1.0/max(0.02,persp);}
  outColor=vec4(1.0);outJitter=vec4(hash12(vec2(wx,wz)*vec2(500.0,500.0))*6.2831853,0.0,0.0,1.0);
 }
`;
