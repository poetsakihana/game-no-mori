"use strict";
const $ = s => document.querySelector(s);
const panel = $("#panel"), body = $("#panelBody");
const icon = (name, cls="") => '<svg aria-hidden="true" class="'+cls+'"><use href="#i-'+name+'"/></svg>';
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt = n => n.toLocaleString("ja-JP");
function kana(s){return s.normalize("NFKC").trim().replace(/[ \u3000・]/g,"").replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-96))}
function azaKana(s){
  const large={"ゃ":"や","ゅ":"ゆ","ょ":"よ","っ":"つ","ぁ":"あ","ぃ":"い","ぅ":"う","ぇ":"え","ぉ":"お"};
  return kana(s).replace(/[-－]/g,"ー").replace(/[ゃゅょっぁぃぅぇぉ]/g,c=>large[c]);
}
function answerForms(q){
  const forms=[q.answer,...(q.aliases||[])];
  if(q.name.startsWith("大字")&&!q.answer.startsWith("おおあざ"))forms.push("おおあざ"+q.answer);
  if(!q.local&&!q.abr)return forms.map(kana);
  const chome=["","いっ","に","さん","よん","ご","ろく","なな","はっ","きゅう"];
  const numeric=q.answer.match(/^(.*?)([1-9])(?:ちよ[う]?め|ちょうめ)?$/);
  if(numeric && /丁目$/.test(q.term))forms.push(numeric[1]+chome[Number(numeric[2])]+"ちょうめ");
  return forms.map(azaKana);
}
const PREFECTURES=[{id:'aichi',name:'愛知県',count:54},{id:'gifu',name:'岐阜県',count:42},{id:'mie',name:'三重県',count:29}];
const prefectureForCode=code=>String(code).startsWith('21')?'gifu':String(code).startsWith('24')?'mie':'aichi';
const prefectureName=id=>PREFECTURES.find(p=>p.id===id)?.name||'';
const order = ["naka","atsuta","nakamura","minato","higashi","chikusa","kita","nishi","showa","mizuho","nakagawa","minami","moriyama","midori","meito","tempaku"];
const palette = ["#e1e9de","#eee6cf","#e0e9e8","#e5ecea","#ede3d8","#e1eadb","#e6e9d9","#efe3d9"];
const nagoyaWards = WARDS.map(w=>{
  const id=w.id==="tenpaku"?"tempaku":w.id;
  const aza=(typeof AZA!=="undefined" && (AZA[id] || AZA[w.id])) || [];
  const extra=((typeof EXTRA!=="undefined" && EXTRA[id]) || []).map(q=>({...q,abr:true}));
  const all=[];
  for(let i=0;i<Math.max(w.questions.length,aza.length);i++){
    if(w.questions[i]) all.push(w.questions[i]);
    if(aza[i]) all.push(aza[i]);
  }
  all.push(...extra);
  const seen=new Set();
  const questions=[];
  for(const q of all){
    const key=[id,q.name,q.reading].join("|");
    if(!q.reading||seen.has(key)) continue;
    seen.add(key);
    questions.push({...q,key,ward:id,term:q.local||q.name,answer:q.localReading||q.reading});
  }
  return {...w,id,type:"ward",group:"名古屋",pref:"aichi",prefName:"愛知県",questions};
}).sort((a,b)=>order.indexOf(a.id)-order.indexOf(b.id));
// Nagoya keeps its existing question keys and records. Its city badge aggregates its 16 wards.
const wardArtLabels={"naka":"中部電力 MIRAI TOWER","tempaku":"農業センターとしだれ梅","meito":"猪高緑地","higashi":"ナゴヤドーム","midori":"有松の町並みと藍ののれん","nishi":"四間道の蔵並み","minami":"笠寺観音","chikusa":"東山スカイタワー","nakagawa":"荒子観音の多宝塔","atsuta":"熱田神宮の鳥居","mizuho":"山崎川の桜並木","nakamura":"名古屋駅前のツインタワー","moriyama":"志段味の古墳","minato":"名港西大橋と港を行く船","showa":"鶴舞公園の噴水塔","kita":"名城公園のオランダ風車"};
const municipalArtwork=new Map((typeof MUNICIPAL_ART!=='undefined'?MUNICIPAL_ART:[]).map(a=>[a.id,a]));
const municipalMeta=new Map([...MUNICIPALITIES,...NEW_MUNICIPALITIES].map(m=>[m.id,m]));
const extraCities=[...CITY_DATA,...GIFU_DATA,...MIE_DATA].map(w=>{
  const meta=municipalMeta.get(w.id),seen=new Set();
  const list=[];
  for(const q of w.questions){
    const key=[w.id,q.dataId||q.name,q.reading].join("|");
    if(!q.reading||seen.has(key))continue;
    seen.add(key);
    list.push({...q,key,ward:w.id,abr:true,term:q.local||q.name,answer:q.localReading||q.reading});
  }
  const pref=prefectureForCode(w.code);
  return {...meta,...w,pref,prefName:prefectureName(pref),roman:w.roman||('TOKAI '+w.code),questions:list};
});
const wards=[...nagoyaWards,...extraCities];
const nagoyaCity={...municipalMeta.get('c23100'),reading:'なごやし',roman:'NAGOYA',pref:'aichi',prefName:'愛知県',aggregate:true,source:'https://www.city.nagoya.jp/kurashi/juutaku/1030361/1030473/1034746/1030474.html',questions:nagoyaWards.flatMap(w=>w.questions)};
const municipalities=[nagoyaCity,...extraCities].sort((a,b)=>PREFECTURES.findIndex(p=>p.id===a.pref)-PREFECTURES.findIndex(p=>p.id===b.pref)||a.code.localeCompare(b.code));
const collectibles=[...municipalities,...nagoyaWards];
const byWard=new Map(collectibles.map(w=>[w.id,w]));
const allUnverified=[...UNVERIFIED_PLACES,...NEW_UNVERIFIED_PLACES].map(q=>({...q,prefName:byWard.get(q.municipalityId)?.prefName||q.prefName||""}));
const questions=wards.flatMap(w=>w.questions);
const byKey=new Map(questions.map(q=>[q.key,q]));
// Compact references keep a complete three-prefecture record below mobile storage limits.
const bySaveRef=new Map();
for(const q of questions){
  let ref='q'+hash(q.key).toString(36)+'.'+hash([...q.key].reverse().join('')).toString(36);
  if(bySaveRef.has(ref)&&bySaveRef.get(ref).key!==q.key)ref='k:'+q.key;
  q.saveRef=ref;bySaveRef.set(ref,q);
}
function savedKeys(raw){
  const keys=Array.isArray(raw.solved)?raw.solved:[];
  const compact=Array.isArray(raw.completed)?raw.completed:[];
  return [...keys,...compact.map(ref=>bySaveRef.get(ref)?.key).filter(Boolean)];
}
const storageKey="nagoya-chimei-techo-progress-v1";
const mode="input";
let solved=new Set(),lastWard="higashi",canSave=true;
function savedProgress(){
  const stored = localStorage.getItem(storageKey);
  try {
    const progress = JSON.parse(stored);
    return progress && typeof progress === "object" && !Array.isArray(progress) ? progress : {};
  } catch {
    return {};
  }
}
function readSave(){
  try {const raw=savedProgress();
    for(const key of savedKeys(raw)) if(byKey.has(key)) solved.add(key);
    if(byWard.has(raw.lastWard))lastWard=raw.lastWard;
    canSave=true;
  } catch {canSave=false}
}
function persist(){
  try {
    const prev=savedProgress();
    for(const key of savedKeys(prev)) if(byKey.has(key)) solved.add(key);
    localStorage.setItem(storageKey,JSON.stringify({format:2,completed:[...solved].map(k=>byKey.get(k).saveRef),lastWard,mode}));
    canSave=true;
  } catch {canSave=false;announce("このブラウザでは進み具合を保存できません。")}
}
readSave();
const done=w=>w.questions.reduce((n,q)=>n+Number(solved.has(q.key)),0);
const hasBadge=w=>w.questions.length>0&&done(w)===w.questions.length;
const allDone=()=>questions.length>0&&solved.size===questions.length;
const nagoyaDone=()=>hasBadge(nagoyaCity);
const progress=(n,total)=>'<div class="progress-bar" role="progressbar" aria-label="正解の進み具合" aria-valuenow="'+n+'" aria-valuemin="0" aria-valuemax="'+total+'"><i style="width:'+Math.min(100,100*n/Math.max(total,1))+'%"></i></div>';
const kicker=s=>'<div class="kicker"><i></i>'+s+'</div>';
const button=(s,fn,cls="primary")=>'<button class="'+cls+'" data-act="'+fn+'">'+s+'</button>';
function announce(s){$("#announcer").textContent=s;clearTimeout(announce.t);announce.t=setTimeout(()=>$("#announcer").textContent="",3800)}
let cleanView=null, active=null, wardView=null, queryOffset=50, townLimit=40, panelMode="", currentBadge=null;
let areaFilter="all",directoryKind="aichi",collectionKind="aichi",collectionStatus="all";
function switchView(type,html){
  if(cleanView){cleanView();cleanView=null}
  panelMode=type; body.innerHTML=html;
  if(!panel.open){panel.showModal();document.body.classList.add("dialog-open")}
  panel.scrollTop=0;
}
function closePanel(){if(panel.open)panel.close()}
panel.addEventListener("close",()=>{document.body.classList.remove("dialog-open");if(cleanView){cleanView();cleanView=null}panelMode="";setNav("home")});
$("#close").onclick=closePanel;
panel.addEventListener("click",e=>{if(e.target===panel){const r=panel.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closePanel()}});
function setNav(n){document.querySelectorAll(".topnav").forEach(b=>b.classList.toggle("active",b.dataset.go===n))}
function go(n){if(n==="reward"){setNav(n);showReward();return}closePanel();setNav(n);(n==="wards"?$("#wards"):document.body).scrollIntoView({block:"start",behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth"})}
$("#brand").onclick=()=>go("home");
document.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>go(b.dataset.go));
function regionArt(w){
  if(w.type==='ward')return '<img loading="lazy" decoding="async" class="ward-art" src="assets/wards/'+w.id+'.svg" alt="">';
  const art=municipalArtwork.get(w.id);
  if(art)return '<img loading="lazy" decoding="async" class="municipal-illustration" src="assets/municipalities/'+w.id+'.svg" width="240" height="170" alt="'+esc(art.alt)+'">';
  return '<span class="municipal-art" aria-hidden="true"><span>'+icon(w.type==='city'?'home':'map')+'</span><i>'+({city:'市',town:'町',village:'村'}[w.type])+'</i></span>';
}
function regionCard(w,i=0){
  const n=done(w),art=municipalArtwork.get(w.id),label=w.type==='ward'?'NAGOYA / WARD':w.group+' / '+({city:'CITY',town:'TOWN',village:'VILLAGE'}[w.type]);
  return '<button class="ward-card illustrated-card" data-ward="'+w.id+'" style="--card-bg:'+palette[i%palette.length]+'"><span class="english">'+esc(label)+'</span><h3>'+esc(w.name)+'</h3><span class="region-vignette">'+regionArt(w)+'</span><span class="motif-caption">'+esc(art?art.motif:(wardArtLabels[w.id]||'街の風景'))+'</span><span class="card-foot"><span><i class="dot '+(n?'started':'')+'"></i>'+(hasBadge(w)?'踏破済み':n?fmt(n)+' / '+fmt(w.questions.length)+' 問':'全 '+fmt(w.questions.length)+' 問')+'</span><span class="circle">'+icon('chev')+'</span></span></button>';
}
function regionStory(w){
  const art=municipalArtwork.get(w.id);if(!art)return '';
  return '<div class="region-story"><span class="story-label">この街のモチーフ</span><h3>'+esc(art.motif)+'</h3><p>'+esc(art.description)+'</p><div class="story-sources">'+art.sources.map(s=>'<a href="'+esc(s.url)+'" target="_blank" rel="noopener noreferrer">'+esc(s.title)+' ↗</a>').join('')+'</div></div>';
}
function artSourcesView(){
  switchView('artSources',kicker('ILLUSTRATED FIELD NOTES')+'<h2 id="dialogTitle">街の絵・モチーフの出典</h2><p class="body-text">125市町村それぞれの名所、自然、ものづくり、特産品を、小さな風景のイラストにしました。公式の市町村章ではありません。実際の配置や建物の細部は、絵として簡略化しています。</p>'+PREFECTURES.map(p=>'<section class="art-source-section"><h3>'+p.name+'</h3>'+municipalities.filter(w=>w.pref===p.id).map(w=>'<details class="art-source-item"><summary>'+esc(w.name)+'<span>'+esc(municipalArtwork.get(w.id)?.motif||'')+'</span></summary>'+regionStory(w)+'</details>').join('')+'</section>').join(''));
}
function regionTabs(attribute,selected){
  return '<div class="region-tabs tokai-tabs">'+[...PREFECTURES,{id:'ward',name:'名古屋市',count:16}].map(p=>'<button data-'+attribute+'="'+p.id+'" aria-pressed="'+(selected===p.id)+'">'+p.name+'<small>'+p.count+(p.id==='ward'?'区':'市町村')+'</small></button>').join('')+'</div>';
}
function regionsFor(kind){return kind==='ward'?nagoyaWards:municipalities.filter(w=>w.pref===kind)}
function renderDirectory(){
  const regions=regionsFor(directoryKind),groups=[...new Set(regions.map(w=>w.group))];
  if(!groups.includes(areaFilter))areaFilter='all';
  $('#areaFilter').innerHTML='<option value="all">全地域</option>'+groups.map(g=>'<option>'+esc(g)+'</option>').join('');
  $('#areaFilter').value=areaFilter;$('#areaFilter').disabled=directoryKind==='ward';
  const list=regions.filter(w=>areaFilter==='all'||w.group===areaFilter);
  $('#wardGrid').innerHTML=list.map(regionCard).join('');
  const label=directoryKind==='ward'?'名古屋市16区':prefectureName(directoryKind);
  $('#directoryCount').textContent=label+' ・ '+list.length+'地域を表示';
  const total=regions.reduce((n,w)=>n+w.questions.length,0),correct=regions.reduce((n,w)=>n+done(w),0);
  $('#prefectureProgress').innerHTML='<b>'+label+'の旅</b><span>'+regions.filter(hasBadge).length+' / '+regions.length+'地域踏破 ・ '+fmt(correct)+' / '+fmt(total)+'問正解</span>'+progress(correct,total);
  document.querySelectorAll('[data-directory]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.directory===directoryKind)));
}
function drawHome(){
  const pct=solved.size*100/questions.length;$('#meter').style.width=pct+'%';$('#pct').textContent=(pct>0&&pct<1?'1%未満':Math.floor(pct)+'%');
  $('#wardsDone').textContent=collectibles.filter(hasBadge).length;
  $('#townsDone').textContent=fmt(solved.size);$('#totalCount').textContent='/ '+fmt(questions.length)+' 問';
  $('#start span').textContent=allDone()?'記念品を見る':solved.size?'旅をつづける':'旅をはじめる';
  $('#scopeCount').textContent=fmt(questions.length)+'問の町名・丁目・小字';
  renderDirectory();
}
function searchKey(text){
  const digits="〇一二三四五六七八九";
  return kana(text).replace(/([一二三四五六七八九十〇]+)(?=丁目)/g,m=>{
    const halves=m.split("十");
    if(halves.length===2)return String((halves[0]?digits.indexOf(halves[0]):1)*10+(halves[1]?digits.indexOf(halves[1]):0));
    return [...m].map(c=>digits.indexOf(c)).join("");
  });
}
for(const q of questions){
  const w=byWard.get(q.ward);
  q.lookup=[w.prefName+w.name+q.name,w.name+q.name,(w.reading||"")+q.reading,(w.type==="ward"?"名古屋市":"")+w.name+q.name,q.name.replace(/字/g,""),w.name+q.reading,(q.parent||"")+q.answer,q.answer].map(searchKey).join(" ");
}
function queryMatches(q,needle){return q.lookup.includes(searchKey(needle))}
function row(q,global=false){return '<button class="result" data-key="'+esc(q.key)+'">'+(global?'<span>'+byWard.get(q.ward).prefName+'・'+byWard.get(q.ward).name+'</span>':'')+'<strong>'+esc(q.name)+'</strong>'+(solved.has(q.key)?'<span>正解済み</span>':'')+icon("chev")+'</button>'}
function updateSearch(){
  const terms=$("#searchField").value.trim();const target=$("#searchResults");target.hidden=!terms;$("#wardGrid").hidden=!!terms;
  if(!terms){target.innerHTML="";return}
  const normalized=searchKey(terms);const hits=questions.filter(q=>q.lookup.includes(normalized));
  target.innerHTML='<p class="results-label">'+fmt(hits.length)+'件の地名</p><div class="results-list">'+hits.slice(0,queryOffset).map(q=>row(q,true)).join("")+'</div>'+(hits.length>queryOffset?button("さらに表示","moreSearch","more"):"")+(hits.length?"":'<p>市区町村名、町名、ひらがなで探せるよ。</p>');
}
$("#searchToggle").onclick=()=>{const a=$("#searchArea");a.hidden=!a.hidden;$("#searchToggle").setAttribute("aria-expanded",String(!a.hidden));if(a.hidden){$("#searchField").value="";updateSearch()}else{$("#searchField").focus()}};
let searchTimer;$("#searchField").oninput=()=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>{queryOffset=50;updateSearch()},100)};
$("#areaFilter").onchange=()=>{areaFilter=$("#areaFilter").value;renderDirectory()};
function sourceView(){
  switchView('sources',kicker('FIELD REFERENCES')+'<h2 id="dialogTitle">出題範囲・出典</h2><p class="body-text">この東海版は愛知県・岐阜県・三重県の3県を対象とします。125市町村と名古屋市16区を収録。難読地名を含め、出典データで読みを確認できる町名・丁目・小字を入力問題として出題します。</p><div class="source-prefectures">'+PREFECTURES.map(p=>'<div><b>'+p.name+'</b><span>'+p.count+'市町村</span><strong>'+fmt(questions.filter(q=>byWard.get(q.ward).pref===p.id).length)+'問</strong></div>').join('')+'</div><p class="body-text">合計 '+fmt(questions.length)+'問。名古屋市の8,827問を含む愛知版68,569問は、そのまま引き継いでいます。名古屋市の問題を市・区で二重に数えることはありません。</p><h3>地名データ</h3><p class="disclosure">出典：アドレス・ベース・レジストリ（デジタル庁）、PDL1.0。2026年9月25日公開版の公開スナップショットを抽出・ひらがな化・重複統合し、公式資料で読みの補完を行いました。資料にある大書き仮名や数字表記を保った問題があります。小書き仮名でも答えられます。</p><p class="disclosure">読み未確認の '+fmt(allUnverified.length)+'件は、推測で出題せず別一覧に記録し、クリア条件から除いています。名称が空の管理行も対象外です。三重県の出典に含まれる小字は12行です。未登録の小字・歴史地名・通称・山川・施設名・番地など、町字データにない名称の網羅を意味するものではありません。</p><p class="disclosure">公開ミラーのチェックサムは検証済みです。公式配布ホストの地域制限により、公式現在ファイルとの独立比較はできていません。</p><p class="disclosure body-text"><a href="https://www.digital.go.jp/policies/base_registry_address" target="_blank" rel="noopener noreferrer">デジタル庁 アドレス・ベース・レジストリ ↗</a></p><p class="disclosure"><a href="https://huggingface.co/datasets/yuiseki/abr-src-2026-09" target="_blank" rel="noopener noreferrer">利用した公開スナップショット ↗</a></p><p class="disclosure"><a href="assets/tokai-data-source.json" target="_blank" rel="noopener noreferrer">3県の収録件数・出典の詳細 ↗</a></p><div class="actions"><button class="secondary" data-act="unverified">読み未確認の地名一覧</button></div><h3>市町村の一覧</h3><ul class="sources-list"><li><a href="https://www.pref.aichi.jp/site/userguide/link-citytown.html" target="_blank" rel="noopener noreferrer">愛知県 54市町村 ↗</a></li><li><a href="https://www.pref.gifu.lg.jp/page/6058.html" target="_blank" rel="noopener noreferrer">岐阜県 42市町村 ↗</a></li><li><a href="https://www.pref.mie.lg.jp/SHICHOS/HP/000222064_000070005.htm" target="_blank" rel="noopener noreferrer">三重県 29市町 ↗</a></li></ul><h3>各地域の読みの出典</h3><ul class="sources-list">'+wards.map(w=>'<li><a target="_blank" rel="noopener noreferrer" href="'+esc(w.source)+'">'+w.prefName+'・'+w.name+' ↗</a></li>').join('')+'</ul><h3>バッジの境界データ</h3><p class="disclosure body-text"><a href="https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N03-2026.html" target="_blank" rel="noopener noreferrer">国土数値情報（行政区域データ・2026年1月1日時点）（国土交通省）</a>を加工して作成。CC BY 4.0。市町村は20m、名古屋市の区は15mの許容差で輪郭を簡略化し、離島・分離領域を含めて立体化しています。面積の比率や標高は表していません。</p>');
  body.insertAdjacentHTML('beforeend','<h3>街のイラスト</h3><p class="disclosure">各市町村の名所・自然・特産品をもとに描いたオリジナルイラストです。</p><div class="actions">'+button('街の絵・モチーフの出典','artSources','secondary')+'</div>');
}
let unverifiedLimit=60;
function unverifiedView(region='all'){
  unverifiedLimit=60;
  switchView('unverified',kicker('DATA COVERAGE')+'<h2 id="dialogTitle">読み未確認の地名</h2><p class="body-text">読みを確定できない '+fmt(allUnverified.length)+'件は、出題・クリア条件に含めていません。名称自体が空の管理行も除外しています。</p><label class="formlabel" for="unverifiedFilter">地名・市町村名で検索</label><input type="search" id="unverifiedFilter" class="town-input" placeholder="例：刈谷市"><select id="unverifiedRegion" class="kind-select" aria-label="市町村"><option value="all">全市町村</option>'+extraCities.filter(w=>allUnverified.some(q=>q.municipalityId===w.id)).map(w=>'<option value="'+w.id+'">'+w.prefName+'・'+w.name+'</option>').join('')+'</select><div id="unverifiedRows"></div><p class="disclosure"><a href="assets/tokai-unverified-places.json" target="_blank" rel="noopener noreferrer">未確認項目・町字IDの全件データ ↗</a></p>');
  $('#unverifiedRegion').value=region;
  $('#unverifiedFilter').oninput=$('#unverifiedRegion').onchange=()=>{unverifiedLimit=60;unverifiedRows()};unverifiedRows();
}
function unverifiedRows(){
  const term=searchKey($('#unverifiedFilter').value),region=$('#unverifiedRegion').value;
  const list=allUnverified.filter(q=>(region==='all'||q.municipalityId===region)&&searchKey(q.prefName+q.municipalityName+q.name).includes(term));
  $('#unverifiedRows').innerHTML='<p class="results-label">'+fmt(list.length)+'件・出題対象外</p><div class="unverified-list">'+list.slice(0,unverifiedLimit).map(q=>'<div><small>'+esc(q.prefName+'・'+q.municipalityName)+'</small><b>'+esc(q.name)+'</b><span>'+esc(q.reason)+'</span></div>').join('')+'</div>'+(list.length>unverifiedLimit?button('さらに表示','moreUnverified','more'):'');
}
function helpView(){
  switchView('help',kicker('FIELD GUIDE')+'<h2 id="dialogTitle">東海3県をめぐる遊び方</h2><ol class="steps"><li><b>好きな市町村から出発</b><p>愛知・岐阜・三重の125市町村から選択。名古屋市は16区から選んで進められるよ。地名を直接検索することもできるでね。</p></li><li><b>地名の読みを答える</b><p>地名の読みを、ひらがな・カタカナで入力して「答える」を押してね。難しい地名はヒントを使って、何度でも挑戦できるよ。</p></li><li><b>全問正解でバッジを開く</b><p>その市区町村の全問を正解すると、実際の輪郭の3Dバッジを獲得。クリア前は鍵マークだけで、形も3D画面も見られません。</p></li><li><b>141個を集めよう</b><p>125市町村＋名古屋16区で全141個。名古屋市のバッジは16区すべての全問正解で解放され、名古屋弁キーホルダーも手に入るよ。</p></li></ol><p class="disclosure">'+(canSave?'正解するたびに、この端末のブラウザへ保存します。同じブラウザにある愛知版の記録も引き継ぎます。':'この環境では記録を保存できません。')+'</p><div class="actions">'+button('旅をはじめる '+icon('arrow'),'start')+'</div>');
}
$("#help").onclick=helpView;$("#sources").onclick=sourceView;
function showWard(w){
  if(!w)return;
  wardView=w;townLimit=40;const n=done(w);
  if(w.aggregate){
    switchView('ward',kicker('NAGOYA / 16 WARDS')+'<div class="aggregate-art-head"><h2 id="dialogTitle">名古屋市</h2><div class="aggregate-illustration">'+regionArt(w)+'</div></div><p>16区をめぐって、名古屋市のバッジへ。</p>'+regionStory(w)+progress(n,w.questions.length)+'<p class="disclosure">'+fmt(n)+' / '+fmt(w.questions.length)+' 問正解 ・ '+nagoyaWards.filter(hasBadge).length+' / 16区踏破</p><div class="actions">'+button(n===w.questions.length?'もう一度めぐる':'名古屋市の続きを解く','startWard')+(hasBadge(w)?'<button class="secondary" data-badge="c23100">名古屋市の3Dバッジ</button>':'')+'</div><div class="ward-grid nagoya-child-grid">'+nagoyaWards.map(regionCard).join('')+'</div>');
    return;
  }
  switchView('ward',kicker('REGION GUIDE')+'<div class="ward-modal-head"><span class="micro">'+esc(w.prefName+'・'+w.group)+' / '+esc(w.type==='ward'?'名古屋市':({city:'市',town:'町',village:'村'}[w.type]))+'</span><h2 id="dialogTitle">'+w.name+'</h2><p>'+fmt(n)+' / '+fmt(w.questions.length)+' 問正解</p>'+regionArt(w)+'</div>'+regionStory(w)+progress(n,w.questions.length)+'<div class="actions">'+button(n===w.questions.length?'もう一度めぐる':n?'この地域の続きを解く':'この地域をはじめる','startWard')+'</div><h3>この地域の地名</h3><label class="formlabel" for="wardFilter">町名・よみかたで絞り込み</label><input class="town-input" style="margin:0" type="search" autocomplete="off" id="wardFilter" placeholder="町名を入力"><select class="kind-select" aria-label="地名の種類" id="wardType"><option value="all">すべての地名</option><option value="town">町名・丁目</option><option value="aza">小字など</option></select><div id="townRows"></div>');
  if(hasBadge(w))body.querySelector('.actions').insertAdjacentHTML('beforeend','<button class="secondary" data-badge="'+w.id+'">'+icon('check')+' 獲得した3Dバッジ</button>');
  const missing=allUnverified.filter(q=>q.municipalityId===w.id).length;
  if(missing)body.querySelector('.actions').insertAdjacentHTML('afterend','<p class="region-coverage">読み未確認 '+fmt(missing)+'件はクリア条件に含みません。<button class="linkbtn" data-unverified="'+w.id+'">一覧を見る</button></p>');
  $('#wardFilter').oninput=$('#wardType').onchange=()=>{townLimit=40;wardRows()};wardRows();
}
function wardRows(){const w=wardView,term=$("#wardFilter").value.trim();const type=$("#wardType").value;
  const list=w.questions.filter(q=>(type==="all"||(type==="aza"?!!q.local:!q.local))&&(!term||queryMatches(q,term)));
  $("#townRows").innerHTML='<div class="results-label">'+fmt(list.length)+'件</div><div class="town-list">'+list.slice(0,townLimit).map(q=>row(q)).join("")+'</div>'+(list.length>townLimit?button("さらに表示","moreTown","more"):"");
}
function hash(s){let h=2166136261;for(const c of s)h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0}
function startGame(){
  if(allDone()){showReward();return}
  let w=byWard.get(lastWard)||wards[0];if(done(w)===w.questions.length)w=wards.find(x=>x.pref===w.pref&&done(x)<x.questions.length)||wards.find(x=>done(x)<x.questions.length);
  startWard(w);
}
function startWard(w){ask(w.questions.find(q=>!solved.has(q.key))||w.questions[0])}
function ask(q){if(lastWard!==q.ward){lastWard=q.ward;persist()}active={q,right:false,hint:false,had:solved.has(q.key),text:"",entry:""};drawQuiz()}
function drawQuiz(){
  const s=active,q=s.q,w=byWard.get(q.ward),n=done(w);
  const after=s.right?button((hasBadge(w)&&!s.had?"3Dバッジを受け取る":allDone()?"記念品を見る":"次の地名へ")+" "+icon("arrow"),"next","primary next-btn"):"";
  const feedback=s.right?"正解！　"+q.term+"（"+q.answer+"）":s.text || (s.hint?"ヒント　最初の文字は「"+q.answer[0]+"」。":"");
  switchView("quiz",kicker("READING QUEST")+'<div class="quiz-location">'+icon("pin")+w.prefName+'・'+w.name+(q.parent?' ・ '+esc(q.parent):'')+'<span style="margin-left:auto">'+fmt(n)+' / '+fmt(w.questions.length)+' 問正解</span></div>'+progress(n,w.questions.length)+'<div class="question-card"><small>'+ (/[0-9０-９]/.test(q.answer)?'資料に記録された読み表記は？':q.parent?'この小字・地名、なんて読む？':q.abr?'町字資料に載っている読みは？':q.name.startsWith('大字')?'「大字」を除いた読みは？':'この地名、なんて読む？')+'</small><h2 id="dialogTitle" class="'+(q.term.length>7?'long':'')+'">'+esc(q.term)+'</h2>'+((q.local||q.abr)&&/[0-9０-９]/.test(q.answer)?'<small>数字のままでも回答可・丁目はかなでもOK</small>':q.shortReading?'<small>「町」「通」などを省いた資料の読みを答えてね</small>':'')+'</div><label class="reading-label" for="readingInput">読みを入力してね</label><form class="reading-form" id="readingForm"><input type="text" inputmode="text" aria-label="地名の読み" aria-describedby="readingFeedback" aria-invalid="'+Boolean(s.text&&!s.right)+'" placeholder="ひらがな・カタカナ" id="readingInput" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="done" maxlength="100" value="'+esc(s.right?q.answer:s.entry)+'" '+(s.right?'disabled':'')+'><button type="submit" class="primary" '+(s.right?'disabled':'')+'>答える</button></form><p id="readingFeedback" class="feedback '+(s.right?"good":s.text?"bad":"")+'" role="status">'+esc(feedback)+'</p>'+after+'<div class="subnav">'+(s.right?'<a target="_blank" rel="noopener noreferrer" class="linkbtn" href="'+esc(q.readingSource||q.source||w.source)+'">読みの出典 ↗</a>':button("ヒントを見る","hint","linkbtn"))+button(w.name+'の地名一覧',"leaveQuiz","linkbtn")+'</div>');
  const input=$("#readingInput"),form=$("#readingForm");
  let composing=false;
  input.oninput=()=>{s.entry=input.value};
  input.oncompositionstart=()=>{composing=true};
  input.oncompositionend=()=>{composing=false;s.entry=input.value};
  input.onkeydown=e=>{if(e.key==='Enter'&&(composing||e.isComposing||e.keyCode===229))e.preventDefault()};
  form.onsubmit=e=>{e.preventDefault();if(!composing&&!s.right)answer(input.value)};
  if(!s.right)input.focus({preventScroll:true});
}
function answer(value){
  const s=active;if(!s||s.right)return;
  s.entry=value;
  if(!kana(value))s.text="読みを入力してから「答える」を押してちょう。";
  else if(answerForms(s.q).includes((s.q.local||s.q.abr?azaKana:kana)(value))){s.right=true;solved.add(s.q.key);persist();drawHome()}
  else s.text="惜しい！　もういっぺん挑戦してみてちょう。";
  drawQuiz();if(s.right)body.querySelector(".next-btn")?.focus({preventScroll:true});
}
function nextQuestion(){
  const s=active;if(!s||!s.right)return;const w=byWard.get(s.q.ward);
  if(hasBadge(w)&&!s.had){wardFinish(w);return}
  if(allDone()){showReward();return}
  const index=w.questions.indexOf(s.q);
  for(let i=1;i<=w.questions.length;i++){const q=w.questions[(index+i)%w.questions.length];if(!solved.has(q.key)){ask(q);return}}
  ask(w.questions[(index+1)%w.questions.length]);
}
function wardFinish(w){showBadge(w,true)}
function collectionRows(){
  let list=regionsFor(collectionKind);
  if(collectionStatus==='earned')list=list.filter(hasBadge);
  if(collectionStatus==='locked')list=list.filter(w=>!hasBadge(w));
  $('#badgeRows').innerHTML=list.map(w=>{
    const n=done(w);
    if(!hasBadge(w))return '<button class="badge-card unearned" disabled aria-label="'+w.name+'のバッジ・クリアまで非公開">'+badgeIcon(w,true)+'<b>'+w.name+'</b><small>クリアまで非公開</small><span>あと '+fmt(w.questions.length-n)+' 問</span></button>';
    return '<button class="badge-card earned" data-badge="'+w.id+'" aria-label="'+w.name+'の3Dバッジ・獲得済み">'+badgeIcon(w)+'<b>'+w.name+'</b><span>'+icon('check')+'獲得済み</span></button>';
  }).join('') || '<p class="empty-collection">この条件のバッジはまだありません。</p>';
  $('#collectionCount').textContent=(collectionKind==='ward'?'名古屋市':prefectureName(collectionKind))+' ・ '+list.length+'地域を表示';
  document.querySelectorAll('[data-collection]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.collection===collectionKind)));
}
function showReward(){
  const earned=collectibles.filter(hasBadge).length;
  switchView('reward',kicker('TOKAI BADGE COLLECTION')+'<h2 id="dialogTitle">東海のかたちコレクション</h2><p>ひとつの街を読みきるたび、街の形が宝物に。</p><div class="badge-collection-head"><b>市区町村の3Dバッジ</b><span>'+earned+' <small>/ '+collectibles.length+'個</small></span></div>'+progress(earned,collectibles.length)+'<p class="disclosure">その地域の全問正解で初公開。名古屋市のバッジは16区すべての全問正解で解放されるよ。</p>'+(allDone()?'<p class="aichi-complete">東海3県踏破！ 141個のバッジがそろったがね。</p>':'')+regionTabs('collection',collectionKind)+'<div class="collection-filter"><span id="collectionCount"></span><select id="collectionStatus" aria-label="バッジの獲得状態"><option value="all">すべて</option><option value="earned">獲得済み</option><option value="locked">未獲得</option></select></div><div class="badge-grid" id="badgeRows"></div><div class="grand-reward"><div><small>名古屋市・全16区の全問正解</small><h3>名古屋踏破の特別な記念品</h3><p>'+(nagoyaDone()?'名古屋市を踏破！ 特別な記念品も獲得したでね。':'姿は名古屋16区クリア後のお楽しみ。あと '+fmt(nagoyaCity.questions.length-done(nagoyaCity))+' 問でお披露目だよ。')+'</p></div>'+(nagoyaDone()?button('獲得済みの記念品を見る '+icon('arrow'),'keychain','secondary'):'<button class="secondary final-reward-locked" disabled aria-label="名古屋踏破の記念品・名古屋16区クリアまで非公開">'+icon('lock')+' 名古屋16区クリアまで非公開</button>')+'</div><p class="disclosure">バッジは実際の行政区域の輪郭を立体化しています。クリア前は形も3D画面も非公開です。</p>');
  $('#collectionStatus').value=collectionStatus;
  $('#collectionStatus').onchange=()=>{collectionStatus=$('#collectionStatus').value;collectionRows()};
  collectionRows();
}
function showBadge(w,celebrate=false){
  // Check the completion record at the viewer entry point as well as in the list.
  if(!w||!hasBadge(w)){
    currentBadge=null;
    showReward();
    announce("バッジは、この地域を全問正解したら見られるでね。");
    return;
  }
  currentBadge=w;
  switchView("badge",kicker(celebrate?"REGION BADGE UNLOCKED":"REGION SHAPE / 3D")+'<h2 id="dialogTitle">'+w.name+'のかたちバッジ</h2><p>'+(celebrate?fmt(w.questions.length)+'問、全部読めたがね！ バッジを獲得したよ。':'この地域の全問正解のしるし。裏側には「踏破」の刻印。')+'</p><div class="badge-stage"><canvas id="badgeCanvas" aria-label="'+w.name+'の実際の境界に沿った厚みのある3Dバッジ"></canvas><span class="locked-tag">'+icon('check')+'獲得済み</span><span class="badge-north">N ↑ <small>正面・北が上</small></span></div><div class="reward-controls badge-controls"><span>指で動かして、表・裏・厚みを見る</span><div><button id="badgeTurn">'+icon('turn')+' 回転</button><button id="badgeReset">正面</button></div></div>'+progress(done(w),w.questions.length)+'<p class="disclosure">全 '+fmt(w.questions.length)+' 問正解 ／ '+w.name+'の境界を立体化</p><div class="actions">'+(w.aggregate?button('名古屋踏破の記念品へ '+icon('arrow'),'keychain'):w.type==='ward'&&nagoyaDone()?'<button class="primary" data-badge="c23100">名古屋市のバッジへ '+icon('arrow')+'</button>':button((allDone()?'全141個のコレクションへ':'次の地域へ')+' '+icon('arrow'),allDone()?'badges':'start'))+button('バッジ一覧','badges','secondary')+'</div><p class="disclosure badge-source">国土数値情報（行政区域・2026年1月1日）を加工。標高は表していません。</p>');
  const scene=makeWardBadge($("#badgeCanvas"),w);cleanView=scene.dispose;
  $("#badgeTurn").onclick=scene.turn;$("#badgeReset").onclick=scene.reset;
}
function showKeychain(){
  // The final souvenir stays hidden until every question in all 16 wards is solved.
  if(!nagoyaDone()){
    showReward();
    announce("名古屋踏破の記念品は、名古屋16区すべてをクリアしたら見られるでね。");
    return;
  }
  switchView("keychain",kicker("SOUVENIR UNLOCKED")+'<h2 id="dialogTitle">名古屋踏破、おめでとう！</h2><p>名古屋弁キーホルダーが手に入ったでね。</p><div class="reward-stage"><canvas id="keyCanvas" aria-label="金のしゃちほこと名古屋弁をあしらった立体キーホルダー"></canvas><span class="locked-tag">'+icon('check')+'獲得済み</span></div><div class="reward-controls"><span>指で左右に動かして回転</span><button data-act="rotate">'+icon('turn')+' 回して見る</button></div><h3>「でらええがね」キーホルダー</h3><p>名古屋のことばで「とってもいいね」。裏面には全市踏破の印を刻んだよ。</p>'+progress(done(nagoyaCity),nagoyaCity.questions.length)+'<p class="disclosure">名古屋市 全 '+fmt(nagoyaCity.questions.length)+' 問正解</p><div class="actions">'+button('東海のバッジ一覧','badges','secondary')+'</div>');
  const scene=makeKeychain($("#keyCanvas"));cleanView=scene.dispose;body.querySelector('[data-act="rotate"]').onclick=()=>scene.turn();
}
$("#start").onclick=startGame;
function handleAction(e){
  const el=e.target.closest("button");if(!el)return;
  if(el.dataset.unverified){unverifiedView(el.dataset.unverified);return}
  if(el.dataset.directory){directoryKind=el.dataset.directory;areaFilter='all';$('#searchField').value='';updateSearch();renderDirectory();return}
  if(el.dataset.collection){collectionKind=el.dataset.collection;collectionRows();return}
  if(el.dataset.badge){showBadge(byWard.get(el.dataset.badge));return}
  if(el.dataset.challenge){startWard(byWard.get(el.dataset.challenge));return}
  if(el.dataset.ward){showWard(byWard.get(el.dataset.ward));return}
  if(el.dataset.key){const q=byKey.get(el.dataset.key);if(q)ask(q);return}
  switch(el.dataset.act){
    case "artSources":artSourcesView();break;case "unverified":unverifiedView();break;case "moreUnverified":unverifiedLimit+=60;unverifiedRows();break;
    case "badges":showReward();break;case "keychain":showKeychain();break;
    case "start": startGame();break;case "startWard":startWard(wardView);break;
    case "moreTown":townLimit+=50;wardRows();break;case "moreSearch":queryOffset+=50;updateSearch();break;
    case "next":nextQuestion();break;case "hint":active.hint=true;active.text="";drawQuiz();break;
    case "leaveQuiz":showWard(byWard.get(active.q.ward));break;
  }
}
document.addEventListener("click",handleAction);
window.addEventListener("storage",e=>{if(e.key!==storageKey)return;readSave();drawHome();if(panelMode==="reward")showReward();else if(panelMode==="badge"&&currentBadge)showBadge(currentBadge);else if(panelMode==="keychain")showKeychain()});
drawHome();

$("#lookCastle").onclick=()=>{
  switchView("diorama",kicker("NAGOYA DIORAMA")+'<h2 id="dialogTitle">名古屋城のジオラマ</h2><div class="orbit-stage"><canvas id="castleOrbit" aria-label="360度回転できる名古屋城の3D模型"></canvas></div><p class="disclosure" role="status" id="orbitStatus">立体模型を読み込んでいます…</p><div class="orbit-buttons" id="orbitButtons" hidden><button data-view="left">左に回す</button><button data-view="right">右に回す</button><button data-view="zoom">拡大・縮小</button><button data-view="reset">元の角度</button></div>');
  cleanView=openDiorama($("#castleOrbit"),$("#orbitStatus"),$("#orbitButtons"));
};
