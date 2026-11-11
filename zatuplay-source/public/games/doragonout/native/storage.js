import {clone} from './core.js';
let connection;
export function db(){if(connection)return connection;const opening=new Promise((res,rej)=>{const q=indexedDB.open('ZatuPlay.DoragonOut.Rechronicle',1);q.onupgradeneeded=()=>{q.result.createObjectStore('slots',{keyPath:'id'});q.result.createObjectStore('meta');};q.onsuccess=()=>{const d=q.result;const clear=()=>{if(connection===opening)connection=null;};d.onclose=clear;d.onversionchange=()=>{clear();d.close();};res(d);};q.onerror=()=>rej(q.error);});connection=opening;opening.catch(()=>{if(connection===opening)connection=null;});return opening;}
async function transaction(store,mode,action){const d=await db();return new Promise((res,rej)=>{const t=d.transaction(store,mode),q=action(t.objectStore(store));let value;q.onsuccess=()=>value=q.result;t.oncomplete=()=>res(value);t.onerror=()=>rej(t.error);t.onabort=()=>rej(t.error);});}
export const getMeta=k=>transaction('meta','readonly',s=>s.get(k));
export const setMeta=(k,v)=>transaction('meta','readwrite',s=>s.put(clone(v),k));
export const slots=()=>transaction('slots','readonly',s=>s.getAll());
export const getSlot=id=>transaction('slots','readonly',s=>s.get(id));
export const saveSlot=async(id,run,label='冒険の記録')=>transaction('slots','readwrite',s=>s.put({id,label,updated:Date.now(),run:clone(run)}));
export const autosave=run=>setMeta('autosave',{updated:Date.now(),run:clone(run)});
