import {sitePath} from './paths';
export interface BrowserRelease {
  id: string;
  url: string;
  version: string;
  checkedAt: string;
  note?: string;
}
export interface BrowserCatalog {schemaVersion:1;apps:BrowserRelease[];updatedAt:string|null;}
// A browser release is separate from an APK. Never infer a playable URL from an APK filename.
export async function loadBrowserCatalog():Promise<BrowserCatalog>{
 const response=await fetch(sitePath('data/browser-catalog.json')+'?t='+Date.now(),{cache:'no-store',signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error('Browser catalog unavailable');
 const data=await response.json() as BrowserCatalog;
 if(data.schemaVersion!==1||!Array.isArray(data.apps))throw Error('Invalid browser catalog');
 const ids=new Set<string>();
 for(const app of data.apps){
   if(typeof app.id!=='string'||ids.has(app.id)||typeof app.url!=='string'||typeof app.checkedAt!=='string'||!app.checkedAt||Number.isNaN(Date.parse(app.checkedAt)))throw Error('Invalid browser release');
   const url=new URL(app.url,location.origin+sitePath());
   if(url.protocol!=='https:'&&!(url.origin===location.origin&&url.protocol==='http:'))throw Error('Invalid browser URL');
   ids.add(app.id);
   app.url=url.href;
 }
 return data;
}
