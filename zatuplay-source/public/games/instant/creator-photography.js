// Curated raster art replaces typography cards for intermediate and expert media.
// These are generated fictional scenes; they are shared assets, not real location records.
const CPU_PHOTO_ASSETS={
 landscape:{src:'assets/creator-landscape-v1.png',alt:'朝霧と山並みを映す湖',caption:'朝霧がほどける湖。光が水面に届く一瞬を待って撮りました。',kind:'風景作品'},
 original:{src:'assets/creator-original-v1.png',alt:'雲海に浮かぶ光の温室',caption:'雲の上に、小さな花の居場所を。光る温室を描いたオリジナル作品です。',kind:'オリジナル作品'},
 tourism:{src:'assets/creator-tourism-v1.png',alt:'赤い塔の見える観光地の商店街',caption:'旅先の商店街を散策。塔もお店も入れたくて、ちょっと欲張った一枚になりました。次は光の時間も考えて撮りたい！',kind:'観光スナップ'}
};
function cpuPhotoChoice(p,index=0){let tier=p.creatorTier||cpuTier(p.cpu);if(tier==='beginner'||p.cpuFormat==='text')return null;let key=tier==='intermediate'?'tourism':(Math.floor(rand(p.cpu+p.time+739)*2)+index)%2?'original':'landscape';return {...CPU_PHOTO_ASSETS[key],key}}
const photoCreatorPost=creatorPost;creatorPost=function(p){let out=photoCreatorPost(p),photo=cpuPhotoChoice(out);if(!photo||out.violation)return out;return {...out,caption:photo.caption+'\n— '+out.caption.split('\n— ').pop(),description:photo.kind+'｜'+(out.creatorTier==='advanced'?'光・色・奥行き・余白を丁寧に仕上げた、上級者の画像作品。':'見どころはあるけれど、構図と光に改善の余地がある中級者の旅写真。バズや反応は閲覧者の好みによって変わります。'),photoStyleVersion:1}};
const photoCPUArtwork=cpuArtwork;cpuArtwork=function(p,index=0,animated=false){let photo=cpuPhotoChoice(p,index);if(!photo)return photoCPUArtwork(p,index,animated);let uid='photo-'+String(p.id).replace(/[^a-zA-Z0-9_-]/g,'')+'-'+index;return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" role="img" aria-labelledby="'+uid+'"><title id="'+uid+'">'+esc(photo.alt+'・'+photo.kind)+'</title><image href="'+photo.src+'" width="600" height="600" preserveAspectRatio="xMidYMid slice"/><desc>'+esc(p.id)+' / '+index+'</desc></svg>'};
