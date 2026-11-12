from pathlib import Path
class Reader:
 def __init__(self,b):self.b=b;self.p=0
 def n(self):
  v=0
  while True:
   b=self.b[self.p];self.p+=1;v=(v<<7)|(b&127)
   if not b&128:return v
 def s(self):
  n=self.n();b=self.b[self.p:self.p+n];self.p+=n;return b
 def chunks(self):
  d={}
  while self.p<len(self.b):
   k=self.n()
   if not k:break
   d[k]=self.s()
  return d
 def array(self):
  n=self.n();return {self.n():self.chunks() for i in range(n)}
def num(b,default=0):return Reader(b).n() if b else default
def text(b):return b.decode('cp932',errors='replace')
def root(p):
 r=Reader(Path(p).read_bytes());h=r.s();return h,r.chunks()
