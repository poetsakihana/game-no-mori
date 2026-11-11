// Crossroad 2.0 — nationwide rail journey. No network required at runtime.
const stationMap=new Map(DATA.stations.map(s=>[s.id,s]));
let stationFocus=state.last,shownStations=[],slideIndex=0,chosenRound=0,scrollTimer,viewFilters={pref:0,q:'',kind:'',line:''};
function roundKey(id,r=0){return r?`${id}:${r}`:String(id);}
function migrateRounds(){
 state.roundCleared=state.roundCleared||{};
 const known=new Set(Object.keys(state.roundCleared).map(k=>k.split(':')[0]));
 for(const [id,v]of Object.entries(state.cleared))if(!known.has(id))state.roundCleared[id]={...v};
 state.lastRound=Number.isInteger(state.lastRound)?Math.max(0,Math.min(9,state.lastRound)):0;
}
migrateRounds();
const clearedRounds=()=>Object.keys(state.roundCleared).length;
const stationRounds=id=>Array.from({length:10},(_,r)=>state.roundCleared[roundKey(id,r)]).filter(Boolean).length;
const nextRound=id=>{let r=Array.from({length:10},(_,i)=>i).find(i=>!state.roundCleared[roundKey(id,i)]);return r===undefined?0:r;};
const nextChapter=()=>{for(let p=1;p<=47;p++)if(done(p)<3)return p;return 47;};
const regionNames=['北海道・東北','関東','甲信越・北陸','東海','近畿','中国','四国','九州・沖縄'];
function regionIndex(p){return p<=7?0:p<=14?1:p<=20?2:p<=24?3:p<=30?4:p<=35?5:p<=39?6:7;}
function lineColor(s){const l=s.ls.find(i=>DATA.lineMeta[i]);return DATA.lineMeta[l]?.color||'#227960';}
function categories(s){return [...new Set(s.ls.map(l=>DATA.lineMeta[l]?.type||'other'))];}
function kindName(k){return {jr:'JR',subway:'地下鉄',other:'私鉄・その他'}[k];}
function home(){
 const last=stationMap.get(state.last)||DATA.stations[0];
 $('#app').innerHTML=`<div class="eyebrow">CROSSROAD / RAIL JOURNEY</div><h1>駅をめくる。<br>言葉で、旅する。</h1><p class="muted">JR・地下鉄・私鉄の駅を巡るクロスワード。<br>北海道から沖縄へ、少しずつ手ごたえを。</p><div class="hero">${art()}<div class="hero-copy"><div class="row"><span class="tag">47都道府県を自由に選択</span><span class="eyebrow">ALL ABOARD</span></div><h2>次は、どこへ行こう。</h2><p class="muted">駅名標を左右にスライド。気になる駅で、<br>10種類のクロスワードを解き進めよう。</p><button class="bigbutton" id="choose-pref">都道府県から旅を始める →</button></div></div><div class="stats"><div class="stat"><b>${DATA.stations.length.toLocaleString()}</b><small>収録駅</small></div><div class="stat"><b>${(DATA.stations.length*10).toLocaleString()}</b><small>遊べる盤面</small></div><div class="stat"><b>${clearedRounds()}</b><small>クリアした盤面</small></div></div><div class="card continue-card"><span class="eyebrow">CONTINUE YOUR JOURNEY</span><h2>${esc(last.n)} <small>駅</small></h2><p class="muted">${DATA.prefectures[last.p-1]} · 問題 ${state.lastRound+1} / 10<br>${difficulty(last.p)}</p><button class="secondary" id="continue">この問題から続ける →</button></div><div class="row heading"><h2>今日のひと駅</h2><span class="tag">＋20コイン</span></div><div class="card"><p class="muted">一日一回の小さな寄り道。全国の収録駅から、<br>今日の目的地を選びました。</p><button class="secondary" id="daily">今日の問題を開く →</button></div><div class="difficulty-journey"><span>北海道<br><b>入門</b></span><i></i><span>沖縄<br><b>超難関</b></span></div><p class="notes">全${DATA.stations.length.toLocaleString()}駅 × 10盤面。問題は共通語彙から駅・問題番号ごとに交差配置され、一部のカギは再登場します。駅データ：2026年9月30日版。実際の運行経路を示すものではありません。</p>`;
 $('#choose-pref').onclick=()=>navigate('journey');$('#continue').onclick=()=>openStation(last,null,state.lastRound);$('#daily').onclick=daily;
}
function journey(){
 $('#app').innerHTML=`<div class="eyebrow">CHOOSE YOUR DESTINATION</div><h1>47の旅先。</h1><p class="muted">どの都道府県からでも出発できます。<br>章番号が進むほど、問題数と語彙の難度が上がります。</p><input class="search" id="pref-search" placeholder="都道府県名で探す" aria-label="都道府県を検索"><div class="quick-regions">${regionNames.map((n,i)=>`<button data-region="${i}">${n}</button>`).join('')}</div><div id="pref-list">${regionNames.map((n,i)=>`<section class="pref-section" data-region-section="${i}" id="region-${i}"><div class="row heading"><h2>${n}</h2><span class="eyebrow">${String(i+1).padStart(2,'0')} / 08</span></div><div class="pref-grid">${DATA.prefectures.map((name,j)=>({name,p:j+1})).filter(x=>regionIndex(x.p)===i).map(x=>`<button class="pref-ticket" data-pref="${x.p}" data-name="${x.name+DATA.readings[x.p-1]}"><span class="pref-number">${String(x.p).padStart(2,'0')}</span><strong>${x.name}</strong><span class="pref-stars">${'●'.repeat(levelFor(x.p))}${'○'.repeat(5-levelFor(x.p))}</span><small>${groups[x.p-1].length}駅 · ${done(x.p)}駅クリア</small><span class="ticket-arrow">↗</span></button>`).join('')}</div></section>`).join('')}</div><p id="pref-empty" hidden>該当する都道府県がありません。</p><p class="notes">章の順番は都道府県コード順です。全県に駅を収録し、最後の沖縄が最高難度です。</p>`;
 document.querySelectorAll('[data-pref]').forEach(b=>b.onclick=()=>{stationFocus=null;navigate('stations',+b.dataset.pref);});
 document.querySelectorAll('[data-region]').forEach(b=>b.onclick=()=>document.getElementById('region-'+b.dataset.region).scrollIntoView({behavior:'smooth',block:'start'}));
 $('#pref-search').oninput=()=>{let q=normalize($('#pref-search').value),count=0;document.querySelectorAll('[data-pref]').forEach(b=>{b.hidden=!normalize(b.dataset.name).includes(q);if(!b.hidden)count++;});document.querySelectorAll('[data-region-section]').forEach(s=>s.hidden=![...s.querySelectorAll('[data-pref]')].some(b=>!b.hidden));$('#pref-empty').hidden=!!count;};
}
function stationList(){
 if(viewFilters.pref!==pref)viewFilters={pref,q:'',kind:'',line:''};
 $('#app').innerHTML=`<button class="back" id="back">← 都道府県を選ぶ</button><div class="row"><span class="eyebrow">CHAPTER ${String(pref).padStart(2,'0')} / 47</span><span class="difficulty">${'★'.repeat(levelFor(pref))}</span></div><h1>${DATA.prefectures[pref-1]}</h1><p class="muted">${difficulty(pref)} · ${groups[pref-1].length}駅 × 10盤面</p><div class="rail-filters"><input class="search" id="search" placeholder="駅名・よみ・路線で探す" aria-label="駅を検索" value="${esc(viewFilters.q)}"><div class="filter-pair"><select id="kind" aria-label="鉄道の種類"><option value="">すべての鉄道</option value="jr">JR</option><option value="subway">地下鉄</option><option value="other">私鉄・その他</option></select><select id="filter" aria-label="路線を選ぶ"><option value="">すべての路線</option>${[...new Set(groups[pref-1].flatMap(s=>s.ls))].map(l=>`<option value="${l}">${esc(DATA.lines[l])}</option>`).join('')}</select></div></div><div class="row carousel-label"><span>← 駅名標を左右にスライド →</span><span id="station-count"></span></div><div id="stationrows"></div><div id="station-controls"></div><p class="notes">駅の並びはゲーム用の順番です。現実の隣駅や乗換案内を示すものではありません。同名でも事業者などにより別駅として収録する場合があります。</p>`;
 $('#kind').value=viewFilters.kind;$('#filter').value=viewFilters.line;
 $('#back').onclick=()=>navigate('journey');$('#search').oninput=()=>{viewFilters.q=$('#search').value;stationFocus=null;stationRows();};
 $('#kind').onchange=()=>{viewFilters.kind=$('#kind').value;viewFilters.line='';$('#filter').value='';stationFocus=null;stationRows();};
 $('#filter').onchange=()=>{viewFilters.line=$('#filter').value;stationFocus=null;stationRows();};stationRows();
}
function stationRows(){
 const q=normalize(viewFilters.q),l=+viewFilters.line,k=viewFilters.kind;
 shownStations=groups[pref-1].filter(s=>(!l||s.ls.includes(l))&&(!k||categories(s).includes(k))&&(!q||normalize(s.n+s.k+s.ls.map(l=>DATA.lines[l]).join('')).includes(q)));
 $('#station-count').textContent=`${shownStations.length}駅`;
 if(!shownStations.length){$('#stationrows').innerHTML='<div class="card"><h3>この条件の駅はありません。</h3><p class="muted">駅名や路線の条件を変えてみてください。</p></div>';$('#station-controls').innerHTML='';return;}
 slideIndex=Math.max(0,shownStations.findIndex(s=>s.id===stationFocus));
 $('#stationrows').innerHTML=`<div class="station-carousel" id="station-carousel" role="region" aria-label="駅名標のスライド一覧" tabindex="0">${shownStations.map((s,i)=>`<article class="station-slide" data-slide="${i}" role="group" aria-label="${esc(s.n)}駅 ${i+1} / ${shownStations.length}" style="--route:${esc(lineColor(s))}"><div class="station-sign"><div class="row"><span class="station-code">${String(pref).padStart(2,'0')} − ${String(i+1).padStart(3,'0')}</span><span class="station-badges">${categories(s).map(kindName).join(' / ')}</span></div><h2>${esc(s.n)}<small>駅</small></h2><p>${esc(s.k)}</p><div class="route-band"><span>言葉の旅</span><span>${stationRounds(s.id)}/10 クリア →</span></div><div class="sign-route">${s.ls.map(l=>esc(DATA.lines[l])).join(' / ')}</div></div><div class="board-preview" data-preview="${i}"><span class="muted">この駅のクロスワード</span></div><div class="ticket-footer"><span>${esc(DATA.municipalities[s.m].n)}</span><b>${state.cleared[s.id]?'✓ スタンプ獲得':'STATION CROSSWORD'}</b></div></article>`).join('')}</div>`;
 $('#station-controls').innerHTML=`<div class="slide-controls"><button class="secondary" id="prev-station" aria-label="前の駅">←</button><span id="slide-position" aria-live="polite"></span><button class="secondary" id="next-station" aria-label="次の駅">→</button></div><section class="round-picker"><div class="row"><h3>この駅の10問</h3><span class="muted">各問にクロスワード1盤面</span></div><div id="round-buttons" class="round-buttons"></div><p class="muted" id="round-info"></p><button class="bigbutton" id="start-round">この問題を解く →</button></section>`;
 const track=$('#station-carousel');
 const jump=i=>{clearTimeout(scrollTimer);i=Math.max(0,Math.min(shownStations.length-1,i));const el=track.children[i];slideIndex=i;selectSlide();track.scrollTo({left:el.offsetLeft-track.children[0].offsetLeft,behavior:'auto'});};
 $('#prev-station').onclick=()=>jump(slideIndex-1);$('#next-station').onclick=()=>jump(slideIndex+1);
 track.onkeydown=e=>{if(e.key==='ArrowRight'){e.preventDefault();jump(slideIndex+1);}if(e.key==='ArrowLeft'){e.preventDefault();jump(slideIndex-1);}};
 track.onscroll=()=>{clearTimeout(scrollTimer);scrollTimer=setTimeout(()=>{if(!document.contains(track))return;const width=track.children.length>1?track.children[1].offsetLeft-track.children[0].offsetLeft:track.clientWidth;const i=Math.min(shownStations.length-1,Math.max(0,Math.round(track.scrollLeft/width)));if(i!==slideIndex){slideIndex=i;selectSlide();}},100);};
 track.querySelectorAll('[data-slide]').forEach(el=>el.onclick=()=>{const i=+el.dataset.slide;if(i!==slideIndex)jump(i);});
 track.scrollLeft=track.children[slideIndex].offsetLeft-track.children[0].offsetLeft;selectSlide();
}
function selectSlide(){
 const s=shownStations[slideIndex];stationFocus=s.id;chosenRound=nextRound(s.id);
 $('#slide-position').textContent=`${slideIndex+1} / ${shownStations.length} 駅`;
 $('#prev-station').disabled=slideIndex===0;$('#next-station').disabled=slideIndex===shownStations.length-1;
 renderRoundPicker();
}
function miniBoard(p){const cs=boardCells(p);let h='';for(let y=0;y<p.h;y++)for(let x=0;x<p.w;x++)h+=`<i class="${cs[x+','+y]?'white':'black'}"></i>`;return `<div class="mini-grid" style="grid-template-columns:repeat(${p.w},1fr);aspect-ratio:${p.w}/${p.h}">${h}</div>`;}
function renderRoundPicker(){
 const s=shownStations[slideIndex];
 $('#round-buttons').innerHTML=Array.from({length:10},(_,r)=>`<button data-round="${r}" class="${r===chosenRound?'chosen':''} ${state.roundCleared[roundKey(s.id,r)]?'solved':''}" aria-pressed="${r===chosenRound}" aria-label="問題${r+1}${state.roundCleared[roundKey(s.id,r)]?' クリア済み':''}">${r+1}<small>${state.roundCleared[roundKey(s.id,r)]?'✓':state.boards[roundKey(s.id,r)]?'途中':'未挑戦'}</small></button>`).join('');
 const p=makePuzzle(s,chosenRound);
 $('#round-info').textContent=`問題 ${chosenRound+1} · ${p.words.length}個のカギ · ${p.w}×${p.h}マス · ${difficulty(s.p)}`;
 const preview=$(`[data-preview="${slideIndex}"]`);preview.innerHTML=miniBoard(p)+`<span>問題 ${chosenRound+1} / 10 · ${p.words.length}個のカギ</span>`;
 // Keep only the current preview detailed, even in prefectures with hundreds of stations.
 document.querySelectorAll('[data-preview]').forEach(el=>{if(el!==preview&&el.children.length>1)el.innerHTML='<span class="muted">この駅のクロスワード</span>';});
 document.querySelectorAll('[data-round]').forEach(b=>b.onclick=()=>{chosenRound=+b.dataset.round;renderRoundPicker();});
 $('#start-round').textContent=`問題 ${chosenRound+1} を解く →`;$('#start-round').onclick=()=>openStation(s,null,chosenRound);
}
function openStation(s,day=null,round=0){
 if(!s)return;round=Math.max(0,Math.min(9,Number.isInteger(round)?round:0));
 active={...s,day,round};state.last=s.id;state.lastRound=round;stationFocus=s.id;
 const key=roundKey(s.id,round);state.boards[key]=state.boards[key]||{letters:{},hints:0,checks:0};
 puzzle=makePuzzle(s,round);cells=boardCells(puzzle);selected=0;position=null;screen='puzzle';beep();render();window.scrollTo(0,0);
}
function daily(){const day=localDay(),seed=Number(day.replaceAll('-','')),s=DATA.stations[seed%DATA.stations.length];openStation(s,day,seed%10);}
function finish(){
 if(!Object.keys(cells).every(k=>board().letters[k]===cells[k].a)){toast('すべてのマスを正しく埋めるとクリアです。');beep('bad');return;}
 const key=roundKey(active.id,active.round),first=!state.roundCleared[key],newMark=municipalCount(active.m)===0,h=board().hints,stars=h===0?3:h<=3?2:1;
 const reward=first?30+puzzle.tier*5:0,dayReward=active.day&&!state.daily[active.day]?20:0;
 if(first)state.roundCleared[key]={stars,date:localDay()};else state.roundCleared[key].stars=Math.max(stars,state.roundCleared[key].stars);
 if(!state.cleared[active.id])state.cleared[active.id]={stars,date:localDay()};else state.cleared[active.id].stars=Math.max(stars,state.cleared[active.id].stars);
 state.coins+=reward+dayReward;if(dayReward)state.daily[active.day]=true;state.unlocked=nextChapter();save();beep('win');confetti();
 const s=stationMap.get(active.id),all=stationRounds(s.id)===10,r=nextRound(s.id),list=groups[s.p-1],ix=list.findIndex(x=>x.id===s.id),next=list[(ix+1)%list.length];
 modal(`${newMark?rewardMark(active.m,true):''}<div class="seal">${all?'全問達成':'正解'}</div><span class="eyebrow">CROSSWORD COMPLETE</span><h2>${esc(s.n)}駅<br>問題 ${active.round+1}、クリア！</h2><div class="difficulty" style="font-size:26px">${'★'.repeat(stars)}${'☆'.repeat(3-stars)}</div><p>この駅で ${stationRounds(s.id)} / 10 盤面クリア</p><p class="muted">${reward+dayReward?'＋'+(reward+dayReward)+'コイン':'この盤面のクリア報酬は受取済み'} · ヒント${h}回</p><button class="bigbutton" id="next">${all?'次の駅へ →':'同じ駅の問題 '+(r+1)+'へ →'}</button><button class="secondary" id="back-stations" style="margin-top:16px">駅名標の一覧に戻る</button><button class="back" id="close">旅のホームへ</button>`);
 $('#next').onclick=()=>{closeModal();openStation(all?next:s,null,all?nextRound(next.id):r);};
 $('#back-stations').onclick=()=>{closeModal();navigate('stations',s.p);};$('#close').onclick=()=>{closeModal();navigate('home');};
}
function settings(){
 priorSettings();
 const cards=$('#app').querySelectorAll('.card');
 cards[0].innerHTML=`<h3>遊び方</h3><p>都道府県を選び、駅名標を左右にスライド。駅ごとに「問題1〜10」を選べます。JR・地下鉄・私鉄などの種類と路線で絞り込めます。</p><p>マスかカギをタップし、ひらがな・カタカナで答えを入力します。交差マスは再度タップでタテ・ヨコを切り替え。小さい「ゃ・ゅ・ょ・っ」と長音も1マスです。</p><p>全県を最初から選べます。北海道から沖縄へ、章の順番に語彙とカギの数が難しくなります。</p>`;
 const last=cards[cards.length-1];last.innerHTML=`<h3>クロスロード 全国鉄道の旅</h3><p>ブラウザ版2.0-web.1 · 読み込みには通信が必要<br>47都道府県 / ${DATA.stations.length.toLocaleString()}駅 / ${Object.keys(DATA.lines).length}路線区分<br>1駅10盤面、合計${(DATA.stations.length*10).toLocaleString()}盤面<br>共通語彙 ${EXPANDED_WORDS.length}語＋地域語彙47語＋駅の読み</p><p class="notes">駅情報：Seo-4d696b75 / station_database、2026年9月30日版。営業中フラグの駅・路線を抽出し、既存駅との統合、読みの記号除去、住所からの地域抽出、並び替えを行いました。<br>出典：https://github.com/Seo-4d696b75/station_database<br>駅データはリポジトリLICENSE.mdに基づきCC BY-SA 4.0で提供します。<br>https://creativecommons.org/licenses/by-sa/4.0/</p><p class="notes">問題は共通語彙から駅・問題番号ごとに交差配置を生成します。すべての盤面が個別執筆された問題ではなく、カギや答えが再登場する場合があります。問題1は旧版の記録と互換性を保っています。</p><p class="notes">ゲーム用のデータであり、現在の全営業駅との完全一致を保証するものではありません。実際の乗換・運行情報ではありません。鉄道各社の公式アプリではありません。</p>`;
 $('#import').onclick=()=>{if(typeof window.Android?.importSave==='function'){window.Android.importSave();return;}modal('<h2>記録を復元</h2><p class="muted">旧版または新版のバックアップJSONを貼り付けてください。</p><textarea id="backup" aria-label="バックアップJSON"></textarea><button class="bigbutton" id="apply">内容を確認</button><button class="back" id="cancel">キャンセル</button>');$('#apply').onclick=()=>importBackup($('#backup').value);$('#cancel').onclick=closeModal;};
}
function importBackup(text){
 try{
  const s=JSON.parse(text),plain=v=>v&&typeof v==='object'&&!Array.isArray(v),validKey=k=>/^\d+(?::[1-9])?$/.test(k)&&stationMap.has(+k.split(':')[0]),validStars=c=>plain(c)&&Number.isInteger(c.stars)&&c.stars>=1&&c.stars<=3;
  if(s.v!==1||!Number.isInteger(s.unlocked)||s.unlocked<1||s.unlocked>47||!Number.isInteger(s.coins)||s.coins<0||s.coins>10000000||!plain(s.cleared)||!plain(s.boards)||typeof s.sound!=='boolean'||!plain(s.daily))throw Error();
  for(const [id,c]of Object.entries(s.cleared))if(!/^\d+$/.test(id)||!stationMap.has(+id)||!validStars(c))throw Error();
  for(const [id,b]of Object.entries(s.boards))if(!validKey(id)||!plain(b)||!plain(b.letters)||!Number.isInteger(b.hints)||b.hints<0||!Number.isInteger(b.checks)||b.checks<0||Object.entries(b.letters).some(([k,v])=>!/^\d+,\d+$/.test(k)||typeof v!=='string'||!/^[ぁ-ゖー]$/.test(v)))throw Error();
  if(s.roundCleared!==undefined&&(!plain(s.roundCleared)||Object.entries(s.roundCleared).some(([id,c])=>!validKey(id)||!validStars(c))))throw Error();
  modal('<h2>記録を復元しますか？</h2><p>今の記録がバックアップの内容に置き換わります。</p><button class="bigbutton" id="restore">復元する</button><button class="back" id="cancel">キャンセル</button>');$('#cancel').onclick=closeModal;
  $('#restore').onclick=()=>{state=s;migrateRounds();closeModal();save();navigate('home');toast('旅の記録を復元しました。');};
 }catch(e){toast('このバックアップは読み込めません。ファイルの内容を確認してください。');}
}
window.importBackup=importBackup;
render();
