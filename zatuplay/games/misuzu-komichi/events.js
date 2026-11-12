// Original game characters and dialogue. These are not quotations or author commentary.
const CAST={traveler:{name:'旅人',role:'ことばを集める主人公',desc:'麦わら帽子に緑のケープ。小さな手帳に、自分だけの発見を書き留める。'},shiori:{name:'しおり',role:'小径の案内人',desc:'白い花の髪飾りと赤土色のスカート。本を抱えて、旅の入り口で待っている。'},suzu:{name:'すず',role:'鈴をつけた小鳥',desc:'生成り色の頬、緑のスカーフと金色の鈴。地面に近い、小さな発見が得意。'},akari:{name:'あかり',role:'灯りの配達人',desc:'藍色の髪と星を縫った外套。琥珀色のランタンで、帰り道をそっと照らす。'}};
const portraits={};Object.keys(CAST).forEach(k=>{portraits[k]=new Image();portraits[k].src='assets/'+k+'.svg?v=0.2-web.1'});
state.events=Array.isArray(state.events)?state.events.filter(i=>Number.isInteger(i)&&i>=0&&i<36):[];
state.eventChoices=state.eventChoices&&typeof state.eventChoices==='object'?state.eventChoices:{};
let activeEvent=null,eventPage=0,eventChoice=0,autoCooldown=0;
const SCENES=[
 ['帽子を押さえると、やわらかな風が手のひらを通り抜けた。','草の間を、小さな影が跳ねた。','帰り道にも、朝とは違う風が吹いていた。'],
 ['波打ち際に、一冊の本を抱えた人が立っている。','水面に映る空を、小鳥が不思議そうにのぞき込む。','潮風の中で、ランタンがゆっくりと揺れている。'],
 ['花の影に隠れていた道が、足元から続いている。','小鳥が花びらを一枚、そっとよけた。','夕方の庭に、丸い光がひとつともった。'],
 ['空を映す水たまりのそばで、案内人が手を振った。','小鳥が、遠くの雲と同じ方を向いている。','空の色が変わるまで、二人は少し立ち止まった。'],
 ['町の窓辺で、本のページが風にめくれた。','軒先から、小鳥の鈴が小さく鳴る。','窓の明かりをたどって、配達人が歩いてきた。'],
 ['葉に残ったしずくが、案内人の袖に落ちた。','小鳥が水たまりをよけて、一歩だけ跳んだ。','濡れた小径に、灯りが細く映っている。'],
 ['夕映えの岸辺で、案内人が赤い空を見上げた。','砂に残った足跡を、小鳥が追いかけている。','水平線の上に、まだ小さな光が残っていた。'],
 ['丘にのぼると、本を抱えた人の影が長く伸びた。','草の先で、小鳥が夜の音に耳を傾けた。','星を待つ丘に、ランタンのあたたかい色が浮かぶ。'],
 ['庭の入り口で、案内人が足元を指さした。','小鳥が、草の間にできた小さな通り道を見つけた。','花を踏まないように、配達人が灯りを低くした。'],
 ['古い小路の曲がり角で、見覚えのある花飾りが揺れた。','小鳥の足音が、静かな石畳に響く。','配達人が、手帳を閉じるあなたを待っていた。'],
 ['雲の影が流れる場所で、案内人が本を開いた。','小鳥が風に羽を広げ、すぐにまた降りてきた。','雲の切れ間に、夜の色が少しだけのぞいた。'],
 ['長い旅の先で、案内人がいつものようにほほえんだ。','小鳥が、旅のはじまりと同じ音で鈴を鳴らす。','帰り道の灯りを持って、配達人が立っていた。']
];
function eventDef(id){const ch=Math.floor(id/3),slot=id%3,k=['shiori','suzu','akari'][slot],p=POEMS[ch*43+[0,21,42][slot]];return {id,ch,slot,k,p,title:[`「${chapters[ch][0]}」の入り口`,`すずが見つけた小さな道`,`あかりの帰り便り`][slot],scene:SCENES[ch][slot],x:[735,460,700][slot],y:[200,910,1780][slot]}}
function eventPortrait(k,extra=''){return `<img class="character-art ${extra}" src="assets/${k}.svg?v=0.2-web.1" alt="${CAST[k].name}の全身立ち絵">`}
function showEvent(id){if(busy||paused)return;activeEvent=id;eventPage=0;eventChoice=0;renderEvent()}
function renderEvent(){const e=eventDef(activeEvent),c=CAST[e.k];const dialogue=e.slot===0?['ようこそ。私はしおり。この小径では、急がなくても大丈夫。気になった灯りに、あなたの速さで近づいてね。',`この章には43の灯りがあるの。たとえば「${e.p.title}」。まずは景色を眺める？　それとも、題名から会いに行ってみる？`]:e.slot===1?['こんにちは！　ぼくはすず。上から見るのと、草のそばから見るのとで、道はずいぶん違って見えるんだ。',`この近くに「${e.p.title}」の灯りがあるよ。ぼくと一緒に、いつもと違う高さで景色を眺めてみない？`]:['私はあかり。灯りの配達をしているんだ。見つけたことばを持って帰る人の、足元を照らすのが仕事だよ。',`この小径の最後の灯りは「${e.p.title}」。読み終えたあと、何を手帳に残したい？　答えはひとつじゃなくていい。`];
const choices=[['景色をゆっくり眺める','題名の灯りを探す'],['小鳥の目線になってみる','風の音に耳をすます'],['出会った景色を思い出す','気になる詩をもう一度読む']][e.slot];
let body=eventPage===0?`<p class="scene-text">${esc(e.scene)}</p><div class="speech"><span>${c.name}</span><p>${esc(dialogue[0])}</p></div><button class="primary" onclick="eventNext()">話を聞く　→</button>`:eventPage===1?`<div class="speech"><span>${c.name}</span><p>${esc(dialogue[1])}</p></div><div class="event-options">${choices.map((s,i)=>`<button onclick="eventPick(${i})">${s}　→</button>`).join('')}</div>`:`<div class="speech"><span>${c.name}</span><p>${esc(e.slot===0?(eventChoice===0?'それじゃ、足元の色をひとつ見つけてから歩こう。灯りは逃げないから。':'うん。その題名を道しるべにしよう。地図の金色の輪が、次の灯りだよ。'):e.slot===1?(eventChoice===0?'目を少し低くすると、草の間にも道が見えてくるね。今日は、その気持ちを旅の記録に残そう。':'静かにしていると、遠くと近くで違う音がするね。どの音が気になったか、覚えておこう。'):(eventChoice===0?'今日の景色は、手帳を閉じてもあなたの中に残る。次に来たら、また違って見えるかもしれないね。':'何度でも帰っておいで。同じことばの前で立ち止まる時間も、旅のひとつだから。'))}</p></div><p class="sub">旅のしおり：${esc(choices[eventChoice])}</p><button class="primary" onclick="finishEvent()">出会いを記録して小径へ　→</button>`;
openModal(panelTop(esc(e.title))+`<div class="event-layout"><div class="portrait-stage">${eventPortrait(e.k)}<div class="portrait-name">${c.name}<small>${c.role}</small></div></div><section class="event-copy"><div class="eyebrow">CHAPTER ${e.ch+1} · ENCOUNTER ${e.slot+1} / 3</div>${body}<p class="notice">登場人物・会話・出来事はゲームの創作です。金子みすゞの詩文や発言ではありません。</p></section></div>`,true);$('#panel').classList.add('event-panel');
}
window.eventNext=()=>{eventPage=1;renderEvent()};window.eventPick=i=>{eventChoice=i;eventPage=2;renderEvent()};
window.finishEvent=()=>{const e=eventDef(activeEvent);if(!state.events.includes(e.id))state.events.push(e.id);state.eventChoices[e.id]=eventChoice;state.waypoint=e.p.id;save();meter();closeModal();autoCooldown=performance.now()+2500;tone();toast(`${CAST[e.k].name}との出会いを記録しました（${state.events.length}/36）`)};
const closeBase=closeModal;closeModal=function(){closeBase();$('#panel').classList.remove('event-panel');autoCooldown=performance.now()+3500};window.closeModal=closeModal;
function characters(){openModal(panelTop('小径で出会う仲間たち')+`<p class="notice">主人公と3人の案内役。衣装・小物・顔立ちを描いたベクター画を、立ち絵とマップに共通使用しています。全員ゲーム用のオリジナルキャラクターです。</p><div class="cast-grid">${Object.entries(CAST).map(([k,c])=>`<article class="cast-card">${eventPortrait(k)}<h3>${c.name}</h3><p class="eyebrow">${c.role}</p><p>${c.desc}</p></article>`).join('')}</div><h2>出会いの記録　${state.events.length} / 36</h2><p class="notice">各章に3つの会話イベント。章の入り口ではしおりが登場し、道の途中では近づくと会話が始まります。記録済みの出会いはここで再生できます。</p><div class="chapterlist">${Array.from({length:36},(_,id)=>{const e=eventDef(id),done=state.events.includes(id);return `<button class="card" onclick="${done?'showEvent('+id+')':'go('+e.ch+')'}"><small>第${e.ch+1}章 · ${CAST[e.k].name} · ${done?'記録済み / 再生':'未記録 / この章へ'}</small><b>${esc(e.title)}</b></button>`}).join('')}</div>`,true)}window.showEvent=showEvent;
const castButton=document.createElement('button');castButton.textContent='仲間・イベント';castButton.onclick=characters;document.querySelector('nav').insertBefore(castButton,$('#settings'));
function drawCharacter(c,k,x,y,t,size=86,moving=false){const im=portraits[k];if(!im.complete||!im.naturalWidth)return;const ratio=k==='suzu'?280/300:280/440,h=size,w=h*ratio,bob=moving?Math.sin(t*13)*2:Math.sin(t*1.8)*1.2;c.save();c.translate(x,y+bob);if(moving)c.rotate(Math.sin(t*13)*.025);c.drawImage(im,-w/2,-h,w,h);c.restore()}
function drawEncounters(t){for(let slot=0;slot<3;slot++){const e=eventDef(state.chapter*3+slot),x=e.x-camera.x,y=e.y-camera.y,done=state.events.includes(e.id);circle(ctx,x,y-12,38,'#f6e9bd40');drawCharacter(ctx,e.k,x,y,t,e.k==='suzu'?59:96);ctx.textAlign='center';ctx.font='12px serif';ctx.fillStyle='#35564a';ctx.fillText(CAST[e.k].name,x,y+15);circle(ctx,x,y-(e.k==='suzu'?75:110),11,done?'#739578':'#bf9950');ctx.fillStyle='#fff8df';ctx.font='bold 12px sans-serif';ctx.fillText(done?'✓':'!',x,y-(e.k==='suzu'?71:106));const d=Math.hypot(state.x-e.x,state.y-e.y);if(d<95){near={...e,kind:'event'};if(!done&&!modalOpen&&!paused&&!busy&&performance.now()>autoCooldown)showEvent(e.id)}}if(state.waypoint&&Math.floor((state.waypoint-1)/43)===state.chapter){const p=nodePos((state.waypoint-1)%43);ctx.strokeStyle='#b48a3e';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x-camera.x,p.y-camera.y,30+Math.sin(t*2)*4,0,7);ctx.stroke()}}
function interactNear(){if(!near){toast('灯りや仲間のそばに近づいてみましょう。');return}if(near.kind==='event')showEvent(near.id);else readPoem(near.id)}
$('#interact').onclick=interactNear;
const startBase=start;start=function(){startBase();const ch=state.chapter;clearTimeout(startTimer);startTimer=setTimeout(()=>{if(playing&&!paused&&!busy&&!modalOpen&&state.chapter===ch&&!state.events.includes(ch*3))showEvent(ch*3)},550)};$('#start').onclick=()=>start();
// Keyboard interactions are unified in browser.js.
const meterBase=meter;meter=function(){meterBase();$('#progress').textContent+=`　出会い ${state.events.length}/36`};meter();
