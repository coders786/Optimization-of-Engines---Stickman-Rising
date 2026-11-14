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
 ivec2 p=ivec2(gl_FragCoord.xy)*2,limit=textureSize(u_src,0)-1;
 vec4 a=texelFetch(u_src,min(p,limit),0),b=texelFetch(u_src,min(p+ivec2(1,0),limit),0),c=texelFetch(u_src,min(p+ivec2(0,1),limit),0),d=texelFetch(u_src,min(p+ivec2(1,1),limit),0);
 outColor=vec4(min(min(a.r,b.r),min(c.r,d.r)),max(max(a.g,b.g),max(c.g,d.g)),min(min(a.b,b.b),min(c.b,d.b)),max(max(a.a,b.a),max(c.a,d.a)));
}
