// Remember only the last completed local account, never an unfinished registration.
const AUTO_LOGIN_KEY='instant-remembered-login-v1';
let autoLoginTried=false;
function forgetAutoLogin(){try{InstantStorage.local.removeItem(AUTO_LOGIN_KEY)}catch{}}
function rememberCurrentLogin(){
 if(!authLegacyMode||authConfigured()||state.registered!==true||state.withdrawn||!validLoginID(state.loginId))return false;
 if(state.rememberLogin===false){forgetAutoLogin();return false}
 let value=JSON.stringify({version:1,id:state.loginId});
 try{if(InstantStorage.local.getItem(AUTO_LOGIN_KEY)!==value)InstantStorage.local.setItem(AUTO_LOGIN_KEY,value);return true}
 catch{toast('自動ログイン設定を保存できませんでした。次回はIDでログインしてください');return false}
}
const autoLoginSave=save;save=function(){let ok=autoLoginSave();if(ok){if(state.withdrawn)forgetAutoLogin();else rememberCurrentLogin()}return ok};
const autoLoginOpen=idOpen;idOpen=function(key,data){autoLoginOpen(key,data);rememberCurrentLogin()};
const autoLoginLogout=authLogout;authLogout=async function(){await autoLoginLogout();if(!authLegacyMode&&!authUser){autoLoginTried=true;forgetAutoLogin()}};
function restoreRememberedLogin(){
 if(autoLoginTried||!authReady||authConfigured()||authWorking)return false;
 autoLoginTried=true;
 if(authLegacyMode||authUser){rememberCurrentLogin();return false}
 let previous={state,key:KEY,legacy:authLegacyMode,user:authUser},opening=false;
 try{
  let raw=InstantStorage.local.getItem(AUTO_LOGIN_KEY);if(!raw)return false;
  let remembered=JSON.parse(raw);if(remembered?.version!==1||!validLoginID(remembered.id))throw Error('invalid ID');
  let key=idIndex()[remembered.id];if(typeof key!=='string')throw Error('missing account');
  let data=JSON.parse(InstantStorage.local.getItem(key));
  if(!validLocalGame(data,remembered.id)||data.rememberLogin===false)throw Error('invalid account');
  let credential=JSON.parse(InstantStorage.local.getItem(passwordKey(remembered.id)));
  if(!validPasswordRecord(credential))throw Error('missing password');
  opening=true;idOpen(key,data);return true;
 }catch{
  if(opening){state=previous.state;KEY=previous.key;authLegacyMode=previous.legacy;authUser=previous.user;registrationPainted=false}
  forgetAutoLogin();authMessage='保存したログイン情報を開けませんでした。IDまたはバックアップでログインしてください。';return false;
 }
}
const autoLoginPaint=paintAuth;paintAuth=function(){if(restoreRememberedLogin())return;return autoLoginPaint()};
const autoLoginAccount=accountHTML;accountHTML=function(){return '<div class="card pad"><h2>ログイン状態の保持</h2><p>'+(state.rememberLogin===false?'このアカウントは起動時にIDとパスワードを入力します。':'次回起動時はこの端末に保存したアカウントを開きます。')+'</p><p class="muted">ログアウトすると保持は解除されます。ログイン画面の「この端末でログイン状態を保持する」で選び直せます。別の端末へ移すときはセーブのバックアップが必要です。</p></div>'+autoLoginAccount()};
restoreRememberedLogin();
