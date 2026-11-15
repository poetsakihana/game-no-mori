(async()=>{
 const bar=document.createElement('aside');bar.id='browserToolbar';bar.style='position:relative;z-index:100;padding:6px 10px;background:#0f172a;color:white;font-size:12px;line-height:1.4';
 bar.innerHTML='<style>#browserToolbar .bt-line{display:flex;align-items:center;flex-wrap:wrap;gap:4px 10px}#browserToolbar a{color:#7dd3fc}#browserToolbar button,#browserToolbar summary,#browserToolbar a{min-height:44px;display:inline-flex;align-items:center;padding:6px 10px;margin:0;font-size:12px}#browserToolbar button{border:1px solid #64748b;background:#1e293b;color:#f8fafc;border-radius:6px}#browserToolbar details{margin:0}#browserToolbar details p{margin:4px 0;max-width:85ch}#browserToolbar summary{cursor:pointer;list-style:revert}#browserToolbar summary:focus-visible,#browserToolbar button:focus-visible,#browserToolbar a:focus-visible{outline:3px solid #facc15;outline-offset:2px}</style><div class="bt-line"><a href="../../browser/">← 一覧</a><strong>グラスマ強化版 v1.2.0-web.1</strong><span>非公式・音初期OFF・APKとは別保存</span></div><div class="bt-line"><span id="browserSaveStatus" role="status"></span><button id="browserExport">JSON保存</button><button id="browserImportButton">JSON復元</button><input hidden id="browserImport" type="file" accept=".json,application/json"><details><summary>注意・出典・確認範囲</summary><p>非公式ファン制作版です。公式サービス・完全再現ではありません。創作イラストと独自ルールを含みます。原本に制作版オリジナルと記載された48音源を収録。独立した権利証明・実聴取検証は未実施です。</p><p>音は初期OFFです。サウンド設定から有効にできます。ゲーム内通貨は虚構のポイントで、実際の課金はありません。APKや他の端末と自動同期しません。大切な記録はJSON保存で保管してください。</p><p>スマホ実機・全編・音実聴取未確認。</p></details></div>';
 document.body.prepend(bar);
 // Only the fixed title surface yields to the toolbar; gameplay layout is unchanged.
 const titleFit=document.createElement('style');titleFit.textContent='#browserToolbar{max-height:50vh;overflow-y:auto;box-sizing:border-box}#titleScreen{top:var(--zatuplay-toolbar-height,0px)!important;bottom:0!important;height:auto!important;min-height:0!important;overflow-y:auto!important}';document.head.append(titleFit);
 const fitTitle=()=>document.documentElement.style.setProperty('--zatuplay-toolbar-height',bar.getBoundingClientRect().height+'px');
 fitTitle();if(typeof ResizeObserver!=='undefined')new ResizeObserver(fitTitle).observe(bar);else bar.querySelector('details').addEventListener('toggle',fitTitle);window.addEventListener('resize',fitTitle);

 document.getElementById('browserImportButton').onclick=()=>document.getElementById('browserImport').click();
 await BrowserStore.ready();
 const scripts=["roster.js?v=20261020-arena", "seasons.js?v=20261020-arena", "quest-data.js?v=20261020-arena", "effects.js?v=20261020-arena", "game.js?v=20261020-arena", "mini-roster.js?v=20261020-arena", "visuals.js?v=20261020-arena", "growth.js?v=20261020-arena", "ownership.js?v=20261020-arena", "gimmicks.js?v=20261020-arena", "battle-plus.js?v=20261020-arena", "progression-plus.js?v=20261020-arena", "collection.js?v=20261020-arena", "navigation.js?v=20261020-arena", "gacha-ui.js?v=20261020-arena", "season-ui.js?v=20261020-arena", "story-data.js?v=20261020-arena", "story.js?v=20261020-arena", "enemies.js?v=20261020-arena", "training.js?v=20261020-arena", "skills-data.js?v=20261020-arena", "skills.js?v=20261020-arena", "auto-team.js?v=20261020-arena", "tap-hs.js?v=20261020-arena", "audio-data.js?v=20261020-arena", "soundtrack.js?v=20261020-arena", "arena.js?v=20261020-arena", "challenge-upgrade.js", "chibi-fx.js", "battle-comfort.js"];
 try { for(const src of scripts) await new Promise((ok,no)=>{const tag=document.createElement('script');tag.src=src;tag.onload=ok;tag.onerror=no;document.body.append(tag)}); }
 catch(e){document.getElementById('browserSaveStatus').textContent+=' 起動ファイルを読み込めませんでした';return}
 // Storage-mode labels only; never change game progress or audio.
 const syncSaveLabels=()=>{
   const temporary=!BrowserStore.writable;
   const title=document.getElementById('titleSaveNote');
   const titleText=temporary?'一時プレイ：進行は自動保存されません。JSON保存で保管してください':'進行状況はこのタブからブラウザに保存されます';
   if(title&&title.textContent!==titleText)title.textContent=titleText;
   document.querySelectorAll('.footer').forEach(el=>{
     if(!el.dataset.savePrefix)el.dataset.savePrefix=el.textContent.replace(/進行状況はこのブラウザに自動保存します。/g,'');
     const text=el.dataset.savePrefix+(temporary?'一時プレイ中は進行状況を自動保存しません。JSON保存で保管してください。':'進行状況はこのタブからブラウザに自動保存します。');
     if(el.textContent!==text)el.textContent=text;
   });
 };
 syncSaveLabels();
 if(typeof MutationObserver!=='undefined'){
   const saveLabelObserver=new MutationObserver(syncSaveLabels);
   for(const id of ['browserSaveStatus','titleSaveNote']){const el=document.getElementById(id);if(el)saveLabelObserver.observe(el,{childList:true,characterData:true,subtree:true})}
 }
 document.getElementById('browserExport').onclick=()=>{const b=new Blob([BrowserStore.exportData()],{type:'application/json'}),u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download='zatuplay-grasuma-save.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)};
 document.getElementById('browserImport').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;try{if(f.size>1000000)throw Error('1MB以内の記録を選んでください');const text=await f.text();BrowserStore.validateExport(text);if(!confirm('現在の記録を置き換え、再読込します。続けますか？'))return;BrowserStore.importData(text);location.reload()}catch(err){alert('復元できません: '+err.message)}};
 window.addEventListener('pagehide',()=>{if(globalThis.BattleComfort)BattleComfort.set(true)});
})();