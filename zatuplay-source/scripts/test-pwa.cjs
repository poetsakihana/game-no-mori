const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const base=new URL('https://poetsakihana.github.io/game-no-mori/zatuplay/');
const manifest=JSON.parse(read('public/manifest.webmanifest'));
assert.equal(manifest.id,'./','Keep the existing installed app identity');
assert.equal(manifest.scope,'./');
assert.equal(manifest.display,'standalone');
assert.equal(new URL(manifest.start_url,base).pathname,base.pathname+'browser/');
assert.ok(manifest.icons.some(i=>i.sizes==='192x192'));
assert.ok(manifest.icons.some(i=>i.sizes==='512x512'));
const releases=JSON.parse(read('public/data/browser-catalog.json')).apps;
for(const app of releases){
 const url=new URL(app.url);assert.equal(url.origin,base.origin,app.id);assert.ok(url.pathname.startsWith(base.pathname),app.id);
 const local=path.join(root,'public',url.pathname.slice(base.pathname.length),'index.html');
 assert.ok(fs.existsSync(local),app.id+' source is present');
 const html=fs.readFileSync(local,'utf8')+(app.id==='song-chronicle'?fs.readFileSync(path.join(path.dirname(local),'app.js'),'utf8'):'');
 assert.match(html,/\.\.\/\.\.\/browser\//,app.id+' has a return link to the collection');
}
const collection=read('src/BrowserCollection.tsx');
assert.match(collection,/href=\{release\.url\} target="_self"/,'Game launch stays in the same browsing context');
assert.ok(!collection.includes('target="_blank"'));
assert.ok(collection.indexOf('className="edition-option browser-option"')<collection.indexOf('className="edition-option apk-option"'),'Visual and keyboard order agree');
for(const html of ['index.html','browser/index.html','apk/index.html']){
 const text=read(html);assert.match(text,/rel="manifest"/);assert.match(text,/apple-mobile-web-app-capable/);assert.match(text,/apple-touch-icon/);
}
const pwa=read('src/PwaInstall.tsx');
for(const phrase of ['Android（Chrome）','iPhone・iPad（Safari）','beforeinstallprompt','appinstalled','dismissed','オフラインプレイにはまだ対応していません'])assert.ok(pwa.includes(phrase),phrase);
console.log(`PASS: PWA identity, start URL, icon declarations, all ${releases.length} in-scope game links and return links, same-context navigation, install guidance, and HTML metadata.`);
