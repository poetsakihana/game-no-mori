'use strict';
const QuestData={key:'paint-smash-quest-rewards-v1',state:{cleared:{},coins:{}},
 entries:[
 ['amana','奏でる静穏の夜想曲','アマナ','絶級','初回クリア','https://www.4gamer.net/games/375/G037568/20180831192/'],
 ['resty','悩める盛飾の高慢娘','レスティ','絶級','初回クリア','https://www.4gamer.net/games/375/G037568/20180831192/'],
 ['salva','苛烈なる煉獄の匠人','サルヴァ','ハンターダンジョン','クエストクリア','https://www.4gamer.net/games/375/G037568/20190410020/'],
 ['shile','語りし風雲の吟遊詩人','シャイル','ハンターダンジョン','クエストクリア','https://www.4gamer.net/games/375/G037568/20190410020/'],
 ['gart','豪胆なる救命の囚徒','ガートリウム','絶級','初回クリア','https://gamebiz.jp/news/224964'],
 ['neo','夢幻なる業火の隠匿者','ネオ','滅級','クエストクリア','https://www.gamer.ne.jp/news/201902020002'],
 ['orso','夢幻なる氷河の月輪熊','オルソー','滅級','クエストクリア','https://www.gamer.ne.jp/news/201904050011/'],
 ['noah','夢幻なる漆黒の凶漢者','ノア','滅級','初回クリア','https://www.4gamer.net/games/375/G037568/20191011089/'],
 ['arcana','メインストーリー11章','アルカナ','ストーリー','章クリア','https://www.4gamer.net/games/375/G037568/20200304061/'],
 ['roln','機敏なる蒼天の淳良者','ロルン','コイン交換','蒼天コイン','https://dengekionline.com/elem/000/001/872/1872256/'],
 ['nanaly','祈願せし安穏な聖職者','ナナリー','コイン交換','報恩コイン','https://www.4gamer.net/games/375/G037568/20190305076/'],
 ['liberta','豪傑なる圧巻な酒仙女','リベルタ','コイン交換','豪傑コイン','https://www.4gamer.net/games/375/G037568/20190410020/']
 ].map(([id,name,hero,type,method,source])=>({id,name,hero,type,method,source})),
 confirmedGacha:new Set(['アーベル','ユニス','クレア','ヨミ','アケディア','ラジエル','メイジー','プレジール','ノーバディ','ダンジェル']),
 eligible(h){return this.confirmedGacha.has(h.name)&&!this.entries.some(q=>q.hero===h.name)},
 find(n){return this.entries.find(q=>q.hero===n)},
 save(){try{BrowserStore.setItem(this.key,JSON.stringify(this.state))}catch{}},
 load(){try{const x=JSON.parse(BrowserStore.getItem(this.key));for(const q of this.entries){if(x?.cleared?.[q.id]===true)this.state.cleared[q.id]=true;if(Number.isSafeInteger(x?.coins?.[q.id])&&x.coins[q.id]>=0)this.state.coins[q.id]=x.coins[q.id]}}catch{}},
 reward(){const q=this.entries.find(q=>q.id===S.questId);if(!q)return '';let msg='';if(q.type==='コイン交換'){this.state.coins[q.id]=(this.state.coins[q.id]||0)+10;msg=q.method+'＋10（交換は30枚）'}else if(!this.state.cleared[q.id]){Owned.add(q.hero);this.state.cleared[q.id]=true;Owned.save();msg=q.hero+' ×1（クエスト初回報酬）'}else msg='ハンター初回報酬は受取済み';this.save();return msg},
 exchange(id){const q=this.entries.find(q=>q.id===id&&q.type==='コイン交換');if(!q||(this.state.coins[id]||0)<30)return false;this.state.coins[id]-=30;Owned.add(q.hero);Owned.save();this.save();Owned.refresh();return true},
 reset(){this.state={cleared:{},coins:{}};this.save()},
 render(){ $('questRewardList').innerHTML=this.entries.map(q=>`<article class="quest-reward-card">${VISUALS.hero(q.hero,'mini')}<div><small>${q.type} / ガチャ排出なし</small><h3>${q.name}</h3><b>入手：${q.hero}</b><p>原作の入手方法：${q.method}</p><p>${q.type==='コイン交換'?q.method+'：'+(this.state.coins[q.id]||0)+'枚（試作版は30枚で1体）':this.state.cleared[q.id]?'初回報酬 受取済み':'初回報酬 未受取'}</p><div class="keys"><button data-quest-play="${q.id}" ${!Owned.ready()?'disabled':''}>${q.id==='arcana'?'メインストーリー第11章へ':'試作クエストへ出発'}</button>${q.type==='コイン交換'?`<button data-quest-exchange="${q.id}" ${(this.state.coins[q.id]||0)<30?'disabled':''}>30枚で交換</button>`:''}<a href="${q.source}" target="_blank" rel="noopener noreferrer">入手方法の資料 ↗</a></div></div></article>`).join('');document.querySelectorAll('[data-quest-play]').forEach(b=>b.onclick=()=>b.dataset.questPlay==='arcana'&&globalThis.Story?Story.open(11):BattlePlus.launchQuest(b.dataset.questPlay));document.querySelectorAll('[data-quest-exchange]').forEach(b=>b.onclick=()=>this.exchange(b.dataset.questExchange));VISUALS.paint()}
};QuestData.load();globalThis.QuestData=QuestData;
