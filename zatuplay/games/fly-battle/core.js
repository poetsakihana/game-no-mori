/* Canvas/native rules translated from the owner-supplied 1.0 APK. No dependencies. */
(function (root) {
'use strict';
const KEY='zatuplay.fly-battle.web.v1', FORMAT='zatuplay-fly-battle', VERSION=1;
const f=Math.fround, STEP=f(1/120), BURN=f(1.65), clone=x=>JSON.parse(JSON.stringify(x));
const FOOD_NAMES=['コロッケ','エビフライ','からあげ','天ぷら'];
const RIVALS=['見習い コムギ','屋台 アゲ丸','料理長 カリナ','揚げ物王 サクゾウ'];
const MASK=(1n<<48n)-1n;
class JavaRandom {
 constructor(seed=Date.now()){this.seed=(BigInt(seed)^0x5deece66dn)&MASK;}
 next(bits){this.seed=(this.seed*0x5deece66dn+11n)&MASK;return Number(this.seed>>BigInt(48-bits));}
 nextFloat(){return this.next(24)/16777216;}
 nextInt4(){return Math.floor(4*this.next(31)/2147483648);}
}
function initialSeed(){try{if(globalThis.crypto&&typeof globalThis.crypto.getRandomValues==='function'){const words=new Uint32Array(2);globalThis.crypto.getRandomValues(words);return (BigInt(words[0]&65535)<<32n)|BigInt(words[1]);}}catch(ignored){}return BigInt(Date.now());}
function fresh(seed=initialSeed()) {const rng=new JavaRandom(seed);return {screen:'title',page:0,stage:1,unlocked:1,name:'料理人',sound:true,ranks:[],best:0,seed:String(rng.seed),foods:[],flights:[],ticks:0,carry:0,clock:0,count:0,points:0,sum:0,cpuSum:0,paused:false,win:false,msg:''};}
function quality(age,target){return Math.round(f(f(Math.max(0,f(1-f(Math.abs(f(f(age/target)-1))*2))))*100));}
function targetTime(stage,random){return f(f(f(random*3)+4)/f(f(f(stage-1)*f(.015))+1));}
function cpuQuality(stage,random){return f(f(f(f(random*f(.34))+f(.38))+f(f(stage-1)*f(.002)))*100);}
class Game {
 constructor(state=fresh()){this.s=clone(state);this.rng=new JavaRandom(0);this.rng.seed=BigInt(this.s.seed);this.onScoop=null;}
 random(){const v=this.rng.nextFloat();this.s.seed=String(this.rng.seed);return v;}
 food(){const target=targetTime(this.s.stage,this.random()),type=this.rng.nextInt4();this.s.seed=String(this.rng.seed);return{age:0,target,type};}
 start(stage){const s=this.s;if(!Number.isInteger(stage)||stage<1||stage>s.unlocked||stage>100)return false;s.stage=stage;s.count=s.points=s.cpuSum=s.sum=s.ticks=s.carry=0;s.flights=[];s.foods=Array.from({length:4},()=>this.food());s.msg='100％が最高の揚げごろ！';s.paused=false;s.win=false;s.screen='play';return true;}
 take(i,burn=false){const s=this.s;if(s.screen!=='play'||s.paused||!Number.isInteger(i)||i<0||i>3)return false;const food=s.foods[i],q=burn?0:quality(food.age,food.target);s.sum=f(s.sum+q);s.count++;s.points+=q*10;s.cpuSum=f(s.cpuSum+cpuQuality(s.stage,this.random()));s.flights.push({x:150+i*225,type:food.type,quality:q,t:0});s.msg=burn?'焦げちゃった！':q>=90?'サクッ！ 大成功！':q>=60?'おいしく揚がった！':'次は100％を狙おう！';s.foods[i]=this.food();if(this.onScoop)this.onScoop(q);return true;}
 finish(){const s=this.s;if(s.screen!=='play')return false;s.win=s.count>0&&s.sum>s.cpuSum;s.msg=s.win?(s.stage===100?'優勝！ あなたが揚げ物王！':'勝利！ 次の厨房へ！'):'再挑戦！ 揚げごろを見極めよう';if(s.win&&s.stage===s.unlocked&&s.unlocked<100)s.unlocked++;s.ranks.push({name:s.name,score:s.points,stage:s.stage});s.ranks.sort((a,b)=>b.score-a.score);s.ranks=s.ranks.slice(0,10);s.best=Math.max(s.best,s.points);s.screen='result';s.paused=false;s.carry=0;return true;}
 advance(seconds){if(!Number.isFinite(seconds)||seconds<0)throw Error('Invalid elapsed time');const s=this.s;if(s.screen!=='play'||s.paused)return;s.carry+=seconds;let steps=Math.floor((s.carry+1e-10)*120);s.carry-=steps/120;if(s.carry<0)s.carry=0;for(let k=0;k<steps&&s.screen==='play';k++){s.ticks++;s.clock+=1/120;for(let i=0;i<4;i++){const food=s.foods[i];food.age=f(food.age+STEP);if(f(food.age/food.target)>BURN)this.take(i,true);}for(const flight of s.flights)flight.t+=1/120;s.flights=s.flights.filter(v=>v.t<=1);if(s.ticks>=5400)this.finish();}}
 pause(){if(this.s.screen==='play')this.s.paused=true;}
}
function finite(n,min,max){return typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max;}
function int(n,min,max){return Number.isInteger(n)&&n>=min&&n<=max;}
function validName(n){return typeof n==='string'&&n.length>0&&n.length<=12&&n===n.trim();}
function validate(s){const fail=()=>{throw Error('記録の形式が正しくありません。元の記録は変更していません。');};
 if(!s||typeof s!=='object'||!['title','story','play','result','rank'].includes(s.screen)||!int(s.page,0,4)||!int(s.stage,1,100)||!int(s.unlocked,1,100)||s.stage>s.unlocked||!validName(s.name)||typeof s.sound!=='boolean'||typeof s.paused!=='boolean'||typeof s.win!=='boolean'||!int(s.ticks,0,5400)||!finite(s.carry,0,1/120+.000001)||!finite(s.clock,0,1e12)||!int(s.count,0,1000000)||!int(s.points,0,1000000000)||!finite(s.sum,0,100000000)||s.sum!==Math.trunc(s.sum)||s.sum>s.count*100||s.points!==s.sum*10||!finite(s.cpuSum,0,s.count*93)||!int(s.best,0,1000000000)||typeof s.msg!=='string'||s.msg.length>200||typeof s.seed!=='string'||!/^\d{1,15}$/.test(s.seed)||BigInt(s.seed)>MASK)fail();
 if(!Array.isArray(s.foods)||![0,4].includes(s.foods.length)||(s.screen==='play'&&s.foods.length!==4)||(s.screen==='play'&&s.ticks>=5400))fail();
 for(const v of s.foods){const min=targetTime(s.stage,0),max=targetTime(s.stage,1);if(!v||!int(v.type,0,3)||!finite(v.target,min,max)||!finite(v.age,0,v.target*1.651))fail();}
 if(!Array.isArray(s.flights)||s.flights.length>1000)fail();for(const v of s.flights)if(!v||![150,375,600,825].includes(v.x)||!int(v.type,0,3)||!int(v.quality,0,100)||!finite(v.t,0,1.01))fail();
 if(!Array.isArray(s.ranks)||s.ranks.length>10)fail();for(let i=0;i<s.ranks.length;i++){const r=s.ranks[i];if(!r||!validName(r.name)||!int(r.stage,1,100)||!int(r.score,0,1000000000)||r.score%10||r.score>s.best||(i&&r.score>s.ranks[i-1].score))fail();}
 return clone(s);
}
function encode(s,revision=0){return JSON.stringify({format:FORMAT,version:VERSION,revision,state:validate(s)});}
function decode(raw){if(typeof raw!=='string'||raw.length>2000000)throw Error('記録を読み込めません。');const value=JSON.parse(raw);if(value.format!==FORMAT||value.version!==VERSION||!int(value.revision,0,Number.MAX_SAFE_INTEGER))throw Error('このゲームの対応する記録ではありません。');value.state=validate(value.state);return value;}
class SaveStore {
 constructor(storage){this.storage=storage;this.expected=null;this.revision=0;this.loaded=false;this.blocked=false;}
 load(){try{this.expected=this.storage.getItem(KEY);const value=this.expected===null?{state:fresh(),revision:0}:decode(this.expected);this.revision=value.revision;this.loaded=true;return value.state;}catch(e){this.blocked=true;throw e;}}
 // Caller MUST hold the lifetime Web Lock. The comparison also catches noncooperating editors.
 save(state){if(!this.loaded||this.blocked)throw Error('保存が保護されています。');try{if(this.storage.getItem(KEY)!==this.expected)throw Error('ほかの画面で記録が変わりました。再読込してください。');const raw=encode(state,this.revision+1);this.storage.setItem(KEY,raw);this.expected=raw;this.revision++;return raw;}catch(e){this.blocked=true;throw e;}}
 import(raw){const value=decode(raw),previous=this.storage.getItem(KEY);if(previous!==this.expected)throw Error('ほかの画面で記録が変わりました。');if(previous!==null)this.storage.setItem(KEY+'.before-import',previous);const next=encode(value.state,this.revision+1);this.storage.setItem(KEY,next);this.expected=next;this.revision++;this.loaded=true;this.blocked=false;return value.state;}
}
root.FlyBattle={KEY,FORMAT,VERSION,Game,JavaRandom,SaveStore,fresh,quality,targetTime,cpuQuality,validate,encode,decode,FOOD_NAMES,RIVALS,STEP,BURN};
})(typeof globalThis==='object'?globalThis:this);
