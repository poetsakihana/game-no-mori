/* Optional in-game help. No save access and no automatic display.
 * Integration: createExpandedGuide({canvas,parent,onClose,onPractice}).
 * show() resets to page 1; hide() closes without notifying; destroy() cleans up.
 * onClose(reason) receives 'skip', 'done', 'escape', or 'practice'. The caller
 * pauses/clears gameplay input before show and restores it on close.
 * Optional onPractice is called by a button only; return {ok:false} to keep
 * the guide open. The caller must implement safe, non-destructive practice.
 */
(function(root){
  'use strict';
  const PAGES = Object.freeze([
    {title:'冒険の手引き',lines:['遊びながら覚えられる、ゲームの案内です。','下の「目次」から好きな項目へ移動できます。いつでもスキップできます。']},
    {title:'移動',lines:['画面左のパッドを動かして歩きます。','キーボードなら矢印キーか WASD。青い輪が、いま操作しているキャラです。']},
    {title:'攻撃と回避',lines:['「攻撃」で近くの敵を攻撃。キーボードは J またはスペース。','「回避」は Shift。危険の赤い円が見えたら外へ移動しましょう。']},
    {title:'想いと必殺技',lines:['攻撃を当てると想いがたまります。100になったら「必殺」または K。','技ごとに再使用までの時間があります。仲間の技ゲージはそれぞれ別です。']},
    {title:'道とチェックポイント',lines:['敵を倒しながら右へ進みます。花を集めると体力や想いが回復します。','途中の敵を倒すとチェックポイントで回復。敗北時はそこから再挑戦できます。']},
    {title:'仲間と交代',lines:['「仲間・装備」で編成。最初は仲間1人、第3ステージクリア後は最大3人です。','「切替」または T で操作キャラを交代。操作しない仲間は自動で攻撃・回避・技を使います。']},
    {title:'共有HPと仲間',lines:['HPは全員で共有。敵は操作キャラを狙いますが、危険な円の中にいる仲間も被弾します。','青い輪が操作中の目印。星あつめではランカーをゲストとして操作できます。']},
    {title:'技の種類',lines:['100技は6つの仕組みを組み合わせたバリエーションです。','自身・仲間へのバリア、横・縦レーザー、インボリュートの渦球、輪破壊があります。']},
    {title:'技の開放と選択',lines:['勝利すると参加メンバーに経験値10。再挑戦でももらえ、レベルは最大20です。次のレベルには現在のレベル×20の経験値が必要です。','ガチャ限定の200人は初め6技、レベルが1上がるごとに5技ずつ開放。既存の仲間はメインの進行でも開放されます。','仲間・装備で技を選べます。100技は共通で、キャラごとの固有技100種類ではありません。']},
    {title:'罠とバリア',lines:['とげ・光線・輪の罠は予告のあと発動します。避けるか、タイミングを見て進みましょう。','キャラの耐性と技の対応は別です。バリアは一定時間、対象へのダメージを防ぎます。']},
    {title:'改造ランク',lines:['ガチャで同じ仲間を引くと改造ランクが上昇し、最大3になります。','ランクで能力や技が強化され、対応できる罠も増えます。重複した杖や上限後の仲間は素材になります。']},
    {title:'ガチャの引き方',lines:['通常の仲間・杖ガチャ、新しいガチャ限定仲間、開催中のカグラ限定ガチャは、通常無料券1枚で1回。購入・課金はありません。','ガチャ限定仲間200人はこの専用ガチャで入手し、4種類の共通イラストを使います。','玉を引いて離すか、「ガチャを引く」を押します。引く前なら中止でき、チケットは減りません。']},
    {title:'ガチャの確率と交換',lines:['N 70％、R 22％、SR 7％、SSR 1％。ガチャ限定仲間は各レア度50人で、1人あたりN 1.4％、R 0.44％、SR 0.14％、SSR 0.02％です。','ガチャ限定仲間を1回引くと交換ポイント1。5ポイントで好きな対象仲間1体と交換でき、重複も運に加算されます。','SSRの20％で確定演出が出ます。演出がなくてもSSRは出ます。各候補の確率はガチャ画面で確認できます。']},
    {title:'期間限定ガチャ',lines:['星守カグラの限定ガチャは試作日程：2026年11月3日〜12月3日、日本時間。','限定中は素材80個でもカグラと交換可能。終了後も獲得した仲間は使えます。']},
    {title:'ログイン報酬',lines:['日本時間で1日1回、受取ボタンを押します。1〜9回目は通常無料券1枚、10回目はその月の限定券1枚です。','10回受け取ると次は1回目へ。受け取らなかった日は進みません。']},
    {title:'月巡りの限定券',lines:['月巡りガチャは15種類が月ごとに順番に切り替わります。対応する月別限定券が必要です。','限定券は無期限。同じ種類が15か月後に再登場したときにも使えます。既存の仲間候補を使い、SSR内の比率が異なります。']},
    {title:'運と獲得数',lines:['「運」は記録済みの同じ仲間の累計獲得数から計算し、最大99。改造ランクとは別です。','古いデータで過去の重複数が不明な場合は、所有済み1体から記録します。']},
    {title:'杖と素材',lines:['素材で杖を強化し、最大レベル5まで育てられます。1レベル上がるごとに攻撃＋2。','次の強化には現在レベル×5個の素材が必要。装備する杖も同じ画面で選べます。']},
    {title:'日替わりキャライベント',lines:['50種類のイベントから毎日5種類が登場し、10日で一巡。登場中は7難度を選べ、日本時間の日付でおすすめ難度も変わります。','1面から5面まで順に開放し、5面のボスを倒すとそのキャラを1〜3体獲得。50イベントは既存6人のボスと画像を共用し、設定や罠・配置が異なります。','敵レベルは簡単から滅難へ1・4・7・10・13・16・20と上がります。やさしい補助も選べます。']},
    {title:'やさしい補助と運極',lines:['キャライベントと塔では、やさしい補助で攻撃1.5倍・被ダメージ半分にできます。','イベント獲得で運99を超えた分はレア度に応じて素材になります。']},
    {title:'シラトリの塔',lines:['日本時間の毎月15日〜20日に開始できる40階の塔。各階は順番に進む5ステージです。','期間終了後は次の面を開始できません。開催中から途切れず進行中の1面だけ完了できます。','終了後の再読み込み・再起動では続行できません。クリア済みの進行は保持され、翌月は1階から。仲間や装備は残ります。']},
    {title:'塔の節目の報酬',lines:['5階：白星の杖、15階：通常無料券10枚、25階：月塔の杖。','35階：通常無料券10枚、40階：シラトリ5体。報酬は各階の5ステージ目クリア時。重複した杖は素材になります。']},
    {title:'季節イベント',lines:['季節イベントは期間限定です。年間の日程は仮で、端末の時計を日本時間に換算して判定します。','日程の目安：春3〜5月、夏6〜8月、秋9〜11月、冬12〜2月。星の贈りものは12月20日〜1月5日。']},
    {title:'日替わりと星あつめ',lines:['日替わりは日本時間で切り替わる3種の創作詩です。同じ詩は重複しません。','星あつめでは、仲間と交代しながら道の星を集められます。']},
    {title:'物語と詩の図鑑',lines:['メインは1-1から20-5まで。各ステージの前に物語があり、クリアで詩が増えます。','ひろばの「詩の図鑑」で獲得した詩を番号順に読めます。詩はゲームの創作です。']},
    {title:'訓練とチャレンジ',lines:['仲間・装備の「訓練」から短い訓練戦や、2体と戦うチャレンジに挑戦できます。','勝利報酬は訓練がチケット1枚・素材2個、チャレンジが2枚・素材4個です。']},
    {title:'一時停止と中断',lines:['画面の一時停止ボタンで休めます。通常の再読み込みでは保存された地点を復元します。','「中断して最初へ」は今回の進行を破棄し、体力と想いを全回復して最初から。発動中の技や罠の状態は初期化されます。']},
    {title:'保存と日時',lines:['進行はこの端末のブラウザに保存します。保存データを消すと進行も失われます。','保存に失敗した場合、前回保存した状態に戻ることがあります。複数タブでの同時プレイは避けてください。','日付は端末の時計を日本時間に換算します。時計は変更でき、サーバーによる時刻保証はありません。']},
    {title:'音と画面',lines:['音の設定は画面上部から変更できます。音は画面操作のあとに再生される場合があります。','全画面に対応しない環境では、通常の画面のまま遊べます。']},
    {title:'いつでも見返せます',lines:['手引きはステージ選択から開き直せます。','準備ができたら「おわる」。仲間加入後は訓練でも練習できます。']}
  ].map(p=>Object.freeze({title:p.title,lines:Object.freeze(p.lines)})));
  function createExpandedGuide(options){
    options=options||{};
    const doc=(options.canvas&&options.canvas.ownerDocument)||root.document;
    const parent=options.parent||(options.canvas&&options.canvas.parentNode)||(doc&&doc.body);
    if(!doc||!parent||typeof doc.createElement!=='function') throw new Error('Guide needs a document and parent');
    let index=0,opened=false,destroyed=false,previousFocus=null;
    const make=(tag,cls,text)=>{const e=doc.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
    const overlay=make('div','sakura-guide-overlay');overlay.hidden=true;
    const style=make('style');style.textContent=`
.sakura-guide-overlay[hidden]{display:none!important}
.sakura-guide-overlay{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;box-sizing:border-box;padding:max(10px,env(safe-area-inset-top)) max(10px,env(safe-area-inset-right)) max(10px,env(safe-area-inset-bottom)) max(10px,env(safe-area-inset-left));background:rgba(40,28,48,.68);font-family:system-ui,-apple-system,'Hiragino Kaku Gothic ProN','Yu Gothic',sans-serif;color:#4e344a;}
.sakura-guide-card,.sakura-guide-card *{box-sizing:border-box}.sakura-guide-card{width:min(100%,540px);max-height:100%;overflow:auto;overscroll-behavior:contain;background:#fff9fb;border:2px solid #d7a1b9;border-radius:20px;padding:16px;box-shadow:0 8px 30px rgba(37,21,39,.28);font-size:16px;line-height:1.55}
.sakura-guide-card h2{font-size:1.25rem;line-height:1.35;margin:4px 0 8px;color:#773750}.sakura-guide-card p{margin:9px 0}.sakura-guide-card label{display:block;font-weight:700;margin-top:10px}.sakura-guide-card select{width:100%;min-height:44px;border:1px solid #a76382;border-radius:10px;background:white;color:#402b3c;font:inherit;padding:7px;}
.sakura-guide-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}.sakura-guide-actions button{flex:1 1 100px;min-width:0;min-height:44px;border-radius:12px;border:1px solid #9b5978;background:#fff;color:#69334d;font:inherit;font-weight:700;padding:8px}.sakura-guide-actions .primary{background:#8f4265;color:#fff}.sakura-guide-actions button:disabled{opacity:.5}.sakura-guide-actions button:focus-visible,.sakura-guide-card select:focus-visible{outline:3px solid #315eaa;outline-offset:2px}
.sakura-guide-status{font-size:.9rem;color:#634f60}.sakura-guide-live{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}@media(prefers-reduced-motion:reduce){.sakura-guide-overlay *{scroll-behavior:auto!important;animation:none!important;transition:none!important}}
`;
    const card=make('section','sakura-guide-card');card.setAttribute('role','dialog');card.setAttribute('aria-modal','true');card.setAttribute('aria-labelledby','sakura-guide-title');card.tabIndex=-1;
    const counter=make('p','sakura-guide-status');const title=make('h2','','');title.id='sakura-guide-title';const content=make('div','sakura-guide-content');const live=make('div','sakura-guide-live');live.setAttribute('role','status');live.setAttribute('aria-live','polite');live.setAttribute('aria-atomic','true');
    const label=make('label','','目次（好きな項目へ）');const select=make('select');select.setAttribute('aria-label','手引きの目次');
    const groups=[[0,'基本のあそび方'],[5,'仲間と技'],[10,'育成とガチャ'],[18,'イベント'],[24,'物語・設定']];
    let topicGroup=null;PAGES.forEach((p,i)=>{const group=groups.find(g=>g[0]===i);if(group){topicGroup=make('optgroup');topicGroup.label=group[1];select.appendChild(topicGroup);}const o=make('option','',`${i+1}. ${p.title}`);o.value=String(i);topicGroup.appendChild(o);});label.appendChild(select);
    const actions=make('div','sakura-guide-actions');
    const button=(text,cls)=>{const b=make('button',cls,text);b.type='button';actions.appendChild(b);return b;};
    const back=button('もどる'),next=button('つぎへ','primary'),skip=button('スキップ');
    const practice=typeof options.onPractice==='function'?button('訓練へ（勝利報酬あり）'):null;
    card.appendChild(counter);card.appendChild(title);card.appendChild(content);card.appendChild(label);card.appendChild(actions);card.appendChild(live);overlay.appendChild(style);overlay.appendChild(card);parent.appendChild(overlay);
    function render(){
      const page=PAGES[index];counter.textContent=`${index+1} / ${PAGES.length}`;title.textContent=page.title;
      while(content.firstChild)content.removeChild(content.firstChild);
      page.lines.forEach(line=>content.appendChild(make('p','',line)));
      select.value=String(index);back.disabled=index===0;next.textContent=index===PAGES.length-1?'おわる':'つぎへ';
      live.textContent=`${index+1}ページ、${page.title}。${page.lines.join(' ')}`;card.scrollTop=0;
    }
    function hide(){
      if(!opened)return;opened=false;overlay.hidden=true;
      root.removeEventListener('keydown',keys,true);root.removeEventListener('keyup',keyUp,true);
      if(previousFocus&&typeof previousFocus.focus==='function'&&previousFocus.isConnected!==false){try{previousFocus.focus();}catch(_){}}
      previousFocus=null;
    }
    function close(reason){if(!opened)return;hide();if(typeof options.onClose==='function')options.onClose(reason);}
    function keys(e){
      if(!opened)return;
      const k=e.key;
      if(k==='Escape'){e.preventDefault();e.stopImmediatePropagation();close('escape');return;}
      if(k==='Tab'){
        const available=[select,back,next,skip,practice].filter(x=>x&&!x.disabled&&!x.hidden);
        const pos=available.indexOf(doc.activeElement);let target=null;
        if(pos<0)target=e.shiftKey?available[available.length-1]:available[0];
        else if(e.shiftKey&&pos===0)target=available[available.length-1];
        else if(!e.shiftKey&&pos===available.length-1)target=available[0];
        if(target){e.preventDefault();target.focus();}e.stopImmediatePropagation();return;
      }
      // Preserve arrow-key operation of the topic selector.
      if(doc.activeElement!==select&&(k==='ArrowRight'||k==='ArrowLeft')){
        e.preventDefault();if(k==='ArrowRight'){if(index<PAGES.length-1){index++;render();}}else if(index>0){index--;render();}
      }
      // Let the target button or select receive the key so native keyboard
      // activation and selection continue to work. The card stops bubbling
      // before gameplay's window-level handlers see the event.
      if(!card.contains(e.target))e.stopImmediatePropagation();
    }
    function keyUp(e){if(opened&&!card.contains(e.target))e.stopImmediatePropagation();}
    card.addEventListener('keydown',e=>e.stopPropagation());
    card.addEventListener('keyup',e=>e.stopPropagation());
    back.addEventListener('click',()=>{if(index>0){index--;render();}});
    next.addEventListener('click',()=>{if(index===PAGES.length-1)close('done');else{index++;render();}});
    skip.addEventListener('click',()=>close('skip'));
    select.addEventListener('change',()=>{const n=Number(select.value);if(Number.isInteger(n)&&n>=0&&n<PAGES.length){index=n;render();}});
    if(practice)practice.addEventListener('click',()=>{try{const result=options.onPractice();if(result&&result.ok===false){live.textContent='練習を開始できませんでした。';return;}close('practice');}catch(_){live.textContent='練習を開始できませんでした。';}});
    function show(){if(destroyed||opened)return;previousFocus=doc.activeElement;index=0;opened=true;overlay.hidden=false;render();root.addEventListener('keydown',keys,true);root.addEventListener('keyup',keyUp,true);try{card.focus();}catch(_){}}
    function destroy(){if(destroyed)return;hide();destroyed=true;if(overlay.parentNode)overlay.parentNode.removeChild(overlay);}
    return Object.freeze({show,hide,destroy,getPageCount:()=>PAGES.length});
  }
  root.createExpandedGuide=createExpandedGuide;
  if(typeof module==='object'&&module.exports)module.exports={createExpandedGuide,PAGES};
})(typeof window!=='undefined'?window:globalThis);
