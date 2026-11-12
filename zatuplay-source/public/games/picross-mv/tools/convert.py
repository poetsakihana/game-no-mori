from parse import *
import json,collections,struct,shutil
from event_commands import cmds
out=Path('mv');(out/'data').mkdir(parents=True,exist_ok=True);(out/'js/plugins').mkdir(parents=True,exist_ok=True);(out/'migration').mkdir(exist_ok=True)
puzzles=[];archive=[];excluded=[]
for old in (out/'data').glob('Map[0-9][0-9][0-9].json'):old.unlink()
for f in sorted(Path('source/ピクロス').glob('*.lmu')):
 _,d=root(f);es=Reader(d.get(81,b'\0')).array();cells=[];events=[]
 for ei,e in es.items():
  ps=Reader(e.get(5,b'\0')).array();pages=[]
  for pi,p in ps.items():pages.append(dict(id=pi,condition={str(k):num(v) for k,v in Reader(p.get(2,b'')).chunks().items()},graphic=text(p.get(21,b'')),commands=cmds(p.get(52,b''))))
  events.append(dict(id=ei,x=num(e.get(2)),y=num(e.get(3)),name=text(e.get(1,b'')),pages=pages))
  cs=pages[0]['commands'] if pages else []
  good=any(c==10220 and len(p)>5 and p[0:6]==[0,1,1,1,0,1] for c,i,s,p in cs)
  bad=any(c==10220 and len(p)>5 and p[0:6]==[0,2,2,2,0,1] for c,i,s,p in cs)
  if good or bad:cells.append((num(e.get(2)),num(e.get(3)),int(good)))
 mid=int(f.stem[3:]);archive.append(dict(id=mid,width=num(d.get(2),20),height=num(d.get(3),15),events=events))
 if not cells:continue
 # Only a completely covered square is a playable puzzle. Remove no cells silently.
 xs=sorted(set(x for x,y,v in cells));ys=sorted(set(y for x,y,v in cells));coords={(x,y):v for x,y,v in cells}
 if len(xs)*len(ys)!=len(cells):
  # Map30 contains an additional event outside the 10x10 board; preserve it in archive/report.
  candidates=[]
  for n in range(5,36):
   for a in xs:
    for b in ys:
     if all((a+x,b+y) in coords for y in range(n) for x in range(n)):candidates.append((n,a,b))
  if not candidates:excluded.append(mid);continue
  n,a,b=max(candidates);xs=list(range(a,a+n));ys=list(range(b,b+n));excluded.append({'map':mid,'outsideBoard':len(cells)-n*n})
 grid=[[coords[x,y] for x in xs] for y in ys]
 if not sum(map(sum,grid)):
  excluded.append({'map':mid,'reason':'no filled cells inside board; only scoring event is outside board'});continue
 puzzles.append(dict(id=mid,name=f'原作マップ {mid:03}',width=len(xs),height=len(ys),grid=grid,source=f.name,origin=[min(xs),min(ys)]))
(out/'migration/original-events.json').write_text(json.dumps(archive,ensure_ascii=False),encoding='utf-8')
(out/'js/puzzles.js').write_text('window.PICROSS_DATA='+json.dumps(puzzles,ensure_ascii=False)+';',encoding='utf-8')
# MV-native map files: one event per source cell, original positions scaled into board coordinates.
infos=[None]
for i,q in enumerate(puzzles,1):
 w=max(17,q['width']+2);h=max(13,q['height']+2);ev=[None]
 for y,row in enumerate(q['grid']):
  for x,v in enumerate(row):
   ei=len(ev);ev.append(dict(id=ei,name=f'Cell_{x}_{y}',note=f'<answer:{v}>',x=x+1,y=y+1,pages=[dict(conditions=dict(actorId=1,actorValid=False,itemId=1,itemValid=False,selfSwitchCh='A',selfSwitchValid=False,switch1Id=1,switch1Valid=False,switch2Id=1,switch2Valid=False,variableId=1,variableValid=False,variableValue=0),directionFix=True,image=dict(characterIndex=0,characterName='',direction=2,pattern=1,tileId=0),list=[dict(code=108,indent=0,parameters=[f'2003 Map{q["id"]:04} ({x+q["origin"][0]},{y+q["origin"][1]}) Answer={v}; gameplay: PicrossPort plugin']),dict(code=0,indent=0,parameters=[])],moveFrequency=3,moveRoute=dict(list=[dict(code=0,parameters=[])],repeat=True,skippable=False,wait=False),moveSpeed=3,moveType=0,priorityType=0,stepAnime=False,through=True,trigger=0,walkAnime=False)]))
 m=dict(autoplayBgm=False,autoplayBgs=False,battleback1Name='',battleback2Name='',bgm=dict(name='',pan=0,pitch=100,volume=90),bgs=dict(name='',pan=0,pitch=100,volume=90),disableDashing=False,displayName=q['name'],encounterList=[],encounterStep=30,height=h,width=w,note=f'<PicrossSourceMap:{q["id"]}>',parallaxLoopX=False,parallaxLoopY=False,parallaxName='',parallaxShow=False,parallaxSx=0,parallaxSy=0,scrollType=0,specifyBattleback=False,tilesetId=1,data=[0]*(w*h*6),events=ev)
 (out/f'data/Map{i:03}.json').write_text(json.dumps(m,ensure_ascii=False))
 infos.append(dict(id=i,expanded=False,name=q['name'],order=i,parentId=0,scrollX=0,scrollY=0))
(out/'data/MapInfos.json').write_text(json.dumps(infos,ensure_ascii=False))
(out/'Game.rpgproject').write_text('RPGMV 1.6.2')
for n in ['Actors','Classes','Skills','Items','Weapons','Armors','Enemies','Troops','States','Animations','CommonEvents']: (out/f'data/{n}.json').write_text('[null]')
(out/'data/Tilesets.json').write_text(json.dumps([None,dict(id=1,flags=[0]*8192,mode=0,name='盤面・イベントデータ',note='',tilesetNames=['']*9)]))
system=dict(gameTitle='ピクロス MV移植試作',versionId=1,locale='ja_JP',currencyUnit='G',switches=['']*301,variables=['']*101,partyMembers=[],startMapId=1,startX=0,startY=0,boat=dict(characterName='',characterIndex=0,startMapId=0,startX=0,startY=0),ship=dict(characterName='',characterIndex=0,startMapId=0,startX=0,startY=0),airship=dict(characterName='',characterIndex=0,startMapId=0,startX=0,startY=0),windowTone=[0,0,0,0],sounds=[dict(name='',volume=0,pitch=100,pan=0)]*24,terms=dict(basic=['']*10,params=['']*10,commands=['']*30,messages={}),elements=[''],skillTypes=[''],weaponTypes=[''],armorTypes=[''],equipTypes=[''],optSideView=False,optTransparent=True,optFollowers=False,optDisplayTp=False,optDrawTitle=True,optExtraExp=False,optFloorDeath=False,optSlipDeath=False,optUseNuPlayer=False,title1Name='',title2Name='',titleBgm=dict(name='',volume=0,pitch=100,pan=0),battleBgm=dict(name='',volume=0,pitch=100,pan=0),victoryMe=dict(name='',volume=0,pitch=100,pan=0),defeatMe=dict(name='',volume=0,pitch=100,pan=0),gameoverMe=dict(name='',volume=0,pitch=100,pan=0),battleback1Name='',battleback2Name='',battlerName='',battlerHue=0,testBattlers=[],testTroopId=1,magicSkills=[],attackMotions=[],menuCommands=[False]*6)
(out/'data/System.json').write_text(json.dumps(system,ensure_ascii=False))
report=dict(status='partial-port',sourceMapCount=len(archive),playableBoardCount=len(puzzles),exceptions=excluded,unported=['原作のマップ移動・会話・解放条件','画像重ね合わせ型の後半問題','タイムアタック専用イベント','元のBGM・効果音・演出','2003セーブデータ'])
(out/'migration/report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(report)
