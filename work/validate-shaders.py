import ctypes as C, os, sys
from pathlib import Path
os.environ.setdefault('EGL_PLATFORM','surfaceless')
os.environ.setdefault('LIBGL_ALWAYS_SOFTWARE','1')
egl=C.CDLL('libEGL.so.1'); gl=C.CDLL('libGLESv2.so.2')
I=C.c_int; U=C.c_uint; P=C.c_void_p

def fn(lib,name,restype,args):
 f=getattr(lib,name);f.restype=restype;f.argtypes=args;return f
getDisplay=fn(egl,'eglGetDisplay',P,[P]); initialize=fn(egl,'eglInitialize',U,[P,C.POINTER(I),C.POINTER(I)])
d=getDisplay(None);major=I();minor=I()
if not initialize(d,C.byref(major),C.byref(minor)):raise RuntimeError('EGL init failed')
fn(egl,'eglBindAPI',U,[U])(0x30A0)
attrs=(I*15)(0x3033,1,0x3040,0x40,0x3024,8,0x3023,8,0x3022,8,0x3021,8,0x3038,0,0)
config=P();num=I()
if not fn(egl,'eglChooseConfig',U,[P,C.POINTER(I),C.POINTER(P),I,C.POINTER(I)])(d,attrs,C.byref(config),1,C.byref(num)) or not num.value:raise RuntimeError('EGL config failed')
s=fn(egl,'eglCreatePbufferSurface',P,[P,P,C.POINTER(I)])(d,config,(I*5)(0x3057,64,0x3056,64,0x3038))
c=fn(egl,'eglCreateContext',P,[P,P,P,C.POINTER(I)])(d,config,None,(I*3)(0x3098,3,0x3038))
if not fn(egl,'eglMakeCurrent',U,[P,P,P,P])(d,s,s,c):raise RuntimeError('EGL context failed')
print(fn(gl,'glGetString',C.c_char_p,[U])(0x1F02).decode())
create=fn(gl,'glCreateShader',U,[U]);source=fn(gl,'glShaderSource',None,[U,I,C.POINTER(C.c_char_p),C.POINTER(I)]);compile_=fn(gl,'glCompileShader',None,[U]);iv=fn(gl,'glGetShaderiv',None,[U,U,C.POINTER(I)]);log=fn(gl,'glGetShaderInfoLog',None,[U,I,C.POINTER(I),C.c_char_p])
def shader(kind,text):
 sh=create(kind);b=text.encode();a=(C.c_char_p*1)(b);source(sh,1,a,None);compile_(sh);ok=I();iv(sh,0x8B81,C.byref(ok));buf=C.create_string_buffer(65536);log(sh,65536,None,buf)
 if buf.value:print(buf.value.decode())
 if not ok.value:raise RuntimeError('Shader compilation failed')
 return sh
directory=Path(sys.argv[1]) if len(sys.argv)>1 else Path('.')
vs=shader(0x8B31,(directory/'shader.vert').read_text())
for file in sorted(directory.glob('shader-*.frag')):
 name=file.stem.removeprefix('shader-')
 fs=shader(0x8B30,file.read_text());p=fn(gl,'glCreateProgram',U,[])();attach=fn(gl,'glAttachShader',None,[U,U]);attach(p,vs);attach(p,fs);fn(gl,'glLinkProgram',None,[U])(p);ok=I();fn(gl,'glGetProgramiv',None,[U,U,C.POINTER(I)])(p,0x8B82,C.byref(ok));buf=C.create_string_buffer(65536);fn(gl,'glGetProgramInfoLog',None,[U,I,C.POINTER(I),C.c_char_p])(p,65536,None,buf)
 if buf.value:print(buf.value.decode())
 if not ok.value:raise RuntimeError(name+' link failed')
 print('PASS',name,'compile + link')
fn(egl,'eglTerminate',U,[P])(d)
