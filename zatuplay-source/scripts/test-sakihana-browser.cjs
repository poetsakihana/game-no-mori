'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../public/games/sakihana');
const source=fs.readFileSync(path.join(root,'browser-lifecycle.js'),'utf8');
let events={},winEvents={},paused=0,blurred=0;
let context={document:{hidden:false,addEventListener:(name,fn)=>events[name]=fn},window:{addEventListener:(name,fn)=>winEvents[name]=fn,dispatchEvent:e=>{if(e.type==='blur')blurred++}},Event:class{constructor(type){this.type=type}},game:{pause:()=>paused++}};
vm.runInNewContext(source,context);
events.visibilitychange();assert.equal(paused,0);
context.document.hidden=true;events.visibilitychange();assert.equal(paused,1);assert.equal(blurred,1);
context.document.hidden=false;events.visibilitychange();assert.equal(paused,1,'must not auto-resume an explicit pause');
winEvents.pagehide();assert.equal(paused,2);
context.game=null;events.visibilitychange();winEvents.pagehide();
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert(html.includes('../../browser/'));assert(!html.includes('android-lifecycle.js'));
for(const [,asset] of html.matchAll(/(?:src|href)="([^"#]+)"/g)){if(!asset.startsWith('../'))assert(fs.existsSync(path.join(root,asset)),asset);}
for(const [file,expected] of Object.entries(JSON.parse(fs.readFileSync(path.join(root,'SOURCE_ASSETS.json'),'utf8')).sha256)){
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex'),expected,file+' must match the APK');
}
console.log('PASS browser visibility/pagehide lifecycle, local entry assets, and 77 unchanged APK assets');
