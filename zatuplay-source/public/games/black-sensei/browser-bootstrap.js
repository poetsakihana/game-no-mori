(function () {
  'use strict';
  // The browser edition keeps the responsive website layout, not Android's fixed viewport.
  if (!Array.prototype.at) Object.defineProperty(Array.prototype, 'at', {value: function(index) {index = Math.trunc(index) || 0; if (index < 0) index += this.length; return this[index];}, configurable: true, writable: true});
  if (!CanvasRenderingContext2D.prototype.roundRect) CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
    var radius = Math.min(typeof r === 'number' ? r : 4, Math.abs(w) / 2, Math.abs(h) / 2);
    this.moveTo(x + radius, y); this.arcTo(x + w, y, x + w, y + h, radius); this.arcTo(x + w, y + h, x, y + h, radius); this.arcTo(x, y + h, x, y, radius); this.arcTo(x, y, x + w, y, radius); this.closePath(); return this;
  };
  function syncControls() {
    document.body.classList.toggle('browser-playing', document.getElementById('titleScreen').classList.contains('hidden') && document.getElementById('resultScreen').classList.contains('hidden'));
  }
  ['titleScreen', 'resultScreen'].forEach(function(id) {new MutationObserver(syncControls).observe(document.getElementById(id), {attributes: true, attributeFilter: ['class']});});
  syncControls();
})();
