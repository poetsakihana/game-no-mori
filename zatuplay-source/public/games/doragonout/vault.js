import {parseSave,fingerprint} from './save-codec.js';
let conn;
export function db(){if(conn)return conn;const opening=new Promise((resolve,reject)=>{const r=indexedDB.open('ZatuPlay.DoragonOut.Original',1);r.onupgradeneeded=()=>{r.result.createObjectStore('saves',{keyPath:'id'});r.result.createObjectStore('state');};r.onsuccess=()=>{const d=r.result;const clear=()=>{if(conn===opening)conn=null;};d.onclose=clear;d.onversionchange=()=>{clear();d.close();};resolve(d);};r.onerror=()=>reject(r.error);});conn=opening;opening.catch(()=>{if(conn===opening)conn=null;});return opening;}
export async function transact(store,mode,fn){const d=await db();return new Promise((resolve,reject)=>{const t=d.transaction(store,mode),r=fn(t.objectStore(store));let result;r.onsuccess=()=>result=r.result;t.oncomplete=()=>resolve(result);t.onerror=()=>reject(t.error||r.error||Error('保存処理に失敗しました。'));t.onabort=()=>reject(t.error||r.error||Error('保存処理が中断されました。'));});}
export const allSaves=()=>transact('saves','readonly',s=>s.getAll());
export async function putSave(disk,slot,bytes,extra={}){if(![1,2,3].includes(disk)||!Number.isInteger(slot)||slot<1||slot>15)throw Error('保存先のDiskまたは枠が不正です。');const s=parseSave(new Uint8Array(bytes).slice());const item={...extra,id:`${disk}:${slot}`,disk,slot,bytes:s.bytes,hero:s.hero,level:s.level,map:s.map,gold:s.gold,hash:fingerprint(s.bytes),updated:Date.now()};await transact('saves','readwrite',o=>o.put(item));return item;}
export const getSave=id=>transact('saves','readonly',s=>s.get(id));
export const getState=k=>transact('state','readonly',s=>s.get(k));
export const setState=(k,v)=>transact('state','readwrite',s=>s.put(v,k));
export async function freeSlot(disk){const used=new Set((await allSaves()).filter(x=>x.disk===disk).map(x=>x.slot));for(let i=1;i<=15;i++)if(!used.has(i))return i;throw Error('このDiskの15個の保存枠がいっぱいです。ゲーム内で不要な枠を整理してから読み込んでください。');}
