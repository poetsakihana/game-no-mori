
const $=id=>document.getElementById(id),suits=['♥','♦','♠','♣'],ranks=['','A','2','3','4','5','6','7','8','9','10','J','Q','K'];
const defaults={sound:true,volume:40,motion:true,theme:'green',contrast:false,big:false,pattern:'stripe',timer:true,moves:true,hints:true,undo:true,confirm:true,auto:false,draw:1,hand:'right'};
const SAVE_KEY='battlitia-v1', BACKUP_KEY=SAVE_KEY+'.before-reset';
let data,storageWarning=false,storageBlock=false,baseRaw=null;
function readSave(raw){
 if(raw===null)return {unlocked:1,hp:{},records:[],options:{...defaults},trials:{},hpRuleVersion:2};
 let loaded=JSON.parse(raw);
 if(!loaded||typeof loaded!=='object'||Array.isArray(loaded))throw Error('記録の形式が違います。');
 let v={unlocked:1,hp:{},records:[],options:{},trials:{},...loaded};
 v.unlocked=Number.isInteger(v.unlocked)?Math.max(1,Math.min(101,v.unlocked)):1;
 if(!v.hp||typeof v.hp!=='object'||Array.isArray(v.hp))v.hp={};
 v.hp=Object.fromEntries(Object.entries(v.hp).filter(([k,x])=>k===String(+k)&&Number.isInteger(+k)&&+k>=1&&+k<=100&&Number.isFinite(x)&&x>=0).map(([k,x])=>{
  let n=+k;
  let oldMax=10+Math.floor((n-1)/5)*10+(n%10===0?20:0);
  return [k,v.hpRuleVersion===2?x:Math.max(0,n*60-Math.max(0,oldMax-x))];
 }));
 v.hpRuleVersion=2;
 v.records=Array.isArray(v.records)?v.records.filter(r=>r&&Number.isFinite(r.id)&&Number.isFinite(r.time)&&r.time>=0&&Number.isInteger(r.moves)&&r.moves>=0).slice(-1000):[];
 v.trials=v.trials&&typeof v.trials==='object'&&!Array.isArray(v.trials)?Object.fromEntries(Object.entries(v.trials).filter(([k,x])=>['opening','bridge','last-deal'].includes(k)&&Number.isInteger(x)&&x>=1&&x<=10000)):{};
 const supplied=v.options&&typeof v.options==='object'&&!Array.isArray(v.options)?v.options:{};
 v.options={...defaults};
 for(const [key,fallback] of Object.entries(defaults)){
  const x=supplied[key];
  if(typeof fallback==='boolean'){if(typeof x==='boolean')v.options[key]=x;}
  else if(key==='volume'){if(Number.isFinite(x))v.options[key]=Math.max(0,Math.min(100,x));}
  else if(key==='draw'){if([1,3,'1','3'].includes(x))v.options[key]=+x;}
  else if(({theme:['green','blue'],pattern:['stripe','solid'],hand:['right','left']}[key]||[]).includes(x))v.options[key]=x;
 }
 return v;
}
try{baseRaw=localStorage.getItem(SAVE_KEY);data=readSave(baseRaw);}catch{storageWarning=true;storageBlock=true;data=readSave(null);}
let g=null,screen='title',lastRecord=null,ac;
function sameSave(){
 if(storageBlock)throw Error('保存を保護しています。別のタブを閉じてから再読み込みしてください。');
 if(localStorage.getItem(SAVE_KEY)!==baseRaw){storageBlock=true;throw Error('別のタブで記録が変わりました。再読み込みしてください。');}
}
function persist(next){
 sameSave();
 const raw=JSON.stringify(next);localStorage.setItem(SAVE_KEY,raw);baseRaw=raw;
}
function save(){
 try{persist(data);return true;}
 catch(e){storageWarning=true;toast(storageBlock?'保存を保護しています。再読み込みしてください。':'このブラウザでは進行を保存できません。保存を許可した通常モードで開いてください。');return false;}
}
function sound(f=440){if(!data.options.sound)return;try{ac??=new AudioContext;let o=ac.createOscillator(),v=ac.createGain();o.connect(v);v.connect(ac.destination);v.gain.value=data.options.volume/100*.08;o.frequency.value=f;o.start();v.gain.exponentialRampToValueAtTime(.001,ac.currentTime+.12);o.stop(ac.currentTime+.12)}catch{}}
function toast(t){$('notice').innerHTML='<div class="toast">'+t+'</div>';setTimeout(()=>$('notice').innerHTML='',2800)}function apply(){document.body.className=[!data.options.motion?'no-motion':'',data.options.contrast?'contrast':'',data.options.big?'bigcards':'',data.options.theme==='blue'?'blue':''].join(' ')}
function foot(){return '<footer><span>ひと揃いのカードが、冒険の一撃になる。</span><span>100 STAGES · LOCAL SAVE</span></footer>'}function title(){screen='title';g=null;$('app').innerHTML=`<div class="hero"><div><div class="eyebrow">A LITTLE STRATEGY. A GRAND ADVENTURE.</div><h1>バトリティア</h1><p>カードを重ねて、運命を変えよう。<br>ソリティアからはじまる、100のバトル。</p><button class="btn primary" onclick="menu()">冒険をはじめる　 →</button><p style="font-size:12px">♧ プレイの進み具合は自動で保存されます</p></div><div class="hero-art"><div class="hero-card"><small>K</small>♠</div><div class="hero-card"><small>Q</small>♥</div><div class="hero-card"><small>A</small>♣</div><div class="seal">CARD BATTLE<br><strong>100</strong>STAGES</div></div></div><div class="panel row"><span>♠ 揃える</span><span>♥ 攻撃する</span><span>♣ 次の世界へ</span></div>${foot()}`}
function menu(){screen='menu';g=null;let cleared=Math.min(100,data.unlocked-1);$('app').innerHTML=`<div class="eyebrow">YOUR NEXT ADVENTURE</div><div class="row"><div><h1>今日は、どの冒険へ？</h1><p>一枚ずつ、あなたのペースで進もう。</p></div><div class="tag">QUEST ${cleared} / 100 CLEAR</div></div><div class="cards"><button class="mode" onclick="quest()"><div class="symbol">⚔</div><div class="tag">STORY / 100 STAGES</div><h3>クエスト　↗</h3><p>カードを揃えて敵に挑む。<br>クリアするたび、新たなステージへ。</p><div class="bar"><i style="width:${cleared}%"></i></div><span class="tag">STAGE ${Math.min(100,data.unlocked)} から続ける</span></button><button class="mode" onclick="timeMenu()"><div class="symbol">◷</div><div class="tag">BEAT YOUR BEST</div><h3>タイムアタック　↗</h3><p>全52枚を揃える速さに挑戦。<br>過去の自分を超えていこう。</p><p style="margin-top:20px">${data.records.length?'BEST '+fmt(Math.min(...data.records.map(r=>r.time))):'まだ記録はありません'}</p></button><button class="mode" onclick="start('classic')"><div class="symbol">♧</div><div class="tag">JUST YOU & THE CARDS</div><h3>ソリティア　↗</h3><p>じっくり楽しむクロンダイク。<br>いつものルールで、気ままな一局。</p></button></div><div class="row"><button class="btn primary" onclick="trialMenu()">♣ 詰めソリティア</button>${data.unlocked===101?'<button class="btn" onclick="ending()">♛ エンディングを見る</button>':''}<button class="btn" onclick="options()">⚙ オプション <small>15種類の設定</small></button><button class="btn" onclick="recordsMenu()">セーブ管理</button><button class="btn" onclick="title()">タイトルへ戻る</button></div><div class="panel" style="margin-top:28px"><div class="tag">HOW TO PLAY</div><p style="margin-bottom:0;font-size:13px">場札は赤・黒交互に、K → A の順。組札は同じマークで A → K に。<br>クエストでは1組完成するたび10ダメージ！ 残りHPは再挑戦に引き継ぎます。</p></div>${foot()}`}
const worlds=['芽吹きの森','霧の湿原','砂の王国','氷の回廊','星降る遺跡','炎の山脈','月影の城','天空の庭','深淵の門','王冠の聖域'];const icons=['♟','☘','♜','❄','✦','♨','♞','☁','◈','♛'];function maxHP(n){return n*60}function rule(n){return n>=61?'3枚めくり・山札3周まで':n>=31?'1枚めくり・山札3周まで':n>=11?'1枚めくり・山札5周まで':'1枚めくり・山札は何度でも'}
function quest(){g=null;screen='quest';$('app').innerHTML=`<div class="row"><div><div class="eyebrow">QUEST / WORLD MAP</div><h1>100の挑戦</h1></div><button class="btn" onclick="menu()">← メニュー</button></div><p>敵のHPは引き継ぎ。何度でも挑んで、道を切り拓こう。</p><div class="panel">敵の最大HP：ステージ番号 × 60（1面60・2面120・100面6000）<br>追加ルール：11面〜山札5周 ／ 31面〜山札3周 ／ 61面〜3枚めくり<br><small>10面ごとにボスが登場。更新内容は、この画面でお知らせします。</small></div>${worlds.map((w,j)=>`<h3 style="margin-top:30px"><span style="color:var(--gold)">${String(j+1).padStart(2,'0')} /</span> ${w}</h3><div class="stages">${Array.from({length:10},(_,i)=>{let n=j*10+i+1;return `<button class="stage ${n<data.unlocked?'done':n===data.unlocked?'current':''}" ${n>data.unlocked?'disabled':''} onclick="start('quest',${n})">${n>data.unlocked?'🔒':n<data.unlocked?'✓ ':''}${String(n).padStart(2,'0')}<br><small>${n%10===0?'BOSS':'HP '+(data.hp[n]??maxHP(n))}</small></button>`}).join('')}</div>`).join('')}${foot()}`}
function fmt(ms){let s=Math.floor(ms/1000);return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')}
function timeMenu(){g=null;screen='time';$('app').innerHTML=`<div class="row"><div><div class="eyebrow">TIME ATTACK</div><h1>速さを、記録に。</h1></div><button class="btn" onclick="menu()">← メニュー</button></div><p>通常のクロンダイク・1枚めくりで全組札を完成させよう。<br>同じブラウザに保存した自己記録を、速い順に表示します。</p><button class="btn primary" onclick="start('time')">タイムアタック開始　→</button><h2 style="margin-top:36px">自己ランキング</h2><table><thead><tr><th>順位</th><th>タイム</th><th>手数</th><th>達成日</th></tr></thead><tbody>${data.records.slice().sort((a,b)=>a.time-b.time).map((r,i)=>`<tr class="${r.id===lastRecord?'latest':''}"><td>${i+1}${r.id===lastRecord?' NEW':''}</td><td>${fmt(r.time)}</td><td>${r.moves}</td><td>${new Date(r.id).toLocaleDateString('ja-JP')}</td></tr>`).join('')||'<tr><td colspan="4">最初のクリア記録を残そう。</td></tr>'}</tbody></table>`}
const settingDefs=[['sound','効果音','bool'],['volume','効果音の音量','range'],['motion','画面のアニメーション','bool'],['theme','テーマカラー',['green:フォレスト','blue:ミッドナイト']],['contrast','文字のコントラストを強く','bool'],['big','カードの文字を大きく','bool'],['pattern','カード裏面',['stripe:ストライプ','solid:無地']],['timer','プレイ時間を表示','bool'],['moves','手数を表示','bool'],['hints','ヒントを使う','bool'],['undo','一手戻すを使う','bool'],['confirm','途中退出の確認','bool'],['auto','安全な組札送りを自動化','bool'],['draw','通常ソリティアのめくり枚数',['1:1枚','3:3枚']],['hand','山札の配置',['right:右利き（左側）','left:左利き（右側）']]];
function options(){screen='options';$('app').innerHTML=`<div class="row"><div><div class="eyebrow">MAKE IT YOURS</div><h1>オプション</h1></div><button class="btn" onclick="menu()">← メニュー</button></div><p>15種類の設定。変更は自動保存されます。タイムアタックは公平な固定ルールです。</p><div class="settings">${settingDefs.map(([k,t,type],i)=>`<label class="setting"><span><small style="color:var(--gold)">${String(i+1).padStart(2,'0')}</small>　${t}</span>${type==='bool'?`<input type="checkbox" ${data.options[k]?'checked':''} onchange="opt('${k}',this.checked)">`:type==='range'?`<input aria-label="${t}" type="range" min="0" max="100" value="${data.options[k]}" onchange="opt('${k}',+this.value)">`:`<select onchange="opt('${k}',this.value)">${type.map(x=>{let[v,l]=x.split(':');return `<option value="${v}" ${String(data.options[k])===v?'selected':''}>${l}</option>`}).join('')}</select>`}</label>`).join('')}</div>`}function opt(k,v){data.options[k]=v;save();apply()}
function start(mode,n=1){if(!['quest','classic','time'].includes(mode)||mode==='quest'&&(!Number.isInteger(n)||n<1||n>100||n>data.unlocked))return;screen='game';let deck=[];for(let s=0;s<4;s++)for(let r=1;r<=13;r++)deck.push({s,r,up:false});for(let i=51;i>0;i--){let j=Math.floor(Math.random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]]}let cols=Array.from({length:7},()=>[]);for(let c=0;c<7;c++)for(let j=0;j<=c;j++){let x=deck.pop();x.up=j===c;cols[c].push(x)}g={mode,n,cols,stock:deck,waste:[],found:[[],[],[],[]],sel:null,moves:0,start:Date.now(),end:false,history:[],cycles:0,hp:mode==='quest'?(data.hp[n]??maxHP(n)):0};if(mode==='quest'&&!g.hp){win();return}render()}
function card(c,from,idx,top=0){return `<button class="card ${c.up?(c.s<2?'red':''):'back'} ${g.sel&&g.sel.from===from&&g.sel.idx===idx?'selected':''}" style="top:${top}px;${!c.up&&data.options.pattern==='solid'?'background:#31554a':''}" aria-label="${c.up?ranks[c.r]+suits[c.s]:'伏せ札'}" onclick="pick('${from}',${idx})">${c.up?`${ranks[c.r]}<span class="suit">${suits[c.s]}</span><span class="center">${suits[c.s]}</span>`:''}</button>`}
function render(){if(!g)return;let q=g.mode==='quest',t=g.mode==='trial';$('app').innerHTML=`<div class="row"><div><div class="eyebrow">${q?'QUEST / STAGE '+String(g.n).padStart(2,'0'):g.mode==='time'?'TIME ATTACK':t?'SOLITAIRE PUZZLE':'CLASSIC SOLITAIRE'}</div><h2>${q?worlds[Math.floor((g.n-1)/10)]:t?trials[g.n].title:'ソリティア'}</h2></div><button class="btn" onclick="leave()">← メニュー</button></div>${q?`<div class="enemy panel"><div class="monster">${icons[Math.floor((g.n-1)/10)]}</div><div class="enemy-info"><div class="row"><h3>${g.n%10===0?'守護者':'カードの番人'} Lv.${g.n}</h3><span>HP ${g.hp} / ${maxHP(g.n)}</span></div><div class="bar"><i style="width:${100*g.hp/maxHP(g.n)}%"></i></div><small>${rule(g.n)} · 1組完成で10ダメージ</small></div></div>`:`<p style="margin:8px 0">${t?'4組を完成させよう。金メダル：'+trials[g.n].gold+'手以内。クエストの進行は変わりません。':'赤と黒を交互に重ね、4つの組札をAからKまで揃えよう。'}</p>`}<div class="row" style="margin-top:15px"><span class="tag">${data.options.timer||g.mode==='time'?'<span id="clock">'+fmt(Date.now()-g.start)+'</span>':''}　${data.options.moves?g.moves+' MOVES':''}</span><span class="small">組札 ${g.found.reduce((a,x)=>a+x.length,0)} / 52　山札 ${g.stock.length}枚　${g.cycles}周</span></div><div class="board"><div class="top-piles" style="${data.options.hand==='left'?'flex-direction:row-reverse':''}"><button class="pile back" style="color:var(--gold);font-size:27px" onclick="draw()" aria-label="山札をめくる">${g.stock.length?'✦':'↻'}</button><div class="pile">${g.waste.length?card(g.waste.at(-1),'w',g.waste.length-1):''}</div><div class="space"></div>${suits.map((s,i)=>`<div class="pile foundation" role="button" tabindex="0" aria-label="${s}の組札" onclick="foundation(${i})" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();foundation(${i})}">${g.found[i].length?`<span class="${i<2?'red':''}">${ranks[g.found[i].length]}${s}</span>`:s}</div>`).join('')}</div><div class="columns">${g.cols.map((col,c)=>`<div class="pile" style="height:${Math.max(123,col.length*(innerWidth<700?23:29)+110)}px" onclick="emptyCol(event,${c})" ${col.length?'':`role="button" tabindex="0" aria-label="空の場札 ${c+1}列目" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();moveCol(${c})}"`}>${col.map((x,i)=>card(x,'c'+c,i,i*(innerWidth<700?23:29))).join('')}</div>`).join('')}</div></div><div class="toolbar">${data.options.hints?'<button class="btn" onclick="hint()">✧ ヒント</button>':''}${data.options.undo&&g.mode!=='time'?'<button class="btn" onclick="undo()">↶ 一手戻す</button>':''}<button class="btn" onclick="autoMove()">組札へ送る</button><button class="btn" onclick="retry()">↻ 新しい配札</button><button class="btn" onclick="help()">？ 遊び方</button></div><p style="font-size:12px">カードを選び、移動先をタップ。同じカードをもう一度押すと組札へ。${q?'敵の残りHPは自動保存。新しい配札でも引き継ぎます。':''}</p>`}
function snapshot(){g.history.push(JSON.stringify({cols:g.cols,stock:g.stock,waste:g.waste,found:g.found,moves:g.moves,cycles:g.cycles}));if(g.history.length>100)g.history.shift()}
function arr(from){return from==='w'?g.waste:g.cols[+from.slice(1)]}function selected(){if(!g.sel)return null;return arr(g.sel.from)[g.sel.idx]}function reveal(){for(let c of g.cols)if(c.length)c.at(-1).up=true}
function pick(from,i){if(g.end)return;let a=arr(from),c=a[i];if(!c.up)return;if(g.sel){if(g.sel.from===from&&g.sel.idx===i){if(toFound(c.s))return;g.sel=null;render();return}if(from!=='w'&&moveCol(+from.slice(1)))return}g.sel={from,idx:i};sound(340);render()}
function emptyCol(e,c){if(e.target===e.currentTarget&&g.sel)moveCol(c)}function moveCol(c){let x=selected(),s=g.sel;if(!x||s.from==='c'+c)return false;let dest=g.cols[c],top=dest.at(-1);if(top?top.r===x.r+1&&(top.s<2)!==(x.s<2):x.r===13){snapshot();dest.push(...arr(s.from).splice(s.idx));g.sel=null;g.moves++;reveal();sound();render();autoSafe();return true}return false}
function foundation(s){if(!toFound(s))toast('同じマークを A → K の順に重ねよう')}function toFound(s){if(!g||g.end)return false;let c=selected(),sel=g.sel;if(!c||c.s!==s||c.r!==g.found[s].length+1||sel.idx!==arr(sel.from).length-1)return false;snapshot();g.found[s].push(arr(sel.from).pop());g.moves++;g.sel=null;reveal();if(c.r===13&&g.mode==='quest'){g.hp=Math.max(0,g.hp-10);g.history=[];sound(750);if(!g.hp){win();return true}data.hp[g.n]=g.hp;if(save())toast(''+suits[s]+' コンプリート！ 10ダメージ');}sound(560);if(g.found.every(x=>x.length===13)){if(g.mode==='quest'){g.end=true;render();modal('まだ戦いは続く','残りHP '+g.hp+'。ダメージは保存済み。新しい配札で再挑戦しよう。','再挑戦',()=>start('quest',g.n))}else win();return true}render();return true}
function draw(){if(!g||g.end)return;if(!g.stock.length){if(!g.waste.length)return;let limit=g.mode==='quest'?(g.n>=31?3:g.n>=11?5:Infinity):Infinity;if(g.cycles+1>=limit){toast('山札の周回上限です。場札を動かすか、新しい配札へ。');return}snapshot();g.stock=g.waste.reverse().map(c=>({...c,up:false}));g.waste=[];g.cycles++}else{snapshot();let count=g.mode==='time'||g.mode==='trial'?1:g.mode==='quest'?(g.n>=61?3:1):+data.options.draw;for(let i=0;i<count&&g.stock.length;i++)g.waste.push({...g.stock.pop(),up:true})}g.sel=null;g.moves++;sound(290);render();autoSafe()}
function undo(){if(!g||g.end)return;if(!g.history.length){toast('戻せる手がありません。攻撃は取り消せません。');return}Object.assign(g,JSON.parse(g.history.pop()));g.sel=null;render()}
function findMoves(){if(!g||g.end)return [];let out=[];let src=[];g.cols.forEach((a,c)=>a.forEach((x,i)=>{if(x.up)src.push({from:'c'+c,idx:i,x,last:i===a.length-1})}));if(g.waste.length)src.push({from:'w',idx:g.waste.length-1,x:g.waste.at(-1),last:true});for(let s of src){if(s.last&&s.x.r===g.found[s.x.s].length+1)out.push({...s,foundation:s.x.s});for(let c=0;c<7;c++){if(s.from==='c'+c)continue;let d=g.cols[c].at(-1);if(d?d.r===s.x.r+1&&(d.s<2)!==(s.x.s<2):s.x.r===13&&!(s.from[0]==='c'&&s.idx===0))out.push({...s,dest:c})}}return out}
function hint(){let m=findMoves()[0];if(!m){toast(g.stock.length?'山札をめくってみよう。':'組み替えられなければ、新しい配札で挑戦しよう。');return}g.sel={from:m.from,idx:m.idx};render();toast(ranks[m.x.r]+suits[m.x.s]+' を'+(m.foundation!==undefined?'組札へ':'左から'+(m.dest+1)+'列目へ'))}
function autoMove(){let m=findMoves().find(m=>m.foundation!==undefined);if(!m){toast('組札へ送れるカードがありません');return}g.sel={from:m.from,idx:m.idx};toFound(m.foundation)}function autoSafe(){if(!data.options.auto||g.mode==='time'||g.mode==='trial')return;let count=0;while(g&&!g.end&&count++<52){let m=findMoves().find(m=>m.foundation!==undefined&&(m.x.r<=2||g.found.every((f,s)=>(s<2)===(m.x.s<2)||f.length>=m.x.r-1)));if(!m)break;g.sel={from:m.from,idx:m.idx};toFound(m.foundation)}}
function modal(t,p,b,fn){let el=document.createElement('div');el.className='modal';el.innerHTML=`<div><div class="eyebrow">BATTLITIA</div><h2>${t}</h2><p>${p}</p><button class="btn primary">${b} →</button></div>`;el.querySelector('button').onclick=()=>{el.remove();fn()};document.body.append(el)}function win(){
 if(!g||g.end)return;
 g.end=true;let mode=g.mode,n=g.n;
 if(mode==='quest'){
  const before=data,nexthp={...data.hp};delete nexthp[n];
  data={...data,hp:nexthp,unlocked:Math.max(data.unlocked,Math.min(101,n+1))};
  if(!save()){
   data=before;render();
   modal('クリア記録を保存できませんでした','まだ次のステージは解放されていません。再試行するか、保存領域を確認してください。','保存を再試行',()=>{g.end=false;win()});
   return;
  }
  if(n===100){ending();return;}
  render();modal('STAGE CLEAR！','ステージ '+n+' をクリア。次の冒険が待っています。','次のステージへ',()=>start('quest',n+1));
 }else if(mode==='time'){
  let r={id:Date.now(),time:Date.now()-g.start,moves:g.moves};lastRecord=r.id;
  const previous=data.records;data.records=[...previous,r].slice(-1000);const saved=save();
  if(!saved){data.records=previous;lastRecord=null;}
  modal('CLEAR！',fmt(r.time)+' / '+r.moves+'手。'+(saved?'自己ランキングに記録しました。':'記録を保存できませんでした。'),'ランキングを見る',timeMenu);
 }else if(mode==='trial'){
  const t=trials[n],prior=data.trials,personal=prior[t.id]??Infinity;let saved=true;
  if(g.moves<personal){data.trials={...prior,[t.id]:g.moves};saved=save();if(!saved)data.trials=prior;}
  modal(g.moves<=t.gold?'金メダル！':'詰めソリティア CLEAR！',g.moves+'手で完了。'+(saved?(g.moves<personal?'ベストを記録しました。':'ベスト '+personal+'手。'):'ベストは保存できませんでした。'),'問題一覧へ',trialMenu);
 } else modal('SOLITAIRE CLEAR！','52枚、すべて揃いました。おめでとう！','メニューへ',menu);
}
function retry(){
 if(!g)return;
 if(data.options.confirm&&!confirm(g.mode==='trial'?'この問題を最初の配札からやり直しますか？':'新しい配札にしますか？ 敵へのダメージは保存されています。タイムは最初からです。'))return;
 if(g.mode==='trial')startTrial(g.n);else start(g.mode,g.n);
}
function leave(){
 if(!g)return;
 if(data.options.confirm&&!g.end&&!confirm(g.mode==='trial'?'問題一覧に戻りますか？ 途中の配札は保存されません。':'メニューへ戻りますか？ 配札は保存されませんが、敵へのダメージは保存済みです。'))return;
 if(g.mode==='trial')trialMenu();else menu();
}
const trials=[
 {id:'opening',title:'四つの王冠',clue:'同じマークのクイーンとキングを順に組札へ。伏せ札の下にも王冠が。',gold:8,
  cols:[[[0,13],[1,12]],[[1,13],[2,12]],[[2,13],[3,12]],[[3,13],[0,12]],[],[],[]],stock:[]},
 {id:'bridge',title:'空列の架け橋',clue:'組札に置けないキングを、まず空いている場札の列へ。自分のクイーンへの道を開こう。',gold:9,
  cols:[[[0,12],[0,13]],[[1,12],[2,13]],[[2,12]],[[3,12]],[[1,13]],[[3,13]],[]],stock:[]},
 {id:'last-deal',title:'山札の二枚',clue:'キング二枚の置き場所をつくり、山札の二枚も組札へ。',gold:12,
  cols:[[[0,12],[0,13]],[[1,12],[1,13]],[[2,13]],[[3,13]],[],[],[]],stock:[[2,12],[3,12]]}
];
function trialMenu(){
 screen='trial';g=null;
 $('app').innerHTML=`<div class="row"><div><div class="eyebrow">THREE SOLITAIRE PUZZLES</div><h1>詰めソリティア</h1></div><button class="btn" onclick="menu()">← メニュー</button></div><p>少ないカードで考える、終盤の練習問題。どの問題も同じ配札から何度でも遊べます。クエスト・タイムアタックとは別記録です。</p><div class="cards">${trials.map((t,i)=>`<button class="mode" onclick="startTrial(${i})"><div class="symbol">${['♠','♣','♥'][i]}</div><div class="tag">PUZZLE 0${i+1}</div><h3>${t.title}</h3><p>${t.clue}</p><p>${data.trials[t.id]?((data.trials[t.id]<=t.gold?'金メダル ・ ':'')+'ベスト '+data.trials[t.id]+'手'):'金メダル：'+t.gold+'手以内'}</p></button>`).join('')}</div>`;
}
function startTrial(n){
 if(!Number.isInteger(n)||!trials[n])return;
 const t=trials[n],make=([s,r],up)=>({s,r,up});
 screen='game';
 g={mode:'trial',n,cols:t.cols.map(col=>col.map((x,i)=>make(x,i===col.length-1))),stock:t.stock.map(x=>make(x,false)),waste:[],found:suits.map((_,s)=>Array.from({length:11},(_,i)=>({s,r:i+1,up:true}))),sel:null,moves:0,start:Date.now(),end:false,history:[],cycles:0,hp:0};
 render();
}
function ending(){
 if(data.unlocked!==101)return;
 screen='ending';g=null;
 $('app').innerHTML=`<section class="panel ending-panel" aria-labelledby="ending-title"><div class="tag">ENDING · QUEST 100 / 100</div><div class="ending-emblem" aria-hidden="true">♛</div><h1 id="ending-title" tabindex="-1">百枚目の道しるべ</h1><p>最後の守護者が王冠を置くと、閉ざされていた門が開いた。<br>あなたが揃えたカードは、十の世界を結ぶ道しるべになった。</p><p>門の向こうで、四つの紋章が朝日に光る。<br>旅は終わっても、一枚目をめくる楽しさは残る。</p><p><strong>全100ステージ制覇、おめでとうございます。</strong></p><div class="row"><button class="btn primary" onclick="quest()">クエスト一覧へ</button><button class="btn" onclick="menu()">メニューへ</button></div></section>`;
 $('ending-title')?.focus();
}
function safeBackup(){
 try{const raw=localStorage.getItem(BACKUP_KEY);if(raw===null)return null;readSave(raw);return raw;}catch{return null;}
}
function recordsMenu(){
 screen='records';g=null;
 const hasBackup=safeBackup()!==null;
 $('app').innerHTML=`<div class="row"><div><div class="eyebrow">SAVE MANAGEMENT</div><h1>セーブ管理</h1></div><button class="btn" onclick="menu()">← メニュー</button></div><div class="panel"><p>クエスト ${data.unlocked-1} / 100 ・ タイムアタック ${data.records.length}件 ・ 詰めソリティア ${Object.keys(data.trials).length} / 3</p><p>リセットすると全モードの進行・記録・オプションを初期化します。直前のセーブはこのブラウザに1件退避します。</p><div class="row"><button class="btn" ${storageBlock||baseRaw===null?'disabled':''} onclick="resetRecords()">記録をリセット</button><button class="btn primary" ${storageBlock||!hasBackup?'disabled':''} onclick="restoreRecords()">リセット前の記録を復元</button></div><p class="small">${storageBlock?'現在のセーブは保護されています。別のタブを閉じて再読み込みしてください。':hasBackup?'リセット前のバックアップがあります。':'まだバックアップはありません。'}</p></div>`;
}
function resetRecords(){
 if(screen!=='records'||storageBlock||baseRaw===null)return;
 if(!confirm('すべてのゲーム記録と設定をリセットしますか？ 直前のセーブを1件残します。以前のバックアップがあれば置き換わります。'))return;
 try{
  sameSave();readSave(baseRaw);
  const oldBackup=localStorage.getItem(BACKUP_KEY),oldRaw=baseRaw;
  if(oldBackup!==oldRaw)localStorage.setItem(BACKUP_KEY,oldRaw);
  try{const next=readSave(null);persist(next);data=next;}catch(e){
   if(oldBackup!==oldRaw&&localStorage.getItem(BACKUP_KEY)===oldRaw){
    try{oldBackup===null?localStorage.removeItem(BACKUP_KEY):localStorage.setItem(BACKUP_KEY,oldBackup);}catch{}
   }
   throw e;
  }
  lastRecord=null;apply();recordsMenu();toast('記録をリセットしました。リセット前の記録を復元できます。');
 }catch{recordsMenu();toast('リセットできませんでした。現在の記録は初期化していません。');}
}
function restoreRecords(){
 if(screen!=='records'||storageBlock)return;
 const candidate=safeBackup();if(candidate===null)return;
 if(!confirm('リセット前の記録に戻しますか？ 今の進行は置き換わりますが、次に復元できる記録として退避します。'))return;
 try{
  sameSave();if(safeBackup()!==candidate)throw Error('バックアップが変わりました。');
  const next=readSave(candidate),oldRaw=baseRaw,alternate=oldRaw??JSON.stringify(readSave(null));
  localStorage.setItem(BACKUP_KEY,alternate);
  try{persist(next);}catch(e){
   if(localStorage.getItem(BACKUP_KEY)===alternate){try{localStorage.setItem(BACKUP_KEY,candidate);}catch{}}
   throw e;
  }
  data=next;lastRecord=null;apply();recordsMenu();toast('リセット前の記録に戻しました。');
 }catch{recordsMenu();toast('復元できませんでした。現在の記録は変更していません。');}
}
window.addEventListener('storage',e=>{
 if((e.key===SAVE_KEY||e.key===null)&&e.newValue!==baseRaw){
  storageBlock=true;
  if(screen==='records')recordsMenu();
  toast('別のタブで記録が変わりました。この画面からは上書きしません。');
 }
});
function help(){modal('遊び方','場札は赤と黒を交互に、数の大きい順に重ねます。空列にはK。組札は同じマークでAからK。カードを選んで移動先を押すか、同じカードを2回押すと組札へ送れます。クエストでは1組完成で敵に10ダメージ。敵は攻撃しません。','わかった',()=>{})}
setInterval(()=>{if(g&&!g.end&&$('clock'))$('clock').textContent=fmt(Date.now()-g.start)},1000);apply();title();if(storageWarning)toast('このブラウザでは保存できない場合があります。設定や保存領域を確認してください。');
