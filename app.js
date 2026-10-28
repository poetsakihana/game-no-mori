'use strict';
// GitHub Pagesでは公開先のユーザー名・リポジトリ名を自動判定します。
const fallback = { owner: 'poetsakihana', repo: 'game-no-mori' };
const pathRepo = location.pathname.split('/').filter(Boolean)[0];
const onPages = location.hostname.endsWith('.github.io');
const owner = onPages ? location.hostname.split('.')[0] : fallback.owner;
const repo = onPages && pathRepo ? pathRepo : fallback.repo;
const repoURL = `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
const $ = s => document.querySelector(s);
let games = [];
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
 const q=$('#search').value.trim().toLocaleLowerCase('ja');
 const list=games.filter(g=>[g.title,g.name,g.description].some(t=>t.toLocaleLowerCase('ja').includes(q)));
 list.sort($('#sort').value==='name' ? (a,b)=>a.title.localeCompare(b.title,'ja') : $('#sort').value==='size' ? (a,b)=>a.size-b.size : (a,b)=>new Date(b.date)-new Date(a.date));
 $('#count').textContent=`${list.length} / ${games.length} 本`;
 $('#cards').replaceChildren();
 if(games.length) $('#status').textContent=list.length ? '' : 'このキーワードのゲームは見つかりませんでした。';
 for (const g of list) {
  const card=el('article','card'); const cover=el('div','cover','♧'); cover.setAttribute('aria-hidden','true');
  const body=el('div','card-body'); body.append(el('span','tag',g.prerelease?'ANDROID / 試作版':'ANDROID / APK'),el('h3','',g.title));
  body.append(el('p','',g.description.slice(0,160) || 'ゲームの詳細は配布ページをご覧ください。'));
  const date=new Date(g.date); body.append(el('div','meta',`${g.version} · ${(g.size/1048576).toFixed(1)} MiB${Number.isNaN(date.getTime())?'':` · ${date.toLocaleDateString('ja-JP')}`}`));
  const download=el('a','download','↓ APKをダウンロード'); download.href=g.url;
  download.setAttribute('aria-label',`${g.title}のAPKをダウンロード`); body.append(download,el('p','filename',g.name));
  if(g.details) { const detail=el('a','detail','ゲーム詳細・更新内容 ↗'); detail.href=g.details;detail.target='_blank';detail.rel='noopener';body.append(detail); }
  card.append(cover,body); $('#cards').append(card);
 }
}
async function load() {
 $('#retry').hidden=true; $('#status').textContent='森のゲームを読み込んでいます…';
 let releases=[]; let partial=false;
 try {
  for(let page=1;page<=20;page++) {
   const response=await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/releases?per_page=100&page=${page}`,{headers:{Accept:'application/vnd.github+json'},signal:AbortSignal.timeout(20000)});
   if(!response.ok) throw new Error(response.status===404 ? '配布先がまだ準備中です。公開リポジトリを作り、ReleasesにAPKを追加してください。' : [403,429].includes(response.status) ? '一覧の取得が一時的に制限されています。少し時間をおくか、GitHubの配布一覧をご利用ください。' : 'ゲーム一覧を取得できませんでした。通信状態をご確認ください。');
   const data=await response.json(); if(!Array.isArray(data)) throw new Error('配布データを読み込めませんでした。');
   releases.push(...data); if(data.length<100) break; if(page===20) partial=true;
  }
  games=toGames(releases); render();
  $('#status').textContent=games.length ? (partial?'直近2,000リリース分を表示しています。すべての配布はGitHubの一覧をご覧ください。':'') : 'ゲームの森は、ただいま開園準備中です。\nAPKが公開されると、ここにダウンロードボタンが並びます。';
 } catch(error) {
  if(releases.length) { games=toGames(releases); render(); }
  $('#status').textContent=(releases.length?'一部のゲームを表示しています。\n':'') + (error.name==='TimeoutError'?'読み込みに時間がかかっています。もう一度お試しください。':error instanceof TypeError?'通信できませんでした。ネット接続をご確認いただくか、GitHubの配布一覧をご利用ください。':error.message);
  $('#retry').hidden=false;
 }
}
$('#search').addEventListener('input',render); $('#sort').addEventListener('change',render); $('#retry').addEventListener('click',load); load();
