#version 300 es
precision highp float;
precision highp int;
in vec2 v_uv;
out vec4 outColor;
const float HY=0.740,VPX=0.565,VPY=0.340;
const vec2 FIELD_MIN=vec2(-0.18,-0.025),FIELD_SIZE=vec2(1.36,0.53);
float down(float a,float b,float x){return 1.0-smoothstep(a,b,x);}
vec2 fieldUV(vec2 p){return (p-FIELD_MIN)/FIELD_SIZE;}

uniform sampler2D u_density;
uniform vec2 u_densityDecode,u_moonCloud;
uniform float u_aspect,u_rayIntensity;
uniform int u_pack;
float cloud(vec2 p){if(p.y<0.01||p.y>0.48)return 0.0;return dot(texture(u_density,fieldUV(p)).rg,u_densityDecode);}
void main(){
 vec2 p=FIELD_MIN+v_uv*FIELD_SIZE;
 if(p.y<0.01||p.y>0.48){outColor=vec4(0.0);return;}
 vec2 delta=u_moonCloud-p;float dist=length(delta),dMoon=length(delta*vec2(u_aspect,1.0));
 float dens=cloud(p);
 if(dens<=0.005&&dMoon>=0.56){outColor=vec4(0.0);return;}
 vec2 dir=delta/max(0.003,dist);
 float densUp=cloud(p+dir*0.013);
 float edge=mix(0.75,clamp((dens-densUp)*3.8+0.50,0.0,1.6),smoothstep(0.004,0.035,dist));
 // Stable midpoint quadrature avoids magnified low-resolution noise grids.
 float optical=0.0;
 for(int s=0;s<6;s++){float f=(float(s)+0.5)/6.0;optical+=cloud(p+dir*(dist*0.72*f))*(1.0-0.08*float(s));}
 float trans=exp(-optical*(3.3/3.4));
 float phase=exp(-dMoon*2.8)*1.65+exp(-dMoon*8.5)*1.15+0.16;
 vec3 dark=vec3(0.005,0.009,0.020)*dens*(1.0-clamp(trans*0.55,0.0,1.0));
 vec3 rim=vec3(1.16,1.34,1.58)*(trans*phase*edge*clamp(dens*2.1,0.0,1.0));
 float spill=(1.0-dens*0.85)*trans*trans*(exp(-dMoon*2.8)*0.48+exp(-dMoon*8.0)*0.34)*down(0.02,0.55,dist)*u_rayIntensity;
 // Both radiance and extinction approach zero BEFORE the cache boundary.
 // This removes the horizontal atmospheric rectangle without hiding detail.
 float boundary=smoothstep(0.01,0.045,p.y)*down(0.38,0.48,p.y);
 vec3 radiance=(dark+rim+vec3(0.54,0.82,1.12)*spill)*boundary;
 if(u_pack==1)radiance=sqrt(clamp(radiance/8.0,0.0,1.0));
 outColor=vec4(radiance,clamp(dens*0.92,0.0,0.93)*boundary);
}
