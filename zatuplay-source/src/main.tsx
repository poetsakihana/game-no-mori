import {useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import Store from './Store';
import {loadCatalog,type CatalogPayload} from './lib/drive-catalog';
import './store.css';

function App(){
  const [catalog,setCatalog]=useState<CatalogPayload|null>(null);
  const [error,setError]=useState(false);
  const [attempt,setAttempt]=useState(0);
  useEffect(()=>{
    let current=true;
    setError(false);
    loadCatalog().then(data=>{if(current)setCatalog(data);}).catch(()=>{if(current)setError(true);});
    return()=>{current=false;};
  },[attempt]);
  if(catalog)return <Store initial={catalog}/>;
  return <main className="loading-screen"><h1>ZatuPlay</h1><p role="status">{error?'アプリ一覧を読み込めませんでした。通信状態を確認して、もう一度お試しください。':'アプリ一覧を読み込んでいます…'}</p>{error&&<button className="button primary" onClick={()=>setAttempt(n=>n+1)}>もう一度読み込む</button>}</main>;
}

createRoot(document.getElementById('root')!).render(<App/>);
