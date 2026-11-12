// SKHN browser adapter, 1.0-web.1. No networking or audio transformation.
export const LIMIT = Object.freeze({track:64*1024*1024,header:1048576,batch:128*1024*1024,library:256*1024*1024,entries:256,ratio:200});
const enc=new TextEncoder(), dec=new TextDecoder('utf-8',{fatal:true});
export const extension=n=>n.split('.').pop().toLowerCase();
export const supported=n=>/\.(skhn|mp3|wav|ogg|m4a|aac|flac|opus)$/i.test(n);
const check=(ok,msg)=>{if(!ok)throw Error(msg)};
export async function digest(bytes){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('')}
export function wrap(header,audio){const h=enc.encode(JSON.stringify(header));check(h.length>0&&h.length<=LIMIT.header,'ヘッダーが大きすぎます');const prefix=new Uint8Array(12);prefix.set(enc.encode('SKHN0001'));new DataView(prefix.buffer).setUint32(8,h.length,true);return new Blob([prefix,h,audio],{type:'application/octet-stream'})}
export async function parse(blob,name){check(supported(name),'未対応の拡張子');check(blob.size<=LIMIT.track+LIMIT.header+12,'ブラウザ版の上限は音源64 MiBです');let header,audio;
 if(extension(name)==='skhn'){const prefix=new Uint8Array(await blob.slice(0,12).arrayBuffer());check(prefix.length===12&&dec.decode(prefix.slice(0,8))==='SKHN0001','SKHN形式が不正です');const len=new DataView(prefix.buffer).getUint32(8,true);check(len>=1&&len<=LIMIT.header&&12+len<blob.size,'ヘッダーサイズが不正です');header=JSON.parse(dec.decode(await blob.slice(12,12+len).arrayBuffer()));check(header&&header.version===1&&typeof header.title==='string'&&typeof header.sha256==='string','SKHNヘッダーが不正です');audio=blob.slice(12+len);
 }else{const base=name.split(/[\\/]/).pop();header={version:1,title:base.slice(0,base.lastIndexOf('.')),artist:'咲華',original:base,mime:({mp3:'audio/mpeg',m4a:'audio/mp4',opus:'audio/ogg'})[extension(base)]||'audio/'+extension(base)};audio=blob;}
 check(audio.size>0&&audio.size<=LIMIT.track,'音源は1 byte〜64 MiBです');const id=await digest(await audio.arrayBuffer());check(!header.sha256||header.sha256===id,'音源のSHA-256が一致しません');if(extension(name)==='skhn')check(header.sha256===id,'音源のSHA-256が一致しません');header.sha256=id;
 const mime=typeof header.mime==='string'&&/^audio\/[a-z0-9.+-]+$/i.test(header.mime)?header.mime:'application/octet-stream';
 return {id,title:header.title,genre:'未分類',playlists:'',revision:1,header,audio:audio.slice(0,audio.size,mime),size:audio.size,container:extension(name)==='skhn'?blob:wrap(header,audio)};
}
export function crc32(bytes){let c=0xffffffff;for(const b of bytes){c^=b;for(let j=0;j<8;j++)c=(c>>>1)^((c&1)?0xedb88320:0)}return (c^0xffffffff)>>>0}
// Central directory first, bounded inflation, CRC validation. No paths are opened.
export async function unzip(blob,signal){check(blob.size<=LIMIT.track,'ZIPは64 MiB以下にしてください');const b=new Uint8Array(await blob.arrayBuffer()),v=new DataView(b.buffer);const u16=p=>v.getUint16(p,true),u32=p=>v.getUint32(p,true);let end=-1;
 for(let p=b.length-22;p>=Math.max(0,b.length-65557);p--)if(u32(p)===0x06054b50&&p+22+u16(p+20)===b.length){end=p;break}
 check(end>=0,'ZIP終端が不正です');check(u16(end+4)===0&&u16(end+6)===0&&u16(end+8)===u16(end+10),'分割ZIPは未対応です');const count=u16(end+10),start=u32(end+16),length=u32(end+12);check(count<=LIMIT.entries&&start+length===end,'ZIPエントリー上限または構造エラー');let p=start,total=0;const entries=[],ranges=[];
 for(let i=0;i<count;i++){signal?.throwIfAborted();check(p+46<=end&&u32(p)===0x02014b50,'ZIP中央ディレクトリが不正です');const flags=u16(p+8),method=u16(p+10),crc=u32(p+16),packed=u32(p+20),size=u32(p+24),nl=u16(p+28),xl=u16(p+30),cl=u16(p+32),off=u32(p+42);check(p+46+nl+xl+cl<=end&&u16(p+34)===0,'ZIPエントリーが不正です');const nameBytes=b.slice(p+46,p+46+nl);let name;try{name=dec.decode(nameBytes)}catch{name=String.fromCharCode(...nameBytes)}
 check(!(flags&1)&&(method===0||method===8),'暗号化・未対応圧縮ZIPです');check(size<=LIMIT.track+LIMIT.header+12&&size<=Math.max(1,packed)*LIMIT.ratio,'ZIP展開サイズまたは圧縮率の上限です');total+=size;check(total<=LIMIT.batch,'ZIP展開合計は128 MiB以下です');check(off+30<=start&&u32(off)===0x04034b50,'ZIPローカルヘッダーが不正です');const ln=u16(off+26),lx=u16(off+28),data=off+30+ln+lx;check(u16(off+6)===flags&&u16(off+8)===method&&data+packed<=start&&ln===nl&&nameBytes.every((x,j)=>x===b[off+30+j]),'ZIPヘッダーが一致しません');if(!(flags&8))check(u32(off+14)===crc&&u32(off+18)===packed&&u32(off+22)===size,'ZIPサイズが一致しません');check(!ranges.some(([s,e])=>off<e&&data+packed>s),'ZIPデータが重複しています');ranges.push([off,data+packed]);entries.push({name,data,packed,size,crc,method});p+=46+nl+xl+cl;}
 check(p===end,'ZIPディレクトリ長が不正です');const result=[];
 for(const e of entries){signal?.throwIfAborted();if(e.name.endsWith('/')||!supported(e.name)){result.push({name:e.name,skipped:true});continue}let out;
 if(e.method===0)out=b.slice(e.data,e.data+e.packed);else{let stream;try{stream=new Blob([b.slice(e.data,e.data+e.packed)]).stream().pipeThrough(new DecompressionStream('deflate-raw'))}catch{throw Error('このブラウザはZIPのDeflate展開に未対応です。先に端末で展開してください。')}const reader=stream.getReader(),chunks=[];let n=0;try{while(true){signal?.throwIfAborted();const {done,value}=await reader.read();if(done)break;n+=value.length;check(n<=e.size&&n<=LIMIT.track+LIMIT.header+12,'ZIP展開上限を超えました');chunks.push(value)}}finally{await reader.cancel().catch(()=>{})}out=new Uint8Array(n);let at=0;for(const c of chunks){out.set(c,at);at+=c.length}}
 check(out.length===e.size&&crc32(out)===e.crc,'ZIPのCRCまたはサイズが不正です');result.push({name:e.name,blob:new Blob([out])});}
 return result;
}
export function nextId(tracks,id,d,shuffle,random=Math.random){if(!tracks.length)return null;let i=tracks.findIndex(t=>t.id===id);if(shuffle&&tracks.length>1)i=(Math.max(i,0)+1+Math.floor(random()*(tracks.length-1)))%tracks.length;else i=(i+d+tracks.length)%tracks.length;return tracks[i].id}
