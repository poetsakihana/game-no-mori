// Every selection owns a distinct media element and URL. Old callbacks cannot advance a new selection.
export class Player{
 constructor({load,ended,error,makeAudio=()=>new Audio(),urls=URL}){Object.assign(this,{load,ended,error,makeAudio,urls});this.generation=0;this.id='';this.audio=null;this.url=null}
 release(){if(this.audio){this.audio.onended=this.audio.onerror=null;this.audio.pause();this.audio.removeAttribute('src');this.audio.load();this.audio=null}if(this.url){this.urls.revokeObjectURL(this.url);this.url=null}}
 stop(){this.generation++;this.release();this.id=''}
 async play(id){const g=++this.generation;this.release();this.id=id;try{const record=await this.load(id);if(g!==this.generation)return;if(!(record?.audio instanceof Blob))throw Error('保存された音源が見つかりません');const a=this.makeAudio();this.audio=a;this.url=this.urls.createObjectURL(record.audio);a.src=this.url;a.preload='auto';a.onended=()=>{if(g===this.generation)this.ended()};a.onerror=()=>{if(g===this.generation)this.error('この音源をブラウザで復号できません（形式・破損・コーデックを確認）。元の音源は保存されています。')};await a.play();}catch(e){if(g===this.generation)this.error(e.name==='NotAllowedError'?'再生ボタンを押して音声再生を許可してください。':e.message)}}
 async toggle(){const a=this.audio,g=this.generation;if(!a)return this.id?this.play(this.id):undefined;if(a.paused){try{await a.play()}catch(e){if(g===this.generation)this.error(e.message)}}else a.pause()}
 seek(ms){const a=this.audio;if(a&&Number.isFinite(a.duration))a.currentTime=Math.max(0,Math.min(a.duration,ms/1000))}
 state(){const a=this.audio;return {id:this.id,playing:!!a&&!a.paused&&!a.ended,position:a&&Number.isFinite(a.currentTime)?a.currentTime*1000:0,duration:a&&Number.isFinite(a.duration)?a.duration*1000:0}}
}
