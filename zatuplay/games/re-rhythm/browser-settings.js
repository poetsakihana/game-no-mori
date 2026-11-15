(function(){
'use strict';
const key='rhythm-browser-settings-v1', fields={volume:'number',voice:'boolean',guide:'boolean',offset:'number',bgmon:'boolean',bgmvolume:'number',sfxvolume:'number'};
let values=null;try{const saved=rhythmStorage.getItem(key);if(saved)values=JSON.parse(saved);}catch{}
for(const [id,type]of Object.entries(fields)){const el=document.getElementById(id);if(!el)continue;if(values){if(type==='boolean')el.checked=values[id];else el.value=String(values[id]);}const persist=()=>{const data={};for(const [name,kind]of Object.entries(fields)){const node=document.getElementById(name);data[name]=kind==='boolean'?node.checked:Number(node.value);}try{rhythmStorage.setItem(key,JSON.stringify(data));}catch{};if(id==='voice'&&!el.checked)window.speechSynthesis?.cancel();};el.addEventListener('input',persist);el.addEventListener('change',persist);}
const offset=document.getElementById('offsetval');if(offset)offset.textContent=document.getElementById('offset').value+' ms';
const back=document.getElementById('zatuplay-return');if(back)back.addEventListener('click',()=>{stop(true);sideStop();window.speechSynthesis?.cancel();});
})();
