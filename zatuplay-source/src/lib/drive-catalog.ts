import type {AppRecord} from './catalog';

export interface DriveVersion {
  fileId:string; filename:string; version:string; size:number;
  modifiedAt:string; viewUrl:string; available:boolean;
}
export interface DriveApp extends AppRecord {
  source:'drive'; versions:DriveVersion[]; available:boolean;
  driveUrl:string; modifiedAt:string;
}
export interface CatalogPayload {
  schemaVersion:1; apps:DriveApp[]; revision:string|null; checkedAt:string|null;
  fileCount:number; availableCount:number; waitingCount:number;
}

// Only the public catalog is fetched; no credentials or private APIs are used.
export async function loadCatalog():Promise<CatalogPayload> {
  const url=new URL('./data/app-catalog.json',document.baseURI);
  url.searchParams.set('t',String(Date.now()));
  const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw Error('Catalog unavailable');
  const data=await response.json() as CatalogPayload;
  if(data.schemaVersion!==1||!Array.isArray(data.apps)||!Number.isSafeInteger(data.fileCount))throw Error('Invalid catalog');
  const ids=new Set<string>();
  let versions=0;
  for(const app of data.apps){
    if(typeof app.id!=='string'||ids.has(app.id)||!Array.isArray(app.versions)||app.versions.length===0)throw Error('Invalid app');
    ids.add(app.id);
    for(const version of app.versions){
      const link=new URL(version.viewUrl);
      if(link.protocol!=='https:'||link.hostname!=='drive.google.com'||link.pathname!=='/file/d/'+version.fileId+'/view')throw Error('Invalid download link');
      if(!Number.isSafeInteger(version.size)||version.size<0||version.size===0&&version.available)throw Error('Invalid APK size');
      versions++;
    }
  }
  if(versions!==data.fileCount)throw Error('Incomplete catalog');
  return data;
}
