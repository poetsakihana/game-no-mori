/* Browser persistence adapter. No network. All writes use Web Locks, never an unsafe CAS fallback. */
(() => {
  'use strict';
  const KEY = 'zatuplay:kotonoha-fortune:v1', LOCK = KEY + ':writer';
  const MAX_BYTES = 8 * 1024 * 1024;
  const screens = ['title','guides','topics','home','catalog','profile','manual','decks','allarts','artwork','gallery'];
  const fields = ['question','additional','method','theme','angle','oracleSearch','oracleType','name','gender','birth','time','place','zone','deck','cardname','manualQuestion','reflection','artQuestion','artBirth','artPartner','artObservation','artAction','artsCategory','artsStatus','artsSearch','search','deckKind','deckSearch','galleryKind','gallerySearch','galleryOracle'];
  const blank = () => ({profile:{}, sessions:[], journals:[], artSessions:[]});
  const obj = x => x !== null && typeof x === 'object' && !Array.isArray(x);
  const str = (v, max = 20000) => { if (typeof v !== 'string' || v.length > max) throw Error('text'); return v; };
  const optional = (v, max) => v == null ? '' : str(v, max);
  const array = (v, max) => { if (!Array.isArray(v) || v.length > max) throw Error('array'); return v; };
  const date = v => { str(v, 80); if (!Number.isFinite(Date.parse(v))) throw Error('date'); return v; };
  function validDate(v) {
    if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v) || v < '0001-01-01') return false;
    const d = new Date(v + 'T00:00:00Z');
    const now = new Date(), today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    return Number.isFinite(d.getTime()) && d.toISOString().slice(0,10) === v && v <= today;
  }
  function card(c) {
    if (!obj(c)) throw Error('card');
    const out = {name:str(c.name,500), word:optional(c.word,2000)};
    if (c.reverse !== undefined && typeof c.reverse !== 'boolean') throw Error('reverse');
    if (c.reverse !== undefined) out.reverse = c.reverse;
    for (const k of ['world','intent']) if (c[k] !== undefined) out[k] = str(c[k],500);
    return out;
  }
  function unique(list, key) { if (new Set(list.map(x=>x[key])).size !== list.length) throw Error('duplicate'); return list; }
  function normalizeData(d) {
    if (!obj(d) || !obj(d.profile)) throw Error('data');
    const out = blank(); let count = 0;
    for (const k of ['name','gender','birth','time','place','zone']) if (d.profile[k] !== undefined) out.profile[k] = str(d.profile[k],500);
    if (out.profile.birth && !validDate(out.profile.birth)) throw Error('birth');
    const entries = v => { const a = array(v,5000); count += a.length; if (!a.length || count > 30000) throw Error('entries'); return a; };
    out.sessions = unique(array(d.sessions,5000).map(s => {
      if (!obj(s)) throw Error('session');
      return {id:str(s.id,200),question:str(s.question),entries:entries(s.entries).map(e=>{
        if (!obj(e)) throw Error('entry');
        const r = {date:date(e.date),q:str(e.q),method:str(e.method,200),theme:str(e.theme,200),focus:str(e.focus,200),cards:array(e.cards,36).map(card),text:str(e.text),action:str(e.action),prompt:str(e.prompt),addition:optional(e.addition)};
        if (!r.cards.length) throw Error('cards');
        if (e.guide != null) r.guide = str(e.guide,200); else r.guide = null;
        if (e.oracleType != null) r.oracleType = str(e.oracleType,100); else r.oracleType = null;
        if (e.accumulated !== undefined) r.accumulated = array(e.accumulated,5001).map(x=>str(x));
        return r;
      })};
    }), 'id');
    out.journals = array(d.journals,30000).map(j=>{
      if (!obj(j)) throw Error('journal');
      const r = {deck:str(j.deck),card:str(j.card),note:str(j.note),question:optional(j.question),date:date(j.date)};
      if (j.consultationId !== undefined) r.consultationId = str(j.consultationId,200);
      if (j.round !== undefined) { if (!Number.isInteger(j.round) || j.round < 1 || j.round > 30000) throw Error('round'); r.round=j.round; }
      if (j.questions !== undefined) r.questions = array(j.questions,30000).map(x=>str(x));
      return r;
    });
    out.artSessions = unique(array(d.artSessions === undefined ? [] : d.artSessions,5000).map(s=>{
      if (!obj(s) || !/^art-(00[1-9]|0[1-9][0-9]|100)$/.test(s.artId)) throw Error('art');
      return {id:str(s.id,200),artId:s.artId,title:str(s.title),entries:entries(s.entries).map(e=>{
        if (!obj(e) || !['basic','work','journal'].includes(e.status)) throw Error('artEntry');
        const r = {question:str(e.question),observation:optional(e.observation),action:optional(e.action),birth:optional(e.birth,10),partner:optional(e.partner,10),date:date(e.date),guide:optional(e.guide,200),status:e.status,cards:array(e.cards,36).map(card)};
        if ((r.birth && !validDate(r.birth)) || (r.partner && !validDate(r.partner))) throw Error('artDate');
        return r;
      })};
    }), 'id');
    return out;
  }
  function normalizeUI(v = {}) {
    if (!obj(v)) throw Error('ui');
    const out = {screen:screens.includes(v.screen)?v.screen:'title',fields:{}};
    if (v.fields !== undefined && !obj(v.fields)) throw Error('fields');
    for (const k of fields) if (v.fields && v.fields[k] !== undefined) out.fields[k]=str(v.fields[k]);
    for (const k of ['active','manualActive','selectedGuide','selectedArt','activeArtSession']) out[k]=v[k] == null ? null : str(v[k],200);
    out.resultVisible=v.resultVisible===true; out.artResultVisible=v.artResultVisible===true; out.ritualPending=v.ritualPending===true;
    return out;
  }
  function decode(text, importing = false) {
    if (typeof text !== 'string' || text.length > MAX_BYTES) throw Error('size');
    const v=JSON.parse(text);
    if (obj(v) && v.app==='kotonoha-fortune' && v.schema===1) return {data:normalizeData(v.data),ui:normalizeUI(v.ui),revision:str(v.revision,200)};
    if (importing && obj(v) && v.version===1) return {data:normalizeData(v),ui:normalizeUI(),revision:''};
    throw Error('format');
  }
  function uuid() {
    if (globalThis.crypto && typeof crypto.randomUUID==='function') return crypto.randomUUID();
    if (globalThis.crypto && typeof crypto.getRandomValues==='function') { const b=new Uint8Array(16);crypto.getRandomValues(b);b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;return Array.from(b,(n,i)=>([4,6,8,10].includes(i)?'-':'')+n.toString(16).padStart(2,'0')).join(''); }
    return 'local-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
  }
  let baseline=null, initialData=blank(), initialUI=normalizeUI(), phase='ready', original=null, onStatus=()=>{};
  const locks = !!(navigator.locks && typeof navigator.locks.request==='function');
  try {
    baseline=localStorage.getItem(KEY);original=baseline;
    if (baseline!==null) { const v=decode(baseline);initialData=v.data;initialUI=v.ui; }
  } catch(e) { phase=baseline!==null?'corrupt':'unavailable'; }
  if (!locks && phase==='ready') phase='unsupported';
  function report(p) { phase=p;onStatus(p); }
  async function commit(snapshot, options={}) {
    let content;
    try { content={data:normalizeData(snapshot.data),ui:normalizeUI(snapshot.ui)}; } catch { report('invalid');return false; }
    if (!locks) { report('unsupported');return false; }
    if (!options.replace && ['corrupt','conflict','unavailable'].includes(phase)) { onStatus(phase);return false; }
    try {
      return await navigator.locks.request(LOCK, {mode:'exclusive'}, () => {
        if(options.shouldContinue && !options.shouldContinue()){report('cancelled');return false;}
        const current=localStorage.getItem(KEY);
        if (current !== (options.replace ? options.expected : baseline)) { report('conflict');return false; }
        if(!options.replace && current!==null){const old=decode(current);if(JSON.stringify({data:old.data,ui:old.ui})===JSON.stringify(content)){report('saved');return true;}}
        const raw=JSON.stringify({app:'kotonoha-fortune',schema:1,revision:uuid(),savedAt:new Date().toISOString(),...content});
        if (raw.length>MAX_BYTES) { report('quota');return false; }
        localStorage.setItem(KEY,raw);baseline=raw;report('saved');return true;
      });
    } catch(e) { report(e && e.name==='QuotaExceededError'?'quota':'unavailable');return false; }
  }
  window.addEventListener('storage',e=>{if((e.key===KEY||e.key===null)&&e.newValue!==baseline)report('conflict');});
  globalThis.KotonohaStore = {
    KEY, MAX_BYTES, fields, screens, initialData, initialUI, uuid, validDate, decode, normalizeData, normalizeUI, commit,
    get phase(){return phase;}, get original(){return original;}, get baseline(){return baseline;},
    getCurrent(){return localStorage.getItem(KEY);},
    subscribe(fn){onStatus=fn;fn(phase);},
    retry(){ if (phase==='quota'||phase==='invalid') report('ready'); else if(phase==='unavailable'){try{if(localStorage.getItem(KEY)===baseline)report(locks?'ready':'unsupported');else report('conflict');}catch{}} },
    encode(snapshot){return JSON.stringify({app:'kotonoha-fortune',schema:1,revision:uuid(),exportedAt:new Date().toISOString(),data:normalizeData(snapshot.data),ui:normalizeUI(snapshot.ui)},null,2);}
  };
})();
