import {Cinema} from './cinematic.js';

const MOVIES={
 'd1-opening':'movies/DoragonOut_Opening.mp4',
 'd3-ending':'movies/DoragonOut_Ending.mp4'
};
const $=s=>document.querySelector(s);
const minute=s=>Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0');
const clamp=(n,max=300)=>Math.max(0,Math.min(max,Number(n)||0));

class MediaClock {
 constructor(video,duration,start){this.video=video;this.duration=duration;this.pending=start;this._paused=false;}
 get time(){return this.video.readyState?this.video.currentTime:this.pending;}
 get paused(){return this._paused;}
 set paused(value){this._paused=!!value;if(value)this.video.pause();else this.video.play().catch(()=>{this._paused=true;});}
 seek(value){this.pending=clamp(value,this.duration);if(this.video.readyState)this.video.currentTime=this.pending;}
}

/** MP4 for the first opening/final ending; the other four films retain their original renderer. */
export class MovieCinema extends Cinema {
 constructor(images,sound,settings){
  super(images,sound,settings);
  this.video=document.createElement('video');this.video.id='film-video';
  this.video.playsInline=true;this.video.preload='metadata';
  this.video.setAttribute('aria-label','字幕・BGM付き DoragonOut ムービー');
  this.root.prepend(this.video);
  this.originalFootnote=$('.film-footnote').textContent;
  this.video.addEventListener('ended',()=>{if(this.mediaActive)this.finish('watched');});
  this.video.addEventListener('error',()=>{if(this.mediaActive)this.fallback();});
  this.video.addEventListener('loadedmetadata',()=>{
   if(!this.mediaActive)return;
   this.clock.seek(this.clock.pending);
   if(!this.clock.paused)this.video.play().catch(()=>{this.clock._paused=true;});
  });
  this.video.addEventListener('pause',()=>{if(this.mediaActive&&!this.video.ended)this.clock._paused=true;});
  this.video.addEventListener('play',()=>{if(this.mediaActive)this.clock._paused=false;});
 }
 play(film,options={}){
  if(!MOVIES[film.id]){this.mediaActive=false;super.play(film,options);return;}
  this.film=film;this.mediaActive=true;this.active=true;
  this.onProgress=options.onProgress;this.onDone=options.onDone;
  const start=clamp(options.start>=film.duration?0:options.start,film.duration);
  this.saveAt=start;this.clock=new MediaClock(this.video,film.duration,start);
  this.root.classList.add('mp4-film');this.root.hidden=false;
  $('.film-footnote').textContent='字幕・BGM付き MP4 / 全編 5:00';
  $('#film-title').textContent=film.title;$('#film-pause').textContent='一時停止';
  // The score is already mixed into the movie. Silence the field music during playback.
  this.muteMusic();
  this.video.volume=clamp(this.settings.volume??.55,1);
  this.video.src=MOVIES[film.id];this.video.load();
  this.video.play().catch(()=>{if(this.mediaActive)this.clock._paused=true;});
  $('#film-pause').focus();
  this.frameId=requestAnimationFrame(t=>this.frame(t));
 }
 frame(now){
  if(!this.mediaActive){super.frame(now);return;}
  if(!this.active)return;
  const time=this.clock.time;
  $('#film-time').textContent=minute(time)+' / '+minute(this.film.duration);
  $('#film-seek').value=time;
  $('#film-scene').textContent='MP4';
  $('#film-pause').textContent=this.clock.paused?'再生する':'一時停止';
  if(Math.abs(time-this.saveAt)>=5){this.saveAt=time;this.onProgress?.(time);}
  this.frameId=requestAnimationFrame(t=>this.frame(t));
 }
 seek(time){if(!this.mediaActive){super.seek(time);return;}this.clock.seek(time);this.onProgress?.(this.clock.time);}
 muteMusic(){
  const now=this.sound.ctx?.currentTime||0;
  for(const node of [this.sound.musicGain,this.sound.airGain])if(node){node.gain.cancelScheduledValues(now);node.gain.setValueAtTime(0,now);}
 }
 restore(){
  this.root.classList.remove('mp4-film');$('.film-footnote').textContent=this.originalFootnote;
  this.sound.apply?.(this.settings);
  this.sound.setScene?.(this.sound.biome);
 }
 finish(status){
  if(!this.mediaActive){super.finish(status);return;}
  const time=this.clock.time;
  this.mediaActive=false;this.active=false;cancelAnimationFrame(this.frameId);
  this.video.pause();this.video.removeAttribute('src');this.video.load();
  this.root.hidden=true;this.restore();this.onDone?.(status,time);
 }
 fallback(){
  const film=this.film,options={start:this.clock.time,onProgress:this.onProgress,onDone:this.onDone};
  this.mediaActive=false;this.active=false;cancelAnimationFrame(this.frameId);
  this.video.pause();this.video.removeAttribute('src');this.video.load();this.restore();
  // Unsupported device decoders can still show the complete scripted film.
  super.play(film,options);
 }
}
