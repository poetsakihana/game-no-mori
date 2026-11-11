// LCF save decoding. Fields follow EasyRPG/liblcf generated lsd/chunks.h.
export class Reader {
 constructor(b){this.b=b instanceof Uint8Array?b:new Uint8Array(b);this.p=0;}
 v(){let x=0;for(let n=0;n<5;n++){if(this.p>=this.b.length)throw Error('データが途中で切れています。');const c=this.b[this.p++];x=x*128+(c&127);if(c<128)return x;}throw Error('不正な数値です。');}
 bytes(n){if(n<0||this.p+n>this.b.length)throw Error('データの長さが不正です。');const b=this.b.slice(this.p,this.p+n);this.p+=n;return b;}
 fields(){const out=new Map;while(this.p<this.b.length){const k=this.v();if(k===0)break;if(out.has(k))throw Error('項目が重複しています。');out.set(k,this.bytes(this.v()));}return out;}
}
export const number=b=>b?.length?new Reader(b).v():0;
export const fields=b=>new Reader(b||new Uint8Array()).fields();
export function variable(n){let a=[n&127];while(n=Math.floor(n/128))a.unshift((n&127)|128);return Uint8Array.from(a);}
export function concat(parts){const out=new Uint8Array(parts.reduce((n,b)=>n+b.length,0));let p=0;for(const b of parts){out.set(b,p);p+=b.length;}return out;}
export function packFields(m){return concat([...m].flatMap(([k,b])=>[variable(k),variable(b.length),b]).concat([new Uint8Array([0])]));}
const text=b=>new TextDecoder('shift-jis').decode(b||new Uint8Array());
export function parseSave(bytes){
 const b=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);
 if(b.length<24||b.length>8*1024*1024)throw Error('セーブデータのサイズが不正です。');
 const r=new Reader(b);const header=r.bytes(r.v());
 if(new TextDecoder().decode(header)!=='LcfSaveData')throw Error('RPGツクールの .lsd セーブデータを選んでください。');
 const f=r.fields();if(!f.has(101)||!f.has(104))throw Error('必要なセーブ情報がありません。');
 const sys=fields(f.get(101)),loc=fields(f.get(104)),title=fields(f.get(100)),inv=fields(f.get(109));
 const switches=sys.get(32)||new Uint8Array();const map=number(loc.get(11));
 if(map<1||map>9999)throw Error('マップ情報が不正です。');
 const hero=text(title.get(11));const level=number(title.get(12))||1;
 return {bytes:b,fields:f,map,x:number(loc.get(12)),y:number(loc.get(13)),hero,level,gold:number(inv.get(21)),switches,hasSwitch:n=>switches[n-1]>0};
}
export function canTransfer(save,source){return source===1?save.map===2&&save.hasSwitch(343):source===2?save.map===67&&save.hasSwitch(405):false;}
export function isComplete(save){return save.map===358;}
export function migrateSave(bytes,source){
 const s=parseSave(bytes);if(!canTransfer(s,source))throw Error(`Disk ${source} の章末セーブが必要です。ゲーム内で「セーブしてください」の案内が出た場所で保存してください。`);
 // Carry every persistent value. Only discard the old foreground event's
 // continuation, so the next disk can run its own autorun event at this map.
 const f=new Map(s.fields);f.delete(113);
 return concat([variable(11),new TextEncoder().encode('LcfSaveData'),packFields(f)]);
}
export const toBase64=b=>{let s='';for(let i=0;i<b.length;i+=8192)s+=String.fromCharCode(...b.subarray(i,i+8192));return btoa(s);};
export const fromBase64=s=>{if(typeof s!=='string'||s.length>12000000)throw Error('バックアップが不正です。');return Uint8Array.from(atob(s),x=>x.charCodeAt(0));};
export function fingerprint(b){let x=2166136261;for(const n of b)x=Math.imul(x^n,16777619);return (x>>>0).toString(16);}
