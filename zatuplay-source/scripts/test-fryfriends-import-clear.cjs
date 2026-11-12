'use strict';
const assert=require('node:assert/strict');
const {createHarness}=require('./fryfriends-harness.cjs');
(async()=>{
 const h=createHarness();await h.settle();h.click('records');
 const raw=h.run('FryStore.encode(FryStore.blank())');const input=h.get('importFile');
 let files=[{size:Buffer.byteLength(raw),text:async()=>raw}];
 Object.defineProperty(input,'files',{configurable:true,get:()=>files});
 Object.defineProperty(input,'value',{configurable:true,get:()=>'',set:()=>{files=[]}});
 await input.onchange({target:input});await h.settle();
 assert.equal(h.confirmations.length,1,'File must be captured before clearing native file input');
 console.log('PASS native file-input clearing import regression');
})().catch(e=>{console.error(e);process.exitCode=1});
