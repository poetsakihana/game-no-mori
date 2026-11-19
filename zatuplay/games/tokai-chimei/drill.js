(function(root){
'use strict';
function dayOf(now){return Math.floor((now+9*3600000)/86400000);}
function sample(list,now,pref){
  const n=list.length, k=Math.min(5,n);
  if(!n)return [];
  const day=dayOf(now);
  let h=2166136261;
  for(const c of String(pref))h=Math.imul(h^c.charCodeAt(0),16777619);
  const initial=((h>>>0)+day)%n;
  return Array.from({length:k},(_,i)=>list[(initial+Math.floor(i*n/k))%n]);
}
root.TokaiDrill={sample,dayOf};
})(globalThis);
