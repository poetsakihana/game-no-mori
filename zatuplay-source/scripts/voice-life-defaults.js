/* Source-derived Voice Life 7.0. Native saves are deliberately never accessed. */
function voiceLifeDefaults(){return {
 state:{name:'',title:'',followers:0,following:[],totalLikes:0,totalGifts:0,totalMinutes:0,streams:0,level:1,relationships:{},totalPoints:0,history:[],totalGiftCoins:0,details:{}},
 extra:{wallet:0,badges:[],lastClaim:'',snapshots:{},family:null,familyChat:[],familyContribution:0,collab:null,currentDay:new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo'}).format(new Date()),observed:null},
 media:{avatar:'',banner:''},social:{views:0,followers:[],seen:{},lastPulse:Date.now()}
}}
