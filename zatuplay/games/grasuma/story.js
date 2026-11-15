'use strict';
const Story=(()=>{
 const key='paint-smash-story-v1';
 let state={won:[],cleared:[],resume:null},view=null,pending=null;
 const chapter=id=>STORY_CHAPTERS.find(c=>c.id===id),esc=VISUALS.esc;
 function load(){state={won:[],cleared:[],resume:null};try{const x=JSON.parse(BrowserStore.getItem(key));for(let id=1;id<=11;id++){if(id>1&&!state.cleared.includes(id-1))break;if(x?.won?.includes(id))state.won.push(id);if(x?.cleared?.includes(id)&&state.won.includes(id))state.cleared.push(id)}const r=x?.resume,c=chapter(r?.id);if(c&&unlocked(c.id)&&['before','after'].includes(r.part)&&(r.part==='before'||state.won.includes(c.id))&&Number.isSafeInteger(r.line)&&r.line>=0&&r.line<=c[r.part].length)state.resume={id:r.id,part:r.part,line:r.line}}catch{}}
 function save(){try{BrowserStore.setItem(key,JSON.stringify(state));$('storySaveStatus').textContent='物語の進行はこのブラウザに自動保存されます。';return true}catch{$('storySaveStatus').textContent='保存できませんでした。ブラウザの保存設定を確認してください。';return false}}
 function unlocked(id){return !!chapter(id)&&(id===1||state.cleared.includes(id-1))}
 function render(){
 $('storyProgress').textContent=state.cleared.length+' / 11 章 CLEAR';
 const r=state.resume,c=r&&chapter(r.id),next=STORY_CHAPTERS.find(c=>!state.cleared.includes(c.id));
 $('storyResumeText').textContent=c?`第${c.id}章 ${c.title} / ${r.part==='after'?'後日談':'出発前'} 会話${Math.min(r.line+1,c[r.part].length)}`:next?`第${next.id}章 ${next.title}から冒険を始めよう。`:'第一部を読了しました。全章の会話・バトルをもう一度楽しめます。';
 $('storyChapters').innerHTML=STORY_CHAPTERS.map(c=>{const locked=!unlocked(c.id),done=state.cleared.includes(c.id),won=state.won.includes(c.id);return `<article class="story-card ${locked?'story-locked':''}" style="--chapter-color:${c.color}"><div class="story-card-top"><span>CHAPTER ${String(c.id).padStart(2,'0')}</span><b>${locked?'LOCKED':done?'CLEAR':won?'後日談へ':'OPEN'}</b></div><h2>${c.title}</h2><p>${locked?'前の章のバトルに勝利し、後日談を最後まで読むと解放されます。':esc(c.synopsis)}</p><small>${locked?'未解放':`敵 ${stages[c.stage].count}体 / ${c.isBoss?'ボス':'敵'}HP ${c.hp} / ${c.stage===0?'ボム':'全6種ギミック'}`}</small><p>初回勝利：ジュエル50個＋通常クエスト報酬${c.id===11?' / 後日談読了でアルカナ×1':''}</p><div class="keys"><button class="accent" data-story-open="${c.id}" ${locked?'disabled':''}>${locked?'前の章をクリア':won&&!done?'後日談を読む':done?'会話・バトルを再プレイ':'この章を読む →'}</button>${done?`<button data-story-after="${c.id}">後日談を読み返す</button>`:''}</div></article>`}).join('');
 document.querySelectorAll('[data-story-open]').forEach(b=>b.onclick=()=>open(+b.dataset.storyOpen));document.querySelectorAll('[data-story-after]').forEach(b=>b.onclick=()=>open(+b.dataset.storyAfter,'after'));
 }
 function showReader(){
 if(!view)return;const c=chapter(view.id),lines=c[view.part],last=view.line>=lines.length,idx=Math.min(view.line,lines.length-1),[speaker,text]=lines[idx];
 $('storyReader').classList.remove('hidden');$('storyChapters').classList.add('hidden');
 $('storyChapterTitle').textContent=`第${c.id}章 ${c.title}`;$('storyPart').textContent=view.part==='before'?'BEFORE BATTLE / 出発前':'AFTER BATTLE / 後日談';
 $('storySpeaker').textContent=speaker;$('storyText').textContent=text;$('storyLineCount').textContent=`${idx+1} / ${lines.length}`;
 $('storyPortrait').innerHTML=roster.some(h=>h.name===speaker)?VISUALS.hero(speaker,'editor'):`<span class="story-speaker-symbol">${speaker==='ローダー'?'✦':speaker==='ラビット'?'⌁':'▤'}</span>`;VISUALS.paint();
 $('storyPrev').disabled=view.line===0;$('storyNext').textContent=view.part==='before'?(last?'出撃準備中':idx===lines.length-1?'出撃準備へ →':'次へ →'):idx===lines.length-1?(state.cleared.includes(c.id)?'読了して一覧へ':c.id===11?'第一部を終える':'章をクリア →'):'次へ →';$('storyNext').disabled=last;
 $('storyBattleInfo').textContent=`${c.boss} / ${c.isBoss?'ボス':'敵'}HP ${c.hp} / 敵全滅で勝利。${c.stage===0?'ボムに注意。':'スパイク・ヘヴィ・ワープなどに注意。'} 敵の予告範囲を見て、仲間の足元を塗ろう。`;
 $('storyBrief').classList.toggle('hidden',!last||view.part!=='before');
 if(last&&view.part==='before'){$('storyTeam').innerHTML=hunters.map(h=>`<div>${VISUALS.hero(h.name,'mini')}<small>${esc(h.name)} / Lv.${h.level}</small></div>`).join('');$('storyReadyInfo').textContent=Owned.ready()?`${hunters.length}人で出撃。編成は「ハンター」から変更できます。`:'先に初期キャラ選択とチュートリアルガチャを完了してください。';$('storyDepart').textContent=Owned.ready()?'このチームで出撃':'初期キャラを選ぶ';VISUALS.paint()}
 $('storyLog').innerHTML=lines.slice(0,idx+1).map(([n,t])=>`<li><b>${esc(n)}</b><p>${esc(t)}</p></li>`).join('');
 state.resume={...view};save();
 }
 function open(id,part){if(!unlocked(id)){GameNav.go('story');$('storySaveStatus').textContent=`第${id}章は、前の章の後日談を読み終えると解放されます。`;return false}part=part==='after'||(!part&&state.won.includes(id)&&!state.cleared.includes(id))?'after':'before';if(part==='after'&&!state.won.includes(id))return false;GameNav.go('story');const r=state.resume;view=r?.id===id&&r.part===part?{...r}:{id,part,line:0};showReader();$('storyReader').scrollIntoView?.({block:'start',behavior:'smooth'});return true}
 function close(){view=null;$('storyReader').classList.add('hidden');$('storyChapters').classList.remove('hidden');render()}
 function next(){if(!view)return false;const c=chapter(view.id),lines=c[view.part];if(view.line>=lines.length)return false;if(view.part==='after'&&view.line===lines.length-1){if(!state.cleared.includes(c.id)){state.cleared.push(c.id);if(c.id===11&&!QuestData.state.cleared.arcana){Owned.add('アルカナ');Owned.save();QuestData.state.cleared.arcana=true;QuestData.save()}}state.resume=null;save();close();Owned.refresh();$('storyResumeText').textContent=c.id===11?'第一部・完。アルカナが仲間になりました。次の冒険も、皆で。':`第${c.id}章クリア！ 第${c.id+1}章が解放されました。`;return true}view.line++;showReader();return true}
 function launch(id){const c=chapter(id);if(!unlocked(id)||!view||view.id!==id||view.part!=='before'||view.line<c.before.length)return false;if(!Owned.ready()){Owned.openTutorial();return false}pending=id;start(c.stage);return S?.storyChapter===id}
 function continueStory(){if(state.resume)return open(state.resume.id,state.resume.part);const c=STORY_CHAPTERS.find(c=>!state.cleared.includes(c.id));return open(c?.id||1)}
 const originalStart=start;start=function(n){const id=pending;pending=null;const oldS=S;originalStart(n);if(!id||S===oldS)return;const c=chapter(id);S.storyChapter=id;S.enemies.forEach((e,i)=>{e.boss=c.isBoss&&i===0;e.r=e.boss?48:29;e.hp=e.max=i===0||!c.isBoss?c.hp:Math.round(c.hp*.3);e.clock=e.boss?3:2+i%2;const shift=(id%3-1)*22;e.x=Math.max(60,Math.min(480,e.x+shift));e.y=Math.max(70,e.y-(id%2)*30)});$('missionname').textContent=`第${id}章 ${c.title} / ${c.boss}`;ui()};
 const originalName=BattlePlus.stageName;BattlePlus.stageName=function(){const c=chapter(S?.storyChapter);return c?`第${c.id}章 ${c.title}`:originalName()};
 const originalReward=Growth.reward.bind(Growth);Growth.reward=function(){const first=S.storyChapter&&!state.won.includes(S.storyChapter);const r=originalReward();if(first){state.won.push(S.storyChapter);state.resume={id:S.storyChapter,part:'after',line:0};Owned.state.gems+=50;Owned.save();save();r.storyMessage='章の初回勝利：ジュエル＋50。後日談を読むと次の章が解放されます。'}return r};
 const originalRewardHTML=Growth.rewardHTML.bind(Growth);Growth.rewardHTML=function(){const html=originalRewardHTML();return html+(S.reward?.storyMessage?'<p>'+esc(S.reward.storyMessage)+'</p>':'')};
 const originalResult=VISUALS.result;VISUALS.result=function(win){originalResult(win);if(!S.storyChapter)return;const id=S.storyChapter;$('again').textContent=win?'後日談を読む →':'この章のバトルに再挑戦';$('again').onclick=()=>{if(win){state.resume={id,part:'after',line:0};save();open(id,'after')}else{pending=id;start(chapter(id).stage)}};$('return').textContent='章一覧へ';$('return').onclick=()=>GameNav.go('story');$('resultTeamEdit').onclick=()=>GameNav.go('team')};
 const originalLaunchQuest=BattlePlus.launchQuest;BattlePlus.launchQuest=function(id){return id==='arcana'?open(11):originalLaunchQuest(id)};
 const originalRetry=$('retry').onclick,originalBack=$('back').onclick;$('retry').onclick=()=>{if(S?.storyChapter){pending=S.storyChapter;start(chapter(pending).stage)}else originalRetry()};$('back').onclick=()=>S?.storyChapter?GameNav.go('story'):originalBack();
 const originalReset=Owned.reset.bind(Owned);Owned.reset=function(){originalReset();state={won:[],cleared:[],resume:null};view=null;save();close()};
 $('story').onclick=$('questStory').onclick=()=>GameNav.go('story');$('storyContinue').onclick=continueStory;$('storyClose').onclick=close;$('storyNext').onclick=next;$('storyPrev').onclick=()=>{if(view&&view.line>0){view.line--;showReader()}};$('storyDepart').onclick=()=>view&&launch(view.id);$('storyEdit').onclick=()=>GameNav.go('team');
 load();render();return{chapters:STORY_CHAPTERS,get state(){return state},get view(){return view},open,close,next,launch,render,load,unlocked,continue:continueStory};
})();globalThis.Story=Story;
