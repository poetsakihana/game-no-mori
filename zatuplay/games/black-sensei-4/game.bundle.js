(function () {
"use strict";
 if(!Array.prototype.at)Object.defineProperty(Array.prototype,'at',{value:function(index){index=Math.trunc(index)||0;if(index<0)index+=this.length;return this[index];},configurable:true,writable:true});
 if(!CanvasRenderingContext2D.prototype.roundRect)CanvasRenderingContext2D.prototype.roundRect=function(x,y,w,h,r){var radius=Math.min(typeof r==='number'?r:4,Math.abs(w)/2,Math.abs(h)/2);this.moveTo(x+radius,y);this.arcTo(x+w,y,x+w,y+h,radius);this.arcTo(x+w,y+h,x,y+h,radius);this.arcTo(x,y+h,x,y,radius);this.arcTo(x,y,x+w,y,radius);this.closePath();return this;};

const CHAPTERS = [
  '軌道からのSOS', '月面行きの貨物便', '奪われた帰還船', '無重力の通学路', '第一ドックの封鎖',
  '赤牙の船団', 'デブリの海', '消えた管制官', '星の交差点', '暗黒軌道の番人',
  '月面都市の灯', '砂に埋もれた証拠', '氷を運ぶ者たち', '地下街の階段', '月裏の包囲網',
  '廃棄ステーション', '酸素倉庫の鍵', '無人区画の声', '壊れた観測塔', '横取りされた明日',
  '土星の輪へ', '氷粒の追跡', '採掘艇の脱出', '環の影の交渉', '凍結したドック',
  '木星の嵐', '磁気の回廊', '救難艇の航跡', '通信衛星の裏側', '嵐の中心で',
  '小惑星の港', '黒星会の帳簿', '隠された居住区', '気圧扉を越えて', '鉱山長の最後通告',
  '遠日点の孤児たち', '灯台衛星の消灯', '偽りの救難信号', '宇宙エレベーター', '静止軌道の砦',
  '地球圏への帰路', '軌道市場の逆襲', '帰還窓を守れ', '環状要塞の底', '先生を待つ者たち',
  '黒星会の旗艦', '天牙の残光', '帰還軌道の決戦', '最後の送信', '星を越えて、教室へ'
];

const bossTitles = [
  '鎧腕・砕堂', '流星の白鷹', '軌道狩り・黒矢', '放浪の逆巻', 'ドック頭・灰堂',
  '赤牙船長・烈火', '破片の銀狼', '管制屋・雷門', '十字航路の迅', '軌道番・大嶽',
  '月影の白兎', '砂鉄の鱗', '氷運びの玄冬', '階段守・黒松', '月裏の赤星',
  '廃駅主・朽木', '酸素狩り・渇牙', '無人街の残響', '観測頭・高嶺', '密売頭・不破',
  '環の蒼竜', '氷斧・霜月', '採掘頭・岩砕', '影商人・水鏡', '凍港将・雪崩',
  '嵐帆・轟天', '磁軌の銀河', '追撃隊長・紫電', '裏衛星の天狐', '暴風将・雷鷹',
  '小惑星王・砺牙', '帳簿役・玄札', '隠居区の朧', '気圧番・鉄戸', '鉱山頭・黒岩',
  '遠日の荒鷲', '灯台狩り・消灯', '偽信号の鴉', '昇天機の玄武', '停軌将・天錘',
  '地球門・鋼牙', '市場の剛掌', '帰還狩り・刹那', '環砦の鉄柱', '待伏頭・羅刹',
  '黒星総代・天淵', '天牙残党・翔牙', '軌道将・蒼迅', '通信統領・無音', '黒星会長・星骸'
];

const sectorNames = [
  '地球低軌道', '外縁ドック', '月裏居住区', '廃棄観測網', '土星環前哨',
  '木星救難航路', '小惑星採掘帯', '遠日点航路', '地球帰還回廊', '黒星旗艦'
];
const sectorColors = [
  ['#090d22','#16274d','#457da5','#87d9ec'], ['#100e24','#28254f','#7765a5','#c9aaf6'],
  ['#10151f','#233242','#71879c','#a4d9e8'], ['#111a24','#1a3844','#39847f','#87f4d3'],
  ['#171323','#43304b','#b98572','#fad3a7'], ['#181221','#3b2b43','#a96676','#ffb8a8'],
  ['#0d1529','#23345a','#616ca1','#b7c5fa'], ['#0f1629','#1d3b56','#548c9c','#91e5ef'],
  ['#0d1329','#24264f','#625eaa','#c0baff'], ['#1a1125','#3b224b','#945276','#f1a9ca']
];
const THEMES = sectorNames.map((name, i) => {
  const [dark, mid, planet, accent] = sectorColors[i];
  return {name, sky:[dark, mid, dark], back:dark, mid, ground:'#23364c', planet, accent};
});

const episodes = [
  '港から戻って半年。宙港の学校に届いたSOSは、帰還船から消えた生徒の声だった。',
  '月面行き貨物便の積荷目録に、消えた生徒たちの名前が書き込まれていた。',
  '帰還船の偽造された便名を追い、先生は封鎖空域の中継局へ向かう。',
  '生徒が残した通学路の落書きは、ドックの奥につながる道を示していた。',
  '封鎖された第一ドックの向こうに、船を押さえた黒星会の幹部が待つ。',
  '赤牙残党の高速艇が隊列を組む。先生は救助艇を先に行かせ、殿を引き受けた。',
  '漂う機材の隙間を、弱い救命ビーコンの光が一つずつ照らす。',
  '管制官の机に残された航跡には、存在しないはずの便が並んでいた。',
  '三本の航路が交差する地点で、黒星会と赤牙の取引に出くわす。',
  '暗黒軌道の番人は、宙港への帰り道を閉じると宣言した。',
  '月裏の都市では、帰れなくなった作業員たちが助けを待っていた。',
  '砂に覆われた機材から、救命補給を売り渡した取引の記録が見つかる。',
  '氷を運ぶ若者たちを守りながら、先生は貯水タンクの中継所に入る。',
  '月面の地下街に取り残された子供を探し、シャフトを一階ずつ上る。',
  '月裏の出口で黒星会が待ち構える。帰る船の先頭には、先生が立つ。',
  '廃棄されたステーションの窓から、夜の中に小さな灯りが見えた。',
  '酸素倉庫の鍵を守るのは、かつて先生と同じ学校に通った青年だった。',
  '無人区画から通信が入る。話していたのは、電波を拾った救助待ちの乗員だ。',
  '観測塔に上れば、奪われた小型艇がどこへ向かうかが見える。',
  '救助船に偽の命令が送られる前に、指令室を取り戻さなければならない。',
  '土星の環を背に、船団が隊列を解く。次の救難点へ行けるのは小型艇だけだ。',
  'きらめく氷粒の向こうへ、黒星会の補給船が姿を消した。',
  '採掘艇の船員は機材室で固まっていた。先生は全員の靴音を数えてから出発する。',
  '環の影で取引する二人は、救助船の燃料を自分たちの物だと言い張った。',
  '凍結したドックの開閉音に合わせて、救助艇が最後の発進を待っている。',
  '木星の嵐が視界をふさぐ。雲の隙間に、制御を失った輸送船の光が見える。',
  '磁気嵐で画面が消えても、澪の声だけは途切れなかった。',
  '救難艇の航跡は、星の裏に隠した黒星会の貯蔵庫へ続く。',
  '衛星の裏に残された通信記録から、妨害の指示を出した人物が分かる。',
  '暴風将が救難施設を占拠する。先生は手すりを離し、船外に飛び出した。',
  '小惑星の港には、雇われたつもりで閉じ込められた作業員がいた。',
  '黒星会の帳簿に並ぶ金額の下に、帰還できなかった乗員たちの名が残る。',
  '地図に載っていない居住区で、子供が代わる代わる窓をたたいていた。',
  '気圧扉の先から返事がある。先生は声がした方向へ足場を上る。',
  '鉱山長は仕事を口実に人を逃さない。先生は契約書を突き返した。',
  '遠い航路で育った子供たちに、地球の朝を見せると先生は約束する。',
  '灯台衛星が消え、帰還船が進路を見失う前に光を取り戻す。',
  '救難信号は罠だった。けれど、そこに本当に取り残された船もある。',
  '宇宙エレベーターを占拠した不良たちは、上から帰還船の行方を見張っている。',
  '静止軌道の砦を落とせば、帰還船は灯りのある側へ戻れる。',
  '青い地球が正面に見える。あと少しの距離で、先生は新たな迎撃を見つける。',
  '軌道市場では、黒星会から離れた商人たちが救助船の部品を分けてくれた。',
  '短い帰還窓を逃せば、船は次の便まで待たなければならない。',
  '環状要塞の最下層に潜り、見張りに気づかれる前に帰還扉を開ける。',
  '学級の全員から届けられた音声を聞き、先生はもう一度、拳を握る。',
  '旗艦の奥から、黒星会を追われた元乗員が手を振っている。',
  '天牙残党の翔牙は、逃げる船より先生との決着を選んだ。',
  '帰還船が最後の軌道に乗る。先生は船団を通すため自分の艇を停めた。',
  '昇降機の頂上に証拠の送信機がある。電源が切れるまでに、全記録を送る。',
  '帰還する生徒たちを狙い、黒星会長が船外へ出る。先生は最後の迎撃に向かった。'
];

function storyFor(chapter, face) {
  if (face === 5) return [
    {speaker:bossTitles[chapter-1], text:chapter === 50 ? 'この軌道を離れる船は、俺が止める。' : 'ここの通行は俺が決める。先生の便は、ここで終わりだ。'},
    {speaker:'ブラック先生', text:'帰りを待っとる人がおる。道を開けてもらうぞ。'}
  ];
  return [
    {speaker:'軌道救難日誌', text:episodes[chapter-1]},
    {speaker:chapter % 2 ? '澪' : '翼', text:chapter % 2 ? '船外では酸素を見て。補給カプセルを出入り口の近くにも置いてきたよ。' : '噴射をやめても体は流れる。防御で姿勢を立て直してから進んで。'}
  ];
}
const ENDING = [
  {speaker:'帰還船',text:'星骸の通信が途切れ、黒星会の取引記録が宙港へ届いた。迂回していた帰還船が、ひとつずつ青い地球へ向かう。'},
  {speaker:'悠真',text:'先生、明日の一時間目って何でしたっけ。席、ちゃんと空けてありますよ。'},
  {speaker:'ブラック先生',text:'地理だ。宇宙の話なら、今日の分までしっかりあるでな。'}
];

function rng(seed) {
  return () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let mixed = Math.imul(seed ^ seed >>> 15, 1 | seed);
    mixed = mixed + Math.imul(mixed ^ mixed >>> 7, 61 | mixed) ^ mixed;
    return ((mixed ^ mixed >>> 14) >>> 0) / 4294967296;
  };
}

function makeStage(index) {
  if (!Number.isInteger(index) || index < 0 || index >= 250) {
    throw new RangeError('Stage must be 0..249');
  }
  const chapter = Math.floor(index / 5) + 1;
  const face = index % 5 + 1;
  const tier = (chapter - 1) / 49;
  const boss = face === 5;
  const random = rng(index * 8123 + 4711);
  const space = face === 2 || face === 3 || (boss && chapter % 3 !== 1);
  const terrain = space ? 'space' : 'land';
  const kind = space ? (face === 2 ? 'orbit' : 'ascent') : face === 4 ? 'vertical' : boss ? 'mixed' : 'horizontal';
  const width = kind === 'vertical' ? 1260 : kind === 'ascent' ? 3090 : kind === 'mixed' ? 3000 : 3450 + Math.floor(tier * 420);
  const levels = kind === 'vertical' ? 7 : kind === 'mixed' ? 5 : 0;
  const floors = [{level:0,x:0,y:460,w:width}];
  const platforms = [];
  const ladders = [];
  for (let level = 1; level <= levels; level++) {
    const floor = {
      x: kind === 'vertical' ? 76 : 155 + level * 350,
      y: 460 - level * 144,
      w: kind === 'vertical' ? width - 150 : 850,
      level
    };
    floors.push(floor);
    platforms.push(floor);
    const x = kind === 'vertical'
      ? (level % 2 ? 250 + random() * 130 : width - 250 - random() * 130)
      : floor.x + 105 + random() * 150;
    ladders.push({x,top:floor.y,bottom:floors[level-1].y,low:level-1,high:level});
  }
  if (kind === 'horizontal') {
    platforms.push({level:0,x:985 + random()*90,y:365,w:210}, {level:0,x:1980,y:340,w:260});
  }
  const bounds = space
    ? {top:kind === 'ascent' ? -1520 : -550,bottom:480}
    : {top:460-levels*144,bottom:460};
  const spawn = {x:100,y:space ? 350 : 460};
  const roof = floors.at(-1);
  const exit = space
    ? {x:width-140,y:kind === 'ascent' ? -1220 : 65,level:0}
    : {x:levels ? roof.x+roof.w-105 : width-130,y:roof.y,level:levels};

  const enemies = [];
  function addEnemy(x, y, level, type) {
    enemies.push({x,y,level,type,boss:false,variant:enemies.length%4,
      hp:126+Math.round(tier*70)+(type===1 ? 36 : 0)+(space ? 18 : 0),
      faction:type===2 || enemies.length%4===2 ? '黒星会' : '赤牙残党'});
  }
  if (levels) {
    for (const floor of floors) {
      const count = floor.level === 0 || floor.level % 3 === 1 ? 2 : 1;
      for (let n = 0; n < count; n++) {
        addEnemy(floor.x+305+n*255+random()*60,floor.y,floor.level,(floor.level+n+chapter)%4);
      }
    }
  } else {
    const count = 10 + Math.floor(tier * 3);
    for (let n = 0; n < count; n++) {
      const x = 430 + n * (width-820)/count + random()*46;
      const y = kind === 'ascent' ? 315-n*128+Math.sin(n+chapter)*75
        : space ? 235-n*18+Math.sin(n*1.6+chapter)*190 : 460;
      addEnemy(x,Math.max(bounds.top+65,Math.min(bounds.bottom-20,y)) + (space ? 0 : 20),0,(n+chapter)%4);
    }
  }
  if (boss) {
    enemies.push({x:space ? width-405 : roof.x+roof.w-265,y:exit.y,level:exit.level,
      type:chapter%4,boss:true,hp:610+Math.round(tier*395),variant:chapter%4,
      faction:'黒星会',name:bossTitles[chapter-1]});
  }
  const items = [{x:240,y:spawn.y,kind:'branch'}];
  if (space) {
    for (let n = 0; n < 7; n++) {
      const x = 590+n*(width-890)/7;
      const y = kind === 'ascent' ? 210-n*195 : 240-n*29+Math.sin(n+chapter)*118;
      items.push({x,y,kind:n%2 ? 'herb' : 'refill'});
      if (n === 0 || n === 3 || n === 5) items.push({x:x+75,y:y+50,kind:'pipe'});
    }
    items.push({x:width-540,y:exit.y,kind:'refill'});
  } else {
    items.push({x:655,y:460,kind:'herb'},{x:850,y:460,kind:'pipe'});
    if (levels) {
      for (const floor of floors.slice(1)) {
        const kind = ['branch','pipe','herb'][floor.level%3];
        items.push({x:floor.x+130,y:floor.y,kind});
        if (floor.level%2===0) items.push({x:floor.x+floor.w-175,y:floor.y,kind:'herb'});
      }
    } else {
      items.push({x:1500,y:460,kind:'herb'},{x:2300,y:460,kind:'herb'},{x:width-555,y:460,kind:'pipe'});
    }
  }
  const biome = Math.floor((chapter-1)/5);
  return {index,chapter,face,id:chapter+'-'+face,title:CHAPTERS[chapter-1],theme:THEMES[biome],
    biome,tier,boss,terrain,kind,width,top:bounds.top,bounds,floors,platforms,ladders,enemies,items,spawn,exit};
}

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function createGame(index){const stage=makeStage(index);return {stage,status:'playing',time:0,camera:0,cameraY:0,score:0,kills:0,combo:0,bestCombo:0,comboTime:0,events:[],particles:[],texts:[],projectiles:[],shake:0,exitHint:0,
 player:{x:stage.spawn.x,y:stage.spawn.y,vx:0,vy:0,face:1,hp:160,maxHp:160,grounded:true,level:0,climbing:null,attack:0,attackCd:0,invuln:1,stun:0,comboStep:0,comboReset:0,weapon:null,durability:0,energy:15,guard:false,walk:0,jumps:0,drop:0,herbs:2,healCd:0,coyote:.1,resource:100,boostCd:0,boostTimer:0,aim:0},
 enemies:stage.enemies.map((e,i)=>({...e,id:i,vy:0,vx:0,face:-1,maxHp:e.hp,dead:false,attack:0,cooldown:.35+i*.07,windup:0,stun:0,flash:0,walk:0,death:0,grounded:true,climbing:null,mode:0})),items:stage.items.map(i=>({...i,taken:false})),previous:{}};}
function event(g,type,data={}){g.events.push({type,...data});}
function text(g,x,y,label,color='#ffe2a4'){g.texts.push({x,y,label,color,life:.85});}
function burst(g,x,y,color,n=10){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=75+Math.random()*200;g.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-65,life:.25+Math.random()*.25,color,size:2+Math.random()*4});}}
function land(e,oldY,g){e.grounded=false;if(e.vy<0)return;let floor=460,level=0;if(!(e.drop>0)){for(const f of g.stage.platforms)if(e.x>f.x-10&&e.x<f.x+f.w+10&&oldY<=f.y+2&&f.y<floor){floor=f.y;level=f.level;}}
 if(e.y>=floor){e.y=floor;e.vy=0;e.grounded=true;e.level=level;e.jumps=0;}}
function ladderStep(e,ladder,direction,speed,dt){e.x=ladder.x;e.vy=0;e.grounded=false;e.y+=direction*speed*dt;e.walk+=dt*9;
 if(e.y<=ladder.top){e.y=ladder.top;e.level=ladder.high;e.climbing=null;e.grounded=true;e.jumps=0;}
 else if(e.y>=ladder.bottom){e.y=ladder.bottom;e.level=ladder.low;e.climbing=null;e.grounded=true;e.jumps=0;}}
function damagePlayer(g,e,damage=null){const p=g.player;if(g.status!=='playing'||p.invuln>0||p.hp<=0)return;const front=(e.x-p.x)*p.face>=0,block=p.guard&&front&&(p.grounded||g.stage.terrain!=='land');let value=damage!==null?damage:(e.boss?31+Math.floor(g.stage.tier*9):20+Math.floor(g.stage.tier*7)+(e.type===1?4:0));if(block)value=3;
 p.hp=Math.max(0,p.hp-value);p.invuln=block?.2:.68;p.stun=block?0:.15;p.x=clamp(p.x+Math.sign(p.x-e.x)*(block?5:20),25,g.stage.width-45);g.shake=block?3:8;burst(g,p.x,p.y-65,block?'#8fe7db':'#ff6b70');text(g,p.x,p.y-120,block?'防御':`−${value}`,block?'#8ee0d9':'#ff8a82');event(g,block?'guard':'hurt');if(p.hp===0){g.status='gameover';event(g,'gameover');}}
function hitEnemy(g,e,damage,knock=1){if(e.dead||g.status!=='playing')return;const p=g.player,armored=e.boss||e.type===1;e.hp=Math.max(0,e.hp-damage);e.flash=.13;e.stun=armored?(knock>=3?.5:0):.22;if(!armored||knock>=3)e.windup=0;
 const f=g.stage.floors[e.level]||g.stage.floors[0];e.x=clamp(e.x+p.face*(armored?6:15)*knock,f.x+28,f.x+f.w-28);g.combo++;g.bestCombo=Math.max(g.combo,g.bestCombo);g.comboTime=2;g.score+=damage*10;p.energy=clamp(p.energy+5,0,100);g.shake=e.boss?7:4;burst(g,e.x,e.y-65,'#ffd59e');text(g,e.x,e.y-115,`${damage}`);event(g,'hit');
 if(e.hp<=0){e.dead=true;e.death=.55;g.kills++;g.score+=e.boss?4000:450;text(g,e.x,e.y-150,e.boss?'決着！':'撃破！',e.boss?'#ff7e72':'#8de6d9');burst(g,e.x,e.y-65,'#ff6868',18);event(g,'defeat',{boss:e.boss});if(e.boss)finishStage(g);if(!e.boss&&e.id%3===1)g.items.push({x:e.x,y:e.y,kind:'herb',taken:false});}}
function pickup(g){const p=g.player,near=g.items.filter(i=>!i.taken&&i.kind!=='refill'&&Math.abs(i.x-p.x)<95&&Math.abs(i.y-p.y)<65&&(i.kind!=='herb'||p.herbs<4)).sort((a,b)=>Math.abs(a.x-p.x)-Math.abs(b.x-p.x))[0];if(!near){text(g,p.x,p.y-110,'近くの道具を拾う','#c7d5d0');return false;}near.taken=true;if(near.kind==='herb'){p.herbs=Math.min(4,p.herbs+1);text(g,p.x,p.y-115,'薬草 +1','#9ce1a5');}else{if(p.weapon)g.items.push({x:p.x-25,y:p.y,kind:p.weapon,durability:p.durability,taken:false});p.weapon=near.kind;p.durability=near.durability!==undefined?near.durability:(near.kind==='pipe'?20:14);text(g,p.x,p.y-115,near.kind==='pipe'?'鉄棒を装備':'木の枝を装備');}event(g,'pickup');return true;}
function heal(g){const p=g.player;if(g.status!=='playing'||p.herbs<=0||p.hp>=p.maxHp||p.healCd>0)return false;p.herbs--;p.hp=Math.min(p.maxHp,p.hp+55);p.healCd=1.25;text(g,p.x,p.y-130,'薬草 +55','#9deaac');burst(g,p.x,p.y-65,'#91dda5',16);event(g,'pickup');return true;}
function attack(g){const p=g.player;if(g.status!=='playing'||p.attackCd>0||p.stun>0||p.climbing)return false;p.comboStep=p.comboReset>0?(p.comboStep+1)%3:0;p.comboReset=.95;p.attack=.23;p.attackCd=p.weapon==='pipe'?.38:.27;const finisher=p.comboStep===2,reach=p.weapon==='pipe'?151:p.weapon==='branch'?130:94,damage=(p.weapon==='pipe'?47:p.weapon==='branch'?37:27)+(finisher?19:0)+(p.grounded?0:9);let hit=false;for(const e of g.enemies)if(!e.dead&&(e.x-p.x)*p.face>-22&&(e.x-p.x)*p.face<reach+18&&(Math.abs(e.y-p.y)<94||p.aim&&Math.abs(e.y-p.y)<150&&Math.abs(e.x-p.x)<72)){hitEnemy(g,e,damage,finisher?1.8:1);hit=true;}if(p.weapon&&--p.durability<=0){p.weapon=null;text(g,p.x,p.y-150,'道具が壊れた！');event(g,'break');}event(g,'swing',{hit});return true;}
function special(g){const p=g.player;if(g.status!=='playing'||p.energy<100||p.stun>0)return false;p.energy=0;p.invuln=1.1;p.attack=.5;p.attackCd=.6;g.shake=14;for(const e of g.enemies)if(!e.dead&&Math.abs(e.x-p.x)<290&&Math.abs(e.y-p.y)<145)hitEnemy(g,e,130,3);g.projectiles=g.projectiles.filter(b=>Math.abs(b.x-p.x)>350);burst(g,p.x,p.y-65,'#89f2dc',48);text(g,p.x,p.y-175,'星軌道・熱血指導！','#b3fff1');event(g,'special');return true;}
function throwShot(g,e){const dx=g.player.x-e.x,dy=g.player.y-e.y,len=Math.max(1,Math.hypot(dx,dy)),speed=e.boss?420:330;g.projectiles.push({x:e.x+e.face*35,y:e.y-70,vx:dx/len*speed,vy:dy/len*speed,life:4,source:e.id,damage:e.boss?23:16,face:e.face});event(g,'throw');}
function updateEnemy(g,e,dt){if(e.dead){e.death=Math.max(0,e.death-dt);return;}if(g.stage.terrain!=='land'){updateFreeEnemy(g,e,dt);return;}const p=g.player;for(const k of ['flash','stun','attack'])e[k]=Math.max(0,e[k]-dt);e.cooldown-=dt;const dx=p.x-e.x,dist=Math.abs(dx),yd=Math.abs(p.y-e.y);e.face=dx>=0?1:-1;e.vx=0;
 if(e.climbing){ladderStep(e,e.climbing.ladder,e.climbing.dir,165,dt);return;}
 if(e.stun<=0&&dist<1000&&yd<470&&g.status==='playing'){
  if(e.level!==p.level&&yd>85&&g.stage.ladders.length){const direction=p.level>e.level?-1:1,ladder=g.stage.ladders.find(l=>direction<0?l.low===e.level:l.high===e.level);if(ladder){const step=ladder.x-e.x;if(Math.abs(step)<13){e.climbing={ladder,dir:direction};ladderStep(e,ladder,direction,165,dt);return;}else{e.vx=Math.sign(step)*(e.boss?155:168);e.x+=e.vx*dt;e.walk+=dt*10;}}}
  else{const ranged=e.type===2,reach=e.boss?(ranged?420:145):ranged?360:e.type===1?99:78;
   if(e.windup>0){e.windup-=dt;if(e.windup<=0){e.attack=.28;if(ranged&&dist>115)throwShot(g,e);else{if(e.boss&&e.type===1){const f=g.stage.floors[e.level];e.x=clamp(e.x+e.face*65,f.x+30,f.x+f.w-30);}if(Math.abs(p.x-e.x)<reach+22&&Math.abs(p.y-e.y)<82)damagePlayer(g,e);if(e.boss&&e.type===0){g.shake=9;burst(g,e.x,e.y-4,'#edbe8a',20);}}e.cooldown=e.boss?.95:1.03+(e.id%3)*.09;}}
   else if(dist<reach&&yd<85&&e.cooldown<=0){e.windup=e.boss?.47:e.type===1?.48:ranged?.43:.29;event(g,'warning',{boss:e.boss});}
   else if(dist>reach*.78&&e.attack<=0){e.vx=e.face*(e.boss?195:205+e.type*8+g.stage.tier*30);e.x+=e.vx*dt;e.walk+=dt*11;}
   if(e.type===3&&e.cooldown<-.25&&dist>130&&dist<350&&e.grounded){e.vy=-460;e.grounded=false;e.cooldown=.2;}
  }
 }
 const floor=g.stage.floors[e.level]||g.stage.floors[0];if(e.level>0)e.x=clamp(e.x,floor.x+25,floor.x+floor.w-25);else e.x=clamp(e.x,30,g.stage.width-45);const oldY=e.y;e.vy+=1630*dt;e.y+=e.vy*dt;land(e,oldY,g);
}
function freeMotion(g, dt, input) {
  const p = g.player;
  const horizontal = Number(!!input.right) - Number(!!input.left);
  const vertical = Number(!!input.down) - Number(!!input.up);
  const thrust = Math.hypot(horizontal, vertical);
  p.guard = !!input.guard && p.attack <= 0;
  p.climbing = null;
  p.grounded = false;
  p.level = 0;
  if (horizontal) p.face = horizontal;

  if (thrust && p.stun <= 0) {
    p.vx += horizontal / thrust * 1830 * dt;
    p.vy += vertical / thrust * 1830 * dt;
  }
  if (input.jump && !g.previous.jump && p.boostCd <= 0 && p.resource >= 9 && p.stun <= 0) {
    const directionX = thrust ? horizontal / thrust : p.face;
    const directionY = thrust ? vertical / thrust : 0;
    p.vx = directionX * 565;
    p.vy = directionY * 565;
    p.boostCd = 1.12;
    p.boostTimer = .25;
    p.invuln = Math.max(p.invuln, .19);
    p.resource -= 8;
    event(g, 'jump');
    text(g, p.x, p.y-140, '緊急噴射', '#afe8ff');
  }
  const damping = Math.exp(-dt * (p.guard ? 12 : 2));
  p.vx *= damping;
  p.vy *= damping;
  const speed = Math.hypot(p.vx, p.vy);
  const limit = p.boostTimer > 0 ? 565 : p.guard ? 145 : 344;
  if (speed > limit) {
    p.vx *= limit / speed;
    p.vy *= limit / speed;
  }
  const nextX = p.x + p.vx * dt;
  const nextY = p.y + p.vy * dt;
  p.x = clamp(nextX, 25, g.stage.width-45);
  p.y = clamp(nextY, g.stage.bounds.top, g.stage.bounds.bottom);
  if (p.x !== nextX) p.vx = 0;
  if (p.y !== nextY) p.vy = 0;
  p.walk += dt * (p.boostTimer > 0 ? 18 : 8);
  p.resource = Math.max(0, p.resource - dt * (thrust ? 1.28 : 1.03));
  if (p.resource < 25 && !g.resourceWarn) {
    g.resourceWarn = true;
    text(g, p.x, p.y-175, '酸素低下！補給カプセルへ', '#ffcf8a');
  }
  if (p.resource === 0) {
    g.pressure = (g.pressure || 0) + dt;
    if (g.pressure >= 1) {
      g.pressure = 0;
      const wasGuarding = p.guard;
      p.guard = false;
      damagePlayer(g, {x:p.x-1,type:0}, 12);
      p.guard = wasGuarding;
    }
  }
}
function updateFreeEnemy(g,e,dt){
 const p=g.player;for(const k of ['flash','stun','attack'])e[k]=Math.max(0,e[k]-dt);e.cooldown-=dt;
 const dx=p.x-e.x,dy=p.y-e.y,dist=Math.hypot(dx,dy);e.face=dx>=0?1:-1;e.vx=0;
 if(e.stun>0||dist>1050||g.status!=='playing')return;
 const ranged=e.type===2,reach=ranged?370:e.boss?150:e.type===1?113:92;
 if(e.windup>0){e.windup-=dt;if(e.windup<=0){e.attack=.28;if(ranged&&dist>135){throwShot(g,e);if(e.boss&&e.hp<e.maxHp*.5){throwShot(g,{...e,y:e.y-45});throwShot(g,{...e,y:e.y+45});}}else{if(e.boss&&e.type===1){e.x=clamp(e.x+dx/Math.max(1,dist)*65,30,g.stage.width-50);e.y=clamp(e.y+dy/Math.max(1,dist)*65,g.stage.bounds.top+15,g.stage.bounds.bottom-15);}if(Math.abs(p.x-e.x)<reach+24&&Math.abs(p.y-e.y)<98)damagePlayer(g,e);}e.cooldown=e.boss?.78:.9+(e.id%3)*.08;}}
 else if(dist<reach&&Math.abs(dy)<95&&e.cooldown<=0){e.windup=e.boss?.46:e.type===1?.48:ranged?.44:.3;event(g,'warning',{boss:e.boss});}
 else if(e.attack<=0){const speed=220+(e.type===3?35:0)+(e.boss?15:0)+g.stage.tier*28;const moveX=dist>reach*.75?dx:0,moveY=Math.abs(dy)>22?dy:0,norm=Math.max(1,Math.hypot(moveX,moveY));e.vx=moveX/norm*speed;e.x=clamp(e.x+e.vx*dt,35,g.stage.width-55);e.y=clamp(e.y+moveY/norm*speed*dt,g.stage.bounds.top+20,g.stage.bounds.bottom-20);e.walk+=dt*9;}
}
function finishStage(g) {
  if (g.status !== 'playing') return;
  g.status = 'clear';
  const hp = g.player.hp;
  g.stars = hp >= 100 ? 3 : hp >= 50 ? 2 : 1;
  g.score += Math.round(hp * 20) + Math.max(0, 2400 - Math.floor(g.time) * 6);
  event(g, 'clear');
}
function updateGame(g,dt,input={}){if(g.status!=='playing')return;dt=clamp(dt,0,.04);const p=g.player;g.time+=dt;g.shake=Math.max(0,g.shake-dt*36);g.comboTime-=dt;if(g.comboTime<=0)g.combo=0;for(const k of ['attack','attackCd','invuln','stun','comboReset','drop','healCd','boostCd','boostTimer'])p[k]=Math.max(0,p[k]-dt);p.coyote=p.grounded?.1:Math.max(0,p.coyote-dt);
 p.aim=input.up?-1:input.down?1:0;
 if(g.stage.terrain==='land'){
 const jump=!!input.jump&&!g.previous.jump,dir=(input.right?1:0)-(input.left?1:0);p.guard=!!input.guard&&p.grounded&&p.attack<=0&&!p.climbing;p.vx=p.stun>0?0:dir*(p.guard?100:305);if(dir&&p.stun<=0){p.face=dir;p.walk+=dt*12;}else p.walk=0;
 let climbing=false;if(jump&&p.climbing)p.climbing=null;
 if((input.up||input.down)&&p.stun<=0&&!jump&&!dir){const ladder=g.stage.ladders.find(l=>Math.abs(l.x-p.x)<37&&p.y>=l.top-6&&p.y<=l.bottom+8&&(input.up?p.y>l.top+2:p.y<l.bottom-2));if(ladder)p.climbing={ladder,dir:input.up?-1:1};}
 if(p.climbing&&!jump){if(dir)p.climbing=null;else{const direction=input.up?-1:input.down?1:0;ladderStep(p,p.climbing.ladder,direction,225,dt);climbing=true;}}
 if(!climbing){p.x=clamp(p.x+p.vx*dt,25,g.stage.width-45);if(jump&&p.stun<=0){if(input.down&&p.grounded&&p.y<459){p.drop=.25;p.y+=7;p.grounded=false;}else if(p.grounded||p.coyote>0||p.jumps<2){p.vy=-650;p.grounded=false;p.jumps=p.coyote>0?1:p.jumps+1;p.coyote=0;event(g,'jump');}}const oldY=p.y;p.vy+=1630*dt;p.y+=p.vy*dt;land(p,oldY,g);}
 }else freeMotion(g,dt,input);
 if(input.pick&&!g.previous.pick)pickup(g);if(input.heal&&!g.previous.heal)heal(g);if(input.special&&!g.previous.special)special(g);if(input.attack&&!p.guard)attack(g);
 for(const e of g.enemies)updateEnemy(g,e,dt);
 for(const b of g.projectiles){b.x+=b.vx*dt;b.y+=(b.vy||0)*dt;b.life-=dt;if(Math.abs(b.x-p.x)<25&&Math.abs(b.y-(p.y-68))<45){damagePlayer(g,{...b,x:b.x-b.face*20},b.damage);b.life=0;}}
 g.projectiles=g.projectiles.filter(b=>b.life>0&&b.x>0&&b.x<g.stage.width);
 for(const i of g.items)if(!i.taken&&i.kind==='herb'&&p.herbs<4&&Math.abs(i.x-p.x)<29&&Math.abs(i.y-p.y)<45){i.taken=true;p.herbs++;text(g,p.x,p.y-110,'薬草 +1','#a7e8af');event(g,'pickup');}
 for(const i of g.items)if(!i.taken&&i.kind==='refill'&&Math.hypot(i.x-p.x,i.y-p.y)<55&&p.resource<100){i.taken=true;p.resource=Math.min(100,p.resource+68);g.pressure=0;g.resourceWarn=p.resource<25;text(g,p.x,p.y-130,'酸素補給 +68','#a6eff5');event(g,'pickup');}
 for(const f of g.particles){f.x+=f.vx*dt;f.y+=f.vy*dt;f.vy+=620*dt;f.life-=dt;}g.particles=g.particles.filter(f=>f.life>0);for(const t of g.texts){t.y-=38*dt;t.life-=dt;}g.texts=g.texts.filter(t=>t.life>0);
 const remaining=g.enemies.filter(e=>!e.dead).length,ex=g.stage.exit;if(remaining===0&&g.exitHint===0){g.exitHint=1;text(g,p.x,p.y-155,g.stage.terrain!=='land'?'目的地へ進め →':g.stage.kind==='horizontal'?'出口へ →':'上の出口へ ↑','#a8efde');event(g,'gate');}
 if(g.status==='playing'&&(g.stage.boss&&g.enemies.some(e=>e.boss&&e.dead)||remaining===0&&Math.abs(p.x-ex.x)<85&&Math.abs(p.y-ex.y)<65)){finishStage(g);}
 const vw=g.viewWidth||960;g.camera=clamp(p.x-vw*.38,0,Math.max(0,g.stage.width-vw));g.cameraY=g.stage.terrain==='land'?clamp(p.y-385,Math.min(0,g.stage.top-210),0):clamp(p.y-355,g.stage.bounds.top-160,Math.max(0,g.stage.bounds.bottom-460));g.previous={...input};
}

function drawExploration(g,a){
 const {C,W,H,clock,rect,line,poly,circle,label,rounded,drawStation,drawPerson,weaponShape}=a;
 const s=g.stage,p=g.player,cx=g.camera,cy=g.cameraY;
 if(s.kind==='horizontal')drawStation(a,s,cx);
 else{
  const grad=C.createLinearGradient(0,0,0,H);grad.addColorStop(0,s.theme.sky[0]);grad.addColorStop(.65,s.theme.sky[1]);grad.addColorStop(1,s.theme.sky[2]);C.fillStyle=grad;C.fillRect(0,0,W,H);
  circle(W*.77-cx*.04,115-cy*.025,40,'#cdded3');circle(W*.77-cx*.04-12,105-cy*.025,39,s.theme.sky[0]);
  for(let i=-1;i<Math.ceil(W/140)+2;i++){const x=i*140-(cx*.17)%140,r=rng(i*78+1000+s.biome),top=170+r()*180-cy*.1;rect(x,top,130,H-top,s.theme.back);for(let y=top+18;y<H;y+=31)for(let wx=x+10;wx<x+120;wx+=26)if(r()>.25)rect(wx,y,9,13,'#b5d3c129');}
  for(const f of s.floors.slice(1)){const x=f.x-cx,y=f.y-cy;if(x>W+100||x+f.w<-100||y>H+200||y+160<-50)continue;rect(x+14,y+10,f.w-28,145,'#23313ccf');rect(x+24,y+25,f.w-48,105,'#38425388');for(let wx=x+45;wx<x+f.w-30;wx+=67){rect(wx,y+37,35,62,'#68848144');line(wx+17,y+37,wx+17,y+100,'#283b44',2);}label(`${String(f.level).padStart(2,'0')} / ${f.level===s.floors.length-1?'UPPER DECK':'救難区画'}`,x+30,y+128,11,s.theme.accent);}
  const street=460-cy;if(street<H+60){rect(0,street,W,H-street,s.theme.ground);rect(0,street,W,7,'#98a69b');for(let i=0;i<12;i++)line(i*130-cx%130,street+40,i*130+65-cx%130,street+40,'#a6b4a02a',2);}
  for(let n=0;n<16;n++){const x=(n*139+clock*15-cx*.2)%(W+20),y=(n*87+clock*48-cy*.1)%H;line(x,y,x-3,y+8,'#a4d8d72b',1);}
 }
 for(const f of s.platforms){const x=f.x-cx,y=f.y-cy;if(x>W+100||x+f.w<-100||y>H+100||y<-70)continue;if(s.kind==='horizontal'){rect(x,y+5,f.w,460-f.y,'#344751');for(let q=0;q<f.w;q+=42){rect(x+q+3,y+10,35,460-f.y-15,'#526467');line(x+q+5,y+15,x+q+30,452,'#a2ac8660',2);}}else{rect(x+2,y+5,f.w-4,20,'#2b3946');for(let q=0;q<f.w;q+=65)line(x+q,y+6,x+q+30,y+24,'#5e7a7e',2);line(x,y+25,x+f.w,y+25,'#152630',3);}
  rect(x-4,y,f.w+8,7,'#adc1ab');rect(x,y+7,f.w,3,'#20313b');}
 for(const l of s.ladders){const x=l.x-cx,top=l.top-cy,bottom=l.bottom-cy;if(x<-35||x>W+35||bottom<-40||top>H+40)continue;line(x-14,top-20,x-14,bottom,'#263942',7);line(x+14,top-20,x+14,bottom,'#263942',7);line(x-14,top-20,x-14,bottom,'#9fbcb4',3);line(x+14,top-20,x+14,bottom,'#9fbcb4',3);for(let y=top-5;y<bottom;y+=17)line(x-14,y,x+14,y,'#b1c4ab',3);label('↑',x,top-32,21,'#9bedd7','center');if(Math.abs(p.x-l.x)<40&&p.y>=l.top-5&&p.y<=l.bottom+8){rounded(x-55,p.y-cy-165,110,22,2,'#112631db','#7acbb280');label('↑ 上る / ↓ 下りる',x,p.y-cy-149,9,'#b6f1dc','center');}}
 const ex=s.exit,gx=ex.x-cx,gy=ex.y-cy,open=g.enemies.every(e=>e.dead);if(gx>-100&&gx<W+100&&gy>-10&&gy<H+180){rect(gx-35,gy-135,70,135,'#1b2e3d');line(gx-40,gy-140,gx+40,gy-140,'#9abeb1',7);line(gx-36,gy-140,gx-36,gy,'#78978f',5);line(gx+36,gy-140,gx+36,gy,'#78978f',5);if(!open&&!s.boss)for(let i=0;i<5;i++)line(gx-26+i*13,gy-130,gx-26+i*13,gy,'#5f7e7b',3);label(s.boss?'BOSS':'EXIT',gx,gy-155,14,s.boss?'#ff8b82':'#a4eed8','center');if(open){label('→',gx,gy-55,35,'#afffe5','center');circle(gx,gy-65,43,'#8fffe21c');}}
 for(const item of g.items){if(item.taken)continue;const x=item.x-cx,y=item.y-cy;if(x<-60||x>W+60||y<-30||y>H+80)continue;const bob=Math.sin(clock*3+item.x)*3;C.save();C.translate(x,y+bob);C.fillStyle=item.kind==='herb'?'#8ed5a440':'#a7e4db30';C.beginPath();C.ellipse(0,0,23,5,0,0,Math.PI*2);C.fill();if(item.kind==='herb'){line(0,-4,0,-29,'#b8e5a1',2);poly([[0,-15],[-15,-18],[-17,-29],[-6,-29],[0,-20]],'#74bb8e','#314f44',1);poly([[0,-22],[10,-34],[19,-31],[15,-20],[0,-15]],'#a0d6a1','#314f44',1);}else weaponShape(item.kind,0,-12,1.15,.68);C.restore();if(Math.abs(item.x-p.x)<95&&Math.abs(item.y-p.y)<65){rounded(x-40,y-65,80,21,2,'#152833e6','#8bb9a577');label(item.kind==='herb'?'薬草 / Qで回復':`E ${item.kind==='pipe'?'鉄棒':'木の枝'}`,x,y-50,9,'#d0efd4','center');}}
 const actors=[...g.enemies,p].sort((a,b)=>a.y-b.y);for(const e of actors){const x=e.x-cx,y=e.y-cy;if(x<-160||x>W+160||y<-30||y>H+230||e.dead&&e.death<=0)continue;const isPlayer=e===p;if(e.windup>0){C.globalAlpha=.22;rect(x-65,y-5,130,8,'#ff6d70');C.globalAlpha=1;}drawPerson(e,x,y,isPlayer?1.06:e.boss?1.34:1,isPlayer);if(e.climbing){line(x-22,y-98,x-14,y-119,'#e9cfb3',4);line(x+17,y-84,x+24,y-108,'#e9cfb3',4);}if(!isPlayer&&!e.dead){const head=y-(e.boss?202:151);if(e.hp<e.maxHp){rect(x-24,head,48,4,'#152633');rect(x-24,head,48*e.hp/e.maxHp,4,e.boss?'#f58878':'#a4d9bb');}if(e.type===1)label('◆',x,head-7,9,'#e5bd8b','center');if(e.type===2)label('黒星',x,head-7,8,'#d7bad5','center');}}
 for(const b of g.projectiles){const x=b.x-cx,y=b.y-cy;line(x-b.face*20,y,x,y,'#ffe3a880',3);poly([[x-7,y],[x,y-5],[x+7,y],[x,y+5]],'#ffd596','#493a44',1);}
 for(const f of g.particles){C.globalAlpha=Math.min(1,f.life*4);rect(f.x-cx,f.y-cy,f.size,f.size,f.color);}C.globalAlpha=1;for(const t of g.texts){C.globalAlpha=Math.min(1,t.life*3);label(t.label,t.x-cx,t.y-cy,14,t.color,'center',900);}C.globalAlpha=1;
 if(p.attack>.28){C.strokeStyle=`rgba(130,255,219,${p.attack*1.5})`;C.lineWidth=6;C.beginPath();C.arc(p.x-cx,p.y-cy-65,(.6-p.attack)*450,0,Math.PI*2);C.stroke();}
 const alive=g.enemies.filter(e=>!e.dead);if(alive.length&&g.time>3){const nearest=alive.reduce((a,b)=>Math.abs(a.x-p.x)+Math.abs(a.y-p.y)<Math.abs(b.x-p.x)+Math.abs(b.y-p.y)?a:b),dx=nearest.x-p.x,dy=nearest.y-p.y;if(Math.abs(dy)>190||nearest.x<cx+30||nearest.x>cx+W-30)label(`${dy<-150?'↑':dy>150?'↓':dx>0?'→':'←'} 敵 ${Math.round((Math.abs(dx)+Math.abs(dy))/10)} m`,dx>0?W-35:35,260,11,'#c6ecdd',dx>0?'right':'left');}
 // Compact route diagram shows the player's floor and the exit in tall stages.
 if(s.ladders.length){const mx=W-28,my=H-130;line(mx,my-100,mx,my,'#9bc6b355',3);for(let i=0;i<s.floors.length;i++)circle(mx,my-i*100/(s.floors.length-1),i===p.level?4:2,i===p.level?'#adffe0':'#699b8b');label(`${p.level}F`,mx-9,my-115,10,'#b8f2d6','right');}
}


function starfield(art, theme, cameraX=0, cameraY=0) {
  const {C,W,H,clock,rect,circle,line,poly} = art;
  const sky = C.createLinearGradient(0,0,W,H);
  sky.addColorStop(0,theme.sky[0]);
  sky.addColorStop(.65,theme.sky[1]);
  sky.addColorStop(1,'#080d1b');
  C.fillStyle = sky;
  C.fillRect(0,0,W,H);
  const random = rng(9241);
  for (let i=0;i<108;i++) {
    const x = ((random()*W-cameraX*(i%3+1)*.07)%W+W)%W;
    const y = ((random()*H-cameraY*(i%3+1)*.05)%H+H)%H;
    const light = .22 + random()*.48 + Math.sin(clock*1.8+i)*.09;
    C.globalAlpha = light;
    rect(x,y,i%13===0 ? 2 : 1.3,i%13===0 ? 2 : 1.3,i%4 ? '#e2f3ff' : theme.accent);
  }
  C.globalAlpha = 1;
  const radius = Math.min(W*.31,252);
  const planetX = W*.78-cameraX*.07;
  const planetY = H*.39-cameraY*.095;
  const glow = C.createRadialGradient(planetX,planetY,radius*.72,planetX,planetY,radius*1.38);
  glow.addColorStop(0,theme.planet);
  glow.addColorStop(1,'#15204a00');
  circle(planetX,planetY,radius*1.38,glow);
  const surface = C.createLinearGradient(planetX-radius,planetY-radius,planetX+radius,planetY+radius);
  surface.addColorStop(0,theme.planet);
  surface.addColorStop(.55,theme.sky[1]);
  surface.addColorStop(1,'#090d1c');
  circle(planetX,planetY,radius,surface,theme.accent+'66',1.5);
  C.save();
  C.beginPath();
  C.arc(planetX,planetY,radius,0,Math.PI*2);
  C.clip();
  for (let band=0;band<7;band++) {
    const y=planetY-radius*.62+band*radius*.22;
    poly([[planetX-radius,y-radius*.13],[planetX-radius*.08,y+radius*.09],
      [planetX+radius,y-radius*.16],[planetX+radius,y-radius*.02],
      [planetX-radius*.12,y+radius*.22],[planetX-radius,y+radius*.03]],
      band%2 ? theme.planet+'25' : theme.accent+'16',null);
  }
  C.restore();
  C.save();
  C.translate(planetX,planetY+radius*.12);
  C.rotate(-.26);
  C.strokeStyle=theme.accent+'52';
  C.lineWidth=radius*.075;
  C.beginPath();
  C.ellipse(0,0,radius*1.6,radius*.27,0,.03,Math.PI-.03);
  C.stroke();
  C.restore();
  for(let i=0;i<5;i++) {
    const offset=((i*225-cameraX*.27)% (W+280)+W+280)%(W+280);
    const y=70+i*109-cameraY*.18;
    line(offset-55,y,offset+26,y-29,'#88aed02b',2);
  }
}

function drawStation(art, stage, camera) {
  const {C,W,H,clock,rect,line,rounded}=art;
  starfield(art,stage.theme,camera);
  rect(0,0,W,72,'#121b2d');
  rect(0,66,W,15,'#283851');
  rect(0,430,W,110,'#162337');
  const offset=camera%270;
  for(let i=-1;i<Math.ceil(W/270)+2;i++){
    const x=i*270-offset;
    rect(x,73,21,360,'#26364f');
    line(x+21,82,x+21,433,'#7894a6',2);
    rect(x+23,394,247,42,'#26364c');
    rounded(x+34,410,46,6,2,stage.theme.accent+'88','#22384e');
    line(x+22,437,x+270,437,'#536a83',2);
    rect(x+28,457,212,3,'#7895ad');
    line(x+14,532,x+43,472,'#4d678459',2);
  }
  line(0,460,W,460,'#a6bdcd',3);
  line(0,505,W,505,'#314b67',2);
  for(let i=0;i<7;i++){
    const x=(i*157+clock*7-camera*.13)%W;
    rect(x,14+i%2*14,65,2,'#85bed945');
  }
  C.globalAlpha=1;
}

function drawSuit(art, actor, x, y, scale, isPlayer, title=false) {
  const {C,rect,rounded,poly,line,circle,clock,drawPerson}=art;
  const face=actor.face||1;
  C.save();
  C.translate(x,y);
  C.scale(scale*face,scale);
  rounded(-42,-94,30,59,7,'#223c59','#7299b9');
  rect(-42,-84,12,29,'#6983a2');
  const exhaust=actor.boostTimer>0 ? 55 : Math.min(35,Math.hypot(actor.vx||0,actor.vy||0)*.1);
  if(exhaust>3||title){
    const length=(title ? 24 : exhaust)+Math.sin(clock*35)*4;
    poly([[-40,-39],[-27,-39],[-36,-39+length]],'#79d7f8',null);
    poly([[-37,-39],[-30,-39],[-35,-40+length*.72]],'#d9fbff',null);
  }
  C.restore();
  drawPerson(actor,x,y,scale,isPlayer,title);
  C.save();
  C.translate(x,y);
  C.scale(scale*face,scale);
  const helmetY=isPlayer ? -111 : -104;
  circle(0,helmetY,29,'#80c5e821','#a2d1e5',2);
  line(-19,helmetY-18,-8,helmetY-22,'#f1fcff',2);
  rounded(-26,helmetY+19,51,6,3,'#4b718e','#7fa1bc');
  rect(-31,-67,8,17,isPlayer?'#99eced':'#efaa91');
  C.restore();
}

function drawSpaceTitle(art, theme) {
  starfield(art,theme);
  const {W,H,rect,line,rounded,label,poly}=art;
  const x=W*.77;
  rect(W*.49,H*.82,W*.51,4,'#789baf');
  poly([[W*.47,H*.82],[W,H*.82],[W,H],[W*.56,H]],'#263950','#547087',2);
  for(let i=0;i<12;i++)line(W*.51+i*W*.05,H*.84,W*.55+i*W*.06,H,'#8fb0ca33',1.5);
  rounded(W*.5,130,174,11,4,'#7eaed022','#8ab6d34d');
  label('軌道救難ステーション',W*.5,119,10,'#a2c9e0aa');
  drawSuit(art,{face:-1,walk:0,guard:false,attack:0},x,H*.87,2.86,true,true);
}

function supply(art,item,x,y) {
  const {C,rect,line,circle,rounded,poly,label,weaponShape}=art;
  if(item.kind==='refill'){
    rounded(x-15,y-39,30,39,8,'#284459','#8de0ed');
    rect(x-6,y-45,12,8,'#89bbc9');
    label('O₂',x,y-12,12,'#e2fbff','center');
    circle(x,y-24,26,'#80e8ef14');
  }else if(item.kind==='herb'){
    line(x,y-2,x,y-33,'#a1e3ad',2.5);
    poly([[x,y-13],[x-20,y-26],[x-12,y-34],[x,y-24]],'#78ca98','#264c4a',1);
    poly([[x,y-16],[x+14,y-35],[x+21,y-30],[x+9,y-15]],'#c1dfa3','#264c4a',1);
  }else{
    C.save();
    weaponShape(item.kind,x,y-7,1.06,.73);
    C.restore();
  }
}

function drawFronts(game, art) {
  if(game.stage.terrain==='land'){
    drawExploration(game,art);
    return;
  }
  const {C,W,H,clock,rect,line,circle,rounded,label,poly}=art;
  const {stage,player,camera,cameraY}=game;
  starfield(art,stage.theme,camera,cameraY);
  for(let i=0;i<8;i++){
    const x=470+i*405-camera;
    const y=320-i*(stage.kind==='ascent'?166:32)-cameraY;
    if(x<-180||x>W+180||y<-90||y>H+90)continue;
    poly([[x-75,y+12],[x+69,y],[x+54,y+20],[x-58,y+34]],'#304d66','#7499ae',2);
    rect(x-28,y+15,58,9,'#172b41');
    line(x-50,y+13,x+42,y+6,stage.theme.accent+'77',2);
  }
  for(const item of game.items) {
    if(item.taken)continue;
    const x=item.x-camera,y=item.y-cameraY+Math.sin(clock*3+item.x)*4;
    if(x<-80||x>W+80||y<-50||y>H+80) continue;
    supply(art,item,x,y);
    if(Math.abs(item.x-player.x)<95&&Math.abs(item.y-player.y)<65){
      rounded(x-48,y-68,96,20,3,'#0d1d32e3','#75bacc88');
      const name={refill:'酸素カプセル',herb:'薬草',branch:'E 木の枝',pipe:'E 鉄棒'}[item.kind];
      label(name,x,y-54,9,'#d9eff6','center');
    }
  }
  const gateX=stage.exit.x-camera,gateY=stage.exit.y-cameraY;
  if(gateX>-110&&gateX<W+110&&gateY>0&&gateY<H+175){
    rounded(gateX-52,gateY-137,104,137,8,'#172a42',stage.theme.accent);
    rounded(gateX-34,gateY-112,68,96,5,'#223e55','#6fa9bf');
    label(stage.boss?'BOSS':'帰還ドック',gateX,gateY-153,12,stage.theme.accent,'center');
    if(game.enemies.every(enemy=>enemy.dead))label('→',gateX,gateY-52,35,'#bdf5fe','center');
  }
  for(const entity of [...game.enemies,player]){
    const x=entity.x-camera,y=entity.y-cameraY;
    if(x<-155||x>W+155||y<-50||y>H+210||entity.dead&&entity.death<=0)continue;
    if(entity.windup>0)circle(x,y-62,62,'#fd7f9017','#ffbd8c66',2);
    drawSuit(art,entity,x,y,entity.boss?1.3:1,entity===player);
    if(entity!==player&&!entity.dead){
      const top=y-(entity.boss?201:153);
      rect(x-23,top,46,4,'#192033');
      rect(x-23,top,46*entity.hp/entity.maxHp,4,entity.boss?'#f4a188':'#a3cedd');
    }
  }
  for(const projectile of game.projectiles){
    const x=projectile.x-camera,y=projectile.y-cameraY;
    line(x-projectile.vx*.07,y-(projectile.vy||0)*.07,x,y,'#ffac9880',4);
    circle(x,y,4,'#ffeead','#ffab81');
  }
  for(const particle of game.particles){
    C.globalAlpha=Math.min(1,particle.life*4);
    rect(particle.x-camera,particle.y-cameraY,particle.size,particle.size,particle.color);
  }
  C.globalAlpha=1;
  for(const message of game.texts){
    C.globalAlpha=Math.min(1,message.life*3);
    label(message.label,message.x-camera,message.y-cameraY,14,message.color,'center',900);
  }
  C.globalAlpha=1;
  if(player.attack>.28)circle(player.x-camera,player.y-cameraY-64,(.62-player.attack)*440,'#7bebff0b','#a8eaff88',4);
  const living=game.enemies.filter(enemy=>!enemy.dead);
  const goal=living.reduce((near,e)=>Math.hypot(e.x-player.x,e.y-player.y)<Math.hypot(near.x-player.x,near.y-player.y)?e:near,living[0]||stage.exit);
  const dx=goal.x-player.x,dy=goal.y-player.y;
  if(Math.abs(dx)>W*.52||Math.abs(dy)>240){
    const direction=Math.abs(dy)>Math.abs(dx)?(dy<0?'↑':'↓'):(dx>0?'→':'←');
    label(direction+' '+(living.length?'敵':'帰還ドック'),W-30,H-112,12,'#d6f1ff','right');
  }
}


const $=id=>document.getElementById(id),canvas=$('gameCanvas'),ctx=canvas.getContext('2d');
let W=960,H=540,game=null,mode='title',paused=false,selectedChapter=0,clock=0,last=0,saveWarning=false;
const keys={},touch={},pulses={},SAVE_KEY='black-sensei-4-v1';
let save={unlocked:0,stars:{},scores:{}};
try{const stored=JSON.parse(localStorage.getItem(SAVE_KEY));if(stored){save.unlocked=Math.max(0,Math.min(249,Math.floor(Number(stored.unlocked)||0)));for(const key of Object.keys(stored.stars||{}))if(+key>=0&&+key<250&&Number.isInteger(+key))save.stars[key]=Math.max(1,Math.min(3,Number(stored.stars[key])||1));save.scores=stored.scores||{};}}catch(error){}
function persist(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(save));}catch(error){saveWarning=true;}}
function titleSave(){const count=Object.keys(save.stars).length;$('saveText').textContent=saveWarning?'この環境では記録を保存できません':count?`${count} / 250 面クリア · ${makeStage(save.unlocked).id} から再開`:'はじめての放課後 / 1-1 から';$('startBtn').innerHTML=`${count?'続きの授業へ':'授業をはじめる'} <span>↗</span>`;}
titleSave();
let storyPages=[],storyIndex=0,storyDone=null;
function openStory(pages,done){clearInputs();storyPages=pages;storyIndex=0;storyDone=done;mode='story';paused=true;$('storyScreen').classList.remove('hidden');paintStory();}
function paintStory(){const page=storyPages[storyIndex];$('storySpeaker').textContent=page.speaker;$('storyText').textContent=page.text;$('storyPage').textContent=`${storyIndex+1} / ${storyPages.length}`;$('storyChapter').textContent=`第${game.stage.chapter}章 / ${game.stage.title}`;}
function closeStory(){clearInputs();$('storyScreen').classList.add('hidden');const done=storyDone;storyDone=null;if(done)done();}
function advanceStory(){if(storyIndex+1<storyPages.length){storyIndex++;paintStory();}else closeStory();}
$('storyNext').onclick=advanceStory;$('storySkip').onclick=closeStory;
const audio={enabled:false,context:null,next:0,step:0,
 init(){if(!this.context)this.context=new (window.AudioContext||window.webkitAudioContext)();if(this.context.state==='suspended')this.context.resume();},
 tone(f=200,d=.1,type='square',vol=.04,slide=0){if(!this.enabled||!this.context)return;const ac=this.context,o=ac.createOscillator(),a=ac.createGain(),t=ac.currentTime;o.type=type;o.frequency.setValueAtTime(f,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(20,slide),t+d);a.gain.setValueAtTime(vol,t);a.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(a);a.connect(ac.destination);o.start(t);o.stop(t+d);},
 effect(e){if(e.type==='hit')this.tone(100,.09,'sawtooth',.06,30);if(e.type==='swing')this.tone(260,.08,'triangle',.025,80);if(e.type==='hurt')this.tone(70,.2,'sawtooth',.05,25);if(e.type==='guard')this.tone(700,.06,'triangle',.04,270);if(e.type==='pickup'){this.tone(570,.15,'sine',.05);setTimeout(()=>this.tone(850,.15,'sine',.04),70);}if(e.type==='special')this.tone(110,.5,'sawtooth',.08,880);if(e.type==='clear'){[330,440,550,660].forEach((f,i)=>setTimeout(()=>this.tone(f,.25,'triangle',.05),i*100));}if(e.type==='jump')this.tone(170,.13,'triangle',.015,320);},
 tick(){if(!this.enabled||!this.context||mode!=='play'||paused||document.hidden)return;const now=this.context.currentTime;if(now>this.next){this.next=now+.24;const notes=[110,110,130.81,110,146.83,130.81,98,98];this.tone(notes[this.step%8],.16,'triangle',.025);if(this.step%4===0)this.tone(90,.11,'sine',.06,32);if(this.step%4===2)this.tone(200,.045,'square',.012,80);this.step++;}}
};
function resize(){const rect=$('arena').getBoundingClientRect();W=Math.round(rect.width/rect.height*540);const dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=W*dpr;canvas.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);if(game)game.viewWidth=W;}
window.addEventListener('resize',resize);resize();
function clearInputs(){for(const k in keys)delete keys[k];for(const k in touch)delete touch[k];for(const k in pulses)delete pulses[k];document.querySelectorAll('.pressed').forEach(b=>b.classList.remove('pressed'));}
function startStage(index,isPractice=false){if(index>save.unlocked&&!isPractice)return;clearInputs();game=createGame(index);game.practice=isPractice;game.viewWidth=W;mode='play';paused=false;$('titleScreen').classList.add('hidden');$('resultScreen').classList.add('hidden');$('pauseScreen').classList.add('hidden');$('hud').classList.remove('hidden');$('stageLabel').textContent=game.stage.id;$('stageName').textContent=game.stage.title;$('stageIntro').innerHTML=`<small>CHAPTER ${String(game.stage.chapter).padStart(2,'0')} · STAGE ${game.stage.face}</small>${game.stage.title}`;$('topStage').textContent=`STAGE ${game.stage.id} / ${game.stage.theme.name}`;$('selectDialog').close();if(audio.enabled)audio.init();updateHud();if(!isPractice&&(game.stage.face===1||game.stage.face===5))openStory(storyFor(game.stage.chapter,game.stage.face),()=>{mode='play';paused=false;});}
function showTitle(){clearInputs();mode='title';paused=false;game=null;['hud','pauseScreen','resultScreen','storyScreen'].forEach(id=>$(id).classList.add('hidden'));$('titleScreen').classList.remove('hidden');$('topStage').textContent='50 CHAPTERS / 250 STAGES';titleSave();}
function togglePause(){if(mode!=='play')return;paused=!paused;clearInputs();$('pauseScreen').classList.toggle('hidden',!paused);}
function showResult(){if(game.stage.index===249&&game.status==='clear'){openStory(ENDING,renderResult);return;}renderResult();}
function renderResult(){mode='result';clearInputs();const win=game.status==='clear',s=game.stage;
 if(win&&!game.practice){save.stars[s.index]=Math.max(save.stars[s.index]||0,game.stars);save.scores[s.index]=Math.max(save.scores[s.index]||0,game.score);save.unlocked=Math.max(save.unlocked,Math.min(249,s.index+1));persist();}
 $('hud').classList.add('hidden');$('resultScreen').classList.remove('hidden');$('resultEyebrow').textContent=win?(s.index===249?'ALL LESSONS COMPLETE':'LESSON COMPLETE'):'LESSON NOT FINISHED';$('resultTitle').textContent=win?(s.index===249?'星を越えて、教室へ。':'指導完了。'):'まだ、終われない。';$('resultStars').textContent=win?'★'.repeat(game.stars)+'☆'.repeat(3-game.stars):'RETRY';$('resultStars').style.fontSize=win?'':'14px';
 const stories=['船内通路を確保した。救助隊が続いて進む。','帰還ドックに到着。酸素を補給する。','上昇航路を確保した。次は船内の救助だ。','昇降区画を開放した。次のドックへ向かう。'];
 $('resultStory').textContent=win?(s.index===249?'全ての帰還船が、青い地球へ向かう。':s.boss?`${s.enemies.at(-1).name}を倒した。新しい章へ、先生の歩みは続く。`:stories[s.face-1]):'拳を休めて、もう一度。体力は全回復して再挑戦。';
 $('resultStats').innerHTML=`<span>SCORE<strong>${game.score.toLocaleString()}</strong></span><span>MAX COMBO<strong>${game.bestCombo}</strong></span><span>TIME<strong>${Math.floor(game.time/60)}:${String(Math.floor(game.time%60)).padStart(2,'0')}</strong></span>`;$('nextBtn').innerHTML=`${game.practice?'もう一度、練習':win?(s.index===249?'タイトルに戻る':'次のステージへ'):'もう一度、挑む'} <span>${win?'→':'↻'}</span>`;titleSave();}
function openSelect(){selectedChapter=game?game.stage.chapter-1:Math.floor(save.unlocked/5);if(mode==='play'){paused=true;$('pauseScreen').classList.add('hidden');}clearInputs();renderMap();$('selectDialog').showModal();}
function renderMap(){const count=Object.keys(save.stars).length;$('mapProgress').textContent=`${count} / 250 面クリア`;$('mapProgressBar').style.width=`${count/250*100}%`;
 $('chapterGrid').innerHTML=CHAPTERS.map((name,i)=>{const completed=[0,1,2,3,4].filter(j=>save.stars[i*5+j]).length;return `<button class="${i*5<=save.unlocked?'unlocked ':''}${completed===5?'complete ':''}${i===selectedChapter?'selected':''}" data-chapter="${i}" aria-label="第${i+1}章 ${name}">${String(i+1).padStart(2,'0')}${completed===5?'<small>✓</small>':''}</button>`;}).join('');
 $('selectedBiome').textContent=THEMES[Math.floor(selectedChapter/5)].name;$('selectedChapter').textContent=`第${selectedChapter+1}章　${CHAPTERS[selectedChapter]}`;$('chapterCount').textContent=`CH. ${String(selectedChapter+1).padStart(2,'0')} / 50`;
 $('stageGrid').innerHTML=[0,1,2,3,4].map(j=>{const index=selectedChapter*5+j,stage=makeStage(index),locked=index>save.unlocked,stars=save.stars[index];return `<button class="stage-card" data-stage="${index}" ${locked?'disabled':''}>${j===4?'<span class="boss-tag">BOSS</span>':''}<b>${stage.id}</b><small>${locked?'未開放':j===4?stage.enemies.at(-1).name:['船内通路','船外軌道','上昇航路','船内シャフト'][j]}</small><em>${stars?'★'.repeat(stars)+'☆'.repeat(3-stars):locked?'LOCKED':'PLAY →'}</em></button>`;}).join('');}
function openHelp(){if(mode==='play'&&!paused){paused=true;$('helpDialog').dataset.resume='yes';}clearInputs();$('helpDialog').showModal();}
$('trialStation').onclick=()=>startStage(0,true);$('trialOrbit').onclick=()=>startStage(1,true);$('trialShaft').onclick=()=>startStage(3,true);
$('startBtn').onclick=()=>startStage(save.unlocked);$('selectBtn').onclick=openSelect;$('pauseBtn').onclick=togglePause;$('resumeBtn').onclick=togglePause;$('retryBtn').onclick=()=>startStage(game.stage.index,game.practice);$('pauseSelectBtn').onclick=openSelect;$('resultSelectBtn').onclick=openSelect;$('homeLink').onclick=e=>{e.preventDefault();showTitle();};$('helpBtn').onclick=openHelp;
$('closeHelp').onclick=()=>$('helpDialog').close();$('helpDialog').addEventListener('close',()=>{if($('helpDialog').dataset.resume==='yes'){paused=false;delete $('helpDialog').dataset.resume;}});
$('closeSelect').onclick=()=>$('selectDialog').close();$('selectDialog').addEventListener('close',()=>{if(mode==='play'&&paused)$('pauseScreen').classList.remove('hidden');});
$('chapterGrid').onclick=e=>{const b=e.target.closest('[data-chapter]');if(b){selectedChapter=+b.dataset.chapter;renderMap();}};$('stageGrid').onclick=e=>{const b=e.target.closest('[data-stage]');if(b&&!b.disabled)startStage(+b.dataset.stage);};
$('nextBtn').onclick=()=>{if(game.practice||game.status==='gameover')startStage(game.stage.index,game.practice);else if(game.stage.index===249)showTitle();else startStage(game.stage.index+1);};
$('soundBtn').onclick=()=>{audio.enabled=!audio.enabled;if(audio.enabled)try{audio.init();audio.tone(440,.1,'triangle',.04);}catch(error){audio.enabled=false;}$('soundBtn').querySelector('span').textContent=audio.enabled?'ON':'OFF';$('soundBtn').setAttribute('aria-label',audio.enabled?'音をオフにする':'音をオンにする');};
const keyMap={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',Space:'jump',ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',KeyQ:'heal',KeyZ:'attack',KeyJ:'attack',KeyX:'guard',KeyK:'guard',KeyE:'pick',KeyC:'special',KeyL:'special'};
window.addEventListener('keydown',e=>{if($('selectDialog').open||$('helpDialog').open)return;if(mode==='story'){if(e.code==='Enter'||e.code==='Space'){e.preventDefault();advanceStory();}return;}if(e.code==='Escape'){togglePause();return;}if(e.code==='Enter'&&mode==='title'){startStage(save.unlocked);e.preventDefault();return;}if(keyMap[e.code]&&mode==='play'){e.preventDefault();keys[e.code]=true;if(['jump','attack','pick','special','heal'].includes(keyMap[e.code])&&!e.repeat)pulses[keyMap[e.code]]=true;}});window.addEventListener('keyup',e=>{delete keys[e.code];});
document.querySelectorAll('[data-key]').forEach(b=>{b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);touch[e.pointerId]=b.dataset.key;if(['jump','attack','pick','special','heal'].includes(b.dataset.key))pulses[b.dataset.key]=true;b.classList.add('pressed');if(audio.enabled)audio.init();});const release=e=>{delete touch[e.pointerId];b.classList.remove('pressed');};b.addEventListener('pointerup',release);b.addEventListener('pointercancel',release);b.addEventListener('lostpointercapture',release);b.addEventListener('contextmenu',e=>e.preventDefault());});
window.addEventListener('blur',()=>{clearInputs();if(mode==='play'&&!paused)togglePause();});document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInputs();if(mode==='play'&&!paused)togglePause();}});
function getInput(){const input={...pulses};for(const key in keys)if(keys[key])input[keyMap[key]]=true;for(const id in touch)input[touch[id]]=true;for(const k in pulses)delete pulses[k];return input;}
const routeNames = {
  horizontal: '船内通路 / 横スクロール',
  vertical: '船内シャフト / 縦スクロール',
  mixed: '船内ドック / 縦横スクロール',
  orbit: '船外軌道 / 無重力',
  ascent: '上昇航路 / 無重力'
};

function updateHud() {
  const {player,stage} = game;
  const alive = game.enemies.filter(enemy => !enemy.dead);
  const boss = alive.find(enemy => enemy.boss);
  const inSpace = stage.terrain === 'space';
  $('hpFill').style.width = (player.hp / player.maxHp * 100) + '%';
  $('hpFill').style.background = player.hp < 48 ? '#ed5d51' : '#b5dcdf';
  $('hpValue').textContent = player.hp + ' / ' + player.maxHp;
  $('energyFill').style.width = player.energy + '%';
  const weaponName = player.weapon === 'pipe' ? '鉄棒' : '木の枝';
  $('weaponLabel').textContent = player.weapon ? weaponName+' / あと'+player.durability+'回' : '素手 / こぶし';
  const objective = stage.boss ? 'ボスを倒してクリア' : alive.length ? '残り '+alive.length+' 人' : '帰還ドックへ';
  $('objective').textContent = (game.practice ? '訓練 / ' : '') + objective;
  $('bossHud').classList.toggle('hidden', !boss || Math.abs(boss.x-player.x)>W || Math.abs(boss.y-player.y)>350);
  if (boss) {
    $('bossName').textContent = boss.name;
    $('bossFill').style.width = (boss.hp/boss.maxHp*100) + '%';
  }
  $('comboCounter').classList.toggle('hidden', game.combo < 2);
  $('comboCounter').innerHTML = game.combo + '<span>COMBO</span>';
  $('stageIntro').style.opacity = game.time < 2.2 ? '1' : '0';
  $('herbLabel').textContent = '薬草 '+player.herbs+'/4 · Q 回復';
  $('routeLabel').textContent = routeNames[stage.kind];
  $('resourceHud').classList.toggle('hidden', !inSpace);
  $('resourceValue').textContent = Math.ceil(player.resource) + '%';
  $('resourceFill').style.width = player.resource + '%';
  $('resourceFill').style.background = player.resource < 25 ? '#f1a17c' : '#b1dce8';
  document.querySelector('[data-key="jump"]').textContent = inSpace ? '噴射' : '跳ぶ';
  document.querySelector('[data-key="guard"]').textContent = inSpace ? '減速 / 防御' : '防御';
  document.querySelector('[data-key="up"]').setAttribute('aria-label', inSpace ? '上昇' : '上る');
  document.querySelector('[data-key="down"]').setAttribute('aria-label', inSpace ? '下降' : '下りる');
  document.querySelector('[data-key="heal"]').disabled = player.herbs===0 || player.hp===player.maxHp;
  document.querySelector('[data-key="special"]').style.boxShadow = player.energy>=100 ? '0 0 15px #e7ba7455' : '';
}

// All artwork is drawn locally so the game starts without asset downloads.
const C=ctx;
function rect(x,y,w,h,c){C.fillStyle=c;C.fillRect(x,y,w,h);}
function line(x1,y1,x2,y2,c,w=1){C.strokeStyle=c;C.lineWidth=w;C.beginPath();C.moveTo(x1,y1);C.lineTo(x2,y2);C.stroke();}
function poly(points,fill,stroke='#121920',width=2){C.beginPath();points.forEach((p,i)=>i?C.lineTo(...p):C.moveTo(...p));C.closePath();if(fill){C.fillStyle=fill;C.fill();}if(stroke){C.strokeStyle=stroke;C.lineWidth=width;C.stroke();}}
function circle(x,y,r,fill,stroke=null,w=1){C.beginPath();C.arc(x,y,r,0,Math.PI*2);C.fillStyle=fill;C.fill();if(stroke){C.strokeStyle=stroke;C.lineWidth=w;C.stroke();}}
function label(str,x,y,size=12,color='#eee1c6',align='left',weight=700){C.font=`${weight} ${size}px Arial,"Noto Sans JP",sans-serif`;C.fillStyle=color;C.textAlign=align;C.fillText(str,x,y);C.textAlign='left';}
function rounded(x,y,w,h,r,fill,stroke){C.beginPath();C.roundRect(x,y,w,h,r);C.fillStyle=fill;C.fill();if(stroke){C.strokeStyle=stroke;C.lineWidth=2;C.stroke();}}
function weaponShape(kind,x,y,angle=0,s=1){C.save();C.translate(x,y);C.rotate(angle);C.scale(s,s);if(kind==='pipe'){line(0,0,0,-76,'#15202a',8);line(-1,0,-1,-76,'#889da1',5);line(-2,-3,-2,-74,'#d0d8c5',1);line(0,-70,6,-76,'#8fa3a2',5);}else{poly([[-3,0],[-2,-63],[1,-78],[5,-43],[3,0]],'#8a6e4b','#2d2c2c',2);line(2,-42,12,-57,'#93764f',4);line(-1,-28,-9,-40,'#93764f',3);}C.restore();}
function drawPerson(entity,x,y,scale=1,teacher=false,title=false){
 const e=entity,face=entity.face||1,walk=e.walk||0,walking=Math.abs(e.vx||0)>10||(!teacher&&walk>0),stride=walking?Math.sin(walk)*13:Math.sin(clock*2)*.4,atk=e.attack>0,wind=e.windup>0,guard=e.guard,dead=e.dead;
 C.save();C.translate(x,y);C.scale(scale*face,scale);if(dead){C.globalAlpha=Math.min(1,e.death*2.5);C.rotate(-Math.PI/2);C.translate(40,-16);}if(e.invuln>0&&Math.floor(clock*20)%2===0&&!title)C.globalAlpha=.5;
 const outline='#101820',coat=teacher?'#202f3a':e.faction==='黒星会'?'#353244':['#814e52','#5d6678','#6e5578','#817052'][e.variant||0],light=teacher?'#485254':['#ae7562','#839388','#9c85a5','#b9a27b'][e.variant||0],skin=teacher?'#bf9b7b':'#b89174',boss=e.boss;
 const headY=teacher?-108:-101;
 // Shadow and moving trouser legs.
 if(!dead){C.save();C.scale(face,1);C.fillStyle='#0d172348';C.beginPath();C.ellipse(3,1,31,6,0,0,Math.PI*2);C.fill();C.restore();}
 poly([[-17,-42],[-1,-42],[-3+stride,-6],[-17+stride,-4],[-21,-24]],teacher?'#242b32':'#2e333c',outline,3);
 poly([[0,-43],[17,-40],[19-stride,-8],[6-stride,-6],[0,-26]],teacher?'#343d43':'#3d424a',outline,3);
 line(-11,-36,-12+stride,-12,'#5c6562',1.5);line(10,-31,12-stride,-12,'#59605e',1.5);
 poly([[-19+stride,-8],[-3+stride,-8],[3+stride,-1],[-22+stride,0]],'#141c23',outline,2);line(-20+stride,-1,2+stride,-1,'#6a7268',2);
 poly([[5-stride,-10],[20-stride,-9],[29-stride,-2],[26-stride,1],[5-stride,0]],'#172029',outline,2);line(8-stride,-1,27-stride,0,'#6a7268',2);
 // Back arm, shirt, broad asymmetric coat.
 poly([[-18,-84],[-31,-73],[-28,-45],[-19,-41],[-14,-64]],coat,outline,3);circle(-23,-43,7,skin,outline,2);
 poly([[-18,-87],[15,-89],[24,-72],[20,-37],[-23,-36],[-25,-65]],teacher?'#c9c7af':'#d3bf9a',outline,3);
 if(teacher){poly([[-18,-88],[-4,-82],[-6,-48],[-12,-15],[-35,-19],[-27,-52],[-29,-75]],coat,outline,3);poly([[11,-89],[23,-76],[20,-55],[34,-23],[16,-19],[4,-48],[2,-82]],coat,outline,3);poly([[-15,-85],[-6,-77],[-13,-66],[-9,-65],[-17,-45],[-21,-72]],light,outline,1.5);poly([[9,-85],[3,-76],[11,-66],[6,-65],[17,-45],[17,-73]],'#354247',outline,1.5);poly([[-1,-79],[5,-79],[2,-70],[6,-51],[1,-45],[-4,-52]],'#7e8d79',outline,1);line(-28,-40,-33,-23,'#6e747044',2);line(19,-39,27,-26,'#5b6661',1);circle(13,-48,1.8,'#cbb88b');circle(-19,-65,2,'#e1b66e');line(-23,-34,-13,-34,'#626d66',1.5);}
 else if(e.faction==='黒星会'){poly([[-22,-85],[-8,-82],[-3,-37],[-26,-34]],coat,outline,3);poly([[5,-82],[22,-84],[27,-34],[5,-35]],coat,outline,3);poly([[-8,-82],[0,-71],[-10,-59]],'#938296',outline,1);poly([[5,-82],[0,-71],[11,-59]],'#938296',outline,1);rect(-1,-74,4,25,'#d58c81');circle(-17,-73,2,'#e5bc84');}else{poly([[-21,-85],[-5,-80],[-9,-37],[-24,-34],[-24,-69]],coat,outline,3);poly([[6,-83],[20,-82],[25,-37],[7,-35]],coat,outline,3);line(-17,-73,-18,-44,light,2);rect(-2,-73,4,24,boss?'#e1b86f':'#76535a');}
 // Neck, face and expressive comic line work.
 poly([[-8,-97],[8,-97],[10,-85],[0,-79],[-10,-87]],skin,outline,2);circle(14,headY+9,5,skin,outline,2);
 poly([[-16,headY-5],[4,headY-10],[18,headY-2],[17,headY+14],[12,headY+24],[1,headY+27],[-13,headY+18]],skin,outline,2.5);
 poly([[10,headY+3],[19,headY+8],[14,headY+12],[18,headY+15],[9,headY+16]],'#aa8267',null);line(2,headY+20,11,headY+20,'#574e45',1.2);line(0,headY+23,7,headY+24,'#6b5b4d',.8);
 if(teacher){poly([[-19,headY+5],[-21,headY-8],[-15,headY-14],[-19,headY-23],[-9,headY-20],[-5,headY-28],[1,headY-22],[11,headY-27],[12,headY-20],[20,headY-20],[17,headY-9],[21,headY-4],[13,headY-3],[3,headY-8],[-8,headY-5],[-12,headY+6]],'#1b2229',outline,2.5);line(-15,headY-13,-1,headY-17,'#5f6662',2);line(2,headY-18,11,headY-20,'#4c5754',1.5);
  poly([[-9,headY+3],[3,headY+3],[1,headY+10],[-8,headY+9]],'#212e33',outline,2);poly([[6,headY+3],[17,headY+2],[16,headY+9],[7,headY+10]],'#1c2a32',outline,2);line(2,headY+5,7,headY+5,'#17252b',2);line(-8,headY+4,-3,headY+4,'#b9c5b1',1);line(9,headY+3,14,headY+3,'#a6b5a5',1);line(-14,headY+3,-8,headY+5,'#15232a',2);
 }else{poly([[-17,headY+3],[-21,headY-6],[-16,headY-16],[-8,headY-16],[0,headY-23],[13,headY-17],[21,headY-6],[12,headY-5],[6,headY-9],[-9,headY-3],[-10,headY+7]],boss?'#36313a':'#343336',outline,2.5);line(-4,headY+5,2,headY+3,'#2b2b2f',2);line(9,headY+3,15,headY+4,'#2b2b2f',2);circle(0,headY+7,1.5,'#20252b');circle(13,headY+7,1.5,'#20252b');if(boss){line(-15,headY-4,18,headY-8,'#cd6553',4);line(-11,headY-4,-24,headY+2,'#ae5347',3);}}
 // Front fist, guard and extended attack. Title pose holds a fist near the chest.
 let handX=title?39:guard?29:atk?(e.aim?35:79):wind?12:26,handY=title?-90:guard?-103:atk?(e.aim<0?-141:e.aim>0?-22:-81):wind?-114:-57;
 const elbowX=title?42:guard?35:atk?50:wind?-5:29,elbowY=title?-63:guard?-77:atk?-72:wind?-87:-62;
 poly([[13,-82],[24,-81],[elbowX+7,elbowY],[handX+5,handY+6],[handX-7,handY+8],[elbowX-5,elbowY+3],[13,-67]],coat,outline,3);line(24,-75,elbowX,elbowY,light,1.5);circle(handX,handY,8,skin,outline,2);line(handX-4,handY-3,handX+4,handY-3,'#805f51',1);line(handX+1,handY-5,handX+1,handY+1,'#805f51',1);line(handX-3,handY+2,handX+3,handY+2,'#805f51',1);
 if(e.weapon)weaponShape(e.weapon,handX,handY,atk?1.3:.45,1);
 if(atk&&!e.weapon){C.strokeStyle='#f8dec477';C.lineWidth=2;C.beginPath();C.arc(32,-79,54,-.85,.5);C.stroke();for(let i=0;i<3;i++)line(88,-92+i*10,101-i*3,-95+i*10,'#f1c8a5',1.5);}
 if(wind){C.save();C.scale(face,1);label('!',0,-153,25,'#ff6659','center',900);circle(0,-81,52,'#ee544017');C.restore();}
 if(e.flash>0){line(-28,-110,25,-22,'#ffe4bd88',3);}
 C.restore();
}
function drawWorld() {
  drawFronts(game,{C,W,H,clock,rect,line,poly,circle,label,rounded,drawStation,drawPerson,weaponShape});
}

function drawTitle() {
  drawSpaceTitle({C,W,H,clock,rect,line,poly,circle,label,rounded,drawPerson},THEMES[0]);
}

function frame(now){const dt=Math.min((now-last)/1000||.016,.25);last=now;clock+=dt;C.save();C.clearRect(0,0,W,H);
 if(mode==='title')drawTitle();else if(game){if(mode==='play'&&!paused&&!document.hidden){let remaining=dt;const input=getInput();while(remaining>0){const step=Math.min(remaining,1/60);updateGame(game,step,input);remaining-=step;}for(const e of game.events)audio.effect(e);game.events=[];updateHud();if(game.status!=='playing')showResult();}if(game.shake>0&&mode==='play'&&!paused)C.translate((Math.random()-.5)*game.shake,(Math.random()-.5)*game.shake*.6);drawWorld();}
 C.restore();audio.tick();requestAnimationFrame(frame);}
requestAnimationFrame(frame);
// Read-only snapshot for checking game state without coupling tests to artwork.
window.blackSensei={snapshot:()=>game?{mode,paused,stage:game.stage.id,status:game.status,player:{x:game.player.x,y:game.player.y,hp:game.player.hp,weapon:game.player.weapon,herbs:game.player.herbs,level:game.player.level,resource:game.player.resource},cameraY:game.cameraY,enemies:game.enemies.filter(e=>!e.dead).length,unlocked:save.unlocked}:({mode,unlocked:save.unlocked})};

})();
