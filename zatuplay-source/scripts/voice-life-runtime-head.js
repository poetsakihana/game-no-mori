let dead=false,sessionEpoch=0,roomEpoch=0,micEpoch=0,micPending=false,importEpoch=0;
const imageJobs=new Set();
const imageEpoch={avatar:0,banner:0},intervals=new Set(),timeouts=new Set();
function cancelImages(key){if(key)imageEpoch[key]++;else{imageEpoch.avatar++;imageEpoch.banner++}for(const job of [...imageJobs])if(!key||job.key===key)job.cancel()}
const setInterval=(fn,ms)=>{const id=window.setInterval(()=>{if(!dead&&!document.hidden)fn()},ms);intervals.add(id);return id};
const clearInterval=id=>{window.clearInterval(id);intervals.delete(id)};
const setTimeout=(fn,ms)=>{const id=window.setTimeout(()=>{timeouts.delete(id);if(!dead&&!document.hidden)fn()},ms);timeouts.add(id);return id};
