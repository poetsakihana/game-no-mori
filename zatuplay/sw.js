// Catalog and app files stay on the network so published changes are visible.
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{
 if(event.request.mode==='navigate' && new URL(event.request.url).origin===self.location.origin){
  event.respondWith(fetch(event.request).catch(()=>new Response('<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>ZatuPlay</title><body style="font-family:sans-serif;padding:40px;color:#5b466f"><h1>ZatuPlay</h1><p>インターネット接続を確認して、もう一度開いてください。</p><a href="./">もう一度開く</a></body></html>',{headers:{'Content-Type':'text/html; charset=utf-8'}})));
 }
});
