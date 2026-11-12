// Only this key belongs to the browser port. Never read or migrate starbolt-v1.
export const STORAGE_KEY='zatuplay:starbolt:1';
export const LOCK_NAME='zatuplay:starbolt:1:write';
export const MAX_BYTES=4096;
const plain=o=>o!==null&&typeof o==='object'&&!Array.isArray(o);
function fields(o,keys) { if(!plain(o)||Object.keys(o).sort().join('|')!==[...keys].sort().join('|')) throw new Error('項目が一致しません'); }
export function validateData(value) {
  fields(value,['cleared','sound']);
  if(!Array.isArray(value.cleared)||value.cleared.length>8||value.cleared.some(v=>!Number.isInteger(v)||v<0||v>7)||new Set(value.cleared).size!==value.cleared.length||typeof value.sound!=='boolean') throw new Error('記録の値が不正です');
  return {cleared:[...value.cleared].sort((a,b)=>a-b),sound:value.sound};
}
// Bounded JSON parser rejects duplicate keys (JSON.parse alone silently accepts them).
export function strictJSON(text) {
  if(typeof text!=='string'||new TextEncoder().encode(text).length>MAX_BYTES) throw new Error('ファイルは4 KB以下にしてください');
  let pos=0;
  const space=()=>{while(/[ \t\r\n]/.test(text[pos]||'!')) pos++;};
  function string() {
    const match=text.slice(pos).match(/^"(?:[^"\\\u0000-\u001f]|\\(?:["\\/bfnrt]|u[0-9a-fA-F]{4}))*"/);
    if(!match) throw new Error('JSON文字列が不正です'); pos+=match[0].length; return JSON.parse(match[0]);
  }
  function value(depth=0) {
    if(depth>8) throw new Error('JSONが深すぎます'); space();
    if(text[pos]==='"') return string();
    if(text[pos]==='{') {
      pos++; space(); const result=Object.create(null),seen=new Set();
      if(text[pos]==='}') { pos++; return result; }
      while(true) {
        space(); const key=string(); if(seen.has(key)) throw new Error('重複した項目があります'); seen.add(key);
        space(); if(text[pos++]!==':') throw new Error('JSONが不正です'); result[key]=value(depth+1); space();
        const c=text[pos++]; if(c==='}') return result; if(c!==',') throw new Error('JSONが不正です');
      }
    }
    if(text[pos]==='[') {
      pos++; space(); const result=[]; if(text[pos]===']') { pos++; return result; }
      while(true) { result.push(value(depth+1)); space(); const c=text[pos++]; if(c===']') return result; if(c!==',') throw new Error('JSONが不正です'); }
    }
    const m=text.slice(pos).match(/^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/);
    if(!m) throw new Error('JSONが不正です'); pos+=m[0].length; return JSON.parse(m[0]);
  }
  const result=value(); space(); if(pos!==text.length) throw new Error('JSONの末尾が不正です'); return result;
}
export function exportBackup(data) { return JSON.stringify({format:'zatuplay-starbolt-backup',version:1,data:validateData(data)},null,2); }
export function importBackup(text) {
  const o=strictJSON(text); fields(o,['format','version','data']);
  if(o.format!=='zatuplay-starbolt-backup'||o.version!==1) throw new Error('スターボルトのバックアップではありません');
  return validateData(o.data);
}
function readRecord(raw) {
  const o=strictJSON(raw); fields(o,['format','version','revision','data']);
  if(o.format!=='zatuplay-starbolt-save'||o.version!==1||!Number.isSafeInteger(o.revision)||o.revision<1||o.revision>=Number.MAX_SAFE_INTEGER) throw new Error('保存形式が不正です');
  return {revision:o.revision,data:validateData(o.data)};
}
export class SaveStore {
  constructor({storage,locks,onStatus=()=>{}}={}) {
    this.storage=storage; this.locks=locks; this.onStatus=onStatus; this.data={cleared:[],sound:true};
    this.expected=null; this.revision=0; this.status='loading'; this.queue=Promise.resolve(); this.pending=0;
  }
  notify(status) { this.status=status; this.onStatus(status); }
  open() {
    try {
      this.expected=this.storage.getItem(STORAGE_KEY);
      if(this.expected!==null) { const record=readRecord(this.expected); this.data=record.data; this.revision=record.revision; }
    } catch(error) { this.notify(this.expected!==null?'memory-corrupt':'memory-denied'); return validateData(this.data); }
    this.notify(this.locks&&typeof this.locks.request==='function'?'ready':'memory-no-lock');
    return validateData(this.data);
  }
  checkExternal(key) {
    if(key!==STORAGE_KEY&&key!==null) return;
    if(this.status!=='ready'&&this.status!=='saving') return;
    try { if(this.storage.getItem(STORAGE_KEY)!==this.expected) this.notify('conflict'); }
    catch { this.notify('memory-denied'); }
  }
  setData(data) {
    this.data=validateData(data);
    if(this.status!=='ready'&&this.status!=='saving') return Promise.resolve(false);
    const snapshot=validateData(this.data); this.pending++; this.notify('saving');
    const work=async()=>{
      try {
        if(this.status!=='ready'&&this.status!=='saving') return false;
        let saved=false;
        await this.locks.request(LOCK_NAME,{mode:'exclusive'},async()=>{
          if(this.status!=='ready'&&this.status!=='saving') return;
          const raw=this.storage.getItem(STORAGE_KEY);
          if(raw!==this.expected) { this.notify('conflict'); return; }
          if(this.revision>=Number.MAX_SAFE_INTEGER-1) { this.notify('memory-full'); return; }
          const next=JSON.stringify({format:'zatuplay-starbolt-save',version:1,revision:this.revision+1,data:snapshot});
          this.storage.setItem(STORAGE_KEY,next);
          this.expected=next; this.revision++; saved=true;
        });
        return saved;
      } catch(error) { this.notify(error?.name==='QuotaExceededError'?'memory-full':'memory-denied'); return false; }
      finally { this.pending--; if(this.status==='saving'&&this.pending===0) this.notify('ready'); }
    };
    this.queue=this.queue.then(work,work); return this.queue;
  }
  idle() { return this.queue; }
}
