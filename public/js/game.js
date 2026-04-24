/* ============================================================
   GAME MODULE — Launch Sequence Display
   ============================================================ */
(function () {
  'use strict';

  var STAGES = [
    'SAFETY DISENGAGED',
    'TARGETING LOCKED',
    'PRIMER READY',
    'PREFLIGHT CHECKED',
    'WARHEAD ARMED',
    'READY TO FIRE',
    'MISSILE LAUNCHED'
  ];

  var TOTAL_STAGES = STAGES.length;

  // Cached DOM refs
  var launchStagesEl = null;
  var otherPlayersEl = null;
  var _socket = null;

  // Track rendered state to avoid unnecessary DOM rebuilds
  var renderedMyState = null;
  var renderedOtherKeys = '';

  /* ----------------------------------------------------------
     INIT
     ---------------------------------------------------------- */
  function init(socket, gameState, playerState) {
    _socket = socket;
    launchStagesEl = document.getElementById('launch-stages');
    otherPlayersEl = document.getElementById('other-players');
    renderedMyState = null;
    renderedOtherKeys = '';
    buildLaunchDisplay();

    if (playerState) {
      renderPlayerState(playerState);
    }

    if (socket) {
      socket.on('guessResult', function (data) {
        if (data.player) renderPlayerState(data.player);
        if (data.gameState) updateOtherPlayers(data.gameState.players, socket.id);
      });

      socket.on('playerJoined', function (data) {
        if (data.gameState) updateOtherPlayers(data.gameState.players, socket.id);
      });

      socket.on('playerLeft', function (data) {
        if (data.gameState) updateOtherPlayers(data.gameState.players, socket.id);
      });
    }
  }

  /* ----------------------------------------------------------
     BUILD INITIAL LAUNCH DISPLAY
     ---------------------------------------------------------- */
  function buildLaunchDisplay() {
    if (!launchStagesEl) return;
    launchStagesEl.innerHTML = '';

    // Header
    var header = document.createElement('div');
    header.className = 'launch-header';
    header.textContent = '\u2554\u2550\u2550 LAUNCH SEQUENCE STATUS \u2550\u2550\u2557';
    launchStagesEl.appendChild(header);

    // Stage items
    for (var i = 0; i < TOTAL_STAGES; i++) {
      var item = document.createElement('div');
      item.className = 'stage-item stage-pending';
      item.dataset.stage = i;
      item.innerHTML = formatStage(i, 'pending');
      launchStagesEl.appendChild(item);
    }

    // Footer border
    var footerBorder = document.createElement('div');
    footerBorder.className = 'launch-header';
    footerBorder.textContent = '\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D';
    launchStagesEl.appendChild(footerBorder);

    // Stats area
    var stats = document.createElement('div');
    stats.className = 'launch-stats';
    stats.id = 'launch-stats';
    stats.innerHTML =
      '<div id="wrong-count">WRONG GUESSES: 0/' + TOTAL_STAGES + '</div>' +
      '<div id="guessed-letters">GUESSED LETTERS: \u2014</div>';
    launchStagesEl.appendChild(stats);

    // End-state overlay (hidden by default)
    var overlay = document.createElement('div');
    overlay.id = 'launch-endstate';
    overlay.className = 'launch-endstate hidden';
    launchStagesEl.appendChild(overlay);
  }

  /* ----------------------------------------------------------
     FORMAT A SINGLE STAGE LINE
     ---------------------------------------------------------- */
  function formatStage(index, state) {
    var num = index + 1;
    var prefix, indicator;
    if (state === 'complete') {
      prefix = '[\u2588\u2588]';
      indicator = ' \u2713 ';
    } else if (state === 'active') {
      prefix = '>>>';
      indicator = ' \u25B6 ';
    } else {
      prefix = '[ ]';
      indicator = '   ';
    }
    return '<span class="stage-prefix">' + prefix + '</span>' +
           '<span class="stage-num">STAGE ' + num + ':</span>' +
           indicator + STAGES[index];
  }

  /* ----------------------------------------------------------
     RENDER PLAYER STATE (bridge to existing callers)
     ---------------------------------------------------------- */
  function renderPlayerState(state) {
    if (!state) return;
    updateMyDisplay(state);
  }

  /* ----------------------------------------------------------
     UPDATE LAUNCH SEQUENCE (public API)
     ---------------------------------------------------------- */
  function updateLaunchSequence(gameState, mySocketId) {
    if (!launchStagesEl || !otherPlayersEl) init(null);
    if (!gameState || !gameState.players) return;

    var me = gameState.players[mySocketId];
    if (me) updateMyDisplay(me);

    updateOtherPlayers(gameState.players, mySocketId);
  }

  /* ----------------------------------------------------------
     UPDATE MY DISPLAY
     ---------------------------------------------------------- */
  function updateMyDisplay(player) {
    if (!launchStagesEl) return;
    var stage = player.launchStage || 0;
    var status = player.status || 'playing';
    var wrong = player.wrongGuesses || 0;
    var guessed = player.guessedLetters || [];

    var stateKey = stage + '|' + status + '|' + wrong + '|' + guessed.join(',');
    if (stateKey === renderedMyState) return;
    renderedMyState = stateKey;

    var endstate = document.getElementById('launch-endstate');

    if (status === 'won') {
      showEndOverlay(endstate, 'won');
      return;
    }
    if (status === 'lost') {
      showEndOverlay(endstate, 'lost');
      setAllStagesActive();
      return;
    }

    // Hide endstate if playing
    if (endstate) endstate.classList.add('hidden');

    // Update each stage item
    var items = launchStagesEl.querySelectorAll('.stage-item');
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var idx = parseInt(item.dataset.stage, 10);
      var state, cls;

      if (stage > 0 && idx < stage - 1) {
        state = 'complete';
        cls = 'stage-item stage-complete';
      } else if (stage > 0 && idx === stage - 1) {
        state = 'active';
        cls = 'stage-item stage-active';
      } else {
        state = 'pending';
        cls = 'stage-item stage-pending';
      }

      if (stage >= 6) cls += ' danger-critical';
      else if (stage >= 4) cls += ' danger-high';
      else if (stage >= 2) cls += ' danger-mid';

      if (item.className !== cls) item.className = cls;
      item.innerHTML = formatStage(idx, state);
    }

    // Update stats
    var wrongEl = document.getElementById('wrong-count');
    var guessedEl = document.getElementById('guessed-letters');
    if (wrongEl) wrongEl.textContent = 'WRONG GUESSES: ' + wrong + '/' + TOTAL_STAGES;
    if (guessedEl) {
      guessedEl.textContent = 'GUESSED LETTERS: ' +
        (guessed.length > 0 ? guessed.join(', ') : '\u2014');
    }
  }

  /* ----------------------------------------------------------
     SET ALL STAGES ACTIVE (for lose state)
     ---------------------------------------------------------- */
  function setAllStagesActive() {
    var items = launchStagesEl.querySelectorAll('.stage-item');
    for (var i = 0; i < items.length; i++) {
      items[i].className = 'stage-item stage-complete danger-critical';
      items[i].innerHTML = formatStage(parseInt(items[i].dataset.stage, 10), 'complete');
    }
  }

  /* ----------------------------------------------------------
     SHOW END-STATE OVERLAY
     ---------------------------------------------------------- */
  function showEndOverlay(el, type) {
    if (!el) return;
    el.classList.remove('hidden');

    if (type === 'won') {
      el.className = 'launch-endstate endstate-win';
      el.innerHTML =
        '<div class="endstate-icon">\u2713</div>' +
        '<div class="endstate-title">LAUNCH ABORTED</div>' +
        '<div class="endstate-sub">CRISIS AVERTED \u2014 STAND DOWN</div>';
    } else {
      el.className = 'launch-endstate endstate-lose';
      el.innerHTML =
        '<div class="endstate-icon">\u2622</div>' +
        '<div class="endstate-title">MISSILE LAUNCHED</div>' +
        '<div class="endstate-sub">GLOBAL THERMONUCLEAR WAR</div>';
    }
  }

  /* ----------------------------------------------------------
     UPDATE OTHER PLAYERS
     ---------------------------------------------------------- */
  function updateOtherPlayers(players, mySocketId) {
    if (!otherPlayersEl || !players) return;

    var otherIds = Object.keys(players).filter(function (id) {
      return id !== mySocketId;
    });

    if (otherIds.length === 0) {
      otherPlayersEl.innerHTML = '';
      renderedOtherKeys = '';
      return;
    }

    var newKey = otherIds.map(function (id) {
      var p = players[id];
      return id + ':' + (p.launchStage || 0) + ':' + (p.status || '') + ':' + (p.wrongGuesses || 0);
    }).join('|');

    if (newKey === renderedOtherKeys) return;
    renderedOtherKeys = newKey;

    var html = '<div class="launch-header" style="font-size:11px;">\u2550\u2550\u2550 OTHER OPERATIVES \u2550\u2550\u2550</div>';

    otherIds.forEach(function (id) {
      var p = players[id];
      var stage = p.launchStage || 0;
      var status = p.status || 'playing';
      var name = p.username || 'UNKNOWN';
      var dangerClass = getDangerClass(stage);
      var statusText, statusCls;

      if (status === 'won') {
        statusText = 'ABORTED';
        statusCls = 'op-status-safe';
      } else if (status === 'lost') {
        statusText = 'LAUNCHED';
        statusCls = 'op-status-dead';
      } else {
        statusText = 'ACTIVE';
        statusCls = 'op-status-active';
      }

      // Mini progress bar
      var bar = '';
      for (var i = 0; i < TOTAL_STAGES; i++) {
        if (i < stage) bar += '\u2588';
        else bar += '\u2591';
      }

      html +=
        '<div class="other-player-panel ' + dangerClass + '">' +
          '<div class="op-header">' +
            '<span class="op-name">' + escapeHtml(name) + '</span>' +
            '<span class="op-status ' + statusCls + '">' + statusText + '</span>' +
          '</div>' +
          '<div class="op-progress">' +
            '<span class="op-bar">[' + bar + ']</span>' +
            '<span class="op-stage">STAGE ' + stage + '/' + TOTAL_STAGES + '</span>' +
          '</div>' +
        '</div>';
    });

    otherPlayersEl.innerHTML = html;
  }

  /* ----------------------------------------------------------
     DANGER CLASS HELPER
     ---------------------------------------------------------- */
  function getDangerClass(stage) {
    if (stage >= 6) return 'danger-critical';
    if (stage >= 4) return 'danger-high';
    if (stage >= 2) return 'danger-mid';
    return 'danger-low';
  }

  /* ----------------------------------------------------------
     WIN SCREEN — "LAUNCH ABORTED" Animation Sequence
     ---------------------------------------------------------- */
  function showWinScreen() {
    var endstate = document.getElementById('launch-endstate');
    showEndOverlay(endstate, 'won');

    // Build full-screen overlay
    var overlay = document.createElement('div');
    overlay.className = 'win-overlay';
    overlay.id = 'win-overlay';

    var container = document.createElement('div');
    container.className = 'win-sequence';
    overlay.appendChild(container);

    var mainArea = document.getElementById('main-area');
    mainArea.appendChild(overlay);

    // Force reflow then trigger entrance
    overlay.offsetHeight;
    overlay.classList.add('win-overlay-visible');

    var lines = [
      { text: 'PASSWORD ACCEPTED', cls: 'win-line', delay: 600 },
      { text: 'ABORT CODE: CPE 1704 TKS', cls: 'win-line win-line-dim', delay: 900 },
      { text: 'TRANSMITTING ABORT SIGNAL...', cls: 'win-line', delay: 1000 },
      { text: '. . .', cls: 'win-line win-line-dots', delay: 1200 },
      { text: 'LAUNCH SEQUENCE TERMINATED', cls: 'win-line', delay: 800 },
      { text: 'LAUNCH ABORTED', cls: 'win-line-hero', delay: 1000 },
      { text: 'ALL MISSILES STANDING DOWN', cls: 'win-line', delay: 800 },
      { text: 'DEFCON STATUS: 5 \u2014 PEACE CONDITION', cls: 'win-line win-line-dim', delay: 800 },
      { text: '\u262E', cls: 'win-peace-symbol', delay: 700 },
      { text: 'GAME OVER \u2014 YOU WIN', cls: 'win-line win-line-final', delay: 600 }
    ];

    var totalDelay = 400;

    lines.forEach(function (line) {
      totalDelay += line.delay;
      setTimeout(function () {
        var el = document.createElement('div');
        el.className = line.cls;
        el.textContent = line.text;
        container.appendChild(el);

        // Force reflow then animate in
        el.offsetHeight;
        el.classList.add('win-line-visible');

        // CRT flash on the hero line
        if (line.cls.indexOf('win-line-hero') !== -1) {
          overlay.classList.add('win-flash');
          setTimeout(function () {
            overlay.classList.remove('win-flash');
          }, 200);
        }
      }, totalDelay);
    });

    // "PLAY AGAIN" button after all lines
    totalDelay += 1200;
    setTimeout(function () {
      var btn = document.createElement('button');
      btn.className = 'win-play-again';
      btn.textContent = 'PLAY AGAIN';
      btn.addEventListener('click', function () {
        if (_socket) _socket.emit('playAgain');
        window.location.reload();
      });
      container.appendChild(btn);
      btn.offsetHeight;
      btn.classList.add('win-line-visible');
    }, totalDelay);
  }

  function showLoseScreen() {
    var endstate = document.getElementById('launch-endstate');
    showEndOverlay(endstate, 'lost');
    setAllStagesActive();

    // Launch full-screen nuclear war animation after a brief delay
    setTimeout(function () {
      var overlay = document.createElement('div');
      overlay.id = 'nuke-war-overlay';
      document.body.appendChild(overlay);
      if (window.Animations && window.Animations.playNuclearWar) {
        window.Animations.playNuclearWar(overlay);
      }
    }, 1800);
  }

  /* ----------------------------------------------------------
     UTIL
     ---------------------------------------------------------- */
  function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  /* ----------------------------------------------------------
     PUBLIC API
     ---------------------------------------------------------- */
  window.Game = {
    init: init,
    updateLaunchSequence: updateLaunchSequence,
    showWinScreen: showWinScreen,
    showLoseScreen: showLoseScreen
  };
})();
