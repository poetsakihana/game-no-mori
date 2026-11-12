from parse import Reader, text
def cmds(b):
 r=Reader(b);out=[]
 while r.p<len(b):
  c=r.n();i=r.n();s=text(r.s());p=[r.n() for _ in range(r.n())];out.append((c,i,s,p))
 return out
