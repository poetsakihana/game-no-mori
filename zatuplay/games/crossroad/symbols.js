// Game-original municipality marks. These are not official municipal emblems.
const municipalStations={};
for(const s of DATA.stations)(municipalStations[s.m]||=[]).push(s);
function municipalCount(key){return (municipalStations[key]||[]).filter(s=>state.cleared[s.id]).length;}
function acquiredMarks(){return Object.keys(DATA.municipalities).filter(k=>municipalCount(k)>0);}
function markArt(key,locked=false){
 const m=DATA.municipalities[key];let hash=2166136261;for(const c of key)hash=Math.imul(hash^c.charCodeAt(0),16777619)>>>0;
 const hue=hash%360,petals=5+(hash%4),r=19+(hash%8),label=m.n.replace(/市(?=.+区$)/,'');
 let shapes=Array.from({length:petals},(_,i)=>`<ellipse cx="60" cy="${60-r}" rx="9" ry="16" transform="rotate(${i*360/petals} 60 60)"/>`).join('');
 return `<svg class="municipal-symbol ${locked?'unearned':''}" viewBox="0 0 120 120" role="img" aria-label="${esc(m.n)}のゲームオリジナルマーク"><circle cx="60" cy="60" r="55" fill="hsl(${hue} 35% 94%)" stroke="hsl(${hue} 35% 45%)" stroke-width="3"/><circle cx="60" cy="60" r="47" fill="none" stroke="hsl(${hue} 30% 65%)" stroke-dasharray="2 6"/><g fill="hsl(${hue} 42% 55%)" opacity=".8">${shapes}</g><circle cx="60" cy="60" r="25" fill="hsl(${hue} 42% 30%)"/><text x="60" y="65" text-anchor="middle" font-size="${Math.min(14,Math.floor(64/label.length))}" font-weight="bold" fill="white">${esc(label)}</text><text x="60" y="102" text-anchor="middle" font-size="7" fill="hsl(${hue} 42% 30%)">CROSSROAD · ${String(m.p).padStart(2,'0')}</text></svg>`;
}
function rewardMark(key,fresh){const m=DATA.municipalities[key];return `<div class="symbol-reward">${markArt(key)}<span class="eyebrow">${fresh?'NEW MUNICIPALITY':'MUNICIPALITY COLLECTION'}</span><h3>${esc(m.n)}のマーク${fresh?'を獲得！':''}</h3><p class="muted">${esc(DATA.prefectures[m.p-1])} · ${municipalCount(key)} / ${municipalStations[key].length}駅クリア</p><small>ゲームオリジナルマーク</small></div>`;}
function renderMunicipalBook(){
 let q=$('#mark-search').value.trim(),p=+$('#mark-pref').value,only=$('#mark-earned').checked;
 let keys=Object.keys(DATA.municipalities).filter(k=>{const m=DATA.municipalities[k];return(!p||m.p===p)&&(!q||(m.n+DATA.prefectures[m.p-1]).includes(q))&&(!only||municipalCount(k));});
 $('#mark-count').textContent=`${keys.length}種類を表示 · 獲得 ${acquiredMarks().length} / ${Object.keys(DATA.municipalities).length}`;
 $('#municipal-book').innerHTML=keys.length?keys.map(k=>{const m=DATA.municipalities[k],n=municipalCount(k);return `<button class="mark-card ${n?'':'unearned'}" data-mark="${esc(k)}">${markArt(k,!n)}<b>${esc(m.n)}</b><small>${esc(DATA.prefectures[m.p-1])}</small><span>${n?'✓ '+n+' / '+municipalStations[k].length+'駅':'未獲得'}</span></button>`;}).join(''):'<p class="muted">該当するマークはありません。駅をクリアして集めよう。</p>';
 document.querySelectorAll('[data-mark]').forEach(b=>b.onclick=()=>{const k=b.dataset.mark,m=DATA.municipalities[k],n=municipalCount(k);modal(`${markArt(k,!n)}<h2>${esc(m.n)}</h2><p class="muted">${esc(DATA.prefectures[m.p-1])} · ${n} / ${municipalStations[k].length}駅クリア</p><p>${n?'この地域のマークを獲得済みです。':'この地域の駅をひとつクリアすると、マークを獲得できます。'}</p><p class="notes">自治体の公式市章・町章ではなく、ゲームオリジナルの記念マークです。</p><button class="bigbutton" id="mark-region" ${unlocked(m.p)?'':'disabled'}>この都道府県の駅へ →</button><button class="back" id="mark-close">コレクションに戻る</button>`);$('#mark-close').onclick=closeModal;$('#mark-region').onclick=()=>{closeModal();navigate('stations',m.p);};});
}
