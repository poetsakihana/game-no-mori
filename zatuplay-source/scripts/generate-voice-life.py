#!/usr/bin/env python3
"""Deterministic, asserted source adaptation. Original fixture is byte-identical APK HTML."""
from pathlib import Path
import re, hashlib
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/games/voice-life'
original=(ROOT/'scripts/voice-life-original.html').read_bytes()
assert hashlib.sha256(original).hexdigest()=='bdd27499adc865024ab8ef492a1ce13b765d7fc79c556540df3cd60254b58a79'
html=original.decode(); js=re.search(r'<script>(.*?)</script>',html,re.S).group(1)
def replace(old,new,count=1):
 global js
 assert js.count(old)==count, (old[:90],js.count(old),count)
 js=js.replace(old,new)
def function(name,new):
 global js
 start=js.index('function '+name+'(')
 # Original functions are single physical lines except toggle/join, specially handled below.
 end=js.index('\n',start)
 js=js[:start]+new+js[end:]
replace("(()=>{'use strict';", "VoiceLifeStorage.launch(voiceLifeDefaults(), store => { 'use strict';\n"+(ROOT/'scripts/voice-life-runtime-head.js').read_text())
replace("KEY='voice-life-v1',",'')
replace("history:[]};","history:[],totalGiftCoins:0,details:{}};")
replace("let state={...base};try{const x=JSON.parse(localStorage.getItem(KEY));if(x&&typeof x.name==='string')state={...base,...x,relationships:x.relationships||{}}}catch(e){}", "let state=store.data.state;")
replace("const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(state))}catch(e){}};", "const save=()=>store.save();")
replace("const EXTRA='voice-life-v4';let extra={wallet:0,badges:[],lastClaim:'',snapshots:{},family:null,familyChat:[],familyContribution:0,collab:null};\ntry{let saved=JSON.parse(localStorage.getItem(EXTRA)||'null');if(saved&&typeof saved==='object')extra={...extra,...saved}}catch(e){}", "let extra=store.data.extra;")
function('saveExtra','function saveExtra(){store.save()}')
replace("const MEDIA_KEY='voice-life-media-v7', SOCIAL_KEY='voice-life-social-v7';\nlet media={avatar:'',banner:''},social={views:0,followers:[],seen:{},lastPulse:Date.now()};\ntry{media={...media,...JSON.parse(localStorage.getItem(MEDIA_KEY)||'{}')}}catch(e){}\ntry{social={...social,...JSON.parse(localStorage.getItem(SOCIAL_KEY)||'{}')}}catch(e){}", "let media=store.data.media,social=store.data.social;")
function('persistMedia','function persistMedia(){store.save();return true}')
function('persistSocial','function persistSocial(){store.save()}')
replace("async function stopMic(){if(micStream){micStream.getTracks().forEach(t=>t.stop());micStream=null}$('micStatus').textContent='マイクOFF'}", "function stopMic(){micEpoch++;micPending=false;if(micStream){micStream.getTracks().forEach(t=>t.stop());micStream=null}$('micStatus').textContent='マイクOFF';$('toggle').disabled=false}")
a=js.index('async function toggle()'); b=js.index('\nfunction eligible()',a)
js=js[:a]+(ROOT/'scripts/voice-life-toggle.js').read_text()+js[b:]
replace("function renderProfile(){", "function renderProfile(){cancelImages();")
replace("function show(tab){", "function show(tab){importEpoch++;cancelImages();if(tab!=='studio'){if(live)endStream('画面移動');else stopMic()}document.querySelectorAll('.cpu-detail').forEach(e=>e.remove());")
replace("let p=people[targets[i]];setTimeout(()=>{if(live&&viewers.has(p.id))cpuSpeak(p,lastTopic)", "let p=people[targets[i]],epoch=sessionEpoch,topic=lastTopic;setTimeout(()=>{if(live&&sessionEpoch===epoch&&viewers.has(p.id))cpuSpeak(p,topic)")
replace("function visit(h){room=h;", "function visit(h){roomEpoch++;room=h;")
replace("function leave(){room=null;", "function leave(){roomEpoch++;room=null;")
replace("let topic=topicOf(c),name=room?.name;setTimeout(()=>{if(room&&room.name===name)", "let topic=topicOf(c),id=room?.id,epoch=roomEpoch;setTimeout(()=>{if(room&&room.id===id&&epoch===roomEpoch)")
replace("state.following.includes(room.name)","state.following.includes('h:'+room.id)")
replace("state.following.push(room.name)","state.following.push('h:'+room.id)")
replace("state.following.includes(p.name)","state.following.includes((isHost?'h:':'p:')+p.id)")
replace("state.following.filter(n=>n!==p.name)","state.following.filter(n=>n!==(isHost?'h:':'p:')+p.id)")
replace("state.following.push(p.name)","state.following.push((isHost?'h:':'p:')+p.id)")
function('checkDailySnapshot',"""function checkDailySnapshot(){const today=dateKey(),now=Date.now();if(extra.currentDay&&extra.currentDay!==today){const o=extra.observed;if(o&&o.day===extra.currentDay&&!extra.snapshots[o.day])extra.snapshots[o.day]={place:o.place,points:o.points,claimed:false,observedAt:o.at};extra.currentDay=today;extra.observed=null}extra.currentDay=today;extra.observed={day:today,place:eventBoard().findIndex(x=>x.me)+1,points:state.totalPoints+sessionPoints,at:now};saveExtra()}""")
replace("'翌日になると前日の結果が確定します。'", "'翌日、前日の最終観測順位から報酬を計算します（未起動日は作成しません）。'")
replace("d.textContent=day+' ｜ '+v.place", "d.textContent=day+' 最終観測 '+new Date(v.observedAt).toLocaleTimeString('ja-JP',{timeZone:'Asia/Tokyo'})+' ｜ '+v.place")
replace("extra.familyChat.push({who:reply,msg:pick(['よろしくね〜！🌸','今日も応援してるよ！','ファミリーのみんなで盛り上がろう🎶','それいいね！💗','一緒に頑張ろう！'])});", "extra.familyChat.push({who:reply,msg:pick(['よろしくね〜！🌸','今日も応援してるよ！','ファミリーのみんなで盛り上がろう🎶','それいいね！💗','一緒に頑張ろう！'])});extra.familyChat=extra.familyChat.slice(-60);")
replace("if(d.links&&!/^https:\\/\\//i.test(d.links))", "if(!store.safeLink(d.links))")
replace("alert('プロフィールを保存したでよ！')", "alert('プロフィールを更新しました。端末保存の状態は上部に表示しています。')")
replace("$('reset').onclick=()=>{if(confirm('すべての記録を削除して退会しますか？')){live=false;stopMic();localStorage.removeItem(KEY);localStorage.removeItem(EXTRA);location.reload()}};", "")
replace("},60000);init();", "},60000);")
function('imageFromFile',(ROOT/'scripts/voice-life-image.js').read_text().rstrip())
replace("スマホの写真を選択できます。画像は縮小してこのブラウザ内だけに保存します（最大15MBの元画像）。", "JPEG・PNG・WebPを縮小JPEGにしてこのブラウザ内だけに保存します（元画像15MiB・4000万画素以下）。")
replace("input.accept='image/*'", "input.accept='image/jpeg,image/png,image/webp'")
replace("input.onchange=async()=>{try{const old=media[key];media[key]=await imageFromFile(input.files[0],maxW,maxH);if(!persistMedia())media[key]=old;refresh()}catch(e){alert(e.message)}};", "input.onchange=async()=>{const file=input.files[0];input.value='';if(!file)return;cancelImages(key);const generation=imageEpoch[key];try{const result=await imageFromFile(file,maxW,maxH,.75,key);if(generation!==imageEpoch[key]||dead)return;media[key]=result;persistMedia();refresh()}catch(e){if(generation===imageEpoch[key]&&!dead)alert(e.message)}};")
replace("clear.onclick=()=>{media[key]='';persistMedia();refresh()}", "clear.onclick=()=>{cancelImages(key);media[key]='';persistMedia();refresh()}")
replace("const oldReset=$('reset').onclick;$('reset').onclick=()=>{if(confirm('すべての記録・画像・CPU交流記録を削除して退会しますか？')){localStorage.removeItem(MEDIA_KEY);localStorage.removeItem(SOCIAL_KEY);localStorage.removeItem(KEY);localStorage.removeItem(EXTRA);location.reload()}};", "")
replace("})();", (ROOT/'scripts/voice-life-runtime-tail.js').read_text()+"\n});")
js=(ROOT/'scripts/voice-life-defaults.js').read_text()+'\n'+js
(OUT/'app.js').write_text(js)
html=re.sub(r'<script>.*?</script>','<script src="storage.js?v=7.0-web.1" defer></script><script src="app.js?v=7.0-web.1" defer></script>',html,flags=re.S)
html=html.replace('<title>Voice Life Ver.7.0</title>', '<title>Voice Life 7.0-web.1 | ZatuPlay</title><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'self\'; style-src \'self\' \'unsafe-inline\'; img-src data: blob:; connect-src \'none\'; media-src \'none\'; object-src \'none\'; base-uri \'none\'; form-action \'none\'"><link rel="stylesheet" href="browser.css?v=7.0-web.1">')
html=html.replace('<header>', (ROOT/'scripts/voice-life-toolbar.html').read_text()+'<header>',1)
html=html.replace('毎日JSTの0時に前日の順位が確定します。報酬受け取りボタンで獲得できます。','ブラウザ版は前日の最終観測順位で計算します。0時の正確な履歴ではありません。未起動の日の順位は作成しません。')
html=html.replace('全データを削除して退会','ブラウザ版を初期化（1世代復元可）').replace('Voice Life — CPUとの架空の配信体験 / オフライン保存','Voice Life 7.0-web.1 — 架空のローカル体験 / 起動済みページは通信不要。再読込オフライン非保証')
html=html.replace('maxlength="40"','maxlength="40"')
html=html.replace('id="comment"','maxlength="300" id="comment"').replace('id="visitComment"','maxlength="300" id="visitComment"').replace('id="familyText"','maxlength="300" id="familyText"')
for name in ['storage.js','app.js','browser.css']:
 digest=hashlib.sha256((OUT/name).read_bytes()).hexdigest()[:12]
 html=html.replace(name+'?v=7.0-web.1',name+'?v=7.0-web.1-'+digest)
(OUT/'index.html').write_text(html)
print('Generated',OUT)
