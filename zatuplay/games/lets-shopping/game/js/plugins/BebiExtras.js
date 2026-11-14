/* べび手帳: 任意の補助機能10種と戦闘UI */
var BebiExtras={};
(function(){
'use strict';
BebiExtras.options=function(){return $gameSystem._bebiExtras||($gameSystem._bebiExtras={auto:true,difficulty:1,speed:1,volume:typeof ConfigManager.bgmVolume==='number'?ConfigManager.bgmVolume:100,visited:{}});};
BebiExtras.save=function(slot){if($gameParty.inBattle()||$gameMap.isEventRunning()||$gameMessage.isBusy()||BebiExtras.practice)return false;$gameSystem.onBeforeSave();return DataManager.saveGame(slot);};
BebiExtras.questNotes=function(){return $gameParty.items().filter(function(it){return it.description;}).map(function(it){return {name:it.name+' ×'+$gameParty.numItems(it),text:it.description};});};
BebiExtras.visit=function(){var o=BebiExtras.options();o.visited[$gameMap.mapId()]=true;};
BebiExtras.preparePractice=function(){
 if(BebiExtras.practice)return false;
 var snap={actors:JsonEx.stringify($gameActors._data),members:$gameParty._actors.slice(),battleCount:$gameSystem._battleCount,winCount:$gameSystem._winCount,escapeCount:$gameSystem._escapeCount};
 BebiExtras.practice=snap;
 $gameParty.members().forEach(function(a){[120,40,32,12,24,12,20,1].forEach(function(v,i){a.addParam(i,Math.max(0,v-a.param(i)));});a.recoverAll();});
 BattleManager.setup($dataTroops.length-1,true,true);BattleManager.saveBgmAndBgs();
 return true;
};
BebiExtras.restorePractice=function(){var p=BebiExtras.practice;if(!p)return;$gameActors._data=JsonEx.parse(p.actors);$gameParty._actors=p.members;$gameSystem._battleCount=p.battleCount;$gameSystem._winCount=p.winCount;$gameSystem._escapeCount=p.escapeCount;BebiExtras.practice=null;$gamePlayer.refresh();};
BebiExtras.open=function(){if(!(SceneManager._scene instanceof Scene_Map)||SceneManager.isSceneChanging()||$gameMap.isEventRunning()||$gameMessage.isBusy())return;Input.clear();TouchInput.clear();SceneManager.push(Scene_BebiTools);};
function Window_BebiTools(){this.initialize.apply(this,arguments);}
Window_BebiTools.prototype=Object.create(Window_Command.prototype);Window_BebiTools.prototype.constructor=Window_BebiTools;
Window_BebiTools.prototype.initialize=function(){this.mode='main';Window_Command.prototype.initialize.call(this,24,120);};
Window_BebiTools.prototype.windowWidth=function(){return Graphics.boxWidth-48;};
Window_BebiTools.prototype.windowHeight=function(){return Math.min(this.fittingHeight(this._list.length),Graphics.boxHeight-144);};
Window_BebiTools.prototype.lineHeight=function(){return 44;};
Window_BebiTools.prototype.makeCommandList=function(){
 var o=BebiExtras.options(),self=this;
 if(this.mode==='main'){
  this.addCommand('自動セーブ：'+(o.auto?'ON':'OFF'),'auto',true,'マップを移動したあと、イベント終了を待って専用スロット22に保存します。');
  this.addCommand('クイックセーブ','save',true,'今の進行を専用スロット21へ保存します。');
  this.addCommand('クイックロード','load',DataManager.isThisGameFile(21),'スロット21を読み込みます。保存後に進めた内容は戻ります。');
  this.addCommand('おつかいメモ','notes',true,'所持品の説明を一覧で確認できます。');
  this.addCommand('訪れた場所','maps',true,'訪れたマップを手帳に記録します。未訪問の場所は伏せて表示します。');
  this.addCommand('戦闘難易度：'+['やさしい','標準','むずかしい'][o.difficulty],'difficulty',true,'敵のHP・攻撃・防御を調整します。標準は移植版の設定です。');
  this.addCommand('戦闘速度：'+['ゆっくり','標準','速い'][o.speed],'speed',true,'戦闘ログとアニメーションの速度を変更します。会話の速度は変えません。');
  this.addCommand('音量：'+o.volume+'%','volume',true,'BGM・効果音の音量をまとめて切り替えます。');
  this.addCommand('遊び方','help',true,'操作・セーブ・戦闘の説明を確認できます。');
  this.addCommand('練習バトル','practice',true,'練習用の相手と戦います。終了後、味方の能力・HP・MPは元に戻ります。報酬はありません。');
 }else if(this.mode==='loadConfirm'){
  this.addCommand('クイックセーブを読み込む','confirm',true,'現在の進行を保存しないで、スロット21を読み込みます。');
 }else if(this.mode==='notes'){
  var rows=BebiExtras.questNotes();rows.forEach(function(r){self.addCommand(r.name,'info',true,r.text);});if(!rows.length)this.addCommand('説明のある所持品はまだありません','info',true,'買い物などで入手したアイテムの説明がここに表示されます。');
 }else if(this.mode==='maps'){
  $dataMapInfos.forEach(function(m){if(m)self.addCommand(o.visited[m.id]?m.name:'？？？','info',true,o.visited[m.id]?'訪問済み：'+m.name:'まだ訪れていない場所です。');});
 }else if(this.mode==='help'){
  [['歩く・話す','方向キーで歩き、決定で話しかけます。地面をタップして移動することもできます。'],['買い物','お金や所持品で選択肢が変わります。おつかいメモで持ち物の説明を確認しましょう。'],['セーブ','メニューで通常セーブ。べび手帳ではクイック保存と自動保存を使えます。'],['戦闘','攻撃・防御・技能・アイテムを大きなコマンドから選び、相手の一覧をタップします。'],['練習バトル','練習中だけ味方の能力を補助します。勝敗にかかわらず、終了後は元の状態に戻ります。']].forEach(function(r){self.addCommand(r[0],'info',true,r[1]);});
 }
 this.addCommand(this.mode==='main'?'冒険に戻る':'手帳に戻る','back',true,'戻るボタンでも戻れます。');
};
Window_BebiTools.prototype.updateHelp=function(){if(this._helpWindow)this._helpWindow.setText((this.currentExt()||'べび手帳').match(/.{1,34}/g).join('\n'));};
Window_BebiTools.prototype.setMode=function(m){this.mode=m;this.refresh();this.select(0);this.activate();this.updateHelp();};
function Scene_BebiTools(){this.initialize.apply(this,arguments);}
Scene_BebiTools.prototype=Object.create(Scene_MenuBase.prototype);Scene_BebiTools.prototype.constructor=Scene_BebiTools;
Scene_BebiTools.prototype.create=function(){
 Scene_MenuBase.prototype.create.call(this);this._helpWindow=new Window_Help(2);this.addWindow(this._helpWindow);this._toolsWindow=new Window_BebiTools();this._toolsWindow.setHelpWindow(this._helpWindow);this.addWindow(this._toolsWindow);
 var self=this;['auto','save','load','notes','maps','difficulty','speed','volume','help','practice','confirm','info','back'].forEach(function(k){self._toolsWindow.setHandler(k,function(){self.command(k);});});this._toolsWindow.setHandler('cancel',function(){self.command('back');});this._toolsWindow.updateHelp();
};
Scene_BebiTools.prototype.command=function(k){var w=this._toolsWindow,o=BebiExtras.options();
 if(k==='back'){if(w.mode==='main')this.popScene();else w.setMode('main');return;}
 if(k==='notes'||k==='maps'||k==='help'){w.setMode(k);return;}
 if(k==='load'){w.setMode('loadConfirm');return;}
 if(k==='confirm'){
  if(DataManager.loadGame(21)){this.fadeOutAll();Scene_Load.prototype.reloadMapIfUpdated.call(this);$gameSystem.onAfterLoad();SceneManager.goto(Scene_Map);}else{this._helpWindow.setText('読み込みに失敗しました。通常のロード画面も確認してください。');w.activate();}return;
 }
 if(k==='practice'){if(BebiExtras.preparePractice()){SoundManager.playBattleStart();SceneManager.goto(Scene_Battle);}else w.activate();return;}
 if(k==='save'){var saved=BebiExtras.save(21),index=w.index();w.refresh();w.select(index);w.activate();this._helpWindow.setText(saved?'クイックセーブしました。':'今は保存できません。イベント終了後に試してください。');return;}
 if(k==='info'){w.activate();w.updateHelp();return;}
 if(k==='auto')o.auto=!o.auto;
 if(k==='difficulty')o.difficulty=(o.difficulty+1)%3;
 if(k==='speed')o.speed=(o.speed+1)%3;
 if(k==='volume'){o.volume={0:40,40:80,80:100,100:0}[o.volume]||0;['bgmVolume','bgsVolume','meVolume','seVolume'].forEach(function(key){AudioManager[key]=o.volume;ConfigManager[key]=o.volume;});ConfigManager.save();}
 var i=w.index();w.refresh();w.select(i);w.activate();w.updateHelp();
};
window.Scene_BebiTools=Scene_BebiTools;BebiExtras.ToolsWindow=Window_BebiTools;DataManager.maxSavefiles=function(){return 22;};
var mapStart=Scene_Map.prototype.start;Scene_Map.prototype.start=function(){mapStart.call(this);BebiExtras.restorePractice();BebiExtras.visit();this._bebiAutoDelay=90;};
var mapUpdate=Scene_Map.prototype.update;Scene_Map.prototype.update=function(){mapUpdate.call(this);if(this._bebiAutoDelay>0&&this.isActive()&&!$gameMap.isEventRunning()&&!$gameMessage.isBusy()&&!$gamePlayer.isTransferring()){this._bebiAutoDelay--;if(this._bebiAutoDelay===0&&BebiExtras.options().auto)BebiExtras.save(22);}};
var drawFile=Window_SavefileList.prototype.drawFileId;Window_SavefileList.prototype.drawFileId=function(id,x,y){if(id===21||id===22)this.drawText(id===21?'クイック':'自動セーブ',x,y,180);else drawFile.call(this,id,x,y);};
// Larger battle commands and target rows; status layout keeps full HP/MP gauges visible.
[Window_ActorCommand,Window_PartyCommand].forEach(function(K){K.prototype.windowWidth=function(){return 260;};K.prototype.lineHeight=function(){return 48;};});
[Window_BattleStatus,Window_BattleActor,Window_BattleEnemy].forEach(function(K){K.prototype.windowWidth=function(){return Graphics.boxWidth-260;};K.prototype.lineHeight=function(){return 48;};});
Window_BattleEnemy.prototype.maxCols=function(){return 1;};
Window_BattleEnemy.prototype.drawItem=function(index){var e=this._enemies[index],r=this.itemRectForText(index);this.resetTextColor();this.drawText(e.name(),r.x,r.y,r.width-170);this.drawText('HP '+e.hp+'/'+e.mhp,r.x+r.width-170,r.y,170,'right');};
[Window_BattleSkill,Window_BattleItem].forEach(function(K){K.prototype.lineHeight=function(){return 48;};});
var enemyParam=Game_Enemy.prototype.paramBase;Game_Enemy.prototype.paramBase=function(id){var base=enemyParam.call(this,id),scale=[0.7,1,1.3][BebiExtras.options().difficulty];return Math.max(id===0?1:0,Math.round(base*(id<=6?scale:1)));};
Window_BattleLog.prototype.messageSpeed=function(){return [36,16,8][BebiExtras.options().speed];};
Sprite_Actor.prototype.motionSpeed=function(){return [16,12,6][BebiExtras.options().speed];};
var animationRate=Sprite_Animation.prototype.setupRate;Sprite_Animation.prototype.setupRate=function(){animationRate.call(this);if($gameParty&&$gameParty.inBattle())this._rate=[6,4,2][BebiExtras.options().speed];};
var enemyUpdate=Sprite_Enemy.prototype.update;Sprite_Enemy.prototype.update=function(){enemyUpdate.call(this);if(this.bitmap&&this.bitmap.isReady()){var s=Math.min(1,280/this.bitmap.width,260/this.bitmap.height);this.scale.x=s;this.scale.y=s;}};
// Keep screen controls off battle command windows. Pointer input cannot reach map touch handlers.
var baseUpdate=Scene_Base.prototype.update;Scene_Base.prototype.update=function(){baseUpdate.call(this);var wrap=document.getElementById('bebi-controls');if(wrap){var scene=SceneManager._scene,battle=scene instanceof Scene_Battle,buttons=wrap.querySelectorAll('button');wrap.style.display=(scene instanceof Scene_Map||battle)?'':'none';for(var i=0;i<buttons.length;i++){var b=buttons[i],label=b.textContent;b.style.display=(battle&&['▲','◀','▶','▼','メニュー'].indexOf(label)>=0)?'none':'';if(label==='決定'||label==='戻る'){b.style.top=battle?'8px':'';b.style.bottom=battle?'':(label==='決定'?'60px':'8px');}}}
 if(!document.getElementById('bebi-book')){var b=document.createElement('button');b.id='bebi-book';b.textContent='べび手帳';b.style.cssText='position:fixed;left:12px;top:12px;z-index:100;padding:12px 18px;border-radius:12px;background:#fff0fa;color:#492342;font:bold 18px sans-serif;touch-action:none';['touchstart','touchmove','touchend','pointerdown'].forEach(function(e){b.addEventListener(e,function(ev){ev.stopPropagation();if(e!=='pointerdown')ev.preventDefault();},{passive:false});});['mousedown','mouseup'].forEach(function(evt){b.addEventListener(evt,function(e){e.preventDefault();e.stopPropagation();});});b.addEventListener('pointerup',function(e){e.preventDefault();e.stopPropagation();BebiExtras.open();});b.addEventListener('touchend',function(e){e.preventDefault();e.stopPropagation();if(!window.PointerEvent)BebiExtras.open();},{passive:false});document.body.appendChild(b);}
 var book=document.getElementById('bebi-book');book.style.display=SceneManager._scene instanceof Scene_Map?'':'none';
};
})();
