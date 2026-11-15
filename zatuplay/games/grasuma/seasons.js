'use strict';
const Seasons={
 entries:[{id:'spring',name:'春・桜舞う祝祭',months:'3月1日〜5月31日',hero:'桜舞のハルカ',gender:'男性',element:'火',art:0},{id:'summer',name:'夏・蒼海の冒険',months:'6月1日〜8月31日',hero:'蒼海のミナト',gender:'女性',element:'水',art:1},{id:'autumn',name:'秋・紅葉の収穫祭',months:'9月1日〜11月30日',hero:'紅葉のカエデ',gender:'女性',element:'風',art:2},{id:'winter',name:'冬・雪星の祈り',months:'12月1日〜2月末日',hero:'雪星のシオン',gender:'男性',element:'光',art:3}],
 current(now=Date.now()){const m=new Date(now+9*3600000).getUTCMonth()+1;return this.entries[m>=3&&m<=5?0:m>=6&&m<=8?1:m>=9&&m<=11?2:3]},
 day(now=Date.now()){return new Date(now+9*3600000).toISOString().slice(0,10)},
 pool:'standard',
 find(n){return this.entries.find(e=>e.hero===n)}
};
for(const e of Seasons.entries)roster.push({name:e.hero,rarity:'★4',gender:e.gender,cv:'創作キャラ・音声なし',season:e.id});globalThis.Seasons=Seasons;
