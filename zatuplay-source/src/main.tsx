import {useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import Store from './Store';
import {Home,BrowserCollection} from './BrowserCollection';
import {loadCatalog,type CatalogPayload} from './lib/drive-catalog';
import {loadBrowserCatalog,type BrowserCatalog} from './lib/browser-catalog';
import {sitePath} from './lib/paths';
import {usePwaInstall} from './PwaInstall';
import './store.css';
import './editions.css';

function App(){
 const [catalog,setCatalog]=useState<CatalogPayload|null>(null),[browser,setBrowser]=useState<BrowserCatalog|null>(null);
 const [error,setError]=useState(false),[browserError,setBrowserError]=useState(false),[attempt,setAttempt]=useState(0);
 const mode=location.pathname.includes('/apk/')?'apk':location.pathname.includes('/browser/')?'browser':'home';
 const pwa=usePwaInstall(mode!=='apk');
 useEffect(()=>{
  if(mode==='home'&&new URLSearchParams(location.search).has('app')){location.replace(sitePath('apk/')+location.search);return;}
  let current=true;setError(false);setBrowserError(false);
  loadCatalog().then(data=>{if(current)setCatalog(data);}).catch(()=>{if(current)setError(true);});
  loadBrowserCatalog().then(data=>{if(current)setBrowser(data);}).catch(()=>{if(current){setBrowser(null);setBrowserError(true);}});
  if('serviceWorker'in navigator)navigator.serviceWorker.register(sitePath('sw.js')).catch(()=>{});
  return()=>{current=false;};
 },[attempt]);
 if(catalog){
  if(mode==='apk')return <Store initial={catalog}/>;
  if(!browser&&!browserError)return <main className="loading-screen"><h1>ZatuPlay</h1><p role="status">ブラウザ版の公開情報を読み込んでいます…</p></main>;
  return mode==='browser'?<BrowserCollection catalog={catalog} browser={browser} error={browserError} retry={()=>setAttempt(n=>n+1)} pwa={pwa}/>:<Home catalog={catalog} browser={browser} browserError={browserError} pwa={pwa}/>;
 }
 return <main className="loading-screen"><h1>ZatuPlay</h1><p role="status">{error?'アプリ一覧を読み込めませんでした。通信状態を確認して、もう一度お試しください。':'アプリ一覧を読み込んでいます…'}</p>{error&&<button className="button primary" onClick={()=>setAttempt(n=>n+1)}>もう一度読み込む</button>}</main>;
}
createRoot(document.getElementById('root')!).render(<App/>);
