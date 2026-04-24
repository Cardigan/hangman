// wordDisplay.js — Word/letter display for WOPR terminal
(function () {
  'use strict';

  function update(state) {
    var wordArea = document.getElementById('word-area');
    if (!wordArea || !state) return;
    wordArea.textContent = state.maskedWord || '';
  }

  window.WordDisplay = {
    update: update
  };
})();
