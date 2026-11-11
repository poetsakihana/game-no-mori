/* Accessible DOM progression overlay. All mutations are delegated to the host;
   onAction must synchronously commit and persist before returning success. */
(function (root) {
  'use strict';
  const ASSETS={sakura:'assets/sakihana-hero.webp',ranka:'assets/companion-lantern.png',fukki:'assets/companion-scholar.png',wanchoka:'assets/companion-musician.png',kagura:'assets/kagura-sprite.webp',shiratori:'assets/shiratori-sprite.webp'};
  const ERRORS={invalid_state:'データを読み取れませんでした。',invalid_party:'その編成には変更できません。',invalid_party_limit:'編成の上限を確認してください。',already_owned:'すでに仲間です。',exchange_unavailable:'交換できません。',weapon_not_owned:'未入手の杖です。',max_level:'最大レベルです。',insufficient_materials:'素材が足りません。',insufficient_tickets:'対応するチケットが足りません。通常券は訓練、月別限定券はログインボーナスで獲得できます。',invalid_kind:'ガチャの種類が不正です。',currency_limit:'所持数が上限に達しています。',storage_error:'保存できませんでした。空き容量や設定を確認してください。',pending_reward:'保留中の報酬を確定してから挑戦してください。',banner_unavailable:'期間外のため限定ガチャ・交換は利用できません。端末の日時をご確認ください。',skill_unavailable:'この技はまだ選べません。',copy_limit:'累計獲得数が保存上限です。',points_limit:'交換ポイントが上限です。交換して減らすと再び引けます。',insufficient_points:'交換ポイントが足りません。',banner_changed:'月が変わり対象ガチャが切り替わりました。券は使われていません。',day_changed:'日付が変わりました。報酬を確認してから受け取ってください。',clock_rollback:'端末の日付が前回の受取日より前です。日時を確認してください。',already_claimed:'今日は受取済みです。'};
  function el(tag, className, text) { const n=document.createElement(tag); if(className)n.className=className; if(text!==undefined)n.textContent=String(text); return n; }
  function btn(text, fn, disabled, focusKey) { const b=el('button','sp-button',text); b.type='button'; b.disabled=!!disabled; if(focusKey)b.setAttribute('data-sp-focus-key',focusKey); if(fn)b.addEventListener('click',fn); return b; }
  function create(options) {
    const P=root.SakuraProgression;
    if(!P || !options || !options.parent || typeof options.getState!=='function' || typeof options.getContext!=='function' || typeof options.onAction!=='function') throw new Error('SakuraProgressionUI: missing dependencies');
    const style=el('style'); style.textContent=`
.sp-overlay{position:fixed;inset:0;z-index:9999;background:rgba(27,18,34,.78);display:flex;align-items:center;justify-content:center;padding:12px;color:#39293d;font-family:system-ui,-apple-system,sans-serif;box-sizing:border-box}
.sp-overlay[hidden]{display:none!important}.sp-panel,.sp-panel *{box-sizing:border-box}.sp-panel{width:min(920px,100%);max-height:min(92dvh,850px);display:flex;flex-direction:column;background:#fff9f7;border:3px solid #e5a7bd;border-radius:20px;box-shadow:0 18px 60px #1a0b2299;overflow:hidden}.sp-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px 18px;background:#fae5eb}.sp-head h2{font-size:1.25rem;margin:0}.sp-tabs{display:flex;gap:6px;padding:8px 12px;overflow-x:auto;background:#fff2f3}.sp-button{font:inherit;font-weight:700;border:1px solid #b7738c;background:#fff;color:#54334b;border-radius:10px;padding:9px 12px;cursor:pointer;min-height:42px}.sp-button:hover:not(:disabled){background:#ffe7ef}.sp-button:focus-visible{outline:3px solid #5a4aaf;outline-offset:2px}.sp-button:disabled{opacity:.55;cursor:not-allowed}.sp-tab[aria-pressed=true]{background:#9c456a;color:white}.sp-body{padding:16px 18px;overflow:auto;overscroll-behavior:contain;line-height:1.5}.sp-body h3{margin:2px 0 8px}.sp-body h4{margin:0 0 4px}.sp-body p{margin:6px 0}.sp-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px;margin:12px 0}.sp-card{border:1px solid #e2bcc8;background:#fff;border-radius:14px;padding:11px}.sp-card.sp-selected{border:2px solid #bc4b78;background:#fff0f5}.sp-card img{width:76px;height:76px;object-fit:contain;float:right;margin-left:5px}.sp-card.sp-locked img{filter:grayscale(1);opacity:.45}.sp-card p{font-size:.9rem}.sp-card .sp-button{margin-top:5px}.sp-body input[type=search]{min-height:44px;max-width:100%;font:inherit;border:1px solid #b7738c;border-radius:8px;padding:8px}.sp-card select{display:block;width:100%;max-width:100%;font:inherit;border:1px solid #b7738c;border-radius:8px;padding:7px;background:#fff;color:#39293d}.sp-card summary{cursor:pointer;font-weight:700}.sp-card select:focus-visible,.sp-card summary:focus-visible{outline:3px solid #5a4aaf;outline-offset:2px}.sp-note{font-size:.9rem;color:#674c60}.sp-warning{color:#a52c47;font-weight:700}.sp-balance{font-weight:700;padding:0 18px;background:#fff2f3}.sp-live{min-height:1.4em;margin:0;padding:6px 18px;color:#743759;font-weight:700;background:#fff9f7}.sp-pool{list-style:none;margin:8px 0;padding:0}.sp-pool li{padding:4px 0;border-bottom:1px solid #f1d9df}.sp-draws{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}.sp-animation{position:relative;min-height:120px;border-radius:14px;background:#fce4ed;display:grid;place-items:center;overflow:hidden;text-align:center}.sp-spark{position:absolute;font-size:1.5rem;pointer-events:none;color:#d37ca5}.sp-anim-label{z-index:1;font-weight:800}.sp-small{font-size:.84rem}.sp-close{flex:none}
.sp-dragon-stage{position:relative;min-height:320px;overflow:hidden;border:2px solid #efbdcf;border-radius:18px;background:radial-gradient(circle at 50% 35%,#fffbe6,#fce4f1 60%,#eadcf9);text-align:center}.sp-dragon{position:absolute;width:180px;height:180px;left:50%;top:10px;transform:translateX(-50%);transform-origin:50% 50%}.sp-dragon svg{width:100%;height:100%;overflow:visible}.sp-mouth{transform-origin:100px 122px;transform:scaleY(.18)}.sp-orb{position:absolute;left:50%;bottom:20px;width:68px;height:68px;border:3px solid #fff;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff,#fcd45c 25%,#e79a51 65%,#b9567d);box-shadow:0 5px 16px #a5507f88;touch-action:none;cursor:grab;transform:translateX(-50%);font:inherit;font-weight:800;color:#503458;z-index:2}.sp-orb:focus-visible{outline:4px solid #523c9e;outline-offset:3px}.sp-orb:disabled{opacity:1}.sp-egg{position:absolute;left:50%;top:157px;width:42px;height:54px;margin-left:-21px;border-radius:50% 50% 45% 45%;border:3px solid #e2a8be;background:#fff8e9;opacity:0}.sp-dragon-stage.sp-playing .sp-orb{animation:sp-fly .7s ease-in forwards}.sp-dragon-stage.sp-playing .sp-dragon{animation:sp-spin .8s .7s ease-in-out forwards}.sp-dragon-stage.sp-playing .sp-mouth{animation:sp-mouth .3s 1.5s forwards}.sp-dragon-stage.sp-playing .sp-egg{animation:sp-egg .75s 1.7s ease-out forwards}@keyframes sp-fly{to{transform:translate(calc(-50% + 22px),-184px) scale(.3);opacity:0}}@keyframes sp-spin{to{transform:translateX(-50%) rotate(360deg)}}@keyframes sp-mouth{to{transform:scaleY(1)}}@keyframes sp-egg{0%{opacity:1;transform:translateY(-30px) scale(.3)}100%{opacity:1;transform:translateY(55px) scale(1)}}@media (prefers-reduced-motion:reduce){.sp-dragon-stage *{animation-duration:.001s!important;animation-delay:0s!important}}
@media(max-width:540px){.sp-overlay{padding:0}.sp-panel{width:100%;height:100dvh;max-height:none;border-radius:0;border-width:0}.sp-head{padding:10px 12px}.sp-body{padding:12px}.sp-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.sp-card{padding:9px}.sp-card img{width:54px;height:54px}.sp-button{padding:8px}.sp-tabs{gap:4px}}
`;
    const overlay=el('div','sp-overlay'); overlay.hidden=true;
    const panel=el('section','sp-panel'); panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','育成メニュー');panel.tabIndex=-1;
    const header=el('div','sp-head'); header.append(el('h2','', '咲華の育成帳'));
    const closeButton=btn('戻る',close);closeButton.classList.add('sp-close'); header.append(closeButton);
    const balance=el('div','sp-balance');balance.setAttribute('aria-label','所持数。進行はこの端末のブラウザに保存されます。複数タブで同時に遊ばないでください。'); const tabs=el('div','sp-tabs'); tabs.setAttribute('role','group');tabs.setAttribute('aria-label','育成メニュー');
    const live=el('div','sp-live'); live.setAttribute('aria-live','polite');live.setAttribute('aria-atomic','true');
    const body=el('div','sp-body');body.setAttribute('role','region');body.setAttribute('aria-label','育成メニューの内容');body.tabIndex=0;
    panel.append(header,balance,tabs,live,body); overlay.append(panel);options.parent.append(style,overlay);
    let tab='仲間', notice='', busy=false,discardConfirm=false, rosterPage=0,rosterQuery='',exclusiveRarity='N',exclusiveConfirm=null, animationTimer=null, animationGeneration=0, anims=[], previousFocus=null, active=true;
    function context(){try{const c=options.getContext()||{};return {...c,storageError:!!c.storageError||c.storageIssue==='corrupt'||c.storageIssue==='conflict'||c.storageIssue==='unavailable'};}catch(_){return {};}}
    function state(){try{return options.getState();}catch(_){return null;}}
    function stopAnimation(){animationGeneration++;if(animationTimer!==null){clearTimeout(animationTimer);animationTimer=null;}anims.forEach(a=>{try{a.cancel();}catch(_){}});anims=[];busy=false;}
    function close(){stopAnimation();exclusiveConfirm=null;overlay.hidden=true;if(typeof options.onClose==='function')options.onClose();if(previousFocus&&typeof previousFocus.focus==='function')previousFocus.focus();}
    function apply(type,payload){try{const r=options.onAction(type,payload);if(!r||!r.ok){notice=ERRORS[r&&r.reason] || '変更を保存できませんでした。';render();return null;}notice='変更を保存しました。';return r;}catch(_){notice='変更を保存できませんでした。';render();return null;}}
    function addHeading(title, desc){body.append(el('h3','',title));if(desc)body.append(el('p','sp-note',desc));}
    function percent(n){return (Math.round(n*1000000)/10000)+'%';}
    function bonus(b){const parts=[];if(b.attack)parts.push('攻撃 +'+b.attack);if(b.maxHp)parts.push('HP +'+b.maxHp);if(b.defense)parts.push('防御 +'+b.defense);return parts.join(' / ')||'主人公';}
    function partyView(s,c){
      addHeading('仲間編成','第3ステージクリア前は仲間1人、クリア後は最大3人。通常戦では戦闘中に編成メンバーを切り替えて操作できます（Tキーまたは画面ボタン）。操作していない仲間は自動で攻撃・回避・技を使い、能力も加算されます。HPは全員で共有し、円内の仲間も被弾します。敵は操作キャラを狙い、仲間の技は各自のゲージです。仲間の技ゲージ、一時バリア、罠の破壊・停止や発動中の効果は、再読込・敗北後の再出発・退出時に初期化されます。編成や確定済み報酬は保存されます。星あつめでは未編成のランカーも一時ゲストとして操作できます。');
      const max=c.maxCompanions===3?3:1;body.append(el('p','',`現在の上限：仲間 ${max} 人　編成中：${Math.max(0,s.party.length-1)} 人`));
      body.append(el('p','sp-note','200人のガチャ限定仲間は4種類の共通画像と既存の100技を使用します。イベント報酬では入手できません。'));
      const searchLabel=el('label','sp-note','名前またはIDで探す '),search=el('input');search.type='search';search.value=rosterQuery;search.setAttribute('aria-label','仲間の名前またはID');search.setAttribute('data-sp-focus-key','rosterSearch');search.addEventListener('input',()=>{rosterQuery=search.value;rosterPage=0;exclusiveConfirm=null;render();});searchLabel.append(search);body.append(searchLabel);
      const query=rosterQuery.trim().toLowerCase(),items=Object.values(P.ROSTER).filter(ch=>!query||ch.name.toLowerCase().includes(query)||ch.id.toLowerCase().includes(query)).sort((a,b)=>Number(s.characters.includes(b.id))-Number(s.characters.includes(a.id))||a.id.localeCompare(b.id));
      const pages=Math.max(1,Math.ceil(items.length/12));rosterPage=Math.max(0,Math.min(rosterPage,pages-1));const paging=el('div','sp-draws');paging.setAttribute('aria-live','polite');paging.append(btn('前の仲間',()=>{rosterPage--;exclusiveConfirm=null;render();},rosterPage===0||busy,'rosterPrev'),el('span','sp-note',`${items.length}人・${rosterPage+1} / ${pages}ページ`),btn('次の仲間',()=>{rosterPage++;exclusiveConfirm=null;render();},rosterPage>=pages-1||busy,'rosterNext'));body.append(paging);
      const grid=el('div','sp-grid');
      items.slice(rosterPage*12,rosterPage*12+12).forEach(ch=>{
        const owned=s.characters.includes(ch.id),selected=s.party.includes(ch.id), card=el('article','sp-card'+(selected?' sp-selected':'')+(!owned?' sp-locked':''));
        const img=el('img');img.src=ASSETS[ch.id]||(ch.gachaOnly?`assets/recruit-archetype-${Math.floor((Number(ch.id.slice(-3))-1)/50)+1}.webp`:'');img.alt='';img.addEventListener('error',()=>{if(ch.id==='kagura'&&!img.dataset.fallback){img.dataset.fallback='1';img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><circle cx="40" cy="35" r="31" fill="#e5d7fb" stroke="#7962a6" stroke-width="3"/><path d="M40 8 45 25 62 30 46 37 40 55 34 37 18 30 35 25Z" fill="#f5c652"/><text x="40" y="74" text-anchor="middle" font-size="11" fill="#53416e">カグラ</text></svg>');}else img.hidden=true;});card.append(img,el('h4','',ch.name),el('p','',`レア度 ${ch.rarity} ・ ${owned?'所持':'未入手'}`),el('p','',bonus(ch.bonus)));if(ch.gachaOnly)card.append(el('p','sp-note','ガチャ限定・共通画像と共通技を使用'));
        if(owned){const level=P.characterLevel(s,ch.id),ability=P.abilities(s,ch.id,c.wave);if(ability.ok&&level.ok){
          card.append(el('p','',`レベル ${level.level} / ${P.MAX_CHARACTER_LEVEL} ・ ${level.nextXp===null?'最大':`経験値 ${level.xp} / ${level.nextXp}`}`),el('p','sp-note','戦闘に勝利すると参加メンバー全員に経験値10。再挑戦の勝利でも獲得でき、失敗・中断・保存失敗では受け取れません。次のレベルまで現在レベル×20経験値。上限20。レベル1ごとに編成攻撃+1、HP+2。')); 
          card.append(el('p','',`改造ランク ${ability.rank} / ${P.MAX_MOD_RANK} ・ 重複で上昇（最大後は素材に変換）`),el('p','sp-note',`累計獲得（今回更新以降は重複も記録）：${s.characterCopies&&s.characterCopies[ch.id]||1}。未消費の所持数ではありません。更新前の未記録の重複は含みません。`));
          const lu=P.luck(s,ch.id);if(lu.ok)card.append(el('p','',`運 ${lu.count} / ${lu.max}${lu.isMax?' ・ 運極！':''}`),el('p','sp-note','運は記録済み累計獲得から最大99で計算し、改造ランクとは別です。イベントで99超過分はレア度に応じて素材へ変換します。'));
          const names={spike:'トゲ',beam:'レーザー罠',ring:'リング罠'};
          card.append(el('p','sp-note',`アンチトラップ：${ability.antiTraps.length?ability.antiTraps.map(x=>names[x]||x).join(' / '):'なし'} ・ 技の威力・バリア +${ability.rank*4}%`),el('p','sp-note',`改造効果：ランク1 射程・半径がある技は+10%${ability.rank>=1?' ✓':''}／ランク2 技の待ち時間−10%${ability.rank>=2?' ✓':''}／ランク3 持続時間+15%${ability.rank>=3?' ✓':''}。`));
          const label=el('label','sp-note','使用する技 '),select=el('select');select.setAttribute('aria-label',`${ch.name}の使用する技`);select.setAttribute('data-sp-focus-key',`skill:${ch.id}`);
          if(ch.id==='sakura'){const original=el('option','','恋空スパーク（もとの必殺技）');original.value='legacy-spark';original.selected=ability.skill==='legacy-spark';select.append(original);}
          P.skillIds(ch.id,ability.rank,c.wave,level.level).forEach(id=>{const item=root.SakuraSkills&&root.SakuraSkills.get(id);const o=el('option','',`${id} ${item&&item.name?item.name:''}`);o.value=id;o.selected=id===ability.skill;select.append(o);});
          select.disabled=busy||!!c.storageError;select.addEventListener('change',()=>{const r=apply('skill',{characterId:ch.id,skillId:select.value});if(r){notice=`${ch.name}の技を変更しました。`;render();}});label.append(select);card.append(label,el('p','sp-note',`現在 ${P.skillIds(ch.id,ability.rank,c.wave,level.level).length} / 100 技を選択可能。${ch.gachaOnly?'本人のレベル上昇ごとに5技を解放（最大100）。':'メインクリアごとに1技、またはレベル上昇ごとに5技まで解放（多い方、最大100）。'}`));
          if(ability.skill==='legacy-spark')card.append(el('p','sp-note','選択中：恋空スパーク（もとの必殺技）。もともと全体が対象のため、ランク1の射程増加は適用されません。ランク3の持続延長は見た目のみで、攻撃は瞬間的です。'));
          if(ch.id==='kagura')card.append(el('p','sp-note','カグラ固有：縦・横レーザー発動時、自身と200以内の仲間に2秒間のバリア6を付与。強度は改造ランクごとに+4%、ランク3では持続2.3秒。重ねがけは最大値のみ。'));
          const selected=root.SakuraSkills&&root.SakuraSkills.get(ability.skill);if(selected){const values=[];if(selected.power)values.push(`威力×${selected.power}`);if(selected.shield)values.push(`バリア ${selected.shield}`);if(selected.range)values.push(`射程 ${selected.range}`);if(selected.radius)values.push(`半径 ${selected.radius}`);if(selected.width)values.push(`幅 ${selected.width}`);values.push(`持続 ${selected.duration}秒`,`待ち時間 ${selected.cooldown}秒`);card.append(el('p','sp-note',`選択中：${selected.name}（${selected.typeLabel}）／対応：${selected.trapLabel}`),el('p','sp-note',`基礎値：${values.join(' / ')}。改造補正が加わります。仲間の攻撃技は威力半分。`));}
        }}
        if(ch.id==='sakura')card.append(el('p','sp-note','主人公（固定）'));
        else card.append(btn(selected?'編成から外す':'編成する',()=>{
          const next=selected?s.party.filter(id=>id!==ch.id):s.party.concat(ch.id);
          if(!selected&&next.length>max+1){notice='仲間の編成上限です。先に別の仲間を外してください。';render();return;}
          if(apply('party',next))render();
        },!owned||busy||!!c.storageError,`party:${ch.id}`));
        if(!owned&&P.CHARACTER_EXCHANGE_COSTS[ch.id]){const cost=P.CHARACTER_EXCHANGE_COSTS[ch.id];card.append(el('p','sp-note',`素材 ${cost} 個で確定交換できます。${ch.id==='kagura'?'限定期間中のみ。':''}`),btn(`素材 ${cost} で交換`,()=>{const r=apply('exchange',ch.id);if(r){notice=`${ch.name}を仲間にしました。`;render();}},s.materials<cost||busy||!!c.storageError||(ch.id==='kagura'&&P.bannerStatus()!=='active'),`exchange:${ch.id}`));}
        if(ch.gachaOnly){const pts=s.exclusivePoints||0,cost=P.EXCLUSIVE_EXCHANGE_COST;if(exclusiveConfirm!==ch.id)card.append(btn(`交換 ${cost}pt`,()=>{exclusiveConfirm=ch.id;render();},busy||!!c.storageError||pts<cost,`exask:${ch.id}`));else{card.append(el('p','sp-warning',`${ch.name} 1体を${cost}ptで交換します。所持済みなら改造・累計・運に反映し、改造上限後は素材に変換。`),btn('交換を確定',()=>{if(exclusiveConfirm!==ch.id)return;exclusiveConfirm=null;const r=apply('exclusiveExchange',ch.id);if(r){notice=`${ch.name}を交換しました。`+(r.rankUp?`改造ランク${r.modRank}。`:r.duplicate?`素材${r.duplicateMaterials}個に変換。`:'新しい仲間です。');render();}},busy||!!c.storageError||pts<cost,`exconfirm:${ch.id}`),btn('交換をやめる',()=>{exclusiveConfirm=null;render();},busy,`excancel:${ch.id}`));}}
        grid.append(card);
      });body.append(grid);
      if(root.SakuraSkills){const details=el('details','sp-card'),summary=el('summary','','100の技図鑑を見る');details.append(summary,el('p','sp-note','6種類の技の仕組みからなる100のバリエーション。最初に6技、既存6人はメインクリア数または本人Lv、新しいガチャ限定200人は本人Lvで解放。課金や重複は必要ありません。'));const list=el('ol','sp-pool');root.SakuraSkills.all().forEach(skill=>{const needed=skill.unlockClears,lv=needed?Math.ceil(needed/5)+1:1;list.append(el('li','',`${skill.id} ${skill.name}（${skill.typeLabel}・${skill.trapLabel}）${needed?`既存6人はメイン ${needed} 面または本人Lv.${lv}、ガチャ限定仲間は本人Lv.${lv}で選択可`:'初期から選択可'}`));});details.append(list);body.append(details);}
      const st=P.stats(s);if(st.ok)body.append(el('p','sp-note',`編成合計：攻撃 ${st.attack} / HP ${st.maxHp} / 防御 ${st.defense}（装備を含む）`));
    }
    function weaponView(s,c){
      addHeading('杖の装備と強化','強化はレベル5まで。レベルが1上がるごとに攻撃 +2。白星の杖と月塔の杖は月間の塔の限定報酬です。再入手時はそれぞれ素材12個、30個に変換します。');
      const grid=el('div','sp-grid');Object.values(P.WEAPONS).forEach(w=>{
        const owned=s.weapons.includes(w.id),equipped=s.equipped===w.id,level=owned?s.levels[w.id]:1;
        const card=el('article','sp-card'+(equipped?' sp-selected':'')+(!owned?' sp-locked':''));
        card.append(el('h4','',w.name),el('p','',`${w.rarity} ・ ${owned?'所持':'未入手'}${equipped?' ・ 装備中':''}`),el('p','',`攻撃 +${w.attack+(level-1)*2} / Lv.${level}${owned?'':'（初期値）'}`));
        if(owned){card.append(btn(equipped?'装備中':'装備する',()=>{if(apply('equip',w.id))render();},equipped||busy||!!c.storageError,`equip:${w.id}`));
          const max=level>=P.MAX_LEVEL,cost=level*5; card.append(btn(max?'強化済み':`強化：素材 ${cost}`,()=>{const r=apply('upgrade',w.id);if(r){notice=`${w.name}をLv.${r.level}に強化しました。`;render();}},max||s.materials<cost||busy||!!c.storageError,`upgrade:${w.id}`));}
        grid.append(card);
      });body.append(grid);
      const manage=el('section','sp-card');manage.append(el('h4','','素材の整理'),el('p','sp-note','所持上限で報酬を受け取れない時などに、素材を50個手放せます。手放した素材は戻せません。'));
      if(!discardConfirm)manage.append(btn('素材50個を手放す',()=>{discardConfirm=true;render();},busy||!!c.storageError||s.materials<50,'discard:ask'));
      else{manage.append(el('p','sp-warning','素材50個を手放します。元には戻せません。よろしいですか？'),btn('はい、50個手放す',()=>{if(!discardConfirm)return;discardConfirm=false;const r=apply('discardMaterials',50);if(r){notice='素材50個を手放しました。';render();}},busy||!!c.storageError||s.materials<50,'discard:confirm'),btn('やめる',()=>{discardConfirm=false;render();},busy,'discard:cancel'));}
      body.append(manage);
    }
    function reveal(result,cue){
      stopAnimation();const item=result.item;notice=(result.kind==='exclusive'?'専用交換ポイント +1。 ':'')+(cue?'確定！ ':'')+`${result.rarity} ${item.name}！ `+(result.rankUp?`重複で改造ランク ${result.modRank} に上昇！`:(result.duplicate?`重複のため素材 ${result.duplicateMaterials} 個に変換しました。`:'新しく仲間または装備を獲得しました。'));render();
    }
    function revealWithParticles(result,cue){
      reveal(result,cue);
      const count={N:3,R:5,SR:8,SSR:12}[result.rarity]||3;
      const colors={N:'#9b8298',R:'#74a987',SR:'#a878c5',SSR:'#d69b41'};
      const symbols=result.rarity==='SSR'?['🌸','✿','✦','✨']:['✿','✦','✧'];
      const box=el('div','sp-animation');box.setAttribute('aria-hidden','true');
      box.append(el('div','sp-anim-label',`${result.rarity} ${result.item.name}`));
      for(let i=0;i<count;i++){
        const p=el('span','sp-spark',symbols[i%symbols.length]);p.style.left=(5+(i*29)%88)+'%';p.style.top=(15+(i*37)%70)+'%';p.style.color=colors[result.rarity];box.append(p);
        if(typeof p.animate==='function')try{anims.push(p.animate([{transform:'translateY(10px) scale(.7)',opacity:.35},{transform:'translateY(-12px) scale(1.15)',opacity:1}],{duration:1100,delay:i*35,easing:'ease-out',fill:'forwards'}));}catch(_){}
      }
      body.prepend(box);const generation=animationGeneration;animationTimer=setTimeout(()=>{if(generation!==animationGeneration||!active||overlay.hidden)return;animationTimer=null;box.remove();anims=[];},1800);
    }
    function draw(kind){
      if(busy)return;
      // Invalidate an earlier particle cleanup before starting another draw.
      stopAnimation();
      // Choosing a banner never spends a ticket. Commit only on a completed
      // pull or the accessible draw button; the host saves before returning.
      busy=true;notice='玉を引っぱって離すか、「ガチャを引く」を押してください。';render();
      const box=el('div','sp-dragon-stage');box.setAttribute('aria-label','オリジナルのドラゴンと引っぱる玉');
      const dragon=el('div','sp-dragon');dragon.setAttribute('aria-hidden','true');
      dragon.innerHTML='<svg viewBox="0 0 200 180" xmlns="http://www.w3.org/2000/svg"><path d="M43 75 Q5 33 48 38 L64 61 M152 61 L167 37 Q197 31 169 78" fill="#b2d8c9" stroke="#527c73" stroke-width="5"/><path d="M47 72 Q49 23 100 27 Q151 23 156 72 Q174 85 161 121 Q154 151 100 154 Q44 151 38 121 Q25 91 47 72Z" fill="#bde4d1" stroke="#527c73" stroke-width="5"/><path d="M59 43 L55 14 Q67 16 75 31 M125 31 Q133 16 145 14 L141 43" fill="#f5ddb0" stroke="#806d5a" stroke-width="4" stroke-linejoin="round"/><circle cx="75" cy="72" r="15" fill="#fff"/><circle cx="125" cy="72" r="15" fill="#fff"/><circle cx="76" cy="73" r="6" fill="#3d4b58"/><circle cx="124" cy="73" r="6" fill="#3d4b58"/><ellipse cx="100" cy="111" rx="34" ry="22" fill="#f8d5b5"/><circle cx="91" cy="105" r="2.5" fill="#8c6868"/><circle cx="109" cy="105" r="2.5" fill="#8c6868"/><ellipse class="sp-mouth" cx="100" cy="122" rx="19" ry="15" fill="#9f5c6d"/><path d="M84 120 l5 8 3-8 M108 120 l3 8 5-8" fill="#fff8e9"/><path d="M51 91 l6 4 -6 4 M149 91 l-6 4 6 4" fill="none" stroke="#77aa94" stroke-width="3" stroke-linecap="round"/><circle cx="67" cy="99" r="7" fill="#efadc1"/><circle cx="133" cy="99" r="7" fill="#efadc1"/><path d="M87 32 100 9 113 32" fill="#f8d978" stroke="#997b4e" stroke-width="4"/></svg>';
      const egg=el('span','sp-egg');egg.setAttribute('aria-hidden','true');
      const orb=btn('玉',null,false,'orb');orb.classList.add('sp-orb');orb.setAttribute('aria-label','玉をドラッグして離す。キーボードでは「ガチャを引く」を押します。');
      box.append(dragon,egg,orb);const controls=el('div','sp-draws');let settled=false,start=null;
      function cancel(){if(settled)return;settled=true;stopAnimation();notice='ガチャを中止しました。チケットは使っていません。';render();}
      function commit(){
        if(settled||!busy||overlay.hidden||!active)return;settled=true;
        const result=apply('draw',kind);if(!result){stopAnimation();render();return;}
        // Cue is a separate, cosmetic roll, never an input to the saved draw.
        let cue=false;try{cue=result.rarity==='SSR'&&Math.random()<.2;}catch(_){}
        notice=cue?'確定！ SSR が出ます。':'結果を保存しました。';live.textContent=notice;
        controls.replaceChildren();orb.disabled=true;orb.style.transform='';box.classList.add('sp-playing');
        const skip=btn('演出をスキップ',()=>reveal(result,cue),false,'skip');controls.append(skip);skip.focus();
        if(cue){const flag=el('p','sp-warning','✦ 確定！ SSR ✦');flag.setAttribute('role','status');controls.prepend(flag);}
        const reduced=typeof root.matchMedia==='function'&&root.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if(reduced){reveal(result,cue);return;}
        const generation=animationGeneration;animationTimer=setTimeout(()=>{if(generation!==animationGeneration||!active||overlay.hidden)return;revealWithParticles(result,cue);},2800);
      }
      orb.addEventListener('pointerdown',e=>{if(settled||start||(e.pointerType==='mouse'&&e.button!==0))return;start={x:e.clientX,y:e.clientY,id:e.pointerId};try{orb.setPointerCapture(e.pointerId);}catch(_){}e.preventDefault();});
      orb.addEventListener('pointermove',e=>{if(!start||settled||e.pointerId!==start.id)return;const dx=Math.max(-80,Math.min(80,e.clientX-start.x)),dy=Math.max(-35,Math.min(75,e.clientY-start.y));orb.style.transform=`translate(calc(-50% + ${dx}px),${dy}px)`;});
      orb.addEventListener('pointerup',e=>{if(!start||settled||e.pointerId!==start.id)return;const distance=Math.hypot(e.clientX-start.x,e.clientY-start.y);start=null;orb.style.transform='';if(distance>=30)commit();});
      orb.addEventListener('pointercancel',e=>{if(!start||e.pointerId!==start.id)return;start=null;orb.style.transform='';});
      orb.addEventListener('click',e=>{if(e.detail===0)commit();});
      controls.append(btn('ガチャを引く（チケット1枚）',commit,false,'pull'),btn('やめる',cancel,false,'cancelPull'));
      body.prepend(box,controls);const first=controls.querySelector('button');if(first)first.focus();
    }
    function gachaView(s,c){
      addHeading('ガチャ','各1回につき、プレイで獲得したチケット1枚を使用します。購入・課金ルートはありません。');
      body.append(el('p','',`排出率：N ${percent(P.RARITY_RATES.N)} / R ${percent(P.RARITY_RATES.R)} / SR ${percent(P.RARITY_RATES.SR)} / SSR ${percent(P.RARITY_RATES.SSR)}（合計100%）。通常と既存限定ガチャの各レア度内候補は均等です。月巡りのSSR内比率は下記の通りです。`));
      body.append(el('p','sp-note','確定演出は実際のSSR結果の20%に出現します（各ガチャ全体では0.2%）。演出が出なくてもSSRは出ます。演出は結果を変えません。'));
      const last=s.lastDraw;const knownLast=last&&((last.kind==='monthly'&&P.MONTHLY_IDS.includes(last.bannerId)&&Array.isArray(P.POOLS.limited[last.rarity])&&P.POOLS.limited[last.rarity].includes(last.id))||(Object.prototype.hasOwnProperty.call(P.POOLS,last.kind)&&Array.isArray(P.POOLS[last.kind][last.rarity])&&P.POOLS[last.kind][last.rarity].includes(last.id)));if(knownLast){const cat=last.kind==='weapon'?P.WEAPONS:P.ROSTER,item=cat[last.id];if(item){const outcome=last.rankUp?`改造ランク ${last.modRank}`:last.duplicate?`重複：素材 ${last.duplicateMaterials} 個`:'新規獲得';body.append(el('p','sp-note',`前回の結果：${last.rarity} ${item.name}（${outcome}）。再読込後も確認できます。`));}}
      body.append(el('p','sp-note','仲間が重複すると改造ランクが1上昇（最大3）。最大後の仲間と重複した杖は素材に変換：N 2個 / R 5個 / SR 12個 / SSR 30個。天井・確定枠はありません。仲間は素材で確定交換もできます。'));
      const status=P.bannerStatus();body.append(el('p','sp-note',`限定：2026年11月3日 00:00〜2026年12月3日 23:59:59 日本時間（仮日程）。現在：${status==='active'?'開催中':status==='before'?'開始前':'終了'}。オフラインのため端末の日時で判定します。終了後も獲得した仲間は使えます。限定キャラは開催中、仲間タブで素材80個と確定交換可能。`));
      for(const [kind,title,catalog] of [['character','仲間ガチャ',P.ROSTER],['limited','期間限定 星守カグラガチャ',P.ROSTER],['weapon','杖ガチャ',P.WEAPONS]]){
        const section=el('section','sp-card');section.append(el('h4','',title));const list=el('ul','sp-pool');
        ['N','R','SR','SSR'].forEach(r=>P.POOLS[kind][r].forEach(id=>list.append(el('li','',`${r} ${catalog[id].name}：${percent(P.ITEM_RATES[kind][id])}`))));section.append(list,btn(`${title}を1回引く（チケット1枚）`,()=>draw(kind),busy||s.tickets<1||!!c.storageError||(kind==='limited'&&P.bannerStatus()!=='active'),`draw:${kind}`));body.append(section);
      }
      const exclusive=el('section','sp-card');exclusive.append(el('h4','','ガチャ限定仲間（常設）'),el('p','sp-note','無料で獲得した通常チケット1枚で引きます。200人はこのガチャ限定で、既存の通常・期間限定・月巡りガチャやイベントからは出ません。4種類の画像と既存100技を共有します。抽選結果の保存に成功すると専用交換ポイント1、5ポイントで仲間画面から任意の専用仲間1体と交換できます。所持済みも交換でき、改造・累計・運に加算し、改造上限後の重複は素材に変換します。無料券は訓練の勝利で1枚獲得。券・ポイントが0なら訓練5勝と専用ガチャ5回で1体交換できます。ポイント上限999999では抽選できず、交換で減らすと再開できます。'));
      const rarityButtons=el('div','sp-draws');['N','R','SR','SSR'].forEach(r=>{const button=btn(r,()=>{exclusiveRarity=r;render();},busy,`exclusive:${r}`);button.setAttribute('aria-pressed',String(exclusiveRarity===r));rarityButtons.append(button);});exclusive.append(rarityButtons,el('p','sp-note',`${exclusiveRarity}：全50人、各 ${percent(P.RARITY_RATES[exclusiveRarity]/50)}（このレア度合計 ${percent(P.RARITY_RATES[exclusiveRarity])}）。4レア度合計100%。`));
      const exclusiveList=el('ul','sp-pool');P.EXCLUSIVE_POOL[exclusiveRarity].forEach(id=>exclusiveList.append(el('li','',`${id} ${P.ROSTER[id].name}：${percent(P.ITEM_RATES.exclusive[id])}`)));exclusive.append(exclusiveList,btn('ガチャ限定仲間を1回引く（通常チケット1枚）',()=>draw('exclusive'),busy||s.tickets<1||(s.exclusivePoints||0)>=P.MAX_CURRENCY||!!c.storageError,'draw:exclusive'));body.append(exclusive);
      const now=Date.now(),ls=P.loginStatus(s,now),banner=P.monthlyBanner(now);
      if(ls.ok&&banner.ok){
        const section=el('section','sp-card');section.append(el('h4','','ログインボーナス'),el('p','sp-note',`JST ${ls.date}。次は${ls.nextDay}日目：${ls.nextDay===10?banner.name+'専用限定券1枚':'通常無料券1枚'}。${ls.clockRollback?'端末日付が前回より前のため受取不可。':ls.canClaim?'受け取れます。':'今日は受取済み。'} 受取日にだけ進み、欠席日は飛ばしません。10日目の次は1日目です。`));
        section.append(btn('本日のログインボーナスを受け取る',()=>{const r=apply('loginClaim',ls.date);if(r){notice=r.day===10?`${r.day}日目：${r.bannerId}限定券1枚を受け取りました。`:`${r.day}日目：通常券1枚を受け取りました。`;render();}},busy||!ls.canClaim||!!c.storageError,'loginClaim'));body.append(section);
        const [cy,cm]=banner.month.split('-').map(Number),nextAbsolute=cy*12+cm,nextMonth=Math.floor(nextAbsolute/12)+'-'+String(nextAbsolute%12+1).padStart(2,'0');const monthly=el('section','sp-card');monthly.append(el('h4','',`${banner.name}（${banner.month} JST）`),el('p','sp-note',`当月専用 ${banner.id} 券：${s.limitedTickets&&s.limitedTickets[banner.id]||0}枚。通常券とは別です。対象期間：${banner.month}-01 00:00〜${nextMonth}-01 00:00直前（JST）。券に期限はなく、対応する種類が15か月後に再登場した時も使えます。`));
        monthly.append(el('p','sp-note','15種類は2026年11月を01として毎月順に巡回します。いずれも同じ5人の候補で、SSR内の2人の比率が異なる試作です。15人の新キャラではありません。'));
        const list=el('ul','sp-pool');Object.entries(banner.rates).forEach(([id,rate])=>list.append(el('li','',`${P.ROSTER[id].rarity} ${P.ROSTER[id].name}：${percent(rate)}`)));monthly.append(list,btn(`${banner.name}を1回引く（対応限定券1枚）`,()=>draw('monthly:'+banner.id),busy||!s.limitedTickets||!(s.limitedTickets[banner.id]>0)||!!c.storageError,'draw:monthly'));
        const schedule=el('details','sp-note'),summary=el('summary','','15種類の券と次の開催月');schedule.append(summary);const ul=el('ul','sp-pool');P.MONTHLY_IDS.forEach((id,i)=>{const offset=((i+1-banner.index)%15+15)%15;const [year,month]=banner.month.split('-').map(Number),absolute=year*12+(month-1)+offset,ym=Math.floor(absolute/12)+'-'+String(absolute%12+1).padStart(2,'0'),count=s.limitedTickets&&s.limitedTickets[id]||0;ul.append(el('li','',`${id}：${count}枚・次回 ${ym} JST${offset===0?'（開催中）':''}`));});schedule.append(ul);monthly.append(schedule);body.append(monthly);
      }else body.append(el('p','sp-warning','端末の日時を確認できないため、ログイン報酬と月別限定ガチャは利用できません。'));
    }
    function trainView(c){
      addHeading('訓練','短い訓練戦に挑戦できます。実際に勝利するとチケット1枚と素材2個を獲得します。');
      function begin(callback){if(busy)return;try{const result=callback();if(result&&result.ok===false){notice=ERRORS[result.reason]||'開始できませんでした。';overlay.hidden=false;render();return;}stopAnimation();overlay.hidden=true;}catch(_){notice='開始できませんでした。';overlay.hidden=false;render();}}
      body.append(btn('訓練をはじめる',()=>begin(options.onTrain),busy||!!c.storageError||typeof options.onTrain!=='function','train'));
      body.append(el('h3','','チャレンジ'),el('p','sp-note','２体の妖精と順番に戦います。勝利するとチケット２枚と素材４個。何度でも挑戦できます。'));
      body.append(btn('チャレンジをはじめる',()=>begin(options.onChallenge),busy||!!c.storageError||typeof options.onChallenge!=='function','challenge'));
      if(c.towerAvailable===true)body.append(el('h3','','月間の塔'),el('p','sp-note','ステージセレクトから挑戦。毎月15日0:00〜20日23:59:59（日本時間）に開始できます。各階は5面構成で、報酬は5面クリア時。期間終了後は新しい面を開始できません。期間中に開始した進行中の1面だけは終了後も完了できます。途中進行は保存され、月が変わると新しい1階1面から始まります。獲得済みの装備や仲間は残ります。5階：白星の杖、15階：チケット10枚、25階：月塔の杖、35階：チケット10枚、40階：シラトリ5体。杖が重複した場合は素材に変換。オフラインのため日時は端末の時計を使い、時計の変更は検知できません。'));
    }
    function render(){
      if(!active)return;
      const focused=document.activeElement, hadFocus=panel.contains(focused), persistentFocus=focused===closeButton||focused===body||focused===panel;
      const focusKey=hadFocus&&focused&&focused.getAttribute?focused.getAttribute('data-sp-focus-key'):null;
      const oldScroll=body.scrollTop;
      const restore=()=>{
        if(hadFocus&&!persistentFocus){
          const candidates=Array.from(panel.querySelectorAll('[data-sp-focus-key]'));
          const find=k=>candidates.find(x=>x.getAttribute('data-sp-focus-key')===k&&!x.disabled);
          let next=focusKey&&find(focusKey);
          if(!next&&focusKey&&focusKey.startsWith('exchange:'))next=find('party:'+focusKey.slice(9));
          if(!next&&focusKey&&focusKey.startsWith('equip:'))next=find('upgrade:'+focusKey.slice(6));
          if(!next&&focusKey&&focusKey.startsWith('upgrade:'))next=find('equip:'+focusKey.slice(8));
          next=next||body;
          try{next.focus({preventScroll:true});}catch(_){next.focus();}
        }
        body.scrollTop=oldScroll;
      };
      const s=state(),c=context();tabs.replaceChildren();body.replaceChildren();
      ['仲間','装備','ガチャ','訓練'].forEach(name=>{const b=btn(name,()=>{if(busy)return;tab=name;notice='';discardConfirm=false;exclusiveConfirm=null;render();},busy,'tab:'+name);b.classList.add('sp-tab');b.setAttribute('aria-pressed',String(name===tab));tabs.append(b);});
      let validState=false;try{validState=!!s&&P.stats(s).ok===true;}catch(_){}
      if(!validState){balance.textContent='';live.textContent='データを読み取れませんでした。';body.append(el('p','sp-warning','データを読み取れませんでした。再読み込みするかセーブを復元してください。'));restore();return;}
      const serious=c.storageIssue==='corrupt'||c.storageIssue==='conflict'||c.storageIssue==='unavailable';
      const storageMessage=c.storageIssue==='corrupt'?'既存のセーブを読み取れません。再読み込みするか、セーブを復元してください。':c.storageIssue==='conflict'?'別のタブでセーブが変更されました。再読み込みするか、セーブを復元してください。':c.storageIssue==='unavailable'?'ブラウザの保存領域を利用できません。再読み込みするか、セーブを復元してください。':'保存に失敗しました。変更は反映されていません。';
      balance.textContent=`チケット ${s.tickets}　専用交換pt ${s.exclusivePoints||0}　素材 ${s.materials}　・この端末に保存。複数タブでの同時プレイは避けてね。`;live.textContent=c.storageError?storageMessage:notice;
      if(c.storageError){const warning=el('div','sp-warning');warning.append(el('p','',serious?storageMessage:'保存できないため、変更と訓練を一時停止しています。'));if(!serious)warning.append(btn('保存を再試行',()=>{const result=apply('retrySave');if(result){notice='保存を再試行しました。';render();}},false,'retrySave'));body.append(warning);}
      if(tab==='仲間')partyView(s,c);else if(tab==='装備')weaponView(s,c);else if(tab==='ガチャ')gachaView(s,c);else trainView(c);
      restore();
    }
    // Listen at document capture so Tab is recovered even if focus escaped the dialog.
    function modalKeydown(e){
      if(!active||overlay.hidden)return;
      if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();return;}
      if(e.key!=='Tab')return;
      const fs=Array.from(panel.querySelectorAll('button:not(:disabled),select:not(:disabled),input:not(:disabled),summary,[tabindex="0"]')).filter(x=>!x.hidden);
      if(!fs.length){e.preventDefault();e.stopPropagation();panel.focus();return;}
      const first=fs[0],last=fs[fs.length-1],outside=!panel.contains(document.activeElement);
      if(outside||(e.shiftKey&&document.activeElement===first)||(!e.shiftKey&&document.activeElement===last)){
        e.preventDefault();e.stopPropagation();(e.shiftKey?last:first).focus();
      }
    }
    document.addEventListener('keydown',modalKeydown,true);
    // Let controls receive their keys, but do not leak dialog keys to the game.
    overlay.addEventListener('keydown',e=>e.stopPropagation());
    function show(){if(!active)return;previousFocus=document.activeElement;overlay.hidden=false;render();closeButton.focus();}
    function hide(){stopAnimation();overlay.hidden=true;}
    function destroy(){stopAnimation();active=false;document.removeEventListener('keydown',modalKeydown,true);overlay.remove();style.remove();}
    return {show,hide,render,destroy};
  }
  root.SakuraProgressionUI=Object.freeze({create});
})(typeof window!=='undefined'?window:globalThis);
