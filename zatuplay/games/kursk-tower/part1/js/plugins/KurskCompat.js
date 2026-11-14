/* Browser port modification: storage isolation / safe exit, 2026-11-14. */
/* べびのおつかい: 2003移植互換・Android操作 */
var KurskCompat={};
(function(){
'use strict';
KurskCompat.character=function(id,ev){return id===10001?$gamePlayer:id===10005?$gameMap.event(ev):$gameMap.event(id);};
KurskCompat.condition=function(p,s,eventid){
 if(p[0]===9){var b=AudioManager._bgmBuffer;return !b||!!b._totalTime&&(Graphics.frameCount-($gameSystem._legacyBgmStartFrame||0))/60>=b._totalTime;}
 if(p[0]===6){var c=KurskCompat.character(p[1],eventid);return !!c&&c.direction()===[8,6,2,4][p[2]];}
 if(p[0]===2)return p[2]===0?$gameTimer.seconds()>=p[1]:$gameTimer.seconds()<=p[1];
 if(p[0]===5){var a=$gameActors.actor(p[1]);if(!a)return false;if(p[2]===0)return $gameParty.members().contains(a);if(p[2]===1)return a.name()===s;if(p[2]===2)return a.level>=p[3];if(p[2]===3)return a.hp>=p[3];if(p[2]===4)return a.isLearnedSkill(p[3]);if(p[2]===6)return a.isStateAffected(p[3]);}
 return false;
};
KurskCompat.switches=function(p){var a=p[0]===2?$gameVariables.value(p[1]):p[1],b=p[0]===1?p[2]:a;for(var i=a;i<=b;i++)$gameSwitches.setValue(i,p[3]===2?!$gameSwitches.value(i):p[3]===0);};
KurskCompat.party=function(p){var id=p[1]?$gameVariables.value(p[2]):p[2];if(p[0])$gameParty.removeActor(id);else $gameParty.addActor(id);};
KurskCompat.timer=function(p){if(p[0]===0){$gameSystem._kurskTimerSeconds=p[1]?$gameVariables.value(p[2]):p[2];$gameTimer._frames=$gameSystem._kurskTimerSeconds*60;}if(p[0]===1){$gameTimer.start($gameSystem._kurskTimerSeconds*60||0);$gameSystem._kurskTimerVisible=!!p[3];}if(p[0]===2)$gameTimer.stop();};
var timerVisible=Sprite_Timer.prototype.updateVisibility;
Sprite_Timer.prototype.updateVisibility=function(){timerVisible.call(this);if($gameSystem._kurskTimerVisible===false)this.visible=false;};
var timerExpire=Game_Timer.prototype.onExpire;Game_Timer.prototype.onExpire=function(){if($gameParty.inBattle())timerExpire.call(this);$gameMap.requestRefresh();};
var evMeets=Game_Event.prototype.meetsConditions;
Game_Event.prototype.meetsConditions=function(page){
 var c=page.kurskCondition;
 if(!c)return evMeets.call(this,page);
 var f=c.flags||0;
 if((f&1)&&!$gameSwitches.value(c.switch_a_id||1))return false;
 if((f&2)&&!$gameSwitches.value(c.switch_b_id||1))return false;
 if(f&4){var a=$gameVariables.value(c.variable_id||1),b=c.variable_value||0;var op=c.compare_operator===undefined?1:c.compare_operator;if(![a===b,a>=b,a<=b,a>b,a<b,a!==b][op])return false;}
 if((f&8)&&!$gameParty.hasItem($dataItems[c.item_id||1],true))return false;
 if((f&16)&&!$gameParty.members().contains($gameActors.actor(c.actor_id||1)))return false;
 if((f&32)&&($gameTimer.seconds()>(c.timer_sec||0)))return false;
 if((f&64)&&(($gameSystem._kurskTimer2Seconds||0)>(c.timer2_sec||0)))return false;
 return true;
};
var setupPage=Game_Event.prototype.setupPageSettings;Game_Event.prototype.setupPageSettings=function(){setupPage.call(this);if(this.page().kurskTranslucent)this.setOpacity(128);else this.setOpacity(255);};
var mapUpdate=Game_Map.prototype.update;Game_Map.prototype.update=function(active){mapUpdate.call(this,active);if($gameTimer.isWorking()&&Graphics.frameCount%60===0)this.requestRefresh();};
// Explicit inventory IDs are preserved even for equipment.
var has=Game_Party.prototype.hasItem;Game_Party.prototype.hasItem=function(item,equip){if(has.call(this,item,equip))return true;if(equip&&item&&DataManager.isItem(item))return this.members().some(function(a){return a.equips().some(function(e){return e&&e.id===item.id;});});return false;};
Game_Actor.prototype.attackSkillId=function(){return $dataSkills.length-2;};Game_Actor.prototype.guardSkillId=function(){return $dataSkills.length-1;};
Game_Enemy.prototype.attackSkillId=function(){return $dataSkills.length-2;};
// Phone storage uses ZatuLocalStorage; the Android app keeps its data directory between runs.

SceneManager._screenWidth=960;SceneManager._screenHeight=720;SceneManager._boxWidth=960;SceneManager._boxHeight=720;
var font=Window_Base.prototype.standardFontSize;Window_Base.prototype.standardFontSize=function(){return 26;};
Window_Message.prototype.numVisibleRows=function(){return 4;};
var convertText=Window_Base.prototype.convertEscapeCharacters;
Window_Base.prototype.convertEscapeCharacters=function(text){return convertText.call(this,text.replace(/\\s\[\d+\]/gi,'').replace(/\\c\[(\d+)\]/gi,function(_,n){return '\\C['+Math.min(31,Number(n))+']';}));};
// Fit the original 20x15 map area and keep old character scale.
var ready=Scene_Boot.prototype.start;Scene_Boot.prototype.start=function(){ready.call(this);addControls();};
function addControls(){if(document.getElementById('kursk-controls'))return;
 var style=document.createElement('style');style.textContent='#kursk-controls{position:fixed;inset:0;pointer-events:none;z-index:99;touch-action:none}#kursk-controls button{pointer-events:auto;position:absolute;width:52px;height:48px;border:1px solid #ffffff70;border-radius:12px;background:#102637b0;color:white;font:bold 19px sans-serif;touch-action:none;user-select:none}#kursk-controls button:active{background:#5aa0bbb0}';document.head.appendChild(style);
 var wrap=document.createElement('div');wrap.id='kursk-controls';document.body.appendChild(wrap);
 function key(label,k,pos){var b=document.createElement('button'),pressed=0,releaseTimer=null;b.textContent=label;Object.assign(b.style,pos);
 function press(){clearTimeout(releaseTimer);pressed=performance.now();Input._currentState[k]=true;}
 function release(cancel){clearTimeout(releaseTimer);var delay=cancel?0:Math.max(0,100-(performance.now()-pressed));releaseTimer=setTimeout(function(){Input._currentState[k]=false;},delay);}
 ['touchstart','touchmove','touchend','touchcancel'].forEach(function(evt){b.addEventListener(evt,function(e){e.preventDefault();e.stopPropagation();if(!window.PointerEvent){if(evt==='touchstart')press();else if(evt!=='touchmove')release(evt==='touchcancel');}},{passive:false});});
 b.addEventListener('pointerdown',function(e){e.preventDefault();e.stopPropagation();press();b.setPointerCapture(e.pointerId);});b.addEventListener('pointerup',function(){release(false);});b.addEventListener('pointercancel',function(){release(true);});b.addEventListener('lostpointercapture',function(){if(!releaseTimer)release(false);});window.addEventListener('blur',function(){clearTimeout(releaseTimer);Input._currentState[k]=false;});wrap.appendChild(b);}

 key('▲','up',{left:'64px',bottom:'112px'});key('◀','left',{left:'8px',bottom:'60px'});key('▶','right',{left:'120px',bottom:'60px'});key('▼','down',{left:'64px',bottom:'8px'});key('決定','ok',{right:'12px',bottom:'60px'});key('戻る','escape',{right:'72px',bottom:'8px'});key('メニュー','escape',{right:'12px',top:'12px',width:'94px'});
 var home=document.createElement('button');home.textContent='作品選択';Object.assign(home.style,{left:'12px',top:'12px',width:'110px'});home.onclick=function(){Input.clear();if(confirm('作品選択に戻ります。未保存の進行は失われます。'))location.href='../index.html';};wrap.appendChild(home);
 window.addEventListener('blur',function(){Input.clear();});
}
window.kurskPause=function(){KurskCompat.pausedBgm=AudioManager.saveBgm();AudioManager.stopAll();Input.clear();};window.kurskResume=function(){if(KurskCompat.pausedBgm){AudioManager.replayBgm(KurskCompat.pausedBgm);KurskCompat.pausedBgm=null;}};
})();

(function(){
'use strict';
var series=Number(location.pathname.match(/part([123])/)[1]);
var oldkey=StorageManager.webStorageKey;StorageManager.webStorageKey=function(id){return 'KurskTower_part'+series+'_'+oldkey.call(this,id);};
KurskCompat.actors=function(p){if(p[0]===0)return $gameParty.members();var a=$gameActors.actor(p[0]===2?$gameVariables.value(p[1]):p[1]);return a?[a]:[];};
KurskCompat.callEvent=function(p){if(p[0]===0){var common=$dataCommonEvents[p[1]];if(common)this.setupChild(common.list,this._eventId);return;}var id=p[0]===2?$gameVariables.value(p[1]):p[1];if(id===10005)id=this._eventId;var page=p[0]===2?$gameVariables.value(p[2]):p[2];var e=$dataMap.events[id];if(e&&e.pages[page-1])this.setupChild(e.pages[page-1].list,id);};
KurskCompat.systemMusic=function(context,m){if(context===0)$gameSystem.setBattleBgm(m);else if(context===1)$gameSystem.setVictoryMe(m);else if(context===5)$gameSystem._legacyInnMe=m;};
KurskCompat.inn=function(p){
 var price=Math.max(0,p[1]);var self=this;var indent=this._indent;
 function accept(ok){self._branch[indent]=ok?0:2;if(ok){$gameParty.loseGold(price);$gameParty.members().forEach(function(a){a.recoverAll();});AudioManager.playMe($gameSystem._legacyInnMe||{name:'Inn',volume:80,pitch:100,pan:0});}}
 if(!price){accept(true);return;}
 $gameMessage.add('一泊 '+price+' '+TextManager.currencyUnit+'です。休みますか？');$gameMessage.setChoices(['休む','やめる'],0,1);
 $gameMessage.setChoiceCallback(function(n){if(n===0&&$gameParty.gold()>=price)accept(true);else{accept(false);if(n===0)$gameMessage.add('お金が足りません。');}});this.setWaitMode('message');
};
var wait=Game_Interpreter.prototype.updateWaitMode;Game_Interpreter.prototype.updateWaitMode=function(){if(this._waitMode==='legacyMovement'){var moving=$gamePlayer.isMoveRouteForcing()||$gameMap.events().some(function(e){return e.isMoveRouteForcing();});if(!moving)this._waitMode='';return moving;}return wait.call(this);};
KurskCompat.flashCharacter=function(p){var c=KurskCompat.character(p[0],this._eventId);if(!c)return;var sprites=SceneManager._scene._spriteset._characterSprites||[];var color=p.slice(1,5).map(function(v){return Math.round(v*255/31);});sprites.forEach(function(sp){if(sp._character===c){sp.setBlendColor(color);setTimeout(function(){sp.setBlendColor([0,0,0,0]);},p[5]*100);}});if(p[6])this.wait(p[5]*6);};
KurskCompat.scroll=function(p){if(p[0]===1){$gameMap.setDisplayPos(Math.max(0,$gamePlayer.x-9.5),Math.max(0,$gamePlayer.y-7));}else if(p[0]===0)$gameSystem._legacyScrollLocked=true;};
var scroll=Game_Player.prototype.updateScroll;Game_Player.prototype.updateScroll=function(x,y){if(!$gameSystem._legacyScrollLocked)scroll.call(this,x,y);};
// Preserve original equipment IDs while representing equipment in MV's separate tables.
var gain=Game_Party.prototype.gainItem;Game_Party.prototype.gainItem=function(it,n,inc){if(it&&DataManager.isItem(it)){it=$dataWeapons[it.id]||$dataArmors[it.id]||it;}gain.call(this,it,n,inc);};
var has=Game_Party.prototype.hasItem;Game_Party.prototype.hasItem=function(it,eq){if(it&&DataManager.isItem(it))it=$dataWeapons[it.id]||$dataArmors[it.id]||it;return has.call(this,it,eq);};
Window_TitleCommand.prototype.makeCommandList=function(){this.addCommand(TextManager.newGame,'newGame');this.addCommand(TextManager.continue_,'continue',this.isContinueEnabled());this.addCommand('作品選択へ戻る','series');};
var titleCommands=Scene_Title.prototype.createCommandWindow;Scene_Title.prototype.createCommandWindow=function(){titleCommands.call(this);this._commandWindow.setHandler('series',function(){location.href='../index.html';});};
var menu=Window_MenuCommand.prototype.addGameEndCommand;Window_MenuCommand.prototype.addGameEndCommand=function(){menu.call(this);this.addCommand('作品選択','series');};
var menuScene=Scene_Menu.prototype.createCommandWindow;Scene_Menu.prototype.createCommandWindow=function(){menuScene.call(this);this._commandWindow.setHandler('series',function(){Input.clear();if(confirm('作品選択に戻ります。未保存の進行は失われます。'))location.href='../index.html';else this._commandWindow.activate();}.bind(this));};
})();

(function(){
var play=AudioManager.playBgm;AudioManager.playBgm=function(bgm,pos){if($gameSystem&&!this.isCurrentBgm(bgm))$gameSystem._legacyBgmStartFrame=Graphics.frameCount;play.call(this,bgm,pos);};
var meets=Game_Troop.prototype.meetsConditions;Game_Troop.prototype.meetsConditions=function(pg){var c=pg.legacyCondition;if(!c)return meets.call(this,pg);var f=c.flags||0;if(!f)return false;if((f&1)&&!$gameSwitches.value(c.switch_a_id))return false;if((f&2)&&!$gameSwitches.value(c.switch_b_id))return false;if((f&4)&&$gameVariables.value(c.variable_id)<c.variable_value)return false;function turn(a,b,n){return a===0?n===b:n>=b&&(n-b)%a===0;}if((f&8)&&!turn(c.turn_a,c.turn_b,this.turnCount()))return false;if(f&128){var enemy=this.members()[c.turn_enemy_id];if(!enemy||!turn(c.turn_enemy_a,c.turn_enemy_b,enemy._legacyBattleTurns||0))return false;}if(f&256){var actor=$gameActors.actor(c.turn_actor_id);if(!actor||!turn(c.turn_actor_a,c.turn_actor_b,actor._legacyBattleTurns||0))return false;}if(f&32){var e=this.members()[c.enemy_id];if(!e||e.hpRate()*100<c.enemy_hp_min||e.hpRate()*100>c.enemy_hp_max)return false;}if(f&64){var a=$gameActors.actor(c.actor_id);if(!a||a.hpRate()*100<c.actor_hp_min||a.hpRate()*100>c.actor_hp_max)return false;}return true;};
var effect=Game_Action.prototype.apply;Game_Action.prototype.apply=function(target){effect.call(this,target);var it=this.item();if(it&&it.legacyType===10)$gameSwitches.setValue(it.legacySwitchId,true);};
var test=Game_Action.prototype.testApply;Game_Action.prototype.testApply=function(target){if(this.item()&&this.item().legacyType===10)return true;return test.call(this,target);};
// 2003 actors use a distinct experience growth curve.
Game_Actor.prototype.expForLevel=function(lv){var p=this.currentClass().legacyExp;if(!p)return Math.round(30*Math.pow(lv-1,2));var total=0;for(var i=1;i<lv;i++){total+=Math.floor(p[0])+i*Math.floor(p[1])+Math.floor(p[2]);}return Math.min(9999999,Math.max(0,total));};
})();

AudioManager.audioFileExt=function(){return ".ogg";};

(function(){
'use strict';
var rate=Game_Action.prototype.calcElementRate;Game_Action.prototype.calcElementRate=function(t){var es=this.item().legacyElements;if(es&&es.length)return Math.max.apply(null,es.map(function(e){return t.elementRate(e);}));return rate.call(this,t);};
var apply=Game_Action.prototype.apply;Game_Action.prototype.apply=function(t){var sub=this.subject();if(this.isPhysical()&&sub._legacyCharged){this._legacyChargeMultiplier=2;sub._legacyCharged=false;}apply.call(this,t);if(this.item().legacyBasic===4)sub._legacyCharged=true;};
var damage=Game_Action.prototype.makeDamageValue;Game_Action.prototype.makeDamageValue=function(t,c){var v=damage.call(this,t,c);return this.isPhysical()&&(this.subject()._legacyCharged||this._legacyChargeMultiplier===2)?v*2:v;};
var end=BattleManager.endAction;BattleManager.endAction=function(){if(this._action&&this._action.item().legacyBasic===5)this._subject.setHp(0);end.call(this);};
// Release held buttons when leaving the app, changing scenes or closing a dialog.
if(typeof window.addEventListener==='function'){window.addEventListener('pagehide',function(){Input.clear();AudioManager.stopAll();});window.addEventListener('blur',function(){Input.clear();});}
})();

(function(){
var reset=Game_BattlerBase.prototype.resetStateCounts;Game_BattlerBase.prototype.resetStateCounts=function(id){reset.call(this,id);this._legacyStateElapsed=this._legacyStateElapsed||{};this._legacyStateElapsed[id]=0;};
var auto=Game_Battler.prototype.removeStatesAuto;Game_Battler.prototype.removeStatesAuto=function(timing){var keep=[];this.states().forEach(function(s){if(s.legacySource){keep.push([s,s.autoRemovalTiming]);s.autoRemovalTiming=0;}});try{auto.call(this,timing);}finally{keep.forEach(function(q){q[0].autoRemovalTiming=q[1];});}if(timing===2){this._legacyStateElapsed=this._legacyStateElapsed||{};keep.forEach(function(q){var st=q[0],old=st.legacySource;var elapsed=(this._legacyStateElapsed[st.id]||0)+1;this._legacyStateElapsed[st.id]=elapsed;if(old.auto_release_prob&&elapsed>=old.hold_turn&&Math.random()*100<old.auto_release_prob)this.removeState(st.id);},this);}};
var hp=Game_Battler.prototype.regenerateHp;Game_Battler.prototype.regenerateHp=function(){hp.call(this);var flat=this.states().reduce(function(sum,s){var o=s.legacySource;return sum+(o&&o.hp_change_type!==2?(o.hp_change_type===0?-1:1)*o.hp_change_val:0);},0);if(flat)this.gainHp(Math.max(-this.maxSlipDamage(),flat));};
var mp=Game_Battler.prototype.regenerateMp;Game_Battler.prototype.regenerateMp=function(){mp.call(this);var flat=this.states().reduce(function(sum,s){var o=s.legacySource;return sum+(o&&o.sp_change_type!==2?(o.sp_change_type===0?-1:1)*o.sp_change_val:0);},0);if(flat)this.gainMp(flat);};
})();

// Battle regression fixes v1.2.1.
(function(){
'use strict';
Game_Enemy.prototype.guardSkillId=Game_Actor.prototype.guardSkillId;
var types=Game_Actor.prototype.addedSkillTypes;Game_Actor.prototype.addedSkillTypes=function(){var list=types.call(this);this.skills().forEach(function(s){if(s.stypeId>0&&list.indexOf(s.stypeId)<0)list.push(s.stypeId);});return list;};
var can=Game_BattlerBase.prototype.meetsSkillConditions;Game_BattlerBase.prototype.meetsSkillConditions=function(skill){if(!can.call(this,skill))return false;var src=skill.legacySource;if(!src)return true;return !this.states().some(function(s){var st=s.legacySource;return st&&((st.restrict_magic&&src.magical_rate>=st.restrict_magic_level)||(st.restrict_skill&&src.physical_rate>=st.restrict_skill_level));});};
var cost=Game_BattlerBase.prototype.skillMpCost;Game_BattlerBase.prototype.skillMpCost=function(skill){var src=skill.legacySource;return src&&src.sp_type===1?Math.floor(this.mmp*src.sp_percent/100*this.mcr):cost.call(this,skill);};
var hit=Game_Action.prototype.itemHit;Game_Action.prototype.itemHit=function(t){var value=hit.call(this,t);if(this.isPhysical()){this.subject().states().forEach(function(s){var st=s.legacySource;if(st)value*=st.reduce_hit_ratio/100;});}return value;};
var stop=Game_Battler.prototype.onBattleEnd;Game_Battler.prototype.onBattleEnd=function(){stop.call(this);this._legacyCharged=false;};
var global=Game_Action.prototype.applyGlobal;Game_Action.prototype.applyGlobal=function(){global.call(this);var it=this.item();if(DataManager.isSkill(it)&&it.legacyType===3)$gameSwitches.setValue(it.legacySwitchId,true);};
})();

(function(){
var start=Game_Battler.prototype.onBattleStart;Game_Battler.prototype.onBattleStart=function(){start.call(this);this._legacyBattleTurns=0;};
var turn=BattleManager.processTurn;BattleManager.processTurn=function(){var subject=this._subject,action=subject&&subject.currentAction();if(action&&!action._legacyTurnCounted){subject._legacyBattleTurns=(subject._legacyBattleTurns||0)+1;action._legacyTurnCounted=true;$gameTroop.setupBattleEvent();if($gameTroop.isEventRunning())return;}turn.call(this);};
})();

(function(){var read=DataManager.extractSaveContents;DataManager.extractSaveContents=function(c){read.call(this,c);if($gameSystem._kurskCompleted===1&&window.KurskSeries)KurskSeries.mark($gameSystem._kurskCompleted);};})();


// Remove only this episode's opening cards after the opening map.
(function(){
'use strict';
var cards=["L_オープニング１", "L_オープニング１０", "L_オープニング２", "L_オープニング３", "L_オープニング４", "L_オープニング５", "L_オープニング６", "L_オープニング７", "L_オープニング８", "L_オープニング９"];
function clearOpeningCards(){
 if(!$gameScreen||$gameParty.inBattle())return;
 for(var id=1;id<=$gameScreen.maxPictures();id++){
  var picture=$gameScreen.picture(id);
  if(picture&&cards.indexOf(picture.name())>=0)$gameScreen.erasePicture(id);
 }
}
var update=Game_Map.prototype.update;
Game_Map.prototype.update=function(active){
 if(this.mapId()>1)clearOpeningCards();
 update.call(this,active);
};
var transfer=Game_Interpreter.prototype.command201;
Game_Interpreter.prototype.command201=function(){
 if(!$gameParty.inBattle()&&!$gameMessage.isBusy()&&$gameMap.mapId()===1){
  var target=this._params[0]===0?this._params[1]:$gameVariables.value(this._params[1]);
  if(target!==1)clearOpeningCards();
 }
 return transfer.call(this);
};
})();

// Side-view actors: recover battler graphics for saves made in front-view mode.
(function(){
'use strict';
var battlerName=Game_Actor.prototype.battlerName;
Game_Actor.prototype.battlerName=function(){return battlerName.call(this)||('KurskSV_'+this.actorId());};
ImageManager.loadSvEnemy=function(name,hue){return this.loadEnemy(name,hue);};
var screenX=Game_Enemy.prototype.screenX;
Game_Enemy.prototype.screenX=function(){var x=screenX.call(this);return $gameSystem.isSideView()?Math.round(x*.55):x;};
})();
