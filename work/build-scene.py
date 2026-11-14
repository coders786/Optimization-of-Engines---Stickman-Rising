"""Rebuild the tested candidate from its frozen baseline; never edits live HTML."""
from pathlib import Path
import subprocess,sys,hashlib
root=Path(__file__).resolve().parent
for script in ['build-optics.py','patch-optics-renderer.py','split-water.py','factor-sky.py','confidence-fog.py','polish-optics.py']:
 subprocess.run([sys.executable,str(root/script)],cwd=root,check=True)
subprocess.run(['node','--check','candidate-check.js'],cwd=root,check=True)
p=root/'moonlit-sakura-optics.html'
print('Candidate',len(p.read_bytes()),'bytes; SHA256',hashlib.sha256(p.read_bytes()).hexdigest())
