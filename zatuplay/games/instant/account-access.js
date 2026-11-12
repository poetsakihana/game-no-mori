// Device-local accounts. No email is requested or sent by this module.
const ID_INDEX = 'instant-id-index-v1';
const passwordKey = id => 'instant-password-v1-' + id;
function normalizeID(value) { return String(value || '').trim().toUpperCase(); }
function validLoginID(value) { return typeof value === 'string' && /^IN_[0-9A-F]{24}$/.test(value); }
function idIndex() {
  let result = Object.create(null), raw;
  try { raw = JSON.parse(InstantStorage.local.getItem(ID_INDEX)); } catch {}
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return result;
  for (let [id, key] of Object.entries(raw)) {
    if (validLoginID(id) && (key === 'instant-local-' + id || key === LEGACY_GAME_KEY)) result[id] = key;
  }
  return result;
}
function freshLoginID() {
  for (let attempt = 0; attempt < 8; attempt++) {
    let bytes = crypto.getRandomValues(new Uint8Array(12));
    let id = 'IN_' + Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    if (!idIndex()[id] && InstantStorage.local.getItem(passwordKey(id)) === null) return id;
  }
  throw Error('IDを発行できませんでした。もう一度お試しください。');
}
let localDraftID = '', idEntryPage = 'title', idEntryPainted = '';
function rememberID(id, key) {
  let index = idIndex();
  if (!validLoginID(id) || (key !== 'instant-local-' + id && key !== LEGACY_GAME_KEY)) throw Error('IDの保存先が正しくありません');
  if (index[id] && index[id] !== key) throw Error('このIDは登録済みです');
  index[id] = key;
  InstantStorage.local.setItem(ID_INDEX, JSON.stringify(index));
}
// Commit the game record and its index together, restoring the old record on failure.
const idSave = save;
save = function() {
  if (!authLegacyMode || !validLoginID(state.loginId)) return idSave();
  let id = state.loginId, key = KEY, previous;
  try {
    let index = idIndex();
    if (index[id] && index[id] !== key) throw Error('このIDは登録済みです');
    if (index[id] === key) return idSave();
    previous = InstantStorage.local.getItem(key);
    if (!idSave()) return false;
    try { rememberID(id, key); }
    catch (error) {
      if (previous === null) InstantStorage.local.removeItem(key); else InstantStorage.local.setItem(key, previous);
      throw error;
    }
    return true;
  } catch { toast('アカウントを保存できませんでした。端末の空き容量をご確認ください。'); return false; }
};
function validLocalGame(data, id) {
  return !!data && data.registered === true && !data.withdrawn && data.loginId === id &&
    !!data.profile && typeof data.profile.name === 'string' &&
    ['posts', 'followers', 'following', 'liked', 'notices'].every(key => Array.isArray(data[key]));
}
function idTogglePassword(id, button) {
  let input = document.getElementById(id);
  if (!input) return;
  input.type = input.type === 'password' ? 'text' : 'password';
  if (button) { button.textContent = input.type === 'password' ? '表示' : '隠す'; button.setAttribute('aria-pressed', String(input.type === 'text')); }
}
function passwordInput(id, autocomplete, minimum) {
  return '<div class="account-password-row"><input id="' + id + '" type="password" autocomplete="' + autocomplete + '" ' +
    (minimum ? 'minlength="12" ' : '') + 'maxlength="128" required><button type="button" aria-label="パスワードの表示切り替え" aria-pressed="false" onclick="idTogglePassword(\'' + id + '\',this)">表示</button></div>';
}
const loginPasswordField = '<label for="local-login-password">パスワード</label>' + passwordInput('local-login-password', 'current-password', false);
function passwordFields(prefix) {
  return '<label for="' + prefix + '-password">パスワード（12〜128文字）</label>' + passwordInput(prefix + '-password', 'new-password', true) +
    '<label for="' + prefix + '-confirm">パスワード確認</label>' + passwordInput(prefix + '-confirm', 'new-password', true);
}
function idRememberField(id, checked = true) {
  return '<label class="account-remember"><input id="' + id + '" type="checkbox" ' + (checked ? 'checked' : '') + '>この端末でログイン状態を保持する</label>';
}
function idShowLogin() {
  if (authWorking || busy || registrationBusy) return;
  idEntryPage = 'login'; authScreen = 'login'; idEntryPainted = ''; authMessage = ''; paintAuth();
}
function idReturnToTitle() {
  if (authWorking || busy || registrationBusy) return;
  if (authLegacyMode && !state.registered) {
    authResetVolatile(); authLegacyMode = false; authUser = null;
    KEY = 'instant-locked-v1'; state = authNewGame(); state.withdrawn = true; registrationPainted = false;
  }
  idEntryPage = 'title'; authScreen = 'title'; idEntryPainted = ''; authMessage = ''; paintAuth();
}
const idProviderShow = authShow;
authShow = function(screen) {
  if (authConfigured()) return idProviderShow(screen);
  if (screen === 'title') return idReturnToTitle();
  if (screen === 'login') return idShowLogin();
  if (screen === 'signup') return idNewAccount();
};
const idPaintFallback = paintAuth;
paintAuth = function() {
  if (authConfigured()) return idPaintFallback();
  if (authCanPlay()) { authRoot.hidden = true; return; }
  authRoot.hidden = false; registrationRoot.hidden = true;
  document.body.classList.remove('account-ready'); bottomCommands.hidden = true;
  let paintKey = idEntryPage + ':' + authReady;
  if (idEntryPainted === paintKey && authRoot.innerHTML) return;
  let disabled = authReady ? '' : 'disabled', body;
  if (idEntryPage === 'login') {
    body = '<button type="button" class="auth-back" onclick="idReturnToTitle()">← タイトルへ</button><h2>おかえりなさい</h2>' +
      '<p class="muted">登録したIDとパスワードを入力してください。</p><form id="local-login-form" onsubmit="event.preventDefault();idLogin()">' +
      '<label for="local-login-id">ログインID</label><input id="local-login-id" maxlength="27" autocomplete="username" autocapitalize="characters" spellcheck="false" placeholder="IN_ から始まる27文字" required>' +
      '<div id="local-password-fields">' + loginPasswordField + '</div>' + idRememberField('local-login-remember') +
      '<button id="local-login-submit" class="primary" type="submit" ' + disabled + '>ログイン</button></form>' +
      '<button class="account-text-button" type="button" onclick="idNewAccount()">はじめての方は新規登録</button>' +
      '<details class="account-transfer"><summary>ID・セーブの引き継ぎ</summary><p class="muted">この端末の以前の記録や、保存したバックアップを読み込みます。</p>' +
      '<button type="button" onclick="authOpenLegacy()">この端末の以前のセーブを開く</button>' +
      '<label>ID・セーブのバックアップを読み込む<input type="file" accept="application/json,.json" onchange="idImport(this.files[0])"></label></details>';
  } else {
    body = '<div class="account-welcome-icon" aria-hidden="true">✦</div><h2 class="account-welcome">小さな投稿から、物語がはじまる。</h2>' +
      '<div class="auth-title-actions"><button type="button" class="primary" onclick="idNewAccount()" ' + disabled + '>新規登録</button>' +
      '<button type="button" onclick="idShowLogin()" ' + disabled + '>ログイン</button></div>' +
      '<p class="muted">新規登録ではIDを自動発行します。登録済みの方はログインして、続きを遊べます。</p>';
  }
  authRoot.innerHTML = '<div class="instant-auth-card"><h1 class="instant-wordmark">instant</h1><p class="auth-subtitle">あなたの言葉が、誰かの毎日になる。</p>' + body +
    '<p id="auth-status" role="status" aria-live="polite">' + esc(authMessage) + '</p><p class="muted auth-footnote">端末内アカウントで遊ぶゲームです。メールアドレスは不要です。別の端末へ移すときはセーブのバックアップが必要です。</p>' +
    (!authReady ? '<p class="notice">起動準備中です…</p>' : '') + '</div>';
  idEntryPainted = paintKey;
};
function idOpen(key, data) {
  idEntryPage = 'title'; authScreen = 'title'; idEntryPainted = '';
  authResetVolatile(); KEY = key; state = data;
  authLegacyMode = true; authUser = null; authSession = null; state.withdrawn = false;
  socialState(); communityState(); lifeState(); progressState();
  registrationDraft = initialDraft(); registrationPainted = false; view = 'feed'; render();
  if (accountRegistered()) bootstrapLive();
}
function idNewAccount() {
  if (authWorking || busy || registrationBusy) return;
  if (!authReady) { authNotice('起動準備中です。少し待ってください'); return; }
  try {
    localDraftID = freshLoginID();
    let game = authNewGame(); game.profile = {name:'', handle:localDraftID, gender:'', icon:'🌷', preset:16};
    idOpen('instant-local-' + localDraftID, game);
  } catch { authNotice('新規登録を開始できませんでした。端末の保存設定をご確認ください。'); }
}
function localRegistrationID() { return authLegacyMode ? localDraftID : null; }
async function derivePassword(password, salt) {
  const webTicket=InstantStorage.ticket;
  if (!crypto.subtle) throw Error('この端末のWebViewを更新してから、もう一度お試しください。');
  let key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  let bits = await crypto.subtle.deriveBits({name:'PBKDF2', hash:'SHA-256', salt:new Uint8Array(salt), iterations:600000}, key, 256);
  InstantStorage.check(webTicket);return Array.from(new Uint8Array(bits), byte => byte.toString(16).padStart(2, '0')).join('');
}
async function enrollPassword(id, password, confirmation) {
  if (!validLoginID(id)) throw Error('登録用IDを発行し直してください');
  if (password.length < 12 || password.length > 128) throw Error('パスワードを12〜128文字で入力してください');
  if (password !== confirmation) throw Error('確認用パスワードが一致していません');
  let salt = Array.from(crypto.getRandomValues(new Uint8Array(16))), hash = await derivePassword(password, salt);
  if (InstantStorage.local.getItem(passwordKey(id)) !== null) throw Error('このIDにはパスワードが設定済みです');
  InstantStorage.local.setItem(passwordKey(id), JSON.stringify({salt, hash}));
}
function validPasswordRecord(record) {
  return !!record && /^[0-9a-f]{64}$/.test(record.hash) && Array.isArray(record.salt) && record.salt.length === 16 && record.salt.every(n => Number.isInteger(n) && n >= 0 && n < 256);
}
async function idLogin() {
  if (authWorking || busy || registrationBusy || !authReady) return;
  let id = normalizeID(authRead('local-login-id')), form = document.getElementById('local-login-form');
  if (!form) return;
  if (!validLoginID(id)) { authNotice('IN_から始まる27文字のIDを入力してください'); return; }
  let key, data;
  try { key = idIndex()[id]; data = key && JSON.parse(InstantStorage.local.getItem(key)); }
  catch { authNotice('アカウントの記録を読み込めませんでした。'); return; }
  if (!validLocalGame(data, id)) { authNotice('この端末にそのIDの記録がありません。別の端末の記録は、セーブのバックアップから引き継いでください。'); return; }
  authWorking = true;
  let submit = document.getElementById('local-login-submit'), remember = document.getElementById('local-login-remember')?.checked !== false;
  for (let field of form.querySelectorAll('input,button')) field.disabled = true;
  authNotice('確認しています…');
  try {
    let stored = InstantStorage.local.getItem(passwordKey(id));
    if (stored === null) {
      if (form.dataset.enrollId !== id) {
        form.dataset.enrollId = id;
        document.getElementById('local-password-fields').innerHTML = passwordFields('local-login');
        submit.textContent = 'パスワードを設定してログイン';
        authNotice('以前の記録を見つけました。初回だけ新しいパスワードを12文字以上で設定してください。'); return;
      }
      await enrollPassword(id, authRead('local-login-password'), authRead('local-login-confirm'));
    } else {
      if (form.dataset.enrollId) {
        delete form.dataset.enrollId;
        document.getElementById('local-password-fields').innerHTML = loginPasswordField;
        submit.textContent = 'ログイン'; authNotice('このIDに設定したパスワードを入力してください。'); return;
      }
      let password = authRead('local-login-password');
      if (!password || password.length > 128) throw Error('パスワードを入力してください');
      let record; try { record = JSON.parse(stored); } catch {}
      if (!validPasswordRecord(record)) throw Error('パスワードの保存情報を読み込めませんでした。');
      let hash = await derivePassword(password, record.salt), difference = 0;
      for (let i = 0; i < hash.length; i++) difference |= hash.charCodeAt(i) ^ record.hash.charCodeAt(i);
      if (difference !== 0) throw Error('IDまたはパスワードが一致しません');
    }
    data.rememberLogin = remember;
    // Persist this preference before opening, so a full disk cannot cause a partial login.
    InstantStorage.local.setItem(key, JSON.stringify(data));
    idOpen(key, data); toast('おかえりなさい、' + data.profile.name + 'さん');
  } catch (error) { authNotice(error.message || 'ログインできませんでした'); }
  finally {
    authWorking = false;
    for (let field of form.querySelectorAll('input,button')) field.disabled = false;
    for (let input of form.querySelectorAll('input[type="password"],input[autocomplete="current-password"],input[autocomplete="new-password"]')) input.value = '';
  }
}
const idOldRegistrationHTML = registrationHTML;
registrationHTML = function() {
  let html = idOldRegistrationHTML();
  if (!authLegacyMode) return html;
  html = html.replace('<div class="registration-card">', '<div class="registration-card"><button type="button" class="auth-back" onclick="idReturnToTitle()">← タイトルへ</button><form id="register-form" onsubmit="event.preventDefault();registerAccount()">');
  html = html.replace(/<label>ID名[\s\S]*?<label>アイコン画像<\/label>/, '<label for="register-handle">自動発行ID</label><input id="register-handle" readonly value="' + localDraftID + '"><p class="notice">このIDとパスワードでログインできます。IDは登録後のプロフィールでも確認できます。</p>' + passwordFields('register') + '<label>アイコン画像</label>');
  html = html.replace('<button id="register-submit"', idRememberField('register-remember') + '<p id="register-status" role="status" aria-live="polite"></p><button id="register-submit"');
  html = html.replace('onclick="registerAccount()"', 'type="submit"').replace('登録して投稿リストへ', '登録してはじめる');
  html = html.replace('このブラウザに保存します。', 'この端末に保存します。パスワードの再発行はできないため、大切に控えてください。');
  return html.replace(/<\/div>$/, '</form></div>');
};
const idOldLegacy = authOpenLegacy;
function idShowImportedLogin(id) {
  idEntryPage = 'login'; authScreen = 'login'; idEntryPainted = ''; paintAuth();
  document.getElementById('local-login-id').value = id;
  if (InstantStorage.local.getItem(passwordKey(id)) === null) {
    document.getElementById('local-login-form').dataset.enrollId = id;
    document.getElementById('local-password-fields').innerHTML = passwordFields('local-login');
    document.getElementById('local-login-submit').textContent = 'パスワードを設定してログイン';
  }
}
authOpenLegacy = function() {
  if (authWorking || busy || registrationBusy) return;
  let old; try { old = JSON.parse(InstantStorage.local.getItem(LEGACY_GAME_KEY)); } catch {}
  if (!old?.registered || old.withdrawn) { authNotice('この端末に以前のセーブがありません。新規登録から始めてください。'); return; }
  try {
    let id = validLoginID(old.loginId) ? old.loginId : freshLoginID();
    if (idIndex()[id] && idIndex()[id] !== LEGACY_GAME_KEY) throw Error();
    old.loginId = id; InstantStorage.local.setItem(LEGACY_GAME_KEY, JSON.stringify(old)); rememberID(id, LEGACY_GAME_KEY);
    idShowImportedLogin(id);
    authNotice(InstantStorage.local.getItem(passwordKey(id)) === null ? '以前のセーブを見つけました。この端末用のパスワードを12文字以上で設定してください。' : '以前のセーブのIDを読み込みました。パスワードを入力してログインしてください。');
  } catch { authNotice('以前のセーブを開けませんでした。'); }
};
const idOldAccount = accountHTML;
accountHTML = function() {
  let base = idOldAccount();
  if (!authLegacyMode) return base;
  return '<div class="card pad"><h2>あなたのログインID</h2><p class="account-id"><b>' + esc(state.loginId || '登録時に発行') + '</b></p><button onclick="idCopy()">IDをコピー</button><button onclick="backup()">セーブのバックアップ</button><p class="muted">この端末ではIDとパスワードで再ログインできます。別の端末へ移す場合は、セーブのバックアップも必要です。動画・音楽はバックアップに含まれません。</p><button onclick="authLogout()">ログアウト</button></div>' + base;
};
async function idCopy() {
  if (!validLoginID(state.loginId)) return;
  try { await navigator.clipboard.writeText(state.loginId); toast('IDをコピーしました'); }
  catch { prompt('このIDを控えてください', state.loginId); }
}
async function idImport(file) {
  if (!file || authWorking || registrationBusy) return;
  authWorking = true;
  let oldState = state, oldKey = KEY, oldMode = authLegacyMode;
  try {
    let data = JSON.parse(await file.text());
    if (!Array.isArray(data.posts) || !data.profile || data.withdrawn) throw Error('対応するセーブファイルを選んでください');
    if (!validLoginID(data.loginId)) { data.loginId = freshLoginID(); data.registered = true; }
    if (!validLocalGame(data, data.loginId)) throw Error('登録済みのセーブファイルを選んでください');
    if (idIndex()[data.loginId] || InstantStorage.local.getItem(passwordKey(data.loginId)) !== null) throw Error('登録済みIDです。ログインしてからセーブを読み込んでください');
    data.rememberLogin = false;
    KEY = 'instant-local-' + data.loginId; authLegacyMode = true;
    await restore(new Blob([JSON.stringify(data)], {type:'application/json'}));
    if (state === oldState) { KEY = oldKey; authLegacyMode = oldMode; return; }
    state = authNewGame(); KEY = 'instant-locked-v1'; authLegacyMode = false; registrationRoot.hidden = true;
    idShowImportedLogin(data.loginId);
    authNotice('引き継ぎました。この端末用のパスワードを12文字以上で設定してください。');
  } catch (error) { state = oldState; KEY = oldKey; authLegacyMode = oldMode; toast(error.message || '引き継げませんでした'); }
  finally { authWorking = false; }
}
const restoreGameData = restore;
restore = async function(file) {
  if (!file || !authLegacyMode || !accountRegistered() || !validLoginID(state.loginId)) return restoreGameData(file);
  try {
    let current = state, data = JSON.parse(await file.text());
    if (state !== current) return;
    data.loginId = current.loginId; data.registered = true; data.withdrawn = false; data.rememberLogin = current.rememberLogin;
    if (data.profile) data.profile.handle = current.loginId;
    return restoreGameData(new Blob([JSON.stringify(data)], {type:'application/json'}));
  } catch { toast('対応するセーブファイルを読み込んでください'); }
};
const accountAccessLogout = authLogout;
authLogout = async function() {
  await accountAccessLogout();
  if (!authLegacyMode && !authUser) { idEntryPage = 'title'; authScreen = 'title'; idEntryPainted = ''; paintAuth(); }
};
const accountAccessStyle = document.createElement('style');
accountAccessStyle.textContent = '.account-welcome-icon{text-align:center;font-size:42px;color:#be8c61;margin-top:26px}.account-welcome{text-align:center;font-size:18px!important;font-weight:500;line-height:1.8}.account-password-row{display:flex;gap:8px;align-items:center}.account-password-row input{flex:1;min-width:0;margin:0}.account-password-row button{width:auto!important;padding:10px!important;flex:0 0 auto;font-size:12px}.account-remember{display:flex;align-items:center;gap:9px;font-weight:400!important;font-size:12px!important;margin:22px 0}.account-remember input{width:18px;height:18px;margin:0;flex:0 0 auto}.account-transfer{margin-top:22px;font-size:13px}.account-text-button{width:100%;border:0;background:none;margin-top:12px}.account-id{font-family:monospace;font-size:14px;overflow-wrap:anywhere;user-select:all}#local-login-submit{width:100%;padding:14px}#register-status{color:#8d3b53;white-space:pre-wrap}.instant-auth-card{box-sizing:border-box}#register-form label{display:block}#register-form .account-remember{display:flex}#register-handle{font-family:monospace;font-size:13px;background:#f2f5ed}button:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid #73a589;outline-offset:3px}@media(max-width:420px){.instant-auth-card{padding:28px 20px}.instant-wordmark{font-size:64px!important}}';
document.head.append(accountAccessStyle);
INSTANT_CHANGELOG.unshift({version:'4.4.0', date:'2026-11-09', items:['タイトルからログイン・新規登録を選択','自動発行IDとパスワードで端末内アカウントを管理','ログイン状態の保持とログアウト、旧セーブの引き継ぎ']});
paintAuth();
