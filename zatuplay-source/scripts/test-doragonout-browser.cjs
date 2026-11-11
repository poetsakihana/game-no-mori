const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'../public/games/doragonout');
const deployed=path.resolve(__dirname,'../../zatuplay/games/doragonout');
const walk=p=>fs.readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(p,e.name)):[path.join(p,e.name)]);
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const report=JSON.parse(fs.readFileSync(path.join(root,'browser-port-report.json'),'utf8'));
assert.equal(report.coreFiles.length,747);
for(const {path:p,sha256} of report.coreFiles)assert.equal(sha(path.join(root,p)),sha256,p);
console.log('PASS original 741 maps plus six database/map-tree files match source APK hashes');
for(const disk of ['disk1','disk2','disk3']){
 const base=path.join(root,'games',disk),index=JSON.parse(fs.readFileSync(path.join(base,'index.json'),'utf8'));
 const check=(obj,dir)=>{for(const [key,value] of Object.entries(obj)){
  if(key==='_dirname')continue;
  if(typeof value==='object')check(value,path.join(dir,value._dirname||key));
  else assert.ok(fs.statSync(path.join(dir,value)).isFile(),`${disk}/${value}`);
 }};
 check(index.cache,base);
 assert.ok(Object.values(index.cache.music).includes('WebMuted.ogg'));
}
console.log('PASS all three disk cache manifests resolve to present files, including omitted-music aliases');
const files=walk(root);
assert.equal(files.filter(p=>/\.mp3$/i.test(p)).length,0);
assert.equal(files.filter(p=>/\.webmanifest$/i.test(p)).length,0);
for(const p of files){const relative=path.relative(root,p);assert.equal(sha(p),sha(path.join(deployed,relative)),relative);}
console.log('PASS source and deployed game mirrors match; no original MP3 or separate PWA manifests');
const engine=fs.readFileSync(path.join(root,'engine/index.js'),'utf8');
assert.ok(engine.includes('IDBFS.getDB("ZatuPlay.DoragonOut:"+mount.mountpoint'));
assert.ok(fs.readFileSync(path.join(root,'vault.js'),'utf8').includes('ZatuPlay.DoragonOut.Original'));
assert.ok(fs.readFileSync(path.join(root,'native/storage.js'),'utf8').includes('ZatuPlay.DoragonOut.Rechronicle'));
console.log('PASS dedicated storage namespaces for original game, remake, and engine saves');
for(const name of ['index.html','classic.html','rechronicle.html']){
 const html=fs.readFileSync(path.join(root,name),'utf8');
 assert.ok(html.includes('../../browser/'));
 assert.ok(!/rel="manifest"/.test(html));
 assert.ok(!/android-runtime/.test(html));
}
console.log('PASS same-app return links and browser lifecycle scripts without Android-only bridge');

const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
assert.ok(app.includes("value==='remake'?'&patch-easyrpg':''"));
for(const name of ['index.html','classic.html'])assert.ok(fs.readFileSync(path.join(root,name),'utf8').includes('app.js?v=2.5.2-web.1'));
console.log('PASS remake artwork opts into supported 32-bit EasyRPG images while original mode is unchanged');
