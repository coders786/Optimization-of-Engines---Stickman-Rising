const { chromium } = require('/home/user/.cache/browser-check/node_modules/playwright');
const fs = require('fs');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1000,height:800},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'||m.type()==='warning') errors.push(m.type()+': '+m.text());});
 await page.goto('http://127.0.0.1:3000/',{waitUntil:'load'});
 await page.waitForTimeout(1500);
 const report=await page.evaluate(()=>Array.from(document.querySelectorAll('canvas')).map(c=>{
  const isGL=c.id==='layer-raytrace-deck',g=c.getContext(isGL?'webgl2':'2d');
  return {id:c.id,attrs:g?.getContextAttributes(),corner:!isGL&&g?Array.from(g.getImageData(0,0,1,1).data):[],size:[c.width,c.height],rect:(()=>{let r=c.getBoundingClientRect();return [r.x,r.y,r.width,r.height]})()};
 }));
 await page.screenshot({path:'/home/user/'+(process.argv[2]||'scene-inspection')+'.png'});
 console.log(JSON.stringify({errors,report},null,2));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
