/* Browser adaptation. Original poems, cast, story and SVGs remain unchanged. */
(function(root){
'use strict';
const KEY='zatuplay.sakihana-shikai.web.v1', FORMAT='zatuplay-sakihana-shikai', VERSION=1;
function fresh(){return {index:0,read:[],favorites:[],collected:{},met:[],position:{x:500,y:400},sound:false};}
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
function record(v){return !!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;}
function integers(v,min,max){if(!Array.isArray(v)||v.length>max-min+1||v.some(x=>!Number.isInteger(x)||x<min||x>max)||new Set(v).size!==v.length)throw Error('Invalid list');return v.slice();}
function validate(input){
 if(!record(input))throw Error('Invalid record');
 let s=input;
 if(own(input,'format')){if(input.format!==FORMAT||input.version!==VERSION||typeof input.savedAt!=='string'||!Number.isFinite(Date.parse(input.savedAt)))throw Error('Invalid envelope');s=input.data;}
 if(!record(s)||!Number.isInteger(s.index)||s.index<0||s.index>=2183||!record(s.collected))throw Error('Invalid journey');
 const out=fresh();out.index=s.index;out.read=integers(s.read,1,2183);out.favorites=integers(s.favorites,1,2183);out.met=own(s,'met')?integers(s.met,0,48):[];
 for(const [id,v] of Object.entries(s.collected)){if(!/^[1-9]\d*$/.test(id)||+id>2183)throw Error('Invalid poem');out.collected[id]=integers(v,0,2);}
 for(const id of out.read)if(out.collected[id]?.length!==3)throw Error('Read poem lacks fragments');
 if(own(s,'position')){if(!record(s.position)||!Number.isFinite(s.position.x)||!Number.isFinite(s.position.y)||s.position.x<35||s.position.x>965||s.position.y<90||s.position.y>470)throw Error('Invalid position');out.position={x:s.position.x,y:s.position.y};}
 if(own(s,'sound')){if(typeof s.sound!=='boolean')throw Error('Invalid sound');out.sound=s.sound;}
 return out;
}
function decode(raw){if(typeof raw!=='string'||raw.length>2000000)throw Error('Record too large');return validate(JSON.parse(raw));}
function encode(state){return JSON.stringify({format:FORMAT,version:VERSION,savedAt:new Date().toISOString(),data:validate(state)});}
function createStore(env,notify){
 let storage=null,raw=null,writable=false,release=null,backup=null,closed=false,settleLoad=null;
 function status(reason){writable=false;if(!closed)notify(reason);}
 async function load(){
  if(closed)return fresh();
  if(!env.navigator?.locks?.request)notify('このブラウザは安全な同時保存に非対応です。メモリ内で遊べますが、自動保存はしません。記録を書き出してください。');
  else await new Promise(resolve=>{
   const done=()=>{settleLoad=null;resolve();};settleLoad=done;
   try{Promise.resolve(env.navigator.locks.request(KEY,{ifAvailable:true},async lock=>{
    // A page can close while request() is awaiting its asynchronous callback.
    // Never retain a lock or revive a loader after close(), even when granted late.
    if(closed){done();return;}
    if(!lock){notify('別のタブが保存中です。このタブはメモリ内のみで進みます。自動保存を使うには他のタブを閉じて再読み込みしてください。');done();return;}
    writable=true;done();await new Promise(r=>{release=r;});
   })).catch(()=>{status('保存ロックを取得できません。メモリ内のみで遊べます。');done();});}catch{status('保存ロックを取得できません。メモリ内のみで遊べます。');done();}
  });
  if(closed)return fresh();
  try{storage=env.localStorage;raw=storage.getItem(KEY);if(raw!==null)return decode(raw);}
  catch{status('保存済み記録を読めません。元記録を上書きせず、メモリ内で開始します。保存済み記録の書き出しを利用できます。');}
  return fresh();
 }
 function check(){if(!writable||closed)return false;try{if(storage.getItem(KEY)!==raw){status('別の画面で記録が変わりました。上書きを止めました。現在の記録を書き出してください。');return false;}return true;}catch{status('保存領域にアクセスできません。現在の記録を書き出してください。');return false;}}
 function write(state){if(!check())return false;try{const next=encode(state);storage.setItem(KEY,next);raw=next;return true;}catch{status('自動保存できませんでした。現在の記録はメモリ内にあります。記録を書き出してください。');return false;}}
 function replace(next,current){
  const before=encode(current);backup=before;
  if(!writable)return {ok:true,persisted:false};
  if(!check())return {ok:false,persisted:false};
  try{storage.setItem(KEY+'.before-import',before);if(storage.getItem(KEY+'.before-import')!==before)throw Error();}catch{status('復元前のバックアップを保存できないため、読み込みを中止しました。現在の記録は変更していません。');return {ok:false,persisted:false};}
  return {ok:write(next),persisted:writable};
 }
 function external(e){if(e.key===KEY||e.key===null){if(writable)check();}}
 function close(){closed=true;writable=false;if(settleLoad)settleLoad();if(release){release();release=null;}}
 return {load,write,replace,external,close,get writable(){return writable&&!closed;},get original(){return raw;},get backup(){if(backup)return backup;try{return storage?.getItem(KEY+'.before-import')||null;}catch{return null;}}};
}
root.SakihanaSave={KEY,FORMAT,VERSION,fresh,validate,decode,encode,createStore};
})(typeof window==='object'?window:globalThis);
