(function(root){
 'use strict';
 const TYPES={
  bloom:{label:'花と芽吹き',color:'#bc7590',building:'garden',action:'listen'},
  tide:{label:'雨と海辺',color:'#568f9d',building:'garden',action:'explore'},
  star:{label:'星と願い',color:'#aa945a',building:'stage',action:'perform'},
  memory:{label:'記憶と時間',color:'#8c80a6',building:'library',action:'listen'},
  festival:{label:'祝祭と暮らし',color:'#c58d61',building:'market',action:'perform'},
  letter:{label:'恋とことば',color:'#ba7782',building:'library',action:'listen'},
  journey:{label:'旅とつながり',color:'#648e74',building:'market',action:'explore'}
 };
 const BUILDINGS={garden:{label:'想いの庭',cost:4,trust:5,resonance:2,material:0,desc:'毎夕 信頼 +5・共鳴 +2'},library:{label:'記憶の書庫',cost:5,trust:2,resonance:5,material:0,desc:'毎夕 信頼 +2・共鳴 +5'},stage:{label:'小さな歌舞台',cost:6,trust:1,resonance:7,material:0,desc:'毎夕 共鳴 +7・信頼 +1'},market:{label:'旅人の市',cost:4,trust:1,resonance:2,material:3,desc:'毎夕 素材 +3・信頼 +1・共鳴 +2'}};
 const ACTS=[
  {name:'芽吹きの序曲',range:[1,10],tag:'出会い、そして最初の一音',text:'空に浮かぶ歌の島が、ひとつずつ色をなくしていた。記録師・灯花は、工匠の奏と花の精リリィに出会う。歌を集める旅は、まだ声にならない想いを聴く旅になる。'},
  {name:'忘却の航路',range:[11,20],tag:'なくした記憶にも、居場所を',text:'人々の記憶が消え、島の名前まで薄れていく。取り戻すことを望まない人もいる。灯花たちは、過去を一律に戻すのではなく、その人が持っていたい記憶を選ぶ道を探す。'},
  {name:'ことばの架け橋',range:[21,30],tag:'違う声のまま、つながる',text:'修復した航路で、異なる暮らしが出会い始める。便利さと故郷、個人の願いと街の未来。全員が同じ歌を歌わなくても渡れる橋を、仲間と築いていく。'},
  {name:'嵐の向こうの声',range:[31,40],tag:'届かない想いを、もう一度',text:'静寂の潮が大きな嵐になり、築いた街を隔てる。奏は歌の復元装置を作るが、機械が大きな声だけを選んでしまう。小さな声を残すため、灯花は旅の目的を問い直す。'},
  {name:'ふたつの月の記憶',range:[41,50],tag:'過去を抱いて、未来を選ぶ',text:'月の裏に、もうひとつの世界が現れる。そこでは誰も傷つかず、誰も新しい歌を作れない。奏の失われた記憶と、リリィが守ってきた秘密が、ふたつの世界を揺らす。'},
  {name:'めぐり逢う季節',range:[51,60],tag:'別れも違いも、連れていく',text:'正しさをひとつに決める装置を止め、島々は互いの声を聴き直す。子どものリズム、暮らしの歌、言えなかった恋。静寂の潮の中に、置き去りにされた声が見つかる。'},
  {name:'恋と愛の終奏',range:[61,67],tag:'歌のつづきは、あなたが紡ぐ',text:'静寂の潮は敵ではなかった。聴かれないまま積もった声を、世界が抱えきれなくなっていたのだ。集めた歌の先で、灯花たちは、誰もが自分の声で暮らせる未来を選ぶ。'}
 ];
 const CREW=[
  {id:'toka',name:'灯花',role:'歌の記録師',line:'言えなかった想いも、ここに残そう。',skill:'対話の共鳴 +3',unlock:0,color:'#bd7b87'},
  {id:'kanade',name:'奏',role:'旅する楽器工匠',line:'音が戻ったら、次は君の歌を聴きたい。',skill:'建築の素材消費 −1',unlock:0,color:'#648a93'},
  {id:'lily',name:'リリィ',role:'花の精',line:'咲く速さは、みんな違っていいんだよ。',skill:'毎夕の信頼 +2',unlock:0,color:'#9f9b68'},
  {id:'sora',name:'そら',role:'風の配達人',line:'遠くの島まで、この手紙を届ける。',skill:'探索の素材 +2',unlock:1,color:'#70a5a5'},
  {id:'shiori',name:'栞',role:'記憶の司書',line:'忘れる自由も、覚えている自由も。',skill:'毎夕の共鳴 +3',unlock:9,color:'#8b7fa8'},
  {id:'ritsu',name:'律',role:'街角の奏者',line:'別々のリズムから、音楽が生まれる。',skill:'演奏の共鳴 +5',unlock:27,color:'#bd9863'},
  {id:'nagi',name:'凪',role:'潮の案内人',line:'静けさの奥にも、声はある。',skill:'休息の体力回復 +3',unlock:50,color:'#638e84'},
  {id:'akari',name:'朱里',role:'明日を描く画家',line:'世界の色を、もう一度選んでみよう。',skill:'開始時の素材 +4',unlock:80,color:'#c18565'}
 ];
 function classify(song){
  const s=song.title.toLowerCase();
  if(/記憶|思い出|キオク|メモリ|memory|remember|時|時計|忘|夢|まぼろし|幻|繰り返|アルバム|繭/.test(s))return 'memory';
  if(/海|雨|波|水|漣|魚|池|噴水|しずく|雫|潮|アメンボ/.test(s))return 'tide';
  if(/星|月|夜|ほし|くも|雲|空|光|ヒカ|moon|light|クリスマス|christmas/.test(s))return 'star';
  if(/桜|さくら|春|花|華|草|木|森|秋|雪|冬|季節|ハル|蝶|ちょうちょ|リリィ|紅葉|鹿|鳥/.test(s))return 'bloom';
  if(/ラップ|ロック|ダンス|拍|パチ|ぱち|ジャンプ|ぴょん|うた|リズム|歌|パン|料理|おは|あいさつ|手洗|チョコ|抹茶|tea|メリー|メリィ|遊園|コーヒー|ワンダ|どうぶつ|音|ドレミ/.test(s))return 'festival';
  if(/旅|道|街|町|駅|レール|rail|羽|進|風|航|翼|飛|キャリー|ポスタ|疾走|次へ|はね|ハンティング/.test(s))return 'journey';
  return 'letter';
 }
 function actFor(album){return ACTS.findIndex(a=>album>=a.range[0]&&album<=a.range[1]);}
 function targets(song){const act=actFor(song.album);return {resonance:60+act*8,trust:45+act*3};}
 function initStage(song,party,upgrades){
  const bonus=party.includes('akari')?4:0;
  return {id:song.id,day:1,ap:3,energy:10,material:8+bonus,resonance:(upgrades.plaza||0)*3,trust:25+(upgrades.garden||0)*3,grid:Array(9).fill(null),party:[...party],upgrades:{...upgrades},events:[],warm:0,brave:0,log:[{day:1,text:'歌の島に到着。施設を建てて、住民の声を集めよう。'}],done:false};
 }
 function clamp(v,min,max){return Math.min(max,Math.max(min,v));}
 function addLog(s,text){s.log.unshift({day:s.day,text});s.log=s.log.slice(0,40);}
 function act(s,kind,song,plot){
  if(s.done)return {ok:false,message:'この歌物語は結ばれています。'};
  if(s.ap<=0)return {ok:false,message:'今日の行動は終わりました。「一日を結ぶ」で明日へ。'};
  const type=song.type||classify(song),spec=TYPES[type];
  let e=0,txt='';
  if(kind==='build'){
   const b=BUILDINGS[plot?.kind],idx=plot?.index;
   if(!b||!Number.isInteger(idx)||idx<0||idx>8||s.grid[idx])return {ok:false,message:'空いている土地を選んでね。'};
   const cost=Math.max(1,b.cost-(s.party.includes('kanade')?1:0));
   if(s.material<cost)return {ok:false,message:'素材が足りません。探索で集められます。'};
   s.material-=cost;s.grid[idx]=plot.kind;
   s.resonance+=plot.kind===spec.building?6:2;
   txt=b.label+'を建てた。'+(plot.kind===spec.building?'この歌の気配と響き合っている。':'島に新しい居場所ができた。');
  }else if(kind==='explore'){
   e=2;if(s.energy<e)return {ok:false,message:'体力が足りません。休息を選びましょう。'};
   const gain=4+(s.party.includes('sora')?2:0)+(type==='journey'||type==='tide'?2:0);
   s.material+=gain;s.resonance+=5;txt='島を探索。素材 +'+gain+'、共鳴 +5。住民の足跡を見つけた。';
  }else if(kind==='listen'){
   e=1;if(s.energy<e)return {ok:false,message:'体力が足りません。休息を選びましょう。'};
   const gain=6+(s.party.includes('toka')?3:0)+(spec.action==='listen'?4:0);
   s.trust=clamp(s.trust+10,0,100);s.resonance+=gain;txt='住民と対話。信頼 +10、共鳴 +'+gain+'。ことばの奥にある願いを聴いた。';
  }else if(kind==='perform'){
   e=3;if(s.energy<e)return {ok:false,message:'体力が足りません。休息を選びましょう。'};
   const gain=14+(s.party.includes('ritsu')?5:0)+(spec.action==='perform'?5:0)+s.grid.filter(x=>x==='stage').length*2;
   s.resonance+=gain;s.trust=clamp(s.trust+3,0,100);txt='みんなで演奏。共鳴 +'+gain+'、信頼 +3。島の輪郭に色が戻る。';
  }else if(kind==='rest'){
   const gain=6+(s.party.includes('nagi')?3:0);s.energy=clamp(s.energy+gain,0,12);s.trust=clamp(s.trust+2,0,100);txt='木陰で休息。体力 +'+gain+'。急がず、息を整えた。';
  }else return {ok:false,message:'行動を選んでね。'};
  s.energy-=e;s.ap--;s.resonance=clamp(s.resonance,0,999);addLog(s,txt);
  return {ok:true,message:txt};
 }
 function needsEvent(s){return [2,4].includes(s.day)&&!s.events.includes(s.day);}
 function choose(s,kind){
  if(!needsEvent(s))return {ok:false};
  if(kind==='warm'){s.trust=clamp(s.trust+14,0,100);s.resonance+=5;s.warm++;addLog(s,'想いに寄り添う道を選んだ。信頼 +14、共鳴 +5。');}
  else if(kind==='brave'){s.trust=clamp(s.trust+3,0,100);s.resonance+=18;s.brave++;addLog(s,'新しい一歩を選んだ。共鳴 +18、信頼 +3。');}
  else return {ok:false};
  s.events.push(s.day);return {ok:true};
 }
 function endDay(s){
  if(s.done)return {ok:false};
  if(needsEvent(s))return {ok:false,message:'住民との物語の選択を先に決めましょう。'};
  let r=s.party.includes('shiori')?3:0,t=s.party.includes('lily')?2:0,m=0;
  s.grid.forEach(b=>{if(b){r+=BUILDINGS[b].resonance;t+=BUILDINGS[b].trust;m+=BUILDINGS[b].material;}});
  r+=(s.upgrades.library||0);s.resonance=clamp(s.resonance+r,0,999);s.trust=clamp(s.trust+t,0,100);s.material+=m;s.energy=clamp(s.energy+3,0,12);
  addLog(s,'夕暮れの収穫：共鳴 +'+r+'、信頼 +'+t+'、素材 +'+m+'。');
  s.day++;s.ap=3;return {ok:true,expired:s.day>7,event:needsEvent(s)};
 }
 function canFinish(s,song){const g=targets(song);return s.day>=4&&s.events.includes(4)&&s.resonance>=g.resonance&&s.trust>=g.trust;}
 function result(s,song){const g=targets(song),success=s.events.includes(4)&&s.resonance>=g.resonance&&s.trust>=g.trust;return {success,stars:success?1+(s.day<=6?1:0)+(s.trust>=75?1:0):0,ending:s.warm>=s.brave?'warm':'brave',resonance:s.resonance,trust:s.trust,day:Math.min(s.day,7),reward:success?12+(s.day<=6?3:0)+(s.trust>=75?3:0):0};}
 const API={TYPES,BUILDINGS,ACTS,CREW,classify,actFor,targets,initStage,act,choose,endDay,needsEvent,canFinish,result};
 root.GAME_ENGINE=API;if(typeof module!=='undefined')module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
