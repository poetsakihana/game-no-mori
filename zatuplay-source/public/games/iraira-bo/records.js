(function(root){
'use strict';
function exchange(storage,key,backupKey,{expected,expectedBackup,next,validate}) {
  const prior=storage.getItem(key), backup=storage.getItem(backupKey);
  if (prior!==expected||backup!==expectedBackup) throw Error('別の画面で記録が変わりました。再読み込みしてください。');
  validate(prior); validate(next);
  storage.setItem(backupKey,prior);
  try {storage.setItem(key,next);}
  catch(e) {try {if(backup===null)storage.removeItem(backupKey); else storage.setItem(backupKey,backup);}catch(_){} throw e;}
  return next;
}
root.ZatuRecords={exchange};
})(globalThis);
