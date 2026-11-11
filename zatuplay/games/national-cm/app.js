'use strict';
if(typeof CATALOG==='undefined'||typeof MUNICIPALITIES==='undefined'||typeof STATS==='undefined'){
 const notice=document.querySelector('#dataNotice');notice.hidden=false;notice.textContent='一覧データを読み込めませんでした。通信を確認して、このページを再読込してください。';
 throw new Error('National CM catalog data is unavailable');
}

const $=s=>document.querySelector(s), esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const SAVE_KEY='cm-travel-v3';
let storageBaseline=null, storageBlocked=false, storageConflict=false, volatileChanges=false;
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
function storageMessage(message){const e=$('#storageNotice');e.textContent=message;e.hidden=!message}
function validateSaved(value){
 let bad=!plain(value), raw=bad?{}:value, result={favorites:Object.create(null),history:Object.create(null),custom:[]};
 for(const key of ['favorites','history']){
  if(raw[key]===undefined)continue;
  if(!plain(raw[key])){bad=true;continue}
  for(const [id,time] of Object.entries(raw[key])){
   if(/^yt_[\w-]{11}$/.test(id)&&Number.isSafeInteger(time)&&time>0)result[key][id]=time;else bad=true;
  }
 }
 if(raw.custom!==undefined&&!Array.isArray(raw.custom))bad=true;
 const ids=new Set(CATALOG.map(r=>r.id));
 for(const r of Array.isArray(raw.custom)?raw.custom:[]){
  if(!plain(r)||!/^yt_[\w-]{11}$/.test(r.id)||r.id!=='yt_'+r.video_id||typeof r.title!=='string'||!r.title.trim()||r.title.length>240||typeof r.company!=='string'||r.company.length>120||!['全国共通CM',...MUNICIPALITIES.prefectures].includes(r.pref)||!Array.isArray(r.municipalities)||r.municipalities.length>1||ids.has(r.id)){bad=true;continue}
  const city=r.municipalities[0];
  const match=city&&plain(city)&&MUNICIPALITIES.cities.find(c=>c.pref===r.pref&&c.name===city.name);
  if(city&&!match){bad=true;continue}
  ids.add(r.id);result.custom.push({id:r.id,video_id:r.video_id,title:r.title,company:r.company,pref:r.pref,regions:[r.pref],municipalities:match?[{...match,relation:'ユーザーによる地域指定（未確認）'}]:[],scope:match?'municipal':'unknown',verification:'user_added',kind:'追加候補',evidence:'ユーザー登録。CM本編・公式性・地域・再生可否は未確認。',url:'https://www.youtube.com/embed/'+r.video_id,watch_url:'https://www.youtube.com/watch?v='+r.video_id,source:'https://www.youtube.com/watch?v='+r.video_id});
 }
 return {result,bad};
}
function readSaved(){
 try{
  storageBaseline=localStorage.getItem(SAVE_KEY);
  const checked=validateSaved(storageBaseline===null?{}:JSON.parse(storageBaseline));
  if(checked.bad){storageBlocked=true;storageMessage('保存記録の一部を読み込めませんでした。元の記録は上書きせず、読み込める部分だけ表示します。このタブの変更は保存できません。')}
  return checked.result;
 }catch{storageBlocked=true;storageMessage('保存記録を読み込めませんでした。元の記録は上書きしません。このタブでは操作できますが、変更は保存できません。');return {favorites:Object.create(null),history:Object.create(null),custom:[]}}
}
let saved=readSaved();
let playerGeneration=0, readyTimer=null, playerOpener=null;
let state={tab:'discover',pref:'',city:'',scope:'',q:'',tier:'official',era:'',page:0}, current=null, player=null, apiPromise=null, timer=null;
const records=CATALOG.concat(saved.custom), byId=new Map(records.map(x=>[x.id,x]));
const regionGroups=[['北海道・東北',0,7],['関東',7,14],['中部',14,23],['近畿',23,30],['中国・四国',30,39],['九州・沖縄',39,47]];
const PREFS=MUNICIPALITIES.prefectures;
let searchIndex=new Map();function index(r){searchIndex.set(r.id,normalize([r.title,r.company,r.pref,...(r.municipalities||[]).map(m=>m.name)].join(' ')))}records.forEach(index);
function normalize(s){return String(s).normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim()}
function persist(){
 volatileChanges=true;
 if(storageBlocked||storageConflict)return false;
 try{
  if(localStorage.getItem(SAVE_KEY)!==storageBaseline){storageConflict=true;storageMessage('別のタブで保存記録が更新されました。このタブの変更は保存を止めています。必要な内容を確認してから再読込してください。');return false}
  const serialized=JSON.stringify(saved);localStorage.setItem(SAVE_KEY,serialized);storageBaseline=serialized;volatileChanges=false;storageMessage('');return true;
 }catch{storageMessage('変更を保存できませんでした。空き容量やブラウザの保存設定を確認してください。変更は現在のタブにだけ残っています。');return false}
}
window.addEventListener('storage',e=>{if((e.key===SAVE_KEY||e.key===null)&&e.newValue!==storageBaseline){storageConflict=true;storageMessage('別のタブで保存記録が更新されました。このタブは自動上書きを止めています。必要な内容を確認してから再読込してください。')}});
window.addEventListener('beforeunload',e=>{if(volatileChanges){e.preventDefault();e.returnValue=''}});
let legacyLoaded=false, legacyPromise=null, tierRequest=0,tierPending=null;const legacyCache=new Map();
function dataMessage(message){const e=$('#dataNotice');e.textContent=message;e.hidden=!message}
async function ensureLegacy(){
 if(legacyLoaded)return true;if(legacyPromise)return legacyPromise;
 legacyPromise=(async()=>{
  try{
   dataMessage('継承候補を読み込んでいます。初回は約36 MBのデータを受信します…');
   let next=0;
   const outcomes=await Promise.allSettled(Array.from({length:3},async()=>{while(next<LEGACY_CHUNKS.length){const file=LEGACY_CHUNKS[next++];if(legacyCache.has(file))continue;const response=await fetch(file+'?v=3.0.0-web.1');if(!response.ok)throw Error('HTTP '+response.status);const rows=await response.json();if(!Array.isArray(rows)||rows.some(r=>!r||!/^yt_[\w-]{11}$/.test(r.id)||!Array.isArray(r.municipalities)))throw Error('data');legacyCache.set(file,rows);dataMessage('継承候補を読み込んでいます… '+legacyCache.size+' / '+LEGACY_CHUNKS.length)}}));if(outcomes.some(x=>x.status==='rejected'))throw Error('network');
   const all=LEGACY_CHUNKS.flatMap(f=>legacyCache.get(f));if(all.length+CATALOG.length!==STATS.total||new Set([...CATALOG,...all].map(r=>r.id)).size!==STATS.total)throw Error('count');
   for(const r of all){if(!byId.has(r.id)){records.push(r);byId.set(r.id,r);index(r)}}
   legacyLoaded=true;legacyCache.clear();dataMessage('');return true;
  }catch{dataMessage('継承候補を読み込めませんでした。通信を確認し、条件の選択や追加操作をもう一度お試しください。読み込む前の一覧を表示しています。');return false}
  finally{legacyPromise=null}
 })();return legacyPromise;
}
async function changeTier(value){const request=++tierRequest;tierPending=value;$('#tier').value=value;if(value==='all'&&!await ensureLegacy()){if(request===tierRequest){tierPending=null;$('#tier').value=state.tier}return}if(request!==tierRequest)return;tierPending=null;state.tier=value;$('#tier').value=value;state.page=0;updateCities();renderList()}
async function loadSavedCandidates(){if([...Object.keys(saved.favorites),...Object.keys(saved.history)].some(id=>!byId.has(id))){if(await ensureLegacy())render()}}
function toast(s){$('#toast').textContent=s;$('#toast').hidden=false;clearTimeout(timer);timer=setTimeout(()=>$('#toast').hidden=true,3500)}
function external(url){try{let u=new URL(url);if(u.protocol!=='https:')throw Error();window.open(u.href,'_blank','noopener')}catch{toast('有効なHTTPSリンクではありません')}}
function videoId(s){try{const u=new URL(s);if(!['https:','http:'].includes(u.protocol))return null;let id;if(u.hostname==='youtu.be')id=u.pathname.slice(1);else if(['youtube.com','www.youtube.com','m.youtube.com','youtube-nocookie.com','www.youtube-nocookie.com'].includes(u.hostname)){if(u.pathname==='/watch')id=u.searchParams.get('v');else id=u.pathname.match(/^\/(?:embed|shorts)\/([\w-]{11})\/?$/)?.[1]}return /^[\w-]{11}$/.test(id||'')?id:null}catch{return null}}
function stopPlayer(){playerGeneration++;clearTimeout(readyTimer);readyTimer=null;if(player){try{player.destroy()}catch{}player=null}$('#playerMount').innerHTML='';current=null}
function closePlayer(){stopPlayer();$('#playerDialog').close()}
function restorePlayerFocus(){let target=playerOpener?.dataset?.open?$('#list').querySelector('[data-open="'+playerOpener.dataset.open+'"]'):playerOpener;if(!target||!target.isConnected)target=$('#listingTitle');target.focus();playerOpener=null}
function pausePlayer(){if(player){try{player.pauseVideo()}catch{}}}
document.addEventListener('visibilitychange',()=>{if(document.hidden)pausePlayer()});
window.addEventListener('pagehide',()=>{stopPlayer();if($('#playerDialog').open)$('#playerDialog').close()});
function home(){if($('#playerDialog').open)closePlayer();else if($('#addDialog').open)$('#addDialog').close();else if($('#infoDialog').open)$('#infoDialog').close();else{state.tab='discover';render()}}
function setTab(tab){state.tab=tab;state.page=0;if(tab==='favorites'||tab==='history'){state.pref='';state.city='';state.q='';state.era='';}if(tab==='national'){state.scope='national';state.pref='';state.city=''}else state.scope='';render();window.scrollTo(0,0)}
function filter(){const q=normalize(state.q);return records.filter(r=>{
 if(state.tab==='favorites'&&!saved.favorites[r.id])return false;
 if(state.tab==='history'&&!saved.history[r.id])return false;
 if(state.tier==='official'&&state.tab!=='favorites'&&state.tab!=='history'&&r.verification!=='official_source')return false;
 if(state.scope==='national'&&r.scope!=='national'&&!(state.tier==='all'&&r.pref==='全国共通CM'))return false;
 if(state.pref&&!(r.regions||[r.pref]).includes(state.pref))return false;
 if(state.city&&!(r.municipalities||[]).some(m=>m.pref===state.pref&&m.name===state.city))return false;
 if(state.era&&eraOf(r)!==state.era)return false;
 return !q||searchIndex.get(r.id)?.includes(q)
 }).sort((a,b)=>state.tab==='history'?(saved.history[b.id]||0)-(saved.history[a.id]||0):(b.verification==='official_source')-(a.verification==='official_source'))}
function eraOf(r){if(r.era&&r.era!=='年代未確認')return r.era;if(!r.year||[1989,2019].includes(r.year))return '年代未確認';return r.year<1989?'昭和':r.year<2019?'平成':'令和'}
function render(){
 $('#hero').hidden=state.tab!=='discover';$('#regions').hidden=state.tab!=='regions';$('#browse').hidden=state.tab==='regions';
 document.querySelectorAll('[data-tab]').forEach(b=>{b.classList.toggle('active',b.dataset.tab===state.tab);b.setAttribute('aria-current',b.dataset.tab===state.tab?'page':'false')});
 $('#pref').value=state.pref;$('#q').value=state.q;$('#tier').value=tierPending??state.tier;$('#era').value=state.era;
 $('#pref').disabled=state.tab==='national';updateCities();
 $('#listingTitle').textContent=({discover:'見つける',national:'全国共通CM',favorites:'あとで見る',history:'最近開いたCM',regions:'地域から探す'})[state.tab];
 if(state.tab==='regions')renderRegions();else renderList();
 $('#totalCount').textContent=(STATS.total+saved.custom.length).toLocaleString();
 $('#favCount').textContent=Object.keys(saved.favorites).length;
}
function updateCities(){let names=MUNICIPALITIES.cities.filter(c=>c.pref===state.pref);let counts=new Map();records.forEach(r=>{if(state.tab==='favorites'&&!saved.favorites[r.id]||state.tab==='history'&&!saved.history[r.id])return;if(state.tier==='official'&&!['favorites','history'].includes(state.tab)&&r.verification!=='official_source')return;(r.municipalities||[]).forEach(m=>{if(m.pref===state.pref)counts.set(m.name,(counts.get(m.name)||0)+1)})});$('#city').innerHTML='<option value="">市区町村すべて</option>'+names.map(c=>`<option value="${esc(c.name)}">${esc(c.name)}（${counts.get(c.name)||0}件）</option>`).join('');$('#city').value=state.city;$('#city').disabled=!state.pref}
function renderRegions(){
 const official={},candidate=legacyLoaded?{}:{...STATS.all_by_pref};records.forEach(r=>(r.regions||[r.pref]).forEach(p=>{if(legacyLoaded||r.verification==='user_added')candidate[p]=(candidate[p]||0)+1;if(r.verification==='official_source')official[p]=(official[p]||0)+1}));
 $('#regions').innerHTML='<div class="sectionHeading"><div><span class="eyebrow">47 PREFECTURES</span><h2>次は、どの街へ？</h2></div></div><p class="hint">市区町村を選び、地元を伝えるCMを探せます。数字は公式掲載を照合した件数／継承候補を含む件数です。</p>'+regionGroups.map(([name,a,b])=>`<section class="regionGroup"><h3>${name}</h3><div class="prefGrid">${PREFS.slice(a,b).map((p,i)=>`<button data-pref="${esc(p)}"><span>${esc(p)}</span><small>${official[p]||0} <i>/ ${(candidate[p]||0).toLocaleString()}</i></small><b>↗</b></button>`).join('')}</div></section>`).join('');
 $('#regions').querySelectorAll('[data-pref]').forEach(b=>b.onclick=()=>{state.pref=b.dataset.pref;state.city='';state.scope='';state.tab='discover';state.page=0;render();$('#browse').scrollIntoView({behavior:'smooth'})})
}
function badge(r){return r.verification==='official_source'?'公式掲載を照合':r.verification==='user_added'?'自分で追加':'継承候補・未確認'}
function renderList(){const list=filter();let pages=Math.max(1,Math.ceil(list.length/24));state.page=Math.max(0,Math.min(state.page,pages-1));
 $('#resultCount').textContent=`${list.length.toLocaleString()}件`;$('#tierNotice').textContent=state.tier==='official'?'「公式掲載を照合」は出典ページの確認状況です。再生可否を保証する表示ではありません。':state.tab==='national'?'継承候補には全国での放送を確認できていない動画も含みます。各作品の出典・確認状況を確認してください。':'継承候補にはCM以外の関連動画・CM集・削除済み動画が含まれる可能性があります。';
 if(!list.length){$('#list').innerHTML=`<div class="empty"><div class="emptyIcon">⌕</div><h3>${state.city?'この街のCMは、まだ収録されていません':'条件に合うCMが見つかりません'}</h3><p>条件を変えるか、YouTubeの公式動画を見つけて追加できます。</p><div class="row"><button id="resetFilters" class="primary">条件をリセット</button>${state.tier==='official'?'<button id="showCandidates">継承候補も見る</button>':''}<button id="findOutside">YouTubeで探す ↗</button></div></div>`;$('#resetFilters').onclick=()=>{Object.assign(state,{pref:'',city:'',q:'',era:'',page:0});render()};if($('#showCandidates'))$('#showCandidates').onclick=()=>changeTier('all');$('#findOutside').onclick=()=>external('https://www.youtube.com/results?search_query='+encodeURIComponent([state.pref,state.city,state.q,'CM 公式'].join(' ')))}
 else{$('#list').innerHTML=list.slice(state.page*24,(state.page+1)*24).map((r,i)=>`<article class="card"><button class="cardArt tone${i%5}" data-open="${esc(r.id)}" aria-label="${esc(r.title)}を開く"><span class="artPref">${esc(r.pref==='全国共通CM'?'ALL JAPAN':r.pref)}</span><div class="tv"><div class="screen"><span>CM</span><b>▶</b></div><div class="tvKnobs">●<br>●<br>≡</div></div><span class="artTown">${esc(r.municipalities?.[0]?.name||r.company||'CMコレクション')}</span><span class="artNum">${String(state.page*24+i+1).padStart(3,'0')}</span></button><div class="cardBody"><div class="cardMeta"><span class="status ${r.verification==='official_source'?'checked':''}">${badge(r)}</span><span>${esc(r.year||'年代未確認')}</span></div><button class="titleButton" data-open="${esc(r.id)}"><h3>${esc(r.title)}</h3></button><p class="cardSub">${esc(r.publisher||r.company||'出典参照')} · ${esc(r.kind||'CM関連候補')}</p><div class="cardActions"><button class="watchBtn" data-open="${esc(r.id)}">視聴する <span>↗</span></button><button class="favorite ${saved.favorites[r.id]?'selected':''}" data-fav="${esc(r.id)}" aria-pressed="${!!saved.favorites[r.id]}" aria-label="あとで見る：${esc(r.title)}">${saved.favorites[r.id]?'★':'☆'}</button></div></div></article>`).join('');
 $('#list').querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>showPlayer(b.dataset.open));$('#list').querySelectorAll('[data-fav]').forEach(b=>b.onclick=()=>{const id=b.dataset.fav;toggleFav(id);renderList();const next=$('#list').querySelector('[data-fav="'+id+'"]');(next||$('#listingTitle')).focus()})}
 $('#pagination').innerHTML=`<button id="prev" ${state.page===0?'disabled':''}>← 前へ</button><span>${state.page+1} / ${pages}</span><button id="next" ${state.page===pages-1?'disabled':''}>次へ →</button>`;
 $('#prev').onclick=()=>{state.page--;renderList();$('#browse').scrollIntoView();$('#listingTitle').focus()};$('#next').onclick=()=>{state.page++;renderList();$('#browse').scrollIntoView();$('#listingTitle').focus()};
}
function toggleFav(id){if(saved.favorites[id])delete saved.favorites[id];else saved.favorites[id]=Date.now();persist();$('#favCount').textContent=Object.keys(saved.favorites).length}
function showPlayer(id){const r=byId.get(id);if(!r)return;if(!$('#playerDialog').open)playerOpener=document.activeElement;stopPlayer();current=r;saved.history[id]=Date.now();persist();
 $('#playerTitle').textContent=r.title;$('#playerPlace').textContent=[r.pref,...(r.municipalities||[]).map(m=>m.name)].join(' / ');
 $('#playerMeta').innerHTML=`<span class="status ${r.verification==='official_source'?'checked':''}">${badge(r)}</span><p>${esc(r.evidence||'以前のアプリから引き継いだ候補です。')}${r.checked_at?' 確認日：'+esc(r.checked_at):''}</p><dl><dt>掲載元</dt><dd>${esc(r.publisher||r.company||'出典参照')}</dd><dt>分類</dt><dd>${esc(r.kind||'CM関連候補')}</dd><dt>放送範囲</dt><dd>${esc(r.broadcast||'未確認')}</dd>${(r.municipalities||[]).map(m=>`<dt>地域との関係</dt><dd>${esc(m.name)}：${esc(m.relation)}</dd>`).join('')}</dl>`;
 $('#playerStatus').textContent='「埋め込みで視聴」を押すとYouTubeのプレーヤーを読み込みます。';$('#playerMount').innerHTML='<div class="playerPlaceholder"><span>▶</span><p>YouTube公式プレーヤー</p></div>';$('#startEmbed').disabled=false;$('#startEmbed').textContent='▶ 埋め込みで視聴';
 $('#sourceLink').onclick=()=>external(r.source);$('#youtubeLink').onclick=()=>external(r.watch_url);$('#embedLink').onclick=()=>external(r.url);
 $('#playerFav').setAttribute('aria-pressed',String(!!saved.favorites[id]));$('#playerFav').textContent=saved.favorites[id]?'★ あとで見るに保存済み':'☆ あとで見る';$('#playerFav').onclick=()=>{toggleFav(id);$('#playerFav').setAttribute('aria-pressed',String(!!saved.favorites[id]));$('#playerFav').textContent=saved.favorites[id]?'★ あとで見るに保存済み':'☆ あとで見る';renderList()};
 $('#playerDialog').showModal();$('#playerDialog').scrollTop=0;
}
function loadAPI(){
 if(window.YT?.Player)return Promise.resolve();if(apiPromise)return apiPromise;
 apiPromise=new Promise((resolve,reject)=>{
  let done=false;const script=document.createElement('script');
  const finish=error=>{if(done)return;done=true;clearTimeout(timeout);if(error){script.remove();apiPromise=null;reject(error)}else resolve()};
  const timeout=setTimeout(()=>finish(Error('timeout')),16000);
  window.onYouTubeIframeAPIReady=()=>{if(window.YT?.Player)finish()};
  script.src='https://www.youtube.com/iframe_api';script.onerror=()=>finish(Error('network'));document.head.appendChild(script);
 });return apiPromise;
}
async function startEmbed(){
 const r=current;if(!r)return;const request=++playerGeneration;clearTimeout(readyTimer);$('#startEmbed').disabled=true;$('#playerStatus').textContent='YouTubeを読み込んでいます…';
 const active=()=>request===playerGeneration&&current===r&&$('#playerDialog').open;
 const fail=message=>{if(!active())return;clearTimeout(readyTimer);$('#playerStatus').textContent=message+'「YouTubeで開く」もお試しください。';$('#startEmbed').disabled=false;$('#startEmbed').textContent='もう一度読み込む'};
 try{
  await loadAPI();if(!active())return;
  if(document.hidden){fail('タブが非表示になったため読込を止めました。');return}
  if(player){try{player.destroy()}catch{}player=null}
  $('#playerMount').innerHTML='<div id="youtubePlayer"></div>';
  readyTimer=setTimeout(()=>fail('プレーヤーの準備を確認できませんでした。通信やブラウザの制限をご確認ください。'),16000);
  player=new window.YT.Player('youtubePlayer',{host:'https://www.youtube-nocookie.com',videoId:r.video_id,width:'100%',height:'100%',playerVars:{autoplay:0,playsinline:1,controls:1,fs:0,origin:location.origin},events:{
   onReady:e=>{if(!active())return;clearTimeout(readyTimer);if(document.hidden){try{e.target.pauseVideo()}catch{}}$('#playerStatus').textContent='YouTubeの再生ボタンを押してください。通信環境や公開設定により視聴できない場合があります。';const f=$('#youtubePlayer');f?.setAttribute('title',r.title);f?.setAttribute('referrerpolicy','strict-origin-when-cross-origin')},
   onError:e=>{const messages={100:'削除・非公開などにより視聴できません。',101:'投稿者が外部サイトへの埋め込みを許可していません。',150:'投稿者が外部サイトへの埋め込みを許可していません。',153:'YouTubeがブラウザの再生元を確認できませんでした。',2:'動画IDが正しくありません。',5:'この環境では動画を再生できません。'};fail(messages[e.data]||'再生中に問題が起きました。')}
  }});
 }catch{fail('YouTubeに接続できませんでした。')}
}
function exportList(){const rows=filter();const cols=['タイトル','広告主・対象','都道府県','市区町村','種類','埋め込みURL','YouTube URL','出典','確認状況','放送範囲'];const quote=s=>'"'+String(s??'').replace(/^[\s\u0000-\u001f]*[=+@-]/,"'$&").replace(/"/g,'""')+'"';const csv='\ufeff'+[cols,...rows.map(r=>[r.title,r.company,r.pref,(r.municipalities||[]).map(m=>m.name).join('・'),r.kind,r.url,r.watch_url,r.source,r.evidence,r.broadcast])].map(r=>r.map(quote).join(',')).join('\r\n');{const u=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=u;a.download='national-cm-catalog.csv';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}}
let addingRecord=false,addGeneration=0;
function setAddBusy(busy){addingRecord=busy;for(const id of ['addSubmit','addTitle','addUrl','addCompany','addPref','addCity'])$('#'+id).disabled=busy}
function invalidateAdd(){addGeneration++;setAddBusy(false)}
function showAdd(){invalidateAdd();const f=$('#addForm');f.reset();$('#addError').textContent='';$('#addPref').innerHTML='<option value="全国共通CM">全国共通CM（未確認候補）</option>'+PREFS.map(p=>`<option>${p}</option>`).join('');$('#addDialog').showModal()}
async function addRecord(e){e.preventDefault();if(addingRecord)return;const request=addGeneration;const title=$('#addTitle').value.trim(),id=videoId($('#addUrl').value.trim()),pref=$('#addPref').value,city=$('#addCity').value.trim(),company=$('#addCompany').value.trim();if(!title||!id){$('#addError').textContent='CM名と有効なYouTube動画URLを入力してください。';return}if(!legacyLoaded){setAddBusy(true);$('#addError').textContent='登録済みの動画か確認しています…';const loaded=await ensureLegacy();if(request!==addGeneration||!$('#addDialog').open)return;setAddBusy(false);if(!loaded){$('#addError').textContent='重複の確認に必要なデータを読み込めませんでした。通信を確認して再度追加してください。';return}if(!$('#addDialog').open)return;$('#addError').textContent=''}if(records.some(r=>r.video_id===id)){const r=records.find(r=>r.video_id===id);$('#addError').textContent='この動画は登録済みです：'+r.title;return}let m=MUNICIPALITIES.cities.find(c=>c.pref===pref&&c.name===city);if(city&&!m){$('#addError').textContent='市区町村名は選んだ都道府県の正式名称で入力してください。例：名古屋市';return}let r={id:'yt_'+id,video_id:id,title,company:company||'自分で追加',pref,regions:[pref],municipalities:m?[{...m,relation:'ユーザーによる地域指定（未確認）'}]:[],scope:m?'municipal':'unknown',verification:'user_added',kind:'追加候補',evidence:'ユーザー登録。CM本編・公式性・地域・再生可否は未確認。',url:'https://www.youtube.com/embed/'+id,watch_url:'https://www.youtube.com/watch?v='+id,source:'https://www.youtube.com/watch?v='+id};saved.custom.push(r);records.unshift(r);byId.set(r.id,r);index(r);saved.favorites[r.id]=Date.now();const success=persist();$('#addDialog').close();Object.assign(state,{tab:'favorites',pref:'',city:'',scope:'',q:'',era:'',page:0});render();toast(success?'動画をこのブラウザに追加・保存しました':'動画をこのタブに追加しました。保存はできていません。')}
function init(){
 $('#pref').innerHTML='<option value="">47都道府県すべて</option>'+PREFS.map(p=>`<option>${p}</option>`).join('');
 $('#officialCount').textContent=STATS.official.toLocaleString();$('#townCount').textContent=STATS.municipalities.toLocaleString();$('#totalCount').textContent=(STATS.total+saved.custom.length).toLocaleString();
 document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>setTab(b.dataset.tab));$('#findRegion').onclick=()=>setTab('regions');$('#pickOne').onclick=()=>{const a=records.filter(r=>r.verification==='official_source');showPlayer(a[Math.floor(Math.random()*a.length)].id)};
 $('#q').oninput=()=>{state.q=$('#q').value;state.page=0;renderList()};$('#pref').onchange=()=>{state.pref=$('#pref').value;state.city='';state.page=0;updateCities();renderList()};$('#city').onchange=()=>{state.city=$('#city').value;state.page=0;renderList()};$('#tier').onchange=()=>changeTier($('#tier').value);$('#era').onchange=()=>{state.era=$('#era').value;state.page=0;renderList()};
 $('#clear').onclick=()=>{Object.assign(state,{pref:'',city:'',q:'',era:'',page:0});render()};$('#export').onclick=exportList;$('#add').onclick=showAdd;$('#addForm').onsubmit=addRecord;$('#closePlayer').onclick=closePlayer;$('#startEmbed').onclick=startEmbed;
 $('#playerDialog').addEventListener('cancel',()=>stopPlayer());$('#playerDialog').addEventListener('close',()=>{if(!$('#playerDialog').open){stopPlayer();if(state.tab==='history')renderList();restorePlayerFocus()}});$('#addDialog').addEventListener('cancel',invalidateAdd);$('#addDialog').addEventListener('close',()=>{if(!$('#addDialog').open)invalidateAdd()});
 document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$('#'+b.dataset.close).close());$('#info').onclick=()=>$('#infoDialog').showModal();
 render();$('#appHeader').inert=false;$('#appMain').inert=false;dataMessage('');loadSavedCandidates();
}
init();
