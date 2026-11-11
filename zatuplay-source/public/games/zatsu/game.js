'use strict';
/* ザツワールド ～ザツ物語～ playable prototype; no third-party libraries. */
const ADDITIONAL_NAMES=`ハナまる モリまる ホシぽん クモりん ミントん ベリまる キラちゅん ユキまる ココアん ナミぽよ ツノまる メガねこ フワりん ベルまる マメぴよ クラうさ レモまる ドリまる ぼんてん リーフィ
サクラん タネぽん スミまる パンだま ソラりん カギまる モモぴよ シズくん ヒカるん ツタぽこ キノまる ぽわたん ニコりん グレまる キャンディ ルナぽん ちゃいろ おはなび コロるん ピコまる
ハニーまる ポポりん シャボん ウミネこ タンポぽ しろたま ノートん ヒヨこま ゆずぽん コハクん シェルりん ポッケまる たまごろ くるみん オーロラ ましゅる すずまる こもれび メロンち ミラーん
ベルルン ぽてまる カラりん フルるん コスモん らんたん うさぽよ ビスけ スミレん トコまる サンごろ パールん アメまる ブルる ハッぴよ ねむりん チョコる モフたん ひだまり クリまる
プラムん しおりん ミズたま ワッフる ほたぴか そよかぜ ロゼまる つきみん キャロん ふでまる ぽてちょ ほしくる ちゅるん もみじん ピカりす まりんこ やまぶき ふわもこ パステる ニジぽん
シフォン こはるん だいふく ピノりん たんぽん まつりん ハコまる フレーる こっとん しずねこ ハピまる くじらん あんずん ふきだし きらもこ ナッツん しろップ もこぴよ さざなみ えがおん`.trim().split(/\s+/);
const ORIGINAL_NAMES=['ザツ','いしころ','べび','まるひ','もく'];
const NAMES=ORIGINAL_NAMES.concat(ADDITIONAL_NAMES,EXTRA_CHARACTERS.map(c=>c.name));
const CHARACTER_COUNT=300;
if(NAMES.length!==CHARACTER_COUNT||new Set(NAMES).size!==CHARACTER_COUNT)throw Error('キャラクター登録数または名前の重複: '+NAMES.length);
const browserImage=path=>window.ZATSU_BROWSER_IMAGES[path];
const CHARACTER_IMAGES=NAMES.map((_,id)=>browserImage(`assets/characters/${String(id).padStart(3,'0')}.${id<125?'webp':'svg'}`));
const STAGE_IMAGES=[0,1,2,3].map(i=>browserImage(`assets/stages/${i}.webp`));
// Decode only the five faces used on the current board, instead of all 300 at launch.
const IMAGES=new Array(CHARACTER_COUNT);
function characterImage(id){if(!IMAGES[id]){const image=new Image();image.src=CHARACTER_IMAGES[id];IMAGES[id]=image}return IMAGES[id]}

const THEMES=['ザツタウン','ザツの森','ギフト広場','星の丘','ゆめの海','虹の街','月の庭','おかし工房','天空パーク','ザツのお城'];
const STORY=[
'ザツワールドに朝がきた！ ザツは仲間を集めて、街のにぎわいを取り戻す。',
'森の奥で、不思議な光が消えてしまった。なぞり消しの力で木々を元気にしよう。',
'プレゼント広場の箱が閉じたまま！ みんなの笑顔でお祝いを取り戻そう。',
'星の丘には、消えかけた小さな星がある。光を集めて夜空を輝かせよう。',
'ゆめの海で迷った仲間を助け、さざなみの声を取り戻そう。',
'虹の街には色が足りない。いろいろな仲間の力で虹を完成させよう。',
'月の庭は静かな夢の世界。眠る仲間たちを起こさないように進もう。',
'おかし工房の道がふさがれた！ 甘い香りと笑顔で乗り越えよう。',
'天空パークの風が強くなった。新しい仲間と力を合わせ、雲を越えよう。',
'ついにザツのお城！ 100番目のステージをクリアしてザツワールドをつなげよう。'];
const STAGE_BEATS=['はじまりの道','新しい仲間','小さな約束','ふしぎな足あと','広場での出会い','思い出を集めよう','消えた手がかり','もう一歩だけ','大切な発見','章のクライマックス'];
const BOSSES=['いしころ','クモりん','ツノまる','グレまる','ブルる','ザツお','夜のまぼろし','コスモん','きらもこ','ザツワールドのなぞ'];
const HEADER_COLORS=['#2e8fa8','#29875f','#df7c98','#5957af','#237bad','#cd9340','#7468b1','#bc6561','#599dc6','#6d4f97'];

const $=id=>document.getElementById(id);
const fmt=num=>Number(num||0).toLocaleString('ja-JP');
const esc=s=>String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const imgTag=(id,cls='',more='')=>`<img src="${CHARACTER_IMAGES[id]}" class="${cls}" alt="${esc(NAMES[id])}" ${more}>`;
const dayJST=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const STORE_KEY='zatsuworld-save-v1';
function blankState(){return {ver:1,coins:2000,hearts:3,unlocked:1,clearedStages:{},stageRewards:{},storyCatchup:[],stageStats:{},owned:{'0':{level:1,spares:0}},selectedChar:0,totalPlays:0,totalClears:0,totalWins:0,gifts:0,skillUses:0,highCombo:0,achievements:{},settings:{bgm:true,sfx:true,voice:false,lightFx:false},daily:{date:dayJST(),plays:0,clears:0,skill:0,gifts:0,claimed:[]}};}
let state=blankState(),game=null,activeScreen='title',activeTab='stages',audioCtx=null,bgmTimer=null,bgmStep=0,frameId=null,toastTimer=null;
function normalizeState(s){let base=blankState();if(!s||s.ver!==1)return base;let r={...base,...s,owned:s.owned&&typeof s.owned==='object'?s.owned:base.owned,settings:{...base.settings,...s.settings},daily:{...base.daily,...s.daily}};if(r.daily.date!==dayJST())r.daily={date:dayJST(),plays:0,clears:0,skill:0,gifts:0,claimed:[]};r.coins=Math.max(0,Number(r.coins)||0);r.hearts=Math.max(0,Number(r.hearts)||0);r.unlocked=Math.max(1,Math.min(100,Number(r.unlocked)||1));r.owned=Object.fromEntries(Object.entries(r.owned).filter(([id])=>/^\d+$/.test(id)&&Number(id)>=0&&Number(id)<CHARACTER_COUNT).map(([id,v])=>[id,{level:Math.max(1,Math.min(50,Math.floor(Number(v?.level)||1))),spares:Math.max(0,Math.min(99999,Math.floor(Number(v?.spares)||0)))}]));if(!r.owned['0'])r.owned['0']={level:1,spares:0};r.selectedChar=r.owned[String(r.selectedChar)]?Number(r.selectedChar):0;r.daily.claimed=Array.isArray(r.daily.claimed)?[...new Set(r.daily.claimed.filter(id=>MISSIONS.some(m=>m.id===id)))]:[];for(const key of ['plays','clears','skill','gifts'])r.daily[key]=Math.max(0,Math.floor(Number(r.daily[key])||0));for(const key of ['clearedStages','stageStats','achievements'])if(!r[key]||typeof r[key]!=='object'||Array.isArray(r[key]))r[key]={};r.stageRewards=Object.fromEntries(Object.entries(r.stageRewards&&typeof r.stageRewards==='object'?r.stageRewards:{}).filter(([id,v])=>/^\d+$/.test(id)&&Number(id)>=1&&Number(id)<=100&&v===true));r.storyCatchup=Array.isArray(r.storyCatchup)?[...new Set(r.storyCatchup.filter(n=>Number.isInteger(n)&&n>=1&&n<=100))]:[];r.stageStats=Object.fromEntries(Object.entries(r.stageStats).filter(([id,rec])=>rec&&typeof rec==='object'));return r;}
let dbPromise;
function save(){const packet={...state,updatedAt:Date.now()};try{localStorage.setItem(STORE_KEY,JSON.stringify(packet));}catch(e){toast('保存できません。ブラウザの空き容量を確認してちょー。');}openDb().then(db=>{if(!db)return;try{const tx=db.transaction('saves','readwrite');tx.objectStore('saves').put(packet,'main')}catch(e){console.warn('IndexedDB書き込み失敗',e)}});}
function toast(msg){let t=document.querySelector('.toast');if(!t){t=document.createElement('div');t.className='toast';document.body.appendChild(t)}t.textContent=msg;t.classList.remove('hidden');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.add('hidden'),2900);}
function showModal(title,body,actions=[{text:'閉じる',action:closeModal,style:'outline'}]){$('modalTitle').textContent=title;$('modalBody').innerHTML=body;$('modalActions').innerHTML='';actions.forEach(a=>{let b=document.createElement('button');b.className=a.style==='outline'?'btn-outline':'btn-primary';b.textContent=a.text;b.addEventListener('click',a.action);$('modalActions').appendChild(b)});$('modal').classList.remove('hidden');}
function closeModal(){$('modal').classList.add('hidden');}
function showScreen(screen){resetBoardInput();closeModal();activeScreen=screen;document.body.classList.toggle('is-playing',screen==='game');document.querySelectorAll('.screen').forEach(el=>el.classList.toggle('active',el.id===`screen-${screen}`));if(screen==='select')renderSelect();window.scrollTo(0,0);updateHUD();}
function updateHUD(){$('coinLabel').textContent=fmt(state.coins);$('heartLabel').textContent=fmt(state.hearts);$('soundBtn').textContent=state.settings.bgm||state.settings.sfx?'🔊':'🔇';}
function setTab(tab){if(!['stages','characters','gift','missions','ranking','story','more'].includes(tab))tab='stages';activeTab=tab;document.querySelectorAll('.tab').forEach(n=>n.classList.toggle('active',n.dataset.tab===tab));document.querySelectorAll('.tab-panel').forEach(n=>n.classList.toggle('active',n.id===`panel-${tab}`));if(tab==='stages')renderStages();if(tab==='characters')renderCharacters();if(tab==='gift')renderGift();if(tab==='missions')renderMissions();if(tab==='ranking')renderRecords();if(tab==='more')renderMore();if(tab==='story')renderStoryBook();}
function renderSelect(){updateHUD();setTab(activeTab);$('clearCount').textContent=`${Object.keys(state.clearedStages).length} / 100 クリア`;}
function stageTheme(s){return THEMES[Math.min(9,Math.floor((s-1)/10))]}
function stageLevel(s){return Math.min(10,Math.floor((s-1)/10)+1)}
function stageCfg(s){const chapter=stageLevel(s),palette=[state.selectedChar];for(let n=0;palette.length<5;n++){const id=n<4?n+1:(s*11+n*7)%CHARACTER_COUNT;if(!palette.includes(id))palette.push(id)}return {theme:stageTheme(s),chapter,blocks:Math.min(5,Math.max(0,chapter-4)),palette};}
function renderStages(){
 let html='';
 for(let chapter=1;chapter<=10;chapter++){
   html+=`<section class="stage-chapter"><div class="chapter-head"><div><small>CHAPTER ${chapter}</small><h3>${THEMES[chapter-1]} · ${esc(STORY_CHAPTERS[chapter-1].title)}</h3><p>${esc(STORY_CHAPTERS[chapter-1].summary)}</p></div><div class="chapter-thumb" style="background-image:url('${STAGE_IMAGES[(chapter-1)%4]}')"></div></div><div class="stage-grid">`;
   for(let s=(chapter-1)*10+1;s<=chapter*10;s++){
     let won=!!state.clearedStages[s],open=s<=state.unlocked,stars=won?'🏅':open?'▶':'🔒',rec=state.stageStats[s];
     html+=`<button class="stage ${won?'cleared':open?'open':'locked'}" data-stage="${s}" title="${stageTheme(s)} STAGE ${s}" ${open?'':'disabled'}>${s}<small>${stars} ${rec?rec.bestClears+'個':''}</small></button>`;
   }
   html+='</div></section>';
 }
 $('storyCatchupNotice').innerHTML=state.storyCatchup.length?`<div class="story-notice"><strong>これまでの冒険の贈り物</strong><p>クリア済みの${state.storyCatchup.length}ステージ分の仲間を受け取りました。所持済みの仲間は合成素材になっています。</p><button class="btn-outline" id="catchupDismiss">確認した</button></div>`:'';if($('catchupDismiss'))$('catchupDismiss').onclick=()=>{state.storyCatchup=[];save();renderStages()};
 $('stageGrid').innerHTML=html;
 $('stageGrid').querySelectorAll('[data-stage]:not(:disabled)').forEach(b=>b.onclick=()=>stageBrief(Number(b.dataset.stage)));
}
function stageBrief(s){
 if(!Number.isInteger(s)||s<1||s>state.unlocked)return;
 const cfg=stageCfg(s),rec=state.stageStats[s];
 stageCfg(s).palette.forEach(characterImage);
 showModal(`STAGE ${s}｜${episode(s).title}`,`${storyScene(s,false)}${rewardPreview(s)}<p>⏱️ 制限60秒 · 1001人中500位以内でクリア<br>チャプター${cfg.chapter} · おじゃま岩 ${cfg.blocks}個</p>${rec?`<p>自己ベスト ${rec.bestClears}個／${rec.bestRank}位</p>`:''}`,[{text:'▶ このお話を進める',action:()=>{closeModal();startGame(s)}},{text:'閉じる',style:'outline',action:closeModal}]);
}
function renderCharacters(){
 const query=($('characterSearch').value||'').trim().toLocaleLowerCase('ja'),group=$('characterGroup').value||'all';
 const entries=NAMES.map((name,id)=>({name,id,extra:id>=125?EXTRA_CHARACTERS[id-125]:null})).filter(c=>(!query||(c.name+' '+(c.extra?.species||'')).toLocaleLowerCase('ja').includes(query))&&(group==='all'||group==='original'&&c.id<125||c.extra?.group===group));
 $('ownedCount').textContent=`${Object.keys(state.owned).length} / ${CHARACTER_COUNT}体`;
 $('characterMatchCount').textContent=`表示 ${entries.length}体`;
 $('characterGrid').innerHTML=entries.length?entries.map(({name,id})=>{const char=state.owned[String(id)],own=!!char;return `<button class="character ${own?'owned':''}" data-char="${id}" title="${esc(name)}">${imgTag(id,'','loading="lazy"')}<b>${esc(name)}</b><span>${own?'Lv.'+char.level+(id===state.selectedChar?' ★':''):'？？？'}</span>${own&&char.spares?`<span class="count">+${char.spares}</span>`:''}</button>`}).join(''):'<p class="small-note">その名前の仲間は見つかりません。検索を短くしてみてね。</p>';
 $('characterGrid').querySelectorAll('[data-char]').forEach(b=>b.onclick=()=>characterModal(Number(b.dataset.char)));
}
const MISSIONS=[{id:'play',name:'パズルを1回プレイする',target:1,field:'plays',type:'coins',reward:150},{id:'pop',name:'今日、合計100個消す',target:100,field:'clears',type:'coins',reward:200},{id:'skill',name:'スキルを1回発動する',target:1,field:'skill',type:'hearts',reward:1},{id:'gift',name:'プレゼントを1個開ける',target:1,field:'gifts',type:'coins',reward:250}];
function ensureDaily(){if(state.daily.date!==dayJST()){state.daily={date:dayJST(),plays:0,clears:0,skill:0,gifts:0,claimed:[]};save();}}
function renderMissions(){ensureDaily();$('missionDate').textContent=state.daily.date;let html='';for(let m of MISSIONS){const n=state.daily[m.field]||0,done=n>=m.target,claimed=state.daily.claimed.includes(m.id);html+=`<div class="mission ${done?'done':''}"><div><strong>${done?'✅':'⭐'} ${m.name}</strong><small>進行 ${Math.min(n,m.target)} / ${m.target}　｜　${m.type==='coins'?'🪙':'💗'} ${m.reward}</small></div><button data-claim="${m.id}" ${!done||claimed?'disabled':''}>${claimed?'受取済':done?'受け取る':'未達成'}</button></div>`;}$('missionList').innerHTML=html;$('missionList').querySelectorAll('[data-claim]').forEach(b=>b.onclick=()=>claimMission(b.dataset.claim));}
function claimMission(id){ensureDaily();const m=MISSIONS.find(x=>x.id===id);if(!m||state.daily.claimed.includes(id)||(state.daily[m.field]||0)<m.target)return;state.daily.claimed.push(id);if(m.type==='coins')state.coins+=m.reward;else state.hearts+=m.reward;save();sound('level');renderMissions();updateHUD();toast('ミッション報酬を受け取ったでよ！');}
function renderRecords(){let list=Object.entries(state.stageStats).map(([s,rec])=>({s:Number(s),...rec})).sort((a,b)=>a.s-b.s);$('recordList').innerHTML=list.length?list.map(r=>`<div class="record"><b>STAGE ${r.s}　${esc(stageTheme(r.s))}</b><span>最高 ${r.bestClears}個・${r.bestRank}位</span></div>`).join(''):'<p class="small-note">まだ記録がないでね。ステージに挑戦してみよう！</p>';}
const ACHIEVEMENTS=[['first','はじめてのパズル',s=>s.totalPlays>=1],['winner','最初の勝利',s=>s.totalWins>=1],['ten','10ステージクリア',s=>Object.keys(s.clearedStages).length>=10],['hun','100ステージ制覇',s=>Object.keys(s.clearedStages).length>=100],['pops','累計1000個消去',s=>s.totalClears>=1000],['gifts','プレゼント10個',s=>s.gifts>=10],['friends','仲間20種類',s=>Object.keys(s.owned).length>=20],['max','Lv.50の仲間',s=>Object.values(s.owned).some(x=>x.level>=50)]];
function renderMore(){$('achievementList').innerHTML=ACHIEVEMENTS.map(([id,name,test])=>`<div class="achievement ${test(state)?'earned':''}"><b>${test(state)?'🏅':'🔒'} ${name}</b><small>${test(state)?'達成！':'まだ未達成'}</small></div>`).join('');$('bgmToggle').checked=state.settings.bgm;$('sfxToggle').checked=state.settings.sfx;$('voiceToggle').checked=state.settings.voice;$('lightFxToggle').checked=!!state.settings.lightFx;}
// A seeded CPU roster ensures stage difficulties do not fluctuate between attempts.
function seeded(seed){let a=seed>>>0;return ()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
const cpuCache=new Map();function cpuRoster(stage){if(cpuCache.has(stage))return cpuCache.get(stage);let random=seeded(stage*43211+4105),r=[];for(let i=0;i<1000;i++){let n=Math.floor(7+stage*.65+random()*85),sc=n*(100+Math.floor(random()*75))+Math.floor(random()*200);r.push({id:i+1,name:i===0&&stage%10===0?`BOSS ${BOSSES[Math.floor((stage-1)/10)]}`:`CPU-${String(i+1).padStart(4,'0')}`,clears:n,score:sc})}cpuCache.set(stage,r);for(const key of ['clearedStages','stageStats','achievements'])if(!r[key]||typeof r[key]!=='object'||Array.isArray(r[key]))r[key]={};r.stageStats=Object.fromEntries(Object.entries(r.stageStats).filter(([id,rec])=>rec&&typeof rec==='object'));return r;}
function playerRank(stage,clears,score){return 1+cpuRoster(stage).filter(p=>p.clears>clears||(p.clears===clears&&p.score>score)).length;}

// 300 distinct shape/affinity pairs: 25 patterns x 12 bonus effects.
const SHAPES=[
 ['にじのリボン','横に走るリボンで中央を消去','ribbon'],
 ['ほしのシャワー','縦に降る流星で消去','meteor'],
 ['まんまる花火','中央のまるい範囲を消去','firework'],
 ['ふたごのひかり','左右2か所を同時に消去','twin'],
 ['なかまの合図','いちばん多い顔をまとめて消去','friends'],
 ['きらめき十字','十字の光で消去','cross'],
 ['ダブルウェーブ','上下2本の波で消去','wave'],
 ['ハートの贈り物','大きなハートの形に消去','heart'],
 ['ぐるぐる銀河','渦巻きの通り道を消去','spiral'],
 ['サンダージグザグ','稲妻の通り道を消去','lightning'],
 ['お花のワルツ','花びら形の5か所を消去','flower'],
 ['三日月セレナーデ','三日月の輪郭を消去','moon'],
 ['はばたく蝶','蝶の羽の形に消去','butterfly'],
 ['スターダスト','5つの星の先から消去','star'],
 ['くるりんリング','輪っか状の範囲を消去','ring'],
 ['クロスステップ','斜めのX字に消去','x'],
 ['ダイヤモンド','ひし形の範囲を消去','diamond'],
 ['ぱちぱちバブル','3つの泡の範囲を消去','bubble'],
 ['風のカーテン','左右の端から消去','curtain'],
 ['ふんわり虹','虹のアーチに沿って消去','rainbow'],
 ['ふたつの流星','斜め2本の流星で消去','comet'],
 ['リーフダンス','3枚の葉の形に消去','leaf'],
 ['ゆめの噴水','噴水の放物線に沿って消去','fountain'],
 ['ふしぎな万華鏡','6方向の光で消去','prism'],
 ['スマイルパレード','目と口のスマイル形に消去','smile']
];
const AFFINITIES=[
 {name:'きらり',color:'#ffcc66',second:'消去スコア1.8倍',kind:'score',glyph:'star'},
 {name:'こおり',color:'#78e8ff',second:'時計を3秒ストップ',kind:'freeze',glyph:'snow'},
 {name:'はなびら',color:'#ff8dc9',second:'残った4個をマイキャラに変える',kind:'bloom',glyph:'petal'},
 {name:'おたから',color:'#b2ee93',second:'プレイ報酬に30コイン追加',kind:'coins',glyph:'coin'},
 {name:'まほう',color:'#ba9aff',second:'追加ボムを1個つくる',kind:'bomb',glyph:'diamond'},
 {name:'もりの',color:'#9cdf8c',second:'フィーバーを35%ためる（発動中なら2秒延長・最大12秒）',kind:'fever',glyph:'petal'},
 {name:'ほしとき',color:'#e0b8ff',second:'残り時間を2秒追加（最大90秒）',kind:'time',glyph:'star'},
 {name:'ゆきかぜ',color:'#9ae8fa',second:'追加で下の方の8個を消す',kind:'sweep',glyph:'snow'},
 {name:'おかし',color:'#ffc8a7',second:'コンボ数を3つ増やす',kind:'combo',glyph:'coin'},
 {name:'うみの',color:'#78e1d7',second:'消去範囲が広い（最多色の技は別の顔も最大4個追加）',kind:'wide',glyph:'diamond'},
 {name:'はなつぎ',color:'#ffadd4',second:'次の技ゲージを25%ためる',kind:'recharge',glyph:'petal'},
 {name:'ほうせき',color:'#ffe28a',second:'時計を1.5秒止めてボムを1個つくる',kind:'frostbomb',glyph:'diamond'}
];
const SKILL_BOOK=NAMES.map((name,id)=>{
 const shape=id%25, affinity=Math.floor(id/25),a=AFFINITIES[affinity],s=SHAPES[shape];
 return {id,shape,affinity,name:`${name}の${a.name}${s[0]}`,short:`${a.name}${s[0]}`,description:`${s[1]}。${a.second}。`,color:a.color,glyph:a.glyph,visual:s[2],cost:Math.round(23+(shape%5)),signature:`${s[2]}:${a.kind}`};
});
const TYPE_COLORS=['#ffb9cc','#b9ceff','#ffdd83','#9ce5d7','#d3b9fa'];
function skillOf(id){return SKILL_BOOK[id]||SKILL_BOOK[0]}
const skillPathCache=new Map();
function skillPaths(s){
 const cacheKey=s.shape+':'+s.affinity;if(skillPathCache.has(cacheKey))return skillPathCache.get(cacheKey);
 const x=280+(s.affinity%5-2)*9,y=337+(s.affinity%5-2)*5,paths=[];
 const line=(a,b)=>paths.push([a,b]);
 const curve=(fn,n=90)=>paths.push(Array.from({length:n+1},(_,i)=>fn(i/n)));
 const circle=(cx,cy,r)=>curve(t=>({x:cx+r*Math.cos(t*Math.PI*2),y:cy+r*Math.sin(t*Math.PI*2)}));
 switch(s.shape){
 case 0:line({x:26,y},{x:534,y});break;
 case 1:line({x,y:55},{x,y:604});break;
 case 2:circle(x,y,48);break;
 case 3:circle(145,y,40);circle(415,y,40);break;
 case 4:break;
 case 5:line({x:25,y},{x:535,y});line({x,y:50},{x,y:605});break;
 case 6:for(const cy of [220,460])curve(t=>({x:25+t*510,y:cy+28*Math.sin(t*Math.PI*2)}));break;
 case 7:curve(t=>{const a=t*Math.PI*2;return{x:x+10*16*Math.pow(Math.sin(a),3),y:y-10*(13*Math.cos(a)-5*Math.cos(2*a)-2*Math.cos(3*a)-Math.cos(4*a))}});break;
 case 8:curve(t=>({x:x+(30+175*t)*Math.cos(t*Math.PI*4),y:y+(30+175*t)*Math.sin(t*Math.PI*4)}));break;
 case 9:paths.push([{x:340,y:70},{x:160,y:310},{x:370,y:290},{x:210,y:590}]);break;
 case 10:for(let j=0;j<5;j++){let a=j*Math.PI*2/5;circle(x+130*Math.cos(a),y+130*Math.sin(a),26)}break;
 case 11:curve(t=>({x:x-65+150*Math.cos((t-.5)*Math.PI*1.55),y:y+190*Math.sin((t-.5)*Math.PI*1.55)}));break;
 case 12:curve(t=>{let a=t*Math.PI*2;return{x:x+175*Math.sin(a),y:y+130*Math.sin(a*2)}});break;
 case 13:for(let j=0;j<5;j++){let a=-Math.PI/2+j*Math.PI*2/5,b=a+Math.PI*4/5;line({x:x+190*Math.cos(a),y:y+190*Math.sin(a)},{x:x+190*Math.cos(b),y:y+190*Math.sin(b)})}break;
 case 14:circle(x,y,160);break;
 case 15:line({x:90,y:150},{x:470,y:540});line({x:470,y:150},{x:90,y:540});break;
 case 16:paths.push([{x,y:y-180},{x:x+180,y},{x,y:y+180},{x:x-180,y},{x,y:y-180}]);break;
 case 17:circle(150,230,30);circle(400,300,35);circle(260,480,40);break;
 case 18:line({x:100,y:95},{x:100,y:595});line({x:460,y:95},{x:460,y:595});break;
 case 19:curve(t=>({x:x+210*Math.cos(Math.PI+t*Math.PI),y:y+80+235*Math.sin(Math.PI+t*Math.PI)}));break;
 case 20:line({x:50,y:300},{x:380,y:70});line({x:180,y:595},{x:510,y:365});break;
 case 21:for(let j=0;j<3;j++)curve(t=>{let a=t*Math.PI*2,r=80*Math.sin(t*Math.PI);return{x:x+(r*Math.cos(a)+100)*Math.cos(j*2.094)-(r*Math.sin(a))*Math.sin(j*2.094),y:y+(r*Math.cos(a)+100)*Math.sin(j*2.094)+(r*Math.sin(a))*Math.cos(j*2.094)}});break;
 case 22:for(let j=-1;j<=1;j++)curve(t=>({x:x+j*220*t,y:565-1100*t+1080*t*t}));break;
 case 23:for(let j=0;j<6;j++){let a=j*Math.PI/3;line({x,y},{x:x+230*Math.cos(a),y:y+230*Math.sin(a)})}break;
 case 24:circle(180,240,20);circle(380,240,20);curve(t=>({x:280+155*Math.cos(t*Math.PI),y:340+155*Math.sin(t*Math.PI)}));break;
 }
 skillPathCache.set(cacheKey,paths);return paths;
}
function segmentDistance(p,a,b){const vx=b.x-a.x,vy=b.y-a.y,l=vx*vx+vy*vy,t=l?Math.max(0,Math.min(1,((p.x-a.x)*vx+(p.y-a.y)*vy)/l)):0;return Math.hypot(p.x-a.x-t*vx,p.y-a.y-t*vy)}
function skillTargets(skill,board,level=1){
 const live=board.filter(p=>p.kind>=0&&!p.bomb),paths=skillPaths(skill);
 if(skill.shape===4){const counts={};live.forEach(p=>counts[p.kind]=(counts[p.kind]||0)+1);const kind=Number(Object.keys(counts).sort((a,b)=>counts[b]-counts[a])[0]);const matching=live.filter(p=>p.kind===kind);if(skill.affinity===9)matching.push(...live.filter(p=>p.kind!==kind).sort((a,b)=>b.y-a.y).slice(0,4));return matching.map(p=>p.id)}
 const width=(skill.shape===2?92:skill.shape===3?65:skill.shape===17?54:29)+Math.min(16,(level-1)*.45)+(skill.affinity===9?18:0);
 // Evaluate each tile/segment once; reuse distances when selecting the fallback seven.
 const distances=new Map();
 for(const p of live){let nearest=Infinity;for(const points of paths)for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],vx=b.x-a.x,vy=b.y-a.y,l=vx*vx+vy*vy;
  const t=l?Math.max(0,Math.min(1,((p.x-a.x)*vx+(p.y-a.y)*vy)/l)):0;
  const dx=p.x-a.x-t*vx,dy=p.y-a.y-t*vy;nearest=Math.min(nearest,dx*dx+dy*dy);
 }distances.set(p.id,nearest)}
 let chosen=live.filter(p=>distances.get(p.id)<width*width);
 // No character has an empty skill even when the top of the bowl is unfilled.
 if(chosen.length<7)chosen=[...live].sort((a,b)=>distances.get(a.id)-distances.get(b.id)).slice(0,7);
 return chosen.map(p=>p.id);
}

function characterModal(id){const profile=id>=125?`<p class="character-profile">${esc(EXTRA_CHARACTERS[id-125].profile)}</p>`:'';const info=state.owned[String(id)],s=skillOf(id);if(!info){showModal(`${NAMES[id]}の技`,`${imgTag(id)}${profile}<h4>${esc(s.short)}</h4><p>${esc(s.description)}</p><p>${id>=1&&id<=100?'ステージ'+id+'の初回クリア、またはプレゼントで出会えます。':'プレゼントで出会える仲間です。'}</p>`);return}const level=info.level,spares=info.spares;showModal(NAMES[id],`${imgTag(id)}${profile}<div class="modal-stat">Lv.${level} / 50 · 合成素材 ${spares}体</div><h4>${esc(s.short)}</h4><p>${esc(s.description)}</p><p>同じ仲間を消すと技が早くたまります。<br>Lv.UPで消去範囲とスコアが成長。</p>`,[{text:id===state.selectedChar?'セット済み ✓':'この仲間であそぶ',action:()=>{state.selectedChar=id;save();closeModal();renderCharacters()}},{text:'合成してLv.UP',style:'outline',action:()=>{if(level>=50||spares<1){toast(level>=50?'最大レベルです':'同じ仲間の合成素材が必要です');return}info.level++;info.spares--;sound('level');save();characterModal(id);renderCharacters()}},{text:'閉じる',style:'outline',action:closeModal}])}
let giftTimers=[],giftBusy=false;
function renderGift(){$('giftCoins').textContent=fmt(state.coins);$('giftOwned').textContent=Object.keys(state.owned).length;$('openGiftBtn').disabled=state.coins<1000||giftBusy}
function rollCharacter(){const unowned=NAMES.map((_,i)=>i).filter(i=>!state.owned[String(i)]);if(unowned.length&&Math.random()<.55)return unowned[Math.floor(Math.random()*unowned.length)];return Math.floor(Math.random()*CHARACTER_COUNT)}
function clearGiftTimers(){giftTimers.forEach(clearTimeout);giftTimers=[]}
function giftAfter(fn,ms){giftTimers.push(setTimeout(fn,ms))}
function openGift(){if(giftBusy)return;ensureDaily();if(state.coins<1000){toast('あと少し！ プレイやミッションでコインを集めよう。');return}const id=rollCharacter(),old=!!state.owned[String(id)];state.coins-=1000;state.gifts++;state.daily.gifts++;if(old)state.owned[String(id)].spares++;else state.owned[String(id)]={level:1,spares:0};state.pendingGift={id,old};save();animateGift(state.pendingGift)}
function animateGift(g){giftBusy=true;clearGiftTimers();const el=$('giftOverlay');el.className='gift-overlay';el.setAttribute('aria-hidden','false');$('giftSkip').classList.remove('hidden');$('giftContinue').classList.add('hidden');$('giftResult').classList.remove('visible');$('giftResult').innerHTML=`<span class="gift-label">${g.old?'LEVEL UP MATERIAL':'NEW FRIEND'}</span>${imgTag(g.id)}<h2>${esc(NAMES[g.id])}</h2><p>${g.old?'合成素材が1体増えました':'新しい仲間がやってきた！'}</p><strong>${esc(skillOf(g.id).short)}</strong><p>${esc(skillOf(g.id).description)}</p>`;$('giftPrompt').textContent='どんな仲間が入っているかな？';$('giftConfetti').innerHTML=Array.from({length:state.settings.lightFx?18:50},(_,i)=>`<i style="--x:${(i*71)%100}%;--d:${(i%9)*.07}s;--r:${i*53}deg;--c:${['#ffb3ce','#ffe09a','#abf0db','#c9afff','#fff'][i%5]}"></i>`).join('');renderGift();updateHUD();$('giftSkip').focus();sound('gift');giftAfter(()=>el.classList.add('shaking'),60);giftAfter(()=>{el.classList.add('opening');$('giftPrompt').textContent='ひらけ、わくわく！';sound('level')},reducedMotion?120:1150);giftAfter(revealGift,reducedMotion?220:2000)}
function revealGift(){if(!giftBusy)return;clearGiftTimers();$('giftOverlay').classList.add('opening','revealed');$('giftResult').classList.add('visible');$('giftSkip').classList.add('hidden');$('giftContinue').classList.remove('hidden');$('giftPrompt').textContent='あなたの仲間が、またひとり。';$('giftContinue').focus();sound('win')}
function closeGift(){if(!giftBusy)return;clearGiftTimers();const gift=state.pendingGift;if(gift){$('giftMessage').innerHTML=`${imgTag(gift.id)}<b>${esc(NAMES[gift.id])} が仲間に！</b><p>${esc(skillOf(gift.id).description)}</p>`;delete state.pendingGift;save()}giftBusy=false;$('giftOverlay').className='gift-overlay hidden';$('giftOverlay').setAttribute('aria-hidden','true');renderGift();updateHUD();$('openGiftBtn').focus()}
function showHelp(){showModal('つなげて、はじける！','<div class="help-steps"><p><b>① 同じ顔を3個以上</b><br>指でなぞって離すと消えます。隣同士を順番にタップしてもOK。</p><p><b>② 7個つなぐとボム</b><br>星マークの紫のボムをタップ。近くの仲間をまとめて消します。</p><p><b>③ 仲間だけのスペシャル技</b><br>ゲージが光ったら発動！ 技の演出中は時計が止まります。</p><p><b>④ FEVERでスコア3倍</b><br>たくさん消すと8秒のフィーバー。困ったら右下のシャッフル。</p><p><b>⑤ クリアで仲間に出会う</b><br>各ステージの初回クリアで決まった仲間を1体入手。所持済みは合成素材 +1。物語手帳でお話を読み返せます。</p></div>')}

const W=560,H=640,RADIUS=36,TARGET_COUNT=59;
const canvas=$('board'),ctx=canvas.getContext('2d',{alpha:false});
let tileSequence=0,dragging=false,swipeMoved=false,lastPointerCell=-1,lastPoint=null,activePointer=null;
// Older Android WebViews can lack CanvasRenderingContext2D.roundRect.
if(!ctx.roundRect)ctx.roundRect=function(x,y,w,h,r){r=Math.min(Number(r)||0,w/2,h/2);this.moveTo(x+r,y);this.arcTo(x+w,y,x+w,y+h,r);this.arcTo(x+w,y+h,x,y+h,r);this.arcTo(x,y+h,x,y,r);this.arcTo(x,y,x+w,y,r);this.closePath();return this};
const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const byId=id=>game?.board.find(p=>p.id===id);
function randomTile(){return game.cfg.palette[Math.floor(Math.random()*game.cfg.palette.length)]}
function makeTile(kind,x,y){return{id:++tileSequence,kind,x,y,vx:0,vy:0,r:RADIUS,angle:0,spin:(Math.random()-.5)*.15,born:game?.clock||0,bomb:false}}
function newBoard(){const b=[];for(let i=0;i<TARGET_COUNT;i++){let row=Math.floor(i/7),col=i%7;b.push(makeTile(randomTile(),46+col*76+(row%2)*12,592-row*65));}return b}
function adjacent(a,b){const p=byId(a),q=byId(b);return !!p&&!!q&&Math.hypot(p.x-q.x,p.y-q.y)<91}
function findChain(board=game?.board){if(!board)return null;const live=board.filter(p=>p.kind>=0&&!p.bomb&&p.y>20);for(const p of live){let ns=live.filter(q=>q!==p&&q.kind===p.kind&&Math.hypot(q.x-p.x,q.y-p.y)<91);for(const q of ns){let r=live.find(r=>r!==p&&r!==q&&r.kind===p.kind&&Math.hypot(r.x-q.x,r.y-q.y)<91);if(r)return[p.id,q.id,r.id]}}return null}
function findMove(){return !!findChain()}
function ensureMove(){if(findChain()||game.path.length||game.busy>0)return;const live=game.board.filter(p=>p.kind>=0&&!p.bomb&&p.y>25);for(const p of live){const close=live.filter(q=>q!==p).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y));if(close.length>1&&Math.hypot(close[1].x-p.x,close[1].y-p.y)<91){p.kind=close[0].kind=close[1].kind=game.cfg.palette[0];floatText(p.x,p.y,'つながるチャンス','#c8fff4',.9);return}}}
function refillBoard(){let n=TARGET_COUNT-game.board.length;for(let i=0;i<n;i++){let p=makeTile(randomTile(),46+(i%7)*76,-50-Math.floor(i/7)*76);p.vy=80;game.board.push(p)}}
function shuffleBoard(manual=false){if(!game||game.paused||game.finished||game.busy>0||game.shuffleCool>0&&manual)return;game.path=[];dragging=false;game.board.forEach(p=>{p.vx=(Math.random()-.5)*420;p.vy=-160-Math.random()*220;if(!p.bomb&&p.kind>=0)p.kind=randomTile()});game.shuffleCool=manual?4:0;floatText(280,260,'くるりんシャッフル','#d4f9ff',1);sound('connect')}
function startGame(stage){
 if(stage<1||stage>state.unlocked)return;
 resetBoardInput();closeModal();
 if(frameId!==null){cancelAnimationFrame(frameId);frameId=null}
 game={stage,cfg:stageCfg(stage),board:[],time:60,clock:0,clears:0,score:0,combo:0,maxCombo:0,skillGauge:0,skillUsed:0,path:[],particles:[],rings:[],ghosts:[],texts:[],paused:false,finished:false,lastFrame:performance.now(),selected:state.selectedChar,fever:0,feverTime:0,freeze:0,busy:0,cast:null,bonusCoins:0,shuffleCool:0,lastClear:-100,hintTimer:0,checkTimer:0,popSerial:0};
 spriteCache.clear();uiCache.clear();game.cfg.palette.forEach(characterImage);
 game.board=newBoard();for(let n=0;n<95;n++)physics(1/60);for(let i=0;i<game.cfg.blocks;i++){const p=game.board[8+i*6];if(p)p.kind=-1}ensureMove();
 $('gameStageName').textContent=`STAGE ${stage} · ${stageTheme(stage)}`;$('gameDifficulty').textContent=`CHAPTER ${game.cfg.chapter}`;
 document.querySelector('.game-header').style.background='';$('selectedCharBadge').innerHTML=`${imgTag(game.selected)}<small>${esc(NAMES[game.selected])}</small>`;
 $('skillName').textContent=skillOf(game.selected).short;$('skillBtn').title=skillOf(game.selected).description;
 $('boardBadge').classList.remove('show');document.body.classList.add('is-playing');showScreen('game');syncGameUI();
 if(frameId)cancelAnimationFrame(frameId);frameId=requestAnimationFrame(frame);if(state.settings.bgm)startMusic();
}
// Cache DOM values and rank inputs; the countdown only changes ten times a second.
const uiCache=new Map();
function uiText(id,value){if(uiCache.get(id)!==value){$(id).textContent=value;uiCache.set(id,value)}}
function uiWidth(id,value){const key=id+':width';if(uiCache.get(key)!==value){$(id).style.width=value;uiCache.set(key,value)}}
function uiToggle(id,name,on){const key=id+':'+name;if(uiCache.get(key)!==on){$(id).classList.toggle(name,on);uiCache.set(key,on)}}
function uiDisabled(id,on){const key=id+':disabled';if(uiCache.get(key)!==on){$(id).disabled=on;uiCache.set(key,on)}}
function syncGameUI(){
 if(!game)return;
 uiText('timerLabel',game.time.toFixed(1));uiToggle('timerLabel','urgent',game.time<=10);
 uiText('clearedLabel',fmt(game.clears));uiText('scoreLabel',fmt(game.score));uiText('comboLabel',`${game.combo} COMBO`);
 const rankKey=`${game.stage}:${game.clears}:${game.score}`;
 if(uiCache.get('rankKey')!==rankKey){uiText('rankingEstimate',`暫定 ${playerRank(game.stage,game.clears,game.score)}位 / 1001人`);uiCache.set('rankKey',rankKey)}
 uiText('skillGauge',game.skillGauge>=100?'発動！':`${Math.floor(game.skillGauge)}%`);uiWidth('gaugeFill',`${Math.round(game.skillGauge)}%`);
 uiDisabled('skillBtn',game.skillGauge<100||game.paused||game.busy>0);uiToggle('skillBtn','ready',game.skillGauge>=100);
 uiWidth('feverFill',`${Math.round(game.feverTime>0?Math.min(100,game.feverTime/8*100):game.fever)}%`);
 uiText('feverLabel',game.feverTime>0?`FEVER ×3 · ${game.feverTime.toFixed(1)}秒`:game.freeze>0?`時計ストップ · ${game.freeze.toFixed(1)}秒`:'FEVER');
 uiDisabled('shuffleBtn',game.shuffleCool>0||game.paused||game.busy>0);
}
function physics(dt){
 if(!game||dt<=0)return;
 const held=new Set(game.path),steps=Math.max(1,Math.ceil(dt*120-1e-7)),h=dt/steps,drag=Math.exp(-2.6*h);
 for(let s=0;s<steps;s++){
  for(const p of game.board){if(held.has(p.id))continue;p.vy=Math.min(650,p.vy+1200*h);p.vx*=drag;p.x+=p.vx*h;p.y+=p.vy*h;p.angle+=p.spin*h;}
  for(let iter=0;iter<4;iter++){
   for(const p of game.board){const inset=p.y>530?Math.pow((p.y-530)/100,2)*25:0,lo=RADIUS+8+inset,hi=W-lo;if(p.x<lo){p.x=lo;p.vx=Math.abs(p.vx)*.22}if(p.x>hi){p.x=hi;p.vx=-Math.abs(p.vx)*.22}const bottom=H-RADIUS-12;if(p.y>bottom){p.y=bottom;p.vy=-Math.abs(p.vy)*.12;p.vx*=.9}}
   for(let i=0;i<game.board.length;i++)for(let j=i+1;j<game.board.length;j++){
    const a=game.board[i],b=game.board[j];let dx=b.x-a.x,dy=b.y-a.y,min=a.r+b.r-1;const d2=dx*dx+dy*dy;if(d2>=min*min)continue;let d=Math.sqrt(d2);if(d<.01){dx=.1;dy=1;d=Math.sqrt(dx*dx+dy*dy)}const nx=dx/d,ny=dy/d,over=min-d,ha=held.has(a.id),hb=held.has(b.id);if(ha&&hb)continue;
    const wa=ha?0:hb?1:.5,wb=hb?0:ha?1:.5;a.x-=nx*over*wa;a.y-=ny*over*wa;b.x+=nx*over*wb;b.y+=ny*over*wb;
    const rv=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;if(rv<0){let force=-rv*.68;a.vx-=nx*force*wa;a.vy-=ny*force*wa;b.vx+=nx*force*wb;b.vy+=ny*force*wb}
   }
  }
 }
}
function burst(x,y,color,count=15,glyph='star'){const cap=state.settings.lightFx?180:game.fxReduced?280:650,limit=state.settings.lightFx?Math.min(5,count):count;for(let i=0;i<limit&&game.particles.length<cap;i++){const a=Math.random()*Math.PI*2,v=60+Math.random()*220;game.particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-60,age:0,life:.45+Math.random()*.6,size:3+Math.random()*7,color,glyph,rot:Math.random()*6})}game.rings.push({x,y,r:12,age:0,life:.5,color})}
function floatText(x,y,text,color='#fff',life=1){game.texts.push({x,y,text,color,age:0,life})}
function erase(ids,viaSkill=false,options={}){
 if(!game||game.finished||game.paused)return 0;
 const set=new Set(ids),chosen=game.board.filter(p=>set.has(p.id)&&p.kind>=0&&!p.bomb);if(chosen.length<(viaSkill||options.bomb?1:3))return 0;
 const s=skillOf(game.selected),avg={x:chosen.reduce((a,p)=>a+p.x,0)/chosen.length,y:chosen.reduce((a,p)=>a+p.y,0)/chosen.length};
 chosen.forEach((p,i)=>{const color=viaSkill?s.color:TYPE_COLORS[game.cfg.palette.indexOf(p.kind)%5]||'#fff';burst(p.x,p.y,color,viaSkill?16:11,viaSkill?s.glyph:'star');game.ghosts.push({...p,age:0,life:.35,color});});
 game.board=game.board.filter(p=>!chosen.includes(p));game.path=[];game.clears+=chosen.length;
 const normal=!viaSkill&&!options.bomb;if(normal){game.combo=game.clock-game.lastClear<4?game.combo+1:1;game.maxCombo=Math.max(game.maxCombo,game.combo);game.lastClear=game.clock;}
 const lvl=state.owned[String(game.selected)]?.level||1,chainBonus=1+Math.max(0,chosen.length-3)*.15;
 const points=Math.round(chosen.length*100*chainBonus*(1+Math.min(game.combo,30)*.06)*(1+(lvl-1)*.02)*(game.feverTime>0?3:1)*(options.scoreFactor||1));game.score+=points;
 if(!viaSkill){const own=chosen.filter(p=>p.kind===game.selected).length;game.skillGauge=Math.min(100,game.skillGauge+(own*1.5+chosen.length*.55)*100/s.cost);}
 if(!game.feverTime){game.fever=Math.min(100,game.fever+chosen.length*2.9);if(game.fever>=100){game.fever=0;game.feverTime=8;floatText(280,200,'FEVER ×3','#ffe7a2',1.8);burst(280,260,'#ffe4a3',65,'star');sound('win')}}
 if(normal&&chosen.length>=7)addBomb(avg.x,Math.min(580,avg.y));
 // Adjacent rocks crack when a chain or skill reaches them.
 game.board=game.board.filter(p=>{if(p.kind!==-1)return true;const hit=chosen.some(q=>Math.hypot(p.x-q.x,p.y-q.y)<88);if(hit)burst(p.x,p.y,'#d1d5e8',9,'diamond');return !hit});
 floatText(avg.x,avg.y,normal?`${chosen.length} CHAIN  +${fmt(points)}`:`+${fmt(points)}`,viaSkill?s.color:'#fff6c5',1.1);
 refillBoard();sound(viaSkill?'skill':options.bomb?'bomb':'pop');game.hintTimer=0;syncGameUI();return chosen.length;
}
function addBomb(x=280,y=220){if(game.board.filter(p=>p.bomb).length>=5)return;const p=makeTile(-2,x,y);p.bomb=true;p.r=29;game.board.push(p);burst(x,y,'#ccabff',8,'diamond')}
function detonate(id){if(!game||game.busy>0||game.paused)return;const b=byId(id);if(!b?.bomb)return;game.board=game.board.filter(p=>p!==b);burst(b.x,b.y,'#d8bfff',45,'diamond');game.rings.push({x:b.x,y:b.y,r:20,age:0,life:.8,color:'#fff4ac',big:true});erase(game.board.filter(p=>Math.hypot(p.x-b.x,p.y-b.y)<145).map(p=>p.id),false,{bomb:true});refillBoard();}
function useSkill(){if(!game||game.paused||game.finished||game.busy>0||game.skillGauge<100)return;const s=skillOf(game.selected);resetBoardInput();game.skillGauge=0;game.skillUsed++;game.busy=1.4;game.cast={skill:s,age:0,duration:1.4,applied:false,paths:skillPaths(s)};sound('skill');syncGameUI();}
function applySkill(){const s=game.cast.skill,level=state.owned[String(s.id)]?.level||1;const targets=skillTargets(s,game.board,level);erase(targets,true,{scoreFactor:s.affinity===0?1.8:1});
 switch(s.affinity){case 1:game.freeze=Math.max(game.freeze,3);break;case 2:{const live=game.board.filter(p=>p.kind>=0&&!p.bomb&&p.y>0).sort((a,b)=>Math.hypot(a.x-280,a.y-370)-Math.hypot(b.x-280,b.y-370));for(const p of live.slice(0,4)){p.kind=game.selected;burst(p.x,p.y,s.color,20,'petal')}break}case 3:game.bonusCoins+=30;floatText(280,130,'おたから +30 コイン','#d6ffab',1.5);break;case 4:addBomb(280,130);break;
 case 5:if(game.feverTime>0){game.feverTime=Math.min(12,game.feverTime+2)}else{game.fever=Math.min(100,game.fever+35);if(game.fever>=100){game.fever=0;game.feverTime=8}}floatText(280,150,'もりのフィーバー！',s.color,1.3);break;
 case 6:game.time=Math.min(90,game.time+2);floatText(280,150,'時間 +2秒',s.color,1.3);break;
 case 7:{const extra=game.board.filter(p=>p.kind>=0&&!p.bomb).sort((a,b)=>b.y-a.y).slice(0,8);erase(extra.map(p=>p.id),true);break}
 case 8:game.combo+=3;game.maxCombo=Math.max(game.maxCombo,game.combo);game.lastClear=game.clock;floatText(280,150,'コンボ +3',s.color,1.3);break;
 case 9:floatText(280,150,'ワイド消去！',s.color,1.3);break;
 case 10:game.skillGauge=Math.min(100,game.skillGauge+25);floatText(280,150,'次の技 +25%',s.color,1.3);break;
 case 11:game.freeze=Math.max(game.freeze,1.5);addBomb(280,130);floatText(280,150,'時計ストップ＆ボム',s.color,1.3);break;
 }
 syncGameUI();
}
function frame(t){
 if(!game||game.finished)return;const workStart=performance.now();const dt=Math.min(1,Math.max(0,(t-game.lastFrame)/1000));game.lastFrame=t;
 if(!game.paused){
  game.clock+=dt;game.shuffleCool=Math.max(0,game.shuffleCool-dt);
  if(game.cast){game.cast.age+=dt;if(game.cast.age>=.65&&!game.cast.applied){game.cast.applied=true;applySkill()}game.busy=Math.max(0,game.cast.duration-game.cast.age);if(!game.busy)game.cast=null}
  else {if(game.freeze>0)game.freeze=Math.max(0,game.freeze-dt);else game.time=Math.max(0,game.time-dt);game.feverTime=Math.max(0,game.feverTime-dt);if(!game.time){finishGame();return}physics(Math.min(.045,dt))}
  for(const p of game.particles){p.age+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=150*dt;p.rot+=dt*3}game.particles=game.particles.filter(p=>p.age<p.life);
  for(const key of ['rings','ghosts','texts']){game[key].forEach(p=>p.age+=dt);game[key]=game[key].filter(p=>p.age<p.life)}
  game.checkTimer+=dt;game.hintTimer+=dt;if(game.checkTimer>.65){game.checkTimer=0;ensureMove();game.hintIds=findChain()||[]}syncGameUI();drawBoard();
 }
 // Reduce particle volume under sustained rendering load; game rules and timing stay intact.
 if(!game.paused){game.frameCost=(game.frameCost||0)*.9+(performance.now()-workStart)*.1;
  if(game.frameCost>12)game.fxReduced=true;else if(game.frameCost<6)game.fxReduced=false;}
 frameId=requestAnimationFrame(frame);
}
function starPath(x,y,r,points=5,target=ctx){target.beginPath();for(let i=0;i<points*2;i++){const a=i*Math.PI/points-Math.PI/2,rr=i%2?r*.45:r;const xx=x+Math.cos(a)*rr,yy=y+Math.sin(a)*rr;i?target.lineTo(xx,yy):target.moveTo(xx,yy)}target.closePath()}
function paintSprite(p,scale=1,alpha=1,target=ctx){
 if(p.y<-p.r||p.y>H+p.r)return;target.save();target.globalAlpha=alpha;target.translate(p.x,p.y);target.rotate(p.angle||0);target.scale(scale,scale);
 if(p.bomb){const g=target.createRadialGradient(-9,-12,1,0,0,33);g.addColorStop(0,'#f4eaff');g.addColorStop(.55,'#b39dff');g.addColorStop(1,'#7962dc');target.fillStyle=g;target.beginPath();target.arc(0,0,29,0,Math.PI*2);target.fill();target.strokeStyle='#fff';target.lineWidth=3;target.stroke();target.fillStyle='#fff5b8';starPath(0,0,14,5,target);target.fill();target.restore();return}
 if(p.kind===-1){target.fillStyle='#99a4c4';target.beginPath();target.arc(0,0,p.r,0,Math.PI*2);target.fill();target.fillStyle='#d9e0ed';target.font='30px sans-serif';target.textAlign='center';target.textBaseline='middle';target.fillText('◆',0,0);target.restore();return}
 const index=game.cfg.palette.indexOf(p.kind),color=TYPE_COLORS[(index+5)%5];
 target.shadowColor='#15244555';target.shadowBlur=5;target.shadowOffsetY=5;target.fillStyle=color;target.beginPath();target.arc(0,0,p.r,0,Math.PI*2);target.fill();target.shadowBlur=0;target.shadowOffsetY=0;
 target.save();target.beginPath();target.arc(0,-1,p.r-4,0,Math.PI*2);target.clip();target.fillStyle='#fff';target.fill();const im=characterImage(p.kind);if(im?.complete&&im.naturalWidth)target.drawImage(im,-p.r+3,-p.r+2,p.r*2-6,p.r*2-6);target.restore();
 target.strokeStyle=color;target.lineWidth=4;target.beginPath();target.arc(0,0,p.r-2,0,Math.PI*2);target.stroke();target.fillStyle='#ffffff99';target.beginPath();target.ellipse(-10,-23,9,3,-.4,0,Math.PI*2);target.fill();target.restore();
}
// Rasterize each face, clipping and shadow once; moving pieces only require drawImage.
const spriteCache=new Map(),particleCache=new Map(),backgroundCache=new Map();
function drawSprite(p,scale=1,alpha=1){
 if(p.y<-p.r||p.y>H+p.r)return;
 const key=`${p.kind}:${game.cfg.palette.indexOf(p.kind)}:${p.r}`;
 let texture=spriteCache.get(key);
 if(!texture){
  if(p.kind>=0){const image=characterImage(p.kind);if(!image.complete||!image.naturalWidth){paintSprite(p,scale,alpha);return}}
  texture=document.createElement('canvas');texture.width=texture.height=104;
  paintSprite({...p,x:52,y:52,angle:0},1,1,texture.getContext('2d'));
  if(spriteCache.size>=32)spriteCache.clear();spriteCache.set(key,texture);
 }
 ctx.save();ctx.globalAlpha=alpha;ctx.translate(p.x,p.y);ctx.rotate(p.angle||0);ctx.scale(scale,scale);ctx.drawImage(texture,-52,-52);ctx.restore();
}
function particleTexture(p){
 const key=p.glyph+':'+p.color;if(particleCache.has(key))return particleCache.get(key);
 const texture=document.createElement('canvas');texture.width=texture.height=64;
 const c=texture.getContext('2d'),sz=16;c.translate(32,32);c.fillStyle=c.strokeStyle=p.color;c.beginPath();
 if(p.glyph==='star'){for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,r=i%2?sz*.45:sz;i?c.lineTo(Math.cos(a)*r,Math.sin(a)*r):c.moveTo(Math.cos(a)*r,Math.sin(a)*r)}c.closePath()}
 else if(p.glyph==='diamond'){c.moveTo(0,-sz);c.lineTo(sz*.7,0);c.lineTo(0,sz);c.lineTo(-sz*.7,0);c.closePath()}
 else if(p.glyph==='petal')c.ellipse(0,0,sz*.5,sz,0,0,Math.PI*2);else c.arc(0,0,sz,0,Math.PI*2);c.fill();
 if(p.glyph==='snow'){c.lineWidth=2;c.beginPath();c.moveTo(-sz*1.6,0);c.lineTo(sz*1.6,0);c.moveTo(0,-sz*1.6);c.lineTo(0,sz*1.6);c.stroke()}
 if(particleCache.size>=64)particleCache.delete(particleCache.keys().next().value);particleCache.set(key,texture);return texture;
}
function drawBoard(){if(!game)return;ctx.clearRect(0,0,W,H);
 const fever=game.feverTime>0;let bg=backgroundCache.get(fever);if(!bg){bg=ctx.createLinearGradient(0,0,0,H);bg.addColorStop(0,fever?'#7351a5':'#286777');bg.addColorStop(1,fever?'#cc73aa':'#94ccca');backgroundCache.set(fever,bg)}ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
 for(let i=0;i<16;i++){let x=(i*149+41)%560,y=(i*131+game.clock*(reducedMotion?0:8))%640;ctx.fillStyle='#ffffff15';ctx.beginPath();ctx.arc(x,y,5+i%4*3,0,Math.PI*2);ctx.fill()}
 ctx.strokeStyle=fever?'#ffe29b88':'#ffffff2b';ctx.lineWidth=3;ctx.beginPath();ctx.roundRect(12,12,536,616,70);ctx.stroke();
 const selected=new Set(game.path),hint=game.hintTimer>4&&game.path.length===0?new Set(game.hintIds||[]):new Set();
 for(const p of [...game.board].sort((a,b)=>a.y-b.y)){let highlight=selected.has(p.id);if(game.path.length&&!highlight){ctx.save();drawSprite(p,1,.65);ctx.restore()}else drawSprite(p,highlight?1.09:1);if(highlight||hint.has(p.id)){ctx.strokeStyle=highlight?'#ffe494':'#fff8c5';ctx.lineWidth=highlight?5:2;ctx.globalAlpha=highlight?1:.5+.35*Math.sin(game.clock*4);ctx.beginPath();ctx.arc(p.x,p.y,p.r+4,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1}}
 if(game.path.length){ctx.save();ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#ffdb85';ctx.lineWidth=10;ctx.shadowColor='#fff0b4';ctx.shadowBlur=12;ctx.beginPath();game.path.forEach((id,i)=>{const p=byId(id);if(p)i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y)});ctx.stroke();ctx.lineWidth=3;ctx.strokeStyle='#fff9e7';ctx.stroke();ctx.restore();const p=byId(game.path.at(-1));if(p){ctx.fillStyle='#fff8e5';ctx.beginPath();ctx.arc(p.x,p.y-43,20,0,Math.PI*2);ctx.fill();ctx.fillStyle='#85512c';ctx.font='bold 23px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(game.path.length),p.x,p.y-43)}}
 for(const p of game.ghosts)drawSprite(p,1+p.age/p.life*.5,1-p.age/p.life);
 for(const p of game.rings){ctx.globalAlpha=(1-p.age/p.life)*.8;ctx.strokeStyle=p.color;ctx.lineWidth=3*(1-p.age/p.life);ctx.beginPath();ctx.arc(p.x,p.y,p.r+p.age*(p.big?220:110),0,Math.PI*2);ctx.stroke()}ctx.globalAlpha=1;
 for(const p of game.particles){ctx.save();ctx.globalAlpha=1-p.age/p.life;ctx.translate(p.x,p.y);ctx.rotate(p.rot);const sz=p.size*(1-p.age/p.life*.4);ctx.drawImage(particleTexture(p),-sz*2,-sz*2,sz*4,sz*4);ctx.restore()}
 for(const p of game.texts){ctx.save();ctx.globalAlpha=Math.min(1,(1-p.age/p.life)*2);ctx.font='900 25px sans-serif';ctx.textAlign='center';ctx.lineWidth=5;ctx.strokeStyle='#274565cc';const x=Math.max(130,Math.min(430,p.x)),y=Math.max(35,p.y-p.age*50);ctx.strokeText(p.text,x,y);ctx.fillStyle=p.color;ctx.fillText(p.text,x,y);ctx.restore()}
 if(game.freeze>0){ctx.strokeStyle='#c5f7ff';ctx.lineWidth=10;ctx.strokeRect(5,5,550,630)}
 if(game.cast)drawCast();
 if(!game.path.length&&game.hintTimer>5&&!game.cast){ctx.fillStyle='#21465eaa';ctx.beginPath();ctx.roundRect(100,18,360,34,17);ctx.fill();ctx.fillStyle='#fff';ctx.font='17px sans-serif';ctx.textAlign='center';ctx.fillText('光る同じ顔を3個、なぞってつなごう',280,41)}
}
function drawCast(){const c=game.cast,s=c.skill,t=c.age;ctx.save();
 if(t<.67){ctx.fillStyle=`rgba(21,22,63,${.55*Math.min(1,t*5)})`;ctx.fillRect(0,0,W,H);const zoom=.8+Math.min(1,t*4)*.3;const im=characterImage(s.id);ctx.translate(280,275);ctx.rotate(Math.sin(t*10)*.05);ctx.fillStyle=s.color;ctx.beginPath();ctx.arc(0,0,82*zoom,0,Math.PI*2);ctx.fill();ctx.save();ctx.beginPath();ctx.arc(0,0,73*zoom,0,Math.PI*2);ctx.clip();if(im?.complete&&im.naturalWidth)ctx.drawImage(im,-73*zoom,-73*zoom,146*zoom,146*zoom);ctx.restore();ctx.setTransform(1,0,0,1,0,0);ctx.textAlign='center';ctx.font='900 25px sans-serif';ctx.fillStyle='#fff';ctx.fillText(NAMES[s.id],280,390);ctx.font='900 25px sans-serif';ctx.fillStyle=s.color;ctx.fillText(s.short,280,427);}
 else{const k=(t-.65)/.75;ctx.globalAlpha=Math.max(0,1-k);ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle=s.color;ctx.shadowColor=s.color;ctx.shadowBlur=state.settings.lightFx?0:20;ctx.lineWidth=26*(1-k)+4;for(const p of c.paths){ctx.beginPath();p.forEach((v,i)=>i?ctx.lineTo(v.x,v.y):ctx.moveTo(v.x,v.y));ctx.stroke()}if(!c.paths.length){for(let i=0;i<7;i++){let a=i*Math.PI*2/7+game.clock;starPath(280+150*Math.cos(a),330+160*Math.sin(a),36);ctx.fillStyle=s.color;ctx.fill()}}}
 ctx.restore();
}
// Release capture before hiding the canvas, including expiry during a touch drag.
function resetBoardInput(){
 const pointer=activePointer;
 activePointer=null;dragging=false;swipeMoved=false;lastPoint=null;pointerRect=null;
 if(game)game.path=[];
 if(pointer!==null){try{if(canvas.hasPointerCapture(pointer))canvas.releasePointerCapture(pointer)}catch{}}
}
let pointerRect=null;
function pointFrom(e){const r=pointerRect||canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height}}
function hitPoint(p){let nearest=null,best=Infinity;if(!game)return null;for(const q of game.board){if(q.kind<0&&!q.bomb)continue;const dx=p.x-q.x,dy=p.y-q.y,d=dx*dx+dy*dy;if(d<=(q.r+6)*(q.r+6)&&d<best){best=d;nearest=q}}return nearest}
function addPath(id){if(!game||game.paused||game.finished||game.busy>0)return;const p=byId(id);if(!p||p.kind<0)return;const path=game.path;if(path.length>1&&path.at(-2)===id){path.pop();return}if(path.includes(id))return;if(!path.length){path.push(id);return}const last=byId(path.at(-1));if(last?.kind===p.kind&&adjacent(id,last.id)){path.push(id);sound('connect')}}
canvas.addEventListener('pointerdown',e=>{if(!game||activeScreen!=='game'||game.paused||game.finished||game.busy>0||activePointer!==null)return;e.preventDefault();getAudio();pointerRect=canvas.getBoundingClientRect();const p=pointFrom(e),tile=hitPoint(p);if(!tile)return;if(tile.bomb){detonate(tile.id);return}activePointer=e.pointerId;dragging=true;swipeMoved=false;lastPoint=p;game.hintTimer=0;if(game.path.length&&(!adjacent(game.path.at(-1),tile.id)||byId(game.path.at(-1))?.kind!==tile.kind)&&game.path.at(-1)!==tile.id)game.path=[];addPath(tile.id);try{canvas.setPointerCapture(e.pointerId)}catch{}});
canvas.addEventListener('pointermove',e=>{if(!dragging||e.pointerId!==activePointer||!game||game.paused||game.finished||activeScreen!=='game'||!lastPoint)return;e.preventDefault();const p=pointFrom(e),dist=Math.hypot(p.x-lastPoint.x,p.y-lastPoint.y);if(dist>3)swipeMoved=true;const n=Math.max(1,Math.ceil(dist/9));for(let i=1;i<=n;i++){const q=hitPoint({x:lastPoint.x+(p.x-lastPoint.x)*i/n,y:lastPoint.y+(p.y-lastPoint.y)*i/n});if(q)addPath(q.id)}lastPoint=p});
function releasePointer(e){if(!dragging||e&&e.pointerId!==activePointer)return;dragging=false;activePointer=null;pointerRect=null;if(!game||game.paused||game.finished){if(game)game.path=[];return}const ids=[...game.path];if(ids.length>=3){game.path=[];erase(ids)}else if(swipeMoved)game.path=[];else if(ids.length)floatText(280,90,`あと${3-ids.length}個をつなごう`,'#fff',.8)}
canvas.addEventListener('pointerup',releasePointer);canvas.addEventListener('pointercancel',resetBoardInput);
canvas.addEventListener('lostpointercapture',e=>{if(e.pointerId===activePointer)resetBoardInput()});

function finishGame(){if(!game||game.finished)return;game.finished=true;resetBoardInput();closeModal();game.time=0;game.path=[];if(frameId){cancelAnimationFrame(frameId);frameId=null;}ensureDaily();const {stage,clears,score,maxCombo,skillUsed}=game;let rank=playerRank(stage,clears,score),win=rank<=500,bonus=rank===1?300:rank<=100?200:rank<=500?100:0,reward=clears+bonus+(game.bonusCoins||0);state.coins+=reward;state.totalPlays++;state.totalClears+=clears;state.skillUses+=skillUsed;state.highCombo=Math.max(state.highCombo,maxCombo);state.daily.plays++;state.daily.clears+=clears;state.daily.skill+=skillUsed;if(win){state.totalWins++;state.clearedStages[stage]=true;state.unlocked=Math.max(state.unlocked,Math.min(100,stage+1));}let r=state.stageStats[stage];if(!r)r=state.stageStats[stage]={bestClears:0,bestScore:0,bestRank:1001,plays:0};r.bestClears=Math.max(r.bestClears,clears);r.bestScore=Math.max(r.bestScore,score);r.bestRank=Math.min(r.bestRank,rank);r.plays++;const stageReward=win?grantStageFriend(stage):null;save();renderStoryResult(stage,win,stageReward);$('resultHeading').textContent=win?'STAGE CLEAR!':'TRY AGAIN!';$('resultHeading').classList.toggle('loss',!win);$('resultEmoji').textContent=rank===1?'👑':win?'🏆':'🌟';$('resultRank').textContent=fmt(rank);$('resultSummary').textContent=win?(stage===100?'全100話クリア！ みんなの灯りが戻ったでね。物語手帳で旅を振り返ろう。':'上位500位に入った！ お話の続きと次のステージが解放されたでね。'):'今回は501位以下。育成やスキルを使って再挑戦だがね！';$('resultClear').textContent=fmt(clears)+' 個';$('resultScore').textContent=fmt(score);$('resultCombo').textContent=fmt(maxCombo);$('resultCoins').textContent='+'+fmt(reward)+' 🪙';$('rankingNeighbors').innerHTML=renderRanks(stage,clears,score);showScreen('result');sound(win?'win':'loss');if(win)voice('やったー！ステージクリア！');if(win&&stage%10===0)setTimeout(()=>toast(`第${stage/10}章クリア！ 次の物語が開かれたがね！`),400);}
function renderRanks(stage,clears,score){let members=cpuRoster(stage).map(p=>({...p,me:false}));members.push({id:-1,name:'あなた',clears,score,me:true});members.sort((a,b)=>b.clears-a.clears||b.score-a.score||Number(b.me)-Number(a.me));let idx=members.findIndex(x=>x.me),windowIndices=new Set([0,1,2]);for(let j=Math.max(0,idx-5);j<=Math.min(members.length-1,idx+5);j++)windowIndices.add(j);let positions=[...windowIndices].sort((a,b)=>a-b);return positions.map((at,i)=>{let p=members[at],rank=1+members.filter(x=>x.clears>p.clears||(x.clears===p.clears&&x.score>p.score)).length;return `${i&&at-positions[i-1]>1?'<div class="rank-row">　…　</div>':''}<div class="rank-row ${p.me?'me':''}"><b>${rank}位</b><span>${p.me?'👤 ':''}${p.name}</span><span>${p.clears}個</span></div>`;}).join('');}
function pauseGame(auto=false){if(!game||game.finished||game.paused)return;game.paused=true;resetBoardInput();syncGameUI();showModal(auto?'自動で一時停止したでね':'⏸️ ポーズ中','<p>ゲームを一時停止しとるでよ。再開すると残り時間から始まるがね。</p>',[{text:'▶ ゲームを再開',action:()=>{closeModal();game.paused=false;game.lastFrame=performance.now();syncGameUI();}},{text:'ステージ選択に戻る',style:'outline',action:()=>{goToStages();}}]);}

// Bounded storage access: a blocked IndexedDB must not leave the start screen inert.
function openDb(){
 if(!('indexedDB'in window))return Promise.resolve(null);
 if(!dbPromise)dbPromise=new Promise(resolve=>{
  let done=false;const finish=db=>{if(done){db?.close();return}done=true;clearTimeout(timer);resolve(db)};
  const timer=setTimeout(()=>finish(null),750);
  try{const req=indexedDB.open('zatsuworld-game',1);
   req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('saves'))req.result.createObjectStore('saves')};
   req.onsuccess=()=>finish(req.result);req.onerror=()=>finish(null);req.onblocked=()=>finish(null);
  }catch{finish(null)}
 });return dbPromise;
}
async function loadState(){
 let local=null;
 try{const raw=localStorage.getItem(STORE_KEY);if(raw)local=JSON.parse(raw)}catch(e){console.warn('端末内の控えを読み込めません',e)}
 if(local)state=normalizeState(local);
 const db=await openDb();if(!db)return;
 const stored=await new Promise(resolve=>{let done=false;const finish=value=>{if(done)return;done=true;clearTimeout(timer);resolve(value)},timer=setTimeout(()=>finish(null),400);
  try{const req=db.transaction('saves','readonly').objectStore('saves').get('main');req.onsuccess=()=>finish(req.result);req.onerror=()=>finish(null)}catch{finish(null)}
 });
 if(stored&&(!local||(Number(stored.updatedAt)||0)>(Number(local.updatedAt)||0)))state=normalizeState(stored);
}
function goToStages(){
 if(frameId!==null){cancelAnimationFrame(frameId);frameId=null}
 resetBoardInput();if(game)game.finished=true;game=null;
 closeModal();activeTab='stages';showScreen('select');
 const toastEl=document.querySelector('.toast');if(toastEl)toastEl.classList.add('hidden');
}

function getAudio(){try{if(!audioCtx){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return null;audioCtx=new Audio();}if(audioCtx.state==='suspended')audioCtx.resume();return audioCtx;}catch{return null}}
function note(freq,duration=.11,vol=.045,wave='sine'){let a=getAudio();if(!a)return;let o=a.createOscillator(),g=a.createGain(),at=a.currentTime;o.type=wave;o.frequency.setValueAtTime(freq,at);g.gain.setValueAtTime(vol,at);g.gain.exponentialRampToValueAtTime(.0001,at+duration);o.connect(g);g.connect(a.destination);o.start(at);o.stop(at+duration+.03);}
function sound(type){if(!state.settings.sfx)return;const notes={connect:[650+(game?.path.length||0)*28],pop:[640,840,1080],bomb:[130,270,540,920],skill:[330,500,700,960],gift:[440,610,830],level:[650,880],win:[523,660,784,1047],loss:[390,310]};let v=notes[type]||[440];v.forEach((hz,i)=>setTimeout(()=>note(hz,.11,.055,'sine'),i*65));}
function startMusic(){if(bgmTimer||!state.settings.bgm)return;let notes=[392,494,587,523,440,523,659,587];bgmTimer=setInterval(()=>{if(document.hidden||!state.settings.bgm||game?.paused)return;let h=notes[bgmStep++%notes.length];note(h,.14,.014,'triangle');},330);}
function stopMusic(){if(bgmTimer){clearInterval(bgmTimer);bgmTimer=null;}}
function voice(text){if(state.settings.voice&&'speechSynthesis'in window){try{speechSynthesis.cancel();let u=new SpeechSynthesisUtterance(text);u.lang='ja-JP';u.rate=1.1;u.volume=.7;speechSynthesis.speak(u);}catch{}}}

function bind(){$('characterSearch').addEventListener('input',renderCharacters);$('characterGroup').addEventListener('change',renderCharacters);$('nextStoryBtn').onclick=()=>{if(game?.finished&&state.clearedStages[game.stage]&&game.stage<100)stageBrief(game.stage+1)};$('resultJournalBtn').onclick=()=>{goToStages();setTab('story')};$('useRewardBtn').onclick=()=>{const id=game?.stage;if(id&&state.owned[id]){state.selectedChar=id;save();$('useRewardBtn').textContent=NAMES[id]+'を選択中'}};document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>setTab(b.dataset.tab)));$('startBtn').onclick=()=>{sound('level');goToStages();startMusic();};$('logoBtn').onclick=()=>{if(game&&!game.finished){pauseGame();return;}showScreen('title');};$('pauseBtn').onclick=()=>pauseGame();$('shuffleBtn').onclick=()=>shuffleBoard(true);$('helpBtn').onclick=showHelp;$('giftSkip').onclick=revealGift;$('giftContinue').onclick=closeGift;$('skillBtn').onclick=useSkill;$('openGiftBtn').onclick=openGift;$('resultBackBtn').onclick=goToStages;$('retryBtn').onclick=()=>{let s=game?.stage||1;startGame(s);};$('soundBtn').onclick=()=>{const on=state.settings.bgm||state.settings.sfx;state.settings.bgm=!on;state.settings.sfx=!on;if(state.settings.bgm)startMusic();else stopMusic();save();updateHUD();toast(on?'音をオフにしたでね':'音をオンにしたでよ！');};for(let key of ['bgm','sfx','voice','lightFx'])$(key+'Toggle').addEventListener('change',e=>{state.settings[key]=e.target.checked;if(key==='bgm'){if(e.target.checked)startMusic();else stopMusic();}save();});$('resetBtn').onclick=()=>showModal('セーブデータを初期化しますか？','<p>コイン、ハート、キャラ収集、ステージ記録などが全部消えるでよ。元には戻せんがね。</p>',[{text:'すべて初期化',action:()=>{state=blankState();save();closeModal();showScreen('title');toast('最初からやり直しだでね。');}},{text:'キャンセル',style:'outline',action:closeModal}]);document.addEventListener('visibilitychange',()=>{if(document.hidden&&activeScreen==='game')pauseGame(true);});window.addEventListener('resize',()=>{pointerRect=null});window.addEventListener('blur',()=>{if(activeScreen==='game'&&game&&!game.paused)pauseGame(true);});}
async function init(){$('startBtn').disabled=true;$('startBtn').textContent='読み込み中…';bind();await loadState();const catchup=reconcileStoryRewards();if(catchup.length){state.storyCatchup=[...new Set([...state.storyCatchup,...catchup])];save()}$('startBtn').disabled=false;$('startBtn').textContent='あそびはじめる　→';$('heroFriends').innerHTML=[1,2,0,3,4].map((id,i)=>`<img style="--rot:${[-12,9,-3,10,-7][i]}deg" src="${CHARACTER_IMAGES[id]}" alt="${esc(NAMES[id])}">`).join('');updateHUD();showScreen('title');if(state.pendingGift&&Number.isInteger(state.pendingGift.id)&&state.pendingGift.id>=0&&state.pendingGift.id<CHARACTER_COUNT)animateGift(state.pendingGift);}

function episode(stage){return STORY_CHAPTERS[Math.floor((stage-1)/10)].scenes[(stage-1)%10]}
function storyText(text,stage){return esc(text.replaceAll('{friend}',NAMES[stage]))}
function storyScene(stage,after){
 const chapter=STORY_CHAPTERS[Math.floor((stage-1)/10)],e=episode(stage);
 return `<article class="story-scene"><div class="story-kicker">第${Math.ceil(stage/10)}章 · ${esc(chapter.title)} / ${after?'クリア後':'出会い'}</div><h3>${esc(e.title)}</h3><div class="story-dialogue">${imgTag(after?stage:0)}<div><b>${after?esc(NAMES[stage])+'とザツの物語':'ザツの冒険'}</b><p>${storyText(after?e.after:e.before,stage)}</p></div></div>${after?'':`<p class="story-goal">${esc(chapter.goal)}</p>`}</article>`;
}
function rewardPreview(stage){return `<div class="reward-preview">${imgTag(stage)}<div><b>${esc(NAMES[stage])}</b><small>${state.stageRewards[stage]?'初回クリア報酬は受取済み':'初回クリアで必ず仲間に！'}</small><small>所持済みなら合成素材 +1</small></div></div>`}
// Grant inventory and claim marker together, before saving or showing any animation.
function grantStageFriend(stage){
 if(!Number.isInteger(stage)||stage<1||stage>100||!state.clearedStages[stage]||state.stageRewards[stage])return null;
 const old=!!state.owned[stage];
 if(old)state.owned[stage].spares++;else state.owned[stage]={level:1,spares:0};
 state.stageRewards[stage]=true;return {id:stage,old};
}
function reconcileStoryRewards(){const granted=[];for(let s=1;s<=100;s++)if(grantStageFriend(s))granted.push(s);return granted}
function renderStoryResult(stage,win,reward){
 $('resultStory').innerHTML=win?storyScene(stage,true):'<p class="story-retry-note">お話の続きはクリア後に。仲間の技も使って、もう一度挑戦しよう。</p>';
 $('resultFriend').innerHTML=reward?`<div class="friend-arrival" role="status"><div class="arrival-sparkles" aria-hidden="true">✦　✧　✦</div><span class="story-kicker">${reward.old?'仲間の絆が深まった':'新しい仲間が加わった！'}</span>${imgTag(reward.id)}<h3>${esc(NAMES[reward.id])}</h3><p>${reward.old?'所持済みのため合成素材 +1':'初回クリア報酬 · 図鑑に登録したよ'}</p><small>${esc(skillOf(reward.id).description)}</small></div>`:win?'<p class="small-note">このステージの仲間は受取済みです。再クリアでの重複受取はありません。</p>':'';
 $('nextStoryBtn').classList.toggle('hidden',!win||stage===100);
 $('useRewardBtn').classList.toggle('hidden',!win);
 $('useRewardBtn').textContent=`${NAMES[stage]}をマイキャラにする`;
}
function renderStoryBook(){
 let html=`<p class="small-note">全10章・100話。出会いはステージ解放時、結末はクリア後に読めます。初回クリアごとに仲間1体、全100体。所持済みは合成素材になります。</p>`;
 for(let c=0;c<10;c++){
  html+=`<section class="story-book-chapter"><h3>第${c+1}章 · ${esc(STORY_CHAPTERS[c].title)}</h3>`;
  for(let n=1;n<=10;n++){const stage=c*10+n,open=stage<=state.unlocked;html+=`<button class="story-entry" data-story="${stage}" ${open?'':'disabled'}><span>${String(stage).padStart(3,'0')}</span><b>${open?esc(episode(stage).title):'まだ見ぬお話'}</b><small>${state.clearedStages[stage]?'結末を読む':open?'出会いを読む':'未解放'}</small></button>`}
  html+='</section>';
 }
 $('storyBook').innerHTML=html;$('storyBook').querySelectorAll('[data-story]:not(:disabled)').forEach(b=>b.onclick=()=>readEpisode(Number(b.dataset.story)));
}
function readEpisode(stage){
 if(!Number.isInteger(stage)||stage<1||stage>state.unlocked)return;
 showModal(`第${stage}話｜${episode(stage).title}`,storyScene(stage,false)+(state.clearedStages[stage]?storyScene(stage,true):'<p>結末はクリア後に開きます。</p>')+rewardPreview(stage));
}
init();
