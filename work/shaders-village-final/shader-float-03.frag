#version 300 es
precision highp float;
precision highp int;
in vec2 v_uv;
out vec4 outColor;
const float HY=0.740,VPX=0.565,VPY=0.340;
const vec2 FIELD_MIN=vec2(-0.18,-0.025),FIELD_SIZE=vec2(1.36,0.53);
float down(float a,float b,float x){return 1.0-smoothstep(a,b,x);}
vec2 fieldUV(vec2 p){return (p-FIELD_MIN)/FIELD_SIZE;}

uniform sampler2D u_fogTex;
void main(){
 ivec2 p=ivec2(gl_FragCoord.xy),limit=textureSize(u_fogTex,0)-1;
 vec3 c=texelFetch(u_fogTex,p,0).rgb;vec2 lo=c.rg,hi=c.rg;
 for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
  if(x==0&&y==0)continue;vec2 v=texelFetch(u_fogTex,clamp(p+ivec2(x,y),ivec2(0),limit),0).rg;
  lo=min(lo,v);hi=max(hi,v);
 }
 vec2 range=hi-lo;float flags=step(0.02,range.r)+2.0*step(0.02,range.g);outColor=vec4(c,flags/3.0);
}
