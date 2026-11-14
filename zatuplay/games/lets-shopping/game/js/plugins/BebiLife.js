/* 終わらない暮らし。オフラインのゲーム内日付で進行するオリジナル拡張。 */
var BebiLife={};
(function(){'use strict';var L=BebiLife,Y=BebiYear,D=BebiYearData;
var months=[31,28,31,30,31,30,31,31,30,31,30,31];
L.calendar=function(day){var n=(day-1)%365+1,m=1;while(n>months[m-1]){n-=months[m-1];m++;}return {year:Math.floor((day-1)/365)+1,month:m,date:n};};
var task=Y.task;Y.task=function(){var s=Y.state();if(!s||s.day<=365)return task();var c=L.calendar(s.day),template=D.days[(s.day-366)%334],t=JSON.parse(JSON.stringify(template));t.day=s.day;t.month=c.month;t.date=c.date;t.story=null;t.title=['街の朝ごはん便','家族の夕食準備','友達への差し入れ','季節の保存食','集会所の補充','暮らしの買い足し','お店を支える配達'][(s.day-1)%7];t.requests=t.requests.filter(function(q){return !q.delivery;});t.weather=['晴れ','雨','くもり','風','晴れ','晴れ','くもり'][(s.day+c.month)%7];return t;};
D.chapters[-1]={title:'新しい一年の朝',description:'街の人たちと、新しい一年の暮らしを始めよう。'};
L.state=function(){var s=Y.state();if(!s)return null;if(s.ending){s.ending=false;s.done=true;}return s.life||(s.life={version:1,garden:0,fish:{},museum:{},hearts:[0,0,0,0,0,0],tokens:0,projects:0,festivals:0,used:{},secrets:{},eventLog:[]});};
L.once=function(key){var l=L.state(),k=Y.state().day+':'+key;if(l.used[k])return false;l.used[k]=true;return true;};
L.trim=function(){var s=Y.state();if(!s)return;var l=L.state();l.archive=l.archive||{journal:0,receipts:0,eventLog:0};[['journal',s.journal,600],['receipts',s.receipts,600],['eventLog',l.eventLog,180]].forEach(function(row){var excess=row[1].length-row[2];if(excess>0){row[1].splice(0,excess);l.archive[row[0]]+=excess;}});};
L.record=function(title,text){var s=Y.state();s.journal.push({day:s.day,title:title,text:text});L.trim();};
var next=Y.next;Y.next=function(){var s=Y.state();if(!s)return false;if(s.day<365)return next();if(!s.done)return false;if(s.day===365&&!s.lifeFinale){s.lifeFinale=true;L.record('一年の節目','もく「一年が終わっても、明日のおつかいは続くよ」。べび「まだまだ、いってきまつ！」。');}s.day++;s.done=false;s.ending=false;s.delivered=false;s.sideDone=false;s.incident=null;s.incidentDone=false;s.bag={};s.funded=false;var l=L.state();l.used={};Y.fund();return true;};
// Old completed-year saves resume without erasing diaries or rewards.
var start=Y.start;Y.start=function(){start();var s=Y.state();if(s.ending){s.ending=false;s.done=true;}L.state();};
var fish=['メダカ','フナ','コイ','アユ','イワナ','ワカサギ','ナマズ','カワムツ','ドジョウ','オイカワ','ウグイ','金色の小魚'];
var neighbors=['もく','せいじ','八百屋さん','パン屋さん','本屋さん','配達係'];
var endings=[
 {name:'花の帰り道',hint:'毎日の小さな手入れが、いつか道を変える。',test:function(l){return l.garden>=30;},scenes:['庭の花が、家から商店街まで続く目印になった。迷っていた子が、花をたどって帰ってきた。','もく「べびが毎日育てたのは、花だけじゃないね」。店の人たちが、次の花壇を持って集まった。','べび「どこまででも、咲いてちょう」。花の道の隠れエンディング。明日も庭の世話は続く。']},
 {name:'川の小さな博物館',hint:'同じ川にも、まだ知らない顔がいる。',test:function(l){return Object.keys(l.museum).length===12;},scenes:['最後の魚の記録が棚に並んだ。公園の小さな展示が、街のみんなの博物館になった。','見守りの人「捕まえた魚は観察したあと川へ返したね。記録なら、ずっと大切にできる」。','べび「また会おうね」。川の博物館の隠れエンディング。次の観察も、ここから始まる。']},
 {name:'六つのただいま',hint:'買い物のあとにも、声をかけてみよう。',test:function(l){return l.hearts.every(function(h){return h>=10;});},scenes:['おつかいから戻ると、六人がそれぞれの場所から「おかえり」と呼んだ。','べびが話を聞いた日、贈り物を届けた日。小さなやり取りを、みんな覚えていてくれた。','べび「ただいま、また明日」。仲間の隠れエンディング。街には六つの帰る場所ができた。']},
 {name:'明日の商店街',hint:'手伝いの印を集めて、みんなで街を整えよう。',test:function(l){return l.projects>=4;},scenes:['ベンチ、花壇、案内板、休憩所。四つの共同計画が完成した商店街に、朝の光が差した。','配達係「遠くから来る人も、近くで暮らす人も休める街になったね」。完成の鍵は、べびが預かった。','べび「開店でつ！」。商店街の隠れエンディング。完成した街でも、新しい仕事が待っている。']},
 {name:'終わらないおまつり',hint:'何度でも集まり、一年より先の思い出を作ろう。',test:function(l){return l.festivals>=12&&Y.state().completed>=365;},scenes:['十二回目のお祭りが終わった夜、みんなが過去の写真を一枚ずつ並べた。','一年より長い時間を歩いたべびは、同じ場所でも、同じ一日がないことを知っていた。','べび「明日も、面白くなるでつ」。暮らしの隠れエンディング。物語は終わらず、次の朝へ続く。']}
];L.endings=endings;
L.unlock=function(){var l=L.state();endings.forEach(function(e,i){if(!l.secrets[i]&&e.test(l)){l.secrets[i]=true;L.record('隠れエンディング発見：'+e.name,e.scenes.join(''));}});};
var eventRows=[
 ['朝市の新メニュー','朝市で、余った野菜の使い道を相談された。','スープを提案する','彩りのサンドを提案する','みんなで試作し、使い切れるメニューを見つけた。'],
 ['月明かりの読書会','集会所で夕方の読書会。どんな本を紹介する？','旅の絵本','街の思い出の本','好きな一ページを語り合い、新しい読み仲間ができた。'],
 ['雨の日の音楽','屋根をたたく雨が、楽器のように聞こえる。','リズムを数える','友達と口ずさむ','雨の音から小さな歌ができた。晴れた日にも歌う約束をした。'],
 ['秘密の花の種','花壇の管理人が、二種類の種を持ってきた。','明るい花を選ぶ','香りの花を選ぶ','植えた場所に札を立てた。咲く日の楽しみが一つ増えた。'],
 ['お弁当交換会','公園でお弁当を紹介する会が始まった。','色どりを紹介','食べやすさを紹介','料理の工夫を聞き合った。明日のお弁当に試したいものを見つけた。'],
 ['迷い猫の見守り','猫が店先で休んでいる。無理に追いかけず、できることは？','店の人に知らせる','静かに距離をとる','見守りの人が来て、猫を安全に確認した。街のみんなも静かに待った。'],
 ['商店街の宝探し','店員さんが手作りのなぞなぞを用意した。','看板を観察','人にヒントを聞く','最後の答えは「ありがとう」。小さな宝箱には手伝いの印が入っていた。'],
 ['古い写真の場所','昔の写真に写った場所を探す相談を受けた。','看板を比べる','昔からいる人に聞く','今は違う店になった場所だった。写真と今の風景を日記に並べた。'],
 ['パンの形コンテスト','パン屋さんが新しい形を募集している。','鳥の形','お花の形','お店の窓に試作が並んだ。見た人が笑うパンになった。'],
 ['小さな郵便係','友達が遠くへ送る便りを準備している。','街の話を添える','季節の絵を描く','封筒には日付も書いた。返事を待つ楽しみができた。'],
 ['公園の影絵','夕方の長い影で遊ぶ友達に出会った。','鳥の影を作る','木の影を見つける','短い影絵の劇ができた。通りがかりの人も拍手した。'],
 ['星を見る準備','夜の観察会の案内を手伝ってほしい。','帰り道を確認','休憩場所を確認','大人の見守りと一緒に、安心して参加できる案内になった。'],
 ['花壇の名札','新しい花壇に付ける名前を考えよう。','おかえり花壇','明日の花壇','名前を書いた札を付けると、通る人が足を止めた。'],
 ['倉庫の忘れ物','持ち主の分からない箱を見つけた。','管理係に渡す','記録を一緒に探す','管理係が配送の記録と照合した。箱は正しいお店へ戻った。'],
 ['春の風車','友達が紙の風車を作っている。','色を組み合わせる','回る向きを比べる','よく回る風車ができた。風の吹く道に飾る場所を相談した。'],
 ['夏の日陰マップ','暑い日の休憩場所を街の地図に載せよう。','公園を調べる','集会所を調べる','休憩と水分補給の場所が、分かりやすい地図になった。'],
 ['秋の落ち葉便','管理人と落ち葉を集める日。','色を観察してから集める','形を比べてから集める','道をきれいにしたあと、落ち葉の絵を日記に描いた。'],
 ['冬の編み物会','集会所で小さな飾りを作る会。','色を選ぶ','友達の作品を紹介','飾りを窓に付けた。寒い日の集会所が、少し明るくなった。'],
 ['お店の一日先生','開店準備を教えてもらえることになった。','並べ方を習う','値札の読み方を習う','いつもの買い物の裏にある、たくさんの仕事を知った。'],
 ['明日のタイムカプセル','日記の一ページを未来の自分へ残そう。','今日できたことを書く','これからの夢を書く','箱の場所を管理人と確認した。未来の自分に、小さな約束を残した。'],
 ['大きなシャボン玉','公園の遊び会で、シャボン玉の輪を比べる。','ゆっくり振る','風を待つ','空に大きな丸が浮かんだ。みんなは追いかけず、眺めて楽しんだ。'],
 ['ころころ手作り市','工作の店で看板を考えてほしいと言われた。','作品の名前を紹介','作った人の話を紹介','お客さんが話を聞き、作品を手に取った。'],
 ['野菜の断面図','八百屋さんが、野菜の違いを教えてくれる。','形を描く','色を比べる','食べる前の観察から、いつもの野菜の新しい顔を見つけた。'],
 ['静かな朝の清掃','早い時間に、お店の入口を整える。','案内札を拭く','道のごみを集める','最初のお客さんが気持ちよく歩ける朝になった。'],
 ['絵本の続きを考える','読み聞かせのあと、別の結末を考える会。','再会の話にする','旅立ちの話にする','同じ始まりから違う物語が生まれた。みんなの案を本屋さんが記録した。'],
 ['ベンチの席ゆずり','公園の休憩場所が混んできた。','空いている席を案内','次の休憩所を案内','座りたい人が休めた。遊ぶ人も、静かに場所を分け合った。'],
 ['配達の道しるべ','初めて来た配達係が道を尋ねた。','地図を見せる','案内係を紹介','箱は時間どおり届いた。次から迷わないよう、目印を記録した。'],
 ['ありがとうの掲示板','お礼の言葉を一枚ずつ集める掲示板。','最近のお礼を書く','友達のお礼を読む','掲示板が埋まると、街で助け合った日が見えてきた。'],
 ['小鳥の観察会','見守りの人が、公園の鳥を観察している。','鳴き声を聞く','離れて姿を見る','食べ物を与えず、驚かせずに観察できた。'],
 ['来年の約束','友達が季節の思い出を話し始めた。','また集まる約束','新しい遊びを考える','日記の最後に、次の楽しみを書き足した。']
];L.events=eventRows;
L.eventFor=function(slot){var s=Y.state(),c=L.calendar(s.day);return (s.day*7+c.month*3+slot*11)%eventRows.length;};
L.action=function(a){var s=Y.state(),l=L.state(),text='';if(a==='garden'){if(!L.once('garden'))return '今日は庭の世話を終えたよ。';l.garden++;l.tokens++;text='水やりと手入れをした。庭の育成 '+l.garden+'回。手伝いの印を1個もらった。';}
 else if(a==='fish'){if(!L.once('fish'))return '今日の観察は終わったよ。';var id=(s.day*7)%12;l.fish[id]=(l.fish[id]||0)+1;l.tokens++;text=fish[id]+'を観察！ 魚は川へ返し、観察カードを受け取った。';}
 else if(a==='donate'){var count=0;Object.keys(l.fish).forEach(function(id){if(!l.museum[id]){l.museum[id]=true;count++;}});text=count?'新しい観察カードを'+count+'種類、展示に加えた。':'新しいカードはまだないよ。川を観察してみよう。';}
 else if(a==='project'){if(l.projects>=4)return '四つの共同計画は完成したよ。';if(l.tokens<10)return '手伝いの印が10個必要だよ。庭・観察・住人や街のイベントで集めよう。';l.tokens-=10;l.projects++;text=['ベンチ','花壇','案内板','屋根のある休憩所'][l.projects-1]+'の整備費を商店会に届けた。共同計画 '+l.projects+'/4。';}
 else if(a.indexOf('friend:')===0){var id=Number(a.slice(7));if(!L.once('friend'+id))return '今日はもう、この人と交流したよ。';l.hearts[id]++;l.tokens++;s.friendship++;text=neighbors[id]+'と近況を話し、おつかいを手伝った。仲良し '+l.hearts[id]+'。';}
 else if(a==='festival'){if(s.day%7!==0)return '街の集まりは7日ごとに開催されるよ。';if(!L.once('festival'))return '今日の集まりには、もう参加したよ。';l.festivals++;l.tokens+=2;text=['朝市','おやつ会','工作市','読書祭','花の市','音楽の集い'][(l.festivals-1)%6]+'に参加した！ 参加累計 '+l.festivals+'回。手伝いの印を2個もらった。';}
 else if(a.indexOf('event:')===0){var p=a.split(':'),slot=Number(p[1]),choice=Number(p[2]);if(!L.once('event'+slot))return 'この出来事は、今日はもう終わったよ。';var id=L.eventFor(slot),e=eventRows[id];l.tokens++;l.hearts[(id+choice)%6]++;s.friendship++;l.eventLog.push({day:s.day,id:id,choice:choice});text=e[choice+2]+'を選んだ。'+e[4];}
 if(text)L.record('暮らしの出来事',text);L.unlock();return text;};
var make=Y.Window.prototype.makeCommandList;Y.Window.prototype.makeCommandList=function(){var mode=this.owner.mode,s=Y.state();if(!s){make.call(this);return;}var l=L.state(),self=this;function add(n,a,t,on){self.addCommand(n,'action',on!==false,{action:a,text:t||n});}
 if(mode==='life'){add('庭の手入れ '+l.garden+'回','lifeAction:garden','一日一回、庭を育てます。30回育てた庭には、何かが起きるかもしれません。');add('川の魚を観察する','lifeAction:fish','一日一回、12種類の魚を観察。観察後は川へ返し、カードを記録します。');add('観察カードを展示する '+Object.keys(l.museum).length+'/12','lifeAction:donate','集めた観察カードを博物館へ。新しい種類は一度だけ展示します。');add('商店街の共同計画 '+l.projects+'/4','lifeAction:project','手伝いの印10個で一段階整備します。現在 '+l.tokens+'個。');neighbors.forEach(function(n,i){add(n+'と交流 仲良し'+l.hearts[i],'lifeAction:friend:'+i,'一日一回、その人の話を聞いて手伝います。');});add('街の集まりに参加 '+l.festivals+'回','lifeAction:festival','7日ごとに開催。手伝いの印を2個もらえます。',s.day%7===0);for(var k=0;k<3;k++){var e=eventRows[L.eventFor(k)];add('今日の街イベント：'+e[0],'lifeEvent'+k,e[1]);}add('思い出の扉・5つの秘密','secrets','条件を満たすと、隠れエンディングを発見します。どの結末を見ても暮らしは続きます。');add('年間手帳に戻る','board');return;}
 if(mode.indexOf('lifeEvent')===0){var slot=Number(mode.slice(9)),e=eventRows[L.eventFor(slot)];add(e[0],'none',e[1]);add(e[2],'lifeAction:event:'+slot+':0',e[1]);add(e[3],'lifeAction:event:'+slot+':1',e[1]);add('暮らし手帳に戻る','life');return;}
 if(mode==='secrets'){endings.forEach(function(e,i){add(l.secrets[i]?e.name:'？？？・思い出の扉'+(i+1),'secret'+i,l.secrets[i]?'発見済み。結末を読み返せます。':e.hint,!!l.secrets[i]);});add('暮らし手帳に戻る','life');return;}
 if(mode.indexOf('secret')===0){var id=Number(mode.slice(6));if(l.secrets[id])endings[id].scenes.forEach(function(t,i){add('隠れエンディング '+(i+1)+'/3','none',t);});add('暮らしに戻る','life','エンディングのあとも、日付と買い物は続きます。');return;}
 make.call(this);if(mode==='board'||mode.indexOf('place:')===0){this._list.splice(0,0,{name:'終わらない暮らし・住人と街の出来事',symbol:'action',enabled:true,ext:{action:'life',text:'庭、川の観察、交流、街の共同計画、毎日3件の出来事、5つの隠れエンディング。'}});}this._list.forEach(function(c){if(c.ext&&c.ext.action==='next'){c.name='次の日へ進む（暮らしは続く）';c.enabled=s.done;c.ext.text='365日以降も年と季節を繰り返して進みます。買い物の報告後に次の朝へ。';}});
};
var command=Scene_BebiYear.prototype.command;Scene_BebiYear.prototype.command=function(){var a=this._yearWindow.currentExt().action;if(a.indexOf('lifeAction:')===0){this.refresh('life',L.action(a.slice(11)));return;}command.call(this);};
var buy=Y.buy;Y.buy=function(id){var result=buy(id);L.trim();return result;};var finish=Y.finish;Y.finish=function(){var result=finish();L.trim();L.unlock();return result;};var beforeSave=Game_System.prototype.onBeforeSave;Game_System.prototype.onBeforeSave=function(){L.trim();beforeSave.call(this);};
var help=Y.Window.prototype.updateHelp;Y.Window.prototype.updateHelp=function(){help.call(this);var s=Y.state();if(s&&s.day>365){var c=L.calendar(s.day);this._helpWindow._text=this._helpWindow._text.replace(/^/,c.year+'年目 / ');this._helpWindow.refresh();}};
})();
