'use strict';
// GitHub Pagesでは公開先のユーザー名・リポジトリ名を自動判定します。
const fallback = { owner: 'poetsakihana', repo: 'game-no-mori' };
const pathRepo = location.pathname.split('/').filter(Boolean)[0];
const onPages = location.hostname.endsWith('.github.io');
const owner = onPages ? location.hostname.split('.')[0] : fallback.owner;
const repo = onPages && pathRepo ? pathRepo : fallback.repo;
const repoURL = `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
const $ = s => document.querySelector(s);
const CATALOG_URL = './zatuplay/data/app-catalog.json';
let driveGames = [], releaseGames = [], games = [];
let loadGeneration = 0;
let catalogSummary = 'ZatuPlayのAPKカタログを読み込んでいます。';
function safeDrive(url) {
 try { const u=new URL(url); return u.protocol==='https:' && u.hostname==='drive.google.com' && /^\/file\/d\/[^/]+\/view$/.test(u.pathname) ? u.href : null; } catch { return null; }
}
function fromCatalog(catalog) {
 if(!catalog || !Array.isArray(catalog.apps)) throw new Error('APKカタログの形式を確認できませんでした。');
 const items=[], seen=new Set();
 for(const app of catalog.apps) {
  if(!app || typeof app.name!=='string' || !Array.isArray(app.versions)) throw new Error('APKカタログの作品情報を確認できませんでした。');
  for(const v of app.versions) {
   const url=safeDrive(v.viewUrl);
   if(!url || typeof v.fileId!=='string' || !url.includes('/d/'+v.fileId+'/') || !/\.apk$/i.test(v.filename || '')) throw new Error('APKの配布情報を確認できませんでした。');
   if(seen.has(v.fileId)) continue;
   seen.add(v.fileId);
   items.push({id:'drive-'+v.fileId,appId:app.id,title:app.name,name:v.filename,
    description:[app.description,app.subtitle,...(app.tags || [])].filter(x=>typeof x==='string').join(' · '),
    size:Number.isFinite(v.size)&&v.size>0?v.size:null,date:v.modifiedAt || '',
    url,details:url,version:v.version || 'バージョン記載なし',source:'drive',restricted:v.available!==true});
  }
 }
 return {items,works:catalog.apps.length};
}
function formatSize(size) {
 if(!Number.isFinite(size) || size<=0) return '容量未確認';
 if(size<1048576) return `${Math.max(1,Math.ceil(size/1024))} KiB`;
 return `${(size/1048576).toFixed(1)} MiB`;
}
function refreshGames() { games=[...driveGames,...releaseGames]; render(); }
$('#all-releases').href = repoURL + '/releases';
$('#upload').href = repoURL + '/releases/new';
function el(tag, cls, text) { const n = document.createElement(tag); if(cls) n.className=cls; if(text !== undefined) n.textContent=text; return n; }
function safeGitHub(url) { try { const u=new URL(url); return u.protocol==='https:' && u.hostname==='github.com' ? u.href : null; } catch { return null; } }
function toGames(releases) {
 const items=[];
 for (const r of releases) {
  if(r.draft) continue;
  for(const a of r.assets || []) {
   if(!/\.apk$/i.test(a.name) || !safeGitHub(a.browser_download_url)) continue;
   items.push({id:a.id,title:a.label || ((r.assets || []).filter(x=>/\.apk$/i.test(x.name)).length===1 ? r.name || a.name.replace(/\.apk$/i,'') : a.name.replace(/\.apk$/i,'')),description:r.body || '',name:a.name,size:Number(a.size)||0,date:r.published_at || a.updated_at,url:safeGitHub(a.browser_download_url),details:safeGitHub(r.html_url),version:r.tag_name || '',prerelease:r.prerelease});
  }
 }
 return items;
}
function render() {
 $('#catalog-summary').textContent=catalogSummary;
 const q=$('#search').value.trim().toLocaleLowerCase('ja');
 const list=games.filter(g=>[g.title,g.name,g.description].some(t=>t.toLocaleLowerCase('ja').includes(q)));
 list.sort($('#sort').value==='name' ? (a,b)=>a.title.localeCompare(b.title,'ja') : $('#sort').value==='size' ? (a,b)=>(a.size>0?a.size:Infinity)-(b.size>0?b.size:Infinity) : (a,b)=>new Date(b.date)-new Date(a.date));
 $('#count').textContent=`${list.length} / ${games.length} 本`;
 $('#cards').replaceChildren();
 if(games.length) $('#status').textContent=list.length ? '' : 'このキーワードのゲームは見つかりませんでした。';
 for (const g of list) {
  const card=el('article','card'); const cover=el('div','cover','♧'); cover.setAttribute('aria-hidden','true');
  const body=el('div','card-body'); body.append(el('span','tag',g.source==='drive' ? (g.restricted?'ANDROID / アクセス権が必要':'ANDROID / GOOGLE DRIVE') : g.prerelease?'ANDROID / 試作版':'ANDROID / APK'),el('h3','',g.title));
  body.append(el('p','',g.description.slice(0,160) || 'ゲームの詳細は配布ページをご覧ください。'));
  const date=new Date(g.date); body.append(el('div','meta',`${g.version} · ${formatSize(g.size)}${Number.isNaN(date.getTime())?'':` · ${date.toLocaleDateString('ja-JP')}`}`));
  const download=el('a','download',g.source==='drive'?'GoogleドライブでAPKを開く ↗':'↓ APKをダウンロード'); download.href=g.url; download.target='_blank'; download.rel='noopener';
  download.setAttribute('aria-label',`${g.title}${g.source==='drive'?'のGoogleドライブ配布画面を開く':'のAPKをダウンロード'}`); body.append(download,el('p','filename',g.name));
  if(g.details) { const detail=el('a','detail',g.source==='drive'?'Googleドライブの配布元 ↗':'ゲーム詳細・更新内容 ↗'); detail.href=g.details;detail.target='_blank';detail.rel='noopener';body.append(detail); }
  card.append(cover,body); $('#cards').append(card);
 }
}
async function load() {
 const generation=++loadGeneration;
 $('#retry').hidden=true;
 $('#status').textContent='APKカタログと追加の配布情報を確認中…';
 const errors=[];
 const catalogTask=(async()=>{
  try {
   const response=await fetch(CATALOG_URL,{cache:'no-cache',signal:AbortSignal.timeout(20000)});
   if(!response.ok) throw new Error('APKカタログを取得できませんでした。');
   const result=fromCatalog(await response.json());
   if(generation!==loadGeneration) return;
   driveGames=result.items;
   catalogSummary=`ZatuPlayのAPKカタログ：${result.works}作品・${result.items.length} APK（旧バージョンを含む）。`;
  } catch(error) {
   if(generation!==loadGeneration) return;
   errors.push('APKカタログを更新できませんでした。');
   catalogSummary=driveGames.length ? '前回読み込んだAPKカタログを表示しています。最新情報は再読み込みしてください。' : 'APKカタログを読み込めませんでした。ZatuPlayのAndroid・APK版もご確認ください。';
  }
 })();
 const releasesTask=(async()=>{
  const releases=[];
  try {
   for(let page=1;page<=20;page++) {
    const response=await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/releases?per_page=100&page=${page}`,{headers:{Accept:'application/vnd.github+json'},signal:AbortSignal.timeout(20000)});
    if(!response.ok) throw new Error('GitHubの追加配布情報を取得できませんでした。');
    const data=await response.json();
    if(!Array.isArray(data)) throw new Error('GitHubの配布データを読み込めませんでした。');
    releases.push(...data);
    if(data.length<100) break;
    if(page===20) errors.push('GitHubは直近2,000リリース分です。すべての配布はGitHubの一覧をご覧ください。');
   }
   if(generation!==loadGeneration) return;
   releaseGames=toGames(releases);
  } catch(error) {
   if(generation!==loadGeneration) return;
   if(releases.length) releaseGames=toGames(releases);
   errors.push('GitHubの追加配布情報を更新できませんでした。取得済みの一覧は保持しています。');
  }
 })();
 await Promise.all([catalogTask,releasesTask]);
 if(generation!==loadGeneration) return;
 refreshGames();
 $('#status').textContent=errors.length ? errors.join(' ') : games.length ? $('#status').textContent : '現在、配布中のAPKはありません。';
 $('#retry').hidden=!errors.length;
}
$('#search').addEventListener('input',render); $('#sort').addEventListener('change',render); $('#retry').addEventListener('click',load); load();
