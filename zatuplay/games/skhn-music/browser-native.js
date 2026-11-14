/* Local-only browser adapter. Imported bytes never leave this device. */
(()=>{'use strict';
const MAX=100*1024*1024,MAX_TRACKS=1000;let db,tracks=[],busy=false,status='音楽ファイル・ZIPを選択してください。',error='',id='',url='';const audio=new Audio();let oldUrl='';
function request(r){return new Promise((ok,no)=>{r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)})}
const ready=(async()=>{const r=indexedDB.open('zatuplay-skhn-music-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('tracks',{keyPath:'id'});db=await request(r);tracks=await request(db.transaction('tracks').objectStore('tracks').getAll());status=tracks.length+'曲を保存済み';})();ready.catch(e=>{error='保存領域を開けません。ブラウザの保存許可を確認してください。';});
async function put(t){await ready;return new Promise((ok,no)=>{const tx=db.transaction('tracks','readwrite');tx.objectStore('tracks').put(t);tx.oncomplete=ok;tx.onerror=()=>no(tx.error);tx.onabort=()=>no(tx.error)})}
const mime=n=>({mp3:'audio/mpeg',wav:'audio/wav',ogg:'audio/ogg',m4a:'audio/mp4',aac:'audio/aac',flac:'audio/flac',webm:'audio/webm'})[n.split('.').pop().toLowerCase()];
async function zip(file){const bytes=new Uint8Array(await file.arrayBuffer()),v=new DataView(bytes.buffer);let end=-1;for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--)if(v.getUint32(i,true)===0x06054b50){end=i;break}if(end<0)throw Error('ZIPの目次が見つかりません');const count=v.getUint16(end+10,true);if(count>1000)throw Error('ZIPは1000項目以内にしてください');let p=v.getUint32(end+16,true),total=0,out=[];for(let i=0;i<count;i++){if(p+46>bytes.length||v.getUint32(p,true)!==0x02014b50)throw Error('壊れたZIPです');const flags=v.getUint16(p+8,true),method=v.getUint16(p+10,true),cs=v.getUint32(p+20,true),us=v.getUint32(p+24,true),nl=v.getUint16(p+28,true),el=v.getUint16(p+30,true),cl=v.getUint16(p+32,true),off=v.getUint32(p+42,true);const name=new TextDecoder(flags&2048?'utf-8':'shift-jis').decode(bytes.slice(p+46,p+46+nl));p+=46+nl+el+cl;if(!mime(name))continue;if(flags&1)throw Error('暗号化ZIPには対応していません');total+=us;if(total>MAX||us>MAX)throw Error('展開後の音楽は合計100MB以内にしてください');if(off+30>bytes.length||v.getUint32(off,true)!==0x04034b50)throw Error('ZIPデータが不正です');const start=off+30+v.getUint16(off+26,true)+v.getUint16(off+28,true);if(start+cs>bytes.length)throw Error('ZIPデータが欠けています');let b=new Blob([bytes.slice(start,start+cs)]);if(method===8){const reader=b.stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();let chunks=[],size=0;for(;;){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>us||size>MAX){await reader.cancel();throw Error('展開サイズの上限を超えました')}chunks.push(value)}b=new Blob(chunks);}else if(method!==0)throw Error('このZIPの圧縮方式に対応していません');if(b.size!==us)throw Error('ZIPの展開サイズが一致しません');out.push({name:name.split('/').pop(),blob:new Blob([b],{type:mime(name)})});}return out;}
const picker=document.createElement('input');picker.type='file';picker.multiple=true;picker.accept='audio/*,.zip,.skhn';picker.hidden=true;document.body.appendChild(picker);
// One atomic transaction: quota or limit failures never leave a half-imported batch.
async function importUnique(incoming){
 const candidates=new Map();
 for(const x of incoming){
  const hash=await crypto.subtle.digest('SHA-256',await x.blob.arrayBuffer());
  const key=Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
  if(!candidates.has(key))candidates.set(key,{id:key,title:x.name.replace(/\.[^.]+$/,''),genre:'未分類',playlists:'',blob:x.blob});
 }
 return new Promise((ok,no)=>{
  const tx=db.transaction('tracks','readwrite'),store=tx.objectStore('tracks');let failure,added=[];
  const keys=store.getAllKeys();
  keys.onsuccess=()=>{try{
   const existing=new Set(keys.result);added=[...candidates.values()].filter(t=>!existing.has(t.id));
   if(existing.size+added.length>MAX_TRACKS){failure=Error('保存上限は1000曲です（重複音源は数えません）。');tx.abort();return;}
   for(const t of added)store.add(t);
  }catch(e){failure=e;tx.abort();}};
  tx.oncomplete=()=>ok(added.length);
  tx.onerror=()=>{}; // Abort is the terminal error, after rollback.
  tx.onabort=()=>no(failure||tx.error||Error('取り込みを中断しました'));
 });
}
picker.onchange=async()=>{if(busy)return;busy=true;error='';let added=0;try{
 await ready;const files=[...picker.files];
 if(files.reduce((n,f)=>n+f.size,0)>MAX)throw Error('1回の取り込みは合計100MB以内です');
 let incoming=[],expanded=0;
 for(const f of files){status='読み込み中: '+f.name;
  const entries=/\.(zip|skhn)$/i.test(f.name)?await zip(f):mime(f.name)?[{name:f.name,blob:f}]:[];
  expanded+=entries.reduce((n,x)=>n+x.blob.size,0);
  if(expanded>MAX)throw Error('複数ZIPを含め、展開後の音楽は1回合計100MB以内にしてください');
  incoming.push(...entries);
 }
 if(!incoming.length)throw Error('対応する音楽がありません（MP3/WAV/OGG/M4A/AAC/FLAC/WebM）');
 added=await importUnique(incoming);
 tracks=await request(db.transaction('tracks').objectStore('tracks').getAll());
 status=added+'曲を取り込みました。重複音源は追加しません。';
}catch(e){
 error=e.name==='QuotaExceededError'?'端末の保存容量が不足しています。今回の取り込みは保存していません。元音源を保管し、空き容量を確認してください。':e.message;
 status=added?added+'曲を保存しましたが、一覧の再取得に失敗しました。再読み込みしてください。':'今回の追加は0曲です。既存の音源と分類は変更していません。';
}finally{busy=false;picker.value=''}};

window.Native={pick(){picker.click()},list(){return JSON.stringify(tracks.map(({blob,...t})=>t))},state(){return JSON.stringify({id,playing:!audio.paused,busy,status,error,position:Number.isFinite(audio.currentTime)?audio.currentTime*1000:0,duration:Number.isFinite(audio.duration)?audio.duration*1000:0})},async play(key){try{await ready;const t=tracks.find(t=>t.id===key);if(!t)return;audio.pause();if(oldUrl)URL.revokeObjectURL(oldUrl);oldUrl=URL.createObjectURL(t.blob);audio.src=oldUrl;id=key;error='';await audio.play()}catch(e){error='再生できません。この端末の対応形式または再生許可をご確認ください。'}},toggle(){if(audio.paused)audio.play().catch(()=>error='再生を開始できません');else audio.pause()},seek(ms){if(Number.isFinite(audio.duration))audio.currentTime=Math.max(0,Math.min(ms/1000,audio.duration))},async edit(key,genre,playlists){try{const t=tracks.find(t=>t.id===key);if(t){const updated={...t,genre:String(genre).slice(0,100),playlists:String(playlists).slice(0,500)};await put(updated);Object.assign(t,updated)}}catch(e){error='編集を保存できません';}}};
audio.onended=()=>window.songEnded?.();audio.onerror=()=>{error='音声形式に未対応、または音源が破損しています。'};window.addEventListener('pagehide',()=>audio.pause());
})();
