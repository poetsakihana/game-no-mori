// Twenty body families, five named species in each. Keep existing save IDs stable.
export const TRAITS={none:{label:'標準',desc:'予兆を見てから反撃しよう。'},swift:{label:'俊足',desc:'移動と攻撃の準備が速い。'},armored:{label:'硬殻',desc:'近接攻撃を25%軽減。魔法が有効。'},venom:{label:'毒',desc:'命中すると6秒間、毒が体力を削る。'},frost:{label:'氷結',desc:'命中すると3秒間、移動速度が低下。'},shock:{label:'雷撃',desc:'命中するとスタミナを追加で削る。'},burn:{label:'火傷',desc:'命中すると4秒間、炎が体力を削る。'},leech:{label:'吸命',desc:'攻撃を当てると自身の体力を回復。'},multishot:{label:'拡散',desc:'飛び道具を扇状に放つ。'},regen:{label:'再生',desc:'交戦中、体力が少しずつ回復。'}};
const families=[
['slime','粘体','slime',['スライム','イエロースライム','ラーバジェル','スライムセル','プリズムスライム'],0x69c9c5,35,8,1.7,'melee',['none','shock','burn','venom','multishot'],'透き通る核を持つ弾力ある体'],
['mushroom','茸','mushroom',['ポップマッシュ','トキシックマッシュ','ダークファンガス','デスファンガス','月光マッシュ'],0x9970c0,38,9,1.2,'ranged',['none','venom','leech','venom','regen'],'大きな傘と光る斑点'],
['lizard','蜥蜴戦士','lizard',['リザードマン','リザノイド','ロックリザード','ハイリザード','翠鱗の槍兵'],0x7caa70,55,12,2.1,'melee',['none','swift','armored','venom','frost'],'鱗の鎧と長い尾'],
['bat','蝙蝠','bat',['バット','ファミリア','ヴァンパイアバット','ブラッドサック','雷翼コウモリ'],0x807db1,30,10,2.8,'charge',['none','swift','leech','venom','shock'],'張り出した翼と尖った耳'],
['wolf','獣','wolf',['ワーウルフ','アームドウルフ','ライカンスロープ','フロストファング','影牙フェンリル'],0x899ca5,50,13,2.5,'charge',['none','armored','swift','frost','leech'],'低い姿勢と鋭い牙'],
['golem','石像','golem',['ゴーレムナイト','マッドゴーレム','ツインゴーレムＧ','ツインゴーレムＲ','黒曜の巨兵'],0x99a1a0,85,15,1.1,'slam',['armored','regen','shock','burn','armored'],'継ぎ目に光が流れる石の装甲'],
['ghost','亡霊','ghost',['ゴースト','シェイド','スペクター','ファントム','残響の亡霊'],0xb2b7dc,42,12,1.7,'ranged',['none','frost','leech','swift','multishot'],'宙に浮かぶ仮面と裂けた外套'],
['wizard','術師','wizard',['ウィザード','ソーサラー','胞子の呪術師','蒼晶の導師','宵闇の占星師'],0xa77aca,48,14,1.2,'ranged',['none','multishot','venom','frost','shock'],'尖った帽子と結晶の杖'],
['knight','騎士','knight',['ダークナイト','バーサーカー','ウォーロード','紅蓮の重騎士','月蝕の剣聖'],0x596578,75,16,1.8,'melee',['armored','swift','armored','burn','leech'],'鋭い兜と長剣を持つ甲冑'],
['dragon','小竜','dragon',['タイニードラゴン','ベビードラゴン','エレメドラゴン','レッサードラゴン','エンシェントレックス'],0xb88667,65,15,1.5,'breath',['none','swift','shock','frost','burn'],'小さな翼と角のある頭'],
['mimic','擬態箱','mimic',['ミミック','ライフトラップ','ソウルトラップ','呪われた宝箱','黄金の牙箱'],0xa78a55,60,14,1.8,'melee',['none','leech','venom','frost','armored'],'宝箱の蓋に並ぶ白い牙'],
['spider','蜘蛛','spider',['ケイブスパイダー','糸織りスパイダー','トキシックウィーバー','白霜の蜘蛛','深淵の糸狩り'],0x7d7498,38,10,2.2,'charge',['none','swift','venom','frost','multishot'],'八本の関節脚と球形の腹'],
['scorpion','蠍','scorpion',['サンドスコーピオン','ホーンヘッド','キメラヘッド','ユニコーンヘッド','ゴートヘッド'],0xa79766,52,12,1.7,'melee',['none','armored','venom','shock','burn'],'二本の鋏と高く反った毒尾'],
['beetle','甲虫','beetle',['アイアンビートル','苔むす甲虫','水晶カブト','ブレイズビートル','王冠甲虫'],0x678674,58,11,1.6,'charge',['armored','regen','frost','burn','shock'],'大きな一角と丸い甲殻'],
['serpent','蛇','serpent',['ルインスネーク','ナーガの幼生','毒鱗バイパー','蒼海の蛇','緋色のバジリスク'],0x699b8b,45,12,2,'breath',['none','swift','venom','frost','burn'],'節の続く胴と割れた舌'],
['plant','食肉植物','plant',['マンドレイク','ドリアード','ネペンテス','クリスタルブルーム','アビスローズ'],0x6f9761,46,10,1,'ranged',['regen','venom','leech','frost','multishot'],'重なる花弁と鞭のような蔓'],
['skeleton','骸骨','skeleton',['ボーンウォーカー','錆剣の骸兵','スカルメイジ','霜鎧の骸骨','黒曜の骨騎士'],0xc7bea4,44,11,1.9,'melee',['none','armored','multishot','frost','leech'],'肋骨の胸と空洞の眼窩'],
['harpy','鳥人','harpy',['ルインハーピー','ワイルドグース','コカトリス','スクリームウィング','焔羽の鳥人'],0xa48491,40,12,2.4,'charge',['none','swift','venom','shock','burn'],'羽毛の翼と鉤爪の足'],
['crab','甲殻','crab',['ストーンクラブ','蒼甲のヤドカリ','ラバクラブ','雷鋏クラブ','深海の装甲蟹'],0x8d9c9e,65,12,1.3,'slam',['armored','frost','burn','shock','regen'],'横に張った鋏と厚い甲羅'],
['elemental','精霊','elemental',['ルーンウィスプ','フロストオーブ','ナパーム','ストームコア','虚空のエレメント'],0x9ccbd3,36,12,1.8,'ranged',['none','frost','burn','shock','multishot'],'環の中で浮遊する光の核']
];
const palette=[0x91baa7,0x80adce,0xd78661,0x9b75b2,0xe4bf73];
function tint(a,b,t){let c=0;for(const shift of[0,8,16])c|=Math.round(((a>>shift)&255)*(1-t)+((b>>shift)&255)*t)<<shift;return c;}
export const ENEMIES={},NORMAL_IDS=[];
for(let v=0;v<5;v++)for(let fi=0;fi<families.length;fi++){
 const[id,family,shape,names,color,hp,damage,speed,mode,traits,visual]=families[fi],key=v===0?id:`${id}_${v+1}`,trait=traits[v],region=Math.floor(NORMAL_IDS.length*7/100);
 const pattern=v===0?[mode]:v===1?[mode,'charge']:v===2?[mode,'slam']:v===3?[mode,'ranged']:[mode,'breath','slam'];
 ENEMIES[key]={name:names[v],family,shape,color:tint(color,palette[v],v===0?.05:.34),accent:palette[(v+fi)%5],hp:Math.round(hp*(1+v*.12)),damage:Math.round(damage*(1+v*.06)),speed:speed*(trait==='swift'?1.22:1),range:mode==='ranged'?6:mode==='breath'?5.5:mode==='charge'?4.5:mode==='slam'?2.7:1.9,mode,pattern,trait,variant:v,region,boss:false,scale:.9+v*.04,desc:`${visual}が特徴の${family}型。${TRAITS[trait].desc}`};NORMAL_IDS.push(key);
}
const bossRows=[
['rootwarden','遺跡の門番 ガルド','golem',0x8d9e87,155,13,'armored',['melee','slam','charge']],
['silkqueen','糸織り女王 ネフェラ','spider',0x9c7cb6,205,14,'venom',['ranged','charge','slam']],
['guardian','ラビリンスガーディア','golem',0x8f9c95,260,17,'shock',['melee','charge','slam','ranged']],
['sporeking','茸王 モルガス','mushroom',0xa984b9,285,18,'venom',['ranged','slam','breath']],
['thornmatron','茨の母 ベラドンナ','plant',0x7f9c65,310,19,'regen',['breath','ranged','slam']],
['wyvern','ワイバーン','dragon',0x7292a6,335,20,'frost',['breath','charge','slam','ranged']],
['crystalcrab','蒼晶大蟹 グラシア','crab',0x7ca8bf,360,21,'armored',['slam','charge','ranged']],
['stormeye','雷眼球 オルヴィス','elemental',0xb8a6df,390,22,'shock',['ranged','breath','slam']],
['cyclops','サイクロプス','golem',0x957f9f,420,23,'frost',['slam','melee','charge','ranged']],
['emberscorpion','炎尾蠍 スルカン','scorpion',0xc77f55,450,24,'burn',['charge','breath','slam']],
['furnacebeetle','炉心甲虫 バルカ','beetle',0x9f7555,480,25,'armored',['charge','slam','breath']],
['talos','タロス','knight',0x8a6b48,510,26,'burn',['melee','charge','slam','ranged']],
['bellwraith','弔鐘の亡霊 レクイエ','ghost',0xc1bad5,540,26,'leech',['ranged','breath','slam']],
['moonharpy','月翼の女王 セレーネ','harpy',0xaaa0c3,570,27,'frost',['charge','ranged','breath']],
['darklord','ダークロード','knight',0x655b85,600,28,'leech',['melee','ranged','charge','slam']],
['boneemperor','骸帝 ネクロス','skeleton',0xb4a6a1,635,29,'multishot',['melee','ranged','slam']],
['abyssserpent','深淵蛇 ヨルム','serpent',0x7b8192,670,30,'venom',['breath','charge','slam']],
['archdragon','アークドラゴン','dragon',0xa85752,710,31,'burn',['breath','charge','slam','ranged']],
['eclipsewolf','日蝕狼 フェンリル','wolf',0x62697c,750,31,'swift',['charge','melee','slam']],
['goldmimic','黄金庫の王 マモン','mimic',0xc8a452,790,32,'leech',['melee','breath','slam']],
['phoenix','フェニックス','phoenix',0xf6a953,850,34,'burn',['breath','charge','slam','ranged']]
];
export const FLOOR_BOSSES=bossRows.map(([id,name,shape,color,hp,damage,trait,pattern],i)=>{ENEMIES[id]={name,family:'階層守護者',shape,color,accent:palette[i%5],hp,damage,speed:trait==='swift'?2.6:1.35+(i%3)*.12,range:5,mode:'boss',pattern,trait,variant:4,region:Math.floor(i/3),floor:i+1,boss:true,scale:shape==='phoenix'?1.7:1.65,desc:`地下${i+1}階を守る固有ボス。${TRAITS[trait].desc} 体力半分で激昂し、攻撃が速くなる。`};return id;});
export const BOSSES=FLOOR_BOSSES;
export const POOLS=Array.from({length:7},(_,region)=>NORMAL_IDS.filter(id=>ENEMIES[id].region===region));
export const FLOOR_ENCOUNTERS=Array.from({length:21},(_,index)=>{const pool=POOLS[Math.floor(index/3)],offset=(index%3)*6;return Array.from({length:6},(_,slot)=>pool[(offset+slot)%pool.length]);});
export const CATALOG_REVISION=3;
export function migrateCatalogSave(saved){if((saved.catalogRevision||0)<CATALOG_REVISION){if(saved.floor%3!==0&&!saved.completed){saved.dead=(saved.dead||[]).filter(id=>id!=='4-0');saved.key=false;}saved.catalogRevision=CATALOG_REVISION;}return saved;}
