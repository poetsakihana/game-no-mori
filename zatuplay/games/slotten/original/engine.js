const MACHINES=[
{name:'フルーツ・ガーデン',sub:'みずみずしい定番スロット',color:'#ff9775',symbols:['🍒','🍋','🍊','🍇','🍉','🍎'],mult:1},
{name:'星空ドリーム',sub:'星を集める夜の旅',color:'#b398ff',symbols:['⭐','🌙','🌟','🪐','☄️','🌠'],mult:1.2},
{name:'海の宝箱',sub:'波の向こうの宝探し',color:'#55d9e7',symbols:['🐚','🐠','🐬','🦀','🐙','💎'],mult:1.4},
{name:'花咲く恋',sub:'花の絵柄に想いをのせて',color:'#ffa3c7',symbols:['🌸','🌷','🌼','🌹','💐','❤️'],mult:1.6},
{name:'スイーツ・パーティー',sub:'甘いごほうびをどうぞ',color:'#f8b9e9',symbols:['🍰','🍩','🍪','🍫','🍦','🧁'],mult:1.8},
{name:'森の仲間たち',sub:'小さな動物たちとひと休み',color:'#91dda2',symbols:['🐿️','🦊','🐰','🐻','🦉','🦌'],mult:2},
{name:'ナゴヤ金しゃち',sub:'どえりゃあコインを集めよまい',color:'#ffc966',symbols:['🏯','🍵','🍤','🚃','🐉','🔱'],mult:2.2},
{name:'ハロウィン・ナイト',sub:'おばけと愉快な収穫祭',color:'#ffa959',symbols:['🎃','👻','🦇','🕯️','🕸️','🍬'],mult:2.4},
{name:'氷のクリスタル',sub:'きらめく氷の宮殿',color:'#a2e9ff',symbols:['❄️','🧊','⛄','💠','🔮','👑'],mult:2.7},
{name:'ゴールド・セブン',sub:'最高配当を狙う黄金の台',color:'#ffdc7e',symbols:['🔔','🍀','💰','💎','👑','7️⃣'],mult:3}];
function payout(reels,bet,m){if(reels[0]===reels[1]&&reels[1]===reels[2])return Math.round(bet*(8+reels[0]*3)*m.mult);return 0;}
function draw(){let a=new Uint32Array(1);crypto.getRandomValues(a);return a[0]%6;}
if(typeof module!=='undefined')module.exports={MACHINES,payout};
