from pathlib import Path
p=Path('/home/user/moonlit-sakura-optics.html');s=p.read_text()
def replace(a,b):
 global s
 assert s.count(a)==1,(s.count(a),a[:130])
 s=s.replace(a,b)
replace('this.fogPass=this.program(vs,FOG_FS);','this.fogPass=this.program(vs,FOG_FS);this.fogGuard=this.program(vs,FOG_GUARD_FS);')
replace('this.targets.push(this.fogTarget);', 'this.targets.push(this.fogTarget);this.fogRawTarget=this.target(this.fogTarget.w,this.fogTarget.h,false,true);this.targets.push(this.fogRawTarget);')
replace('g.useProgram(this.fogPass.p);g.uniform1i(this.fogPass.u.u_occluderTex,0);','g.useProgram(this.fogGuard.p);g.uniform1i(this.fogGuard.u.u_fogTex,7);\n  g.useProgram(this.fogPass.p);g.uniform1i(this.fogPass.u.u_occluderTex,0);')
replace('const g=this.gl,target=this.fogTarget;', 'const g=this.gl,target=this.fogRawTarget;')
replace('this.common(this.fogPass,t,mx,my);g.drawArrays(g.TRIANGLES,0,3);', '''this.common(this.fogPass,t,mx,my);g.drawArrays(g.TRIANGLES,0,3);
  this.bind(7,target.tex);g.bindFramebuffer(g.FRAMEBUFFER,this.fogTarget.fbo);g.useProgram(this.fogGuard.p);g.drawArrays(g.TRIANGLES,0,3);''')
p.write_text(s);Path('/home/user/candidate-check.js').write_text(s.split('<script>',1)[1].split('</script>',1)[0])
