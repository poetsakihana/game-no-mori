// Reconstructed silhouettes match the original Monster assets; battle techniques are remake additions.
const atlas=(sheet,index,cols,rows,kind,description,hue=0)=>({sheet,index,cols,rows,kind,description,hue});
const ordinary=[
 ['擬態魔','橙と紫の触手、多数の眼を持つ擬態生物。岩陰に身を縮め、近づいた相手へ伸びる。'],
 ['大蜘蛛','毛に覆われた八本の脚と大きな牙。低い姿勢から素早く距離を詰める。'],
 ['水棲魚','古い水路に棲む大きな魚。濡れた鱗が光を返し、流れに乗って襲う。'],
 ['甲殻類','硬い甲羅と二つの鋏。正面の守りは厚いが、攻撃後の隙は大きい。'],
 ['ゴブリン','道具を使う小柄な魔物。粗末な装備でも群れの連携を侮れない。'],
 ['鳥人','翼と鉤爪を持つ鳥人。高低差を使った急降下に注意。'],
 ['巨獣','厚い毛皮と長い牙を持つ巨獣。足を踏み固める動作が突進の合図。'],
 ['狼人','二足で立つ獣。連続した爪撃の後に、強い一撃が来る。'],
 ['屍鬼','消え残った魔力で動く屍鬼。腕を伸ばした時は噛みつきの間合い。'],
 ['死霊術師','死霊を使役する術者。詠唱の間に構えを崩すと攻めやすい。'],
 ['怪鳥','鶏に似た頭と異形の尾を持つ怪鳥。羽を広げたら急襲に備える。'],
 ['水塊','川面そのものが寄り集まったような水の魔物。輪郭を変えて打ち寄せる。']
];
const originalKinds=['粘体','夜翼','牙獣','毒虫','骸骨','樹精','岩巨人','黒騎士','亡霊','飛竜','魔眼','蜥蜴兵'];
const originalDescriptions=['柔らかい体で地面を滑る。動きが止まった瞬間に核を狙おう。','暗がりの飛行生物。旋回の後に急降下する。','牙と爪で襲う獣。低く身を沈めたら突進の合図。','外殻に身を包む虫。羽音と針の動きに注意。','朽ちた骨を魔力がつなぐ。崩しに成功すると動きが止まる。','古木や植物に宿る存在。根や枝の振り上げを見極める。','岩の重みを使う巨体。遅い構えから重い一撃を放つ。','武具を使う戦士。間合いを測り、攻撃直前に受け流そう。','薄霧のような霊体。光と魔力の動きが手掛かり。','長い尾と翼を持つ竜種。羽ばたきと息吹の予兆を読む。','眼に魔力を集める存在。視線が固定されたら攻撃が来る。','鱗を持つ戦士。長い尾と武器の両方に注意する。'];
export const BOSS_GROUPS=[
 {name:'ゴザレス丸太郎',ids:[206],journey:0},{name:'古代竜',ids:[214],journey:1},{name:'無玄武',ids:[221],journey:2},{name:'ゴーザレス',ids:[239],journey:3},{name:'火山男',ids:[241],journey:4},{name:'タイタン',ids:[248],journey:5},{name:'毒魔騎士龍',ids:[249],journey:6},{name:'伝空士ドドゴン',ids:[251],journey:7},{name:'冥王・速殺者・ﾛﾊﾞｸ王',ids:[252],journey:8},{name:'ｼﾞｬｲｱﾝ･ﾜﾗｹﾙｺﾝｸﾞ',ids:[262],journey:9},{name:'ダークデュザンカス',ids:[267],journey:10},{name:'ロバク・ロード',ids:[275],journey:11},
 {name:'サラマンダー',ids:[120],index:0},{name:'ウンディーネ',ids:[121],index:1},{name:'シルフ',ids:[122],index:2},{name:'ドアガードシステム',ids:[233],index:3},
 {name:'フミラー',ids:[130],index:4},{name:'ミノタウルス',ids:[231,235],index:5},{name:'ザレヘホマ',ids:[236],index:6},{name:'天空竜',ids:[243],index:7},
 {name:'海央竜',ids:[244],index:8},{name:'ゼクンドゥス',ids:[245],index:9},{name:'ゴルバス',ids:[254],index:10},{name:'幻想人・アルベルト',ids:[255],index:11},
 {name:'ヌチス丸の試練',ids:[204],hero:5},
 {name:'最強竜',ids:[223,225,227],major:0},{name:'バグダス',ids:[155,237],major:1},{name:'メフォルト',ids:[258,259,260,277,285],major:2},{name:'ディス',ids:[279,280,281,282,283,284,286,287,288],major:3}
];
const ordinaryIDs={99:0,133:1,134:2,141:3,42:4,150:5,95:6,112:7,193:8,198:9,147:10,246:11};
const ordinaryImages={'ミミック':0,'タランチュラ':1,'レモラ':2,'クラブ':3,'ゴブリン':4,'ハーピー':5,'マンモス':6,'ワーウルフ':7,'グール':8,'ネクロマンサー':9,'コカトリス':10,'川':11};
const originalIDs={132:0,83:1,92:3,54:4,68:7,107:11,202:6,183:9,226:9,190:8,191:7,194:10,238:7,196:4,250:9,184:9};
const bossDescriptions=[
 '炎をまとった契約の精霊。熱が足元に広がったら全体攻撃に備える。','水の流れを操る契約の精霊。傷を癒す構えには崩しが有効。','風と翼を持つ契約の精霊。素早い攻撃を続けた後に大きく舞う。','眼を持つ巨大な石の扉。守るために造られた構造が、道を塞ぐ。','長い胴を持つ霊妙な竜。契約を結ぶに値するか、意志を試す。','牛の頭と大きな斧を持つ番人。横薙ぎの後の踏み込みを見よう。','赤い鎧に身を包む強敵。防具の重みをそのまま攻撃に変える。','雲海の高みを守る竜。天時剣へ続く道で、風を巻き起こす。','厚い皮膚と角を持つ海の巨体。海時剣を守り、波を震わせる。','時空剣を守る剣士。足を止め、刃を構えた瞬間が大技の前触れ。','黄の光が鎧の隙間から覗く重装の敵。過去に干渉する力を、盾ごと押し返そう。','友の名を帯びた幻想。現実のアルベルトと同じものとは限らない。'
];
export function enemyDesign(source,family=0,title=''){
 // All parts of Dis share one body in battle; their individual records remain separate.
 if(title.includes('ディス'))return atlas('bosses',3,2,2,'ディス','巨大な眼と浮遊する腕。部位ごとに攻撃の構えが異なる。');
 const group=BOSS_GROUPS.find(g=>g.ids.includes(source.id));
 if(group){if(group.journey!==undefined)return atlas('bosses-journey',group.journey,4,3,group.name,'原作の魔物を写実調に描き直した追加ボス。物語の途中で、土地の暮らしや記憶をめぐる戦いに現れる。');if(group.hero!==undefined)return atlas('heroes',group.hero,3,2,'忍者','仲間になる前の手合わせ。影と間合いを使い、旅人の覚悟を試す。');
 if(group.major!==undefined)return atlas('bosses',group.major,2,2,group.name,['復讐の先に立つ竜。力だけでは理解できない過去を持つ。','歴史の分岐に深く関わる者。闇の波と魔力の侵食に注意する。','多眼の核を持つ存在。形態を変えるほど、力の集中が速くなる。','守護者の眼と腕。怒りを終わらせるため、最後の構えを崩そう。'][group.major],source.id===259?18:source.id===277?-20:0);
 return atlas('bosses-extra',group.index,4,3,group.name,bossDescriptions[group.index]);}
 const ix=ordinaryIDs[source.id]??ordinaryImages[source.image];if(ix!==undefined)return atlas('enemies-extra',ix,4,3,...ordinary[ix]);
 const i=originalIDs[source.id]??family;return atlas('enemies',i,4,3,originalKinds[i],originalDescriptions[i],source.id===184?25:source.id===238?35:source.id===191?-20:0);
}
const move=(name,kind='strike',power=1,all=false,color='#ddb480')=>({name,kind,power,all,color});
const slash=move('斬り込み'),sweep=move('広い薙ぎ払い','sweep',1.55,true),crush=move('踏み込みの一撃','crush',1.7,true);
const profiles={
 206:{weak:'light',cadence:3.9,moves:[move('霞の抜刀'),move('すり抜けの刃','pierce',1.35),move('散り影','sweep',1.45,true)]},
 214:{weak:'wind',moves:[move('古竜の爪'),move('太古の咆哮','wave',1.35,true),move('灰色の息吹','breath',1.6,true)]},
 221:{weak:'fire',moves:[move('甲羅の圧力','crush',1.15),move('山水の再生','mend',.045),move('地脈の震え','wave',1.55,true)]},
 239:{weak:'arcane',cadence:4,moves:[move('河童の鋏打ち'),move('水面の滑走','pierce',1.25),move('濁流返し','wave',1.45,true)]},
 241:{weak:'wind',moves:[move('熔岩の槌','crush',1.2),move('火口の熱波','wave',1.3,true),move('噴石崩し','crush',1.6,true)]},
 248:{weak:'arcane',moves:[move('鎖の薙ぎ払い','sweep',1.2,true),move('岩の拳','pierce',1.4),move('地層の隆起','crush',1.6,true)]},
 249:{weak:'light',moves:[move('輪の牙','pierce',1.2),move('毒霧の侵食','hex',1.2,true),move('環状の衝撃','wave',1.55,true)]},
 251:{weak:'shadow',moves:[move('四首の牙'),move('重なる息吹','breath',1.4,true),move('雲海裂き','sweep',1.6,true)]},
 252:{weak:'light',moves:[move('王の断罪'),move('処刑の貫刃','pierce',1.45),move('墓所の号令','hex',1.45,true)]},
 262:{weak:'fire',moves:[move('巨猿の剛腕','crush',1.2),move('跳躍の一撃','pierce',1.3),move('崩れる街道','crush',1.55,true)]},
 267:{weak:'wind',moves:[move('巨獣の牙','pierce',1.3),move('境界の震動','wave',1.35,true),move('黒き突進','crush',1.7,true)]},
 275:{weak:'light',moves:[move('王領の刃'),move('記録の焼却','hex',1.3,true),move('霊王の大剣','sweep',1.65,true)]},

 120:{weak:'wind',moves:[move('炎の爪'),move('火の輪','sweep',1.3,true,'#ff984e'),move('灼熱の息吹','breath',1.65,true,'#ff784a')]},
 121:{weak:'arcane',moves:[move('水の槍','beam',1.05,false,'#79d8ff'),move('水環の再生','mend',.055,false,'#8cebd5'),move('奔流','wave',1.55,true,'#79d8ff')]},
 122:{weak:'fire',cadence:4.1,moves:[move('風の刃','beam',.95,false,'#a7f6df'),move('旋回する羽','sweep',1.15,true,'#c5f9ec'),move('大気の渦','wave',1.5,true,'#a7f6df')]},
 233:{weak:'arcane',moves:[move('門の衝撃','crush',1.1),move('石組みの修復','mend',.04),move('閉門圧壊','crush',1.7,true)]},
 130:{weak:'shadow',moves:[move('竜の爪'),move('天空の呼気','breath',1.2,true,'#c3d6fa'),move('契約の雷','beam',1.6,true,'#e1d9ff')]},
 231:{weak:'fire',moves:[slash,move('角の突進','pierce',1.4),crush]},235:{weak:'fire',moves:[slash,move('角の突進','pierce',1.4),crush]},
 236:{weak:'arcane',moves:[move('赤鋼の斬撃'),move('鎧の突破','pierce',1.35),move('黒鉄の衝撃','crush',1.65,true)]},
 243:{weak:'shadow',moves:[move('雲を裂く爪'),move('暴風の翼','sweep',1.3,true,'#d4f2ff'),move('天空の息吹','breath',1.65,true,'#d4f2ff')]},
 244:{weak:'fire',moves:[move('海央の角','pierce',1.15),move('大波','wave',1.35,true,'#75cbfa'),move('深海の震動','crush',1.6,true,'#75cbfa')]},
 245:{weak:'light',moves:[move('時断剣'),move('時の貫刃','pierce',1.4),move('境界を断つ刃','sweep',1.7,true,'#bbabfb')]},
 254:{weak:'wind',moves:[move('防盾撃','crush',1.05),move('重装突進','pierce',1.4),move('壁砕き','crush',1.6,true)]},
 255:{weak:'light',moves:[move('幻の刃','strike',1,false,'#bea6f6'),move('記憶の侵食','hex',1.1,false,'#ae93e9'),move('影の奔流','wave',1.55,true,'#ae93e9')]},
 204:{weak:'light',cadence:4,moves:[move('影の一閃'),move('忍びの突き','pierce',1.25),move('散り刃','sweep',1.4,true)]},
};
const majorMoves=[
 [move('竜爪'),move('尾の薙ぎ払い','sweep',1.3,true),move('終焉の火息','breath',1.7,true,'#ff9a68')],
 [move('闇の魔弾','beam',1,false,'#b59af3'),move('魔力の侵食','hex',1.1,false,'#cda6ff'),move('邪翼の波動','wave',1.65,true,'#b59af3')],
 [move('凝視の光','beam',1.1,false,'#f79f9f'),move('核の侵食','hex',1.15,false,'#e48cdb'),move('多眼の閃光','beam',1.7,true,'#ffc2da')],
 [move('守護の光線','beam',1.05,false,'#95dafa'),move('怒りの圧力','hex',1.1,false,'#c4adff'),move('世界を震わす光','wave',1.7,true,'#afdbff')]
];
export function enemyProfile(source,family){const p=profiles[source.id];if(p)return{cadence:4.5,...p};const boss=BOSS_GROUPS.find(g=>g.ids.includes(source.id));if(boss?.major!==undefined)return{cadence:4.5,moves:majorMoves[boss.major]};
 const names={0:['体当たり','粘液の弾','のしかかり'],1:['噛みつき','旋回','急降下'],2:['爪撃','牙の突進','飛びかかり'],3:['毒針','連撃','鋭い一刺し'],4:['骨の刃','刺突','骨砕き'],5:['根の突き','葉の嵐','枝の大薙ぎ'],6:['岩拳','踏みつけ','大地の震動'],7:['斬撃','踏み込み','強打'],8:['霊気','幻の光','怨念の波'],9:['竜爪','翼の風','竜の息'],10:['魔眼の光','精神侵食','凝視の閃光'],11:['鱗の刃','尾撃','荒ぶる突き']}[family]||['攻撃','連撃','強打'];return{cadence:5.3,moves:[move(names[0]),move(names[1],family===10?'hex':'strike',1.1),move(names[2],family===9?'breath':'crush',1.55)]};}
export function intendedMove(enemy){return enemy.profile.moves[enemy.intentType%enemy.profile.moves.length];}
export function moveHint(move){return move.kind==='mend'?'崩して再生を遅らせる':move.kind==='pierce'?'貫通攻撃 · 回避が有効':move.all?'全員が対象 · 防御か回避':'単体攻撃 · 直前防御が有効';}
