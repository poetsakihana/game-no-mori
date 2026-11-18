'use strict';
function createRecordManager(storage, key, validate, initial) {
 const backupKey=key+'.reset-recovery-v1';
 function decode(raw){if(raw===null)return null;if(raw.length>2000000)throw Error('保存サイズが大きすぎます');const data=JSON.parse(raw);if(!validate(data))throw Error('対応しない保存形式です。原文を保管してください。');return data}
 function inspect(){const raw=storage.getItem(key);return {raw,data:decode(raw)}}
 function replace(expected,next){decode(next);if(storage.getItem(key)!==expected)throw Error('別画面で記録が変わりました。変更しません。');if(expected!==null){storage.setItem(backupKey,expected);if(storage.getItem(backupKey)!==expected)throw Error('退避を確認できません。変更しません。')}if(storage.getItem(key)!==expected)throw Error('退避中に記録が変わりました。変更しません。');storage.setItem(key,next);if(storage.getItem(key)!==next)throw Error('保存結果が変わりました。退避記録を保管してください。');return inspect()}
 return {inspect,backupRaw:()=>storage.getItem(backupKey),reset(expected){return replace(expected,JSON.stringify(initial()))},restore(expected,raw){if(raw===null)throw Error('退避記録がありません');decode(raw);return replace(expected,raw)}};
}
if(typeof module!=='undefined')module.exports=createRecordManager;
