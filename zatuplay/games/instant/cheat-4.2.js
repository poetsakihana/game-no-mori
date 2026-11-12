// Ten real minutes per activation; persisted checkpoints prevent duplicate rewards.
const CHEAT_MINUTE=60000,CHEAT_DURATION=10*CHEAT_MINUTE;
function cheatActive(now=Date.now()){let c=state.cheatBoost;return !!c&&Number.isFinite(c.start)&&c.end===c.start+CHEAT_DURATION&&now<c.end&&!c.settled}
function cheatSettingsHTML(){let active=cheatActive();return '<div class="card pad"><h2>裏ワザ</h2><p>発動から10分間、各投稿に1分ごと＋1,000いいね。フォロワーも1分ごと＋1,000人！</p><p class="muted">発動前の投稿と発動中の新しい投稿が対象です。新しい投稿は投稿から1分後に最初の加算。フォロワーの加算はアカウント全体で毎分1回です。増えた数は終了後も残ります。</p><button id="cheat-command" class="primary" onclick="activateCheat()" '+(active?'disabled':'')+'>裏ワザ'+(active?' 発動中':'')+'</button><p id="cheat-countdown" role="status" aria-live="off">'+cheatStatus()+'</p><p class="muted">連打による重複・延長はありません。10分後に再発動できます。アプリを閉じても時間は進み、再ログイン時に終了時点までの分を反映します。</p></div>'}
function cheatStatus(now=Date.now()){let c=state.cheatBoost;if(!c)return '効果時間：10分間';if(!cheatActive(now))return '効果終了。増えたいいね・フォロワーは保存されています。';let seconds=Math.ceil((c.end-now)/1000);return '残り '+Math.floor(seconds/60)+'分'+String(seconds%60).padStart(2,'0')+'秒 · 次のフォロワー加算まで '+Math.max(1,Math.ceil((c.start+((c.followSteps||0)+1)*CHEAT_MINUTE-now)/1000))+'秒'}
function activateCheat(){if(!accountRegistered()||busy||authWorking)return false;cheatTick();if(cheatActive()){toast('裏ワザは発動中です。時間の延長はありません');return false}let old=state.cheatBoost,now=Date.now();state.cheatBoost={start:now,end:now+CHEAT_DURATION,followSteps:0,settled:false};if(!save()){state.cheatBoost=old;return false}render();toast('裏ワザ発動！10分間の爆速モードです');return true}
let cheatUpdating=false;
function cheatTick(now=Date.now()){
 if(cheatUpdating||!accountRegistered())return false;
 let c=state.cheatBoost;if(!c||c.settled||!Number.isFinite(c.start)||c.end!==c.start+CHEAT_DURATION||now<c.start)return false;
 let until=Math.min(now,c.end),steps=Math.min(10,Math.floor((until-c.start)/CHEAT_MINUTE));
 if(now<c.end&&steps<=(c.followSteps||0)&&!state.posts.some(p=>{if(p.cpu!==undefined||!Number.isFinite(p.time)||p.time>=c.end)return false;let stop=p.type==='story'&&Number.isFinite(p.expires)?Math.min(until,p.expires):until;return Math.max(0,Math.floor((stop-Math.max(c.start,p.time))/CHEAT_MINUTE))>(p.cheatBoost?.start===c.start?p.cheatBoost.steps:0)}))return false;
 let old=JSON.stringify(state);cheatUpdating=true;
 try{
  let changed=false,add=Math.max(0,steps-(c.followSteps||0));
  if(add){let room=Math.max(0,POPULATION-followers());state.worldFollowers=(state.worldFollowers||0)+Math.min(room,add*1000);c.followSteps=steps;changed=true}
  for(let p of state.posts){
   if(p.cpu!==undefined||!Number.isFinite(p.time)||p.time>=c.end)continue;
   let base=Math.max(c.start,p.time),stop=p.type==='story'&&Number.isFinite(p.expires)?Math.min(until,p.expires):until;
   let due=Math.max(0,Math.min(10,Math.floor((stop-base)/CHEAT_MINUTE))),done=p.cheatBoost?.start===c.start?p.cheatBoost.steps:0,delta=Math.max(0,due-done);
   if(!delta)continue;
   let room=Math.max(0,POPULATION-likesTotal(p));p.worldLikes=(p.worldLikes||0)+Math.min(room,delta*1000);p.cheatBoost={start:c.start,steps:due};changed=true;
  }
  if(now>=c.end){c.settled=true;state.notices.unshift({type:'cheat',time:c.end,text:'裏ワザの10分間が終了しました。加算したいいね・フォロワーは残ります。'});state.notices=state.notices.slice(0,1000);changed=true}
  if(changed&&!save()){state=JSON.parse(old);return false}return changed;
 }finally{cheatUpdating=false}
}
const cheatAccountHTML=accountHTML;accountHTML=function(){return cheatSettingsHTML()+cheatAccountHTML()};
const cheatExtraHTML=extraOptionsHTML;extraOptionsHTML=function(){return cheatSettingsHTML()+cheatExtraHTML()};
const cheatRender=render;render=function(){cheatTick();cheatRender()};
InstantStorage.interval(()=>{if(!accountRegistered())return;let changed=cheatTick();if(changed)render();let el=document.getElementById('cheat-countdown');if(el)el.textContent=cheatStatus()},1000);
INSTANT_CHANGELOG.unshift({version:'4.2',date:'2026-10-18',items:['設定画面に「裏ワザ」コマンド','10分間、毎分各投稿＋1,000いいね・アカウント＋1,000フォロワー','残り時間表示、連打防止、再ログイン時の経過分反映']});
render();
