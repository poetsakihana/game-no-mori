const SOURCES={opening:['灰の向こうへ','movies/DoragonOut_Opening.mp4'],ending:['帰ってこられる場所','movies/DoragonOut_Ending.mp4']};
let active=null;
export function playStandaloneMovie(kind){
 if(active)return active;
 const [title,src]=SOURCES[kind];
 const dialog=document.createElement('dialog');dialog.className='movie-dialog';
 dialog.innerHTML=`<header><h2>${kind==='opening'?'オープニング':'エンディング'}「${title}」</h2><span>5:00</span></header><video controls playsinline preload="metadata" data-doragon-movie src="${src}" aria-label="DoragonOut ${title}"></video><footer><p>${kind==='ending'?'本編の結末を含みます。':'字幕・BGM付きの５分間ムービー'}</p><button type="button">物語へ進む →</button></footer>`;
 document.body.append(dialog);dialog.showModal();const video=dialog.querySelector('video');
 active=new Promise(resolve=>{
  let settled=false;
  const finish=status=>{if(settled)return;settled=true;video.pause();video.removeAttribute('src');video.load();dialog.close();dialog.remove();active=null;resolve(status);};
  dialog.querySelector('button').onclick=()=>finish('skipped');
  dialog.addEventListener('cancel',e=>{e.preventDefault();finish('skipped');});
  dialog.addEventListener('close',()=>finish('skipped'));
  video.addEventListener('ended',()=>finish('watched'));
  video.addEventListener('error',()=>{dialog.querySelector('p').textContent='動画を再生できませんでした。「物語へ進む」で続けられます。';});
  video.play().catch(()=>{});
 });
 return active;
}
