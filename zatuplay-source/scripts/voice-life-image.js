function imageFromFile(file,maxW,maxH,quality=.75,jobKey=null){return new Promise((resolve,reject)=>{
 let url=null,img=null,done=false,timer;const job={key:jobKey,cancel:()=>finish(Error('画像の選択をキャンセルしました'))};imageJobs.add(job);
 function finish(error,result){if(done)return;done=true;window.clearTimeout(timer);imageJobs.delete(job);if(img){img.onload=null;img.onerror=null;img.src=''}if(url)URL.revokeObjectURL(url);error?reject(error):resolve(result)}
 timer=window.setTimeout(()=>finish(Error('画像の処理がタイムアウトしました')),30000);
 (async()=>{try{
  if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('JPEG・PNG・WebP画像を選択してください');
  if(file.size>15*1024*1024||file.size===0)throw Error('画像は0より大きい15MiB以下にしてください');
  const bytes=new Uint8Array(await file.arrayBuffer());if(done)return;
  const match=file.type==='image/jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:file.type==='image/png'?bytes.slice(0,8).join(',')==='137,80,78,71,13,10,26,10':String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP';
  if(!match)throw Error('画像形式と内容が一致しません');
  let width=0,height=0;const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  if(file.type==='image/png'&&bytes.length>=24){width=view.getUint32(16);height=view.getUint32(20)}
  if(file.type==='image/jpeg'){let p=2;while(p+4<bytes.length){if(bytes[p++]!==255)break;while(bytes[p]===255)p++;const marker=bytes[p++];if(marker===0xda)break;const n=bytes[p]*256+bytes[p+1];if(n<2||p+n>bytes.length)break;if([0xc0,0xc1,0xc2].includes(marker)&&n>=8){height=bytes[p+3]*256+bytes[p+4];width=bytes[p+5]*256+bytes[p+6];break}p+=n}}
  if(file.type==='image/webp'){let p=12;while(p+8<=bytes.length){const type=String.fromCharCode(...bytes.slice(p,p+4)),n=view.getUint32(p+4,true),b=p+8;if(b+n>bytes.length)break;if(type==='VP8X'&&n>=10){width=1+bytes[b+4]+bytes[b+5]*256+bytes[b+6]*65536;height=1+bytes[b+7]+bytes[b+8]*256+bytes[b+9]*65536;break}if(type==='VP8L'&&n>=5&&bytes[b]===47){width=1+((bytes[b+1]|bytes[b+2]<<8)&16383);height=1+((bytes[b+2]>>6|bytes[b+3]<<2|bytes[b+4]<<10)&16383);break}if(type==='VP8 '&&n>=10&&bytes[b+3]===157&&bytes[b+4]===1&&bytes[b+5]===42){width=view.getUint16(b+6,true)&16383;height=view.getUint16(b+8,true)&16383;break}p=b+n+(n%2)}}
  if(!width||!height||width*height>40000000||width>16384||height>16384)throw Error('画像の寸法を確認できないか大きすぎます（最大4000万画素）');
  url=URL.createObjectURL(new Blob([bytes],{type:file.type}));img=new Image();
  img.onerror=()=>finish(Error('画像を開けませんでした'));
  img.onload=()=>{try{if(!img.naturalWidth||!img.naturalHeight||img.naturalWidth*img.naturalHeight>40000000||img.naturalWidth>16384||img.naturalHeight>16384)throw Error('画像の寸法が大きすぎます');const scale=Math.min(1,maxW/img.naturalWidth,maxH/img.naturalHeight),w=Math.max(1,Math.round(img.naturalWidth*scale)),h=Math.max(1,Math.round(img.naturalHeight*scale)),canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d');if(!ctx)throw Error('画像処理を利用できません');ctx.drawImage(img,0,0,w,h);const data=canvas.toDataURL('image/jpeg',quality);VoiceLifeStorage.jpeg(data,maxW,maxH);finish(null,data)}catch(e){finish(e)}};img.src=url;
 }catch(e){finish(e)}})()
})}
