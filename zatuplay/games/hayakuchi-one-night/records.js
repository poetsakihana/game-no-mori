"use strict";
const HayakuchiRecords = (() => {
  const legacyKey="hayakuchi-one-night-progress-v1", key="hayakuchi-one-night-progress-v2", backupKey=key+".before-reset";
  const idsValid=ids=>Array.isArray(ids)&&ids.every(id=>Number.isInteger(id)&&id>0&&id<=200);
  function decode(raw, legacy=false){
    if(raw===null)return {ids:[],generation:""};
    try {
      const data=JSON.parse(raw);
      if(legacy&&idsValid(data))return {ids:[...new Set(data)],generation:""};
      if(data&&idsValid(data.ids)&&typeof data.generation==="string")return {ids:[...new Set(data.ids)],generation:data.generation};
    } catch {}
    throw Error("記録の形式に問題があります。上書きしません。");
  }
  function read(storage){
    const raw=storage.getItem(key), legacy=raw===null?storage.getItem(legacyKey):null;
    const active=decode(raw===null?legacy:raw,raw===null);
    const parsed=raw===null?null:JSON.parse(raw);
    let backup=null;
    if(parsed&&Object.hasOwn(parsed,"backup")) {
      if(parsed.backup!==null){
        backup=JSON.stringify(parsed.backup);
        decode(backup);
      }
    } else backup=storage.getItem(backupKey);
    return {raw,legacy,backup,...active};
  }
  function same(a,b){return a.raw===b.raw&&a.legacy===b.legacy&&a.backup===b.backup;}
  function pack(ids,generation,backup){return JSON.stringify({ids,generation,backup:backup===null?null:decode(backup)});}
  function append(storage,base,id) {
    const current=read(storage);
    if(current.generation!==base.generation)throw Error("別のタブで記録が切り替わりました。");
    const serialized=pack([...new Set([...current.ids,id])],current.generation,current.backup);
    if(!same(current,read(storage)))throw Error("別のタブで記録が変わりました。");
    if(current.raw!==serialized)storage.setItem(key,serialized);
    return read(storage);
  }
  function switchSaves(storage,expected,expectedBackup,restore,generation) {
    const current=read(storage);
    if(!same(current,expected)||current.backup!==expectedBackup)throw Error("別のタブで記録が変わりました。開き直してください。");
    if(restore&&expectedBackup===null)throw Error("保管した記録がありません。");
    const ids=restore?decode(expectedBackup).ids:[];
    const backup=JSON.stringify({ids:current.ids,generation:current.generation});
    const serialized=pack(ids,generation,backup);
    // One synchronous atomic storage write. Quota failure keeps both previous records.
    try{storage.setItem(key,serialized);}
    catch {throw Error("保存できませんでした。現在の記録とバックアップは変更していません。");}
    return read(storage);
  }
  return {key,legacyKey,backupKey,decode,read,append,switchSaves};
})();
