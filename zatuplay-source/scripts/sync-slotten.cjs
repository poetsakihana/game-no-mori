'use strict';
// This script only touches SlotTen's two game directories. No build/catalog/ref operations.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const repo=path.resolve(__dirname,'../..'),source=path.join(repo,'zatuplay-source/public/games/slotten'),mirror=path.join(repo,'zatuplay/games/slotten');
const write=process.argv.includes('--write'),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
function files(root,prefix=''){return fs.readdirSync(path.join(root,prefix),{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name,'en')).flatMap(e=>{if(e.isSymbolicLink())throw Error('symlink not allowed');const rel=path.posix.join(prefix,e.name);return e.isDirectory()?files(root,rel):[rel]})}
const names=files(source).filter(n=>n!=='CHECKSUMS.sha256');
const checksums=names.map(n=>hash(fs.readFileSync(path.join(source,n)))+'  '+n+'\n').join('');
if(write){
 fs.writeFileSync(path.join(source,'CHECKSUMS.sha256'),checksums);fs.mkdirSync(mirror,{recursive:true});
 const all=[...names,'CHECKSUMS.sha256'];
 for(const n of all){const target=path.join(mirror,n);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(source,n),target)}
 for(const n of files(mirror))if(!all.includes(n))fs.unlinkSync(path.join(mirror,n));
}
assert.equal(fs.readFileSync(path.join(source,'CHECKSUMS.sha256'),'utf8'),checksums,'stale source checksum inventory');
assert.deepEqual(files(source),files(mirror),'mirror inventory');for(const n of files(source))assert.deepEqual(fs.readFileSync(path.join(source,n)),fs.readFileSync(path.join(mirror,n)),n);
console.log(`SlotTen ${files(source).length} files: checksums and source/mirror byte equality verified.`);
console.log(`CHECKSUMS.sha256 SHA-256: ${hash(fs.readFileSync(path.join(source,'CHECKSUMS.sha256')))}`);
