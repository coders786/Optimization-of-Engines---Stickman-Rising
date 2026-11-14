// Aurora invariants depend on native screen X, time and camera, not Y.
// Store exactly one column packet per output column (no lower-res imagery).
const AURORA_COLUMNS_FS=FINAL_COMMON+`
 void main(){float x=v_uv.x+u_camShift.x*.03,t=u_time;
  if(gl_FragCoord.y<1.0){float fade=smoothstep(.01,.16,x)*down(.50,.80,x),y1=.25-.04*x+.048*sin(x*5.2+t*.22)+.022*cos(x*9.5-t*.16),y2=.33-.03*x+.038*sin(x*4.3-t*.18+1.5);outColor=vec4(y1,y2,fade,.82+.18*sin(t*.45+x*4.0));}
  else outColor=vec4(x*.42+.015*sin(x*11.0+t*.35)+t*.011,x*.95-t*.008,x*.65-t*.013,0.0);
 }
`;
const COLUMN_AURORA_GLSL=`
 uniform sampler2D u_auroraColumns;
 vec3 aurora(vec2 p,float t){
  if(p.y<.02||p.y>.50||p.x>.82)return vec3(0.0);
  int x=int(gl_FragCoord.x);vec4 col=texelFetch(u_auroraColumns,ivec2(x,0),0);float fade=col.z;if(fade<.005)return vec3(0.0);
  float dy1=col.x-p.y,dy2=col.y-p.y,c1=0.0,c2=0.0;vec3 nx=texelFetch(u_auroraColumns,ivec2(x,1),0).rgb;
  if(dy1>0.0&&dy1<.22){float n1=texture(u_noiseTex,vec2(nx.x,p.y*.05-t*.008)).r,n2=texture(u_noiseTex,vec2(nx.y,p.y*.08+.3)).g,rays=.35+.65*smoothstep(.25,.85,n1*.62+n2*.38);c1=smoothstep(0.0,.026,dy1)*exp(-dy1*11.5)*rays*down(.18,.22,dy1);}
  if(dy2>0.0&&dy2<.18){float n=texture(u_noiseTex,vec2(nx.z,p.y*.06+.6)).g;c2=smoothstep(0.0,.024,dy2)*exp(-dy2*13.5)*(.30+.70*smoothstep(.28,.86,n))*down(.145,.18,dy2);}
  vec3 a=mix(vec3(.06,.95,.72),vec3(.48,.28,.92),clamp(dy1/.16,0.0,1.0)),b=mix(vec3(.10,.84,.92),vec3(.68,.24,.86),clamp(dy2/.14,0.0,1.0));return(a*c1*.56+b*c2*.44)*fade*col.w;
 }
`;
const COLUMN_SKY_FS=SKY_FS.replace(AURORA_GLSL,COLUMN_AURORA_GLSL),COLUMN_HIGH_SKY_FS=HIGH_SKY_FS.replace(AURORA_GLSL,COLUMN_AURORA_GLSL);
