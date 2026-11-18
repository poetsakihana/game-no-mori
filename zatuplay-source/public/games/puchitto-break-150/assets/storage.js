"use strict";
(() => {
  const key = "puchitto-break-150-v1";
  let snapshot, active = false;
  const empty = () => ({done: [], favorites: [], sound: false});
  const status = text => document.getElementById('save-status').textContent = text;
  function validate(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data) ||
        Object.keys(data).some(k => !['done','favorites','sound'].includes(k)) ||
        typeof data.sound !== 'boolean') throw Error('保存データの形式が不正です。');
    for (const key of ['done','favorites']) {
      if (!Array.isArray(data[key]) || data[key].length > 150 ||
          data[key].some(n => !Number.isInteger(n) || n < 1 || n > 150) ||
          new Set(data[key]).size !== data[key].length) throw Error('記録の番号が不正です。');
    }
    return data;
  }
  function download(text, name) {
    const url = URL.createObjectURL(new Blob([text], {type:'application/json'}));
    const link = document.createElement('a'); link.href=url; link.download=name;link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
  function stop(reason) {
    active = false;
    try { if (typeof playfield !== 'undefined') playfield?.dispose(); } catch {}
    if (document.getElementById('storage-stop')) return;
    const box=document.createElement('section');box.id='storage-stop';box.setAttribute('role','alert');
    const title=document.createElement('h1');title.textContent='記録を守るため停止しました';
    const text=document.createElement('p');text.textContent=reason+' 既存データは削除しません。ほかのタブを閉じて再読込してください。';
    const button=document.createElement('button');button.textContent='現在の保存データを回収';
    button.onclick=()=>{try {download(localStorage.getItem(key) ?? 'null','puchitto-recovery.json')}catch {text.textContent='保存領域を読み出せません。ブラウザの保存設定を確認してください。'}};
    const reload=document.createElement('button');reload.textContent='再読込';reload.onclick=()=>location.reload();
    const back=document.createElement('a');back.href='../../browser/';back.textContent='ZatuPlayへ戻る';
    box.append(title,text,button,reload,back);document.body.append(box);
    document.querySelectorAll('body > :not(#storage-stop)').forEach(el=>el.inert=true);
  }
  function read() { return snapshot === null ? empty() : validate(JSON.parse(snapshot)); }
  function write(data) {
    try {
      if (!active) throw Error('このタブでは保存できません。');
      validate(data);
      if (localStorage.getItem(key)!==snapshot) throw Error('別のタブで記録が変わりました。');
      const next=JSON.stringify(data);localStorage.setItem(key,next);
      if (localStorage.getItem(key)!==next) throw Error('保存を確認できません。');
      snapshot=next;status('保存済み');return true;
    } catch(e) {stop(e.message); return false;}
  }
  function reloadAfterReplacement() {
    // Quiesce the old in-memory game before navigation can be deferred.
    active = false;
    try { if (typeof playfield !== 'undefined') playfield?.dispose(); } catch {}
    location.reload();
  }
  window.BrowserSave={read,write,validate};
  window.addEventListener('storage',e=>{if(active && (e.key===key || e.key===null))stop('別のタブで保存が変更されました。')});
  window.addEventListener('pageshow',e=>{if(e.persisted)location.reload()});
  document.getElementById('backup').onclick=()=>{try {download(JSON.stringify({format:'puchitto-break-150',version:1,data:read()},null,2),'puchitto-backup.json')}catch(e){stop(e.message)}};
  document.getElementById('restore').onchange=async e=>{
    const file=e.target.files[0];e.target.value='';if(!file)return;
    try {
      if(file.size>100000)throw Error('ファイルが大きすぎます。');
      const obj=JSON.parse(await file.text());
      if(obj.format!=='puchitto-break-150'||obj.version!==1)throw Error('このゲームのバックアップではありません。');
      validate(obj.data);
      if(!confirm('現在のクリア記録・お気に入り・音設定を選択した記録に置き換えます。よろしいですか？'))return;
      if(write(obj.data))reloadAfterReplacement();
    }catch(e){status('復元しませんでした：'+e.message)}
  };
  let resetSnapshot;
  const resetReview = document.getElementById('reset-review');
  document.getElementById('reset-prepare').onclick=()=>{
    try {
      if (!active || localStorage.getItem(key)!==snapshot) throw Error('記録が変更されました。再読込してください。');
      const backup=JSON.stringify({format:'puchitto-break-150',version:1,data:read()},null,2);
      download(backup,'puchitto-before-reset-'+Date.now()+'.json');
      resetSnapshot=snapshot;resetReview.hidden=false;
      document.getElementById('reset-confirm').focus();
    } catch(e) {stop(e.message)}
  };
  document.getElementById('reset-cancel').onclick=()=>{
    resetSnapshot=undefined;resetReview.hidden=true;
    document.getElementById('reset-prepare').focus();
  };
  document.getElementById('reset-confirm').onclick=()=>{
    if(resetReview.hidden || resetSnapshot===undefined)return;
    if(snapshot!==resetSnapshot){
      resetReview.hidden=true;resetSnapshot=undefined;
      status('記録が更新されたため中止しました。もう一度バックアップを書き出してください。');return;
    }
    if(!confirm('バックアップの保存を確認しましたか？ぷちっと休憩150の全クリア記録・お気に入りを消し、音をOFFに戻します。'))return;
    resetReview.hidden=true;resetSnapshot=undefined;
    if(write(empty()))reloadAfterReplacement();
  };
  async function start() {
    try {
      snapshot=localStorage.getItem(key);read();active=true;status('記録を確認しました');
      await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='assets/site.js?v=1.0.0-web.3';s.onload=resolve;s.onerror=()=>reject(Error('ゲームを読み込めません。'));document.head.append(s)});
      await new Promise(()=>{});
    }catch(e){stop(e.message)}
  }
  if(!navigator.locks){stop('このブラウザは保存保護に対応していません。Chromeなどの最新版をご利用ください。');return;}
  navigator.locks.request('zatu-puchitto-save',{ifAvailable:true},lock=>{
    if(!lock){stop('別のタブでこのゲームが開いています。');return;}
    return start();
  }).catch(e=>stop(e.message));
})();
