
// Keep recovery controls alive even if the game script cannot initialize.
(function(){
 var completed=false, status=document.getElementById('bootStatus');
 function fail(message){
  if(completed)return;
  status.textContent=message||'起動処理が止まりました。軽量モードで開き直してください。';
  document.getElementById('lightMode').hidden=false;
 }
 document.getElementById('lightMode').onclick=function(){
  location.hash=location.hash.indexOf('light')>=0?'normal':'light';
  location.reload();
 };
 window.BootGuard={ready:function(message){completed=true;status.textContent=message;document.getElementById('lightMode').textContent=location.hash.indexOf('light')>=0?'標準モードで開き直す':'軽量モードで開き直す';},fail:fail};
 window.addEventListener('error',function(){fail();});
 window.addEventListener('unhandledrejection',function(){fail();});
 setTimeout(function(){fail('起動に時間がかかっています。軽量モードで開き直せます。');},8000);
})();
