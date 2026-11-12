// ID-only backups are login aids. Complete game data uses the existing save export.
function idBackupData(){
 if(!accountRegistered()||!validLoginID(state.loginId))throw Error('ログインしてからIDをバックアップしてください');
 return {app:'instant',kind:'login-id-backup',version:1,loginId:state.loginId,name:String(state.profile?.name||''),exportedAt:new Date().toISOString()};
}
function downloadIDBackup(){let url;
 try{let data=idBackupData(),blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});url=URL.createObjectURL(blob);let link=document.createElement('a');link.href=url;link.download='Instant-ID-'+data.loginId+'.json';link.hidden=true;document.body.append(link);try{link.click()}finally{link.remove()}setTimeout(()=>URL.revokeObjectURL(url),30000);toast('IDバックアップのダウンロードを開始しました');return true}
 catch(e){if(url)URL.revokeObjectURL(url);toast(e.message||'IDを保存できませんでした');return false}
}
function profileIDBackupHTML(){return '<section class="card pad" aria-label="IDバックアップ"><h2>ログインIDのバックアップ</h2><p><code style="overflow-wrap:anywhere">'+esc(state.loginId||'未発行')+'</code></p><div class="row" style="flex-wrap:wrap"><button type="button" class="primary" onclick="downloadIDBackup()">IDをバックアップ</button><button type="button" onclick="idCopy()">IDをコピー</button><button type="button" onclick="backup()">セーブのバックアップ</button></div><p class="muted">IDはJSONファイルで保存できます。ログイン画面で読み込むと、IDの入力を省略できます。ログインにはパスワードが必要です。別の端末やブラウザへゲームの記録も移す場合は「セーブのバックアップ」を保存してください。動画・音楽はセーブファイルに含まれません。</p></section>'}
const idBackupOwnProfile=ownProfilePage;ownProfilePage=function(){return profileIDBackupHTML()+idBackupOwnProfile()};
const idBackupAccount=accountHTML;accountHTML=function(){return idBackupAccount().replace('<button onclick="idCopy()">IDをコピー</button>','<button type="button" onclick="downloadIDBackup()">IDをバックアップ</button><button onclick="idCopy()">IDをコピー</button>')};
const idBackupImport=idImport;idImport=async function(file){if(!file)return;
 let data;try{data=JSON.parse(await file.text())}catch{toast('対応するJSONバックアップファイルを選んでください');return}
 if(data?.kind!=='login-id-backup')return idBackupImport(file);
 if(data.app!=='instant'||data.version!==1||typeof data.loginId!=='string'||!validLoginID(normalizeID(data.loginId))){toast('対応するIDバックアップファイルではありません');return}
 idShowLogin();let field=document.getElementById('local-login-id');if(field)field.value=normalizeID(data.loginId);
 authNotice('IDを読み込みました。パスワードを入力して「ログイン」を押してください。別の端末の記録は、セーブのバックアップも読み込んでください。');
};
// Keep only the two entry commands on the title; import stays on the login page.
const idBackupPaintAuth=paintAuth;paintAuth=function(){idBackupPaintAuth();if(authCanPlay()||authConfigured()||idEntryPage!=='login')return;let input=authRoot.querySelector('input[type="file"]');if(input?.parentElement){let label=input.parentElement.firstChild;if(label?.nodeType===3)label.textContent='ID・セーブのバックアップを読み込む'}};
INSTANT_CHANGELOG.unshift({version:'4.2.2',date:'2026-10-19',items:['プロフィールからログインIDをJSONバックアップ','IDバックアップをログイン画面で読み込み','プロフィールからセーブ全体のバックアップも可能']});
