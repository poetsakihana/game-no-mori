/*
 * Sakura audio: original procedural compositions and synthesized sound effects.
 * No recordings, downloads, third-party scores, movement sounds, or autoplay.
 *
 * const audio = window.createGameAudio();
 * button.addEventListener('click', event => audio.unlock(event));
 * audio.setScene('stage', 'sea'); // Or a zero-based world index, 0..19.
 * audio.playSE('attack', {source: 'player', power: 1});
 * audio.setSettings({bgmEnabled:true, seEnabled:true, bgmVolume:.4, seVolume:.55});
 * audio.getSettings(); audio.getStatus(); audio.getTrackInfo();
 * audio.setMuted(true); // Transient master mute; does not alter stored settings.
 * audio.pause(); audio.resume(); audio.destroy();
 *
 * unlock(event) is the ONLY entry point that creates/resumes an AudioContext.
 * It requires a trusted click, pointer, touch, or keyboard gesture and resolves
 * true/false without rejecting. Call it on later gestures to retry interruption.
 * pause/resume affect scheduling; resume() never bypasses browser audio policy.
 * Scenes: menu, story, tutorial, stage, boss, seasonal, festival, victory.
 * Stage variants: sakura, sea, autumn, winter, stars, or world index 0..19.
 * Seasonal variants: summer, autumn, winter, stars (default: summer).
 * SE: ui, attack, dodge, special, hit, damage, collect, clear. Unknown effects are silent.
 * getStatus().playing describes BGM scheduling, not an audible-output guarantee.
 * destroy removes listeners/timers, stops/disconnects voices and closes context.
 */
(function (global) {
  'use strict';

  const STORAGE_KEY = 'sakihana-audio-settings-v1';
  const DEFAULTS = Object.freeze({bgmEnabled:true, seEnabled:true, bgmVolume:0.4, seVolume:0.55});
  const WORLD_THEMES = ['sakura','sea','autumn','winter','stars','sea','autumn','winter','stars','sakura','sea','autumn','winter','stars','sakura','sea','autumn','winter','stars','stars'];
  const GESTURES = new Set(['click','pointerdown','pointerup','touchstart','touchend','keydown']);
  const SCENES = new Set(['menu','story','tutorial','stage','boss','seasonal','festival','victory']);
  const THROTTLES = Object.freeze({ui:0.075, attack:0.12, dodge:0.22, special:0.5, hit:0.19, damage:0.35, collect:0.18, clear:1.5});
  // Every phrase contains 64 eighth-note slots (eight 4/4 bars), -1 = a rest.
  // These melodies, countermelodies and voicings are composed for this game.
  const TRACKS = {
    menu: {title:'Petal Welcome', bpm:88, root:62, lead:'pluck', pulse:0,
      melody:[0,4,7,9,7,4,2,-1, 0,4,7,12,9,7,4,-1, 2,5,9,12,9,5,4,2, 4,7,11,9,7,4,2,-1, 0,7,9,12,14,12,9,7, 5,9,12,14,12,9,5,-1, 4,7,9,7,4,2,4,7, 2,4,7,4,2,0,-1,-1],
      chords:[[0,4,7],[0,4,7],[5,9,12],[7,11,14],[9,12,16],[5,9,12],[0,4,7],[7,11,14]]},
    story: {title:'Ink and Moonlight', bpm:68, root:62, lead:'flute', pulse:0,
      melody:[7,-1,9,7,4,-1,2,-1, 0,-1,4,7,4,-1,-1,-1, 5,-1,9,12,9,-1,7,5, 4,-1,2,4,7,-1,-1,-1, 9,-1,12,14,12,-1,9,-1, 7,-1,5,4,5,-1,9,-1, 7,-1,4,2,4,7,4,-1, 2,-1,0,-1,-1,-1,-1,-1],
      chords:[[0,4,7],[9,12,16],[5,9,12],[0,4,7],[9,12,16],[5,9,12],[7,11,14],[0,4,7]]},
    tutorial: {title:'First Little Steps', bpm:100, root:60, lead:'pluck', pulse:1,
      melody:[0,2,4,-1,7,4,2,-1, 0,4,7,-1,9,7,4,-1, 5,7,9,-1,12,9,7,5, 4,2,0,-1,2,4,7,-1, 12,9,7,4,7,9,12,-1, 9,7,5,-1,5,9,12,-1, 7,4,2,-1,4,7,9,7, 4,2,0,-1,0,-1,-1,-1],
      chords:[[0,4,7],[0,4,7],[5,9,12],[7,11,14],[9,12,16],[5,9,12],[7,11,14],[0,4,7]]},
    sakura: {title:'Across the Blossom Path', bpm:112, root:62, lead:'pluck', pulse:1,
      melody:[0,4,7,4,9,7,4,2, 0,2,4,7,12,9,7,-1, 5,9,12,9,14,12,9,5, 7,11,14,12,11,7,4,2, 9,12,16,14,12,9,7,-1, 5,7,9,12,9,7,5,4, 4,7,12,9,7,4,2,4, 7,4,2,7,4,2,0,-1],
      chords:[[0,4,7],[0,4,7],[5,9,12],[7,11,14],[9,12,16],[5,9,12],[0,4,7],[7,11,14]]},
    sea: {title:'Tideglass Waltzing Light', bpm:104, root:65, lead:'marimba', pulse:1,
      melody:[7,9,12,-1,9,7,4,-1, 5,7,9,7,4,2,0,-1, 2,5,9,-1,12,9,5,2, 4,7,11,9,7,-1,4,7, 12,14,16,-1,14,12,9,7, 9,12,14,12,9,7,5,-1, 7,9,7,4,2,4,7,4, 5,4,2,-1,0,-1,7,-1],
      chords:[[0,4,7],[5,9,12],[2,5,9],[7,11,14],[0,4,7],[5,9,12],[7,11,14],[0,4,7]]},
    autumn: {title:'Amber Leaf Lanterns', bpm:96, root:57, lead:'marimba', pulse:1,
      melody:[0,3,7,-1,10,7,3,2, 0,2,3,7,5,3,2,-1, 5,8,12,-1,10,8,7,5, 7,10,14,12,10,7,3,-1, 12,10,7,3,7,10,12,-1, 8,10,12,10,8,7,5,-1, 3,7,10,7,5,3,2,3, 7,5,3,2,0,-1,-1,-1],
      chords:[[0,3,7],[3,7,10],[5,8,12],[7,10,14],[0,3,7],[8,12,15],[3,7,10],[7,10,14]]},
    winter: {title:'Snowbell Footprints', bpm:82, root:67, lead:'bell', pulse:0,
      melody:[12,-1,7,9,7,-1,4,-1, 9,-1,4,7,4,-1,2,-1, 5,-1,9,12,14,12,9,-1, 7,11,14,-1,11,7,4,-1, 12,-1,16,14,12,-1,9,-1, 14,-1,12,9,7,-1,5,-1, 7,9,12,-1,9,7,4,2, 4,-1,2,-1,0,-1,-1,-1],
      chords:[[0,4,7],[9,12,16],[5,9,12],[7,11,14],[0,4,7],[5,9,12],[7,11,14],[0,4,7]]},
    stars: {title:'Constellation Letters', bpm:90, root:64, lead:'bell', pulse:0,
      melody:[0,7,12,-1,11,7,4,-1, 2,9,14,-1,12,9,5,-1, 4,11,16,14,11,7,4,-1, 5,12,16,-1,14,12,9,-1, 12,16,19,-1,16,14,11,7, 9,14,17,-1,14,12,9,-1, 7,11,14,12,11,7,4,2, 4,7,12,-1,7,4,0,-1],
      chords:[[0,4,7],[2,5,9],[4,7,11],[5,9,12],[0,4,7],[2,5,9],[7,11,14],[0,4,7]]},
    boss: {title:'The Flower Guardian', bpm:138, root:62, lead:'reed', pulse:2,
      melody:[0,7,0,7,3,7,5,7, 0,7,10,7,3,2,0,-1, 5,12,5,12,8,12,10,12, 7,14,10,7,5,3,2,-1, 12,10,7,10,12,14,15,14, 12,8,5,8,12,10,8,5, 7,10,14,12,10,7,5,3, 2,5,7,10,7,5,2,-1],
      chords:[[0,3,7],[0,3,7],[5,8,12],[7,10,14],[0,3,7],[8,12,15],[5,8,12],[7,11,14]]},
    festival: {title:'Lantern Circle Dance', bpm:122, root:62, lead:'pluck', pulse:2,
      melody:[0,2,7,9,7,2,0,-1, 7,9,14,12,9,7,2,-1, 5,7,12,14,12,7,5,-1, 7,9,14,9,7,2,0,-1, 12,14,19,14,12,9,7,9, 12,9,7,5,7,12,14,-1, 9,7,2,0,2,7,9,7, 5,2,0,-1,0,-1,-1,-1],
      chords:[[0,7,9],[0,7,9],[5,7,12],[7,9,14],[0,7,12],[5,7,12],[7,9,14],[0,7,9]]},
    seasonal: {title:'A Gift for Every Season', bpm:110, root:60, lead:'marimba', pulse:1,
      melody:[7,12,9,7,4,7,9,-1, 4,9,7,4,2,4,7,-1, 5,9,12,9,7,5,4,5, 7,11,14,11,9,7,4,-1, 12,16,14,12,9,12,14,-1, 9,12,14,12,9,7,5,-1, 7,12,9,7,4,2,4,7, 5,4,2,4,2,0,-1,-1],
      chords:[[0,4,7],[9,12,16],[5,9,12],[7,11,14],[0,4,7],[5,9,12],[7,11,14],[0,4,7]]},
    victory: {title:'Poem in the Morning', bpm:116, root:62, lead:'bell', pulse:1,
      melody:[0,4,7,-1,12,-1,9,7, 12,14,16,-1,14,12,9,-1, 5,9,12,-1,14,12,9,5, 7,11,14,-1,12,11,7,-1, 12,16,19,-1,16,14,12,-1, 9,12,17,16,14,12,9,-1, 7,9,12,14,16,14,12,9, 7,4,2,4,0,-1,-1,-1],
      chords:[[0,4,7],[0,4,7],[5,9,12],[7,11,14],[0,4,7],[5,9,12],[7,11,14],[0,4,7]]}
  };

  function validSettings(value, fallback) {
    const out = Object.assign({}, fallback);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return out;
    ['bgmEnabled','seEnabled'].forEach(key => { if (typeof value[key] === 'boolean') out[key] = value[key]; });
    ['bgmVolume','seVolume'].forEach(key => {
      if (typeof value[key] === 'number' && Number.isFinite(value[key])) out[key] = Math.max(0, Math.min(1, value[key]));
    });
    return out;
  }
  function stageTheme(value) {
    if (typeof value === 'number' && Number.isInteger(value)) return WORLD_THEMES[Math.max(0, Math.min(19,value))];
    if (typeof value === 'string' && ['sakura','sea','autumn','winter','stars'].includes(value)) return value;
    return 'sakura';
  }
  function frequency(midi) { return 440 * Math.pow(2,(midi - 69) / 12); }

  global.createGameAudio = function createGameAudio() {
    let settings = Object.assign({}, DEFAULTS), storageError = false, audioError = '';
    let ctx = null, bgmBus = null, seBus = null, master = null, compressor = null;
    let scheduler = null, pendingUnlock = null, destroyed = false, unlocked = false;
    let manualPause = false, muted = false, hidden = !!(global.document && global.document.hidden);
    let scene = 'menu', variant = '', step = 0, nextTime = 0;
    let lastSE = -Infinity, lastCPU = -Infinity, noiseBuffer = null;
    const effectTimes = Object.create(null), voices = new Set();
    const AudioContextCtor = global.AudioContext || global.webkitAudioContext;
    const doc = global.document;
    try {
      const raw = global.localStorage.getItem(STORAGE_KEY);
      if (raw !== null) {
        if (raw.length > 2048) throw new Error('oversized settings');
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) || parsed.version !== 1) throw new Error('invalid settings');
        settings = validSettings(parsed, DEFAULTS);
      }
    } catch (_) { storageError = true; }

    function track() {
      const base = TRACKS[scene === 'stage' ? stageTheme(variant) : scene];
      if (scene !== 'seasonal') return base;
      // A shared seasonal melody is re-orchestrated for the selected event.
      const overrides = {summer:{root:65,bpm:118,lead:'marimba'}, autumn:{root:60,bpm:100,lead:'pluck'}, winter:{root:67,bpm:90,lead:'bell'}, stars:{root:64,bpm:96,lead:'bell'}};
      return Object.assign({}, base, overrides[variant] || overrides.summer);
    }
    function active() { return !!ctx && ctx.state === 'running' && unlocked && !destroyed && !manualPause && !hidden && !muted; }
    function bgmActive() { return active() && settings.bgmEnabled && settings.bgmVolume > 0; }
    function gainTo(node, value) {
      if (!node || !ctx) return;
      try { node.gain.cancelScheduledValues(ctx.currentTime); node.gain.setTargetAtTime(value,ctx.currentTime,0.025); } catch (_) {}
    }
    function syncGains() {
      gainTo(bgmBus,settings.bgmEnabled ? settings.bgmVolume * 0.72 : 0);
      gainTo(seBus,settings.seEnabled ? settings.seVolume * 0.7 : 0);
      gainTo(master,active() ? 0.72 : 0);
    }
    function disposeVoice(v) {
      if (!voices.delete(v)) return;
      try { v.source.disconnect(); } catch (_) {}
      try { v.envelope.disconnect(); } catch (_) {}
      if (v.pan) { try { v.pan.disconnect(); } catch (_) {} }
    }
    function stopVoices(bus) {
      for (const v of Array.from(voices)) {
        if (bus && v.bus !== bus) continue;
        try { v.envelope.gain.cancelScheduledValues(ctx.currentTime); v.envelope.gain.setTargetAtTime(0,ctx.currentTime,0.008); v.source.stop(ctx.currentTime + 0.04); } catch (_) {}
        // Keep the short release connected; onended releases references.
        if (destroyed) disposeVoice(v);
      }
    }
    function voice(midi, time, duration, volume, type, bus, pan, endMidi, useNoise) {
      if (!ctx || voices.size >= 64 || !Number.isFinite(time) || duration <= 0) return;
      let source, envelope, panNode = null, record = null;
      try {
        source = useNoise ? ctx.createBufferSource() : ctx.createOscillator();
        envelope = ctx.createGain();
        if (useNoise) { source.buffer = noiseBuffer; source.loop = true; }
        else {
          source.type = type || 'sine';
          source.frequency.setValueAtTime(frequency(midi), time);
          if (Number.isFinite(endMidi)) source.frequency.exponentialRampToValueAtTime(frequency(endMidi), time + duration);
        }
        const attack = Math.min(0.018,duration * 0.12);
        envelope.gain.setValueAtTime(0, time);
        envelope.gain.linearRampToValueAtTime(volume, time + attack);
        envelope.gain.exponentialRampToValueAtTime(0.0001,time + duration);
        source.connect(envelope);
        if (typeof ctx.createStereoPanner === 'function') {
          panNode = ctx.createStereoPanner(); panNode.pan.setValueAtTime(pan || 0,time); envelope.connect(panNode); panNode.connect(bus);
        } else envelope.connect(bus);
        record = {source,envelope,pan:panNode,bus}; voices.add(record);
        source.onended = () => disposeVoice(record);
        source.start(time); source.stop(time + duration + 0.03);
      } catch (_) {
        if (record) disposeVoice(record);
        else { for (const n of [source,envelope,panNode]) { try { if(n)n.disconnect(); } catch (_) {} } }
      }
    }
    function instrument(midi,time,duration,volume,kind,pan) {
      if (kind === 'bell') {
        voice(midi,time,duration * 1.3,volume,'sine',bgmBus,pan);
        voice(midi + 19,time,duration * 0.35,volume * 0.18,'sine',bgmBus,pan);
      } else if (kind === 'flute') {
        voice(midi,time,duration * 1.2,volume * 0.85,'sine',bgmBus,pan);
        voice(midi + 12,time,duration * 0.8,volume * 0.07,'sine',bgmBus,pan);
      } else if (kind === 'reed') {
        voice(midi,time,duration * 0.85,volume * 0.65,'triangle',bgmBus,pan);
        voice(midi - 12,time,duration * 0.75,volume * 0.17,'sine',bgmBus,pan);
      } else if (kind === 'marimba') {
        voice(midi,time,duration * 0.75,volume,'sine',bgmBus,pan);
        voice(midi + 12,time,duration * 0.24,volume * 0.2,'triangle',bgmBus,pan);
      } else {
        voice(midi,time,duration,volume * 0.8,'triangle',bgmBus,pan);
        voice(midi + 12,time,duration * 0.3,volume * 0.13,'sine',bgmBus,pan);
      }
    }
    function scheduleStep(index,time) {
      const t = track(), tick = 60 / t.bpm / 4, bar = Math.floor(index / 16), beat = index % 16;
      const chord = t.chords[bar % t.chords.length];
      if (index % 2 === 0) {
        const note = t.melody[(index / 2) % t.melody.length];
        if (note >= 0) instrument(t.root + 12 + note,time,tick * 2.9,0.135,t.lead,0.12);
        const arp = chord[(index / 2 + bar) % 3];
        instrument(t.root + arp,time,tick * 2.1,scene === 'story' ? 0.032 : 0.045,'marimba',-0.28);
      }
      if (beat % 4 === 0) {
        const bass = chord[beat === 8 ? 2 : 0];
        voice(t.root - 24 + bass,time,tick * 3.8,0.115,'sine',bgmBus,-0.05);
      }
      if (beat === 0) {
        chord.forEach((n,i) => voice(t.root + n,time + i * 0.012,tick * 13,0.026,'sine',bgmBus,(i - 1) * 0.35));
      }
      if (t.pulse && beat % 4 === 0) {
        // Soft pitched hand-drum, with no sampled percussion assets.
        voice(beat % 8 === 0 ? 44 : 63,time,0.075,beat % 8 === 0 ? 0.075 : 0.034,'sine',bgmBus,-0.18,beat % 8 === 0 ? 28 : 48);
      }
      if (t.pulse === 2 && beat % 4 === 2) voice(83,time,0.035,0.017,'triangle',bgmBus,0.25,75);
    }
    function stopScheduler() { if (scheduler !== null) { global.clearInterval(scheduler); scheduler = null; } }
    function tick() {
      if (!bgmActive()) { stopScheduler(); return; }
      const interval = 60 / track().bpm / 4;
      // No catch-up bursts after a suspended tab, slow frame, or interruption.
      if (nextTime < ctx.currentTime - 0.15) nextTime = ctx.currentTime + 0.025;
      let count = 0;
      while (nextTime < ctx.currentTime + 0.12 && count++ < 8) {
        scheduleStep(step,nextTime); step = (step + 1) % 128; nextTime += interval;
      }
    }
    function startScheduler() {
      syncGains();
      if (!bgmActive() || scheduler !== null) return;
      nextTime = ctx.currentTime + 0.035;
      tick(); scheduler = global.setInterval(tick,40);
    }
    function silence() { stopScheduler(); stopVoices(); syncGains(); }
    function makeGraph() {
      ctx = new AudioContextCtor();
      bgmBus = ctx.createGain(); seBus = ctx.createGain(); master = ctx.createGain();
      bgmBus.gain.value = 0; seBus.gain.value = 0; master.gain.value = 0;
      bgmBus.connect(master); seBus.connect(master);
      if (typeof ctx.createDynamicsCompressor === 'function') {
        compressor = ctx.createDynamicsCompressor();
        compressor.threshold.value = -16; compressor.knee.value = 18;
        compressor.ratio.value = 4; compressor.attack.value = 0.004; compressor.release.value = 0.16;
        master.connect(compressor); compressor.connect(ctx.destination);
      } else master.connect(ctx.destination);
      noiseBuffer = ctx.createBuffer(1,4096,ctx.sampleRate);
      const samples = noiseBuffer.getChannelData(0); let seed = 7391, previous = 0;
      for (let i = 0; i < samples.length; i++) {
        seed = (seed * 16807) % 2147483647;
        previous = previous * 0.72 + (seed / 2147483647 * 2 - 1) * 0.28;
        samples[i] = previous;
      }
      ctx.onstatechange = () => {
        if (destroyed) return;
        if (ctx.state !== 'running') silence();
        else if (unlocked) startScheduler();
      };
    }
    function onVisibility() {
      hidden = !!doc.hidden;
      if (hidden) silence(); else startScheduler();
    }
    function onPageHide() { hidden = true; silence(); }
    function onPageShow() { hidden = !!(doc && doc.hidden); if (!hidden) startScheduler(); }
    if (doc) doc.addEventListener('visibilitychange',onVisibility);
    if (global.addEventListener) { global.addEventListener('pagehide',onPageHide); global.addEventListener('pageshow',onPageShow); }

    const api = {
      unlock(event) {
        if (destroyed) return Promise.resolve(false);
        if (!event || event.isTrusted !== true || !GESTURES.has(event.type) || (global.Event && !(event instanceof global.Event)) || (global.navigator && global.navigator.userActivation && !global.navigator.userActivation.isActive)) { audioError = 'gesture-required'; return Promise.resolve(false); }
        if (!AudioContextCtor) { audioError = 'unsupported'; return Promise.resolve(false); }
        if (pendingUnlock) return pendingUnlock;
        try { if (!ctx) makeGraph(); }
        catch (_) {
          audioError = 'context-failed';
          if (ctx) { try { const closing = ctx.close(); if(closing && closing.catch)closing.catch(() => {}); } catch (_) {} }
          ctx = null; bgmBus = null; seBus = null; master = null; compressor = null; noiseBuffer = null;
          return Promise.resolve(false);
        }
        const currentContext = ctx;
        let attempt;
        try { attempt = ctx.state === 'running' ? Promise.resolve() : ctx.resume(); }
        catch (_) { audioError = 'resume-failed'; return Promise.resolve(false); }
        pendingUnlock = Promise.resolve(attempt).then(() => {
          if (destroyed || ctx !== currentContext || ctx.state !== 'running') return false;
          unlocked = true; audioError = ''; startScheduler(); return true;
        }, () => { audioError = 'resume-failed'; return false; }).then(result => { pendingUnlock = null; return result; });
        return pendingUnlock;
      },
      setScene(name, nextVariant) {
        if (destroyed) return;
        const nextScene = SCENES.has(name) ? name : 'menu';
        const v = nextScene === 'stage' ? stageTheme(nextVariant) : nextScene === 'seasonal' ? (['summer','autumn','winter','stars'].includes(nextVariant) ? nextVariant : 'summer') : '';
        if (scene === nextScene && variant === v) return;
        scene = nextScene; variant = v; step = 0;
        stopScheduler(); stopVoices(bgmBus); startScheduler();
      },
      playSE(name, options) {
        if (!Object.prototype.hasOwnProperty.call(THROTTLES,name) || !active() || !settings.seEnabled || settings.seVolume <= 0) return false;
        const now = ctx.currentTime, cpu = !!(options && options.source === 'cpu');
        if ((name !== 'clear' && now - lastSE < 0.035) || now - (effectTimes[name] === undefined ? -Infinity : effectTimes[name]) < THROTTLES[name] || (cpu && now - lastCPU < 0.45)) return false;
        lastSE = now; effectTimes[name] = now; if(cpu)lastCPU = now;
        const p = options && typeof options.power === 'number' && Number.isFinite(options.power) ? Math.max(0.25,Math.min(1.25,options.power)) : 1;
        const level = p * (cpu ? 0.38 : 1), time = now + 0.006;
        const tone = (m,delay,duration,volume,type,end) => voice(m,time + delay,duration,volume * level,type || 'sine',seBus,0,end);
        if (name === 'ui') { tone(81,0,0.085,0.16,'sine'); tone(88,0.045,0.12,0.09,'sine'); }
        if (name === 'attack') { tone(66,0,0.095,0.18,'triangle',42); voice(0,time,0.075,0.055 * level,'sine',seBus,0,null,true); }
        if (name === 'dodge') { tone(70,0,0.13,0.1,'sine',89); voice(0,time,0.13,0.043 * level,'sine',seBus,0,null,true); }
        if (name === 'special') { [62,66,69,74,78,81].forEach((m,i) => tone(m,i * 0.045,0.29,0.12,'triangle')); }
        if (name === 'hit') { tone(45,0,0.13,0.19,'triangle',32); tone(53,0,0.055,0.055,'sine'); }
        if (name === 'damage') { tone(58,0,0.19,0.14,'triangle',46); tone(51,0.035,0.17,0.09,'sine',39); }
        if (name === 'collect') { tone(86,0,0.11,0.13,'sine'); tone(93,0.07,0.22,0.1,'sine'); }
        if (name === 'clear') { stopVoices(seBus); [74,78,81,86].forEach((m,i) => tone(m,i * 0.1,0.5,0.12,'sine')); }
        return true;
      },
      setSettings(values) {
        if (destroyed) return Object.assign({},settings);
        settings = validSettings(values,settings);
        try { global.localStorage.setItem(STORAGE_KEY,JSON.stringify(Object.assign({version:1},settings))); storageError = false; }
        catch (_) { storageError = true; }
        if (!settings.bgmEnabled || settings.bgmVolume === 0) { stopScheduler(); stopVoices(bgmBus); }
        if (!settings.seEnabled || settings.seVolume === 0) stopVoices(seBus);
        syncGains(); startScheduler(); return Object.assign({},settings);
      },
      getSettings() { return Object.assign({},settings); },
      getStatus() {
        return {supported:!!AudioContextCtor, unlocked, state:destroyed ? 'destroyed' : ctx ? ctx.state : 'locked', scene, variant, muted, paused:manualPause, hidden, playing:bgmActive() && scheduler !== null, storageError, audioError};
      },
      getTrackInfo() {
        const t = track();
        return {id:scene === 'stage' ? variant : scene === 'seasonal' ? 'seasonal-' + variant : scene,title:t.title,bpm:t.bpm,bars:8,beatsPerBar:4,loopSeconds:32 * 60 / t.bpm};
      },
      setMuted(value) {
        if (destroyed) return;
        muted = value === true;
        if (muted) silence(); else startScheduler();
      },
      pause() { if(destroyed)return; manualPause = true; silence(); },
      resume() { if(destroyed)return; manualPause = false; startScheduler(); },
      destroy() {
        if (destroyed) return;
        destroyed = true; unlocked = false; silence();
        if(doc)doc.removeEventListener('visibilitychange',onVisibility);
        if(global.removeEventListener) { global.removeEventListener('pagehide',onPageHide); global.removeEventListener('pageshow',onPageShow); }
        if(ctx) {
          ctx.onstatechange = null;
          try { const closing = ctx.close(); if(closing && closing.catch)closing.catch(() => {}); } catch (_) {}
        }
        [bgmBus,seBus,master,compressor].forEach(n => { try { if(n)n.disconnect(); } catch (_) {} });
        noiseBuffer = null;
      }
    };
    return Object.freeze(api);
  };
})(typeof window !== 'undefined' ? window : globalThis);
