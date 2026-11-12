let registrationBusy=false,registrationLeaving=false,registrationExpanded=false,registrationPainted=false;
function validPlayerHandle(handle){return typeof handle==='string'&&/^[A-Za-z0-9_.]{3,30}$/.test(handle)&&!/^jp_\d{9}$/i.test(handle)}
function validPlayerGender(gender){return ['female','male','other'].includes(gender)}
function hasPlayerIcon(profile){return !!profile&&(Number.isInteger(profile.preset)&&!!iconSpec(profile.preset)||typeof profile.icon==='string'&&/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(profile.icon))}
function accountRegistered(){return state.registered===true&&!state.withdrawn}
function initialDraft(){let p=state.profile||{};return {name:p.name&&p.name!=='あなた'?p.name:'',handle:p.handle&&p.handle!=='my_bloom'?p.handle:'',gender:validPlayerGender(p.gender)?p.gender:'',preset:Number.isInteger(p.preset)&&iconSpec(p.preset)?p.preset:null,icon:typeof p.icon==='string'&&/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(p.icon)?p.icon:null}}
let registrationDraft=initialDraft();
const registrationRoot=document.createElement('section');registrationRoot.id='registration-screen';document.body.append(registrationRoot);
function registerIconPreview(){let box=document.getElementById('register-icon-preview');if(!box)return;box.innerHTML=Number.isInteger(registrationDraft.preset)?iconHTML(registrationDraft.preset):registrationDraft.icon?'<img src="'+registrationDraft.icon+'" alt="選んだアイコン" style="width:72px;height:72px;object-fit:cover;border-radius:50%">':'<span class="muted">画像を選ぼう</span>'}
function registerIconGrid(){let grid=document.getElementById('register-icon-grid');if(!grid)return;let indexes=registrationExpanded?Array.from({length:144},(_,i)=>i):[16,20,35,47,55,61,69,74,80,85,94,112];grid.innerHTML=indexes.map(i=>'<button type="button" style="padding:5px;border:'+ (registrationDraft.preset===i?'2px solid #46715a':'1px solid #e0e6db')+'" onclick="chooseRegisterIcon('+i+')" aria-label="'+iconSpec(i).title+'">'+iconHTML(i)+'</button>').join('');let button=document.getElementById('expand-register-icons');if(button)button.textContent=registrationExpanded?'少なく表示':'144種類すべてから選ぶ'}
function chooseRegisterIcon(index){if(!iconSpec(index))return;registrationDraft.preset=index;registrationDraft.icon=null;let file=document.getElementById('register-image');if(file)file.value='';registerIconPreview();registerIconGrid()}
async function previewRegisterImage(file){InstantStorage.bump();const webTicket=InstantStorage.ticket,webDraft=registrationDraft;if(!file)return;if(file.size>10*1024*1024){toast('10MB以下の画像を選んでください');return}try{let icon=await imageData(file);InstantStorage.check(webTicket);if(registrationDraft!==webDraft)return;registrationDraft.icon=icon;registrationDraft.preset=null;registerIconPreview();registerIconGrid()}catch{toast('画像を読み込めませんでした')}}
function registrationHTML(){return '<div class="registration-card"><div class="row"><img src="assets/app-icon/bloom-192.png" width="58" height="58" alt="Instant" style="border-radius:15px"><div><div class="muted">YOUR LITTLE SOCIAL WORLD</div><h1>Instantへようこそ</h1></div></div><p>あなたのアカウントを登録して、投稿と交流を始めよう。</p><label>アカウント名<input id="register-name" maxlength="30" value="'+esc(registrationDraft.name)+'" placeholder="例：咲華" autocomplete="nickname"></label><label>ID名<input id="register-handle" maxlength="30" value="'+esc(registrationDraft.handle)+'" placeholder="例：sakihana_instant" autocomplete="username"></label><p class="muted">英数字・_・. の3〜30文字。jp_ と9桁の番号の組み合わせはCPU専用です。</p><label>アイコン画像</label><div id="register-icon-preview" class="register-preview"></div><input id="register-image" type="file" accept="image/*" onchange="previewRegisterImage(this.files[0])"><p class="muted">画像をアップロードするか、用意したアイコンから選んでね。</p><div id="register-icon-grid"></div><button type="button" id="expand-register-icons" onclick="registrationExpanded=!registrationExpanded;registerIconGrid()">144種類すべてから選ぶ</button><label>性別<select id="register-gender" onchange="document.getElementById(\'register-difficulty\').innerHTML=registrationDifficultyText(this.value)"><option value="">選択してください</option>'+[['female','女性（やさしい）'],['male','男性（むずかしい）'],['other','その他・回答しない（標準）']].map(([id,label])=>'<option value="'+id+'" '+(registrationDraft.gender===id?'selected':'')+'>'+label+'</option>').join('')+'</select></label><div id="register-difficulty" class="notice">'+registrationDifficultyText(registrationDraft.gender)+'</div><button id="register-submit" class="primary" style="width:100%;margin-top:16px" onclick="registerAccount()">登録して投稿リストへ</button><p class="muted">架空SNSのゲーム内登録です。記録はこのブラウザに保存します。</p></div>'}
function registrationDifficultyText(g){if(!validPlayerGender(g))return '性別を選ぶとゲーム難易度が決まります。';return genderLabel(g)+'：'+difficultyRule(g).label+'。ジャンル・投稿内容の好みが優先され、性別に関係なく交流できます。'}
function drawRegistration(){document.body.classList.remove('account-ready');registrationRoot.hidden=false;if(registrationLeaving){registrationRoot.innerHTML='<div class="registration-card"><h1>退会処理中です</h1><p>記録をリセットしています…</p></div>';registrationPainted=false;return}if(registrationPainted)return;registrationRoot.innerHTML=registrationHTML();registrationPainted=true;registerIconPreview();registerIconGrid()}
async function registerAccount(){const webTicket=InstantStorage.ticket,webOwner=state;
 if(registrationBusy||registrationLeaving||authWorking)return;
 let name=authRead('register-name').trim(),handle=authRead('register-handle').trim(),gender=authRead('register-gender'),file=document.getElementById('register-image')?.files[0];
 let status=document.getElementById('register-status');
 function notice(message){if(status)status.textContent=message;toast(message)}
 if(!name||name.length>30){notice('アカウント名を1〜30文字で入力してください');return}
 let loginId=typeof localRegistrationID==='function'?localRegistrationID():null;
 if(!validPlayerHandle(handle)&&handle!==loginId){notice('IDの形式をご確認ください');return}
 if(loginId&&!validLoginID(loginId)){notice('タイトルに戻ってIDを発行し直してください');return}
 if(!validPlayerGender(gender)){notice('性別を選択してください');return}
 if(!file&&!Number.isInteger(registrationDraft.preset)&&!registrationDraft.icon){notice('アイコン画像を選んでください');return}
 if(file&&file.size>10*1024*1024){notice('10MB以下の画像を選んでください');return}
 let password=authRead('register-password'),confirmation=authRead('register-confirm');
 if(loginId&&(password.length<12||password.length>128)){notice('パスワードを12〜128文字で入力してください');return}
 if(loginId&&password!==confirmation){notice('確認用パスワードが一致していません');return}
 let form=document.getElementById('register-form'),passwordSaved=false,committed=false;
 let before={profile:state.profile,registered:state.registered,withdrawn:state.withdrawn,loginId:state.loginId,rememberLogin:state.rememberLogin};
 registrationBusy=true;
 for(let field of (form||registrationRoot).querySelectorAll('input,button,select'))field.disabled=true;
 if(status)status.textContent='アカウントを登録しています…';
 try{
  let icon=file?await imageData(file):registrationDraft.icon||'🌷',preset=file?undefined:registrationDraft.preset??undefined;
  InstantStorage.check(webTicket);if(state!==webOwner)throw Error('アカウントが変わりました');
  if(loginId){await enrollPassword(loginId,password,confirmation);passwordSaved=true;state.loginId=loginId}
  state.profile={name,handle,gender,icon,preset};state.registered=true;state.withdrawn=false;
  state.rememberLogin=document.getElementById('register-remember')?.checked!==false;
  if(!save()){Object.assign(state,before);throw Error('登録を保存できませんでした。端末の空き容量をご確認ください。')}
  committed=true;view='feed';registrationPainted=false;document.body.classList.add('account-ready');registrationRoot.hidden=true;
  render();if(!liveBootstrapped)bootstrapLive();toast('登録しました。IDはプロフィールから確認できます。');
 }catch(error){
  if(!committed&&state===webOwner)Object.assign(state,before);
  notice(error.message||'登録できませんでした。もう一度お試しください。');
 }finally{
  password='';confirmation='';
  if(passwordSaved&&!committed){try{InstantStorage.local.removeItem(passwordKey(loginId))}catch{}}
  for(let field of (form||registrationRoot).querySelectorAll('input,button,select'))field.disabled=false;
  for(let field of (form||registrationRoot).querySelectorAll('input[autocomplete="new-password"]'))field.value='';
  registrationBusy=false;
 }
}
function genderFollowMultiplier(p,cpu){let player=p.playerGender,c=cpuInfo(cpu);return (player==='female'&&c?.gender==='male')||(player==='male'&&c?.gender==='female')?1.25:1}
const registrationProfile=profileHTML;profileHTML=function(id){let c=cpuInfo(id);if(!c)return registrationProfile(id);return registrationProfile(id).replace('<p>'+topics[c.topic]+'が好き。','<p><span class="pill">'+genderLabel(c.gender)+'</span></p><p>'+topics[c.topic]+'が好き。')};
const registrationPublish=publish;publish=async function(){if(!accountRegistered()){drawRegistration();return}return registrationPublish()};
const registrationBootstrap=bootstrapLive;bootstrapLive=async function(){if(!accountRegistered())return;return registrationBootstrap()};
const registrationLiveTick=liveTick;liveTick=async function(){if(!accountRegistered())return;return registrationLiveTick()};
const registrationRender=render;render=function(){if(registrationLeaving||!accountRegistered()){drawRegistration();return}document.body.classList.add('account-ready');registrationRoot.hidden=true;registrationPainted=false;registrationRender()};
function resetToRegistration(){state={posts:[],followers:[],following:[],liked:[],notices:[],created:Date.now(),registered:false};save();liveCache=[];liveBootstrapped=false;liveReady=false;liveProfileArchive=new Map();loadedProfiles=new Set();activeThread=null;registrationDraft={name:'',handle:'',gender:'',preset:null,icon:null};registrationExpanded=false;registrationPainted=false;view='feed'}
const registrationLeave=leaveAccount;leaveAccount=async function(){if(registrationLeaving)return;registrationLeaving=true;try{await registrationLeave();if(state.withdrawn)resetToRegistration()}finally{registrationLeaving=false;registrationPainted=false;render()}};
const registrationFresh=startFresh;startFresh=function(){resetToRegistration();render()};
const registrationReset=resetGame;resetGame=function(){let old=state;registrationReset();if(state!==old){resetToRegistration();render()}};
// Migrate fully configured prior accounts without deleting their existing work.
if(state.registered===undefined&&!state.withdrawn&&state.profile?.name&&state.profile.name!=='あなた'&&validPlayerHandle(state.profile.handle)&&validPlayerGender(state.profile.gender)&&hasPlayerIcon(state.profile)){state.registered=true;save()}
if(state.withdrawn)resetToRegistration();
const registrationStyle=document.createElement('style');registrationStyle.textContent='#registration-screen{position:fixed;inset:0;overflow:auto;z-index:30;background:radial-gradient(circle at 20% 0%,#f6e4ed,transparent 48%),#f7f8f3;padding:28px 16px}#registration-screen[hidden]{display:none}.registration-card{max-width:590px;margin:10px auto 40px;background:#fff;border:1px solid #e0e6db;border-radius:24px;padding:28px;box-shadow:0 15px 70px #354c3210}.registration-card h1{font-size:27px}.registration-card label{font-weight:600}.register-preview{height:80px;display:flex;align-items:center;margin:8px 0}.register-preview .cpu-portrait{width:72px;height:72px;min-width:72px}#register-icon-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:8px;max-height:300px;overflow:auto;margin:12px 0}#register-icon-grid .cpu-portrait{width:44px;height:44px;min-width:44px}@media(max-width:500px){.registration-card{padding:22px 18px}#register-icon-grid{grid-template-columns:repeat(4,1fr)}}';document.head.append(registrationStyle);
render();if(accountRegistered()&&!liveBootstrapped)bootstrapLive();
