'use strict';
const $=s=>document.querySelector(s),app=$('#app'),VERSION='0.3.0-web.2';
const asset=path=>`assets/${path}?v=${VERSION}`;
let save=FryStore.initialState,game=null,ac=null,ioEpoch=0,busy=false,inputPaused=false,drag=null,modalKind='',modalEpoch=0,returnFocus=null;
const endlessChapter={title:'とことんサクサク',target:999999,moves:30,type:-1,goal:'30手でどこまでいける？ 長い連鎖で自己ベストに挑戦。'};
function restoreAttempt(){game=save.attempt?{...save.attempt,board:[...save.attempt.board],typeCounts:[...save.attempt.typeCounts],result:save.attempt.result?{...save.attempt.result}:null,c:save.attempt.index<0?endlessChapter:chapters[save.attempt.index],selected:[]}:null;drag=null}
function snapshot(){if(game){const {index,board,moves,score,count,typeCounts,chains,helps,done,result}=game;save.attempt={index,board:[...board],moves,score,count,typeCounts:[...typeCounts],chains,helps,done,result:result?{...result}:null}}return FryStore.validate(save)}
function invalidateIO(){ioEpoch++;busy=false;$('#importFile').value=''}
function persist(){const state=snapshot();if(['ready','saved'].includes(FryStore.phase))$('#saveStatus').textContent='保存処理中です。完了するまでこの画面を閉じないでください。';return FryStore.commit(state)}
const notices={ready:'このブラウザへ自動保存します。',saved:'このブラウザに保存済み。大切な記録はJSONでも保管してください。',corrupt:'既存の保存が壊れているか未対応です。元のデータを保護し、上書きを停止しています。記録画面から書き出し・確認付き復元ができます。',conflict:'別タブで保存が変わりました。このタブは上書きを停止しました。現在の記録をJSONに書き出し、再読込してください。',unavailable:'ブラウザの保存が利用できません。現在の記録はメモリ内だけです。閉じる前にJSONを書き出してください。',unsupported:'この環境はWeb Locks非対応です。競合防止のため保存はメモリ内だけです。閉じる前にJSONを書き出してください。',quota:'保存容量が足りず、最新の変更を保存できませんでした。記録をJSONに書き出してください。既存の保存は保護されています。',invalid:'記録の整合性を確認できず、保存を止めました。既存の保存は変更していません。'};
FryStore.subscribe(phase=>{$('#saveStatus').textContent=notices[phase];$('#saveStatus').dataset.warning=!['ready','saved'].includes(phase)});
function audioFailure(){$('#audioStatus').textContent='音を再生できません。ゲームは音なしで続けられます。'}
function tone(freq=600){if(!save.sound||inputPaused||document.hidden)return;try{ac??=new(window.AudioContext||window.webkitAudioContext)();const resumed=ac.resume();resumed?.catch(audioFailure);const o=ac.createOscillator(),g=ac.createGain();o.connect(g);g.connect(ac.destination);o.frequency.value=freq;g.gain.setValueAtTime(.06,ac.currentTime);g.gain.exponentialRampToValueAtTime(.001,ac.currentTime+.13);o.onended=()=>{try{o.disconnect();g.disconnect()}catch{}};o.start();o.stop(ac.currentTime+.14)}catch{audioFailure()}}
function suspendAudio(){try{ac?.suspend()?.catch(()=>{})}catch{}}
function updateSound(){$('#sound').textContent='音 '+(save.sound?'ON':'OFF')}
$('#sound').onclick=()=>{if(busy)return;invalidateIO();save.sound=!save.sound;updateSound();if(save.sound)tone();else suspendAudio();persist()};
function clearTransient(){drag=null;if(game)game.selected=[];document.querySelectorAll('[data-tile]').forEach(b=>b.classList.remove('selected'))}
function canPlay(){return !!game&&!game.done&&!busy&&!inputPaused&&!document.hidden&&!$('#modal').open&&save.screen==='game'}
function bindModalAction(selector,action){
 const node=$(selector),epoch=modalEpoch;if(!node)return;
 node.onclick=(...args)=>{if(epoch!==modalEpoch||!$('#modal').open||$(selector)!==node||!$('#modal').contains(node)||node.disabled)return;return action(...args)};
}
function popup(html,kind='story'){
 modalEpoch++;invalidateIO();clearTransient();returnFocus=document.activeElement;modalKind=kind;$('#modalBody').innerHTML=html;
 if(!$('#modal').open)$('#modal').showModal();$('#modal').scrollTop=0;bindModalAction('#close',closeModal);
}
function closeModal(){modalEpoch++;invalidateIO();clearTransient();modalKind='';if($('#modal').open)$('#modal').close();if(returnFocus?.isConnected)returnFocus.focus()}
$('#modal').addEventListener('cancel',e=>{e.preventDefault();closeModal()});
// closeModal handles cancellation synchronously. Do not react to the queued native
// close event: it can arrive after this same dialog has already opened a new screen.
function pauseInput(){invalidateIO();clearTransient();suspendAudio();if(game&&!game.done&&save.screen==='game'){inputPaused=true;updatePause()}}
function updatePause(){if(!$('#pauseNotice'))return;$('#pauseNotice').hidden=!inputPaused;$('.board').setAttribute('aria-disabled',String(inputPaused||game.done));$('#commit').disabled=inputPaused||game.done;$('#cancel').disabled=inputPaused||game.done;$('#hint').disabled=inputPaused||game.done;$('#shuffle').disabled=inputPaused||game.done;document.querySelectorAll('[data-tile]').forEach(b=>b.disabled=inputPaused||game.done)}
window.addEventListener('blur',pauseInput);window.addEventListener('pagehide',pauseInput);document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseInput()});
function home(){invalidateIO();clearTransient();closeModal();save.screen='home';inputPaused=false;renderHome();persist()}
function resume(){if(busy||!game)return;closeModal();save.screen='game';inputPaused=false;renderGame();persist();if(game.done)showResult()}
const random=()=>Math.floor(Math.random()*7);
function adjacent(a,b){return a!==b&&Math.abs(a%6-b%6)<=1&&Math.abs(Math.floor(a/6)-Math.floor(b/6))<=1}
function findPath(board,minimum=3){function walk(p){if(p.length>=minimum)return p;const a=p.at(-1);for(let b=0;b<36;b++)if(!p.includes(b)&&board[b]===board[a]&&adjacent(a,b)){const r=walk([...p,b]);if(r)return r}return null}for(let a=0;a<36;a++){const r=walk([a]);if(r)return r}return null}
function ensure(){if(!findPath(game.board)){game.board=Array.from({length:36},random);game.board[0]=game.board[1]=game.board[2]=random();return true}return false}
function makeAttempt(i){const c=i<0?endlessChapter:chapters[i];return {index:i,c,board:Array.from({length:36},random),moves:c.moves,score:0,count:0,typeCounts:Array(7).fill(0),chains:0,selected:[],helps:3,done:false,result:null}}
async function start(i){
 if(busy||!Number.isInteger(i)||i< -1||i>14||(i>0&&!save.stars[i]))return;
 if(game&&!game.done){
  clearTransient();const old=snapshot();
  if(!confirm('途中のパズルがあります。現在の盤面を退避して、新しい挑戦をはじめますか？'+((!FryStore.locks||FryStore.phase==='unavailable')?' この環境では変更と退避はメモリ内だけです。':'')))return;
  const next=FryStore.validate(old);const candidate=makeAttempt(i),previousGame=game;game=candidate;ensure();save={...next,screen:'game'};const replacement=snapshot();game=previousGame;save=old;
  if(!await replaceState(replacement,old))return;
 }else{invalidateIO();game=makeAttempt(i);ensure();save.screen='game';inputPaused=false;closeModal();renderGame();persist();}
}
function select(i){
 if(!canPlay()||!Number.isInteger(i)||i<0||i>=36)return;
 const g=game,p=g.selected;invalidateIO();
 if(!p.length)p.push(i);else if(p.length>1&&i===p[p.length-2])p.pop();else if(!p.includes(i)&&g.board[i]===g.board[p[0]]&&adjacent(i,p.at(-1)))p.push(i);else if(!p.includes(i)&&g.board[i]!==g.board[p[0]])g.selected=[i];
 document.querySelectorAll('[data-tile]').forEach(b=>b.classList.toggle('selected',g.selected.includes(+b.dataset.tile)));tone(420+g.selected.length*70);
}
function paint(){
 const g=game;if(!g||!$('.board'))return;const focused=document.activeElement?.dataset?.tile;
 $('.board').innerHTML=g.board.map((t,i)=>`<button aria-label="${names[t]} ${Math.floor(i/6)+1}行${i%6+1}列" class="tile ${g.selected.includes(i)?'selected':''}" data-tile="${i}"><img draggable="false" src="${asset(`friend${t}.webp`)}" alt=""><span>${names[t].replace('ちゃん','').replace('くん','').replace('さん','')}</span></button>`).join('');
 document.querySelectorAll('[data-tile]').forEach(b=>{b.onkeydown=e=>{
  if(e.repeat)return;
  if(e.key==='Enter'||e.key===' '){e.preventDefault();select(+b.dataset.tile)}
  const step={ArrowLeft:-1,ArrowRight:1,ArrowUp:-6,ArrowDown:6}[e.key];if(step){e.preventDefault();const n=+b.dataset.tile+step;if(n>=0&&n<36)$(`[data-tile="${n}"]`)?.focus()}
  if(e.key==='Escape'){e.preventDefault();clearTransient()}
 };b.onclick=e=>{if(e.detail===0)select(+b.dataset.tile)}});
 $('#moves').textContent=g.moves;$('#score').textContent=g.score+' 点';$('#goal').textContent=g.index<0?'自己ベスト：'+save.endless+' 点':g.c.chainGoal?`${g.c.chainGoal}個以上の連鎖 ${g.chains} / ${g.c.target} 回`:g.c.type<0?`目標 ${g.c.target} 点`:`${names[g.c.type]} ${g.count} / ${g.c.target} 個`;
 $('#progress').style.width=Math.min(100,100*(g.c.chainGoal?g.chains:g.c.type<0?g.score:g.count)/g.c.target)+'%';$('#shuffle').textContent=`おたすけ（${g.helps}）`;updatePause();if(focused!==undefined)$(`[data-tile="${focused}"]`)?.focus();
}
function bindBoard(){
 const board=$('.board');
 board.onpointerdown=e=>{if(!canPlay()||(e.button!==undefined&&e.button!==0)||e.isPrimary===false||drag)return;const el=e.target.closest('[data-tile]');if(!el||!board.contains(el))return;e.preventDefault();drag={id:e.pointerId,origin:+el.dataset.tile,moved:false};select(drag.origin)};
 board.onpointermove=e=>{if(!drag||e.pointerId!==drag.id||!canPlay())return;const el=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-tile]');if(!el||!board.contains(el)){clearTransient();return}if(+el.dataset.tile!==game.selected.at(-1)){drag.moved=true;select(+el.dataset.tile)}};
 board.onpointerup=e=>{if(!drag||e.pointerId!==drag.id)return;const commitDrag=drag.moved;drag=null;if(commitDrag)commit()};
 board.onpointercancel=()=>clearTransient();board.onpointerleave=()=>{if(drag)clearTransient()};board.onlostpointercapture=()=>{if(drag)clearTransient()};
}
function commit(){
 if(!canPlay())return;const g=game,p=[...g.selected];
 if(p.length<3){$('#message').textContent='同じ仲間を３個以上つなごう。';return}
 if(new Set(p).size!==p.length||p.some((i,n)=>!Number.isInteger(i)||i<0||i>=36||g.board[i]!==g.board[p[0]]||(n>0&&!adjacent(i,p[n-1])))){clearTransient();return}
 invalidateIO();drag=null;const type=g.board[p[0]],n=p.length,points=10*n*(n-2);g.moves--;g.score+=points;g.typeCounts[type]+=n;if(g.c.chainGoal&&n>=g.c.chainGoal)g.chains++;if(type===g.c.type)g.count+=n;if(!save.seen.includes(type))save.seen.push(type);if(n>=6)save.coins+=n;
 for(let col=0;col<6;col++){const remain=[];for(let row=5;row>=0;row--){const i=row*6+col;if(!p.includes(i))remain.push(g.board[i])}for(let row=5;row>=0;row--)g.board[row*6+col]=remain[5-row]??random()}
 g.selected=[];const reshuffled=ensure();const win=g.index>=0&&(g.c.chainGoal?g.chains:g.c.type<0?g.score:g.count)>=g.c.target;
 if(win||g.moves<=0)finish(win);else persist();paint();tone(980);$('#message').textContent=`${n}連鎖！ +${points}点 ${n>=6?'きらめき +'+n:''}${reshuffled?' ／ 盤面を自動で並べ直したよ。':''}`;
}
function finish(win){
 const g=game;if(!g||g.done)return;g.done=true;clearTransient();const stars=g.index>=0&&win?(g.moves>=9?3:g.moves>=5?2:1):0;let bonus=0;
 if(g.index<0)save.endless=Math.max(save.endless,g.score);else if(win){const old=save.stars[g.c.id]||0;bonus=Math.max(0,stars-old)*20;save.coins+=bonus;save.stars[g.c.id]=Math.max(old,stars);save.best[g.c.id]=Math.max(save.best[g.c.id]||0,g.score)}
 g.result={win:!!win,stars,bonus};persist();renderGame();showResult();
}
function shuffle(){if(!canPlay())return;if(!game.helps){$('#message').textContent='おたすけは使い切ったよ。ヒントも試してね。';return}invalidateIO();clearTransient();game.helps--;game.board=Array.from({length:36},random);ensure();paint();persist();$('#message').textContent='新しい並びで、もう一度！'}
function hint(){if(!canPlay())return;invalidateIO();drag=null;game.selected=(game.c.chainGoal?findPath(game.board,game.c.chainGoal):null)||findPath(game.board)||[];paint();$('#message').textContent=`光った${game.selected.length}個を決定してみよう。`}
function renderHome(){app.innerHTML=`<section class="hero"><div><div class="eyebrow">FRY FRIENDS · STORY PUZZLE</div><h1>つなげよう、<br>サクサクの友情。</h1><p>黄金色の温泉で、ほっとひと息。<br>同じ仲間を３個以上つないで、<br>15のお話をめぐる、やさしいパズル。</p><div class="actions"><button class="primary" id="go">温泉へ出かける →</button><button id="how">あそびかた</button></div><div class="stats"><div><b>${Object.keys(save.stars).length}<small>／${chapters.length}話 クリア</small></b></div><div><b>${Object.values(save.stars).reduce((a,b)=>a+b,0)}<small>／${chapters.length*3} おもいで星</small></b></div><div><b>${save.coins}<small>きらめき</small></b></div></div></div><img src="assets/ep1-0.webp?v=0.3.0-web.2" alt="黄金色の温泉に集まるフライフレンズ"></section>${game?`<div class="resume"><p>${game.done?'前のパズル結果':'途中のパズル'}：${game.c.title} ／ 残り${game.moves}手・${game.score}点</p><button id="resume" class="primary">${game.done?'結果を見る':'途中からつづける'}</button></div>`:''}<div class="sectionHead" id="chapters"><h2>おはなしの小道</h2><span class="pill">全15話・完結</span></div><section class="cards">${chapters.map((c,i)=>`<article class="card"><img src="assets/ep${c.id}-0.webp?v=0.3.0-web.2" alt="第${c.id}話 表紙"><div><small>EPISODE ${String(c.id).padStart(2,'0')}</small><h3>${c.title}</h3><p class="muted">${c.tag}<br>${'★'.repeat(save.stars[c.id]||0)}${'☆'.repeat(3-(save.stars[c.id]||0))}</p><button data-ch="${i}" ${i&&!save.stars[i]?'disabled':''}>${i&&!save.stars[i]?'前のお話で解放':'このお話で遊ぶ'}</button><button data-read="${c.id}">原作を読む</button></div></article>`).join('')}</section><div class="sectionHead"><h2>温泉のよりみち</h2></div><div class="actions"><button id="endless">とことんサクサク（最高 ${save.endless} 点）</button><button id="friends">なかま図鑑 ${save.seen.length+(save.stars[3]?1:0)+(save.stars[9]?1:0)+(save.stars[10]?1:0)}/10</button>${save.stars[15]?'<button id="ending">♨ 全15話クリア記念</button>':''}<button id="reset">セーブをリセット</button></div><p class="muted">原作全15話を収録した完結版です。各話をクリアすると、次のお話が開きます。ゲームの目標・点数・会話の選択肢はゲーム版の創作です。</p>`;if($('#ending'))$('#ending').onclick=ending;$('#go').onclick=()=>$('#chapters').scrollIntoView({behavior:'smooth'});$('#how').onclick=how;document.querySelectorAll('[data-ch]').forEach(b=>b.onclick=()=>intro(+b.dataset.ch));document.querySelectorAll('[data-read]').forEach(b=>b.onclick=()=>reader(+b.dataset.read));$('#friends').onclick=friends;$('#endless').onclick=()=>start(-1);$('#reset').onclick=resetRecord;if($('#resume'))$('#resume').onclick=resume}
function how(){popup('<h2>３個つないで、サクッ！</h2><p>同じ仲間を、上下・左右・ななめに３個以上つなぎます。指やマウスでなぞって離すか、１個ずつタップして「つないだ仲間を決定」を押してください。１つ前へ戻ると、つなぎ直せます。</p><p>３個で30点、４個で80点、５個で150点。長い連鎖ほど高得点！ ６個以上で追加のきらめきがもらえます。</p><p>手数以内に目標を達成すると次のお話が開きます。失敗しても何度でも無料で挑戦できます。つながらない盤面は自動で並べ直します。</p><p>「おたすけ」は１回の挑戦で３回まで。手数を使わず並べ直せます。音は右上で切り替え。盤面・手数・記録・音の設定は保存対応環境で自動保存します。上部の保存状態をご確認ください。途中で小道へ戻っても、つづきから再開できます。</p>')}
function intro(i){if(busy||!Number.isInteger(i)||i<0||i>=15||(i>0&&!save.stars[i]))return;const c=chapters[i];popup(`<img class="storyimg" src="assets/ep${c.id}-1.webp?v=0.3.0-web.2" alt="原作の場面"><h2>第${c.id}話 ${c.title}</h2><p>${c.intro}</p>${i===3?'<p>タミーちゃんが元気のないとき、どうしよう？</p><button id="kind">話してくれるまで、そばで待つ</button><p id="kindReply" class="muted"></p>':''}<p class="tip">${c.goal}</p><button class="primary" id="start">パズルをはじめる</button>`, 'intro');bindModalAction('#start',()=>{if(modalKind!=='intro')return;closeModal();start(i)});if(i===3)bindModalAction('#kind',()=>{$('#kindReply').textContent='タミーちゃん「ありがとう。みんながそばにいてくれて、うれしいな。」'})}
function friends(){popup(`<h2>なかま図鑑</h2><p>７人はパズルでつなぐと登録。ゲストの３人はお話のクリアで登場します。</p><div class="friends">${names.map((n,i)=>`<article class="panel">${save.seen.includes(i)?`<img src="assets/friend${i}.webp?v=0.3.0-web.2" alt="${n}"><h3>${n}</h3><p>${desc[i]}</p>`:'<h3>？</h3><p>この仲間を３個以上つないでみよう。</p>'}</article>`).join('')}${[{id:3,name:'コロンボくん',desc:'コロッケ村から来たお客様。勇気を出して温泉へ一歩踏み出し、お友達になりました。'},{id:9,name:'アジキくん',desc:'第９話に登場。みんなと力を合わせて温泉を助け、フライフレンズの仲間になりました。'},{id:10,name:'カツコさん',desc:'旅館女将。お茶と料理が得意な、ほっこり亭の新しいお友達です。'}].map(f=>`<article class="panel">${save.stars[f.id]?`<img src="assets/guest${f.id}.webp?v=0.3.0-web.2" alt="${f.name}"><h3>${f.name}</h3><p>${f.desc}</p>`:`<h3>新しいお友達 ？</h3><p>第${f.id}話をクリアすると登場。</p>`}</article>`).join('')}</div><p class="muted">絵は原作からの切り抜きです。ゲストの３人はお話と図鑑に登場します。</p>`)}
let readPage=0;function reader(ep,page=0){if(!Number.isInteger(ep)||ep<1||ep>15||!Number.isInteger(page)||page<0||page>6)return;readPage=page;popup(`<div class="reader"><button id="prev" ${page===0?'disabled':''}>← 前</button><span>第${ep}話 ${page+1}/7</span><button id="next" ${page===6?'disabled':''}>次 →</button></div><img class="readerImage" src="assets/ep${ep}-${page}.webp?v=0.3.0-web.2" alt="原作 第${ep}話 ${page+1}ページ">`);bindModalAction('#prev',()=>{closeModal();reader(ep,page-1)});bindModalAction('#next',()=>{closeModal();reader(ep,page+1)})}
function renderGame(){const g=game,c=g.c;app.innerHTML=`<div class="sectionHead"><div><div class="eyebrow">${g.index<0?'FREE PLAY':'EPISODE '+String(c.id).padStart(2,'0')}</div><h2>${c.title}</h2></div><button id="back">小道へ戻る</button></div><p class="pause-notice" id="pauseNotice" hidden>入力を一時停止しました。<button id="resumeInput">パズルを再開</button></p>${g.done?'<button id="resultAgain">結果を見る</button>':''}<div class="gameLayout"><div><div class="board" aria-label="仲間パズル盤面"></div><div class="actions"><button class="primary" id="commit">つないだ仲間を決定</button><button id="cancel">選択をやめる</button></div><p class="muted">なぞって離す ／ またはタップして決定<br>同じ仲間を３個以上、ななめもOK！</p></div><aside class="panel"><span class="pill">のこり <b id="moves"></b> 手</span><div class="score" id="score"></div><p id="goal"></p><div class="meter"><i id="progress"></i></div><p class="tip">${c.goal}</p><p class="toast" id="message" aria-live="polite">仲間を３個以上つないでね。</p><div class="actions"><button id="hint">ヒント</button><button id="shuffle">おたすけ（３）</button><button id="help">あそびかた</button></div><p class="muted">星の目安：クリアで★、残り５手で★★、残り９手で★★★。<br>きらめきはクリアや長い連鎖で集まる記念ポイントです。</p></aside></div>`;$('#back').onclick=home;$('#commit').onclick=commit;$('#cancel').onclick=clearTransient;$('#help').onclick=how;$('#shuffle').onclick=shuffle;$('#hint').onclick=hint;$('#resumeInput').onclick=()=>{inputPaused=false;clearTransient();updatePause();$('#message').textContent='新しく選んで再開しよう。'};if($('#resultAgain'))$('#resultAgain').onclick=showResult;paint();bindBoard()}
function showResult(){const g=game;if(!g||!g.done||!g.result)return;const {win,stars,bonus}=g.result;popup(`<div class="empty"><div class="eyebrow">${g.index<0?'FREE PLAY RESULT':win?'STORY CLEAR':'TRY AGAIN'}</div><h2>${g.index<0?'サクサク、おつかれさま！':win?'みんなの笑顔がつながった！':'もういちど、のんびり挑戦。'}</h2><div class="score">${g.index>=0&&win?'★'.repeat(stars):g.score+' 点'}</div><p>${g.index<0?'自己ベスト '+save.endless+' 点':win?g.c.end:'長くつなぐと得点アップ。ヒントやおたすけも使ってみよう。'}</p>${win?`<p>星の更新ボーナス：きらめき +${bonus}</p>`:''}<div class="actions"><button class="primary" id="retry">もう一度遊ぶ</button>${win&&g.index>=0&&g.index<chapters.length-1?'<button id="continue">次のお話へ →</button>':''}<button id="resultHome">小道へ戻る</button></div>${win&&g.index===chapters.length-1?'<button class="primary" id="showEnding">みんなとの記念写真へ →</button><p>全15話クリア、おめでとう！ お話はここで完結です。星集めや自己ベストへの挑戦は、何度でも楽しめます。</p>':''}</div>`, 'result');if($('#showEnding'))bindModalAction('#showEnding',()=>{if(game!==g||modalKind!=='result')return;closeModal();ending()});bindModalAction('#retry',()=>{if(game!==g||!g.done||modalKind!=='result')return;closeModal();start(g.index)});bindModalAction('#resultHome',()=>{if(game===g&&modalKind==='result')home()});if($('#continue'))bindModalAction('#continue',()=>{if(game!==g||modalKind!=='result')return;closeModal();intro(g.index+1)})}
function ending(){if(!save.stars[15])return;const stars=Object.values(save.stars).reduce((a,b)=>a+b,0);popup(`<div class="empty"><div class="eyebrow">FRY FRIENDS · STORY COMPLETE</div><h2>笑顔も友情も、黄金色！</h2><p>全15話クリア、おめでとう！</p><img src="assets/ep15-6.webp?v=0.3.0-web.2" alt="最終話 みんなで撮った記念写真"><p>カリンちゃんたちとつないだ、あたたかい思い出。<br>お話は完結。これからも、ずっと仲間だよ。</p><div class="stats"><div><b>15<small>話 クリア</small></b></div><div><b>${stars}/45<small>おもいで星</small></b></div><div><b>${save.coins}<small>きらめき</small></b></div></div><p>${stars===45?'すべての星がそろいました。サクサク友情マスター！':'小道に戻って、まだ集めていない星にも挑戦してみよう。'}</p><p class="muted">原作：フライフレンズ 第1話〜第15話<br>キャラクター・背景・お話の絵は、ご提供の原作PDFから使用。<br>ゲーム版のルール・点数・目標・要約は原作をもとに構成。</p><button id="endingHome" class="primary">小道に戻って、また遊ぶ</button></div>`);bindModalAction('#endingHome',()=>{closeModal();home()})}
function renderRecords(){
 popup('<h2>記録・バックアップ</h2><p>星・最高点・きらめき・図鑑・音の設定・途中の盤面と結果を、まとめてJSONに保存できます。端末やブラウザを変えるときも、このファイルで復元します。</p><p class="notice">'+notices[FryStore.phase]+'</p><div class="backup-actions"><button id="export" class="primary">記録JSONを書き出す</button><button id="import">JSONから復元</button><button id="backup">直前の記録を復元用JSONに書き出す</button><button id="backupRaw">退避した元データを保管用に書き出す</button><button id="raw">元の保存データを書き出す</button><button id="retrySave">保存を再試行</button><button id="resetRecord">記録をリセット</button></div><p id="recordMessage" role="status" aria-live="polite"></p><p class="muted">復元とリセットは確認後に実行し、直前の記録を退避します。復元用JSONは、途中の盤面を含む直前の全記録です。退避した元データは別の保管用テキストとして取り出せます。壊れた元データをそのままゲームへ復元することはできません。JSONは他のサービスへ送信しません。壊れた・未対応の記録は黙って修正しません。別タブとの競合時は、書き出してから再読込してください。</p>','records');
 bindModalAction('#export',()=>download(FryStore.encode(snapshot()),'fryfriends-record.json'));
 bindModalAction('#import',()=>{invalidateIO();clearTransient();$('#importFile').click()});
 bindModalAction('#backup',()=>{try{const b=FryStore.backupRecovery();if(b)download(b,'fryfriends-previous-record.json');else recordMessage('退避記録はまだありません。')}catch{recordMessage('復元用の退避記録を読み出せませんでした。元のデータは変更していません。')}});
 bindModalAction('#backupRaw',()=>{try{const raw=FryStore.backupRaw();if(raw!==null)download(raw,'fryfriends-archived-original-data.txt');else recordMessage('退避した元データはありません。')}catch{recordMessage('保管用の元データを読み出せませんでした。保存内容は変更していません。')}});
 bindModalAction('#raw',()=>{if(FryStore.baseline!==null)download(FryStore.baseline,'fryfriends-original-data.txt');else recordMessage('元の保存データはありません。')});
 bindModalAction('#retrySave',()=>{if(busy)return;invalidateIO();FryStore.retry();persist()});bindModalAction('#resetRecord',resetRecord);
}
function recordMessage(text){if($('#recordMessage'))$('#recordMessage').textContent=text;else $('#saveStatus').textContent=text}
function download(raw,name){
 try{const url=URL.createObjectURL(new Blob([raw],{type:name.endsWith('.txt')?'text/plain;charset=utf-8':'application/json;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);recordMessage('ダウンロードを開始しました。ブラウザの保存先をご確認ください。')}catch{recordMessage('ファイルを書き出せませんでした。ブラウザのダウンロード設定をご確認ください。')}
}
async function replaceState(next,previous,token=++ioEpoch){
 const before=JSON.stringify(previous);busy=true;clearTransient();
 const valid=()=>token===ioEpoch&&JSON.stringify(snapshot())===before;
 let ok=false;
 if(!FryStore.locks||FryStore.phase==='unavailable'){
  if(valid()){FryStore.rememberBackup(previous);ok=true}
 }else ok=await FryStore.commit(next,{replace:true,previous,shouldContinue:valid});
 if(token!==ioEpoch)return false;
 busy=false;
 if(!ok){recordMessage('復元・変更は実行されませんでした。現在の記録と元の保存を保持しています。上部の保存状態をご確認ください。');return false}
 save=FryStore.validate(next);restoreAttempt();inputPaused=false;closeModal();updateSound();suspendAudio();
 if(save.screen==='game'){renderGame();if(game.done)showResult()}else renderHome();return true;
}
async function resetRecord(){
 if(busy)return;invalidateIO();clearTransient();const previous=snapshot();
 const memory=!FryStore.locks||FryStore.phase==='unavailable';
 if(!confirm('星・記録・図鑑・きらめき・途中のパズル・音の設定をリセットしますか？直前の記録は退避します。'+(memory?' この環境では変更と退避はメモリ内だけで、画面を閉じると失われます。':'')))return;
 await replaceState(FryStore.blank(),previous);
}
$('#importFile').addEventListener('cancel',invalidateIO);
$('#importFile').onchange=async e=>{
 invalidateIO();clearTransient();const token=ioEpoch,file=e.target.files?.[0];e.target.value='';if(!file)return;
 try{
  if(file.size>FryStore.MAX_BYTES*3)throw Error('size');
  const raw=await file.text();if(token!==ioEpoch)return;
  let next;try{next=FryStore.decode(raw).state}catch{next=FryStore.decodeBackup(raw)}
  if(token!==ioEpoch)return;const previous=snapshot(),memory=!FryStore.locks||FryStore.phase==='unavailable';
  if(!confirm('選んだJSONの記録へ復元しますか？現在の記録は退避し、星・図鑑・音・途中の盤面と結果を置き換えます。'+(memory?' この環境では復元と退避はメモリ内だけで、画面を閉じると失われます。':'')))return;
  if(token!==ioEpoch)return;await replaceState(next,previous,token);
 }catch{if(token===ioEpoch){busy=false;recordMessage('復元できませんでした。形式・版・内容を確認してください。現在の記録は変更していません。')}}
 finally{if(token===ioEpoch)e.target.value=''}
};
function unsavedChanges(){try{return FryStore.baseline===null?JSON.stringify(snapshot())!==JSON.stringify(FryStore.blank()):JSON.stringify(snapshot())!==JSON.stringify(FryStore.decode(FryStore.baseline).state)}catch{return true}}
let allowCatalogLeave=false;
$('#catalogLink').onclick=e=>{clearTransient();invalidateIO();if(unsavedChanges()&&!confirm('現在の記録は、このブラウザへの保存が完了していません。必要なら「記録・バックアップ」でJSONを書き出してください。このままZatuPlayへ戻りますか？')){e.preventDefault();return}allowCatalogLeave=true};
window.addEventListener('beforeunload',e=>{if(!allowCatalogLeave&&unsavedChanges()){e.preventDefault();e.returnValue=''}});
$('#records').onclick=renderRecords;
$('#home').onclick=e=>{e.preventDefault();home()};
document.addEventListener('keydown',e=>{if(e.repeat&&['Enter',' ','Escape'].includes(e.key)){e.preventDefault();e.stopImmediatePropagation()}},true);
restoreAttempt();updateSound();if(save.screen==='game'){renderGame();if(game.done)showResult()}else renderHome();
