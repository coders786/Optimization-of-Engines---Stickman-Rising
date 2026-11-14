#version 300 es
precision highp float;
precision highp int;
in vec2 v_uv;
out vec4 outColor;
const float HY=0.740,VPX=0.565,VPY=0.340;
const vec2 FIELD_MIN=vec2(-0.18,-0.025),FIELD_SIZE=vec2(1.36,0.53);
float down(float a,float b,float x){return 1.0-smoothstep(a,b,x);}
vec2 fieldUV(vec2 p){return (p-FIELD_MIN)/FIELD_SIZE;}

uniform sampler2D u_src;
uniform vec2 u_guardOrigin;
void main(){
 ivec2 p=ivec2(gl_FragCoord.xy)-ivec2(u_guardOrigin),limit=textureSize(u_src,0)-1;vec2 lo=vec2(1.0),hi=vec2(0.0);
 for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec4 v=texelFetch(u_src,clamp(p+ivec2(x,y),ivec2(0),limit),0);lo=min(lo,v.rb);hi=max(hi,v.ga);}
 outColor=vec4(lo.r,hi.r,lo.g,hi.g);
}
