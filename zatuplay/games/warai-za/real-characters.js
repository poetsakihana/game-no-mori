/* Non-official game avatars; all speech, scripts and acting parameters are fictional. */
(()=>{
const sys=window.WARAI_CHARACTERS,roster=window.WARAI_REAL_ROSTER;
const catchLines=[s=>`${s}の説明、そこを整理しましょう！`,s=>`一度落ち着いて、${s}から考えます。`,s=>`${s}の話、ここから一気にいきますよ！`,s=>`${s}も、堂々と出番を迎えます！`,s=>`よく見ると、${s}の話がずれていますね。`,s=>`${s}の登場で、場面が大きく動きます！`,s=>`${s}と、ちょっとひと休みしましょう。`,s=>`さあ、${s}の話を楽しんでいきましょう！`,s=>`${s}の話、じっくり聞かせてください。`,s=>`待って、${s}にそんな展開がありますか！`];
const motions=['stamp','tilt','bounce','swing','lean','flourish','float','sway','bow','tremble'];
const groups=[...new Set(roster.map(r=>r.group))];
roster.forEach(r=>{
 const old=sys.designs[r.id],t=r.tone,style=motions.indexOf(t.motion),subject=old.subject;
 Object.assign(old,{world:groups.indexOf(r.group),variant:r.id%10,troupe:r.group,nickname:t.label+'（ゲーム内演出）',persona:'ゲーム内の演技トーン',tag:t.label,motion:t.motion,pitch:t.pitch,rate:t.rate,gap:t.gap,temper:t.note,belief:'実在の芸人名で演じる、ゲーム用の創作台本です。',costume:'ゲーム用のデフォルメ衣装・'+({suit:'スーツ',vest:'ベスト',shirt:'カジュアルシャツ',dress:'舞台ドレス',suspenders:'サスペンダー',tracksuit:'ジャージ',sport:'スポーツ衣装'}[r.look.outfit]),color:r.look.color,accent:'#e8c980',catchphrase:catchLines[style](subject),exitLine:`${subject}の話、今日はここまで。続きはまたこの劇場で。`,description:t.note+' これはゲーム内の演技設定で、本人の私生活や性格の評価ではありません。',source:r.source,group:r.group,realName:true,look:r.look});
});
sys.worlds=groups.map(name=>({name}));
function portrait(artist){
 const r=roster[artist.id],d=sys.designs[artist.id],l=r.look,i=r.id,v=i%10,c=l.color,h=l.hairColor,skin=['#edc3a1','#e4b491','#efc7a6','#dda985'][i%4],accent='#eacb8b';
 const b={slim:26,small:29,regular:33,tall:27,broad:43}[l.body],hw={slim:25,small:28,regular:30,tall:27,broad:35}[l.body],cy=64,base=l.body==='tall'?209:l.body==='small'?203:207;
 const hair={
 part:`<path d="M${79-hw-1} 55Q${75-hw} 21 79 21Q${113+hw/5} 20 ${80+hw} 55L${100+hw/5} 38L84 42L71 30L${79-hw+5} 44Z"/>`,
 slick:`<path d="M${79-hw-1} 55L${79-hw} 33Q75 12 ${79+hw} 32L${80+hw} 55L${74+hw} 39Q78 36 ${85-hw} 41Z"/><path d="M58 32L62 40M70 28L74 38M85 27L87 38M98 31L99 40" stroke="#ffffff27" stroke-width="2"/>`,
 square:`<path d="M${79-hw} 51V28H${79+hw}V52L${73+hw} 43L${85-hw} 43Z"/>`,
 bowl:`<path d="M${78-hw} 59Q${65-hw} 20 79 20Q${92+hw} 20 ${80+hw} 59L${74+hw} 48H${84-hw}Z"/>`,
 crop:`<path d="M${79-hw} 50Q${79-hw-1} 25 79 24Q${80+hw} 24 ${79+hw} 50L${74+hw} 39Q79 31 ${84-hw} 41Z"/>`,
 side:`<path d="M${79-hw} 57Q${67-hw} 20 79 20Q${98+hw} 18 ${79+hw} 52L${73+hw} 36Q87 55 ${85-hw} 49Z"/>`,
 spike:`<path d="M${79-hw} 54L${75-hw} 33L${89-hw} 36L59 13L74 27L86 7L94 29L111 17L105 40L${82+hw} 38L${78+hw} 55L95 38L81 43L65 35Z"/>`,
 recede:`<path d="M${79-hw} 59Q${72-hw} 28 62 27L60 45L${84-hw} 43L${84-hw} 57M98 27Q${91+hw} 31 ${79+hw} 60L${74+hw} 57L${73+hw} 42L101 44Z"/>`,
 bald:'',
 long:`<path d="M${79-hw-4} 53Q${68-hw} 15 79 18Q${93+hw} 15 ${79+hw+4} 53L${88+hw} 115L${69+hw} 110L${74+hw} 39L84 43L70 30L${84-hw} 45L${90-hw} 110L${69-hw} 114Z"/>`,
 bob:`<path d="M${79-hw-3} 54Q${70-hw} 16 79 18Q${89+hw} 17 ${79+hw+4} 54L${85+hw} 103Q${79+hw} 112 ${72+hw} 106V44L88 47L77 31L${85-hw} 47L${87-hw} 107Q${72-hw} 109 ${73-hw} 97Z"/>`
 }[l.hair];
 const eyes=v===1||v===6?'<path d="M56 65Q63 58 69 65M89 65Q96 58 103 65" fill="none"/>':v===2||v===9?'<path d="M56 64H69M89 64H102"/><circle cx="63" cy="66" r="2.7"/><circle cx="96" cy="66" r="2.7"/>':'<ellipse cx="63" cy="64" rx="3.5" ry="4"/><ellipse cx="96" cy="64" rx="3.5" ry="4"/>';
 const glasses=l.glasses==='rect'?'<rect x="49" y="54" width="26" height="21" rx="4"/><rect x="84" y="54" width="26" height="21" rx="4"/><path d="M75 62H84M45 59L49 60M110 60L114 59"/>':l.glasses==='round'?'<circle cx="62" cy="64" r="14"/><circle cx="97" cy="64" r="14"/><path d="M76 63H83"/>':'';
 const suit=`<path d="M${77-b} 119L64 108H94L${81+b} 119L${75+b} 185H${83-b}Z" fill="${c}"/><path d="M64 110L79 126L94 110L87 155H72Z" fill="#f4e8d3"/><path d="M64 110L72 137L61 130L68 146L74 181H${83-b}L${77-b} 119Z" fill="${c}"/><path d="M94 110L85 137L97 130L90 146L84 181H${75+b}L${81+b} 119Z" fill="${c}"/><path d="M76 123H82L86 145L79 153L73 145Z" fill="${['#b95c54','#d5b76a','#8f719d','#5c8d8d'][i%4]}"/><path d="M79 156V179M${78-b+7} 153H${78-b+20}M${78+b-20} 153H${78+b-7}" fill="none" stroke="#162e3f66" stroke-width="2"/>`;
 const clothes={
 suit,
 shirt:`<path d="M${77-b} 118L63 107H95L${81+b} 118L${75+b} 184H${83-b}Z" fill="${c}"/><path d="M63 108L79 124L95 108L90 133L79 124L68 133Z" fill="#f1e0bd"/><path d="M79 125V180" stroke="#233a4166" fill="none"/>${[139,154,169].map(y=>`<circle cx="84" cy="${y}" r="2.2" fill="#f7e9cd"/>`).join('')}`,
 vest:`<path d="M${77-b} 119L62 107H96L${81+b} 119L${75+b} 184H${83-b}Z" fill="#f8ebd7"/><path d="M61 111L79 134L96 111L${75+b} 184H${83-b}Z" fill="${c}"/><path d="M79 133V181M${83-b} 173H${75+b}" fill="none" stroke="#f6d8cf" stroke-width="3"/><path d="M75 121H83L86 143L79 151L73 143Z" fill="#aa5564"/>`,
 dress:`<path d="M${77-b} 120L64 107H94L${81+b} 120L${81+b+5} 196Q79 205 ${77-b-4} 196Z" fill="${c}"/><path d="M64 108Q79 137 94 108M${80-b} 164H${78+b}" stroke="#efd7bd" stroke-width="4" fill="none"/>${[0,1,2,3].map(j=>`<circle cx="${63+j*11}" cy="127" r="2" fill="#efd7bd"/>`).join('')}`,
 suspenders:`<path d="M${77-b} 118L64 107H94L${81+b} 118L${75+b} 184H${83-b}Z" fill="${c}"/><path d="M60 111L65 183M99 111L94 183" stroke="#3a343b" stroke-width="8"/><path d="M65 110L79 123L94 110M79 124V180" fill="none" stroke="#a99e89" stroke-width="2"/>`,
 tracksuit:`<path d="M${77-b} 118L64 107H94L${81+b} 118L${75+b} 184H${83-b}Z" fill="${c}"/><path d="M56 116L61 182M102 116L97 182M79 111V183" fill="none" stroke="#efddb4" stroke-width="5"/><path d="M${77-b} 118L56 133M${81+b} 118L103 132" fill="none" stroke="#efddb4" stroke-width="5"/>`,
 sport:`<path d="M62 108H96L104 184H55Z" fill="${c}"/><path d="M62 108Q79 139 96 108" fill="none" stroke="#f5e9cf" stroke-width="6"/><rect x="66" y="141" width="27" height="20" rx="4" fill="#fbebca"/><path d="M73 151H86" stroke="${c}" stroke-width="3"/>`
 }[l.outfit];
 const bald=l.hair==='bald'||l.hair==='recede';
 const x1=79-b-5,x2=79+b+5,raise=[-12,-2,14,-18,3,-12,15,-7,1,-18][v];
 return `<svg class="character-svg" data-design="real-${i}" viewBox="0 -5 160 250" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><ellipse cx="80" cy="231" rx="45" ry="6" fill="#203a4220"/><g class="character" stroke="#273c43" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"><path d="M${91-b} 171L${86-b} 220H70L74 174M85 174L90 220H${72+b}L${67+b} 171" fill="#33444e"/><path d="M${86-b} 215H70V228H${76-b}Q${70-b} 223 ${86-b} 215M90 215H${72+b}Q${90+b} 223 ${84+b} 228H90Z" fill="#2a3942"/><path d="M${76-b} 228H70M90 228H${84+b}" stroke="#bfa78a" stroke-width="3"/><g class="costume">${clothes}</g><g class="arm-left"><path d="M${79-b} 122Q${69-b} 134 ${x1} ${153+raise}" stroke="${l.outfit==='vest'?'#f0e5d1':c}" stroke-width="14" fill="none"/><circle cx="${x1}" cy="${156+raise}" r="7" fill="${skin}"/></g><g class="arm-right"><path d="M${79+b} 122Q${90+b} 131 ${x2} ${147-raise/2}" stroke="${l.outfit==='vest'?'#f0e5d1':c}" stroke-width="14" fill="none"/><circle cx="${x2}" cy="${149-raise/2}" r="7" fill="${skin}"/></g><g class="signature-prop" transform="translate(${x1-1} ${149+raise}) rotate(${v%2?18:-14})"><rect x="-3" y="-15" width="6" height="23" rx="3" fill="#5a6d70"/><ellipse cx="0" cy="-20" rx="7" ry="9" fill="#576c73"/><path d="M-5-21H5M-5-18H5" stroke="#abc6c5" stroke-width="1.2"/></g><g class="head"><path d="M68 91V112Q79 122 91 112V91" fill="${skin}"/>${l.hair==='long'||l.hair==='bob'?`<g fill="${h}">${hair}</g>`:''}<ellipse cx="${79-hw}" cy="67" rx="6" ry="10" fill="${skin}"/><ellipse cx="${79+hw}" cy="67" rx="6" ry="10" fill="${skin}"/><path d="M${79-hw} 49Q${79-hw} ${bald?23:30} 79 ${bald?23:27}Q${79+hw} ${bald?23:28} ${79+hw} 49V78Q${79+hw} 103 79 ${l.body==='tall'?111:105}Q${79-hw} 101 ${79-hw} 78Z" fill="${skin}"/><g fill="${h}">${hair}</g><path d="M54 52Q62 ${v%3===0?45:48} 71 52M87 52Q96 ${v%3===1?45:48} 104 52" fill="none" stroke="${h}" stroke-width="3.6"/><g fill="#273c43">${eyes}</g><g class="glasses" stroke="#263b46" stroke-width="3" fill="none">${glasses}</g><path d="M78 64L74 78H82" stroke="#b88971" stroke-width="2" fill="none"/><ellipse cx="55" cy="79" rx="6" ry="3" fill="#d99c8877" stroke="none"/><ellipse cx="103" cy="79" rx="6" ry="3" fill="#d99c8877" stroke="none"/><path class="mouth-closed" d="${v%4===1?'M70 90H89':v%4===2?'M68 88Q79 101 92 87':'M68 88Q79 98 91 87'}" stroke="#73434a" stroke-width="3" fill="none"/><ellipse class="mouth-open" cx="79" cy="89" rx="8" ry="6" fill="#813e47"/><path class="tooth" d="M74 84H84V87H74Z" fill="#fff4db" stroke="none"/>${['森田哲矢','ケンドーコバヤシ','江口直人','ハリウッドザコシショウ'].includes(r.name)?`<path d="M65 86Q79 79 94 86M68 100Q79 106 91 100" stroke="${h}" stroke-width="3.5" fill="none"/>`:''}</g></g></svg>`;
}
sys.portrait=portrait;
})();
