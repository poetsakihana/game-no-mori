/* Original vector character system: 15 troupes × 10 deliberately different
   silhouettes, expressions and mannerisms. No real-person likenesses. */
(()=>{
const worlds=[
 {name:'琥珀喫茶団',title:'喫茶の錬金術師',color:'#623e32',accent:'#edbc64',hair:'#542d2b',costume:'燕尾のエプロンと大きなカップ帽',belief:'日常の注文に、人生を変える大事件を見つける。'},
 {name:'銀河駅前一座',title:'暴走しない車掌',color:'#344a69',accent:'#e4ba59',hair:'#242f45',costume:'金ボタンの車掌服と翼つき制帽',belief:'どんな話でも出発進行。話の終点だけはなかなか見えない。'},
 {name:'台所発明局',title:'空想の料理番',color:'#dc6750',accent:'#f7d46f',hair:'#6b3a33',costume:'ふくらむコック帽と縞エプロン',belief:'道具には隠れた才能があると信じ、調理の前に発明してしまう。'},
 {name:'言葉の魔法堂',title:'余白の魔法使い',color:'#665191',accent:'#d8bc75',hair:'#333251',costume:'紙の羽根つき魔法帽と星のローブ',belief:'辞書より想像力を信用する。本人の説明が一番の謎解き。'},
 {name:'宇宙妄想連盟',title:'地球育ちの宇宙人',color:'#4c9095',accent:'#f0ba6a',hair:'#45536b',costume:'透明な丸ヘルメットとレトロ宇宙服',belief:'地上の常識を宇宙規模で勘違いし、真顔で報告する。'},
 {name:'商店街万博',title:'売りこみの達人',color:'#ce663c',accent:'#ffe082',hair:'#59352f',costume:'市松のはっぴと派手なサンバイザー',belief:'何でも名物にする情熱家。買い物一つに大げさな物語を付ける。'},
 {name:'美学革命室',title:'寝ぐせのカリスマ',color:'#a24d77',accent:'#eac3c5',hair:'#6b2b57',costume:'大きなリボンと光沢のカットケープ',belief:'失敗してもポーズは崩さない。美しさの基準がいつも独特。'},
 {name:'公園妖精隊',title:'寄り道の案内人',color:'#54794e',accent:'#ebce78',hair:'#71533f',costume:'葉っぱの帽子と木の実ボタンのポンチョ',belief:'散歩で会う物すべてを仲間と見なし、公園を小さな国にする。'},
 {name:'放課後反省会',title:'常識の転校生',color:'#436c88',accent:'#edbf58',hair:'#313e4b',costume:'大きな学帽とパッチだらけの制服',belief:'授業のすべてを独自解釈。真面目に間違え、堂々と学び直す。'},
 {name:'定時防衛軍',title:'会議のラスボス',color:'#4d635e',accent:'#dbc26e',hair:'#263c3d',costume:'肩章つきビジネススーツと数字バッジ',belief:'小さな事務作業を国家プロジェクトにする。定時だけは守りたい。'},
 {name:'月灯り旅一座',title:'旅情の迷案内',color:'#654a7a',accent:'#e8bd7d',hair:'#332d40',costume:'大きな結い髪と月模様の羽織',belief:'旅先で情緒を感じすぎて、普通の設備まで伝説にしてしまう。'},
 {name:'音楽奇人楽団',title:'沈黙の大指揮者',color:'#334f74',accent:'#e9ae66',hair:'#3a2e3a',costume:'長いテールコートと音符のシルクハット',belief:'会話にも拍子があると思っている。休符だけはだいたい守れない。'},
 {name:'全力空回り部',title:'気合いの空回り王',color:'#d85c46',accent:'#f8d569',hair:'#4b3032',costume:'炎のヘッドバンドと太いラインのジャージ',belief:'練習より意気込みを先に発表し、失敗しても全力で立ち直る。'},
 {name:'手紙配達探偵局',title:'想いの迷配達人',color:'#467f83',accent:'#e8cc8c',hair:'#5d473b',costume:'封筒バッジの帽子と斜めがけ配達バッグ',belief:'荷物より想いを重く受け取り、日々の配達に事件を発見する。'},
 {name:'千両劇場隊',title:'大げさの千両役者',color:'#a84248',accent:'#e6b55e',hair:'#343341',costume:'扇の飾りと幾何学模様の舞台衣装',belief:'小さな話を大舞台の名場面に変える。何でも最後は大見得。'}
];
const personas=[
 {name:'熱量過剰の研究家',short:'ひらめき爆発',motion:'stamp',pitch:.85,rate:1.05,temper:'疑問を見つけると目が輝く。説明は大げさ、反省は素直。',catch:s=>`待って、${s}の可能性はまだある！`,exit:s=>`${s}研究、続きは反省会で発表します！`,reply:'研究発表の前に、話を最後まで聞いてください。'},
 {name:'美意識暴走のスター',short:'すべてが見せ場',motion:'flourish',pitch:1.2,rate:.94,temper:'どんな場面も決め顔。自分より小道具を輝かせたがる。',catch:s=>`${s}にも、スポットライトを。`,exit:s=>`最後は${s}と、優雅にお辞儀。`,reply:'ポーズは完璧。説明だけやり直しましょう。'},
 {name:'何でも事件にする探偵',short:'日常ミステリー',motion:'lean',pitch:.8,rate:.92,temper:'目を細めて観察し、普通の出来事を大事件に仕立てる。',catch:s=>`この${s}、ただものではない。`,exit:s=>`${s}の謎より、私の勘違いが解けました。`,reply:'犯人を探すより、使い方を確認してください。'},
 {name:'自信だけ百点の新人',short:'根拠なき大自信',motion:'bounce',pitch:1.12,rate:1.1,temper:'不安より自信が先に来る。注意されるほど元気に返事をする。',catch:s=>`${s}なら、たぶんプロです！`,exit:s=>`${s}のプロへの道、今日は一歩だけ前進！`,reply:'その「たぶん」がいちばん心配なんです。'},
 {name:'すぐ表彰する司会者',short:'なんでも大賞',motion:'swing',pitch:1,rate:1.03,temper:'小さなことにも拍手と表彰。自分の失敗にも大賞を贈る。',catch:s=>`本日の${s}大賞、決定です！`,exit:s=>`${s}大賞、反省の部は私でした！`,reply:'まだ審査する段階に入っていません。'},
 {name:'丁寧すぎる反逆者',short:'礼儀正しく大脱線',motion:'bow',pitch:.95,rate:.88,temper:'深々とお辞儀してから常識に異議を唱える。反論まで低姿勢。',catch:s=>`恐れ入ります、${s}に異議ありです。`,exit:s=>`${s}への異議は撤回し、丁重に反省いたします。`,reply:'ご丁寧ですが、その理屈はおかしいです。'},
 {name:'妄想先走りの王様',short:'脳内王国の主',motion:'sway',pitch:.78,rate:.93,temper:'道具を家臣に、日常を王国に変える。命令しても誰も従わない。',catch:s=>`わが${s}王国へようこそ！`,exit:s=>`${s}王国、まずは私から規則を守ります。`,reply:'王国の話は置いて、現実に戻ってください。'},
 {name:'小声で大事件の詩人',short:'ささやく空想家',motion:'float',pitch:1.15,rate:.82,temper:'小さな声で大きな空想。間をたっぷり取って意外な一言を落とす。',catch:s=>`しーっ。${s}が、目を覚ます。`,exit:s=>`${s}よ、おやすみ。私は先に反省する。`,reply:'静かに言っても、大きな勘違いですよ。'},
 {name:'秒で泣く感激屋',short:'感動の大渋滞',motion:'tremble',pitch:1.25,rate:.96,temper:'すぐに目が潤む。物にも感謝し、ツッコミさえ成長の贈り物。',catch:s=>`${s}さん、ここまでありがとう！`,exit:s=>`${s}にも皆さんにも、涙の感謝です！`,reply:'感動するには、まだ話が早いです。'},
 {name:'ずっと冷静な変人',short:'真顔の想定外',motion:'tilt',pitch:.72,rate:.9,temper:'真顔でとんでもない結論を出す。自分の失敗も淡々と記録する。',catch:s=>`${s}の件、想定の範囲外です。`,exit:s=>`${s}の件、反省事項として保存しました。`,reply:'落ち着いているのに、結論だけ大暴走です。'}
];
const skins=['#f2c7a2','#dba27e','#f1bd97','#c78b68','#edc6ac'];
const designs=Array.from({length:150},(_,id)=>{
 const w=Math.floor(id/10),v=id%10,world=worlds[w],persona=personas[v],subject=window.WARAI_REPERTOIRE.find(n=>n.artistId===id).subject;
 return {id,world:w,variant:v,subject,troupe:world.name,nickname:subject+'の'+['大研究家','見せ場職人','名探偵','新人スター','表彰委員長','礼儀正しい反逆者','小さな国王','ささやき詩人','感激大使','冷静な異端児'][v],persona:persona.name,tag:persona.short,motion:persona.motion,temper:persona.temper,belief:world.belief,costume:world.costume,pitch:persona.pitch,rate:persona.rate,catchphrase:persona.catch(subject),exitLine:persona.exit(subject),reply:persona.reply,color:world.color,accent:world.accent,hair:world.hair,skin:skins[(w+v)%5],description:world.belief+' '+persona.temper,designKey:`${w}-${v}`};
});
function star(x,y,r=7,fill='#efc875'){return `<path d="M${x} ${y-r}l${r*.3} ${r*.65} ${r*.7} ${r*.3}-${r*.55} ${r*.5} .15 ${r*.8}-${r*.6}-${r*.4}-${r*.6} ${r*.4} .15-${r*.8}-${r*.55}-${r*.5} ${r*.7}-${r*.3}Z" fill="${fill}"/>`}
// Each troupe has its own readable badge; its variation number is illustrated
// as dot groups on the prop, never as a generic name label.
function emblem(w,c='#ecc77c'){
 const icons=[
 '<path d="M-9 -6H6V4Q6 11-2 11Q-10 11-10 4Z"/><path d="M6 -4H11Q16 1 10 5H6" fill="none"/><path d="M-3-10Q-7-15-3-19" fill="none"/>',
 '<rect x="-11" y="-13" width="22" height="25" rx="5"/><path d="M-7-7H7V0H-7Z" fill="#273c49"/><path d="M-7 14L-12 19M7 14L12 19"/><circle cx="-6" cy="7" r="2" fill="#273c49"/><circle cx="6" cy="7" r="2" fill="#273c49"/>',
 '<path d="M-10-3Q-20-9-11-14Q-6-23 0-14Q9-22 13-13Q22-8 10-3V10H-10Z"/><path d="M-9 5H9" fill="none"/>',
 '<path d="M0-10Q-7-16-15-10V13Q-8 7 0 13Q7 7 15 13V-10Q7-16 0-10V13"/><path d="M-10-5L-5-4M5-4L10-5" fill="none"/>',
 '<ellipse cx="0" cy="0" rx="18" ry="5" transform="rotate(-25)" fill="none"/><circle cx="0" cy="0" r="10"/>',
 '<path d="M-13-7H13L11 13H-11Z"/><path d="M-7-7Q-7-23 7-7M-9 0H9" fill="none"/>',
 '<circle cx="-9" cy="9" r="6" fill="none"/><circle cx="9" cy="9" r="6" fill="none"/><path d="M-5 5L10-15M5 5L-10-15" fill="none"/>',
 '<path d="M-12 10Q-19-9 13-17Q23 6-12 10Z"/><path d="M-12 12L9-12" fill="none"/>',
 '<path d="M-15 2L0-10L15 2L0 14Z"/><path d="M-9 7V14Q0 21 9 14V7M15 2V15" fill="none"/>',
 '<rect x="-15" y="-7" width="30" height="23" rx="3"/><path d="M-6-7V-14H6V-7M-15 2H15M0-1V6" fill="none"/>',
 '<path d="M7-16A17 17 0 1 0 12 11Q-8 12-7-4Q-6-12 7-16Z"/>',
 '<path d="M-2 7V-13L13-17V3M-2-8L13-12" fill="none"/><ellipse cx="-7" cy="9" rx="6" ry="4"/><ellipse cx="8" cy="5" rx="6" ry="4"/>',
 '<path d="M-9-14H9V1Q9 12 0 12Q-9 12-9 1Z"/><path d="M-9-8H-17Q-17 5-8 5M9-8H17Q17 5 8 5M0 12V18M-8 18H8" fill="none"/>',
 '<rect x="-16" y="-11" width="32" height="23" rx="3"/><path d="M-15-9L0 3L15-9M-15 10L-5 0M15 10L5 0" fill="none"/>',
 '<path d="M-16-8Q0-24 16-8L0 17Z"/><path d="M-11-8L0 17M0-13V17M11-8L0 17" fill="none"/>'
 ];return `<g stroke="#253a3e" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" fill="${c}">${icons[w]}</g>`;
}
function headgear(d){const w=d.world,c=d.color,a=d.accent;
 const h=[
 `<path d="M52 36L57 15H99L105 36Z" fill="${c}"/><path d="M65 17V6H88V17M88 8H96Q101 12 94 16H89" fill="${a}"/><path d="M45 37Q78 27 111 37L107 44H49Z" fill="${a}"/><path d="M74 4Q67-3 75-8" fill="none"/>`,
 `<path d="M43 35Q43 8 80 10Q113 9 115 35Z" fill="${c}"/><path d="M44 31H114V40H44Z" fill="${a}"/><path d="M64 40Q87 54 116 41L111 36H66Z" fill="${c}"/><path d="M48 23L31 16L35 29L49 33M108 22L124 16L121 30L107 33" fill="${a}"/>`,
 `<path d="M49 40L47 27Q25 23 41 7Q48 0 58 10Q57-10 78-10Q97-9 97 9Q116-5 124 13Q132 28 110 30L108 41Z" fill="#fff7e7"/><path d="M48 32H109V43H48Z" fill="${a}"/><path d="M62 18L63 30M91 16L91 30" fill="none" stroke="#d1bf9d"/>`,
 `<path d="M45 42Q50 11 74-17L102 32L117 41Q77 56 38 45Z" fill="${c}"/><path d="M52 34L103 28L106 39L49 45Z" fill="${a}"/>${star(79,6,8,a)}<path d="M100 23Q118 2 123-13Q109-9 100 23Z" fill="#f5dfb4"/>`,
 `<circle cx="79" cy="53" r="53" fill="#b5edf322" stroke="#c5edf1" stroke-width="4"/><path d="M30 63Q79 101 128 63L122 85Q78 111 35 85Z" fill="${c}"/><circle cx="29" cy="56" r="10" fill="${a}"/><circle cx="128" cy="56" r="10" fill="${a}"/><path d="M53 11Q67 3 84 6" stroke="#ffffffb0" stroke-width="6" fill="none"/>`,
 `<path d="M41 33Q55 9 88 14L110 34L100 40H49Z" fill="${c}"/><path d="M48 34Q87 25 121 40L114 49Q87 35 48 43Z" fill="${a}"/><path d="M77 18L78 28M68 23H87" stroke="#fff4d3" stroke-width="4"/>`,
 `<path d="M78 27Q48-7 36 17Q28 43 72 37Q93-1 113 18Q131 40 83 36Z" fill="${a}"/><circle cx="79" cy="31" r="9" fill="${c}"/><path d="M57 33L42 57L62 49L74 37M88 37L105 56L103 42L112 34" fill="${a}"/>`,
 `<path d="M41 39Q38 11 82 14Q121 7 119 35Q80 47 41 39Z" fill="${c}"/><path d="M78 20Q77-8 107-15Q115 8 78 20Z" fill="${a}"/><path d="M78 20L100-7" fill="none"/>`,
 `<path d="M43 33Q43 13 80 14Q115 14 115 34L108 43H49Z" fill="${c}"/><path d="M46 33H114V44H46Z" fill="${a}"/><path d="M62 43Q90 56 118 44L108 38H65Z" fill="${c}"/><rect x="70" y="21" width="17" height="10" rx="2" fill="${a}"/>`,
 `<path d="M42 27L114 27L116 40H40Z" fill="${c}"/><path d="M78 23L87 32L78 42L69 32Z" fill="${a}"/><path d="M112 32L141 27L131 40L145 52L111 40" fill="${c}"/>`,
 `<path d="M67 22L59-4Q77-19 93-4L90 23Z" fill="${d.hair}"/><path d="M58 6H96V14H58Z" fill="${a}"/><path d="M43 36Q78 20 116 39" fill="none" stroke="${a}" stroke-width="6"/>`,
 `<path d="M48 33L52-10Q80-18 105-7L111 32Z" fill="${c}"/><path d="M48 22L110 21L111 35H47Z" fill="${a}"/><path d="M35 36Q79 23 123 36L116 43H40Z" fill="${c}"/>${star(79,6,7,a)}`,
 `<path d="M40 33L115 31L117 44L41 46Z" fill="${a}"/><path d="M115 33L145 21L132 44L147 53L115 44Z" fill="${c}"/><path d="M58 28L66 7L77 26L91 4L103 29Z" fill="${d.hair}"/>`,
 `<path d="M42 34Q43 9 78 13Q109 13 113 35Z" fill="${c}"/><path d="M47 33Q83 26 116 38L107 45H49Z" fill="${a}"/><rect x="66" y="20" width="25" height="14" rx="2" fill="#fff4dc"/><path d="M66 21L78 30L91 21" fill="none"/>`,
 `<path d="M47 32L49 11L65 22L79-4L94 22L111 11L112 34Z" fill="${a}"/><path d="M40 35Q80 23 119 37L112 45H46Z" fill="${c}"/>${star(79,19,7,c)}`
 ];return `<g class="headgear" stroke="#253a3e" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round">${h[w]}</g>`;
}
function portrait(artist){const d=designs[artist.id],v=d.variant,w=d.world,c=d.color,a=d.accent,skin=d.skin;
 const widths=[34,25,29,28,43,27,44,23,35,32],b=widths[v],hip=[31,25,28,26,37,26,39,24,33,30][v],headWidths=[31,27,29,28,35,25,36,25,32,30],hw=headWidths[v],headY=[54,48,52,54,55,50,53,48,53,52][v],cx=79;
 const left=cx-b,right=cx+b,feetY=218;
 const clothes=[
 `<path d="M${left} 110L${right} 110L${cx+hip} 184H${cx-hip}Z" fill="${c}"/><path d="M60 115H98L105 176H53Z" fill="#f8e5c3"/><path d="M61 134H98V157Q81 172 61 157Z" fill="${a}"/><path d="M58 114L64 95M99 113L94 95" stroke="#f8e5c3" stroke-width="7"/>`,
 `<path d="M${left} 108Q79 89 ${right} 108L${cx+hip} 185H${cx-hip}Z" fill="${c}"/><path d="M79 104V179M${left+3} 112H${right-3}" stroke="${a}" stroke-width="4"/>${[126,144,162].map(y=>`<circle cx="87" cy="${y}" r="3" fill="${a}"/>`).join('')}<path d="M44 117L56 122M103 122L116 118" stroke="${a}" stroke-width="7"/>`,
 `<path d="M${left} 110Q79 91 ${right} 110L${cx+hip} 183H${cx-hip}Z" fill="#fff5df"/><path d="M63 111V178M76 110V178M89 110V178M102 111V178" stroke="${c}" stroke-width="6"/><path d="M52 118H107V134H52Z" fill="${c}"/><path d="M52 173H106V186H52Z" fill="${a}"/>`,
 `<path d="M73 100L${left-9} 122L${left-8} 196L79 182L${right+9} 196L${right+8} 122L86 100Z" fill="${c}"/><path d="M74 104L79 185L85 103" fill="#e6cf9c"/>${star(left+9,141,7,a)}${star(right-9,169,5,a)}`,
 `<rect x="${left-7}" y="114" width="${2*b+14}" height="67" rx="21" fill="#d8e3d7"/><path d="M${left} 143H${right}V181H${left}Z" fill="${c}"/><rect x="64" y="113" width="31" height="30" rx="5" fill="${a}"/><circle cx="72" cy="124" r="3" fill="${c}"/><path d="M82 121H89M69 133H89" stroke="${c}" stroke-width="3"/><path d="M${left} 152H${right}" stroke="#b6d5ca" stroke-width="6"/>`,
 `<path d="M${left-3} 109L67 101L79 116L91 101L${right+3} 110L${cx+hip} 185H${cx-hip}Z" fill="${c}"/><path d="M62 104L76 126L68 184M96 104L82 126L90 184" fill="none" stroke="${a}" stroke-width="10"/><path d="M${left} 158H${right}V174H${left}Z" fill="${a}"/>`,
 `<path d="M69 102L${left-10} 122L${left-13} 181Q78 198 ${right+14} 182L${right+10} 121L90 102Z" fill="${c}"/><path d="M65 105Q79 139 93 105" fill="${a}"/><path d="M${left-7} 161Q78 176 ${right+8} 162" stroke="${a}" stroke-width="4" fill="none"/>${star(right-9,143,7,'#f5dfb8')}`,
 `<path d="M65 102L${left-11} 132L${left-11} 178L79 195L${right+11} 179L${right+10} 133L94 102Z" fill="${c}"/><path d="M64 104L79 121L95 104M${left-6} 171L79 185L${right+6} 171" stroke="${a}" stroke-width="6" fill="none"/><circle cx="78" cy="132" r="5" fill="${a}"/>`,
 `<path d="M${left} 112L67 102L79 112L91 102L${right} 112L${cx+hip} 184H${cx-hip}Z" fill="${c}"/><path d="M67 106L79 124L91 106" stroke="${a}" stroke-width="6" fill="none"/>${[134,151,168].map(y=>`<circle cx="79" cy="${y}" r="3" fill="${a}"/>`).join('')}<path d="M${right-15} 134H${right-4}V148H${right-15}Z" fill="#e2c58d"/>`,
 `<path d="M${left-3} 110L65 99L79 115L94 99L${right+3} 110L${cx+hip} 183H${cx-hip}Z" fill="${c}"/><path d="M67 103L79 115L92 103L85 134L79 161L72 134Z" fill="#f3e7c9"/><path d="M77 116H82L85 142L79 150L74 142Z" fill="${a}"/><path d="M${left-3} 112H${left+12}M${right-12} 112H${right+3}" stroke="${a}" stroke-width="7"/>`,
 `<path d="M${left-9} 111L66 100L79 113L92 100L${right+9} 112L${right+6} 169L98 165L103 195H54L61 165L${left-7} 169Z" fill="${c}"/><path d="M66 101L85 133L92 104M55 158H105V172H55Z" fill="${a}"/>${star(50,138,6,'#f8dfad')}`,
 `<path d="M${left} 107L68 99L79 118L91 99L${right} 108L${right+2} 198L79 180L${left-2} 198Z" fill="${c}"/><path d="M69 103L79 120L91 103" fill="#f7e3b8"/><path d="M68 114L79 109L91 114L79 122Z" fill="${a}"/><path d="M57 139H70M88 139H103" stroke="${a}" stroke-width="3"/>`,
 `<path d="M${left-2} 111Q79 95 ${right+2} 111L${cx+hip} 184H${cx-hip}Z" fill="${c}"/><path d="M55 107L62 181M103 108L96 181" stroke="${a}" stroke-width="8"/><path d="M79 109V176" stroke="#f9e6c4" stroke-width="3"/><rect x="66" y="131" width="28" height="20" rx="3" fill="#fff1ce"/><path d="M73 141H87" stroke="${c}" stroke-width="3"/>`,
 `<path d="M${left-2} 110L66 100L79 111L92 100L${right+2} 110L${cx+hip} 183H${cx-hip}Z" fill="${c}"/><path d="M54 110L106 167" stroke="${a}" stroke-width="13"/><rect x="80" y="148" width="40" height="32" rx="7" fill="#cfa570"/><path d="M81 151L99 164L119 151" fill="none"/>`,
 `<path d="M${left-9} 111L65 100L79 116L93 100L${right+9} 112L${right+8} 180L103 174L104 197H52L55 175L${left-8} 180Z" fill="${c}"/><path d="M64 103L85 134L94 102M52 158H107V176H52Z" fill="${a}"/><path d="M${left-6} 133L${left+8} 145L${left-6} 158M${right+6} 133L${right-8} 145L${right+6} 158" stroke="#f5dfba" stroke-width="4" fill="none"/>`
 ];
 const hair=[
 `<path d="M49 44Q42 19 66 21L76 5L87 23Q112 18 111 46L97 34L89 46L77 30L65 44L57 34Z"/>`,
 `<path d="M49 42Q28 26 31 58Q31 77 49 66L52 50M108 43Q129 26 128 58Q127 79 109 66Z"/><path d="M49 43Q53 14 82 19Q109 20 111 49L94 33Q76 48 53 37Z"/>`,
 `<path d="M48 47Q42 17 76 18Q115 15 111 50L98 36L88 41L79 32L68 42L57 35Z"/>`,
 `<path d="M47 45L39 28L57 31L57 11L74 22L87 8L92 26L113 20L107 49L93 34L80 44L64 33Z"/>`,
 `<path d="M45 46Q29 47 34 31Q31 13 49 17Q50 0 67 8Q80-4 91 10Q110 1 113 18Q132 19 122 36Q131 48 111 54L98 33L77 39L59 31Z"/>`,
 `<path d="M48 48Q40 12 81 17Q112 16 111 51L100 32L75 37L54 31Z"/>`,
 `<path d="M45 49Q35 15 80 16Q123 16 115 51L99 37L61 34Z"/><path d="M48 68Q36 113 59 109L69 85M109 66Q125 111 100 110L90 84Z"/>`,
 `<path d="M48 44Q33 25 48 12Q34-3 56-9Q79-19 90 0Q116-4 114 17Q127 34 111 51L99 31L63 31Z"/>`,
 `<path d="M46 47Q34 21 54 18Q48 1 69 7Q83-7 99 13Q121 8 116 31Q127 44 111 56L96 38L78 32L62 38Z"/>`,
 `<path d="M47 48Q43 12 80 17Q111 14 112 49L102 33Q95 46 83 44L70 33L57 42Z"/>`
 ][v];
 const expressions=[
 `<path d="M57 54L69 49M90 49L102 54"/><circle cx="63" cy="61" r="4" fill="#253a3e"/><circle cx="96" cy="61" r="4" fill="#253a3e"/><circle cx="63" cy="61" r="10" fill="none"/><circle cx="96" cy="61" r="10" fill="none"/><path d="M73 61H86"/>`,
 `<path d="M55 57Q62 49 69 57M89 56Q95 50 103 56M56 53L53 49M99 53L103 48" fill="none"/><path d="M54 43Q64 39 70 44M89 44Q96 39 104 45"/>${star(110,59,5,a)}`,
 `<path d="M54 54L71 57M87 57L104 53"/><path d="M57 64H69M89 63H102"/><circle cx="95" cy="61" r="11" fill="none"/><path d="M106 67L111 85" fill="none"/>`,
 `<path d="M53 50L69 53M88 53L104 48"/><ellipse cx="62" cy="62" rx="5" ry="7" fill="#253a3e"/><ellipse cx="96" cy="62" rx="5" ry="7" fill="#253a3e"/><circle cx="61" cy="60" r="2" fill="#fff"/><circle cx="95" cy="60" r="2" fill="#fff"/>`,
 `<path d="M54 50Q62 42 70 51M88 51Q97 42 104 49" stroke-width="5"/><path d="M55 61Q63 53 70 61M88 61Q96 53 104 61" fill="none"/><path d="M65 77Q73 65 79 75Q86 66 95 77L79 79Z" fill="${d.hair}"/>`,
 `<path d="M54 52Q62 48 70 53M88 53Q96 48 104 52M55 62H70M88 62H103" fill="none"/><path d="M61 59V64M95 59V64"/>`,
 `<path d="M52 51L70 49M88 49L106 51" stroke-width="5"/><circle cx="62" cy="61" r="3" fill="#253a3e"/><circle cx="96" cy="61" r="3" fill="#253a3e"/><path d="M54 76Q64 65 78 74Q93 65 104 76L80 81Z" fill="${d.hair}"/>`,
 `<path d="M53 51Q61 56 70 50M88 50Q98 56 105 51M55 62L69 59M89 59L104 62" fill="none"/><path d="M61 65V67M97 65V67"/>`,
 `<path d="M54 50L70 56M88 56L104 49M55 61Q63 54 70 62M89 62Q97 54 104 61" fill="none"/><path d="M55 65Q48 74 55 76Q62 74 55 65M104 65Q97 74 104 76Q111 74 104 65" fill="#8dd2dc" stroke="none"/>`,
 `<path d="M53 53H71M88 53H106"/><rect x="51" y="55" width="23" height="15" rx="4" fill="#344c50"/><rect x="85" y="55" width="23" height="15" rx="4" fill="#344c50"/><path d="M74 61H85M57 58L66 65M91 58L100 65" stroke="#bce3d6" stroke-width="2"/>`
 ][v];
 const faceExtras=v===6?`<path d="M51 78Q50 108 79 113Q109 106 108 78L97 88L80 84L63 88Z" fill="${d.hair}"/>`:v===2?'<path d="M67 79L78 73L90 79L78 82Z" fill="#4b3e39"/>':'';
 const accessory=[
 `<g transform="translate(30 149) rotate(-13)"><rect x="-13" y="-22" width="26" height="38" rx="4" fill="#f5e9cf"/><path d="M-8-14H8M-8-6H7M-8 2H3" stroke="#728d83" stroke-width="2"/></g>`,
 `${star(119,125,10,a)}<path d="M119 134L119 174" stroke="${a}" stroke-width="5"/>`,
 '<circle cx="30" cy="144" r="15" fill="#c5e4dd99" stroke="#e3b469" stroke-width="5"/><path d="M40 155L51 174" stroke="#4a403b" stroke-width="8"/>',
 `<path d="M20 123L37 112L45 128L35 144L23 142Z" fill="${a}"/><path d="M24 124L33 130L37 119" stroke="#fff4da" stroke-width="3" fill="none"/>`,
 '<g transform="translate(124 151)"><path d="M-9-20H9V0Q9 9 0 9Q-9 9-9 0Z" fill="#efc565"/><path d="M-10-16H-17Q-17-2-9-2M10-16H17Q17-2 9-2M0 9V20M-10 20H10" fill="none" stroke="#efc565" stroke-width="5"/></g>',
 '<path d="M20 138L39 131L45 153L25 161Z" fill="#f4e5c5"/><path d="M25 141L36 138M27 148L38 145" stroke="#a26154" stroke-width="2"/>',
 '<path d="M123 119V187" stroke="#d6ac62" stroke-width="5"/><circle cx="123" cy="115" r="10" fill="#ecbf5b"/><circle cx="123" cy="115" r="4" fill="#a04b58"/>',
 `<g transform="translate(28 143)">${emblem(3,a)}</g>`,
 '<path d="M20 131Q20 117 31 127Q44 117 44 132Q41 144 31 155Q22 145 20 131Z" fill="#e09d9e"/><path d="M31 155V175" stroke="#d4b387" stroke-width="2"/>',
 '<rect x="16" y="126" width="28" height="41" rx="5" fill="#34464b"/><path d="M22 133H38V142H22Z" fill="#b3d0ac"/><path d="M22 149H26M33 149H37M22 157H26M33 157H37" stroke="#e0d4ac" stroke-width="3"/>'
 ][v];
 const armPose=[[-11,24,16,-9],[-5,29,24,-22],[0,19,6,-17],[6,-4,26,-32],[-11,15,26,-10],[-2,30,-1,29],[7,22,20,-20],[-4,22,8,-4],[1,3,7,1],[0,24,3,20]][v];
 return `<svg class="character-svg" data-design="${d.designKey}" viewBox="0 -25 160 270" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><ellipse cx="80" cy="234" rx="47" ry="7" fill="#182f3525"/><g class="character" stroke="#253a3e" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"><g class="feet"><path d="M${cx-hip+5} 171L${cx-hip+3} 222H70L73 177M86 176L89 222H${cx+hip-3}L${cx+hip-5} 172" fill="#2b3e48"/><path d="M${cx-hip+3} 215L70 217L71 227H${cx-hip-7}Q${cx-hip-11} 219 ${cx-hip+3} 215M90 217L${cx+hip-3} 215Q${cx+hip+11} 219 ${cx+hip+7} 227H89Z" fill="${v%2?a:c}"/><path d="M${cx-hip-5} 227H70M91 227H${cx+hip+5}" stroke="#e3c6a0" stroke-width="4"/></g><g class="costume">${clothes[w]}</g><g class="arm-left"><path d="M${left+3} 117Q${left-14} 126 ${left-9+armPose[0]} ${144+armPose[1]}" fill="none" stroke="${c}" stroke-width="16"/><circle cx="${left-9+armPose[0]}" cy="${144+armPose[1]}" r="8" fill="${skin}"/></g><g class="arm-right"><path d="M${right-3} 117Q${right+14} 134 ${right+armPose[2]} ${143+armPose[3]}" fill="none" stroke="${c}" stroke-width="16"/><circle cx="${right+armPose[2]}" cy="${143+armPose[3]}" r="8" fill="${skin}"/></g><g class="signature-prop">${accessory}</g><g transform="translate(79 145) scale(.43)">${emblem(w,a)}</g>${Array.from({length:v%5+1},(_,j)=>`<circle cx="${64+j*6}" cy="178" r="1.7" fill="${a}" stroke="none"/>`).join('')}<g class="head"><path d="M68 83V109Q80 119 91 108V82" fill="${skin}"/><path d="M68 91Q78 101 91 91V103Q78 110 68 103Z" fill="#c1876e" stroke="none"/><g fill="${d.hair}">${hair}</g><ellipse cx="${cx-hw}" cy="64" rx="7" ry="10" fill="${skin}"/><ellipse cx="${cx+hw}" cy="64" rx="7" ry="10" fill="${skin}"/><path d="M${cx-hw} ${headY-20}Q${cx} ${headY-41} ${cx+hw} ${headY-20}L${cx+hw} 72Q${cx+hw} ${v===2?96:100} 79 ${v===2?103:99}Q${cx-hw} 98 ${cx-hw} 72Z" fill="${skin}"/><path d="M${cx-hw+1} 43Q64 38 74 29L87 42L100 35L${cx+hw-1} 48L${cx+hw} 28Q79 2 ${cx-hw} 28Z" fill="${d.hair}"/><g class="eyebrows" fill="none">${expressions}</g><ellipse cx="55" cy="74" rx="7" ry="3" fill="#dc8e7c77" stroke="none"/><ellipse cx="103" cy="74" rx="7" ry="3" fill="#dc8e7c77" stroke="none"/><path d="M78 61L74 73H81" stroke="#b17e67" fill="none" stroke-width="2"/>${faceExtras}<path class="mouth-closed" d="${v===9?'M70 86H88':v===7?'M73 85Q79 89 85 85':v===8?'M69 86Q79 77 89 85':'M67 82Q79 95 92 81'}" stroke="#6c3840" stroke-width="3" fill="none"/><ellipse class="mouth-open" cx="79" cy="85" rx="8" ry="6" fill="#813d43" stroke-width="2"/><path class="tooth" d="M74 80H84V83H74Z" fill="#fff4dc" stroke="none"/>${headgear(d)}</g></g></svg>`;
}
function stageActor(a,index=null){const d=designs[a.id];return `<div class="actor" data-motion="${d.motion}" ${index!==null?`id="actor${index}"`:''}>${window.WARAI_CHARACTERS.portrait(a)}<span class="stage-tag">${d.tag}</span><b>${a.name}</b></div>`}
window.WARAI_CHARACTERS={designs,worlds,personas,portrait,stageActor};
})();
