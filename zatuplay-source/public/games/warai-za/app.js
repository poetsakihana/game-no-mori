
const $=s=>document.querySelector(s), esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const artists=window.WARAI_REAL_ROSTER.map(r=>({id:r.id,name:r.name,group:r.group,source:r.source,realName:true,talent:r.tone.label,rarity:r.id===0?'N':r.id%25===0?'SSR':r.id%10===0?'SR':r.id%3===0?'R':'N',skill:55+(r.id*17%31),theme:r.id%10,color:r.look.color}));
let state;try{state=JSON.parse(localStorage.getItem('warai150-v1'))}catch{}if(!state||!state.owned||!Number.isFinite(state.points))state={points:0,owned:{0:1},watched:0,trophies:{},draws:0,sound:true};
const ids=()=>Object.keys(state.owned).map(Number).filter(i=>artists[i]);function save(){try{localStorage.setItem('warai150-v1',JSON.stringify(state))}catch{toast('保存できませんでした。設定からセーブを書き出してください。')}}
const characterSystem=window.WARAI_CHARACTERS;
const portrait=a=>characterSystem.portrait(a);
const stageActor=(a,index=null)=>characterSystem.stageActor(a,index);
artists.forEach(a=>{a.character=characterSystem.designs[a.id];});
const repertoire=window.WARAI_REPERTOIRE;
const storyIds=new Set(repertoire.map(s=>s.id));
const storiesByArtist=artists.map(a=>repertoire.filter(s=>s.artistId===a.id));
const storyAt=(id,slot)=>storiesByArtist[id][slot];
state.authoredSeen=Array.isArray(state.authoredSeen)?state.authoredSeen.filter(id=>(window.WARAI_AUTHORED||[]).some(s=>s.id===id)):[];
state.cpuSeen=Array.isArray(state.cpuSeen)?[...new Set(state.cpuSeen.filter(validCpuKey))]:[];
state.unitSeen=Array.isArray(state.unitSeen)?[...new Set(state.unitSeen.filter(k=>typeof k==='string'&&/^(solo|duo|trio|skit|trioskit):[0-9,-]+:[0-9]$/.test(k)))]:[];
state.seen=Array.isArray(state.seen)?[...new Set(state.seen.filter(id=>storyIds.has(id)))]:[];
function selectedCast(){return canonicalCast(Array.from({length:needed()},(_,j)=>Number($('#cast'+j)?.value)||0));}
function unitKey(mode,cast,slot,style=currentStyle()){return 'cpu:'+cast.length+':'+canonicalCast(cast).join(',')+':'+style+':'+slot;}
function programTitle(mode,cast,slot,style=currentStyle()){cast=canonicalCast(cast);const written=authoredFor(cast,slot,style);if(written)return '書き下ろし · '+written.title;const labels=['初日の大研究','採用面接','相談窓口','広告大作戦','点検騒動','工夫コンテスト','未来への予約','一年の思い出','一日店長','忘れ物放送'];if(cast.length===1)return styleNames()[style]+' · '+storyAt(cast[0],slot).title;const props=cast.map(id=>storyAt(id,slot).subject).join('と');return styleNames()[style]+' · '+props+'の'+labels[slot];}
function updateRepertoire(){
 const cast=selectedCast(),mode=$('#mode').value,previous=Number($('#theme').value)||0;
 $('#theme').innerHTML=storiesByArtist[cast[0]].map(n=>`<option value="${n.slot}">${state.cpuSeen.includes(unitKey(mode,cast,n.slot))?'✓ ':''}${n.slot+1}. ${esc(programTitle(mode,cast,n.slot))}</option>`).join('');
 $('#theme').value=String(Math.min(9,previous));
 const seen=Array.from({length:10},(_,slot)=>unitKey(mode,cast,slot)).filter(k=>state.cpuSeen.includes(k)).length;
 $('#repertoireInfo').textContent=cast.map((_,j)=>actorName(cast,j)).join(' × ')+' · '+styleNames()[currentStyle()]+'の10話 · 観覧済み '+seen+' / 10話（全5展開・50ネタ）';previewCast();
}
let run=null, sequence=0, timer=null, voices=[];
const speech = typeof window.SpeechSynthesisUtterance === 'function' ? window.speechSynthesis : null;
function loadVoices() {
  voices = (speech?.getVoices() ?? []).filter(voice => /^ja(?:[-_]|$)/i.test(voice.lang));
  $('#voiceStatus').textContent = voices.length
    ? '日本語音声を利用できます。'
    : '日本語音声を利用できない場合は字幕で進行します。';
}
speech?.addEventListener('voiceschanged', loadVoices);
function toast(s){$('#toast').textContent=s;$('#toast').classList.remove('hide');clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>$('#toast').classList.add('hide'),4000)}
function header(){ $('#points').textContent=state.points.toLocaleString();$('#count').textContent=ids().length;$('#collection').textContent=ids().length+' / 150 人';$('#watched').textContent=state.watched+' 公演';$('#trophies').textContent=Object.values(state.trophies).reduce((a,b)=>a+b,0)+' 冠';$('#seenTotal').textContent=state.cpuSeen.length.toLocaleString()+' / 29,263,750 ネタ';$('#availableStories').textContent='入手済みで生成できるネタ '+cpuCounts(ids().length).total.toLocaleString()+' ／ 基礎台本の観覧 '+state.seen.length+' / 1,500本';$('#unlock').textContent='入手済み芸人で全組み合わせ対応。同じ芸人を選ぶと分身公演！';}
const needed=()=>({solo:1,duo:2,skit:2,trio:3,trioskit:3}[$('#mode').value]);function updateCast(){
 const n=needed(), owned=ids(), old=Number($('#cast0')?.value), first=owned.includes(old)?old:owned[0];
 const defaults=[first,...owned.filter(i=>i!==first)];while(defaults.length<n)defaults.push(first);for(let j=1;j<n;j++){const node=$('#cast'+j);if(node&&owned.includes(Number(node.value)))defaults[j]=Number(node.value);}
 $('#castFields').innerHTML=Array.from({length:n},(_,j)=>`<div class="field"><label for="cast${j}">${n===1?'出演芸人':j===0?'ネタの持ち主 / ボケ':j===1?'ツッコミ / 相手役':'第三の芸人'}</label><select id="cast${j}" onchange="updateRepertoire()">${owned.map(i=>`<option value="${i}" ${i===defaults[j]?'selected':''}>${esc(artists[i].name)}${artists[i].group==='ピン'?'':'（'+esc(artists[i].group)+'）'}</option>`).join('')}</select></div>`).join('');
 $('#start').disabled=!!run;
 if(!run)$('#actors').innerHTML=defaults.slice(0,n).map(i=>stageActor(artists[i])).join('');
 updateRepertoire();
}
function previewCast(){if(run)return;const cast=Array.from({length:needed()},(_,j)=>Number($('#cast'+j)?.value)).filter(i=>artists[i]&&state.owned[i]);$('#actors').innerHTML=cast.map(i=>stageActor(artists[i])).join('');if(cast.length)$('#programInfo').textContent=cast.map(i=>artists[i].name+' · '+artists[i].character.tag).join(' ／ ');}
function showPage(p){document.querySelectorAll('main>section').forEach(e=>e.classList.toggle('hide',e.id!==p));document.querySelectorAll('nav button').forEach(e=>e.classList.toggle('active',e.dataset.page===p));if(p==='written')renderWritten();if(p==='book')renderBook();if(p==='tournament')renderTournament()}
$('#nav').onclick=e=>{if(e.target.dataset.page)showPage(e.target.dataset.page)};
function baseScript(mode,slot,cast){
 if(mode!=='solo')return combinationScript(mode,slot,cast);
 const story=storyAt(cast[0],slot),main=artists[cast[0]].character,lines=[];
 let signatureAdded=false;
 story.beats.forEach(([role,text],i)=>{
  lines.push({who:mode==='solo'?0:role,text,part:mode==='solo'?(role===0?1:0):undefined,beatIndex:i,laugh:story.laughBeats.includes(i)});
  if(role===0&&!signatureAdded){lines.push({who:0,text:main.catchphrase,part:1,signature:true});signatureAdded=true;}
  if(cast.length===3&&[2,5,8,11].includes(i)){
   const first=i===2;
   lines.push({who:2,text:first?artists[cast[2]].character.catchphrase:story.third[[2,5,8,11].indexOf(i)],signature:first});
  }
 });
 lines.push({who:0,text:main.exitLine,part:1,signature:true},{who:0,text:'どうも、ありがとうございました！'});
 return addChaosScenes(lines,mode,slot,cast);
}
function startShow(custom){unlockLaughter();if(!listenStarting&&playlist)stopListening();unlockApplause();if(run)return toast('現在の公演が終わるまでお待ちください。');const mode=custom?.mode||$('#mode').value,theme=custom?.theme??Number($('#theme').value),cast=canonicalCast(custom?.cast||Array.from({length:needed()},(_,j)=>Number($('#cast'+j).value)));const style=currentStyle();if(cast.some(id=>!artists[id]||!state.owned[id]))return toast('入手済みの芸人を選んでください。');const lines=custom?cast.flatMap((id,j)=>performanceScript('solo',theme,[id],0).map(l=>({...l,who:j}))):performanceScript(mode,theme,cast,style);run={mode,theme,cast,style,lines,written:custom?null:authoredFor(cast,theme,style),unit:custom?null:unitKey(mode,cast,theme,style),index:0,paused:false,custom,spoken:false,storyIds:custom?cast.filter(id=>!authoredFor([id],theme,0)).map(id=>storyAt(id,theme).id):authoredFor(cast,theme,style)?[]:[storyAt(cast[0],theme).id]};$('#actors').innerHTML=cast.map((i,j)=>stageActor(artists[i],j).replace('<b>'+esc(artists[i].name)+'</b>','<b>'+esc(actorName(cast,j))+'</b>')).join('');$('#scriptLog').innerHTML=lines.map(l=>`<p><b>${esc(actorName(cast,l.who))}</b>：${esc(l.text)}</p>`).join('');$('#start').disabled=true;$('#pause').disabled=false;$('#stop').disabled=false;$('#pause').textContent='一時停止';$('#live').textContent=custom?'GRAND PRIX':'LIVE ON STAGE';$('#programInfo').textContent=(custom?'大会での上演：':'上演中：')+cast.map((id,j)=>actorName(cast,j)).join(' × ')+' ／ '+(new Set(cast).size<cast.length?'分身公演 · ':'')+programTitle(mode,cast,theme);showPage('theater');playLine();}
function cancelSpeech(){stopLaughter();sequence++;clearTimeout(timer);speech?.cancel()}
function playLine(){cancelSpeech();if(!run||run.paused)return;const token=sequence;if(run.index>=run.lines.length){finishShow();return}const l=run.lines[run.index],a=artists[run.cast[l.who]];$('#speaker').textContent=actorName(run.cast,l.who)+' · '+a.character.tag+' · '+(run.index+1)+' / '+run.lines.length;$('#line').textContent=l.text;$('#progress').style.width=100*run.index/run.lines.length+'%';document.querySelectorAll('.actor').forEach((e,j)=>{e.classList.toggle('talking',j===l.who);e.classList.toggle('signature',j===l.who&&!!l.signature);e.classList.toggle('reacting',run.cast.length>1&&j!==l.who);e.classList.toggle('react-boke',run.cast.length>1&&j!==l.who&&l.who===0)});$('#speaker').classList.toggle('signature-text',!!l.signature);$('#cpuStatus').textContent=l.cpu?actorName(run.cast,l.who)+'：'+l.cpu.reason+' · '+cpuProfile(a.id).personality+' · 発言 '+l.cpu.turn+'回'+(l.cpu.pressure!==undefined?' · 混乱 '+l.cpu.pressure:''):'台本を上演中です。';$('#live').textContent=l.chaos?'CHAOS · '+l.chaos:(run.custom?'GRAND PRIX':'LIVE ON STAGE');let done=false;function next(){if(done||token!==sequence||!run||run.paused)return;done=true;clearTimeout(timer);const laugh=l.laugh&&state.sound&&state.audience!==false;if(laugh)playLaughter();run.index++;timer=setTimeout(playLine,laugh?1900:(a.character.gap||450))}
  const speed = Number($('#speed').value);
  const captionTime = Math.max(1600, l.text.length * 115 / speed);
  if (!state.sound || !voices.length) {
    timer = setTimeout(next, captionTime);
    return;
  }
  const utterance = new SpeechSynthesisUtterance(l.text);
  utterance.lang = 'ja-JP';
  utterance.rate = speed * a.character.rate;
  utterance.pitch = Math.max(.5, Math.min(1.8, a.character.pitch + (l.part === 1 ? .18 : 0)));
  utterance.voice = voices[(a.id + (l.part || 0)) % voices.length];
  utterance.onend = next;
  utterance.onerror = () => {
    if (done || token !== sequence || !run || run.paused) return;
    $('#voiceStatus').textContent = '音声を再生できませんでした。字幕で進行中です。';
    clearTimeout(timer);
    timer = setTimeout(next, captionTime);
  };
  timer = setTimeout(next, Math.max(10000, l.text.length * 450 / speed));
  try {
    speech.speak(utterance);
  } catch {
    utterance.onerror();
  }
}
function pauseShow(){if(!run){if(playlist){playlist.paused=!playlist.paused;if(playlist.paused){clearTimeout(listenTimer);stopApplause()}else scheduleListening();updateListening();}return;}run.paused=!run.paused;$('#pause').textContent=run.paused?'再開する':'一時停止';if(run.paused){cancelSpeech();document.querySelectorAll('.actor').forEach(e=>e.classList.remove('talking','signature','reacting','react-boke'));}else playLine()}
function stopShow(){stopListening();stopApplause();if(!run){$('#pause').disabled=$('#stop').disabled=true;return;}cancelSpeech();run=null;$('#pause').disabled=$('#stop').disabled=true;$('#live').textContent='OPEN STAGE';$('#line').textContent='公演を終了しました。完走すると観覧ポイントを獲得できます。';updateCast()}
function changeSound(){state.sound=$('#sound').checked;if(!state.sound)stopApplause();save();if(run&&!run.paused)playLine()}
function finishShow(){const r=run;cancelSpeech();run=null;state.points+=120;state.watched++;if(r.written){state.authoredSeen=[...new Set([...(state.authoredSeen||[]),r.written.id])];}if(r.unit)state.cpuSeen=[...new Set([...state.cpuSeen,r.unit])];state.seen=[...new Set([...state.seen,...r.storyIds])];$('#progress').style.width='100%';$('#line').textContent='ご来場ありがとうございました！ 観覧ポイント +120 pt';$('#speaker').textContent='終演 · '+programTitle(r.mode,r.cast,r.theme,r.style);$('#pause').disabled=$('#stop').disabled=true;$('#live').textContent='THANK YOU';if(r.custom)completeMatch(r.cast,r.theme);save();header();updateCast();toast('公演完走！120ptを獲得しました。');playApplause();if(playlist){playlist.index++;if(playlist.index<playlist.items.length){$('#pause').disabled=$('#stop').disabled=false;scheduleListening();}else{stopListening();$('#listenStatus').textContent='入手済み芸人の全ネタを再生しました。';}}}
function card(a,locked=false){const c=a.character;return `<div class="card ${locked?'locked':''} ${locked&&$('#colorPreview')?.checked?'preview-colors':''}" style="--character-accent:${c.accent};--character-color:${c.color}"><div class="badge">No.${String(a.id+1).padStart(3,'0')} · ${a.rarity}</div><div class="portrait-plinth">${portrait(a)}</div><div class="character-tag">${locked?'未登録 · '+esc(a.group):esc(a.group)}</div><h3>${esc(a.name)}</h3><p>${locked?esc(c.tag)+'<br>ガチャで登録・演目解放':esc(c.nickname)+'<br>'+esc(a.talent)+' · ★'+state.owned[a.id]+'<br>ゲーム用ネタ '+storiesByArtist[a.id].filter(n=>state.seen.includes(n.id)).length+' / 10本 観覧済み'}</p><button class="outline small" onclick="${locked?'previewDesign':'profile'}(${a.id})">${locked?'デザインを見る':'紹介を見る'}</button></div>`}
function previewDesign(i){const a=artists[i],c=a.character;$('#modalContent').innerHTML=`<div class="character-profile" style="--character-accent:${c.accent};--character-color:${c.color}"><div class="profile-illustration">${portrait(a)}</div><div class="eyebrow">CHARACTER PREVIEW · No.${i+1}</div><h2>${esc(a.name)}</h2><p style="text-align:center">${esc(a.group)}</p><div class="character-tag">${esc(c.tag)}</div><p>${esc(c.costume)}</p><p class="tip">${esc(c.temper)}<br>ゲーム内の合成音声による演出です。</p><a href="${esc(a.source)}" target="_blank" rel="noopener noreferrer">芸名・グループの確認元</a><p class="tip">この芸人はまだ未登録です。ガチャでお迎えすると、図鑑登録とゲーム用ネタ10本が解放されます。</p><button onclick="closeModal()">閉じる</button></div>`;$('#modal').classList.remove('hide')}
function renderBook(){const q=$('#search').value,owned=$('#ownedOnly').checked,troupe=$('#troupe').value||'all';$('#bookGrid').innerHTML=artists.filter(a=>(troupe==='all'||(troupe==='showcase'?[0,2,4,6,8,11,14,16,18,20,22,26,30,34,126].includes(a.id):String(a.character.world)===troupe))&&(!owned||state.owned[a.id])&&(!q||(a.name+a.group+a.talent+a.character.nickname+a.character.persona+a.character.troupe).includes(q))).map(a=>card(a,!state.owned[a.id])).join('')||'<p>該当する芸人はいません。</p>'}
function profile(i){const a=artists[i],c=a.character;$('#modalContent').innerHTML=`<div class="character-profile" style="--character-accent:${c.accent};--character-color:${c.color}"><div class="profile-illustration">${portrait(a)}</div><div class="badge">${a.rarity} · No.${i+1} · ${esc(c.troupe)}</div><h2>${esc(a.name)}</h2><div class="character-tag">${esc(c.nickname)}</div><p class="persona-name">${esc(c.persona)}</p><blockquote>「${esc(c.catchphrase)}」</blockquote><p>${esc(c.description)}</p><div class="tone-controls"><button class="outline small" ${run?'disabled':''} onclick="previewTone(${i})">トーンを試聴</button><span class="tip" id="toneStatus">速さ ${c.rate.toFixed(2)} / 高さ ${c.pitch.toFixed(2)} / 間 ${c.gap}ms</span></div><p class="tip">セリフ・声・舞台力・レア度はゲーム用の設定です。<br><a href="${esc(a.source)}" target="_blank" rel="noopener noreferrer">芸名・グループの確認元（公式プロフィール等）</a></p><dl class="character-facts"><div><dt>ゲームの衣装</dt><dd>${esc(c.costume)}</dd></div><div><dt>芸風</dt><dd>${esc(a.talent)} · ${esc(c.tag)}</dd></div><div><dt>ゲーム内の題材</dt><dd>${esc(c.subject)} · 全10本</dd></div><div><dt>舞台成績</dt><dd>舞台力 ${a.skill} / ★${state.owned[i]} / 優勝 ${state.trophies[i]||0}回</dd></div></dl><h3>この芸人のゲーム用ネタ・全10本</h3><div class="repertoire-list">${storiesByArtist[i].map(n=>`<div class="repertoire-row"><span><small>No.${n.id}</small><br>${esc(n.title)}<br><small>${state.seen.includes(n.id)?'✓ 観覧済み':'未観覧'} · ${esc(n.setting)}</small></span><button class="outline small" ${run?'disabled':''} onclick="chooseStory(${i},${n.slot})">劇場で選ぶ</button></div>`).join('')}</div><button onclick="closeModal()">閉じる</button></div>`;$('#modal').classList.remove('hide')}
function previewTone(i){if(run)return toast('公演中のため、終演後に試聴できます。');if(!voices.length)return toast('日本語音声は端末の設定から追加できます。');cancelSpeech();const a=artists[i],u=new SpeechSynthesisUtterance('それ、もう一度ゆっくり考えてみましょう。急いだ答えほど、だいたい遠回りです。');u.lang='ja-JP';u.rate=a.character.rate;u.pitch=a.character.pitch;if(voices.length)u.voice=voices[i%voices.length];u.onend=()=>{if($('#toneStatus'))$('#toneStatus').textContent='試聴が終わりました。'};u.onerror=()=>{if($('#toneStatus'))$('#toneStatus').textContent='日本語音声を再生できませんでした。端末の設定をご確認ください。'};$('#toneStatus').textContent='合成音声でゲーム内トーンを試聴中…';speech.speak(u);}
function chooseStory(id,slot){if(run)return toast('現在の公演が終わるまでお待ちください。');if(!state.owned[id])return;$('#mode').value='solo';updateCast();$('#cast0').value=String(id);updateRepertoire();$('#theme').value=String(slot);closeModal();showPage('theater');toast(artists[id].name+'のゲーム用ネタを選びました。');}
function closeModal(){if(!run)cancelSpeech();$('#modal').classList.add('hide')}
function draw(n){if(state.points<n*100)return toast('ポイントが足りません。劇場の公演を最後まで観よう！');state.points-=n*100;const out=[];for(let k=0;k<n;k++){state.draws++;let pool;const missing=artists.filter(a=>!state.owned[a.id]);if(state.draws%10===0&&missing.length)pool=missing;else{const r=Math.random(),rarity=r<.02?'SSR':r<.10?'SR':r<.35?'R':'N';pool=artists.filter(a=>a.rarity===rarity)}const a=pool[Math.floor(Math.random()*pool.length)],isNew=!state.owned[a.id];state.owned[a.id]=(state.owned[a.id]||0)+1;out.push(`<div>${isNew?'<div class="champ">NEW! 新しい仲間</div>':'<div class="tip">★アップ！</div>'}${card(a)}</div>`)}save();header();updateCast();$('#gachaResult').innerHTML=out.join('');toast(n+'人をお迎えしました！')}
let tour=null;function renderTournament(){const owned=ids();$('#tStart').disabled=owned.length<4||!!tour||!!run;$('#tSelect').innerHTML=tour?'':owned.map((i,j)=>`<label class="card">${portrait(artists[i])}<h3>${artists[i].name}</h3><p class="character-tag">${esc(artists[i].character.tag)}</p><input type="checkbox" name="entrant" value="${i}" ${j<4?'checked':''} aria-label="${artists[i].name}を大会に選ぶ"></label>`).join('');if(!tour)$('#bracket').innerHTML=owned.length<4?'<p class="tip">あと'+(4-owned.length)+'人を集めると大会が開きます。</p>':'';renderBracket()}
function beginTournament(){if(run)return toast('公演の終演後に開催できます。');const cast=[...document.querySelectorAll('[name=entrant]:checked')].map(e=>+e.value);if(cast.length!==4)return toast('大会に出る芸人を4人選んでください。');tour={matches:[[cast[0],cast[1]],[cast[2],cast[3]]],results:[],round:0};renderTournament()}
function renderBracket(){if(!tour)return;$('#tourDone')?.remove();$('#bracket').innerHTML=[0,1,2].map((i)=>`<div><div class="eyebrow">${i<2?'SEMIFINAL '+(i+1):'FINAL'}</div><div class="match">${(tour.matches[i]||[]).map(id=>artists[id].name).join('<br>VS<br>')||'準決勝の勝者を待っています'}${tour.results[i]?`<hr><span class="champ">勝者：${artists[tour.results[i].winner].name}</span><br>${tour.results[i].scores.join(' / ')}点`:''}</div></div>`).join('');$('#nextMatch').classList.toggle('hide',tour.round>=3);$('#nextMatch').textContent=tour.round===2?'決勝を観る':'準決勝'+(tour.round+1)+'を観る';if(tour.round>=3)$('#bracket').insertAdjacentHTML('afterend','<p id="tourDone" class="champ">優勝：'+artists[tour.results[2].winner].name+'！ 大会報酬 +300pt <button class="outline small" onclick="resetTournament()">新しい大会へ</button></p>')}
function watchMatch(){if(!tour||tour.round>=3)return;if(run)return toast('現在の公演を終えてから次の試合を観てください。');const cast=tour.matches[tour.round];startShow({mode:'duo',theme:Math.floor(Math.random()*10),cast,match:tour.round})}
function completeMatch(cast,theme){if(!tour)return;const scores=cast.map(i=>Math.min(100,Math.round(artists[i].skill*.7+Math.min(state.owned[i],10)+Math.random()*22+(artists[i].theme===theme?9:0))));const winner=cast[scores[0]===scores[1]?(Math.random()<.5?0:1):scores[0]>scores[1]?0:1];tour.results.push({winner,scores});tour.round++;if(tour.round===2)tour.matches.push(tour.results.map(r=>r.winner));if(tour.round===3){state.points+=300;state.trophies[winner]=(state.trophies[winner]||0)+1;$('#line').textContent+='　🏆 優勝：'+artists[winner].name+'！ 大会報酬 +300pt'}renderBracket()}
function resetTournament(){tour=null;$('#tourDone')?.remove();$('#nextMatch').classList.add('hide');renderTournament()}
function settings(){$('#modalContent').innerHTML=`<h2>劇場の設定</h2><p class="tip">進行状況はこのブラウザに自動保存されます。別端末への移動はセーブファイルをご利用ください。開催中の大会は保存されません。</p><p><button class="outline" onclick="exportSave()">セーブを書き出す</button></p><p><label>セーブを読み込む<input type="file" accept="application/json,.json" onchange="importSave(this.files[0])"></label></p><hr><p class="tip">読み上げは端末の日本語音声を利用します。声の種類は端末によって異なります。無音の場合は設定で日本語音声を追加するか、字幕でお楽しみください。150人それぞれに10本、全1,500本の専用台本を収録。ゲーム用に創作した題材とボケ・返しを、10種類の共通構成で展開しています。本人の実際のネタや発言ではありません。実在の芸人150人を登録していますが、日本のお笑い芸人すべてを網羅する名簿ではありません。漫才やコントへの形式変更は本数に含みません。</p><button class="outline" onclick="if(confirm('集めた芸人・ポイントをすべて消しますか？')){localStorage.removeItem('warai150-v1');location.reload()}">データをリセット</button> <button onclick="closeModal()">閉じる</button>`;$('#modal').classList.remove('hide')}
function exportSave(){const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(state)],{type:'application/json'}));a.href=url;a.download='warai150-save.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
async function importSave(file){if(!file)return;try{const s=JSON.parse(await file.text());if(!Number.isSafeInteger(s.points)||s.points<0||s.points>1e9||!s.owned||Array.isArray(s.owned)||!s.owned[0]||Object.entries(s.owned).some(([i,v])=>!/^\d+$/.test(i)||!artists[+i]||!Number.isSafeInteger(v)||v<1)||!Number.isSafeInteger(s.watched)||s.watched<0||!Number.isSafeInteger(s.draws)||s.draws<0||!s.trophies||Object.entries(s.trophies).some(([i,v])=>!artists[+i]||!Number.isSafeInteger(v)||v<0))throw Error();if(!confirm('現在のセーブを読み込んだ内容で置き換えますか？'))return;cancelSpeech();state=s;state.seen=Array.isArray(s.seen)?[...new Set(s.seen.filter(id=>storyIds.has(id)))]:[];save();location.reload()}catch{toast('このセーブファイルは読み込めません。')}}
characterSystem.worlds.forEach((w,i)=>$('#troupe').add(new Option(w.name,String(i))));$('#sound').checked=!!state.sound;if(state.rosterVersion!=='real150-v1'){const migrated=state.watched>0||ids().length>1;state.rosterVersion='real150-v1';save();if(migrated)$('#rosterNotice').classList.remove('hide');}header();updateCast();loadVoices();window.addEventListener('pagehide',cancelSpeech);document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()});

// Finite playlist snapshots owned artists only; unlocking more never inserts locked acts.
let playlist=null,listenTimer=null,listenStarting=false,applause=null;
function unlockApplause(){if(!applause&&typeof Audio!=='undefined'){applause=new Audio('applause.wav');applause.preload='auto';applause.volume=.7;}}
function stopApplause(){if(applause){applause.pause();applause.currentTime=0;}}
function playApplause(){if(!state.sound)return;unlockApplause();if(applause){applause.currentTime=0;const p=applause.play();if(p&&p.catch)p.catch(()=>{});}}
function updateListening(){if(!playlist)return;$('#listenStatus').textContent=(playlist.paused?'一時停止中 · ':'聞き流し中 · ')+Math.min(playlist.index+1,playlist.items.length)+' / '+playlist.items.length+'本（入手済み '+playlist.ownedCount+'人）';$('#pause').textContent=playlist.paused?'再開する':'一時停止';}
function stopListening(){clearTimeout(listenTimer);listenTimer=null;playlist=null;$('#listenAll').disabled=false;$('#listenStatus').textContent='入手済み芸人のピン公演を5展開×10話ずつ、順番に再生します。';}
function scheduleListening(){clearTimeout(listenTimer);if(playlist&&!playlist.paused)listenTimer=setTimeout(nextListening,4200);updateListening();}
function nextListening(){if(!playlist||playlist.paused)return;while(playlist.index<playlist.items.length&&!ids().includes(playlist.items[playlist.index].id))playlist.index++;if(playlist.index>=playlist.items.length){stopListening();return;}const item=playlist.items[playlist.index];$('#mode').value='solo';$('#storyStyle').value=String(item.style||0);updateCast();$('#cast0').value=String(item.id);updateRepertoire();$('#theme').value=String(item.slot);listenStarting=true;try{startShow();}finally{listenStarting=false;}updateListening();}
function startListening(){if(run||playlist)return toast('現在の公演を終了してから開始してください。');const owned=ids();if(!owned.length)return;unlockApplause();playlist={items:owned.flatMap(id=>Array.from({length:50},(_,i)=>({id,slot:i%10,style:Math.floor(i/10)}))),index:0,ownedCount:owned.length,paused:false};$('#listenAll').disabled=true;nextListening();}

document.addEventListener("visibilitychange",()=>{if(document.hidden){stopApplause();if(run&&!run.paused)pauseShow();else if(!run&&playlist&&!playlist.paused)pauseShow();}});

let laughter=null;
function unlockLaughter(){if(!laughter&&typeof Audio!=='undefined'){laughter=new Audio('audience-laugh.wav');laughter.preload='auto';laughter.volume=.55;}}
function stopLaughter(){if(laughter){laughter.pause();laughter.currentTime=0;}}
function playLaughter(){if(!state.sound||state.audience===false)return;unlockLaughter();if(laughter){laughter.currentTime=0;const p=laughter.play();if(p&&p.catch)p.catch(()=>{});}}
function changeAudience(){state.audience=$('#audience').checked;save();if(!state.audience)stopLaughter();}
$('#audience').checked=state.audience!==false;

function actorName(cast,index){const id=cast[index];return artists[id].name+(cast.filter(i=>i===id).length>1?'（'+(cast.slice(0,index+1).filter(i=>i===id).length)+'号）':'');}
function combinationScript(mode,slot,cast){
 const a=artists[cast[0]],b=artists[cast[1]],c=artists[cast[2]??cast[1]];
 const x=storyAt(a.id,slot),y=storyAt(b.id,(slot+a.id)%10),z=storyAt(c.id,(slot+a.id+b.id)%10);
 const obj=x.subject,other=y.subject,third=z.subject,clone=new Set(cast).size<cast.length;
 const names=cast.map((_,j)=>actorName(cast,j)),skit=mode==='skit'||mode==='trioskit';
 let beats;
 if(clone){
  beats=[[0,`今日は${names.join('と')}で、${obj}の仕事を分担します。`],
   [1,'同じ顔の人から仕事を頼まれると、断った瞬間に自分が傷つきます。'],
   [0,`私は${obj}担当。もう一人の私は${other}担当です。`],
   [1,'責任者まで分身させたら、誰に謝るんですか。'],
   [0,'鏡に向かって謝ります。相手も同時に頭を下げるので和解が早いです。'],
   [1,'反省までコピーするな！'],
   [0,`では${obj}の使い方を実演します。${x.beats[3][1]}`],
   [1,`その勘違い、私も今ちょうど思いつきました。${x.beats[4][1]}`],
   [0,'ボケも返しも同じなら、給料だけ人数分に増やしましょう。'],
   [cast.length===3?2:1,cast.length===3?`三人目の私が会計です。${third}で支払っていいですか。`:'会計の私は、その提案を断固拒否します。'],
   [0,'一人で会議すると満場一致になると思ったのに。'],
   [cast.length===3?2:1,'全員同じ顔でも、財布を開ける意見だけ割れました。'],
   [1,'分身を戻す前に、誰の財布か確認させて！']];
 }else if(skit){
  beats=[[1,`こちらは${y.setting}の出張受付です。${names[0]}さん、何をお持ちですか。`],
   [0,`${obj}を${other}として使う新サービスです。`],
   [1,`${names[1]}が受付しますが、その二つを同じ窓口に持ち込まないでください。`],
   [0,x.beats[3][1]], [1,`${x.beats[4][1]} ここは${y.setting}です。`],
   [0,`${x.beats[5][1]} 出張料金もつけておきました。`],
   [1,`${other}の修理より、発想の修理が先ですね。`],
   [cast.length===3?2:0,cast.length===3?`${names[2]}、審査に来ました。${third}の基準で調べます。`:`実績ならあります。${y.beats[3][1]}`],
   [1,cast.length===3?`審査道具まで${third}に変えないでください。`:'他の人の勘違いまで実績に追加しないでください。'],
   [0,x.beats[9][1]],
   [cast.length===3?2:1,cast.length===3?`では${third}の審査は、普通に使えたので合格です。`:`それなら${other}は元の担当へ返せますね。`],
   [0,`合格祝いに${obj}と${other}の結婚式を予約します。`],
   [1,'窓口は式場じゃありません！ まず仕事を終わらせて！']];
 }else{
  beats=[[0,`${names[0]}です。今日は${names.slice(1).join('と')}と、${obj}の新しい使い道を考えます。`],
   [1,`${names[1]}は${other}の担当なので、まず違いから確認しましょう。`],
   [0,`${obj}も${other}も、同じ制服を着せれば同じ社員です。`],
   [1,'道具に入社式をさせないでください。'],
   [0,`${x.beats[3][1]} これが我が社の事業です。`],
   [1,x.beats[4][1]],
   [cast.length===3?2:0,cast.length===3?`${names[2]}です。${third}を社長に推薦します。`:`では私が社長です。${x.beats[5][1]}`],
   [1,cast.length===3?'人事まで道具に任せる会社、初日で退職したいです。':'社長がいちばん研修を必要としていますね。'],
   [0,`そちらの${other}にも役職をつけましょう。${y.beats[3][1]}`],
   [cast.length===3?2:1,cast.length===3?`その理屈なら${third}が全員の上司になります。`:y.beats[4][1]],
   [1,'出世争いをする前に、正しい使い方を決めましょう。'],
   [0,`${x.beats[9][1]} これで会社は安泰ですね。`],
   [cast.length===3?2:1,cast.length===3?'社長を棚に片づけたら、会社まで閉店しました！':'普通に使うだけで、会社を一社作るな！']];
 }
 const frames=[
 [`今日は${obj}の初日研修です。${other}を新人だと思って指導してください。`,'まず出勤時刻と、正しい使い方を確認します。',`研修が終わったので${obj}に名札を返します。`,'名札ではなく、覚えた使い方を明日も持ってきてください。'],
 [`${obj}と${other}の採用面接を始めます。`,'特技と、やってはいけないことを一つずつ説明してください。',`面接の結果、${other}を採用して私は見学します。`,'採用する側が席を譲る前に、履歴書を返してください。'],
 [`${obj}の相談を${other}の窓口へ持ってきました。`,'何に困ったのか、順番に一件ずつ聞きます。',`相談が片づいたので${obj}にお礼状を書きます。`,'次に困った時は、道具より先に担当者へ話してください。'],
 [`${obj}と${other}の広告撮影です。今日は実演で紹介します。`,'効能を盛らず、実際の使い方を見せましょう。',`完成した広告には${obj}の反省だけ載せました。`,'広告の最後に、商品が何なのかも忘れず載せてください。'],
 [`${obj}を点検します。記録係は${other}の担当です。`,'壊れていないか、項目を一つずつ確認します。',`点検結果は${obj}より私の使い方に問題ありです。`,'修理の予約をする前に、説明書を一緒に読みましょう。'],
 [`${obj}対${other}の発明コンテストを始めます。`,'便利さと、安全に使えるかで審査します。',`優勝は${other}、副賞は${obj}の説明係です。`,'副賞の仕事を受け取る人が決まるまで、表彰式を延ばします。'],
 [`十年後の${obj}と${other}の展示会を開きます。`,'今の使い方と、未来に変えたいことを分けて説明しましょう。',`未来の${obj}は、今日の反省を覚えているそうです。`,'その未来へ行くため、まず今日から正しく使いましょう。'],
 [`${obj}と${other}の一年分の思い出を発表します。`,'最初の失敗と、今できるようになったことを聞かせてください。',`思い出の写真は${obj}だけが全部ピントぴったりです。`,'写真より大事な、使い方の成長も記録しておきます。'],
 [`本日は${obj}の一日店長、${other}は売り場担当です。`,'開店準備から閉店確認まで、二人で分担します。',`閉店前に${obj}へ店長の引き継ぎを書きました。`,'一日分の売り上げと、明日の担当者も忘れずに確認します。'],
 [`忘れ物窓口に${obj}が届きました。${other}の担当者を呼びます。`,'持ち主だけが分かる特徴を確認しましょう。',`落とし主は${obj}を探していた昨日の自分でした。`,'返却票を書いたら、今度は持ち帰るのを忘れないでください。']
 ][slot];
 const lines=beats.map(([who,text],i)=>({who,text,beatIndex:i,laugh:[5,7,12].includes(i)}));
 lines.splice(2,0,{who:0,text:frames[0]},{who:1,text:frames[1]});
 lines.push({who:0,text:frames[2]},{who:1,text:frames[3]});
 lines.splice(2,0,{who:1,text:b.character.catchphrase,signature:true});
 lines.push({who:0,text:a.character.exitLine,signature:true},{who:0,text:'どうも、ありがとうございました！'});
 return addChaosScenes(lines,mode,slot,cast);
}

function chaosSeed(mode,slot,cast){return [...mode].reduce((n,c)=>Math.imul(n^c.charCodeAt(0),16777619)>>>0,cast.reduce((n,id)=>Math.imul(n,151)+id+1,slot+1)>>>0);}
function chaosPlan(mode,slot,cast){
 const seed=chaosSeed(mode,slot,cast),a=artists[cast[0]],members=artists.filter(x=>x.group===a.group&&x.id!==a.id&&a.group!=='ピン');
 return {seed,first:seed%8,second:(seed%8+1+((seed>>>8)%7))%8,absent:members.length?members[(slot+a.id)%members.length]:null,kind:mode==='solo'?(members.length?'相方不在':'一人劇場'):new Set(cast).size<cast.length?'分身暴走':mode.includes('skit')?'配役迷子':'掛け合い暴走'};
}
function addChaosScenes(lines,mode,slot,cast){
 const plan=chaosPlan(mode,slot,cast),a=artists[cast[0]],obj=storyAt(a.id,slot).subject;
 const counterpart=plan.absent||artists[cast[1]??cast[0]],other=storyAt(counterpart.id,(slot+3)%10).subject;
 const third=storyAt(cast[2]??counterpart.id,(slot+5)%10).subject;
 const solo=mode==='solo',clone=new Set(cast).size<cast.length;
 const names=cast.map((_,j)=>actorName(cast,j)),partner=solo?(plan.absent?plan.absent.name:'未来の自分'):names[1];
 const speaker=solo?0:1,thirdWho=cast.length===3?2:0;
 const context=solo?(plan.absent?`今日は${a.group}から一人です。${partner}の出番まで私が引き受けました。`:'今日は一人なので、客席への相談も自分で回答します。'):clone?`${names.join('と')}。${mode.includes('skit')?'配役表をコピーしたら':'マイクを分けたら'}、分身の見分け方を分身本人が忘れました。`:mode.includes('skit')?`ここは${storyAt(counterpart.id,slot).setting}。${names.join('と')}の担当表が入れ替わりました。`:`${names.join('と')}で話していたら、${obj}と${other}の話が合流してしまいました。`;
 const scenes=[
  {name:'相方の代理',text:[`返事がないので${obj}を${partner}の代役にします。`,`いまの間は、${plan.absent?'相方が不在なだけ':'考えているだけ'}です。道具を出演させないで。`,`では${other}にも台詞を渡します。`,`台詞より先に、口が付いているか確認してください。`,`口がないので、${a.character.tag}な私が全役やります。`,`話す担当しか増えてない！ 聞く担当を一人ください。`]},
  {name:'時間の巻き戻し',text:[`もう一度${obj}の説明をします。ただし結論から逆向きです。`,'ありがとうございました。まだ終わってません。',`つまり${other}は、出てくる前に片づけました。`,'登場する権利まで回収しないでください。',`では${third}を昨日の舞台に置いてきます。`,'昨日の担当者も私です。仕事を過去に押し付けるな！']},
  {name:'役の取り違え',text:[`${partner}の役をやるつもりが、${other}そのものになりました。`,'その役、立ったまま黙っている以外に仕事は？',`私の役は${obj}に任せました。`,'本人まで道具側へ異動しないでください。',`${third}が全員に演技指導を始めました。`,'口のない先生に、口答えするのだけは上手いな！']},
  {name:'増殖する会議',text:[`${obj}の議題を一つ出すたび、心の中の私が増えます。`,'増えた人は全員、議事録を書いてください。',`最初の私が${other}で賛成、二人目は${third}で反対です。`,'道具で挙手するな。誰の意見か分からない。','多数決の結果、全員が議長を辞退しました。','会議だけ増殖して、責任者が絶滅した！']},
  {name:'巨大すぎる小道具',text:[`${obj}を見やすくするため、劇場と同じ大きさにしました。`,'見やすい前に客席がなくなりました。',`お客さんには${other}のすき間に座ってもらいます。`,'座席の設計を道具に合わせないでください。',`${third}だけ小さくして帳尻を合わせます。`,'大きさの平均で消防通路を確保するな！']},
  {name:'声の置き忘れ',text:[`${partner}への返事を${obj}に預けたら、私の返事までなくなりました。`,'なくなった説明を、いま普通にしゃべってます。',`この声は${other}から借りた仮の声です。`,'では返却期限はいつですか。','ありがとうございました、で返却する契約です。','終わりの挨拶を先に言って、残りを顔だけで乗り切るな！']},
  {name:'予算が道具',text:[`本日の出演料は${obj}でいただきます。`,'現金の代わりに、持ち帰る荷物が増えるだけです。',`${partner}には${other}、私は${third}も追加で。`,'交渉するほど手がふさがっています。','財布を持つ手がないので、買い物をやめました。','節約の理由が、金額じゃなくて握力！']},
  {name:'出口の勘違い',text:[`${obj}の出口を探したら、${other}の入口に着きました。`,'道具を建物だと思い始めていますね。',`${partner}を案内役にして、${third}で地図を書きます。`,'その案内役、自分の出番を探して迷っています。','舞台を一周したら、開演前の私に会いました。','その人に伝えて。道案内だけは絶対に引き受けるな！']}
 ];
 const added=[{who:0,text:context,chaos:plan.kind}];
 for(const index of [plan.first,plan.second]){
  const scene=scenes[index];scene.text.forEach((text,i)=>added.push({who:i%2?speaker:(i===4?thirdWho:0),text,part:solo?(i%2?0:1):undefined,laugh:i===3||i===5,chaos:scene.name}));
 }
 const end=lines.length-2;lines.splice(end,0,...added);return lines;
}

function selectOriginalUnit(){if(run)return toast('終演後に変更できます。');const id=Number($('#cast0').value),a=artists[id];const group=a.group==='ピン'?[a]:artists.filter(x=>x.group===a.group);if(group.some(x=>!state.owned[x.id]))return toast('元のコンビ・トリオを組むには、メンバー全員を入手してください。');if(group.length>3)return toast('このグループは3人まで選んでください。');$('#mode').value=group.length===1?'solo':group.length===2?'duo':'trio';updateCast();group.forEach((x,j)=>$('#cast'+j).value=String(x.id));updateRepertoire();toast(a.group+'の固定ネタ10本を選択しました。');}

function canonicalCast(cast){return [...cast].sort((a,b)=>a-b);}
function styleNames(){return ['日常の掛け合い','職業コント','勘違い推理','暴走ファンタジー','分身・役割逆転'];}
function currentStyle(){const v=Number($('#storyStyle')?.value);return Number.isInteger(v)&&v>=0&&v<5?v:0;}
function cpuCounts(n){const pin=n,duo=n*(n+1)/2,trio=n*(n+1)*(n+2)/6;return {pin,duo,trio,units:pin+duo+trio,total:(pin+duo+trio)*50};}
function validCpuKey(k){if(typeof k!=='string')return false;const m=/^cpu:([123]):([0-9,]+):([0-4]):([0-9])$/.exec(k);if(!m)return false;const c=m[2].split(',').map(Number);return c.length===+m[1]&&c.every(id=>Number.isInteger(id)&&id>=0&&id<150)&&c.join(',')===canonicalCast(c).join(',');}
function makeScript(mode,slot,cast,style=0){
 cast=canonicalCast(cast);if(!cast.length||cast.length>3||cast.some(id=>!artists[id])||!Number.isInteger(slot)||slot<0||slot>9||!Number.isInteger(style)||style<0||style>4)throw Error('Invalid CPU program');
 const form=cast.length===1?'solo':cast.length===2?(style===1||style===3?'skit':'duo'):(style===1||style===3?'trioskit':'trio');
 const lines=baseScript(form,slot,cast),cpuLines=cpuConversation(cast,slot,style);
 lines.splice(lines.length-2,0,...cpuLines);return lines;
}
function createArtistCPU(id,instance,style,slot){
 return {id,instance,style,slot,turn:0,seen:[],goal:['話を日常に戻す','仕事を終える','勘違いを調べる','世界を修復する','自分の役を守る'][style],bias:(id*17+instance*11+slot*3+style)%3};
}
function decideArtistCPU(cpu,last,cast){
 const a=artists[cpu.id],own=storyAt(cpu.id,cpu.slot).subject,other=last.subject||own;
 const duplicate=cast.filter(id=>id===cpu.id).length>1;
 let choices,reason,intent;
 if(duplicate&&!cpu.seen.includes('分身確認')){
  reason='分身確認';intent='claim';choices=[`私は${cpu.instance+1}号です。${own}の担当は私、と名札に書いておきます。`,`同じ顔でも私は${cpu.instance+1}号。${own}を持っている方、と覚えてください。`,`私は${cpu.instance+1}号です。${own}の担当までコピーされると困ります。`];
 }else if(last.intent==='claim'){
  reason='担当の調整';intent='request';choices=[`その${other}の担当は分かりました。では${own}の片づけを手伝ってください。`,`担当表を直します。${other}の横に、${own}の係も書きますね。`,`担当を増やす前に、${other}と${own}を一つずつ扱いましょう。`];
 }else if(last.intent==='request'){
  reason='依頼への対応';intent='confusion';choices=[`手伝うつもりで${other}に${own}の説明書を渡しました。`,`${other}を片づける係を、${own}に頼んできました。`,`${other}の仕事を${own}へ引き継ぎました。返事はまだです。`];
 }else if(last.intent==='confusion'){
  reason='勘違いの修正';intent='repair';choices=[`道具に返事を待たないで。${other}は自分で元の場所へ戻しましょう。`,`その${other}に指示を出しても動きません。手を動かすのはこっちです。`,`${other}の説明より、誰が片づけるかを先に決めましょう。`];
 }else{
  reason=['日常へ戻す','職場の担当判断','推理のやり直し','世界の修復','役割の交換'][cpu.style];intent='claim';
  const plans=[
   [`普段どおり${own}を使うだけにします。普通の一日を返してください。`,`${own}で休憩を始めます。休む前の準備だけ大仕事です。`,`今日の${own}担当を引き受けます。生活を元に戻しましょう。`],
   [`${own}の受付を担当します。整理券は私が手書きします。`,`${own}係に就任しました。引き継ぎ相手も私でした。`,`${own}の閉店確認をします。開店した記録から探します。`],
   [`${own}の持ち主を調べます。証拠品に私の名札が付いています。`,`${own}の謎を解きます。まず自分が何を忘れたか捜査します。`,`${own}の事件担当です。被害は片づけの時間です。`],
   [`${own}で世界を修復します。修理窓口が宇宙まで延びました。`,`空から来た${own}の担当です。着地場所から決めましょう。`,`${own}の魔法を解除します。説明書が空を飛んでいます。`],
   [`${own}の役と私の役を交換します。人間の役だけ空席です。`,`私は${own}係を降ります。代わりに私を道具係に任命します。`,`${own}担当の私が、私の代理を探します。鏡は面接で落ちました。`]
  ];choices=plans[cpu.style];
 }
 const text=choices[(cpu.bias+cpu.turn)%choices.length];cpu.turn++;cpu.seen.push(reason);return {text,subject:reason==='勘違いの修正'?other:own,intent,reason,turn:cpu.turn};
}
function cpuConversation(cast,slot,style){
 const cpus=cast.map((id,i)=>createArtistCPU(id,i,style,slot));
 const opening=[`今度は日常の話に戻しましょう。${storyAt(cast[0],slot).subject}は誰の担当ですか。`,`職場の開店準備です。${storyAt(cast[0],slot).subject}の担当を決めます。`,`ここから勘違いの原因を調べます。${storyAt(cast[0],slot).subject}を最後に見たのは誰ですか。`,`舞台が不思議な世界につながりました。${storyAt(cast[0],slot).subject}で帰り道を探します。`,`配役を取り替えます。${storyAt(cast[0],slot).subject}の役は誰が引き受けますか。`][style];
 const lines=[{who:0,text:opening,cpu:{reason:'話題の設定',turn:0}}];let last={intent:'opening',subject:storyAt(cast[0],slot).subject};
 for(let i=0;i<cast.length*2+2;i++){const who=i%cast.length,reply=decideArtistCPU(cpus[who],last,cast);lines.push({who,text:reply.text,laugh:reply.intent==='confusion'||(cast.includes(cast[who],who+1)&&reply.intent==='claim'),cpu:{reason:reply.reason,turn:reply.turn},part:cast.length===1?i%2:undefined});last=reply;}
 lines.push({who:0,text:`${last.subject}の担当を決める話だけで、終演時間になりました。続きは片づけながら相談しましょう。`,cpu:{reason:'終演の判断',turn:cpus[0].turn},laugh:true});return lines;
}

function authoredFor(cast,slot,style){if(state.writtenPreferred===false)return null;const key=canonicalCast(cast).join(',');return (window.WARAI_AUTHORED||[]).find(s=>s.style===style&&s.slot===slot&&s.cast.join(',')===key)||null;}
function performanceScript(mode,slot,cast,style=0){cast=canonicalCast(cast);const s=authoredFor(cast,slot,style);const lines=s?s.lines.map(l=>({...l,authored:true})):makeScript(mode,slot,cast,style);if(state.adlib===false)return lines;const scene=memoryScene(cast,slot,style,s?.topic||storyAt(cast[0],slot).subject,lines.slice(0,Math.max(1,lines.length-3)));const at=Math.max(1,lines.length-3);const bridge=s?{who:lines[at].who,text:'最初の話へ戻します。'+lines[at].text,authoredBridge:true}:{who:0,text:'担当の話はここで区切って、最初の使い方へ戻りましょう。',authoredBridge:true};lines.splice(at,1,...scene,bridge);return lines;}
function changeAdlib(){state.adlib=$('#adlib').checked;save();toast(state.adlib?'次の公演から記憶CPUの掛け合いを追加します。':'次の公演から固定台本をそのまま上演します。');}
function renderWritten(){const scripts=window.WARAI_AUTHORED||[];$('#writtenCount').textContent=(state.authoredSeen||[]).length+' / '+scripts.length+'本 観覧済み';$('#writtenGrid').innerHTML=scripts.map(s=>`<div class="card" style="text-align:left"><div class="eyebrow">${s.cast.length===1?'ピン':s.cast.length===2?'コンビ':'トリオ'} · ${styleNames()[s.style]} · ${s.id}</div><h3>${esc(s.title)}</h3><p>${s.cast.map(i=>esc(artists[i].name)).join(' ／ ')}</p><p>${esc(s.premise)}</p><p>${(state.authoredSeen||[]).includes(s.id)?'✓ 観覧済み':'未観覧'} · ${s.lines.length}行</p><div class="toolbar"><button class="outline small" onclick="readAuthored('${s.id}')">台本を読む</button><button class="small" onclick="chooseAuthored('${s.id}')">劇場で選ぶ</button></div></div>`).join('');}
function readAuthored(id){const s=(window.WARAI_AUTHORED||[]).find(s=>s.id===id);if(!s)return;$('#modalContent').innerHTML='<div class="eyebrow">個別書き下ろし台本</div><h2>'+esc(s.title)+'</h2><p>'+esc(s.premise)+'</p><p class="tip">本人のネタや発言ではなく、ゲーム用に書いた創作です。役名は読み上げません。</p>'+s.lines.map(l=>'<p><b>'+esc(artists[s.cast[l.who]].name)+'</b>：'+esc(l.text)+(l.laugh?' <small>［笑い声］</small>':'')+'</p>').join('')+'<button onclick="closeModal()">閉じる</button>';$('#modal').classList.remove('hide');}
function chooseAuthored(id){if(run)return toast('現在の公演を終えてから選んでください。');const s=(window.WARAI_AUTHORED||[]).find(s=>s.id===id);if(!s)return;if(s.cast.some(i=>!state.owned[i]))return toast('この台本の出演者を全員入手すると上演できます。台本は入手前でも読めます。');state.writtenPreferred=true;save();$('#mode').value=s.cast.length===1?'solo':s.cast.length===2?'duo':'trio';$('#storyStyle').value=String(s.style);updateCast();s.cast.forEach((id,j)=>$('#cast'+j).value=String(id));updateRepertoire();$('#theme').value=String(s.slot);showPage('theater');closeModal();toast('書き下ろし「'+s.title+'」を選びました。');}
renderWritten();

function cpuProfile(id,instance=0){
 const motives=['費用を抑える','手順を守る','早く終わらせる','全員を納得させる','証拠を集める','目立つ成果を作る','安全を確かめる','約束を守る','仕組みを理解する','担当を決める'];
 const approaches=['現場の不都合を具体化','言葉の意味を取り違える','前提の矛盾を分析','目標のため条件を変更','例外を探す','大げさに実演','責任者を確認','仮説を立てる','損得を計算','相手の説明を要約','手順を細分化','別の立場に置換','結論を急ぐ','細部を確認','自分の体験へ置換'];
 const learned=window.WARAI_CPU_SETTINGS?.[id];
 return {...learned,key:'persona-'+id,name:artists[id].name,approach:learned?.habit||approaches[id%15],goal:motives[(Math.floor(id/15)+instance)%10],bias:storyAt(id,(id+instance)%10).subject,variant:Math.floor(id/15),fictional:true};
}
function createMemoryCPU(id,instance){return {id,instance,profile:cpuProfile(id,instance),formation:'solo',cloned:false,history:[],beliefs:{},contradictions:0,role:instance%2?'ツッコミ':'ボケ',turn:0};}
function rememberCPU(cpu,line){cpu.history.push({who:line.who,text:line.text,topic:line.topic,fact:line.fact});if(cpu.history.length>24)cpu.history.shift();if(line.topic&&line.fact){if(cpu.beliefs[line.topic]&&cpu.beliefs[line.topic]!==line.fact)cpu.contradictions++;cpu.beliefs[line.topic]=line.fact;}}
function memoryDecision(cpu,last,board,style,topic){
 const wrong=['休憩する社員','面接を受ける上司','事件を調べる犯人','空を飛ぶ受付係','自分の代役'][style];
 const snippet=last.text.length>24?last.text.slice(0,24)+'…':last.text;
 let text,reason,fact;
 if(board.pressure>=6){
  cpu.role='訂正係';reason='全員訂正';fact=board.lastFact==='普通'?'再訂正':'普通';
  text=[`いまの「${snippet}」を訂正します。訂正する人まで訂正の対象です。`,`${topic}の正解へ戻そうとしましたが、戻すという説明を先に訂正されました。`,`私のさっきの説明を取り消します。ただし、取り消した説明も正しかったことにしてください。`][(cpu.id+cpu.turn)%3];
 }else if(board.pressure>=3){
  reason='説明役逆転';fact=board.lastFact==='普通'?'勘違い':'普通';
  if(cpu.role==='ツッコミ'){cpu.role='ボケの解説';text=`つまり、${topic}を${wrong}だと思ったから、いまの「${snippet}」になるわけです。説明していたら、私まで筋が通る気がしてきました。`;}
  else{text=`その説明を直します。${topic}は${wrong}ではありません。でも、その役の人に確認しないと否定できない気もします。`;cpu.role='ツッコミ';}
 }else if(cpu.role==='ツッコミ'||last.fact==='勘違い'){
  reason=cpu.contradictions?'言い直し':'勘違いの指摘';fact='普通';text=`さっきは${topic}を${wrong}と言いましたね。言い直します。${topic}は人ではなく、話の題材です。`;
 }else{
  reason='勘違いの主張';fact='勘違い';text=`${topic}を${wrong}として扱えば、話が早いでしょう。本人の返事は、私が代わりにします。`;
 }
 const p=cpu.profile,old=cpu.history.find(l=>l.who!==cpu.instance)||cpu.history[0];
 if(p.personality){
 const target=old?.text?.slice(0,30)||snippet;
 const actions={
 check:[`「${snippet}」の条件を確認します。${topic}で困る人は誰ですか。`,`前の「${target}」と今の説明、どちらを規則にするんですか。`],
 act:[`では、私が${topic}の担当を演じます。言われた通りに動けば分かりますね。`,`実際に試しました。説明した人と、やった私とで結果が違います。`],
 interpret:[`「${snippet}」は${p.bias}にも使う言い方ですか。私はそちらの意味で受け取りました。`,`言い直した言葉を説明すると、また別の意味になりますよ。`],
 help:[`その話なら私が間に入ります。${topic}の担当と確認係、両方の希望を聞きましょう。`,`二人の希望を両方守ったら、誰も作業を始められなくなりました。`],
 goal:[`私は${p.goal}ため、${topic}の条件を一つ変えたいです。`,`その条件で得をするはずが、変更する手間の方が増えました。`],
 world:[`${topic}の世界では、${p.bias}が責任者ということにしましょう。`,`その世界の決まりを守ると、今度は私たちが例外になってしまいます。`],
 observe:[`「${snippet}」の中で、一つ気になりました。${topic}を頼んだ人の返事がありません。`,`さっきの「${target}」も覚えています。その説明で同じことができますか。`]
 };
 const action=actions[p.strategy]||actions.observe;
 if(board.pressure<3)text=action[cpu.turn%2]+text;
 else if(board.pressure<6)text=action[1]+text;
 else text=action[cpu.turn%2]+text;
 if(cpu.turn===0)text=p.catchphrase+text;
 if(cpu.formation==='solo'&&cpu.turn%3===1)text='今度は返事をする側のつもりで答えます。'+text;
 if(cpu.formation==='trio'&&cpu.turn===1)text='二人の説明を私が照合します。'+text;
 if(cpu.cloned&&cpu.turn%3===0)text=`同じ顔でも、私の目的は${p.goal}ことです。`+text;
 if(cpu.turn>0&&old)text+=`最初の「${target}」を忘れたことにはしません。`;
 }else text=`私は${p.goal}ために動いています。`+text;
 cpu.turn++;return {who:cpu.instance,text,topic,fact,intent:reason,profile:p.key,goal:p.goal,cpu:{reason,turn:cpu.turn,pressure:board.pressure,remembered:cpu.history.length,contradictions:cpu.contradictions,role:cpu.role},laugh:reason==='説明役逆転'||reason==='全員訂正'};
}
function memoryScene(cast,slot,style,topic,seed=[]){
 const cpus=cast.map((id,i)=>{const c=createMemoryCPU(id,i);c.formation=cast.length===1?'solo':cast.length===2?'duo':'trio';c.cloned=cast.filter(x=>x===id).length>1;return c;}),board={pressure:0,lastFact:'普通'};
 for(const line of seed.slice(-24))cpus.forEach(c=>rememberCPU(c,line));
 let last={who:0,text:`${topic}について、さっきの説明を覚えているか確認します。`,topic,fact:'普通'};
 const lines=[{who:0,text:last.text,cpu:{reason:'発言の確認',turn:0,pressure:0}}];
 for(let turn=0;turn<12+cast.length;turn++){
  cpus.forEach(c=>rememberCPU(c,last));const cpu=cpus[turn%cast.length];
  const reply=memoryDecision(cpu,last,board,style,topic);
  if(reply.fact!==board.lastFact||reply.intent==='全員訂正')board.pressure++;
  board.lastFact=reply.fact;last=reply;lines.push(reply);
 }
 return lines;
}
$('#adlib').checked=state.adlib!==false;
