/* Browser state model. engine.js is the byte-identical Android web engine. */
'use strict';
(() => {
 const VERSION='1.0-web.1', FORMAT='zatuplay-slotten', MAX_BYTES=32768;
 const BETS=[5,10,25,50], SPEEDS=[1800,1000,500];
 const blank=()=>({coins:1000,spins:0,wins:0,earned:0,machine:0,sound:true,bet:10,speed:1000,reels:[0,1,2],last:null,pending:null});
 const bounded=(raw,max)=>typeof raw==='string'&&raw.length<=max&&new Blob([raw]).size<=max;
 // JSON.parse silently accepts duplicate keys. Scan bounded JSON first so
 // escaped-equivalent keys cannot replace earlier fields at any object depth.
 function parseStrict(raw,max){
  if(!bounded(raw,max))throw Error('size');let i=0,nodes=0;
  const ws=()=>{while(/[ \t\r\n]/.test(raw[i]||'~'))i++};
  function string(){const start=i;if(raw[i++]!=='"')throw Error('string');while(i<raw.length){const ch=raw[i++];if(ch==='"')return JSON.parse(raw.slice(start,i));if(ch==='\\')i++}throw Error('string')}
  function value(depth){
   if(depth>12||++nodes>4096)throw Error('complexity');ws();const ch=raw[i];
   if(ch==='{'){
    i++;ws();const seen=new Set();if(raw[i]==='}'){i++;return}
    while(true){ws();const key=string();if(seen.has(key))throw Error('duplicate key');seen.add(key);ws();if(raw[i++]!==':')throw Error('colon');value(depth+1);ws();if(raw[i]==='}'){i++;return}if(raw[i++]!==',')throw Error('object')}
   }
   if(ch==='['){i++;ws();if(raw[i]===']'){i++;return}while(true){value(depth+1);ws();if(raw[i]===']'){i++;return}if(raw[i++]!==',')throw Error('array')}}
   if(ch==='"'){string();return}
   const token=raw.slice(i).match(/^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/);if(!token)throw Error('value');i+=token[0].length;
  }
  value(0);ws();if(i!==raw.length)throw Error('trailing');return JSON.parse(raw);
 }
 const obj=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
 const exact=(v,keys)=>{if(!obj(v)||Object.keys(v).length!==keys.length||keys.some(k=>!Object.hasOwn(v,k)))throw Error('fields')};
 const integer=(v,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
 const sum=(a,b)=>{if(!integer(a+b))throw Error('integer limit');return a+b};
 function triples(v){if(!Array.isArray(v)||v.length!==3||v.some(n=>!integer(n,0,5)))throw Error('reels');return [...v]}
 function outcome(v){
  exact(v,['id','machine','bet','speed','reels','payout']);
  if(!integer(v.id,1)||!integer(v.machine,0,9)||!BETS.includes(v.bet)||!SPEEDS.includes(v.speed))throw Error('outcome');
  const reels=triples(v.reels),win=payout(reels,v.bet,MACHINES[v.machine]);
  if(v.payout!==win)throw Error('payout');
  return {id:v.id,machine:v.machine,bet:v.bet,speed:v.speed,reels,payout:win};
 }
 function validate(v){
  exact(v,Object.keys(blank()));
  if(['coins','spins','wins','earned'].some(k=>!integer(v[k]))||v.wins>v.spins||!integer(v.machine,0,9)||typeof v.sound!=='boolean'||!BETS.includes(v.bet)||!SPEEDS.includes(v.speed))throw Error('state');
  const s={coins:v.coins,spins:v.spins,wins:v.wins,earned:v.earned,machine:v.machine,sound:v.sound,bet:v.bet,speed:v.speed,reels:triples(v.reels),last:v.last===null?null:outcome(v.last),pending:v.pending===null?null:outcome(v.pending)};
  const completed=s.spins-(s.pending?1:0);
  if(completed<0||s.wins>completed||(s.wins===0?s.earned!==0:s.earned/s.wins<40||s.earned/s.wins>3450))throw Error('records');
  if(completed===0?s.last!==null:s.last===null||s.last.id!==completed)throw Error('last sequence');
  if(s.last&&(s.last.payout>s.earned||(s.last.payout>0&&s.wins===0)||(s.last.payout===0&&s.wins>=completed)))throw Error('last');
  if(s.pending){
   const p=s.pending;if(p.id!==s.spins||p.machine!==s.machine||p.bet!==s.bet||p.speed!==s.speed||s.wins>s.spins-1||(s.last&&s.last.id>=p.id))throw Error('pending');
   sum(s.coins,p.payout);sum(s.earned,p.payout);if(p.payout)sum(s.wins,1);
  }
  return s;
 }
 function begin(state,random=draw){
  const s=validate(state);if(s.pending)throw Error('pending');if(s.coins<s.bet)throw Error('coins');
  // Validate headroom before drawing or debiting; no precision loss at the numeric limit.
  sum(s.spins,1);sum(s.coins,3450);sum(s.earned,3450);sum(s.wins,1);
  const reels=triples([random(),random(),random()]);
  s.pending={id:s.spins+1,machine:s.machine,bet:s.bet,speed:s.speed,reels,payout:payout(reels,s.bet,MACHINES[s.machine])};
  s.coins-=s.bet;s.spins++;return validate(s);
 }
 function settle(state){const s=validate(state);if(!s.pending)return s;const p=s.pending;s.coins=sum(s.coins,p.payout);s.earned=sum(s.earned,p.payout);if(p.payout)s.wins=sum(s.wins,1);s.reels=[...p.reels];s.last=p;s.pending=null;return validate(s)}
 function refill(state){const s=validate(state);if(s.pending)throw Error('pending');if(s.coins>=100)throw Error('threshold');s.coins+=1000;return s}
 function encode(state,revision=0){if(!integer(revision))throw Error('revision');return JSON.stringify({format:FORMAT,version:1,revision,state:validate(state)},null,2)}
 function decode(raw){
  const d=parseStrict(raw,MAX_BYTES);exact(d,['format','version','revision','state']);
  if(d.format!==FORMAT||d.version!==1||!integer(d.revision))throw Error('format');return {state:validate(d.state),revision:d.revision};
 }
 function backup(raw,state){if(raw!==null&&!bounded(raw,MAX_BYTES))throw Error('original too large');const result=JSON.stringify({format:FORMAT+'-backup',version:1,raw,state:validate(state)},null,2);if(!bounded(result,MAX_BYTES*3))throw Error('backup too large');return result}
 function decodeBackup(raw){const d=parseStrict(raw,MAX_BYTES*3);exact(d,['format','version','raw','state']);if(d.format!==FORMAT+'-backup'||d.version!==1||(d.raw!==null&&!bounded(d.raw,MAX_BYTES)))throw Error('backup');return validate(d.state)}
 window.SlotTenCore={VERSION,FORMAT,MAX_BYTES,BETS,SPEEDS,blank,validate,begin,settle,refill,encode,decode,backup,decodeBackup};
})();
