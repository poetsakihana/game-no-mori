/* Lossless, lazy bundles: original OBJ/MTL text, 50 characters per file. */
const characterBundleCache=new Map();
async function loadCharacterModel(path){
 const match=/^models\/character_(\d{3})\.(obj|mtl)$/.exec(path);
 if(!match||Number(match[1])<1||Number(match[1])>500)throw Error('モデルのパスが無効です。');
 const index=Math.floor((Number(match[1])-1)/50);
 if(!characterBundleCache.has(index)){
  const pending=fetch('model-bundles/characters-'+String(index).padStart(2,'0')+'.json').then(r=>{if(!r.ok)throw Error('モデルを読み込めませんでした。通信を確認してもう一度開いてください。');return r.json()}).catch(e=>{characterBundleCache.delete(index);throw e});
  characterBundleCache.set(index,pending);
  // Keep no more than three bundle promises (about8MB) in the navigation cache.
  if(characterBundleCache.size>3)characterBundleCache.delete(characterBundleCache.keys().next().value);
 }
 const assets=await characterBundleCache.get(index);
 if(typeof assets[path]!=='string')throw Error('モデルデータが見つかりません。');
 return assets[path];
}
