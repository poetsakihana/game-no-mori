(function () {
  window.questBootReady = false;
  function report(message) {
    if (window.questBootReady) return;
    var status = document.getElementById('loading');
    if (!status) return;
    status.classList.remove('hidden');
    status.textContent = '読み込みを完了できませんでした。通信を確認し、WebGL 2対応の最新ブラウザで再読込してください。セーブデータは削除していません。（起動コード：SCRIPT_START / ' + String(message || '読み込み失敗') + '）';
  }
  window.addEventListener('error', function (event) { report(event.message); });
  window.addEventListener('unhandledrejection', function (event) { report(event.reason && event.reason.message || event.reason); });
  setTimeout(function () { report('準備に時間がかかっています'); }, 15000);
})();
