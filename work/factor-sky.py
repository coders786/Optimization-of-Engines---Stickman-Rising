from pathlib import Path
p=Path('/home/user/moonlit-sakura-optics.html');s=p.read_text()
def replace(a,b):
 global s
 assert s.count(a)==1,(s.count(a),a[:120])
 s=s.replace(a,b)
replace('const DECK_FS=FINAL_COMMON+`', '''// Exact specialization of the existing scene.y > .36 branch. All final
// pixels remain native resolution; the upper program simply has no fog loops.
const HIGH_SKY_FS=SKY_FS.replace('scene.y>0.36?fogSheet(scene,moonScene):vec3(1.0,1.0,0.5)','vec3(1.0,1.0,0.5)');
const DECK_FS=FINAL_COMMON+`''')
replace('this.sky=this.program(vs,SKY_FS);', 'this.sky=this.program(vs,SKY_FS);this.skyHigh=this.program(vs,HIGH_SKY_FS);')
replace('for(const p of [this.sky,this.deck,this.water])','for(const p of [this.sky,this.skyHigh,this.deck,this.water])')
replace('g.enable(g.SCISSOR_TEST);g.scissor(0,rows,deck.width,deck.height-rows);this.common(this.sky,t,mx,my);g.drawArrays(g.TRIANGLES,0,3);', '''g.enable(g.SCISSOR_TEST);
  const split=Math.max(rows,Math.min(deck.height,Math.ceil((.64+state.camNY*.72)*deck.height-.5)));
  g.scissor(0,split,deck.width,deck.height-split);this.common(this.skyHigh,t,mx,my);g.drawArrays(g.TRIANGLES,0,3);
  if(split>rows){g.scissor(0,rows,deck.width,split-rows);this.common(this.sky,t,mx,my);g.drawArrays(g.TRIANGLES,0,3);}''')
p.write_text(s);Path('/home/user/candidate-check.js').write_text(s.split('<script>',1)[1].split('</script>',1)[0])
