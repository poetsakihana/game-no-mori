/* Pause when this browser tab is hidden. Return explicitly with Enter or the game UI. */
(function () {
  'use strict';
  document.addEventListener('visibilitychange', function () {
    if (document.hidden && typeof game !== 'undefined' && game) {
      window.dispatchEvent(new Event('blur'));
      game.pause();
    }
  });
  window.addEventListener('pagehide', function () {
    if (typeof game !== 'undefined' && game) game.pause();
  });
})();
