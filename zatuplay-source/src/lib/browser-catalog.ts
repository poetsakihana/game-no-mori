import {sitePath} from './paths';
import type {AppRecord} from './catalog';

export type BrowserApp = Pick<AppRecord,'name'|'subtitle'|'description'|'category'|'color'|'tags'|'order'>;

export interface BrowserRelease {
  id: string;
  url: string;
  version: string;
  checkedAt: string;
  note?: string;
  app?: BrowserApp;
}
export interface BrowserCatalog {schemaVersion:1;apps:BrowserRelease[];updatedAt:string|null;}

export function mergeBrowserApps(catalog: BrowserCatalog|null, existing: (BrowserApp&{id:string})[]) {
 const ids=new Set(existing.map(app=>app.id));
 const browserOnly=(catalog?.apps??[]).flatMap(({id,app})=>app&&!ids.has(id)?[{...app,id}]:[]);
 return [...existing,...browserOnly];
}
// A browser release is separate from an APK. Never infer a playable URL from an APK filename.
export async function loadBrowserCatalog():Promise<BrowserCatalog>{
 const response=await fetch(sitePath('data/browser-catalog.json')+'?t='+Date.now(),{cache:'no-store',signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error('Browser catalog unavailable');
 const data=await response.json() as BrowserCatalog;
 if(data.schemaVersion!==1||!Array.isArray(data.apps))throw Error('Invalid browser catalog');
 const ids=new Set<string>();
 for(const app of data.apps){
   if(typeof app.id!=='string'||ids.has(app.id)||typeof app.url!=='string'||typeof app.checkedAt!=='string'||!app.checkedAt||Number.isNaN(Date.parse(app.checkedAt)))throw Error('Invalid browser release');
   if(app.app!==undefined){
     const metadata=app.app;
     if(!metadata||[metadata.name,metadata.subtitle,metadata.description,metadata.category,metadata.color].some(value=>typeof value!=='string')||
       !Array.isArray(metadata.tags)||metadata.tags.some(tag=>typeof tag!=='string')||!Number.isFinite(metadata.order))throw Error('Invalid browser app metadata');
   }
   const url=new URL(app.url,location.origin+sitePath());
   if(url.protocol!=='https:'&&!(url.origin===location.origin&&url.protocol==='http:'))throw Error('Invalid browser URL');
   ids.add(app.id);
   app.url=url.href;
 }
 return data;
}
