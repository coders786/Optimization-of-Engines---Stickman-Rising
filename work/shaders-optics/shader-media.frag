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
 float edge=mix(0.75,clamp((dens-densUp)*3.2+0.62,0.12,1.5),smoothstep(0.004,0.035,dist));
 float optical=0.0;
 for(int s=0;s<6;s++){float f=(float(s)+0.5)/6.0;optical+=cloud(p+dir*(dist*0.72*f))*(1.0-0.08*float(s));}
 float trans=exp(-optical*(3.3/3.4));
 // Normalized Henyey-Greenstein lobe, using a 2D angular proxy (g = .64).
 float mu=inversesqrt(1.0+4.0*dMoon*dMoon),denom=max(0.1296,1.4096-1.28*mu);
 float phase=0.14+2.65*pow(0.1296/denom,1.5);
 float opacity=1.0-exp(-dens*1.55);
 vec3 ambient=vec3(0.018,0.031,0.054)*opacity;
 vec3 single=vec3(0.92,1.09,1.31)*(trans*phase*edge*opacity);
 vec3 softFill=vec3(0.055,0.079,0.11)*(1.0-trans)*opacity;
 float spill=(1.0-opacity)*trans*trans*(exp(-dMoon*3.2)*0.33+exp(-dMoon*9.0)*0.26)*down(0.02,0.55,dist)*u_rayIntensity;
 float boundary=smoothstep(0.01,0.045,p.y)*down(0.38,0.48,p.y);
 vec3 radiance=(ambient+single+softFill+vec3(0.47,0.68,0.93)*spill)*boundary;
 if(u_pack==1)radiance=sqrt(clamp(radiance/8.0,0.0,1.0));
 outColor=vec4(radiance,opacity*boundary);
}
