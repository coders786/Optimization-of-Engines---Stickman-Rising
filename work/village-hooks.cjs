const marker='bakeCommonSprites();initGL();resize();schedule();';
const hook=`bakeCommonSprites();initGL();resize();window.__village={state,get renderer(){return renderer},get gl(){return gl},worldPlanes,get worldMaskVersion(){return worldMaskVersion},planeRects,planeWorld,planeInfo,planeBounds,VERT,HEAD,FINAL_COMMON,SHADOW_GLSL,DIRECT_SHADOW_GLSL,
step(t,dt=1/60){state.time=t;updateWind(t);applyParallax(t);updateGeometry(t);drawSkyFX(t,dt);drawDeadTree(t);drawMist(t);drawStructureIslands(t);drawLife(t,dt);updateOccluder(t);renderer.render(t);drawForeground(t,dt);},
staticStep(t){state.time=t;updateWind(t);applyParallax(t);updateGeometry(t);drawStructureIslands(t);updateOccluder(t);renderer.render(t);}};`;
module.exports={marker,hook,instrument(html){if(html.split(marker).length!==2)throw Error('Missing marker');return html.replace(marker,hook);}};
