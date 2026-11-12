'use strict';
// Synchronize only this game's public files. Does not touch catalog, roadmap, other games, or git index.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const src=path.resolve(__dirname,'../public/games/misuzu-komichi'),dst=path.resolve(__dirname,'../../zatuplay/games/misuzu-komichi');
function files(dir,prefix=''){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name),prefix+e.name+'/'):[prefix+e.name]).sort()}
const list=files(src).filter(f=>f!=='CHECKSUMS.sha256');fs.writeFileSync(path.join(src,'CHECKSUMS.sha256'),list.map(f=>crypto.createHash('sha256').update(fs.readFileSync(path.join(src,f))).digest('hex')+'  '+f).join('\n')+'\n');
fs.mkdirSync(dst,{recursive:true});for(const f of files(src)){fs.mkdirSync(path.dirname(path.join(dst,f)),{recursive:true});fs.copyFileSync(path.join(src,f),path.join(dst,f))}
for(const f of files(dst))if(!fs.existsSync(path.join(src,f)))throw Error('Unexpected mirror file: '+f);
console.log(`misuzu-komichi: ${files(src).length} files synchronized and checksummed.`);
