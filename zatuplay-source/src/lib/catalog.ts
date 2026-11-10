export interface AppRecord {
  id:string; name:string; subtitle:string; category:string; description:string;
  color:string; icon:string; tags:string[]; filename:string; size:number;
  sha256:string; parts:{path:string;size:number}[]; package:string;
  version:string; minSdk:number|string|null; targetSdk:number|string|null;
  order:number; checked:string; deviceTested:boolean;
}
export const categories=['すべて','RPG','パズル','アクション','学び・クイズ','シミュレーション','アドベンチャー','エンタメ','音楽'];
export const fileSize=(bytes:number)=>bytes===0?'0 B':bytes>=1e6?`${(bytes/1e6).toFixed(1)} MB`:`${Math.max(1,Math.round(bytes/1000))} KB`;
export const searchKey=(text:string)=>text.normalize('NFKC').toLowerCase().replace(/[ァ-ヶ]/g,ch=>String.fromCharCode(ch.charCodeAt(0)-0x60)).trim();
export const searchAliases:Record<string,string>={zatsu:'ザツ ざつ ザツワールド',chronoweave:'クロノウィーヴ クロノウィーブ クロノウェーブ', 'song-chronicle':'さきはな サキハナ sakihana 歌物語 うたものがたり',asteria:'アステリア',tokai:'とうかい 愛知 あいち 岐阜 ぎふ 三重 みえ 名古屋 なごや',tokyo:'とうきょう 東京読み巡り',candy:'キャンディ レヴェリー', 'black-sensei-3':'ぶらっくせんせい ブラック先生3 ブラック先生III','black-sensei-2':'ぶらっくせんせい ブラック先生2 ブラック先生II','black-sensei':'ぶらっくせんせい ブラック先生1',komorebi:'こもれび わーくす',instant:'インスタント',sakihana:'さきはな サキハナ 失われた詩 うしなわれたうた',battlitia:'バトリティア',crossroad:'クロスロード ぜんこくてつどう',warai:'わらいざ', 'quest-reborn':'えあがいつ クエスト リボーン',entrance:'はちばんいりぐち 8ばん ８番', 'moving-castle':'うごくしろ 動く城', 'national-cm':'ぜんこく ローカル シーエム', 'clay-museum':'みぃ かみねんど びじゅつかん',rhythm:'りずむてんごく マスター', 'can-to-crown':'カントゥクラウン'};
