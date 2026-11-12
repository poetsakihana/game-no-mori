/* Canvas 2D presentation follows the APK's original 400 × 800 layout. */
(function(){
'use strict';
const $=id=>document.getElementById(id), ui={canvas:$('game'),controls:$('controls'),curtain:$('curtain'),resume:$('resume'),retry:$('retry'),status:$('status'),dialog:$('dialog')};
const C=globalThis.CrownCore; if(!C){crownLoadFailed();return;}
const ctx=ui.canvas.getContext('2d');if(!ctx){crownLoadFailed();$('curtain-text').textContent='Canvas 2Dを開始できません。このブラウザの描画設定を確認してください。';return;}
let game,store,loadedData,ready=false,running=false,fatal=false,lockHeld=false,volatile=false,releaseLock=null,acquiring=false,lastFrame=0,lastSave=0,dialogKind='',lastFocus=null,audio=null,audioWarning=false;
let lastNote='',buttons=[],buttonKey='',focusCan=0;
const colors={white:'#f4f8ee',gold:'#f8c75f',green:'#74d6ac',muted:'#a4bcb0',bg:'#0f251f'};
const randomID=()=>globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
ui.retry.onclick=()=>location.reload();
function status(text){ui.status.textContent=text;}
function download(text,name){const blob=new Blob([text],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('export').onclick=()=>{if(game)download(JSON.stringify({format:C.FORMAT,version:1,revision:Math.max(1,store?.revision||1),writer:'manual-export',state:game.s},null,2),'can-to-crown-progress.json');};
$('export-original').onclick=()=>{try{const raw=localStorage.getItem(C.KEY);if(raw!==null)download(raw,'can-to-crown-original-save.json');}catch{status('保存領域を読み出せません。');}};
function showCurtain(title,text,error=false){
  if(ui.dialog.open)ui.dialog.close();dialogKind='';running=false;stopAudio();
  ui.curtain.hidden=false;$('curtain-title').textContent=title;$('curtain-text').textContent=text+(volatile&&!error?'\n\nこの環境では安全な自動保存に未対応のため、一時プレイになります。今回の進行は「保存」からJSONへ書き出してください。':'');
  ui.resume.disabled=!ready||error;ui.resume.hidden=error;ui.retry.hidden=!error;$('export').hidden=!error||!game;$('export-original').hidden=!error;
  $('pause').disabled=true;ui.controls.classList.add('inert');for(const b of ui.controls.children)b.tabIndex=-1;
  (error?ui.retry:ui.resume).focus();
}
function fail(message){fatal=true;showCurtain('進行を保護して停止しました',message+'\nこのタブから保存を上書きしません。現在の進行を書き出してから、ほかのタブを閉じて再読込してください。',true);status(message);}
window.crownLoadFailed=()=>fail('ゲームの表示ファイルを読み込めませんでした。通信を確認してください。');
window.addEventListener('error',()=>{if(ready&&!fatal)fail('表示中にエラーが発生しました。現在の進行を保護します。');});
window.addEventListener('unhandledrejection',()=>{if(ready&&!fatal)fail('処理中にエラーが発生しました。現在の進行を保護します。');});
function save(){if(!ready||fatal||!game)return false;if(volatile){status('一時プレイ：このブラウザでは進行を保存しません。保存メニューから書き出してください。');return true;}if(!lockHeld)return false;try{store.save(game.s);lastSave=performance.now();status('このブラウザに保存済み · '+game.b.areas[game.s.zone]+' · '+C.yen(game.s.cash));return true;}catch(e){fail('保存できませんでした：'+e.message);return false;}}
function pause(reason){if(!running)return;running=false;save();if(!fatal){ui.resume.textContent='再開する';showCurtain('一時停止',reason+'\n収入と次のイベントまでの時間は止まっています。60秒の強化は原作どおり実時間で終了します。「再開する」を押すまで収入は増えません。');}}
async function acquire(){
  if(lockHeld)return true;if(acquiring)return false;acquiring=true;
  if(!navigator.locks?.request){volatile=true;acquiring=false;$('storage-warning').hidden=false;return true;}
  let resolve;
  const available=new Promise(r=>resolve=r);
  navigator.locks.request('zatuplay-can-to-crown-session',{mode:'exclusive',ifAvailable:true},async lock=>{
    if(!lock){resolve(false);return;}lockHeld=true;resolve(true);await new Promise(r=>releaseLock=r);lockHeld=false;releaseLock=null;
  }).catch(()=>{resolve(false);if(lockHeld)fail('保存の排他制御を開始できません。');});
  const result=await available;acquiring=false;return result;
}
async function resume(){
  if(!ready||fatal||running||acquiring)return;
  ui.resume.disabled=true;
  if(!await acquire()){ui.resume.disabled=false;showCurtain('ほかのタブでプレイ中です','この作品を開いているほかのタブを閉じてから「再開する」を押してください。こちらでは進行を上書きしません。');return;}
  if(store.changed()){fail('ほかのタブで保存が更新されています。再読込して最新の保存を開いてください。');return;}
  try{if(game.s.sound)initAudio();}catch{audioWarning=true;}
  if(document.hidden){ui.resume.disabled=false;return;}
  ui.curtain.hidden=true;running=true;lastFrame=performance.now();ui.resume.disabled=false;$('pause').disabled=false;ui.controls.classList.remove('inert');for(const b of ui.controls.children)b.tabIndex=0;
  save();render();if(game.s.pendingEvent)eventDialog();
}
ui.resume.onclick=resume;$('pause').onclick=()=>pause('手動で停止しました。');
function initAudio(){if(audio)return;const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Audio){audioWarning=true;return;}audio=new Audio();if(audio.state==='suspended')audio.resume().catch(()=>{audioWarning=true;});}
function stopAudio(){if(audio?.state==='running')audio.suspend().catch(()=>{});}
function beep(type){if(!game.s.sound)return;try{initAudio();if(!audio)return;if(audio.state==='suspended')audio.resume().catch(()=>{audioWarning=true;});const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.value={pick:400,yes:1200,no:300}[type]||400;g.gain.setValueAtTime(.035,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.065);o.connect(g);g.connect(audio.destination);o.onended=()=>{o.disconnect();g.disconnect();};o.start();o.stop(audio.currentTime+.065);}catch{audioWarning=true;}}
function action(fn){if(!running||fatal)return;game.tone=null;fn();if(game.tone)beep(game.tone);if(!save())return;render();if(game.s.pendingEvent&&!ui.dialog.open)eventDialog();}
function closeDialog(){if(ui.dialog.open)ui.dialog.close();dialogKind='';if(lastFocus?.isConnected)lastFocus.focus();}
function dialog(title,text,choices,kind='menu'){
  lastFocus=document.activeElement;dialogKind=kind;$('dialog-title').textContent=title;$('dialog-body').textContent=text;$('dialog-actions').replaceChildren();
  for(const choice of choices){const b=document.createElement('button');b.textContent=choice.label;if(choice.className)b.className=choice.className;b.onclick=()=>{if(!running&&!['help','backup','restore'].includes(kind))return;closeDialog();choice.run();};$('dialog-actions').append(b);}
  if(!ui.dialog.open)ui.dialog.showModal();$('dialog-actions').firstElementChild?.focus();
}
ui.dialog.addEventListener('cancel',e=>{if(dialogKind==='event'){e.preventDefault();return;}dialogKind='';});
const back=fn=>({label:'戻る',className:'minor',run:fn||(()=>{})});
function eventDialog(){const p=game.s.pendingEvent;if(!p||!running)return;dialog('街イベント：'+game.e.EVENTS[p.id],game.e.DETAILS[p.id]+'\n\n参加の効果：'+game.effect(p.id)+'\n\n休憩を選ぶと少額の応援金を受け取ります。',[{label:'参加する',run:()=>action(()=>game.chooseEvent(true))},{label:'休憩する',className:'minor',run:()=>action(()=>game.chooseEvent(false))}],'event');}
function npcMenu(){dialog(game.b.areas[game.s.zone]+'の街人','',Array.from({length:4},(_,i)=>{const id=game.s.zone*4+i;return {label:game.e.PEOPLE[id]+(game.discovered(1,id)?' ★':''),run:()=>npc(id)};}).concat(back()));}
function npc(id){let first=false;action(()=>{first=game.meet(id);});if(fatal)return;dialog(game.e.PEOPLE[id],game.e.TALKS[id]+'\n\n'+(first?'初めての交流：評判＋1、謝礼金！\n':'')+'依頼：'+game.e.QUESTS[id]+'\n'+game.questDescription(id),[{label:game.discovered(2,id)?'依頼は完了済み':'依頼を受ける',run:()=>action(()=>game.accept(id))},{label:'またね',className:'minor',run:()=>{}}]);}
function questMenu(){const i=game.s.activeQuest;if(i<0){action(()=>game.msg('街人に話しかけて依頼を受けよう！'));return;}dialog(game.e.QUESTS[i],game.questDescription(i)+'\n進行：'+Math.floor(game.progress(i))+' / '+game.e.NEED[i]+'\n報酬：'+C.yen(game.questReward(i))+'、評判＋2',[{label:'報告する',run:()=>action(()=>game.report())},{label:'依頼を中止',className:'minor',run:()=>action(()=>game.cancelQuest())},back()]);}
function achievementMenu(){dialog('実績と報酬','',game.e.ACHIEVEMENTS.map((name,i)=>({label:(game.discovered(4,i)?'済 ':game.achMetric(game.e.ATYPE[i])>=game.e.ANEED[i]?'受取可 ':'未 ')+name,run:()=>action(()=>game.claim(i))})).concat(back()));}
const categories=['イベント','街人','依頼','収集品','実績'],names=['EVENTS','PEOPLE','QUESTS','ITEMS','ACHIEVEMENTS'];
function journal(){dialog('追加100種類の図鑑','',categories.map((name,i)=>({label:name+' 20種類',run:()=>journalList(i)})).concat(back()));}
function journalList(cat){dialog('図鑑：'+categories[cat],'',game.e[names[cat]].map((name,i)=>({label:(game.discovered(cat,i)?'★ ':'☆ ')+String(cat*20+i+1).padStart(3,'0')+' '+name,run:()=>journalItem(cat,i)})).concat({label:'分類へ',className:'minor',run:journal}));}
function journalItem(cat,i){const text=[()=>game.e.DETAILS[i]+'\n'+game.effect(i),()=>game.e.TALKS[i]+'\n出会える街：'+game.b.areas[Math.floor(i/4)],()=>game.questDescription(i)+'\n依頼人：'+game.e.PEOPLE[i],()=>'缶拾いで発見。探す街：'+game.b.areas[Math.floor(i/4)],()=>'目標：'+game.e.ANEED[i]+' / 現在：'+Math.floor(game.achMetric(game.e.ATYPE[i]))][cat]();dialog(game.e[names[cat]][i],(game.discovered(cat,i)?'記録済み':'未記録')+'\n\n'+text,[{label:'図鑑へ',run:()=>journalList(cat)}]);}
function resetDialog(){dialog('最初から始めますか？',volatile?'この画面の一時進行を初期化します。ブラウザの元の保存は変更しません。':'現在の進行は置き換わります。操作前の保存は予備データとしてこのブラウザに保管します。',[{label:'やり直す',className:'danger',run:()=>{
  if(volatile){action(()=>game.reset());return;}
  try{if(store.changed())throw Error('ほかのタブで保存が変わりました。');const raw=store.raw;if(raw!==null)localStorage.setItem(C.KEY+'.before-reset',raw);}catch(e){fail('やり直す前の保存を保管できません：'+e.message);return;}
  action(()=>game.reset());}},back()]);}
$('help').onclick=()=>{
  const wasRunning=running;if(wasRunning)pause('遊び方を確認しています。');
  dialog('遊び方・保存について','缶を拾って売り、暮らしと事業を育てます。所持金1億円でエンディング。ゲーム内の架空の資金です。\n\n・缶20個で袋が満杯。まとめて売却できます。\n・街人から依頼を受け、目標を満たしたら報告。\n・25回拾うか、プレイ時間60秒でイベント。\n・実績の報酬は街人画面で受け取ります。\n・累計収入で5地区解放。移動前に缶を売ります。\n\nマウス・タッチ・Tab / Enter / Spaceで操作。矢印キーで缶を選択、Sで売却。1〜5で下部メニュー、P / Escapeで停止。\n\n操作ごとと約4秒ごとに自動保存。中断・別タブへの移動・ページ非表示では収入とイベント進行を止め、明示的な再開を待ちます。60秒の強化は原作どおり実時間で終了します。閉じている間の収入はありません。保存の削除やプライベートモード終了で進行を失うことがあります。\n\n同じ作品の複数タブ同時進行を防止します。保存異常時は停止し、元のデータを上書きしません。\n\n元APKには音楽・画像ファイルはなく、図形と通知音で構成されています。ブラウザの効果音は65msの合成音で代替しています。'+(audioWarning?'\n\nこの環境では音を利用できない可能性があります。無音でも進行できます。':''),[{label:'閉じる',run:()=>{}}],'help');
};
$('backup').onclick=()=>{
  if(running)pause('保存の管理を開きました。');
  const choices=[];
  if(game)choices.push({label:'現在の進行を書き出す',run:()=>$('export').onclick()});
  choices.push({label:'保存ファイルを読み込む',run:()=>{$('import').value='';$('import').click();}},{label:'元の保存データを書き出す',run:()=>$('export-original').onclick()},{label:'閉じる',className:'minor',run:()=>{}});
  dialog('保存の管理','書出しファイルは、この作品のブラウザ版で読み込めます。APKの保存には対応していません。復元前の進行は予備データとしてこのブラウザに残します。',choices,'backup');
};
$('import').onchange=async()=>{
  const file=$('import').files?.[0];$('import').value='';if(!file)return;
  if(running)pause('保存ファイルを読み込んでいます。');
  let incoming,baseline;
  try{if(file.size>262144)throw Error('ファイルが大きすぎます。');incoming=C.decode(await file.text());baseline=localStorage.getItem(C.KEY);}catch(e){dialog('保存を読み込めませんでした',e.message+'\n現在の保存は変更していません。',[back()],'backup');return;}
  const next=incoming.state;
  dialog('保存データを復元しますか？',loadedData.base.areas[next.zone]+' / '+C.yen(next.cash)+'\n拾った缶：'+next.picked+'個\n現在の進行をこのファイルで置き換えます。',[{label:'復元する',run:async()=>{
    if(!await acquire()){dialog('ほかのタブでプレイ中です','ほかのタブを閉じてから読み込み直してください。',[back()],'backup');return;}
    if(volatile){dialog('保存の復元はできません','このブラウザは安全な保存に必要なWeb Locksに対応していません。元の保存は変更していません。書き出したファイルは対応するブラウザで読み込んでください。',[back()],'backup');return;}
    try{
      if(localStorage.getItem(C.KEY)!==baseline)throw Error('保存が更新されました。再読込して確認してください。');
      if(baseline!==null)localStorage.setItem(C.KEY+'.before-import',baseline);
      const nextStore=new C.SaveStore(localStorage,randomID());nextStore.raw=baseline;
      try{nextStore.revision=baseline===null?0:C.decode(baseline).revision;}catch{nextStore.revision=0;}
      nextStore.save(next);game=new C.Game(loadedData,next);store=nextStore;ready=true;fatal=false;
      ui.resume.textContent='再開する';render();showCurtain('保存を復元しました','確認した進行を保存しました。再開するまで時間は進みません。');
    }catch(e){fail('復元できませんでした：'+e.message);}
  }},{label:'キャンセル',className:'minor',run:()=>{}}],'restore');
};
function box(x,y,w,h,color){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,16);ctx.fill();}
function text(t,x,y,size=17,color=colors.white,max=356){ctx.fillStyle=color;ctx.font=`${size}px system-ui, sans-serif`;ctx.fillText(t,x,y,max);}
function button(id,label,x,y,w,h,fn,can=false){
  if(!can){box(x,y,w,h,'#255142');text(label,x+14,y+h/2+6,17,colors.white,w-28);}
  buttons.push({id,label,x,y,w,h,fn});
}
function render(){
  if(!game)return;const s=game.s,b=game.b,g=game;ctx.setTransform(2,0,0,2,0,0);ctx.fillStyle=colors.bg;ctx.fillRect(0,0,400,800);buttons=[];
  text('CAN TO CROWN',22,32,13,colors.gold);text('缶拾いから大富豪',22,64,27);text(C.yen(s.cash),22,108,31,colors.gold);text('目標：所持金1億円  /  事業収入 '+C.yen(g.rate())+'/秒',22,134,13,colors.muted);
  box(22,149,356,8,'#26483b');box(22,149,Math.max(2,Math.min(1,s.cash/1e8)*356),8,colors.gold);
  if(s.page===0){
    text(`${b.areas[s.zone]}  /  缶 ${s.bag} / ${g.maxBag()}`,22,189,20);text('青＝普通  緑＝きれいな缶  金＝お宝缶',22,215,13,colors.muted);box(16,230,368,350,'#1e3d2f');
    s.cans.forEach((v,i)=>{const x=i%4*91+32,y=Math.floor(i/4)*65+249;box(x,y,63,48,v===3?colors.gold:v===2?colors.green:'#75aec7');ctx.fillStyle='#dcebdc';ctx.beginPath();ctx.ellipse(x+31.5,y+9.5,19.5,4.5,0,0,Math.PI*2);ctx.fill();text('CAN',x+14,y+35,15,'#16372d');button('can-'+i,`${['','普通の缶','きれいな缶','お宝缶'][v]} ${i+1}を拾う`,x,y,70,55,()=>action(()=>g.pick(i)),true);});
    button('sell','まとめて売る  ＋'+C.yen(g.value()),22,593,356,48,()=>action(()=>g.sell()));button('town','街人・依頼・図鑑を開く',22,650,356,40,()=>action(()=>s.page=5));
    text('イベント強化：'+(s.saleUntil>game.clock()?'売価2倍 ':'')+(s.pickUntil>game.clock()?'回収2倍 ':'')+(s.bizUntil>game.clock()?'事業2倍':''),22,580,12,colors.gold);
  }else if(s.page===1){
    text('暮らしと事業を育てよう',22,190,21);
    const types=['tool','capacity','cart','homes','business'];const max={tool:15,capacity:20,cart:15,homes:4,business:6};
    const labels=[`拾う道具 Lv.${s.tool}`,`袋の容量 ${g.maxBag()}個`,`売却ボーナス Lv.${s.cart}`,s.homes<4?'住まいを整える':'住まい：大きな家（完成）',s.business<6?b.bizNames[s.business]:'全国リサイクル網（完成）'];
    types.forEach((t,i)=>button('buy-'+t,labels[i]+(s[t]<max[t]?' → '+C.yen(g.cost(t)):i<3?'（最高）':''),22,212+i*69,356,57,()=>action(()=>g.buy(t))));
    text('事業収入はプレイ中に自動で増えます。',22,583,15,colors.muted);text('住まいは物語の変化を楽しむ要素です。',22,610,14,colors.muted);text('目標は「所持金」1億円。投資で減る分に注意！',22,640,13,colors.gold);
  }else if(s.page===2){
    text('拾う街を選ぶ',22,190,23);b.areas.forEach((name,i)=>{button('zone-'+i,`${name}  ${b.prices[i]}円/缶`,22,211+i*82,356,53,()=>action(()=>g.move(i)));text(s.total<b.unlock[i]?'累計収入 '+C.yen(b.unlock[i])+'で解放':s.zone===i?'現在地':'解放済み',28,282+i*82,13,s.total<b.unlock[i]?colors.muted:colors.green);});
  }else if(s.page===3){
    text('あなたの歩み',22,190,23);text('住まい：'+b.homeNames[s.homes],22,229,18,colors.green);text('累計収入：'+C.yen(s.total),22,265,18);text('拾った缶：'+s.picked+'個',22,301,18);text('売った缶：'+s.sold+'個',22,337,18);text('事業：'+(s.business?b.bizNames[s.business-1]:'まだありません'),22,373,17);text('缶拾いから始まる、新しい暮らし。',22,417,16,colors.muted);text('小さな一歩を、街の大きな力へ。',22,446,16,colors.muted);text('所持金1億円でエンディングを迎えます。',22,475,15,colors.gold);
    button('sound','効果音：'+(s.sound?'オン':'オフ'),22,507,356,46,()=>action(()=>{s.sound=!s.sound;if(s.sound)g.tone='yes';else stopAudio();}));
    if(s.ended)button('ending','エンディングをもう一度見る',22,566,356,46,()=>action(()=>s.page=4));button('reset','最初からやり直す',22,627,356,44,resetDialog);
  }else if(s.page===5){
    text(b.areas[s.zone]+'の交流広場',22,188,22);for(let i=0;i<4;i++){const x=i*88+48,color=[colors.gold,colors.green,'#8bbbde','#df9eb7'][i];ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,238,15,0,Math.PI*2);ctx.fill();box(x-16,256,32,38,color);text(g.e.PEOPLE[s.zone*4+i].split('・')[1],x-25,321,12,colors.white,73);}
    text(`評判 ${s.reputation}  /  図鑑 ${g.journalCount()} / 100`,22,348,18,colors.gold);button('npc','街人に話しかける',22,372,356,47,npcMenu);button('quest','依頼：'+(s.activeQuest<0?'未受注':g.e.QUESTS[s.activeQuest]),22,431,356,47,questMenu);button('achievements','実績の報酬を受け取る',22,490,356,47,achievementMenu);button('journal','追加100種類の図鑑',22,549,356,47,journal);text('25回拾う、または60秒遊ぶとイベント！',22,625,15,colors.green);text('収集品は各街の缶拾いで見つかります。',22,650,14,colors.muted);text('評判1につき事業収入＋1％（上限100％）',22,675,13,colors.muted);
  }else{
    box(22,185,356,478,'#1e4333');text('★ CONGRATULATIONS ★',43,232,22,colors.gold,320);text('大富豪への第一歩',59,281,27,colors.white,285);text('最初に拾った、たったひとつの缶。',37,329,17,colors.white,328);text('それが、新しい暮らしの始まりだった。',37,363,16,colors.white,328);text('積み重ねた努力と、街とのつながりは',37,404,16,colors.white,328);text('やがて大きな事業へと育っていった。',37,438,16,colors.white,328);text('あなたは所持金1億円を達成！',45,482,20,colors.gold,310);text('これからも、誰かの明日を支える人に。',37,523,16,colors.green,328);text('END  /  咲華の缶拾い物語',80,567,17,colors.muted,270);button('after-ending','クリア後も街で遊ぶ',45,595,310,45,()=>action(()=>{s.page=0;g.msg('クリアおめでとう！ 街で自由に遊ぼう。');}));
  }
  text(g.note.slice(0,24),22,706,15,colors.gold);if(g.note.length>24)text(g.note.slice(24,48),22,728,13,colors.gold);
  ['拾う','強化','移動','街人','記録'].forEach((label,i)=>button('nav-'+i,label,10+i*78,750,72,38,()=>action(()=>s.page=[0,1,2,5,3][i])));
  syncButtons();if(lastNote!==g.note){lastNote=g.note;status(g.note+(audioWarning?' · 音は利用できません':''));}
}
function syncButtons(){
  const key=buttons.map(b=>b.id).join('|');
  if(key!==buttonKey){buttonKey=key;ui.controls.replaceChildren();for(const info of buttons){const b=document.createElement('button');b.dataset.id=info.id;b.style.cssText=`left:${info.x/4}%;top:${info.y/8}%;width:${info.w/4}%;height:${info.h/8}%`;b.onclick=()=>{if(running&&!ui.dialog.open)buttons.find(x=>x.id===b.dataset.id)?.fn();};ui.controls.append(b);}}
  [...ui.controls.children].forEach((b,i)=>{b.setAttribute('aria-label',buttons[i].label);b.title=buttons[i].label;b.tabIndex=running?0:-1;});
}
document.addEventListener('keydown',e=>{
  if(e.ctrlKey||e.metaKey||e.altKey||e.repeat)return;
  if(!running||ui.dialog.open)return;
  if(e.key==='Escape'||e.key.toLowerCase()==='p'){e.preventDefault();pause('キーボードで停止しました。');return;}
  if(e.key.toLowerCase()==='s'&&game.s.page===0){e.preventDefault();action(()=>game.sell());return;}
  if(/^[1-5]$/.test(e.key)){e.preventDefault();action(()=>game.s.page=[0,1,2,5,3][+e.key-1]);return;}
  if(game.s.page===0&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();const active=document.activeElement?.dataset?.id;if(active?.startsWith('can-'))focusCan=Number(active.slice(4));focusCan=(focusCan+{ArrowLeft:19,ArrowRight:1,ArrowUp:16,ArrowDown:4}[e.key])%20;ui.controls.querySelector(`[data-id="can-${focusCan}"]`)?.focus();}
});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause('ページが非表示になりました。');});
window.addEventListener('blur',()=>pause('ほかの画面へ移動しました。'));
window.addEventListener('pagehide',()=>{pause('ページを離れました。');if(releaseLock)releaseLock();});
window.addEventListener('pageshow',e=>{if(e.persisted&&ready&&!fatal)showCurtain('一時停止','ページに戻りました。再開するまで進みません。');});
window.addEventListener('storage',e=>{if(e.key===C.KEY&&store&&store.changed())fail('別のタブで保存が更新されました。');});
function frame(now){
  if(running&&ready&&!fatal){const elapsed=(now-lastFrame)/1000;lastFrame=now;if(elapsed>1.5){pause('画面の更新が長く止まったため停止しました。');}else{const hadEvent=!!game.s.pendingEvent,ended=game.s.ended;game.tick(Math.min(1,Math.max(0,elapsed)),!ui.dialog.open);if((!hadEvent&&game.s.pendingEvent)||(!ended&&game.s.ended)||now-lastSave>4000)save();if(!fatal){render();if(game.s.pendingEvent&&!ui.dialog.open)eventDialog();}}}
  requestAnimationFrame(frame);
}
async function start(){
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
  try{
    if(window.crownStyleFailed)throw Error('表示ファイルを読み込めませんでした。');
    const response=await fetch('reference/original-data.json?v=2.1-web.1',{signal:controller.signal,cache:'no-cache'});if(!response.ok)throw Error('原作データ HTTP '+response.status);const raw=await response.text();
    if(globalThis.crypto?.subtle){const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw));const hex=[...new Uint8Array(digest)].map(v=>v.toString(16).padStart(2,'0')).join('');if(hex!=='a6e105ac5843edf89fc17fdb63f35354234696f0e19b81484ec0773f1d791d10')throw Error('原作データの一致を確認できません。');}
    if(window.crownStyleFailed)throw Error('表示ファイルを読み込めませんでした。');
    const data=C.validateData(JSON.parse(raw));loadedData=data;$('backup').disabled=false;store=new C.SaveStore(localStorage,randomID());let state;
    try{state=store.load();}catch{clearTimeout(crownLoadTimer);showCurtain('保存を読み込めませんでした','元の保存は上書きしていません。「元の保存データを書き出す」で保管できます。保存領域の制限を確認してから再読込してください。',true);return;}
    game=new C.Game(data,state);ready=true;if(!navigator.locks?.request){volatile=true;$('storage-warning').hidden=false;}clearTimeout(crownLoadTimer);render();ui.resume.textContent=state?'つづきから':'はじめる';showCurtain('缶拾いから大富豪',state?'保存した進行を読み込みました。再開するまで時間は進みません。':'たったひとつの缶から、新しい暮らしへ。\n街の人とつながり、所持金1億円を目指そう。');requestAnimationFrame(frame);
  }catch(e){clearTimeout(crownLoadTimer);showCurtain('ゲームを読み込めませんでした',e.name==='AbortError'?'読み込みがタイムアウトしました。通信を確認して再読込してください。保存は上書きしていません。':e.message+'\n通信を確認して再読込してください。保存は上書きしていません。',true);}
  finally{clearTimeout(timeout);}
}
start();
})();
