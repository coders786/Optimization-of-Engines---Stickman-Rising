// Factor the released confidence-guarded fog integrals out of the material
// shaders. These are native pixel coordinates, not a lower-resolution cache.
// The same fogSheet implementation evaluates each pixel's exact-edge fallback.
const NATIVE_FOG_FS=FINAL_COMMON+VISIBILITY_GLSL+`
 void main(){vec2 scr=vec2(v_uv.x,1.0-v_uv.y),scene=scr+u_camShift*0.72,moonScene=u_moonScr+u_camShift*0.64;outColor=vec4(fogSheet(scene,moonScene).rg,0.0,1.0);}
`;
const NATIVE_FOG_READ_GLSL=`
 uniform sampler2D u_nativeFog;
 float fogNoise(vec2 p){return fbm3(p*vec2(3.4,5.6)-u_wind.zw*vec2(0.018,0.008));}
 vec3 fogSheet(vec2 scene,vec2 unused){vec2 uv=(scene-FOG_MIN)/FOG_SIZE;float n=fogNoise(scene);if(u_fogCached==1&&all(greaterThanEqual(uv,vec2(0.0)))&&all(lessThanEqual(uv,vec2(1.0))))n=texture(u_fogTex,uv).b;return vec3(texelFetch(u_nativeFog,ivec2(gl_FragCoord.xy),0).rg,n);}
`;
const REFINED_SKY_FS=SKY_FS.replace(VISIBILITY_GLSL,NATIVE_FOG_READ_GLSL);
const REFINED_VILLAGE_FS=NATIVE_VILLAGE_FS.replace(VISIBILITY_GLSL,NATIVE_FOG_READ_GLSL);
