// The story uses the same account save and posting flow as the rest of Instant.
const storyChapters=[
 {title:'消える夜の一枚',scene:'閉館まであと七日。港町の「余白書店」に、一枚だけ無記名の写真が残された。美桜は、その写真を最後の展示に飾りたいと言う。蒼は、持ち主が戻ってくるまで待とうと言った。',choices:[
  ['まず美桜に、展示したい理由を聞く','listen','「消えた場所にも、ここにいた証が欲しいんだ」'],
  ['写真に写った窓から、撮影場所を探す','trace','窓の角に、閉店した花屋の看板が映っていた。']]},
 {title:'届かなかった宛先',scene:'花屋の跡地を訪ねると、店先に「返事は書店の窓辺へ」と書かれた栞が落ちていた。誰かに届く言葉を、Instantに残してみよう。',post:true,choices:[
  ['持ち主が読めるよう、そっと言葉を置く','listen','投稿を見た誰かが「窓辺、まだ残ってるよ」と教えてくれた。'],
  ['栞の手掛かりを整理して、町の記憶を募る','trace','同じ栞を持つ人たちから、古い写真が集まり始めた。']]},
 {title:'名前を伏せた手紙',scene:'店主が写真の持ち主だった。写っている花屋は、離れて暮らす姉の店。写真を残してほしい気持ちと、姉のことを公にしたくない気持ちの両方があった。',choices:[
  ['店主と二人で、残してもよい言葉を選ぶ','listen','「その一行だけなら、私の名前で残せる」と店主は言った。'],
  ['個人が分からない形で、町の変化を記録する','trace','昔と今の景色を並べる展示案に、店主もうなずいた。']]},
 {title:'拍手が消えたあと',scene:'展示案を楽しみにする声の一方で、「思い出を利用している」との反応も届く。美桜が投稿を消そうとする夜、あなたはどう返す？',post:true,choices:[
  ['二人の気持ちを確かめ、展示への思いを自分の言葉で書く','listen','美桜は、自分の言葉で店主に返事を書くと決めた。'],
  ['掲載の許可や展示の経緯を、分かる範囲で伝える','trace','誤解していた一人が、出典を添えた写真を送ってくれた。']]},
 {title:'それぞれの余白',scene:'閉館前日。写真の隣には、言葉を集めたノートと、町の変化を記した地図がある。残った壁は、あと一面だけ。',choices:[
  ['来場者が返事を書ける席をつくる','listen','空白だったノートの最初の一行を、店主が書いた。'],
  ['誰でも町を歩き直せる地図を仕上げる','trace','蒼は地図に、今でも花の匂いがする路地を加えた。']]},
 {title:'最後の灯り',scene:'閉館のベルが鳴る。窓の向こうには、店主の姉らしい人影。最後の投稿で、今日の展示をどんな言葉で締めくくる？',post:true,choices:[
  ['一人ひとりに宛てるように、ありがとうを残す','listen','店主はベルを鳴らし終えると、窓辺に二人分の椅子を出した。'],
  ['次にこの場所を探す人へ、記録の入り口を残す','trace','姉は地図を一枚手に取り、店主と並んで昔の路地へ歩き出した。']]}
];
const storyEndings={
 listen:['返事の届く窓辺','閉館後も、窓辺には言葉を預ける小箱が残った。あなたの投稿を読んだ人が、返事を書くためにここを訪ねてくる。'],
 trace:['灯りをたどる地図','地図は商店街に引き継がれ、写真の場所をたどる小さな散歩会が始まった。消えた店の話を、初めて聞く人たちが歩いている。'],
 balance:['余白のある展覧会','窓辺の返事と町の地図は、一冊の冊子にまとまった。最後のページだけは白紙。これから町を歩く人の言葉を書く場所だ。']
};
function storyProgress(){
 let saved=state.storySeason;
 if(saved?.version===1&&typeof saved.run==='string'&&Array.isArray(saved.entries)&&Array.isArray(saved.endings)&&saved.entries.length<=storyChapters.length)return saved;
 return {version:1,run:'',entries:[],endings:[]};
}
function storyEnding(entries){
 let count=entries.filter(entry=>entry.path==='listen').length;
 return count===3?'balance':count>3?'listen':'trace';
}
function storyPostEvidence(progress){
 return state.posts.find(post=>post.storySeason?.run===progress.run&&post.storySeason.chapter===progress.entries.length);
}
function storyTagPost(post){
 if(state.playMode!=='story')return;
 let progress=storyProgress(),chapter=storyChapters[progress.entries.length];
 if(progress.run&&chapter?.post)post.storySeason={run:progress.run,chapter:progress.entries.length};
}
function storyCommit(next){
 let previous=state.storySeason;
 state.storySeason=next;
 if(save())return true;
 if(previous===undefined)delete state.storySeason;
 else state.storySeason=previous;
 return false;
}
function storyStart(){
 if(!accountRegistered()||state.playMode!=='story'||busy)return;
 let progress=storyProgress();
 if(progress.run&&progress.entries.length<storyChapters.length)return;
 if(storyCommit({...progress,run:freshLoginID(),entries:[]}))storyDraw();
}
function storyChoose(chapterIndex,option){
 if(!accountRegistered()||state.playMode!=='story'||busy)return;
 let progress=storyProgress(),chapter=storyChapters[chapterIndex],choice=chapter?.choices[option];
 if(!progress.run||chapterIndex!==progress.entries.length||!choice)return;
 let post=chapter.post?storyPostEvidence(progress):null;
 if(chapter.post&&!post){toast('この章の投稿を保存してから、返事を選んでください');return}
 let entries=[...progress.entries,{path:choice[1],reply:choice[2],label:choice[0],...(post?{postId:post.id}:{})}];
 let endings=entries.length===storyChapters.length?[...new Set([...progress.endings,storyEnding(entries)])]:progress.endings;
 if(storyCommit({...progress,entries,endings})){storyDraw();render()}
}
const storyDialog=document.createElement('dialog');
storyDialog.id='instant-story';
storyDialog.setAttribute('aria-labelledby','story-title');
document.body.append(storyDialog);
function storyOpen(){
 if(!accountRegistered()||state.playMode!=='story')return;
 storyDraw();
 if(!storyDialog.open)storyDialog.showModal();
}
function storyCompose(){
 if(!accountRegistered()||state.playMode!=='story'||busy)return;
 storyDialog.close();
 openMainCommand('compose');
}
function storyDraw(){
 let progress=storyProgress(),index=progress.entries.length,chapter=storyChapters[index],body;
 if(!progress.run){
  body='<h3>閉館まで、あと七日。</h3><p>一枚の写真から始まる、全6章の物語。選んだ言葉が、港町に残るものを変えます。</p><button class="primary" onclick="storyStart()">第1章を始める</button>';
 }else if(!chapter){
  let ending=storyEndings[storyEnding(progress.entries)];
  body='<span class="pill">エンディング</span><h3>'+ending[0]+'</h3><p>'+ending[1]+'</p><button onclick="storyStart()">別の選択で第1章から</button>';
 }else{
  let ready=!chapter.post||!!storyPostEvidence(progress);
  body='<span class="pill">第'+(index+1)+'章 / '+storyChapters.length+'</span><h3>'+chapter.title+'</h3><p>'+chapter.scene+'</p>';
  if(index>0)body+='<p class="story-status"><b>前章のあと</b><br>'+esc(progress.entries[index-1].reply)+'</p>';
  if(chapter.post)body+=ready?'<p class="story-status">✓ この章の投稿を保存済み</p>':'<p class="story-status">この章で新しい投稿を1件保存すると、次の選択ができます。ジャンルや形式は自由です。</p><button class="primary" onclick="storyCompose()">投稿を書く</button>';
  body+='<div class="story-choices">'+chapter.choices.map((choice,option)=>'<button '+(ready?'':'disabled ')+'onclick="storyChoose('+index+','+option+')">'+choice[0]+'</button>').join('')+'</div>';
 }
 let journal=progress.entries.map((entry,i)=>'<li><b>'+storyChapters[i].title+'</b><p>'+esc(entry.label)+'</p><p>'+esc(entry.reply)+'</p></li>').join('');
 let collection=Object.entries(storyEndings).map(([key,ending])=>'<li>'+(progress.endings.includes(key)?ending[0]:'未発見')+'</li>').join('');
 storyDialog.innerHTML='<div class="story-paper"><div class="story-top"><h2 id="story-title">余白書店の最後の七日</h2><button type="button" onclick="storyDialog.close()">閉じる</button></div>'+body+(journal?'<details><summary>これまでの選択</summary><ol>'+journal+'</ol></details>':'')+'<details><summary>エンディング図鑑 '+progress.endings.length+' / 3</summary><ul>'+collection+'</ul></details></div>';
}
function storyCard(){
 let progress=storyProgress(),done=progress.entries.length;
 let status=!progress.run?'全6章・エンディング3種':done===storyChapters.length?'読了 · エンディング図鑑 '+progress.endings.length+' / 3':'第'+(done+1)+'章 · '+storyChapters[done].title;
 return '<section id="story-entry" class="card pad"><div><span class="pill">ストーリー</span><h2>余白書店の最後の七日</h2><p>'+status+'</p></div><button class="primary" onclick="storyOpen()">'+(progress.run?'物語を開く':'物語を始める')+'</button></section>';
}
let playModeChoosing=false,playModeAccount=null;
function currentPlayMode(){return ['social','story'].includes(state.playMode)?state.playMode:''}
const playModeScreen=document.createElement('section');
playModeScreen.id='play-mode-screen';
playModeScreen.hidden=true;
playModeScreen.setAttribute('aria-labelledby','play-mode-title');
document.body.append(playModeScreen);
const playModeBar=document.createElement('div');
playModeBar.id='play-mode-bar';
playModeBar.hidden=true;
document.getElementById('content').before(playModeBar);
function playModeSelectionHTML(){
 let current=currentPlayMode();
 return '<div class="play-mode-card"><p class="muted">INSTANT · '+esc(state.profile?.name||'あなた')+'</p><h1 id="play-mode-title" tabindex="-1">遊び方を選ぼう</h1><p>今日は、どんな時間を過ごしますか？</p><div class="play-mode-options">'+
  '<button type="button" onclick="choosePlayMode(\'social\')" aria-pressed="'+(current==='social')+'"><span class="mode-symbol" aria-hidden="true">✎</span><strong>投稿型</strong><span>自由に投稿して、CPUとの交流やフォロワーの成長を楽しむ。</span><b>投稿型で遊ぶ →</b></button>'+
  '<button type="button" onclick="choosePlayMode(\'story\')" aria-pressed="'+(current==='story')+'"><span class="mode-symbol" aria-hidden="true">✧</span><strong>物語型</strong><span>全6章の物語を、投稿と選択で進める。結末は3種類。</span><b>物語型で遊ぶ →</b></button></div>'+
  '<p class="muted">選択はこのアカウントに保存します。投稿と物語の進行を引き継いで、いつでも切り替えられます。</p>'+
  (current?'<button type="button" onclick="cancelPlayModeSelection()">今のモードに戻る</button>':'')+
  '<button type="button" onclick="authLogout()">ログアウト</button></div>';
}
function openPlayModeSelection(){
 if(!accountRegistered())return;
 if(busy||composer.open){toast('投稿画面を閉じてからモードを変更してください');return}
 storyDialog.close();
 playModeChoosing=true;
 render();
}
function cancelPlayModeSelection(){
 if(!currentPlayMode())return;
 playModeChoosing=false;
 render();
 document.getElementById('play-mode-change')?.focus();
}
function choosePlayMode(mode){
 if(!accountRegistered()||busy||composer.open||!['social','story'].includes(mode))return;
 let previous=state.playMode;
 state.playMode=mode;
 if(!save()){
  if(previous===undefined)delete state.playMode;
  else state.playMode=previous;
  return;
 }
 playModeChoosing=false;
 storyDialog.close();
 view='feed';
 render();
 window.scrollTo({top:0});
 let heading=document.getElementById('heading');
 heading.setAttribute('tabindex','-1');
 heading.focus();
}
function storyHomeHTML(){
 let progress=storyProgress(),last=progress.entries[progress.entries.length-1];
 return '<div class="welcome"><span class="pill">物語型</span><h2>あなたの言葉で、続きを。</h2><p>投稿と選択で進む、港町の小さな物語。</p></div>'+storyCard()+
  (last?'<section class="card pad"><h3>前回の選択</h3><p>'+esc(last.label)+'</p><p>'+esc(last.reply)+'</p></section>':'')+
  '<section class="card pad"><h3>物語の進め方</h3><p>物語を開き、返事を選んで進めましょう。第2・4・6章は、物語型で新しい投稿を保存すると次の選択が開きます。</p><p>投稿後は「物語を開く」から続きへ。読了後は別の選択でもう一度遊べます。</p><p>発見した結末 '+progress.endings.length+' / 3</p></section>';
}
const storyRender=render;
render=function(){
 storyRender();
 if(!accountRegistered()){
  document.querySelector('main').inert=false;
  playModeScreen.hidden=true;
  playModeBar.hidden=true;
  playModeChoosing=false;
  playModeAccount=null;
  return;
 }
 if(playModeAccount!==KEY){playModeAccount=KEY;playModeChoosing=false}
 let mode=currentPlayMode(),selecting=playModeChoosing||!mode;
 document.querySelector('main').inert=selecting;
 let entering=playModeScreen.hidden;
 playModeScreen.hidden=!selecting;
 playModeBar.hidden=selecting;
 if(selecting){
  bottomCommands.hidden=true;
  let html=playModeSelectionHTML();
  if(playModeScreen.innerHTML!==html)playModeScreen.innerHTML=html;
  if(entering)document.getElementById('play-mode-title')?.focus();
  return;
 }
 let bar='<span>遊び方 <b>'+(mode==='story'?'物語型':'投稿型')+'</b></span><button id="play-mode-change" type="button" onclick="openPlayModeSelection()">モード変更</button>';
 if(playModeBar.innerHTML!==bar)playModeBar.innerHTML=bar;
 if(mode!=='story')return;
 let content=document.getElementById('content');
 if(view==='feed'){
  document.getElementById('heading').textContent='物語のホーム';
  content.innerHTML=storyHomeHTML();
 }else if(['profile','ownpost'].includes(view)&&!content.querySelector('#story-entry')){
  content.insertAdjacentHTML('afterbegin',storyCard());
 }
};
const storyStyles=document.createElement('style');
storyStyles.textContent='#story-entry{display:flex;align-items:center;justify-content:space-between;gap:14px;margin:0 0 16px;color:#273b34;background:linear-gradient(120deg,#edf4e8,#f8ece7)}#story-entry h2{font-size:clamp(17px,4vw,24px);margin:6px 0}#story-entry p{margin:0}#story-entry button{flex-shrink:0}#instant-story{width:min(580px,calc(100% - 24px));max-height:88vh;overflow:auto;border:1px solid #d4ded3;border-radius:22px;padding:0;background:#fffdf8;color:#24372e}#instant-story::backdrop{background:#182c25b8}.story-paper{padding:clamp(16px,5vw,30px)}.story-top{display:flex;justify-content:space-between;align-items:center;gap:12px;border-bottom:1px solid #e1e6da;margin-bottom:20px}.story-top h2{font-size:clamp(18px,5vw,25px)}.story-top button{flex-shrink:0}.story-paper h3{font-size:23px;margin:12px 0}.story-paper p{line-height:1.75}.story-paper details{margin:15px 0 0;border-top:1px solid #e1e6da;padding-top:12px}.story-paper summary{cursor:pointer}.story-status{padding:10px 13px;border-radius:10px;background:#ebf0e3}.story-choices{display:grid;gap:8px;margin:14px 0}.story-choices button{text-align:left}.story-choices button:disabled{opacity:.6}@media(max-width:380px){#story-entry{flex-wrap:wrap}}';
document.head.append(storyStyles);
const modeStyles=document.createElement('style');
modeStyles.textContent='#play-mode-screen{position:fixed;inset:0;z-index:40;overflow:auto;background:radial-gradient(ellipse at top left,#e3f0df,transparent 60%),#fcf6ef;padding:28px 16px;display:grid;align-items:center}#play-mode-screen[hidden],#play-mode-bar[hidden]{display:none}.play-mode-card{width:min(100%,720px);margin:auto}.play-mode-card h1{font-size:clamp(26px,6vw,38px);margin:12px 0}.play-mode-options{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin:24px 0}.play-mode-options button{display:flex;flex-direction:column;align-items:flex-start;text-align:left;padding:24px;gap:14px;background:#ffffffdf;border:2px solid #dae4d7;border-radius:22px;color:#283e31}.play-mode-options button:nth-child(2){background:#fff3e5;border-color:#e9d3bc}.play-mode-options button[aria-pressed=true]{border-color:#365e45;box-shadow:0 0 0 2px #365e4522}.play-mode-options strong{font-size:26px}.play-mode-options span{line-height:1.7}.play-mode-options b{margin-top:auto;font-size:14px}.play-mode-options .mode-symbol{font-size:30px;line-height:1}#play-mode-bar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 14px;margin:8px 0 20px;border:1px solid #dfe5da;border-radius:16px;background:#f6f8f0}#play-mode-bar button{font-size:13px}#play-mode-title:focus{outline:none}@media(max-width:520px){.play-mode-options{grid-template-columns:1fr;gap:12px;margin:18px 0}.play-mode-options button{padding:20px;gap:10px}.play-mode-options .mode-symbol{display:none}.play-mode-options strong{font-size:24px}}';
document.head.append(modeStyles);
INSTANT_CHANGELOG.unshift({version:'遊び方選択アップデート',date:'2026-11-05',items:['投稿型と物語型の選択画面','モードに合わせたホームとナビゲーション','アカウントごとに選択を保存し、いつでも切り替え']});
INSTANT_CHANGELOG.unshift({version:'ストーリー大型アップデート',date:'2026-11-05',items:['投稿と選択で進む「余白書店の最後の七日」全6章','3つのエンディングと選択の記録','読了後は別の選択で再プレイ可能']});
render();
