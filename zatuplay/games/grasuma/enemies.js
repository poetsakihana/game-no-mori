'use strict';
const EnemyCast=(()=>{
 const entries=[
 ['荒牙のボア','獣','火',['orb'],'岩の鎧をまとった小型獣。追尾弾で離れた仲間も狙う。'],
 ['蒼甲クラブ','甲殻','水',['burst'],'青い甲殻と大きなハサミ。近くに固まると衝撃波を受ける。'],
 ['宵翼バット','有翼','闇',['cross'],'翼にアークの光を宿す。縦横の射線から離れて備えよう。'],
 ['喰葉プラント','植物','風',['orb'],'廃墟に根を張る食虫植物。追尾する種弾を放つ。'],
 ['旧式カノン','機械','光',['laser'],'古い砲台が再起動した姿。水平の予告線を確認しよう。'],
 ['晶牙ウルフ','獣','光',['cross'],'結晶のたてがみを持つ狼。十字の光線を放つ。'],
 ['毒晶スライム','軟体','闇',['orb'],'紫の結晶を宿す軟体生物。姿が小さくても油断は禁物。'],
 ['紅殻ビートル','甲殻','火',['burst'],'赤い結晶甲を持つ昆虫。周囲の仲間へ衝撃波を放つ。'],
 ['環晶アークコア','結晶','闇',['cross'],'環をまとって浮遊する結晶体。十字の攻撃で道を塞ぐ。'],
 ['淡彩ジェリー','軟体','水',['orb'],'透ける体で漂う小型魔物。遠くの一人を狙う。'],
 ['赤盾ゴーレム','岩石','火',['burst'],'石の盾を構えた重い魔物。密集せずに取り囲もう。'],
 ['灯影メイジ','魔性','水',['laser'],'青い灯を掲げる小柄な術者。水平の帯状攻撃を使う。'],
 ['黒晶のキマイラ','大型獣','闇',['burst','cross','orb'],'黒い装甲と結晶をまとった巨獣。三つの攻撃を順番に放つ。'],
 ['紅蓮のレイヴン','大型有翼','火',['cross','orb','burst'],'翼を広げる炎の巨鳥。十字・追尾・周囲攻撃を使い分ける。'],
 ['古塔のガーディアン','大型機械','光',['laser','cross','burst'],'古塔を守る巨大な機械兵。砲口と予告範囲に注意。'],
 ['暁灯の制御核','中枢機械','闇',['cross','burst','orb'],'六つの機械腕を広げる制御核。物語最終章の敵。']
 ].map(([name,family,element,moves,desc],id)=>({id,name,family,element,moves,desc,boss:id>=12}));
 const palette={火:'#ff936c',水:'#77d9f4',風:'#96e3a4',光:'#f7dc89',闇:'#c39cfa'};
 const atlas=new Image();atlas.src='assets/enemy-atlas-v1.png';atlas.onload=()=>{paint();VISUALS.paint()};
 function get(e){return entries[e?.castId]}
 function cell(d){const xs=[0,334,635,950,1254],ys=[0,312,620,900,1254],col=d.id%4,row=Math.floor(d.id/4),sx=atlas.naturalWidth/1254,sy=atlas.naturalHeight/1254;return [xs[col]*sx,ys[row]*sy,(xs[col+1]-xs[col])*sx,(ys[row+1]-ys[row])*sy]}
 function attack(e){const d=get(e);return d?d.moves[(e.castMoveIndex||0)%d.moves.length]:null}
 const storyMain=[0,1,12,12,14,14,12,13,12,14,15];
 const storySmall=[[0,4,6],[1,3,9],[4,8,2],[6,8,11],[4,7,10],[4,5,10],[2,6,11],[7,2,10],[1,3,9],[4,8,11],[8,11,4]];
 function assign(){if(!S)return;let types;
 if(S.storyChapter){const n=S.storyChapter-1;types=[storyMain[n],...storySmall[n]]}
 else if(S.eventSeason){types=[{spring:12,summer:13,autumn:12,winter:14}[S.eventSeason]||12,...({spring:[3,5,0],summer:[1,9,2],autumn:[7,3,6],winter:[5,11,8]}[S.eventSeason]||[0,4,6])]}
 else if(S.questId){const i=QuestData.entries.findIndex(q=>q.id===S.questId);types=[12+i%4, i%12,(i+4)%12,(i+7)%12]}
 else types=[[0,4,6],[1,4,3,2],[12,8,10,11]][S.stage];
 S.enemies.forEach((e,i)=>{e.castId=types[i%types.length];e.castMoveIndex=0;const d=get(e);e.displayName=S.storyChapter&&i===0?STORY_CHAPTERS[S.storyChapter-1].boss:d.name;e.element=d.element});
 }
 function draw(c,e,time=performance.now()){const d=get(e);if(!d)return false;if(!atlas.complete||!atlas.naturalWidth)return false;const rect=cell(d),bob=Math.sin(time/330+e.id)*2.2,scale=e.boss?2.75:3.0,w=e.r*scale;
 c.save();c.translate(e.x,e.y+bob);c.drawImage(atlas,...rect,-w/2,-w/2,w,w);c.restore();return true}
 function art(d,size=96){return `<canvas width="256" height="256" class="enemy-art" data-enemy-art="${d.id}" role="img" aria-label="${d.name}の創作イラスト" style="width:${size}px;height:${size}px"></canvas>`}
 function paint(){document.querySelectorAll('[data-enemy-art]').forEach(el=>{const d=entries[+el.dataset.enemyArt];if(!d||!atlas.complete||!atlas.naturalWidth)return;const c=el.getContext('2d'),rect=cell(d);c.clearRect(0,0,el.width,el.height);c.drawImage(atlas,...rect,0,0,el.width,el.height)})}
 function render(){const q=$('enemySearch').value?.trim()||'',kind=$('enemyFilter').value||'';const list=entries.filter(d=>(!kind||(kind==='boss'?d.boss:!d.boss))&&[d.name,d.family,d.element].some(t=>t.includes(q)));
 $('enemyCount').textContent=list.length+' / '+entries.length+'種類';$('enemyCatalog').innerHTML=list.map(d=>`<article class="enemy-card" style="--enemy-color:${palette[d.element]}"><button class="enemy-zoom" data-enemy-zoom="${d.id}" aria-label="${d.name}を拡大">${art(d,140)}</button><small>${d.boss?'BOSS':'ENEMY'} / ${d.family} / ${d.element}</small><h3>${d.name}</h3><p>${d.desc}</p><p class="enemy-moves">${d.moves.map(k=>BattlePlus.patterns[k].name).join(' → ')}</p><small>${d.moves.map(k=>BattlePlus.patterns[k].desc).join(' / ')}</small></article>`).join('')||'<p>該当する敵はいません。</p>';document.querySelectorAll('[data-enemy-zoom]').forEach(b=>b.onclick=()=>zoom(+b.dataset.enemyZoom));paint()}
 function zoom(id){const d=entries[id];if(!d)return;modal(`<h2>${d.name}</h2>${art(d,300)}<p>${d.family} / ${d.element} / 創作デザイン</p><p>${d.desc}</p><p>${d.moves.map(k=>BattlePlus.patterns[k].name).join(' → ')}</p>`);paint()}
 function battleUI(){if(!S)return;$('enemyStatus').innerHTML=S.enemies.filter(e=>e.hp>0).map(e=>{const d=get(e),p=BattlePlus.patterns[BattlePlus.pattern(e)];return `<div class="enemy-status-row">${d?art(d,62):''}<div><b>${VISUALS.esc(e.displayName||'敵')} ${e.boss?' / BOSS':''}</b><span>${d?.family||''} / ${d?.element||''}　HP ${Math.ceil(e.hp)} / ${e.max}</span><small>反撃まで ${e.clock}手番 / ${p.name}<br>${p.desc}</small></div></div>`}).join('');paint()}
 const oldStart=start;start=function(n){const before=S;oldStart(n);if(S&&S!==before){assign();ui()}};
 const oldUI=VISUALS.battleUI;VISUALS.battleUI=function(){oldUI();battleUI()};
 $('enemySearch').oninput=render;$('enemyFilter').onchange=render;
 render();return {entries,palette,get,attack,assign,draw,art,paint,render,zoom,forStage(n){return [[0,4,6],[1,4,3,2],[12,8,10,11]][n]},onAttack(e){e.castMoveIndex=(e.castMoveIndex||0)+1}};
})();globalThis.EnemyCast=EnemyCast;
