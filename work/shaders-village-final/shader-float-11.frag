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
void main(){
 ivec2 p=ivec2(gl_FragCoord.xy)*4,limit=textureSize(u_src,0)-1;vec2 lo=vec2(1.0),hi=vec2(0.0);
 for(int y=0;y<4;y++)for(int x=0;x<4;x++){vec2 v=texelFetch(u_src,min(p+ivec2(x,y),limit),0).rg;lo=min(lo,v);hi=max(hi,v);}
 outColor=vec4(lo.r,hi.r,lo.g,hi.g);
}
