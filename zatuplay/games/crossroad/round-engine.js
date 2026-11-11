const legacyGenerate=generate;
function expandedAttempt(station,round=0,attempt=0){
 const tier=levelFor(station.p), target=[0,6,8,10,13,16][tier]+Math.floor(round/4),size=Math.max([0,15,17,19,21,25][tier],station.k.length+4);
 const rng=random(station.id+20261105+round*104729+attempt*7919),cells=new Map(),placements=[],used=new Set();
 const key=(x,y)=>x+','+y;
 function fit(word,x,y,d){
  const dx=d==='H'?1:0,dy=d==='V'?1:0;
  if(x<0||y<0||x+dx*(word.a.length-1)>=size||y+dy*(word.a.length-1)>=size)return -1;
  if(cells.has(key(x-dx,y-dy))||cells.has(key(x+dx*word.a.length,y+dy*word.a.length)))return -1;
  let crosses=0;
  for(let i=0;i<word.a.length;i++){
   const xx=x+i*dx,yy=y+i*dy,c=cells.get(key(xx,yy));
   if(c){if(c.ch!==word.a[i]||c.d.includes(d))return -1;crosses++;}
   else if(cells.has(key(xx+dy,yy+dx))||cells.has(key(xx-dy,yy-dx)))return -1;
  }
  return crosses;
 }
 function add(w,x,y,d){
  const id=placements.length,dx=d==='H'?1:0,dy=d==='V'?1:0;
  for(let i=0;i<w.a.length;i++){const k=key(x+i*dx,y+i*dy),c=cells.get(k);if(c)c.d.push(d);else cells.set(k,{ch:w.a[i],d:[d]});}
  placements.push({...w,x,y,d,id});used.add(w.a);
 }
 add({a:station.k+'えき',c:`「${station.n}駅」の読み（末尾の「えき」も入れる。括弧内の別名・中黒・空白を除く）`,l:1},1,Math.floor(size/2),'H');
 const local=LOCALS[station.p-1];
 const pool=EXPANDED_WORDS.filter(w=>w.l<=Math.min(tier,4)&&(tier<4||w.l>=(tier===5?3:2)));
 // Always attempt regional vocabulary before the shuffled common bank.
 const regional=[{a:DATA.readings[station.p-1],c:`「${DATA.prefectures[station.p-1]}」の読み。県・府・都は付けない`,l:2},local];
 // Shuffle with seeded Fisher-Yates.
 for(let i=pool.length-1;i>0;i--){let j=Math.floor(rng()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
 const candidates=[...regional,...pool];
 for(let pass=0;pass<3&&placements.length<target;pass++){
  for(const w of candidates){
   if(used.has(w.a)||placements.length>=target)continue;
   let best=null,bestScore=-Infinity;
   for(const old of placements)for(let j=0;j<old.a.length;j++)for(let i=0;i<w.a.length;i++){
    if(old.a[j]!==w.a[i])continue;
    const d=old.d==='H'?'V':'H',xx=old.x+(old.d==='H'?j:0)-(d==='H'?i:0),yy=old.y+(old.d==='V'?j:0)-(d==='V'?i:0);
    const n=fit(w,xx,yy,d);if(n<1)continue;
    const score=n*100-Math.abs(xx-size/2)-Math.abs(yy-size/2)+rng()*5;
    if(score>bestScore){bestScore=score;best=[xx,yy,d];}
   }
   if(best)add(w,...best);
  }
 }
 const coords=[...cells.keys()].map(k=>k.split(',').map(Number)),minx=Math.min(...coords.map(c=>c[0])),miny=Math.min(...coords.map(c=>c[1]));
 placements.forEach(w=>{w.x-=minx;w.y-=miny;});
 const starts=[...new Set(placements.map(w=>key(w.x,w.y)))].sort((a,b)=>{let[x,y]=a.split(',').map(Number),[xx,yy]=b.split(',').map(Number);return y-yy||x-xx;});
 placements.forEach(w=>w.num=starts.indexOf(key(w.x,w.y))+1);
 return {tier,words:placements,w:Math.max(...coords.map(c=>c[0]))-minx+1,h:Math.max(...coords.map(c=>c[1]))-miny+1};
}


const puzzleCache=new Map();
function makePuzzle(station,round=0){
 if(!puzzleCache.has(station.id)){
  const boards=[],fingerprints=new Set();
  for(let r=0;r<10;r++){
   let best=null;
   if(r===0&&station.legacy)best=legacyGenerate(station);
   else for(let attempt=0;attempt<80;attempt++){
    const p=expandedAttempt(station,r,attempt),fingerprint=JSON.stringify(p.words);
    if(fingerprints.has(fingerprint))continue;
    if(!best||p.words.length>best.words.length)best=p;
    if(p.words.length>=[0,6,8,10,13,16][p.tier]+Math.floor(r/4))break;
   }
   if(!best)throw new Error('別の盤面を作れませんでした: '+station.id+':'+r);
   best.round=r;boards.push(best);fingerprints.add(JSON.stringify(best.words));
  }
  puzzleCache.set(station.id,boards);
  if(puzzleCache.size>12)puzzleCache.delete(puzzleCache.keys().next().value);
 }
 return puzzleCache.get(station.id)[round];
}
