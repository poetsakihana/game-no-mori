'use strict';
// Refresh only this game's checksums and byte-for-byte publication mirror. Does not stage/commit/publish.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../public/games/kotonoha-fortune'),mirror=path.resolve(__dirname,'../../zatuplay/games/kotonoha-fortune');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const provenance=JSON.parse(fs.readFileSync(path.join(root,'provenance.json')));
if(sha(fs.readFileSync(path.join(root,'gallery.js')))!==provenance.originalFiles['gallery.js'].sha256)throw Error('Original gallery changed');
const names=fs.readdirSync(root).sort();
fs.writeFileSync(path.join(root,'CHECKSUMS.sha256'),names.filter(n=>n!=='CHECKSUMS.sha256').map(n=>`${sha(fs.readFileSync(path.join(root,n)))}  ${n}\n`).join(''));
fs.mkdirSync(mirror,{recursive:true});for(const n of names)fs.copyFileSync(path.join(root,n),path.join(mirror,n));
console.log(`Synced ${names.length} kotonoha-fortune files and refreshed checksums.`);
