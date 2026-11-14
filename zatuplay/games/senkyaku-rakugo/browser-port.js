(() => {
 document.title='千客万来 落語寄席 | ZatuPlay';
 const box=document.createElement('aside');box.className='notice';box.style.margin='12px 5%';
 box.innerHTML='<a href="../../">← ZatuPlayへ戻る</a><br>ブラウザ版・ゲーム用創作500席。実在の噺家の出演・実演・持ちネタではありません。音声は端末の合成音声で、本人の声を再現していません。保存はこのブラウザ内です。';document.querySelector('header').before(box);
 window.addEventListener('storage',e=>{if(e.storageArea!==localStorage||!(e.key===SAVE_KEY||e.key===null))return;stop();if(document.getElementById('save-conflict'))return;const d=document.createElement('dialog');d.id='save-conflict';d.innerHTML='<p>別のタブで保存が更新されました。上書きを防ぐため再読み込みしてください。</p><button>再読み込み</button>';d.addEventListener('cancel',e=>e.preventDefault());d.querySelector('button').onclick=()=>location.reload();document.body.append(d);d.showModal()});
})();
