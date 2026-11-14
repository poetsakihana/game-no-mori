const PREFIX='zatuplay-clay-museum-';
export function validIds(value){return Array.isArray(value)&&value.length<=64&&value.every(n=>Number.isInteger(n)&&n>=1&&n<=64);}
export function readIds(key){try{const raw=localStorage.getItem(PREFIX+key);if(raw===null)return [];const value=JSON.parse(raw);return validIds(value)?[...new Set(value)]:[];}catch{return [];}}
export function writeIds(key,value){try{const old=localStorage.getItem(PREFIX+key);if(old!==null&&!validIds(JSON.parse(old)))throw Error('Invalid saved data');if(!validIds(value))throw Error('Invalid IDs');localStorage.setItem(PREFIX+key,JSON.stringify([...new Set(value)]));return true;}catch{return false;}}
