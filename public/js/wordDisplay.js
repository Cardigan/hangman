/* ============================================================
   WordDisplay — Cycling letter/number animation for player words
   WarGames "launch code cracking" aesthetic
   ============================================================ */
window.WordDisplay = (function () {
  'use strict';

  var CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  var CYCLE_INTERVAL = 55; // ms between character swaps (~18 fps)
  var container = null;
  var animFrameId = null;
  var lastCycleTime = 0;
  var playerRows = {}; // socketId -> { el, slotsEl, label, badge, slots[] }

  function randomChar() {
    return CHARS[(Math.random() * CHARS.length) | 0];
  }

  function init() {
    container = document.getElementById('word-area');
    if (!container) return;
    startLoop();
  }

  function startLoop() {
    if (animFrameId) return;
    lastCycleTime = performance.now();
    animFrameId = requestAnimationFrame(tick);
  }

  function stopLoop() {
    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
  }

  function tick(now) {
    var dt = now - lastCycleTime;
    if (dt >= CYCLE_INTERVAL) {
      lastCycleTime = now;
      cycleAll();
    }
    if (hasCyclingSlots()) {
      animFrameId = requestAnimationFrame(tick);
    } else {
      animFrameId = null;
    }
  }

  function hasCyclingSlots() {
    for (var id in playerRows) {
      var slots = playerRows[id].slots;
      for (var i = 0; i < slots.length; i++) {
        if (slots[i].cycling) return true;
      }
    }
    return false;
  }

  function cycleAll() {
    for (var id in playerRows) {
      var slots = playerRows[id].slots;
      for (var i = 0; i < slots.length; i++) {
        var s = slots[i];
        if (s.cycling) {
          s.counter = (s.counter || 0) + 1;
          if (s.counter % s.skip === 0) {
            s.el.textContent = randomChar();
          }
        }
      }
    }
  }

  function update(gameState) {
    if (!container) return;
    if (!gameState || !gameState.maskedWord) {
      container.innerHTML = '';
      playerRows = {};
      return;
    }

    // Shared word — one word for the whole room
    var sid = 'shared';
    var masked = gameState.maskedWord || [];

    if (!playerRows[sid]) {
      playerRows[sid] = createRow({ username: 'ABORT CODE' });
      container.appendChild(playerRows[sid].el);
    }

    var row = playerRows[sid];
    row.label.textContent = 'ABORT CODE';
    row.label.classList.add('player-label-me');

    reconcileSlots(row, masked, gameState);
    updateBadge(row, gameState);

    // Remove any old per-player rows
    for (var id in playerRows) {
      if (id !== sid) {
        container.removeChild(playerRows[id].el);
        delete playerRows[id];
      }
    }

    if (hasCyclingSlots() && !animFrameId) {
      startLoop();
    }
  }

  function createRow(player) {
    var rowEl = document.createElement('div');
    rowEl.className = 'player-word-row';

    var label = document.createElement('span');
    label.className = 'player-label';
    label.textContent = player.username || 'UNKNOWN';
    rowEl.appendChild(label);

    var slotsContainer = document.createElement('span');
    slotsContainer.className = 'letter-slots-container';
    rowEl.appendChild(slotsContainer);

    var badge = document.createElement('span');
    badge.className = 'status-badge';
    badge.style.display = 'none';
    rowEl.appendChild(badge);

    return { el: rowEl, slotsEl: slotsContainer, label: label, badge: badge, slots: [] };
  }

  function reconcileSlots(row, masked, player) {
    var slots = row.slots;
    var slotsEl = row.slotsEl;
    var isFinished = player.status === 'won' || player.status === 'lost';

    // Grow slot array
    while (slots.length < masked.length) {
      var span = document.createElement('span');
      span.className = 'letter-slot';
      span.textContent = randomChar();
      slotsEl.appendChild(span);
      slots.push({
        el: span,
        cycling: true,
        revealed: false,
        counter: 0,
        skip: 1 + ((Math.random() * 3) | 0)
      });
    }
    // Shrink slot array
    while (slots.length > masked.length) {
      var removed = slots.pop();
      slotsEl.removeChild(removed.el);
    }

    for (var i = 0; i < masked.length; i++) {
      var s = slots[i];
      var ch = masked[i];

      if (ch !== null) {
        if (!s.revealed) {
          s.el.textContent = ch;
          s.el.classList.add('letter-revealed');
          s.el.classList.add('letter-lock-flash');
          s.cycling = false;
          s.revealed = true;
          scheduleRemoveFlash(s.el);
        } else {
          s.el.textContent = ch;
        }
        if (player.status === 'lost') {
          s.el.classList.add('letter-lost');
        } else {
          s.el.classList.remove('letter-lost');
        }
      } else if (isFinished) {
        s.el.textContent = '_';
        s.cycling = false;
        s.el.classList.remove('letter-revealed');
      } else {
        if (s.revealed) {
          s.revealed = false;
          s.el.classList.remove('letter-revealed', 'letter-lost');
        }
        s.cycling = true;
      }
    }
  }

  function scheduleRemoveFlash(el) {
    setTimeout(function () {
      el.classList.remove('letter-lock-flash');
    }, 500);
  }

  function updateBadge(row, player) {
    var badge = row.badge;
    if (player.status === 'won') {
      badge.textContent = '\u2713 LAUNCH ABORTED';
      badge.className = 'status-badge status-won';
      badge.style.display = '';
      row.el.classList.add('player-won');
      row.el.classList.remove('player-lost');
    } else if (player.status === 'lost') {
      badge.textContent = '\u2717 MISSILE LAUNCHED';
      badge.className = 'status-badge status-lost';
      badge.style.display = '';
      row.el.classList.remove('player-won');
      row.el.classList.add('player-lost');
    } else {
      badge.style.display = 'none';
      badge.className = 'status-badge';
      row.el.classList.remove('player-won', 'player-lost');
    }
  }

  function destroy() {
    stopLoop();
    if (container) container.innerHTML = '';
    playerRows = {};
  }

  return { init: init, update: update, destroy: destroy };
})();
