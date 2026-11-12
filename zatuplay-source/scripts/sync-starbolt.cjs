const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const source=path.resolve(__dirname,'../public/games/starbolt'),mirror=path.resolve(__dirname,'../../zatuplay/games/starbolt');
const files=dir=>fs.readdirSync(dir,{recursive:true}).filter(p=>fs.statSync(path.join(dir,p)).isFile()).sort();
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const checksum=files(source).filter(p=>p!=='checksums.sha256').map(p=>sha(path.join(source,p))+'  '+p).join('\n')+'\n';
if(process.argv.includes('--check'))assert.equal(fs.readFileSync(path.join(source,'checksums.sha256'),'utf8'),checksum,'checksum mismatch');
else{fs.writeFileSync(path.join(source,'checksums.sha256'),checksum);fs.mkdirSync(mirror,{recursive:true});for(const file of files(source)){fs.mkdirSync(path.dirname(path.join(mirror,file)),{recursive:true});fs.copyFileSync(path.join(source,file),path.join(mirror,file));}}
assert.deepEqual(files(source),files(mirror));for(const file of files(source))assert.equal(sha(path.join(source,file)),sha(path.join(mirror,file)),file);console.log('StarBolt exact mirror and checksums verified: '+files(source).length+' files.');
