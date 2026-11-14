#version 300 es
precision highp float;
precision highp int;
in vec2 v_uv;
out vec4 outColor;
const float HY=0.740,VPX=0.565,VPY=0.340;
const vec2 FIELD_MIN=vec2(-0.18,-0.025),FIELD_SIZE=vec2(1.36,0.53);
float down(float a,float b,float x){return 1.0-smoothstep(a,b,x);}
vec2 fieldUV(vec2 p){return (p-FIELD_MIN)/FIELD_SIZE;}

uniform sampler2D u_noiseTex;
float noise2(vec2 p){return texture(u_noiseTex,p*0.0625).r;}
float hash12(vec2 p){return texture(u_noiseTex,p*0.19).b;}
float fbm3(vec2 p){return dot(texture(u_noiseTex,p*0.0625).rgb,vec3(0.54,0.30,0.16));}

uniform float u_time,u_aspect;
uniform vec4 u_wind;
uniform int u_pack;
float field(vec2 p){
 if(p.y<0.01||p.y>0.48)return 0.0;
 // Coordinate advection uses integrated wind, not a second noise simulation.
 float ix=p.x*u_aspect*2.45-u_wind.z*0.022,iy=p.y*2.45-u_wind.w*0.006;
 vec3 lut=texture(u_noiseTex,vec2(ix*0.78,iy*0.95)*0.0625).rgb;
 float macro=0.62*lut.r+0.38*noise2(vec2(ix*1.50+3.1,iy*1.70+1.9));
 vec2 q=vec2(ix*1.85+0.14*lut.g,iy*2.15+0.06*(lut.b-0.5));
 float detail=0.0,a=0.50;
 for(int i=0;i<4;i++){detail+=a*noise2(q);q=mat2(1.62,1.24,-1.24,1.62)*q+vec2(3.1,1.7);a*=0.50;}
 float shape=macro*0.56+detail*0.50;
 float alt=smoothstep(0.015,0.11,p.y)*down(0.22,0.47,p.y);
 float cycle=0.5+0.5*sin(u_time*0.11-p.x*1.8);
 return clamp((shape*(0.18+0.88*alt)+0.095*alt*cycle-0.45)/0.25,0.0,1.0);
}
void main(){float d=field(FIELD_MIN+v_uv*FIELD_SIZE);if(u_pack==1){float hi=floor(d*255.0)/255.0;outColor=vec4(hi,(d-hi)*255.0,0.0,1.0);}else outColor=vec4(d,0.0,0.0,1.0);}
