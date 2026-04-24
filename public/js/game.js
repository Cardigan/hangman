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
  var briefingActive = false;
  var briefingContainer = null;

  /* ----------------------------------------------------------
     INIT
     ---------------------------------------------------------- */
  function init(socket, gameState) {
    _socket = socket;
    launchStagesEl = document.getElementById('launch-stages');
    otherPlayersEl = document.getElementById('other-players');
    renderedMyState = null;
    buildLaunchDisplay();
    showBriefing();

    // Initialize world map background canvas
    if (window.WorldMap) {
      window.WorldMap.init();
    }

    if (gameState) {
      updateMyDisplay(gameState);
    }

    if (socket) {
      socket.on('guessResult', function (data) {
        clearBriefing();
        if (data.gameState) updateMyDisplay(data.gameState);
      });
    }
  }

  /* ----------------------------------------------------------
     BRIEFING — Intro typewriter sequence
     ---------------------------------------------------------- */
  var BRIEFING_LINES = [
    { text: 'NORAD DEFENSE NETWORK \u2014 PRIORITY ALPHA', cls: 'briefing-header' },
    { text: '\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501', cls: 'briefing-divider' },
    { text: '', cls: 'briefing-blank' },
    { text: 'ALERT: UNAUTHORIZED LAUNCH SEQUENCE DETECTED', cls: 'briefing-highlight' },
    { text: 'ORIGIN: UNKNOWN HOSTILE ACTOR', cls: '' },
    { text: '', cls: 'briefing-blank' },
    { text: 'AN ICBM LAUNCH HAS BEEN INITIATED.', cls: '' },
    { text: 'YOU MUST DECODE THE ABORT PASSWORD TO STOP IT.', cls: 'briefing-highlight' },
    { text: '', cls: 'briefing-blank' },
    { text: '\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501 TERMINAL CONTROLS \u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501', cls: 'briefing-divider' },
    { text: '', cls: 'briefing-blank' },
    { text: 'TYPE ?X TO GUESS A LETTER  (e.g. ?A, ?E, ?T)', cls: 'briefing-highlight' },
    { text: 'ALL OTHER INPUT GOES TO CHAT', cls: '' },
    { text: '', cls: 'briefing-blank' },
    { text: '\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501 MISSION PARAMETERS \u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501', cls: 'briefing-divider' },
    { text: '', cls: 'briefing-blank' },
    { text: 'WRONG GUESSES REMAINING: 7', cls: '' },
    { text: 'EACH WRONG GUESS ADVANCES THE LAUNCH SEQUENCE', cls: '' },
    { text: '7 WRONG GUESSES = NUCLEAR LAUNCH \u2014 GAME OVER', cls: 'briefing-highlight' },
    { text: '', cls: 'briefing-blank' },
    { text: 'THE FATE OF MILLIONS DEPENDS ON YOU.', cls: '' },
    { text: 'GOOD LUCK, OPERATIVE.', cls: 'briefing-header' }
  ];

  function showBriefing() {
    if (!launchStagesEl) return;

    // Hide the launch display while briefing is active
    var children = launchStagesEl.children;
    for (var i = 0; i < children.length; i++) {
      children[i].style.display = 'none';
    }

    briefingContainer = document.createElement('div');
    briefingContainer.className = 'briefing-container';
    launchStagesEl.insertBefore(briefingContainer, launchStagesEl.firstChild);
    briefingActive = true;

    BRIEFING_LINES.forEach(function (line, idx) {
      setTimeout(function () {
        if (!briefingActive) return;
        var el = document.createElement('div');
        var classes = 'briefing-line';
        if (line.cls) classes += ' ' + line.cls;
        el.className = classes;
        if (line.text) {
          el.textContent = '> ' + line.text;
        }
        briefingContainer.appendChild(el);
        // Trigger visibility after a frame
        requestAnimationFrame(function () {
          el.classList.add('visible');
        });
      }, idx * 120);
    });
  }

  function clearBriefing() {
    if (!briefingActive || !briefingContainer) return;
    briefingActive = false;

    briefingContainer.classList.add('briefing-fade-out');
    setTimeout(function () {
      if (briefingContainer && briefingContainer.parentNode) {
        briefingContainer.parentNode.removeChild(briefingContainer);
      }
      briefingContainer = null;
      // Restore launch display children
      if (launchStagesEl) {
        var children = launchStagesEl.children;
        for (var i = 0; i < children.length; i++) {
          children[i].style.display = '';
        }
      }
    }, 500);
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
  function updateLaunchSequence(gameState) {
    if (!launchStagesEl) init(null);
    if (!gameState) return;

    // Shared game state — fields are directly on gameState
    updateMyDisplay(gameState);
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

    // Update world map escalation
    if (window.WorldMap) {
      window.WorldMap.setStage(stage);
    }

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

    // Update consequence messages
    updateConsequences(stage, status);
  }

  /* ----------------------------------------------------------
     CONSEQUENCE ESCALATION DATA
     ---------------------------------------------------------- */
  var CONSEQUENCE_MESSAGES = [
    [], // Stage 0: no misses
    [ // Stage 1: SAFETY DISENGAGED
      { text: 'INITIAL TARGET ASSESSMENT: 14 CITIES', level: 'green' },
      { text: 'PROJECTED CIVILIAN CASUALTIES: CALCULATING...', level: 'green' },
      { text: 'PROBABILITY OF MAD MAX STYLE FUTURE: 12%', level: 'green' },
      { text: 'YOUR TINDER MATCHES: ABOUT TO BECOME IRRELEVANT', level: 'green' }
    ],
    [ // Stage 2: TARGETING LOCKED
      { text: 'PRIMARY TARGETS: WASHINGTON DC, NEW YORK, CHICAGO, LOS ANGELES', level: 'amber' },
      { text: 'PROJECTED CASUALTIES: 28,000,000', level: 'amber' },
      { text: 'LIKELIHOOD OF MUTANT BABY GROWING INSIDE YOU: 15%', level: 'amber' },
      { text: 'YOUR STUDENT LOANS: FINALLY NOT YOUR BIGGEST PROBLEM', level: 'amber' },
      { text: 'CHANCE OF EVER SEEING ANOTHER SUNSET: DECREASING', level: 'amber' }
    ],
    [ // Stage 3: PRIMER READY
      { text: 'SECONDARY TARGETS: SEATTLE, HOUSTON, MIAMI, BOSTON, DENVER, ATLANTA', level: 'amber' },
      { text: 'PROJECTED CASUALTIES: 67,000,000', level: 'amber' },
      { text: 'NUCLEAR WINTER PROBABILITY: 43%', level: 'amber' },
      { text: 'PROBABILITY OF MAD MAX FUTURE INCREASED TO 48%', level: 'amber' },
      { text: '...BUT NOT COOL LIKE IN THE MOVIE', level: 'amber' },
      { text: 'WORLDWIDE PIZZA DELIVERY: PERMANENTLY DISCONTINUED', level: 'amber' },
      { text: 'YOUR MOM WILL DEFINITELY BLAME YOU FOR THIS', level: 'amber' }
    ],
    [ // Stage 4: PREFLIGHT CHECKED
      { text: 'RETALIATORY STRIKE AUTHORIZED', level: 'red' },
      { text: 'MUTUAL ASSURED DESTRUCTION PROTOCOL ENGAGED', level: 'red' },
      { text: 'PROJECTED GLOBAL CASUALTIES: 150,000,000', level: 'red' },
      { text: 'LIKELIHOOD OF MUTANT BABY INSIDE YOU: 60%', level: 'red' },
      { text: 'WORLDWIDE CASUALTY RATE: 70%', level: 'red' },
      { text: 'IT IS GOING TO BE YOUR FAULT', level: 'red' },
      { text: 'YOUR BROWSER HISTORY WILL SURVIVE IN A GOVERNMENT BUNKER', level: 'red' },
      { text: 'COCKROACHES NOW STATISTICALLY MORE LIKELY TO SURVIVE THAN YOU', level: 'red' }
    ],
    [ // Stage 5: WARHEAD ARMED
      { text: 'ESTIMATED AFTERMATH: GLOBAL CROP FAILURE 3-5 YEARS', level: 'red' },
      { text: 'INFRASTRUCTURE COLLAPSE: COMPLETE', level: 'red' },
      { text: 'PROBABILITY OF MAD MAX FUTURE: 80%', level: 'red' },
      { text: 'STILL NOT COOL LIKE IN THE MOVIE. YOU WON\'T HAVE A COOL CAR.', level: 'red' },
      { text: 'WIFI: PERMANENTLY OFFLINE. LET THAT SINK IN.', level: 'red' },
      { text: 'YOUR SURVIVAL SKILLS FROM CAMPING THAT ONE TIME: INSUFFICIENT', level: 'red' },
      { text: 'EVERY PET ON EARTH IS NOW LOOKING AT YOU WITH DISAPPOINTMENT', level: 'red' },
      { text: 'CIVILIZATION RECOVERY TIME: UNKNOWN', level: 'red' },
      { text: 'YOU HAD ONE JOB. LITERALLY ONE.', level: 'red' }
    ],
    [ // Stage 6: READY TO FIRE
      { text: '\u26A0 THIS IS YOUR LAST CHANCE \u26A0', level: 'critical' },
      { text: 'ONE MORE FAILED ATTEMPT = TOTAL NUCLEAR WAR', level: 'critical' },
      { text: 'PROJECTED EXTINCTION EVENT PROBABILITY: 94%', level: 'critical' },
      { text: 'LIKELIHOOD OF MUTANT BABY: 100%. CONGRATS IT\'S A BOY.', level: 'critical' },
      { text: 'EVERY PERSON WHO EVER BELIEVED IN YOU IS WATCHING', level: 'critical' },
      { text: 'FUTURE HISTORIANS WILL SPELL YOUR NAME WRONG', level: 'critical' },
      { text: 'YOUR LAST MEAL SHOULD HAVE BEEN BETTER THAN WHAT YOU HAD', level: 'critical' },
      { text: 'THE COCKROACHES ARE ALREADY WRITING YOUR OBITUARY', level: 'critical' },
      { text: 'SERIOUSLY. JUST GET THIS NEXT ONE RIGHT. PLEASE.', level: 'critical' }
    ]
  ];

  var renderedConsequenceStage = -1;

  /* ----------------------------------------------------------
     UPDATE CONSEQUENCES DISPLAY
     ---------------------------------------------------------- */
  function updateConsequences(stage, status) {
    if (status === 'won' || status === 'lost') {
      var existing = document.getElementById('consequence-display');
      if (existing) existing.classList.add('hidden');
      renderedConsequenceStage = -1;
      return;
    }

    if (stage === renderedConsequenceStage) return;
    renderedConsequenceStage = stage;

    var container = document.getElementById('consequence-display');
    if (!container) {
      container = document.createElement('div');
      container.id = 'consequence-display';
      launchStagesEl.parentNode.insertBefore(container, launchStagesEl.nextSibling);
    }

    if (stage === 0) {
      container.classList.add('hidden');
      return;
    }

    container.classList.remove('hidden');
    container.innerHTML = '';

    // Header
    var header = document.createElement('div');
    header.className = 'consequence-header';
    header.textContent = '\u2550\u2550\u2550 DEFCON ANALYSIS \u2550\u2550\u2550';
    container.appendChild(header);

    // Determine overall threat class
    var threatClass = 'consequence-level-green';
    if (stage >= 5) threatClass = 'consequence-level-critical';
    else if (stage >= 4) threatClass = 'consequence-level-red';
    else if (stage >= 2) threatClass = 'consequence-level-amber';
    container.className = 'consequence-display ' + threatClass;

    // Accumulate all messages up to current stage
    var animDelay = 0;
    for (var s = 1; s <= stage && s < CONSEQUENCE_MESSAGES.length; s++) {
      var msgs = CONSEQUENCE_MESSAGES[s];
      var isNewStage = (s === stage);

      for (var m = 0; m < msgs.length; m++) {
        var line = document.createElement('div');
        line.className = 'consequence-line consequence-' + msgs[m].level;
        line.textContent = '> ' + msgs[m].text;

        if (isNewStage) {
          line.classList.add('consequence-new');
          line.style.animationDelay = (animDelay * 120) + 'ms';
          animDelay++;
        }

        container.appendChild(line);
      }

      // Separator between stages
      if (s < stage) {
        var sep = document.createElement('div');
        sep.className = 'consequence-separator';
        sep.textContent = '\u2500\u2500\u2500';
        container.appendChild(sep);
      }
    }

    // Auto-scroll to bottom after new messages render
    var totalAnimTime = animDelay * 120 + 400;
    setTimeout(function () {
      container.scrollTop = container.scrollHeight;
    }, totalAnimTime);
    // Also scroll immediately for already-visible content
    container.scrollTop = container.scrollHeight;
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

    // Play nuclear war animation INLINE in the main area (no screen change)
    setTimeout(function () {
      var mainArea = document.getElementById('main-area');
      if (!mainArea) return;
      var inlineContainer = document.createElement('div');
      inlineContainer.id = 'nuke-war-inline';
      inlineContainer.style.position = 'absolute';
      inlineContainer.style.top = '0';
      inlineContainer.style.left = '0';
      inlineContainer.style.width = '100%';
      inlineContainer.style.height = '100%';
      inlineContainer.style.zIndex = '10';
      mainArea.style.position = 'relative';
      mainArea.appendChild(inlineContainer);
      if (window.Animations && window.Animations.playNuclearWar) {
        window.Animations.playNuclearWar(inlineContainer);
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
