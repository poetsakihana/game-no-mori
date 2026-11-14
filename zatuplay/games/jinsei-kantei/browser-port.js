/* ZatuPlay browser integration. Original gameplay and content retained. */
(() => {
  document.title = '人生ゲーム〜鑑定論〜 | ZatuPlay';
  const bar = document.createElement('aside');
  bar.setAttribute('aria-label', 'ZatuPlay ブラウザ版の案内');
  bar.style.cssText = 'margin:12px 6%;padding:12px;border:1px solid #ad9463;border-radius:12px;line-height:1.7';
  const back = document.createElement('a'); back.href='../../'; back.textContent='← ZatuPlay に戻る';
  bar.append(back, document.createElement('br'));
  const info=document.createElement('span');
  info.textContent='ブラウザ版：保存はこのブラウザ内です。APK版とは共有されません。鑑定は創作・娯楽であり、実際の運命や医学的判断を示すものではありません。';
  bar.append(info); document.querySelector('header').before(bar);
  if(invalidLifeSave){const warn=document.createElement('p');warn.setAttribute('role','alert');warn.textContent='人生の保存データを読み込めませんでした。元のデータは変更していません。新しい人生を始めると置き換えます。';bar.append(warn)}
  let importing=false;
  const originalImport=importRecords;
  importRecords=async function(file){if(!file||importing)return;if(!confirm('バックアップを読み込み、現在の鑑定記録に統合しますか？'))return;importing=true;try{return await originalImport(file)}finally{importing=false}};
  document.addEventListener('change',e=>{if(e.target.id==='restore-records')setTimeout(()=>{e.target.value=''},0)});
  // Other tabs must reload before writing stale in-memory records back.
  window.addEventListener('storage',e=>{if(e.storageArea!==localStorage||!(e.key===null||e.key.startsWith('zatuplay-jinsei-')))return;
    if(document.getElementById('zatu-storage-changed'))return;
    const overlay=document.createElement('div');overlay.id='zatu-storage-changed';overlay.setAttribute('role','alertdialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','別タブで保存が更新されました');overlay.style.cssText='position:fixed;inset:0;z-index:99999;background:#101721f5;display:flex;align-items:center;justify-content:center;flex-direction:column;padding:24px;color:white';
    const message=document.createElement('p');message.textContent='別のタブで保存データが変わりました。上書きを防ぐため、再読み込みしてください。';const button=document.createElement('button');button.textContent='再読み込み';button.onclick=()=>location.reload();overlay.append(message,button);document.body.append(overlay);for(const child of document.body.children){if(child!==overlay)child.inert=true}button.focus();
  });
})();
