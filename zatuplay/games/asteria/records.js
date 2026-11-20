/* ASTERIA browser record storage. A single checked envelope keeps both versions together. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.AsteriaRecords = factory();
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';
  const KEY = 'asteria-web-records-v2';
  const LEGACY = 'asteria-save-v1';
  const ERROR = {
    conflict: '別のタブで記録が変わりました。再読み込みしてから続けてください。',
    blocked: '安全に保存できません。設定からセーブを書き出して、別のタブを閉じてください。',
    corrupt: '端末の記録を確認できませんでした。元の記録に上書きしていません。',
    empty: 'この端末に復元できる控えはありません。'
  };

  function open({ storage, locks, validate, fresh, onExternal, events }) {
    let current, raw, legacyRaw, damagedLegacy = false, invalid = false;
    let serial = Promise.resolve();
    function decode(value) {
      const record = JSON.parse(value);
      if (!record || record.format !== 'ASTERIA/2' || !Object.hasOwn(record,'backup')) throw Error(ERROR.corrupt);
      return { format: record.format, active: validate(record.active), backup: record.backup === null ? null : validate(record.backup) };
    }
    try {
      raw = storage.getItem(KEY);
      if (raw !== null) current = decode(raw);
      else {
        legacyRaw = storage.getItem(LEGACY);
        let active = fresh();
        if (legacyRaw !== null) {
          try { active = validate(JSON.parse(legacyRaw)); }
          catch { damagedLegacy = true; }
        }
        current = { format: 'ASTERIA/2',active,backup:null };
      }
    } catch { invalid = true; current = {format:'ASTERIA/2',active:fresh(),backup:null}; }

    function read() {
      return { active:current.active, hasBackup:current.backup!==null, warning:invalid||damagedLegacy?ERROR.corrupt:'' };
    }
    function withStorage(action) {
      if (typeof locks?.request !== 'function') return Promise.reject(Error(ERROR.blocked));
      return locks.request(KEY, action);
    }
    function change(mode, value) {
      const pending = serial.then(() => withStorage(() => {
        if (invalid || damagedLegacy && mode!=='import') throw Error(ERROR.corrupt);
        if (storage.getItem(KEY)!==raw || (raw===null && storage.getItem(LEGACY)!==legacyRaw)) throw Error(ERROR.conflict);
        const active=current.active, backup=current.backup;
        // A second reset of a fresh save must not discard the only useful copy.
        const next = { format:'ASTERIA/2', active, backup };
        if (mode==='restore') {
          if (backup===null) throw Error(ERROR.empty);
          next.active=backup; next.backup=active;
        } else if (mode==='reset') {
          next.active=validate({ ...fresh(), settings:active.settings });
          if (JSON.stringify(active)!==JSON.stringify(next.active)) next.backup=active;
        } else if (mode==='import') {
          next.active=validate(value);
          if (!damagedLegacy && JSON.stringify(active)!==JSON.stringify(next.active)) next.backup=active;
        } else {
          next.active=validate(value(active));
        }
        const encoded=JSON.stringify(next);
        if (encoded===raw) return read();
        try { storage.setItem(KEY,encoded); if(storage.getItem(KEY)!==encoded) throw Error(); }
        catch { throw Error(ERROR.blocked); }
        raw=encoded; current=next; damagedLegacy=false;
        return read();
      }));
      serial=pending.catch(()=>{});
      return pending;
    }
    function onStorage(event) {
      if ((event.key===KEY || event.key===null) && (event.newValue!==raw) || raw===null && event.key===LEGACY && event.newValue!==legacyRaw) {
        onExternal?.(ERROR.conflict);
      }
    }
    events?.addEventListener('storage',onStorage);
    return {read,change,close:()=>events?.removeEventListener('storage',onStorage)};
  }
  function progress(completed, chapters, mainChapters) {
    const stages=chapters*5, mainStages=mainChapters*5;
    const hits=new Set(completed.filter(id=>Number.isInteger(id)&&id>=0&&id<stages));
    let main=0, stories=0;
    for(let chapter=0;chapter<chapters;chapter++) {
      let done=true;
      for(let stage=0;stage<5;stage++) {
        const id=chapter*5+stage;
        const won=hits.has(id);
        if (!won) done=false;
        if (won && id<mainStages) main++;
      }
      if (done) stories++;
    }
    return {done:hits.size,stages,stories,chapters,main,mainStages,mainEnding:main===mainStages,allEnding:hits.size===stages};
  }
  return {open,progress,KEY,LEGACY};
});
