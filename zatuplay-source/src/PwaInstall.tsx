import {useEffect,useState} from 'react';
import {CheckCircle2,Download,Smartphone} from 'lucide-react';

type InstallPrompt=Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:'accepted'|'dismissed'}>};
const isStandalone=()=>window.matchMedia('(display-mode: standalone)').matches||(navigator as Navigator&{standalone?:boolean}).standalone===true;

export function usePwaInstall(enabled=true){
 const [standalone,setStandalone]=useState(isStandalone);
 const [prompt,setPrompt]=useState<InstallPrompt|null>(null);
 const [added,setAdded]=useState(false),[busy,setBusy]=useState(false),[help,setHelp]=useState(false),[message,setMessage]=useState('');
 useEffect(()=>{
  if(!enabled)return;
  const media=window.matchMedia('(display-mode: standalone)');
  const sync=()=>setStandalone(isStandalone());
  const available=(event:Event)=>{event.preventDefault();setPrompt(event as InstallPrompt);};
  const installed=()=>{setAdded(true);setPrompt(null);setMessage('ホーム画面のZatuPlayアイコンから開いてください。');};
  window.addEventListener('beforeinstallprompt',available);
  window.addEventListener('appinstalled',installed);
  window.addEventListener('pageshow',sync);
  media.addEventListener('change',sync);
  return()=>{window.removeEventListener('beforeinstallprompt',available);window.removeEventListener('appinstalled',installed);window.removeEventListener('pageshow',sync);media.removeEventListener('change',sync);};
 },[enabled]);
 const install=async()=>{
  if(busy)return;
  if(added){setHelp(true);setMessage('ホーム画面のZatuPlayアイコンから開いてください。');return;}
  if(!prompt){setHelp(true);setMessage('下の端末別の手順で追加できます。');return;}
  setBusy(true);setMessage('');
  try{await prompt.prompt();const choice=await prompt.userChoice;setPrompt(null);if(choice.outcome==='accepted'){setAdded(true);setMessage('追加処理が終わったら、ホーム画面のZatuPlayから開いてください。');}else{setHelp(true);setMessage('追加はキャンセルされました。あとからブラウザのメニューで追加できます。');}}
  catch{setPrompt(null);setHelp(true);setMessage('追加画面を開けませんでした。下の手順をお試しください。');}
  finally{setBusy(false);}
 };
 return {standalone,added,busy,help,setHelp,message,install};
}
export type PwaState=ReturnType<typeof usePwaInstall>;

export function PwaInstall({pwa}:{pwa:PwaState}){
 if(pwa.standalone)return <section className="pwa-running" aria-label="ZatuPlayアプリ"><CheckCircle2 size={21} aria-hidden="true"/><div><strong>ZatuPlay アプリで起動中</strong><p>作品はこのアプリ内で開きます。別の作品は「作品一覧」から選べます。作品の読み込みには通信が必要です。</p></div></section>;
 return <section className="pwa-install" aria-labelledby="pwa-title"><div className="pwa-intro"><span className="pwa-icon" aria-hidden="true"><Smartphone size={29}/></span><div><span className="eyebrow">ONE APP, MANY WORLDS</span><h2 id="pwa-title">ZatuPlayを、ひとつのアプリに。</h2><p>ホーム画面のアイコンから起動して、作品を選んで遊べます。ゲームごとの追加は不要です。</p></div></div><button type="button" className="button primary pwa-add" onClick={()=>void pwa.install()} disabled={pwa.busy} aria-controls="pwa-help">{pwa.added?<CheckCircle2 size={18}/>:<Download size={18}/>} {pwa.busy?'追加画面を開いています…':pwa.added?'追加後の開き方を見る':'ZatuPlayをホーム画面に追加'}</button>{pwa.message&&<p className="pwa-status" role="status">{pwa.message}</p>}<details id="pwa-help" open={pwa.help} onToggle={event=>pwa.setHelp(event.currentTarget.open)}><summary>Android・iPhone・パソコンの追加手順</summary><div className="pwa-steps"><section><h3>Android（Chrome）</h3><ol><li>Chromeでこのページを開きます。</li><li>上の追加ボタン、または右上の「︙」を開きます。</li><li>「アプリをインストール」または「ホーム画面に追加」を選び、確認します。</li></ol></section><section><h3>iPhone・iPad（Safari）</h3><ol><li>Safariでこのページを開きます。</li><li>共有ボタンから「ホーム画面に追加」を選びます。</li><li>「Webアプリとして開く」があればオンにして「追加」を押します。</li></ol></section><section><h3>パソコン（Chrome・Edge）</h3><p>アドレスバーのインストールボタン、またはブラウザのメニューから「アプリとしてインストール」を選びます。</p></section></div><p className="pwa-small">項目の名前はOSやブラウザによって異なります。SNSなどのアプリ内ブラウザでは、先にChromeやSafariで開いてください。追加したあとはホーム画面のZatuPlayから起動します。</p></details><p className="pwa-limits">初回起動・作品の読み込みにはインターネット接続が必要です。オフラインプレイにはまだ対応していません。APK版のセーブデータは自動では引き継がれません。</p></section>;
}
