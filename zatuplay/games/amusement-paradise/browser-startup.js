'use strict';
(async()=>{
 let importing=false;
 const $=id=>document.getElementById(id),message=s=>$('browserFileStatus').textContent=s;
 $('browserExport').onclick=()=>{try{const blob=new Blob([BrowserStore.exportData()],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='amusement-paradise3d-save.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);message('JSONを書き出しました')}catch(e){message(e.message)}};
 $('browserImport').onclick=()=>{$('browserFile').value='';$('browserFile').click()};
 $('browserFile').onchange=async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;if(importing){message('JSONの確認中です');return}importing=true;try{if(file.size>1000000)throw Error('JSONは1 MB以下にしてください');const text=await file.text();BrowserStore.validateExport(text);if(!confirm('このタブの記録をJSONの内容に置き換え、再読み込みしますか？')){message('復元をキャンセルしました');return}BrowserStore.importData(text);location.reload()}catch(err){message(err.message)}finally{importing=false}};
 await BrowserStore.ready();const script=document.createElement('script');script.src='park3d/game.js';script.onerror=()=>message('ゲームを読み込めませんでした。再読み込みしてください');document.body.appendChild(script);
})();
