/* べびのおつかい: 2003移植互換・Android操作 */
var BebiCompat={};
(function(){
'use strict';
BebiCompat.character=function(id,ev){return id===10001?$gamePlayer:id===10005?$gameMap.event(ev):$gameMap.event(id);};
BebiCompat.condition=function(p,s,eventid){
 if(p[0]===6){var c=BebiCompat.character(p[1],eventid);return !!c&&c.direction()===[8,6,2,4][p[2]];}
 if(p[0]===2)return p[2]===0?$gameTimer.seconds()>=p[1]:$gameTimer.seconds()<=p[1];
 if(p[0]===5){var a=$gameActors.actor(p[1]);if(!a)return false;if(p[2]===0)return $gameParty.members().contains(a);if(p[2]===1)return a.name()===s;if(p[2]===2)return a.level>=p[3];if(p[2]===3)return a.hp>=p[3];if(p[2]===4)return a.isLearnedSkill(p[3]);if(p[2]===6)return a.isStateAffected(p[3]);}
 return false;
};
BebiCompat.switches=function(p){var a=p[0]===2?$gameVariables.value(p[1]):p[1],b=p[0]===1?p[2]:a;for(var i=a;i<=b;i++)$gameSwitches.setValue(i,p[3]===2?!$gameSwitches.value(i):p[3]===0);};
BebiCompat.party=function(p){var id=p[1]?$gameVariables.value(p[2]):p[2];if(p[0])$gameParty.removeActor(id);else $gameParty.addActor(id);};
BebiCompat.timer=function(p){if(p[0]===0){$gameSystem._bebiTimerSeconds=p[1]?$gameVariables.value(p[2]):p[2];$gameTimer._frames=$gameSystem._bebiTimerSeconds*60;}if(p[0]===1){$gameTimer.start($gameSystem._bebiTimerSeconds*60||0);$gameSystem._bebiTimerVisible=!!p[3];}if(p[0]===2)$gameTimer.stop();};
var timerVisible=Sprite_Timer.prototype.updateVisibility;
Sprite_Timer.prototype.updateVisibility=function(){timerVisible.call(this);if($gameSystem._bebiTimerVisible===false)this.visible=false;};
var timerExpire=Game_Timer.prototype.onExpire;Game_Timer.prototype.onExpire=function(){if($gameParty.inBattle())timerExpire.call(this);$gameMap.requestRefresh();};
var evMeets=Game_Event.prototype.meetsConditions;
Game_Event.prototype.meetsConditions=function(page){
 var c=page.bebiCondition;
 if(!c)return evMeets.call(this,page);
 var f=c.flags||0;
 if((f&1)&&!$gameSwitches.value(c.switch_a_id||1))return false;
 if((f&2)&&!$gameSwitches.value(c.switch_b_id||1))return false;
 if(f&4){var a=$gameVariables.value(c.variable_id||1),b=c.variable_value||0;var op=c.compare_operator===undefined?1:c.compare_operator;if(![a===b,a>=b,a<=b,a>b,a<b,a!==b][op])return false;}
 if((f&8)&&!$gameParty.hasItem($dataItems[c.item_id||1],true))return false;
 if((f&16)&&!$gameParty.members().contains($gameActors.actor(c.actor_id||1)))return false;
 if((f&32)&&($gameTimer.seconds()>(c.timer_sec||0)))return false;
 if(f&64)return false;
 return true;
};
var setupPage=Game_Event.prototype.setupPageSettings;Game_Event.prototype.setupPageSettings=function(){setupPage.call(this);if(this.page().bebiTranslucent)this.setOpacity(128);else this.setOpacity(255);};
var mapUpdate=Game_Map.prototype.update;Game_Map.prototype.update=function(active){mapUpdate.call(this,active);if($gameTimer.isWorking()&&Graphics.frameCount%60===0)this.requestRefresh();};
// Explicit inventory IDs are preserved even for equipment.
var has=Game_Party.prototype.hasItem;Game_Party.prototype.hasItem=function(item,equip){if(has.call(this,item,equip))return true;if(equip&&item&&DataManager.isItem(item))return this.members().some(function(a){return a.equips().some(function(e){return e&&e.id===item.id;});});return false;};
Game_Actor.prototype.attackSkillId=function(){return $dataSkills.length-2;};Game_Actor.prototype.guardSkillId=function(){return $dataSkills.length-1;};
Game_Enemy.prototype.attackSkillId=function(){return $dataSkills.length-2;};
// Phone storage uses localStorage; the Android app keeps its data directory between runs.

SceneManager._screenWidth=960;SceneManager._screenHeight=720;SceneManager._boxWidth=960;SceneManager._boxHeight=720;
var font=Window_Base.prototype.standardFontSize;Window_Base.prototype.standardFontSize=function(){return 26;};
Window_Message.prototype.numVisibleRows=function(){return 4;};
var convertText=Window_Base.prototype.convertEscapeCharacters;
Window_Base.prototype.convertEscapeCharacters=function(text){return convertText.call(this,text.replace(/\\s\[\d+\]/gi,'').replace(/\\c\[(\d+)\]/gi,function(_,n){return '\\C['+Math.min(31,Number(n))+']';}));};
// Fit the original 20x15 map area and keep old character scale.
var ready=Scene_Boot.prototype.start;Scene_Boot.prototype.start=function(){ready.call(this);addControls();};
function addControls(){if(document.getElementById('bebi-controls'))return;
 var style=document.createElement('style');style.textContent='#bebi-controls{position:fixed;inset:0;pointer-events:none;z-index:99;touch-action:none}#bebi-controls button{pointer-events:auto;position:absolute;width:52px;height:48px;border:1px solid #ffffff70;border-radius:12px;background:#102637b0;color:white;font:bold 19px sans-serif;touch-action:none;user-select:none}#bebi-controls button:active{background:#5aa0bbb0}';document.head.appendChild(style);
 var wrap=document.createElement('div');wrap.id='bebi-controls';document.body.appendChild(wrap);
 function key(label,k,pos){var b=document.createElement('button');b.textContent=label;Object.assign(b.style,pos);['touchstart','touchmove','touchend','touchcancel'].forEach(function(evt){b.addEventListener(evt,function(e){e.preventDefault();e.stopPropagation();if(!window.PointerEvent)Input._currentState[k]=(evt==='touchstart'||evt==='touchmove');},{passive:false});});b.addEventListener('pointerdown',function(e){e.preventDefault();e.stopPropagation();Input._currentState[k]=true;b.setPointerCapture(e.pointerId);});['pointerup','pointercancel','lostpointercapture'].forEach(function(evt){b.addEventListener(evt,function(){Input._currentState[k]=false;});});wrap.appendChild(b);}
 key('▲','up',{left:'64px',bottom:'112px'});key('◀','left',{left:'8px',bottom:'60px'});key('▶','right',{left:'120px',bottom:'60px'});key('▼','down',{left:'64px',bottom:'8px'});key('決定','ok',{right:'12px',bottom:'60px'});key('戻る','escape',{right:'72px',bottom:'8px'});key('メニュー','menu',{right:'12px',top:'12px',width:'94px'});
 window.addEventListener('blur',function(){Input.clear();});
}
window.bebiPause=function(){BebiCompat.pausedBgm=AudioManager.saveBgm();AudioManager.stopAll();Input.clear();};window.bebiResume=function(){if(BebiCompat.pausedBgm){AudioManager.replayBgm(BebiCompat.pausedBgm);BebiCompat.pausedBgm=null;}};
})();

if(typeof Scene_Gameover!=="undefined")Scene_Gameover.prototype.createBackground=function(){this._backSprite=new Sprite();this._backSprite.bitmap=ImageManager.loadSystem("BebiGameOver");this.addChild(this._backSprite);};
