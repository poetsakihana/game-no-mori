'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const source=path.resolve(__dirname,'../public/games/sakihana-shikai'),target=path.resolve(__dirname,'../../zatuplay/games/sakihana-shikai');
function files(dir,base=''){return fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name)).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name),base+e.name+'/'):[base+e.name]);}
const list=files(source).filter(p=>p!=='checksums.sha256'),sum=list.map(p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(source,p))).digest('hex')+'  '+p).join('\n')+'\n';fs.writeFileSync(path.join(source,'checksums.sha256'),sum);fs.mkdirSync(target,{recursive:true});fs.cpSync(source,target,{recursive:true});
const sourceFiles=files(source),targetFiles=files(target);if(JSON.stringify(sourceFiles)!==JSON.stringify(targetFiles))throw Error('Mirror contains stale files');for(const f of sourceFiles)if(!fs.readFileSync(path.join(source,f)).equals(fs.readFileSync(path.join(target,f))))throw Error('Mirror mismatch: '+f);console.log(`sakihana-shikai: ${sourceFiles.length} files mirrored and verified.`);
