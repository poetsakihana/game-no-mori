/* SakuraProgression: an offline, earned-ticket-only progression model.
 * State is plain JSON. create() is for a NEW game only; normalize(raw, options)
 * repairs a save without awarding starter currency. Pass {unlockRanka:true} only
 * after the host has verified its legacy recruitment flag. Operations mutate only
 * on success and return {ok:true,...} or {ok:false, reason:string}.
 * Draws cost one earned ticket; rates are independently rolled by rarity, then
 * uniformly among items in the chosen pool. No purchase or real-money path exists.
 */
(function (root) {
  'use strict';
  const RARITY_RATES = Object.freeze({N: 0.70, R: 0.22, SR: 0.07, SSR: 0.01});
  const DUPLICATE_MATERIALS = Object.freeze({N: 2, R: 5, SR: 12, SSR: 30});
  const RARITIES = Object.freeze(['N', 'R', 'SR', 'SSR']);
  const MONTHLY_IDS=Object.freeze(Array.from({length:15},(_,i)=>'limited_'+String(i+1).padStart(2,'0')));
  const BASE_ROSTER = Object.freeze({
    sakura: Object.freeze({id:'sakura', name:'咲華', rarity:'N', bonus:Object.freeze({attack:0, maxHp:0, defense:0})}),
    ranka: Object.freeze({id:'ranka', name:'ランカー', rarity:'R', bonus:Object.freeze({attack:3, maxHp:6, defense:0})}),
    fukki: Object.freeze({id:'fukki', name:'ふっきー', rarity:'SR', bonus:Object.freeze({attack:1, maxHp:18, defense:2})}),
    wanchoka: Object.freeze({id:'wanchoka', name:'わんちょか', rarity:'SSR', bonus:Object.freeze({attack:5, maxHp:8, defense:1})}),
    kagura: Object.freeze({id:'kagura', name:'星守カグラ', rarity:'SSR', bonus:Object.freeze({attack:8, maxHp:16, defense:2})}),
    shiratori: Object.freeze({id:'shiratori', name:'シラトリ', rarity:'SSR', bonus:Object.freeze({attack:6, maxHp:14, defense:2})})
  });
  // Stable prototype roster: unique IDs/names, with deliberately shared art and skill system.
  const RECRUIT_FAMILY=Object.freeze(['桜庭','花守','月城','星野','風間','水瀬','白雪','朝霧','夕凪','青葉','紅葉','雪村','日向','雨宮','天野','森川','藤咲','羽鳥','七瀬','光野']);
  const RECRUIT_GIVEN=Object.freeze(['あかり','ひかり','さくら','つむぎ','こはる','すみれ','あおい','ゆず','みお','りん']);
  const RECRUITS=Object.freeze(Object.fromEntries(Array.from({length:200},(_,i)=>{const id='recruit_'+String(i+1).padStart(3,'0'),rarity=RARITIES[Math.floor(i/50)],name=RECRUIT_FAMILY[Math.floor(i/10)]+' '+RECRUIT_GIVEN[i%10];return [id,Object.freeze({id,name,rarity,gachaOnly:true,bonus:Object.freeze({attack:1+i%3,maxHp:4+(i%4)*2,defense:i%2})})];})));
  const ROSTER=Object.freeze({...BASE_ROSTER,...RECRUITS});
  const WEAPONS = Object.freeze({
    wooden_blade: Object.freeze({id:'wooden_blade', name:'木の杖', rarity:'N', attack:2}),
    sakura_blade: Object.freeze({id:'sakura_blade', name:'桜の杖', rarity:'R', attack:5}),
    moon_blade: Object.freeze({id:'moon_blade', name:'月影の杖', rarity:'SR', attack:8}),
    dawn_blade: Object.freeze({id:'dawn_blade', name:'暁の杖', rarity:'SSR', attack:12}),
    tower_dawn: Object.freeze({id:'tower_dawn', name:'白星の杖', rarity:'SR', attack:9}),
    tower_dusk: Object.freeze({id:'tower_dusk', name:'月塔の杖', rarity:'SSR', attack:13})
  });
  const CHARACTER_POOL = Object.freeze({N:Object.freeze(['sakura']), R:Object.freeze(['ranka']), SR:Object.freeze(['fukki']), SSR:Object.freeze(['wanchoka'])});
  const EXCLUSIVE_POOL=Object.freeze(Object.fromEntries(RARITIES.map((r,i)=>[r,Object.freeze(Array.from({length:50},(_,j)=>'recruit_'+String(i*50+j+1).padStart(3,'0')))]))); 
  const WEAPON_POOL = Object.freeze({N:Object.freeze(['wooden_blade']), R:Object.freeze(['sakura_blade']), SR:Object.freeze(['moon_blade']), SSR:Object.freeze(['dawn_blade'])});
  const LIMITED_POOL = Object.freeze({N:CHARACTER_POOL.N, R:CHARACTER_POOL.R, SR:CHARACTER_POOL.SR, SSR:Object.freeze(['wanchoka','kagura'])});
  const POOLS = Object.freeze({character:CHARACTER_POOL, weapon:WEAPON_POOL, limited:LIMITED_POOL, exclusive:EXCLUSIVE_POOL});
  // 2026-11-03 00:00:00 through 2026-12-03 23:59:59 JST, using offline device clock.
  const LIMITED_START = Date.parse('2026-11-03T00:00:00+09:00');
  const LIMITED_END = Date.parse('2026-12-04T00:00:00+09:00'); // exclusive
  function bannerStatus(now) { const t=now===undefined?Date.now():now; return !Number.isFinite(t)?'unavailable':t<LIMITED_START?'before':t<LIMITED_END?'active':'ended'; }
  // Explicit overall per-item probabilities, after uniform splitting within rarity.
  function itemRates(pool) {
    const rates = {};
    RARITIES.forEach(r => pool[r].forEach(id => { rates[id] = RARITY_RATES[r] / pool[r].length; }));
    return Object.freeze(rates);
  }
  const ITEM_RATES = Object.freeze({character:itemRates(CHARACTER_POOL), weapon:itemRates(WEAPON_POOL), limited:itemRates(LIMITED_POOL), exclusive:itemRates(EXCLUSIVE_POOL)});
  const CHARACTER_EXCHANGE_COSTS = Object.freeze({fukki:12, wanchoka:20, kagura:80});
  const MAX_MOD_RANK = 3, MAX_CHARACTER_LEVEL=20, EXCLUSIVE_EXCHANGE_COST=5;
  const MAX_LEVEL = 5, MAX_CURRENCY = 999999, MAX_KEYS = 5000;
  const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const isObj = x => !!x && typeof x === 'object' && !Array.isArray(x);
  const validCount = n => Number.isSafeInteger(n) && n >= 0 && n <= MAX_CURRENCY;
  const goodKey = s => typeof s === 'string' && s.length > 0 && s.length <= 120;
  const uniqueKnown = (a, catalog) => Array.isArray(a) && a.every(x => typeof x === 'string' && own(catalog, x)) && new Set(a).size === a.length;
  function create() {
    return {version:1, tickets:0, materials:0, characters:['sakura'], weapons:['wooden_blade'], levels:{wooden_blade:1}, party:['sakura'], equipped:'wooden_blade', claimedKeys:[], modRanks:{sakura:0}, selectedSkills:{sakura:'legacy-spark'}, characterCopies:{sakura:1}, characterLevels:{sakura:{level:1,xp:0}}, towerMonths:{}, towerStages:{}, towerStarted:{}, limitedTickets:{}, loginBonus:{lastClaimDay:null,cycleDay:0}, exclusivePoints:0};
  }
  function normalize(raw, options) {
    // Never grant new-game currency when a save is absent, corrupt or malformed.
    const r = isObj(raw) ? raw : {};
    const characters = ['sakura'];
    if (Array.isArray(r.characters)) r.characters.forEach(id => { if (typeof id === 'string' && own(ROSTER,id) && !characters.includes(id)) characters.push(id); });
    if (isObj(options) && options.unlockRanka === true && !characters.includes('ranka')) characters.push('ranka');
    const weapons = ['wooden_blade'];
    if (Array.isArray(r.weapons)) r.weapons.forEach(id => { if (typeof id === 'string' && own(WEAPONS,id) && !weapons.includes(id)) weapons.push(id); });
    const levels = {};
    weapons.forEach(id => { const n = isObj(r.levels) && own(r.levels,id) ? r.levels[id] : 1; levels[id] = Number.isSafeInteger(n) && n >= 1 && n <= MAX_LEVEL ? n : 1; });
    const party = ['sakura'];
    if (Array.isArray(r.party)) r.party.forEach(id => { if (characters.includes(id) && !party.includes(id) && party.length < 4) party.push(id); });
    const claimedKeys = [];
    if (Array.isArray(r.claimedKeys)) r.claimedKeys.forEach(k => { if (goodKey(k) && !claimedKeys.includes(k) && claimedKeys.length < MAX_KEYS) claimedKeys.push(k); });
    const modRanks={}, selectedSkills={}, characterCopies={}, characterLevels={};
    characters.forEach(id=>{const n=isObj(r.modRanks)&&own(r.modRanks,id)?r.modRanks[id]:0;modRanks[id]=Number.isInteger(n)&&n>=0&&n<=MAX_MOD_RANK?n:0;const selected=isObj(r.selectedSkills)?r.selectedSkills[id]:null;selectedSkills[id]=isKnownSkill(id,selected)?selected:defaultSkill(id,modRanks[id]);const copies=isObj(r.characterCopies)?r.characterCopies[id]:null;characterCopies[id]=Number.isSafeInteger(copies)&&copies>=1&&copies<=MAX_CURRENCY?copies:1;const lev=isObj(r.characterLevels)?r.characterLevels[id]:null;characterLevels[id]=validCharacterLevel(lev)?{level:lev.level,xp:lev.xp}:{level:1,xp:0};});
    const towerMonths={};if(isObj(r.towerMonths))Object.keys(r.towerMonths).forEach(k=>{if(validMonth(k)&&Number.isInteger(r.towerMonths[k])&&r.towerMonths[k]>=0&&r.towerMonths[k]<=40)towerMonths[k]=r.towerMonths[k];});
    const towerStages={};Object.keys(towerMonths).forEach(k=>{towerStages[k]=towerMonths[k]*5;});if(isObj(r.towerStages))Object.keys(r.towerStages).forEach(k=>{if(validMonth(k)&&Number.isInteger(r.towerStages[k])&&r.towerStages[k]>=0&&r.towerStages[k]<=200&&Math.floor(r.towerStages[k]/5)===(towerMonths[k]||0))towerStages[k]=r.towerStages[k];});
    const towerStarted=isObj(r.towerStarted)?{...r.towerStarted}:{};const limitedTickets={};if(isObj(r.limitedTickets))MONTHLY_IDS.forEach(id=>{if(validCount(r.limitedTickets[id]))limitedTickets[id]=r.limitedTickets[id];});const loginBonus=isObj(r.loginBonus)?{...r.loginBonus}:{lastClaimDay:null,cycleDay:0};
    return {...r, version:1, exclusivePoints:validCount(r.exclusivePoints)?r.exclusivePoints:0, modRanks, selectedSkills, characterCopies, characterLevels, towerMonths, towerStages, towerStarted, limitedTickets, loginBonus, tickets:validCount(r.tickets) ? r.tickets : 0, materials:validCount(r.materials) ? r.materials : 0,
      characters, weapons, levels, party, equipped:weapons.includes(r.equipped) ? r.equipped : 'wooden_blade', claimedKeys};
  }
  const ALL_SKILL_IDS=Object.freeze(Array.from({length:100},(_,i)=>'skill-'+String(i+1).padStart(3,'0')));
  function skillIds(id,rank,clearedStages,level) {if(!own(ROSTER,id))return [];const clears=Number.isInteger(clearedStages)?Math.max(0,Math.min(100,clearedStages)):0,lv=Number.isInteger(level)?Math.max(1,Math.min(MAX_CHARACTER_LEVEL,level)):1;const limit=own(RECRUITS,id)?6+5*(lv-1):Math.max(6+clears,6+5*(lv-1));return ALL_SKILL_IDS.slice(0,Math.min(100,limit));}
  function isKnownSkill(id,skill) {return (id==='sakura'&&skill==='legacy-spark')||ALL_SKILL_IDS.includes(skill);}
  const SKILL_START=Object.freeze({sakura:2,ranka:1,fukki:3,wanchoka:4,kagura:2,shiratori:5});
  function defaultSkill(id,rank) {if(id==='sakura')return 'legacy-spark';if(own(SKILL_START,id))return ALL_SKILL_IDS[(SKILL_START[id]+Math.max(0,Math.min(3,Number.isInteger(rank)?rank:0)))%6];return own(RECRUITS,id)?ALL_SKILL_IDS[(Number(id.slice(-3))-1)%6]:null;}
  function validCharacterLevel(v){return isObj(v)&&Number.isInteger(v.level)&&v.level>=1&&v.level<=MAX_CHARACTER_LEVEL&&Number.isSafeInteger(v.xp)&&v.xp>=0&&(v.level===MAX_CHARACTER_LEVEL?v.xp===0:v.xp<v.level*20);}
  function characterLevel(s,id){if(!valid(s)||!s.characters.includes(id))return fail('invalid_character');const v=isObj(s.characterLevels)&&own(s.characterLevels,id)?s.characterLevels[id]:{level:1,xp:0};return {ok:true,level:v.level,xp:v.xp,nextXp:v.level===MAX_CHARACTER_LEVEL?null:v.level*20};}
  function levelOf(s,id){return isObj(s.characterLevels)&&validCharacterLevel(s.characterLevels[id])?s.characterLevels[id].level:1;}
  function rankOf(s,id) {return isObj(s.modRanks)&&Number.isInteger(s.modRanks[id])?s.modRanks[id]:0;}
  function selectedOf(s,id,clearedStages) {const rank=rankOf(s,id), selected=isObj(s.selectedSkills)?s.selectedSkills[id]:null;return ((id==='sakura'&&selected==='legacy-spark')||skillIds(id,rank,clearedStages,levelOf(s,id)).includes(selected))?selected:defaultSkill(id,rank);}
  function ensureCharacterMaps(s) {if(!isObj(s.modRanks))s.modRanks={};if(!isObj(s.selectedSkills))s.selectedSkills={};if(!isObj(s.characterCopies))s.characterCopies={};if(!isObj(s.characterLevels))s.characterLevels={};s.characters.forEach(id=>{if(!own(s.modRanks,id))s.modRanks[id]=0;if(!own(s.selectedSkills,id))s.selectedSkills[id]=defaultSkill(id,s.modRanks[id]);if(!own(s.characterCopies,id))s.characterCopies[id]=1;if(!own(s.characterLevels,id))s.characterLevels[id]={level:1,xp:0};});}
  function valid(s) {
    return isObj(s) && s.version === 1 && validCount(s.tickets) && validCount(s.materials) &&
      uniqueKnown(s.characters, ROSTER) && s.characters.includes('sakura') &&
      (s.exclusivePoints===undefined||validCount(s.exclusivePoints)) &&
      (s.limitedTickets===undefined||(isObj(s.limitedTickets)&&Object.keys(s.limitedTickets).every(id=>MONTHLY_IDS.includes(id)&&validCount(s.limitedTickets[id])))) &&
      (s.loginBonus===undefined||(isObj(s.loginBonus)&&Number.isInteger(s.loginBonus.cycleDay)&&s.loginBonus.cycleDay>=0&&s.loginBonus.cycleDay<=10&&((s.loginBonus.cycleDay===0&&s.loginBonus.lastClaimDay===null)||(s.loginBonus.cycleDay>=1&&validDay(s.loginBonus.lastClaimDay))))) &&
      (s.towerMonths===undefined || (isObj(s.towerMonths)&&Object.keys(s.towerMonths).length<=5000&&Object.keys(s.towerMonths).every(k=>validMonth(k)&&Number.isInteger(s.towerMonths[k])&&s.towerMonths[k]>=0&&s.towerMonths[k]<=40))) &&
      (s.towerStages===undefined||(isObj(s.towerStages)&&Object.keys(s.towerStages).length<=5000&&Object.keys(s.towerStages).every(k=>validMonth(k)&&Number.isInteger(s.towerStages[k])&&s.towerStages[k]>=0&&s.towerStages[k]<=200&&Math.floor(s.towerStages[k]/5)===(isObj(s.towerMonths)&&own(s.towerMonths,k)?s.towerMonths[k]:0)))) &&
      (s.towerStarted===undefined||(isObj(s.towerStarted)&&Object.keys(s.towerStarted).length<=5000&&Object.keys(s.towerStarted).every(k=>validMonth(k)&&towerStartMatches(k,s.towerStarted[k])))) &&
      (s.characterLevels===undefined||(isObj(s.characterLevels)&&Object.keys(s.characterLevels).every(id=>s.characters.includes(id)&&validCharacterLevel(s.characterLevels[id])))) &&
      (s.modRanks===undefined || (isObj(s.modRanks) && Object.keys(s.modRanks).every(id=>s.characters.includes(id)&&Number.isInteger(s.modRanks[id])&&s.modRanks[id]>=0&&s.modRanks[id]<=MAX_MOD_RANK))) &&
      (s.characterCopies===undefined || (isObj(s.characterCopies) && Object.keys(s.characterCopies).every(id=>s.characters.includes(id)&&Number.isSafeInteger(s.characterCopies[id])&&s.characterCopies[id]>=1&&s.characterCopies[id]<=MAX_CURRENCY))) &&
      (s.selectedSkills===undefined || (isObj(s.selectedSkills) && Object.keys(s.selectedSkills).every(id=>s.characters.includes(id)&&isKnownSkill(id,s.selectedSkills[id])))) &&
      uniqueKnown(s.weapons, WEAPONS) && s.weapons.includes('wooden_blade') && isObj(s.levels) &&
      Object.keys(s.levels).length === s.weapons.length && s.weapons.every(id => own(s.levels,id) && Number.isSafeInteger(s.levels[id]) && s.levels[id] >= 1 && s.levels[id] <= MAX_LEVEL) &&
      uniqueKnown(s.party, ROSTER) && s.party.length >= 1 && s.party.length <= 4 && s.party[0] === 'sakura' && s.party.every(id => s.characters.includes(id)) &&
      typeof s.equipped === 'string' && s.weapons.includes(s.equipped) && Array.isArray(s.claimedKeys) && s.claimedKeys.length <= MAX_KEYS && s.claimedKeys.every(goodKey) && new Set(s.claimedKeys).size === s.claimedKeys.length;
  }
  const fail = reason => ({ok:false, reason});
  function performDraw(s, kind, randomFn, now) {
    if (!valid(s)) return fail('invalid_state');
    const tagged=typeof kind==='string'&&/^monthly:(limited_\d{2})$/.exec(kind);const expectedBanner=tagged?tagged[1]:null;if(tagged)kind='monthly';
    if (!own(POOLS,kind)&&kind!=='monthly') return fail('invalid_kind');
    const monthly=kind==='monthly'?monthlyBanner(now):null;if(kind==='monthly'&&!monthly.ok)return fail('invalid_time');if(expectedBanner&&monthly.id!==expectedBanner)return fail('banner_changed');
    if (kind==='limited' && bannerStatus(now)!=='active') return fail('banner_unavailable');
    if (kind==='monthly' ? (!isObj(s.limitedTickets)||!validCount(s.limitedTickets[monthly.id])||s.limitedTickets[monthly.id]<1) : s.tickets<1) return fail('insufficient_tickets');
    const rng = randomFn === undefined ? Math.random : randomFn;
    if (typeof rng !== 'function') return fail('invalid_random');
    let a,b;
    try { a=rng(); b=rng(); } catch (_) { return fail('invalid_random'); }
    if (typeof a !== 'number' || !Number.isFinite(a) || a < 0 || a >= 1 || typeof b !== 'number' || !Number.isFinite(b) || b < 0 || b >= 1) return fail('invalid_random');
    const rarity = a < 0.70 ? 'N' : a < 0.92 ? 'R' : a < 0.99 ? 'SR' : 'SSR';
    const pool = (kind==='monthly'?LIMITED_POOL:POOLS[kind])[rarity];
    if (!Array.isArray(pool) || pool.length === 0) return fail('unavailable_rarity');
    const id = kind==='monthly'&&rarity==='SSR'?(b<monthly.kaguraWeight/16?'kagura':'wanchoka'):pool[Math.floor(b * pool.length)];
    const isCharacter=kind==='character'||kind==='limited'||kind==='monthly'||kind==='exclusive';
    const catalog = isCharacter ? ROSTER : WEAPONS;
    const owned = isCharacter ? s.characters : s.weapons;
    if (!own(catalog,id)) return fail('invalid_pool');
    const duplicate = owned.includes(id);
    const copiesBefore=isCharacter&&duplicate?(isObj(s.characterCopies)&&own(s.characterCopies,id)?s.characterCopies[id]:1):0;
    if(isCharacter&&duplicate&&copiesBefore>=MAX_CURRENCY)return fail('copy_limit');
    const rankBefore=isCharacter&&duplicate?rankOf(s,id):0;
    const rankUp=isCharacter&&duplicate&&rankBefore<MAX_MOD_RANK;
    const conversion = duplicate && !rankUp ? DUPLICATE_MATERIALS[rarity] : 0;
    if (s.materials + conversion > MAX_CURRENCY) return fail('currency_limit');
    const currentPoints=s.exclusivePoints===undefined?0:s.exclusivePoints;if(kind==='exclusive'&&currentPoints>=MAX_CURRENCY)return fail('points_limit');
    if(kind==='monthly')s.limitedTickets[monthly.id]-=1;else s.tickets-=1;
    if(isCharacter&&duplicate){ensureCharacterMaps(s);s.characterCopies[id]=copiesBefore+1;}
    if (duplicate) { if(rankUp){ensureCharacterMaps(s);s.modRanks[id]=rankBefore+1;} else s.materials += conversion; }
    else { owned.push(id); if (!isCharacter) s.levels[id] = 1; else ensureCharacterMaps(s); }
    if(kind==='exclusive')s.exclusivePoints=currentPoints+1;
    const result={ok:true, kind, rarity, item:catalog[id], duplicate, rankUp, modRank:isCharacter?rankOf(s,id):undefined, duplicateMaterials:conversion, exclusivePoints:kind==='exclusive'?s.exclusivePoints:undefined};
    s.lastDraw={kind,rarity,id,duplicate,rankUp,modRank:isCharacter?rankOf(s,id):null,duplicateMaterials:conversion,bannerId:monthly?monthly.id:null};
    return result;
  }
  const LUCK_MAX=99;
  function luck(s,id) {
    if(!valid(s)||!s.characters.includes(id))return fail('invalid_character');
    const total=isObj(s.characterCopies)&&own(s.characterCopies,id)?s.characterCopies[id]:1;
    const count=Math.min(LUCK_MAX,total);return {ok:true,id,count,max:LUCK_MAX,isMax:count===LUCK_MAX,total};
  }
  // Rewards never alter modification rank. Overflow beyond Luck 99 converts
  // to materials; every acquired copy remains in the cumulative ledger.
  function grantCharacterCopies(s,id,count,key) {
    if(!valid(s))return fail('invalid_state');
    if(!own(ROSTER,id))return fail('invalid_character');
    if(own(RECRUITS,id))return fail('gacha_only');
    if(!Number.isSafeInteger(count)||count<1||count>5)return fail('invalid_amount');
    if(!goodKey(key))return fail('invalid_key');
    if(s.claimedKeys.includes(key))return fail('already_claimed');
    if(s.claimedKeys.length>=MAX_KEYS)return fail('key_limit');
    const owned=s.characters.includes(id),before=owned?(isObj(s.characterCopies)&&own(s.characterCopies,id)?s.characterCopies[id]:1):0;
    if(before+count>MAX_CURRENCY)return fail('copy_limit');
    const overflow=Math.max(0,before+count-LUCK_MAX)-Math.max(0,before-LUCK_MAX);
    const materials=overflow*DUPLICATE_MATERIALS[ROSTER[id].rarity];
    if(s.materials+materials>MAX_CURRENCY)return fail('currency_limit');
    if(!owned)s.characters.push(id);ensureCharacterMaps(s);s.characterCopies[id]=before+count;
    s.materials+=materials;s.claimedKeys.push(key);
    return {ok:true,id,count,acquired:!owned,luck:Math.min(LUCK_MAX,before+count),overflow,materials,claimKey:key};
  }
  function validMonth(v){return typeof v==='string'&&/^(?!0000)\d{4}-(?:0[1-9]|1[0-2])$/.test(v);}
  function jstParts(now){const n=now===undefined?Date.now():now;if(!Number.isSafeInteger(n))return null;const d=new Date(n+9*60*60*1000);if(!Number.isFinite(d.getTime()))return null;const y=d.getUTCFullYear(),m=d.getUTCMonth()+1;if(y<1||y>9998)return null;const month=String(y).padStart(4,'0')+'-'+String(m).padStart(2,'0');return validMonth(month)?{month,day:d.getUTCDate(),date:month+'-'+String(d.getUTCDate()).padStart(2,'0'),year:y,monthNumber:m}:null;}
  function validDay(v){if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;const t=Date.parse(v+'T00:00:00Z');return Number.isFinite(t)&&new Date(t).toISOString().slice(0,10)===v;}
  function towerStartMatches(month,t){if(!Number.isSafeInteger(t))return false;const d=jstParts(t);return !!d&&d.month===month&&d.day>=15&&d.day<=20;}
  function monthlyBanner(now){const d=jstParts(now);if(!d)return fail('invalid_time');const offset=(d.year-2026)*12+(d.monthNumber-11),i=((offset%15)+15)%15,weight=i+1;return {ok:true,month:d.month,id:MONTHLY_IDS[i],index:i+1,name:'月巡り '+String(i+1).padStart(2,'0'),kaguraWeight:weight,rates:{sakura:.70,ranka:.22,fukki:.07,kagura:.01*weight/16,wanchoka:.01*(16-weight)/16}};}
  function loginStatus(s,now){if(!valid(s))return fail('invalid_state');const timestamp=now===undefined?Date.now():now;const d=jstParts(timestamp);if(!d)return fail('invalid_time');const b=isObj(s.loginBonus)?s.loginBonus:{lastClaimDay:null,cycleDay:0},last=b.lastClaimDay;return {ok:true,date:d.date,cycleDay:b.cycleDay,nextDay:b.cycleDay%10+1,canClaim:!last||d.date>last,clockRollback:!!last&&d.date<last,banner:monthlyBanner(timestamp)};}
  function claimDailyLogin(s,now,expectedDate){const status=loginStatus(s,now);if(!status.ok)return status;if(expectedDate!==undefined&&(!validDay(expectedDate)||expectedDate!==status.date))return fail('day_changed');if(!status.canClaim)return fail(status.clockRollback?'clock_rollback':'already_claimed');const day=status.nextDay,id=status.banner.id;if(day===10){const n=isObj(s.limitedTickets)&&own(s.limitedTickets,id)?s.limitedTickets[id]:0;if(n>=MAX_CURRENCY)return fail('currency_limit');if(!isObj(s.limitedTickets))s.limitedTickets={};s.limitedTickets[id]=n+1;}else{if(s.tickets>=MAX_CURRENCY)return fail('currency_limit');s.tickets++;}s.loginBonus={lastClaimDay:status.date,cycleDay:day};return {ok:true,day,currency:day===10?'limitedTickets':'tickets',bannerId:day===10?id:null,date:status.date};}
  function towerStatus(s,now){
    if(!valid(s))return fail('invalid_state');const d=jstParts(now);if(!d)return fail('invalid_time');
    const floors=isObj(s.towerMonths)?s.towerMonths:{},stages=isObj(s.towerStages)?s.towerStages:{},started=isObj(s.towerStarted)?s.towerStarted:{};
    const cleared=own(floors,d.month)?floors[d.month]:0,score=own(stages,d.month)?stages[d.month]:cleared*5,active=d.day>=15&&d.day<=20,stamp=own(started,d.month)?started[d.month]:null;
    return {ok:true,month:d.month,day:d.day,active,cleared,segmentCleared:score,nextFloor:score<200?Math.floor(score/5)+1:null,nextStage:score<200?score%5+1:null,floorStartedAt:stamp,stageStartedAt:stamp,canStart:score<200&&active};
  }
  function beginTowerStage(s,month,floor,stage,now){
    const timestamp=now===undefined?Date.now():now,st=towerStatus(s,timestamp);if(!st.ok)return st;
    if(st.month!==month||floor!==st.nextFloor||stage!==st.nextStage)return fail('floor_locked');
    if(!st.active)return fail('tower_unavailable');
    if(!own(isObj(s.towerStarted)?s.towerStarted:{},month)&&isObj(s.towerStarted)&&Object.keys(s.towerStarted).length>=5000)return fail('key_limit');
    if(!own(isObj(s.towerStages)?s.towerStages:{},month)&&isObj(s.towerStages)&&Object.keys(s.towerStages).length>=5000)return fail('key_limit');
    if(!own(isObj(s.towerMonths)?s.towerMonths:{},month)&&isObj(s.towerMonths)&&Object.keys(s.towerMonths).length>=5000)return fail('key_limit');
    if(!isObj(s.towerStarted))s.towerStarted={};s.towerStarted[month]=timestamp;
    return {ok:true,month,floor,stage,startedAt:timestamp};
  }
  function beginTowerFloor(s,month,floor,now){const st=towerStatus(s,now);if(!st.ok)return st;return beginTowerStage(s,month,floor,st.nextStage,now);}
  function completeTowerFloor(s,month,floor,startedAt){
    if(!valid(s))return fail('invalid_state');if(!Number.isSafeInteger(startedAt))return fail('invalid_time');const date=jstParts(startedAt);
    if(!date||date.month!==month||date.day<15||date.day>20)return fail('tower_unavailable');
    if(!Number.isInteger(floor)||floor<1||floor>40)return fail('invalid_floor');
    const months=isObj(s.towerMonths)?s.towerMonths:{},cleared=own(months,month)?months[month]:0;
    if(floor<=cleared)return fail('already_claimed');if(floor!==cleared+1)return fail('floor_locked');
    if(!own(months,month)&&Object.keys(months).length>=5000)return fail('key_limit');
    const weaponId=floor===5?'tower_dawn':floor===25?'tower_dusk':null;
    const duplicate=weaponId&&s.weapons.includes(weaponId),materials=duplicate?DUPLICATE_MATERIALS[WEAPONS[weaponId].rarity]:0;
    const tickets=(floor===15||floor===35)?10:0;
    if(s.materials+materials>MAX_CURRENCY||s.tickets+tickets>MAX_CURRENCY)return fail('currency_limit');
    let character=null;if(floor===40){character=grantCharacterCopies(s,'shiratori',5,`tower:${month}:40`);if(!character.ok)return character;}
    if(weaponId&&!duplicate){s.weapons.push(weaponId);s.levels[weaponId]=1;}s.materials+=materials;s.tickets+=tickets;
    if(!isObj(s.towerMonths))s.towerMonths={};s.towerMonths[month]=floor;
    return {ok:true,month,floor,weaponId,duplicateWeapon:!!duplicate,materials,tickets,character};
  }
  function completeTowerStage(s,month,floor,stage,startedAt){
    if(!valid(s))return fail('invalid_state');if(!towerStartMatches(month,startedAt))return fail('tower_unavailable');
    const floors=isObj(s.towerMonths)?s.towerMonths:{},stages=isObj(s.towerStages)?s.towerStages:{},cleared=own(floors,month)?floors[month]:0,score=own(stages,month)?stages[month]:cleared*5;
    if(!Number.isInteger(floor)||!Number.isInteger(stage)||floor<1||floor>40||stage<1||stage>5)return fail('invalid_floor');
    const expected=(floor-1)*5+stage;if(expected<=score)return fail('already_claimed');if(expected!==score+1)return fail('floor_locked');
    if(!isObj(s.towerStarted)||!own(s.towerStarted,month)||s.towerStarted[month]!==startedAt)return fail('tower_permit_missing');
    let award=null;if(stage===5){award=completeTowerFloor(s,month,floor,startedAt);if(!award.ok)return award;}
    if(!isObj(s.towerStages))s.towerStages={};s.towerStages[month]=expected;delete s.towerStarted[month];
    return {ok:true,month,floor,stage,floorComplete:stage===5,award,weaponId:award&&award.weaponId,tickets:award?award.tickets:0,materials:award?award.materials:0,character:award&&award.character,duplicateWeapon:!!(award&&award.duplicateWeapon)};
  }
  // Explicit fixed-cost exchange. Same duplicate rank/copy/material rules as
  // the exclusive draw; validate all capacities before changing any state.
  function exchangeExclusive(s,id){
    if(!valid(s))return fail('invalid_state');if(!own(RECRUITS,id))return fail('exchange_unavailable');
    const points=s.exclusivePoints===undefined?0:s.exclusivePoints;if(points<EXCLUSIVE_EXCHANGE_COST)return fail('insufficient_points');
    const item=ROSTER[id],duplicate=s.characters.includes(id),before=duplicate?(isObj(s.characterCopies)&&own(s.characterCopies,id)?s.characterCopies[id]:1):0;
    if(duplicate&&before>=MAX_CURRENCY)return fail('copy_limit');
    const rankBefore=duplicate?rankOf(s,id):0,rankUp=duplicate&&rankBefore<MAX_MOD_RANK,conversion=duplicate&&!rankUp?DUPLICATE_MATERIALS[item.rarity]:0;
    if(s.materials+conversion>MAX_CURRENCY)return fail('currency_limit');
    s.exclusivePoints=points-EXCLUSIVE_EXCHANGE_COST;
    if(!duplicate){s.characters.push(id);ensureCharacterMaps(s);}else{ensureCharacterMaps(s);s.characterCopies[id]=before+1;if(rankUp)s.modRanks[id]=rankBefore+1;else s.materials+=conversion;}
    return {ok:true,item,duplicate,rankUp,modRank:rankOf(s,id),duplicateMaterials:conversion,exclusivePoints:s.exclusivePoints,cost:EXCLUSIVE_EXCHANGE_COST};
  }
  function setParty(s, ids, options) {
    if (!valid(s)) return fail('invalid_state');
    const maxCompanions = options === undefined ? 3 : isObj(options) ? options.maxCompanions : undefined;
    if (maxCompanions !== 1 && maxCompanions !== 3) return fail('invalid_party_limit');
    if (!uniqueKnown(ids, ROSTER) || ids.length < 1 || ids.length > 1 + maxCompanions || ids[0] !== 'sakura' || !ids.every(id => s.characters.includes(id))) return fail('invalid_party');
    s.party = ids.slice(); return {ok:true, party:s.party.slice()};
  }
  function exchangeCharacter(s,id,now) {
    if (!valid(s)) return fail('invalid_state');
    if (typeof id !== 'string' || !own(CHARACTER_EXCHANGE_COSTS,id)) return fail('exchange_unavailable');
    if (s.characters.includes(id)) return fail('already_owned');
    if (id==='kagura' && bannerStatus(now)!=='active') return fail('banner_unavailable');
    const cost=CHARACTER_EXCHANGE_COSTS[id];
    if (s.materials<cost) return fail('insufficient_materials');
    s.materials-=cost;s.characters.push(id);ensureCharacterMaps(s);return {ok:true,id,cost};
  }
  function setSkill(s,id,skill,clearedStages) {
    if(!valid(s))return fail('invalid_state');
    if(!s.characters.includes(id)||!((id==='sakura'&&skill==='legacy-spark')||skillIds(id,rankOf(s,id),clearedStages,levelOf(s,id)).includes(skill)))return fail('skill_unavailable');
    ensureCharacterMaps(s);s.selectedSkills[id]=skill;return {ok:true, characterId:id, skillId:skill};
  }
  function abilities(s,id,clearedStages) {
    if(!valid(s)||!s.characters.includes(id))return fail('invalid_character');
    const rank=rankOf(s,id), skills=root.SakuraSkills;
    const orders=[['spike','beam','ring'],['beam','ring','spike'],['ring','spike','beam']];
    const antiTraps=own(RECRUITS,id)?orders[(Number(id.slice(-3))-1)%3].slice(0,rank):(skills&&typeof skills.antiTraps==='function'?skills.antiTraps(id,rank):[]);
    return {ok:true, rank, skill:selectedOf(s,id,clearedStages), antiTraps:Array.isArray(antiTraps)?antiTraps:[], attackBonus:rank};
  }
  function grantPartyXP(s,amount,key,participantIds){
    if(!valid(s))return fail('invalid_state');if(!Number.isSafeInteger(amount)||amount<1||amount>MAX_CURRENCY)return fail('invalid_amount');
    if(!goodKey(key))return fail('invalid_key');if(s.claimedKeys.includes(key))return fail('already_claimed');if(s.claimedKeys.length>=MAX_KEYS)return fail('key_limit');
    const ids=participantIds===undefined?s.party:participantIds;if(!uniqueKnown(ids,ROSTER)||ids.length<1||ids.length>4||!ids.every(id=>s.characters.includes(id)))return fail('invalid_party');
    const updated={};for(const id of ids){const old=isObj(s.characterLevels)&&own(s.characterLevels,id)?s.characterLevels[id]:{level:1,xp:0};let lv=old.level,xp=old.xp+amount;while(lv<MAX_CHARACTER_LEVEL&&xp>=lv*20){xp-=lv*20;lv++;}if(lv===MAX_CHARACTER_LEVEL)xp=0;updated[id]={level:lv,xp};}
    ensureCharacterMaps(s);Object.keys(updated).forEach(id=>{s.characterLevels[id]=updated[id];});s.claimedKeys.push(key);return {ok:true,amount,levels:updated,claimKey:key};
  }
  function discardMaterials(s, amount) {
    if (!valid(s)) return fail('invalid_state');
    if (amount !== 50) return fail('invalid_amount');
    if (s.materials < 50) return fail('insufficient_materials');
    s.materials -= 50; return {ok:true, amount:50, balance:s.materials};
  }
  function equip(s, id) {
    if (!valid(s)) return fail('invalid_state');
    if (typeof id !== 'string' || !s.weapons.includes(id)) return fail('weapon_not_owned');
    s.equipped=id; return {ok:true, equipped:id};
  }
  function upgrade(s, id) {
    if (!valid(s)) return fail('invalid_state');
    if (typeof id !== 'string' || !s.weapons.includes(id)) return fail('weapon_not_owned');
    const level=s.levels[id];
    if (level >= MAX_LEVEL) return fail('max_level');
    const cost=level*5;
    if (s.materials < cost) return fail('insufficient_materials');
    s.materials-=cost; s.levels[id]=level+1;
    return {ok:true, weaponId:id, level:level+1, cost, attack:WEAPONS[id].attack + 2*level};
  }
  function grant(s, currency, amount, key) {
    if (!valid(s)) return fail('invalid_state');
    if (currency !== 'tickets' && currency !== 'materials') return fail('invalid_currency');
    if (!Number.isSafeInteger(amount) || amount <= 0 || amount > MAX_CURRENCY) return fail('invalid_amount');
    if (key !== undefined && !goodKey(key)) return fail('invalid_key');
    if (key !== undefined && s.claimedKeys.includes(key)) return fail('already_claimed');
    if (key !== undefined && s.claimedKeys.length >= MAX_KEYS) return fail('key_limit');
    if (s[currency] + amount > MAX_CURRENCY) return fail('currency_limit');
    s[currency]+=amount; if (key !== undefined) s.claimedKeys.push(key);
    return {ok:true, currency, amount, balance:s[currency]};
  }
  function stats(s) {
    if (!valid(s)) return fail('invalid_state');
    const partyBonus={attack:0,maxHp:0,defense:0};
    s.party.forEach(id => { const b=ROSTER[id].bonus,lv=levelOf(s,id); partyBonus.attack+=b.attack+(lv-1); partyBonus.maxHp+=b.maxHp+2*(lv-1); partyBonus.defense+=b.defense; });
    const weaponAttack=WEAPONS[s.equipped].attack + (s.levels[s.equipped]-1)*2;
    return {ok:true, attack:10+partyBonus.attack+weaponAttack, maxHp:100+partyBonus.maxHp, defense:partyBonus.defense, partyBonus, weaponAttack, weaponId:s.equipped, weaponLevel:s.levels[s.equipped]};
  }
  root.SakuraProgression = Object.freeze({create, normalize, performDraw, exchangeExclusive, EXCLUSIVE_EXCHANGE_COST, characterLevel, grantPartyXP, MAX_CHARACTER_LEVEL, RECRUITS, EXCLUSIVE_POOL, luck, LUCK_MAX, grantCharacterCopies, towerStatus, beginTowerFloor, beginTowerStage, completeTowerStage, monthlyBanner, MONTHLY_IDS, loginStatus, claimDailyLogin, setSkill, abilities, skillIds, defaultSkill, bannerStatus, LIMITED_START, LIMITED_END, MAX_MOD_RANK, setParty, exchangeCharacter, discardMaterials, equip, upgrade, grant, stats, CHARACTER_EXCHANGE_COSTS, ROSTER, WEAPONS, RARITY_RATES, DUPLICATE_MATERIALS, CHARACTER_POOL, WEAPON_POOL, POOLS, ITEM_RATES, MAX_LEVEL, MAX_CURRENCY});
})(typeof window !== 'undefined' ? window : globalThis);
