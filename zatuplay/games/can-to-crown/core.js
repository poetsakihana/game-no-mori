/* Can to Crown v2.1: direct port of the original native game rules.
 * Original executable and extracted tables are in reference/.
 * Browser lifecycle/save protections are separate from the economic rules. */
(function (root) {
'use strict';
const FORMAT = 'zatuplay-can-to-crown', VERSION = 1, KEY = 'zatuplay.can-to-crown.save.v1';
const bit = i => 1 << i, count = n => { let c=0; for(;n;n&=n-1)c++; return c; };
const clone = value => JSON.parse(JSON.stringify(value));
function validateData(data) {
  const e=data?.expansion,b=data?.base;
  const strings=['EVENTS','DETAILS','PEOPLE','TALKS','QUESTS','ITEMS','ACHIEVEMENTS'];
  const numbers=['EFFECT','QTYPE','NEED','ATYPE','ANEED'];
  if (!e || !b || strings.some(k=>!Array.isArray(e[k])||e[k].length!==20||e[k].some(v=>typeof v!=='string'||!v)) || numbers.some(k=>!Array.isArray(e[k])||e[k].length!==20||e[k].some(v=>!Number.isInteger(v)||v<0))) throw Error('原作データの形式が正しくありません。');
  for(const [k,n,t] of [['areas',5,'string'],['prices',5,'number'],['unlock',5,'number'],['costs',6,'number'],['income',6,'number'],['bizNames',6,'string'],['homeNames',5,'string'],['questDescriptions',6,'string']])
    if(!Array.isArray(b[k])||b[k].length!==n||b[k].some(v=>typeof v!==t || t==='number'&&(!Number.isFinite(v)||v<0))) throw Error('原作データが不足しています。');
  return data;
}
function fresh(rng=Math.random) {
  const s={cash:0,total:0,bag:0,tool:0,capacity:0,cart:0,homes:0,zone:0,business:0,picked:0,sold:0,ended:false,sound:true,eventBits:0,peopleBits:0,questBits:0,itemBits:0,achievementBits:0,talks:0,reputation:0,activeQuest:-1,questStart:0,eventCursor:0,taps:0,eventClock:0,saleUntil:0,pickUntil:0,bizUntil:0,page:0,pendingEvent:null,cans:[]};
  for(let i=0;i<20;i++) s.cans.push(spawn(rng));
  return s;
}
function spawn(rng) { return Math.floor(rng()*100)<8?3:Math.floor(rng()*100)<22?2:1; }
function validateState(s) {
  if (!s || typeof s!=='object' || Array.isArray(s)) throw Error('保存データの形式が違います。');
  const out={};
  for(const k of ['cash','total','questStart','eventClock','saleUntil','pickUntil','bizUntil']) {
    if(typeof s[k]!=='number'||!Number.isFinite(s[k])||s[k]<0||s[k]>Number.MAX_SAFE_INTEGER) throw Error('保存数値が正しくありません。');
    out[k]=s[k];
  }
  const limits={bag:620,tool:15,capacity:20,cart:15,homes:4,zone:4,business:6,picked:Number.MAX_SAFE_INTEGER,sold:Number.MAX_SAFE_INTEGER,eventBits:1048575,peopleBits:1048575,questBits:1048575,itemBits:1048575,achievementBits:1048575,talks:20,reputation:Number.MAX_SAFE_INTEGER,activeQuest:19,eventCursor:Number.MAX_SAFE_INTEGER,taps:Number.MAX_SAFE_INTEGER,page:5};
  for(const [k,max] of Object.entries(limits)) {
    if(!Number.isSafeInteger(s[k])||s[k]<(k==='activeQuest'?-1:0)||s[k]>max)throw Error('保存進行が正しくありません。');out[k]=s[k];
  }
  for(const k of ['sound','ended']) { if(typeof s[k]!=='boolean')throw Error('保存設定が正しくありません。');out[k]=s[k]; }
  if(out.bag>20+out.capacity*30||out.total+0.001<out.cash||out.sold>out.picked||out.bag>out.picked) throw Error('保存進行に矛盾があります。');
  if(!Array.isArray(s.cans)||s.cans.length!==20||s.cans.some(v=>![1,2,3].includes(v)))throw Error('缶の保存が正しくありません。');out.cans=s.cans.slice();
  if(s.pendingEvent===null) out.pendingEvent=null;
  else if(s.pendingEvent && Number.isInteger(s.pendingEvent.id)&&s.pendingEvent.id>=0&&s.pendingEvent.id<20&&Number.isFinite(s.pendingEvent.reward)&&s.pendingEvent.reward>=80&&s.pendingEvent.reward<=1e10) out.pendingEvent={id:s.pendingEvent.id,reward:s.pendingEvent.reward};
  else throw Error('イベントの保存が正しくありません。');
  if(out.activeQuest>=0 && (out.questBits & bit(out.activeQuest))) throw Error('完了済み依頼の重複です。');
  return out;
}
function decode(raw) {
  const e=JSON.parse(raw);
  if(e?.format!==FORMAT||e.version!==VERSION||!Number.isSafeInteger(e.revision)||e.revision<1||typeof e.writer!=='string')throw Error('このゲームの保存データではありません。');
  return {...e,state:validateState(e.state)};
}
class Game {
  constructor(data,state,rng=Math.random,clock=Date.now) { this.clock=clock; this.data=validateData(data);this.rng=rng;this.s=state?validateState(state):fresh(rng);this.note='缶をタップして拾おう！';this.tone=null; }
  get e(){return this.data.expansion;} get b(){return this.data.base;}
  msg(t){this.note=t;return false;}
  earn(n){this.s.cash+=n;this.s.total+=n;}
  maxBag(){return this.s.capacity*30+20;}
  rate(){const s=this.s;return s.business===0?0:this.b.income[s.business-1]*(s.bizUntil>this.clock()?2:1)*(1+Math.min(100,s.reputation)*0.01);}
  value(){const s=this.s;return s.bag*this.b.prices[s.zone]*(1+s.cart*0.2)*(s.saleUntil>this.clock()?2:1);}
  metric(t){const s=this.s;return [s.picked,s.sold,s.total,s.tool,s.business,s.homes][t];}
  achMetric(t){const s=this.s;return [s.picked,s.sold,s.total,s.reputation,count(s.itemBits)][t];}
  progress(i){const t=this.e.QTYPE[i];return t>=3?this.metric(t):Math.max(0,this.metric(t)-this.s.questStart);}
  questReward(i){return 300*Math.pow(1.5,i);}
  achievementReward(i){return 200*Math.pow(1.6,i);}
  questDescription(i){const t=this.e.QTYPE[i];return `${this.b.questDescriptions[t]}：${this.e.NEED[i]}${t<2?'個':t===2?'円':'段階'}`;}
  effect(i){return ['回収協力の報酬金','60秒間、売却額が2倍','60秒間、拾う数が2倍','60秒間、事業収入が2倍','評判＋3、謝礼金'][this.e.EFFECT[i]];}
  discovered(cat,i){return !!(this.s[['eventBits','peopleBits','questBits','itemBits','achievementBits'][cat]]&bit(i));}
  journalCount(){return ['eventBits','peopleBits','questBits','itemBits','achievementBits'].reduce((n,k)=>n+count(this.s[k]),0);}
  checkEnd(){if(this.s.cash>=1e8&&!this.s.ended){this.s.ended=true;this.s.page=4;return true;}return false;}
  tick(seconds,focused=true){
    if(!Number.isFinite(seconds)||seconds<0||seconds>1)throw Error('Invalid active frame duration');
    const s=this.s; this.earn(this.rate()*seconds);
    s.eventClock+=seconds;
    const eventDue=s.eventClock>=60&&!s.pendingEvent&&s.page!==4;
    if(eventDue)s.eventClock=0;
    this.checkEnd();
    if(eventDue&&s.page!==4&&focused)this.triggerEvent();
  }
  triggerEvent(){const s=this.s;if(s.pendingEvent||s.page===4)return false;const id=s.eventCursor%20;s.eventCursor++;s.pendingEvent={id,reward:Math.max(80,this.b.prices[s.zone]*30+this.rate()*3)};return true;}
  chooseEvent(join){const s=this.s,p=s.pendingEvent;if(!p)return false;
    if(join){s.eventBits|=bit(p.id);const effect=this.e.EFFECT[p.id];if(effect===1)s.saleUntil=this.clock()+60000;if(effect===2)s.pickUntil=this.clock()+60000;if(effect===3)s.bizUntil=this.clock()+60000;if(effect===4)s.reputation+=3;this.earn(p.reward);this.note=`${this.e.EVENTS[p.id]}に参加！ ＋${yen(p.reward)}`;}
    else {this.earn(p.reward/4);this.note='ひと息ついて、また歩こう。';}
    s.pendingEvent=null;this.checkEnd();return true;
  }
  pick(i){const s=this.s;if(!Number.isInteger(i)||i<0||i>=20||s.pendingEvent||s.page===4)return false;
    if(s.bag>=this.maxBag())return this.msg('袋がいっぱい！売却しよう。');
    const amount=Math.min(this.maxBag()-s.bag,(s.tool+1)*s.cans[i]*(s.pickUntil>this.clock()?2:1));s.bag+=amount;s.picked+=amount;s.cans[i]=spawn(this.rng);s.taps++;
    let treasure=false;
    if(Math.floor(this.rng()*100)<15){const id=s.zone*4+Math.floor(this.rng()*4);treasure=true;if(!(s.itemBits&bit(id))){s.itemBits|=bit(id);this.note=`発見！ ${this.e.ITEMS[id]}`;}}
    if(s.taps%25===0)this.triggerEvent();else if(!treasure)this.note=`缶を${amount}個拾った！`;
    this.tone='pick';return true;
  }
  sell(){const s=this.s;if(s.pendingEvent||s.page===4)return false;if(!s.bag)return this.msg('まず缶を拾おう！');const value=this.value();s.sold+=s.bag;this.earn(value);s.bag=0;this.note=`売却！ ＋${yen(value)}`;this.tone='yes';this.checkEnd();return true;}
  cost(type){const s=this.s;return {tool:80*2.3**s.tool,capacity:100*2**s.capacity,cart:200*2.5**s.cart,homes:300*12**s.homes,business:this.b.costs[s.business]}[type];}
  buy(type){const s=this.s,max={tool:15,capacity:20,cart:15,homes:4,business:6}[type];if(max===undefined||s.pendingEvent||s.page===4)return false;if(s[type]>=max)return this.msg('最高レベルです。');const cost=this.cost(type);if(s.cash<cost){this.tone='no';return this.msg('資金が足りません。缶を売って貯めよう！');}s.cash-=cost;s[type]++;this.note={tool:'一度に拾える缶が増えた！',capacity:'袋が大きくなった！',cart:'売却ボーナスが増えた！',homes:'新しい住まいで暮らしを整えよう！',business:`事業開始！ 毎秒 ${yen(this.rate())}`}[type];this.tone='yes';return true;}
  move(i){const s=this.s;if(!Number.isInteger(i)||i<0||i>4||s.pendingEvent)return false;if(s.total<this.b.unlock[i])return this.msg(`累計収入 ${yen(this.b.unlock[i])}で解放！`);if(s.bag>0)return this.msg('持っている缶を売ってから移動しよう');s.zone=i;s.page=0;this.note=`${this.b.areas[i]}にやって来た！`;return true;}
  meet(i){const s=this.s;if(!Number.isInteger(i)||Math.floor(i/4)!==s.zone||s.pendingEvent)return false;const first=!(s.peopleBits&bit(i));if(first){s.peopleBits|=bit(i);s.talks++;s.reputation++;this.earn(this.b.prices[s.zone]*10);this.checkEnd();}return first;}
  accept(i){const s=this.s;if(!Number.isInteger(i)||i<0||i>=20||Math.floor(i/4)!==s.zone||!(s.peopleBits&bit(i)))return false;if(s.questBits&bit(i))return this.msg('この依頼は完了しています。');if(s.activeQuest>=0)return this.msg('今の依頼を完了するか中止しよう。');s.activeQuest=i;s.questStart=this.metric(this.e.QTYPE[i]);this.note=`依頼を受けた：${this.e.QUESTS[i]}`;return true;}
  report(){const s=this.s,i=s.activeQuest;if(i<0)return false;if(this.progress(i)<this.e.NEED[i])return this.msg('まだ目標に届いていません。');s.questBits|=bit(i);s.activeQuest=-1;this.earn(this.questReward(i));s.reputation+=2;this.note=`依頼達成！ ${this.e.QUESTS[i]}`;this.checkEnd();return true;}
  cancelQuest(){if(this.s.activeQuest<0)return false;this.s.activeQuest=-1;this.note='依頼を中止しました。再受注できます。';return true;}
  claim(i){const s=this.s;if(!Number.isInteger(i)||i<0||i>=20)return false;if(s.achievementBits&bit(i))return this.msg('報酬は受取済みです。');if(this.achMetric(this.e.ATYPE[i])<this.e.ANEED[i])return this.msg(`${['拾った缶','売った缶','累計収入','評判','収集品'][this.e.ATYPE[i]]}：目標 ${this.e.ANEED[i]}`);s.achievementBits|=bit(i);const reward=this.achievementReward(i);this.earn(reward);this.note=`実績達成！ ＋${yen(reward)}`;this.checkEnd();return true;}
  reset(){const sound=this.s.sound;this.s=fresh(this.rng);this.s.sound=sound;this.note='新しい物語を始めよう！';}
}
function yen(n){return n>=1e8?(n/1e8).toFixed(2)+'億円':n>=1e4?(n/1e4).toFixed(1)+'万円':Math.trunc(n).toLocaleString('ja-JP')+'円';}
class SaveStore {
  constructor(storage,writer){this.storage=storage;this.writer=writer;this.raw=null;this.revision=0;this.error=null;}
  load(){try{this.raw=this.storage.getItem(KEY);if(this.raw===null)return null;const env=decode(this.raw);this.revision=env.revision;return env.state;}catch(e){this.error='保存データを読み込めません。元の保存は上書きしていません。';throw e;}}
  save(state){
    if(this.error)throw Error(this.error);
    try {
      if(this.storage.getItem(KEY)!==this.raw)throw Error('別のタブで保存が変わりました。このタブから上書きしません。');
      const payload=JSON.stringify({format:FORMAT,version:VERSION,revision:this.revision+1,writer:this.writer,state:validateState(state)});
      this.storage.setItem(KEY,payload);
      if(this.storage.getItem(KEY)!==payload)throw Error('保存の競合を検出しました。');
      this.raw=payload;this.revision++;return payload;
    }catch(e){this.error=e.message||'保存できません。';throw e;}
  }
  changed(){try{return this.storage.getItem(KEY)!==this.raw;}catch{return true;}}
}
root.CrownCore={Game,SaveStore,validateData,validateState,decode,fresh,yen,count,clone,KEY,FORMAT,VERSION};
})(globalThis);
