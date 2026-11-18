const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.join(__dirname,'../public/games/puchitto-break-150');
function env(supported=true){
 const spoken=[],events={},ctx={console,addEventListener:(k,f)=>events[k]=f};
 if(supported){ctx.SpeechSynthesisUtterance=class{constructor(text){this.text=text}};ctx.speechSynthesis={cancel(){ctx.cancelled=(ctx.cancelled||0)+1},getVoices:()=>[{lang:'ja-JP'}],speak:u=>spoken.push(u)}}
 vm.createContext(ctx);vm.runInContext(fs.readFileSync(root+'/assets/catalog.js','utf8')+'\n'+fs.readFileSync(root+'/assets/play.js','utf8')+'\nthis.api={scenes,effects,narration,catalog};',ctx);
 return {ctx,spoken,events,...ctx.api};
}
function game(e,id){const buttons=[],g={finished:false,button(label,action){const b={label,action,disabled:false};buttons.push(b);return b},say(t){this.text=t},clear(t){this.finished=true;this.text=t},sparkle(){}}; const item=e.catalog[id-1]; const scene=e.scenes[item.kind](g,item.config);return {g,scene,press(label){const b=buttons.find(b=>b.label===label);assert.ok(b,label);if(!b.disabled&&!g.finished)b.action()},buttons}}
const e=env();assert.equal(e.catalog.length,150);assert.equal(e.catalog[128].id,129);assert.equal(e.catalog[135].id,136);
let t=game(e,129);t.press('たからもの');assert.equal(t.g.finished,false);t.press('糸を張る');assert.equal(e.spoken.at(-1).text,'たからもの');assert.equal(e.spoken.at(-1).lang,'ja-JP');t.press('ひまわり');assert.equal(t.g.finished,false);t.press('たからもの');assert.equal(t.g.finished,true);
t=game(e,129);t.press('糸を張る');const stale=e.spoken.at(-1);t.press('糸を張る');const text=t.g.text;stale.onerror();assert.equal(t.g.text,text);e.spoken.at(-1).onerror();assert.match(t.g.text,/読み上げできません.*たからもの/);
e.effects.set(false);t=game(e,129);let n=e.spoken.length;t.press('糸を張る');assert.equal(e.spoken.length,n);assert.match(t.g.text,/音OFF.*たからもの/);t.press('たからもの');assert.equal(t.g.finished,true);
const no=env(false);t=game(no,129);t.press('糸を張る');assert.match(t.g.text,/非対応.*たからもの/);t.press('たからもの');assert.ok(t.g.finished);
e.effects.enabled=true;t=game(e,129);t.press('字幕を見る');assert.match(t.g.text,/字幕.*たからもの/);t.press('たからもの');assert.ok(t.g.finished);
t=game(e,136);n=e.spoken.length;assert.equal(e.spoken.length,n);t.press('車内放送を聞く・もう一度');assert.equal(e.spoken.at(-1).text,'次は、中央通りです。');t.press('降車ボタン');assert.equal(t.g.finished,false);t.press('次へ →');assert.equal(e.spoken.at(-1).text,'次は、図書館前です。');t.press('次へ →');assert.equal(e.spoken.at(-1).text,'次は、花の公園です。');t.press('降車ボタン');assert.ok(t.g.finished);
const before=e.ctx.cancelled;e.events.pagehide();assert.ok(e.ctx.cancelled>before);
const source=fs.readFileSync(root+'/assets/play.js','utf8');assert.match(source,/if \(document.hidden\) \{\s*narration.stop\(\)/);assert.match(source,/dispose\(\) \{\s*narration.stop\(\)/);
console.log('PASS speech: correct Japanese phrase/stops, incorrect/correct answers, mute, unsupported API, subtitle completion, stale error suppression, lifecycle cancellation, unchanged 150 IDs. Model test only; no actual audio heard.');
