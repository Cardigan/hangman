// animations.js — Launch stage animations + Nuclear War sequence for WOPR terminal
(function () {
  'use strict';

  var LAUNCH_STAGES = [
    'SAFETY DISENGAGED',
    'TARGETING LOCKED',
    'PRIMER READY',
    'PREFLIGHT CHECKED',
    'WARHEAD ARMED',
    'READY TO FIRE',
    'MISSILE LAUNCHED'
  ];

  function updateLaunchStages(currentStage) {
    var container = document.getElementById('launch-stages');
    if (!container) return;

    container.innerHTML = '';
    for (var i = 0; i < LAUNCH_STAGES.length; i++) {
      var el = document.createElement('div');
      el.className = 'launch-stage';
      if (i < currentStage) {
        el.classList.add('stage-complete');
      } else if (i === currentStage) {
        el.classList.add('stage-active');
      }
      el.textContent = LAUNCH_STAGES[i];
      container.appendChild(el);
    }
  }

  /* ============================================================
     THERMONUCLEAR WAR CANVAS ANIMATION
     ============================================================ */

  // Simplified world map continent outlines (normalized 0-1 coordinates)
  var CONTINENTS = {
    northAmerica: [
      [0.10,0.18],[0.05,0.22],[0.04,0.28],[0.06,0.32],[0.08,0.34],
      [0.10,0.38],[0.08,0.42],[0.06,0.44],[0.07,0.48],[0.10,0.50],
      [0.14,0.52],[0.16,0.54],[0.18,0.56],[0.20,0.54],[0.22,0.50],
      [0.24,0.48],[0.22,0.44],[0.20,0.40],[0.22,0.36],[0.24,0.32],
      [0.22,0.28],[0.20,0.24],[0.18,0.20],[0.14,0.18],[0.10,0.18]
    ],
    southAmerica: [
      [0.22,0.56],[0.20,0.60],[0.21,0.64],[0.23,0.68],[0.24,0.72],
      [0.23,0.76],[0.22,0.80],[0.21,0.84],[0.19,0.88],[0.20,0.90],
      [0.22,0.86],[0.24,0.82],[0.26,0.78],[0.28,0.72],[0.29,0.66],
      [0.27,0.62],[0.25,0.58],[0.22,0.56]
    ],
    europe: [
      [0.44,0.18],[0.42,0.22],[0.44,0.26],[0.46,0.28],[0.48,0.32],
      [0.46,0.36],[0.44,0.38],[0.46,0.36],[0.50,0.34],[0.52,0.30],
      [0.54,0.26],[0.52,0.22],[0.50,0.20],[0.48,0.18],[0.44,0.18]
    ],
    africa: [
      [0.44,0.40],[0.42,0.44],[0.43,0.50],[0.44,0.56],[0.46,0.62],
      [0.48,0.68],[0.50,0.72],[0.52,0.76],[0.54,0.72],[0.56,0.66],
      [0.57,0.60],[0.56,0.54],[0.54,0.48],[0.52,0.44],[0.50,0.40],
      [0.48,0.38],[0.44,0.40]
    ],
    asia: [
      [0.54,0.18],[0.56,0.16],[0.60,0.14],[0.66,0.16],[0.72,0.18],
      [0.78,0.20],[0.84,0.24],[0.88,0.28],[0.90,0.32],[0.88,0.36],
      [0.84,0.38],[0.80,0.40],[0.76,0.42],[0.72,0.44],[0.68,0.42],
      [0.64,0.40],[0.62,0.38],[0.60,0.36],[0.58,0.34],[0.56,0.30],
      [0.54,0.26],[0.54,0.22],[0.54,0.18]
    ],
    australia: [
      [0.80,0.62],[0.78,0.66],[0.80,0.70],[0.84,0.72],[0.88,0.70],
      [0.90,0.66],[0.88,0.62],[0.84,0.60],[0.80,0.62]
    ]
  };

  // Missile trajectories: [startX, startY, endX, endY] in normalized coords
  // USSR → US
  var MISSILES_USSR_TO_US = [
    { from: [0.56, 0.24], to: [0.16, 0.38], label: 'MOSCOW → WASHINGTON DC' },
    { from: [0.56, 0.24], to: [0.20, 0.36], label: 'MOSCOW → NEW YORK' },
    { from: [0.52, 0.22], to: [0.12, 0.40], label: 'ST PETERSBURG → CHICAGO' },
    { from: [0.68, 0.24], to: [0.08, 0.46], label: 'NOVOSIBIRSK → LOS ANGELES' },
    { from: [0.56, 0.24], to: [0.10, 0.44], label: 'MOSCOW → SAN FRANCISCO' },
    { from: [0.60, 0.22], to: [0.14, 0.42], label: 'VOLGOGRAD → HOUSTON' },
    { from: [0.64, 0.20], to: [0.18, 0.34], label: 'OMSK → BOSTON' },
    { from: [0.56, 0.24], to: [0.16, 0.44], label: 'MOSCOW → DALLAS' },
    { from: [0.68, 0.24], to: [0.08, 0.38], label: 'NOVOSIBIRSK → SEATTLE' },
    { from: [0.52, 0.22], to: [0.12, 0.36], label: 'ST PETERSBURG → DETROIT' }
  ];

  // US → USSR
  var MISSILES_US_TO_USSR = [
    { from: [0.16, 0.38], to: [0.56, 0.24], label: 'WASHINGTON → MOSCOW' },
    { from: [0.08, 0.46], to: [0.68, 0.24], label: 'LA → NOVOSIBIRSK' },
    { from: [0.20, 0.36], to: [0.52, 0.22], label: 'NEW YORK → ST PETERSBURG' },
    { from: [0.12, 0.40], to: [0.60, 0.22], label: 'CHICAGO → VOLGOGRAD' },
    { from: [0.08, 0.38], to: [0.64, 0.26], label: 'SEATTLE → KRASNOYARSK' }
  ];

  var DESTROYED_CITIES = [
    'WASHINGTON DC ..... DESTROYED',
    'NEW YORK .......... DESTROYED',
    'LOS ANGELES ....... DESTROYED',
    'CHICAGO ........... DESTROYED',
    'SAN FRANCISCO ..... DESTROYED',
    'HOUSTON ........... DESTROYED',
    'SEATTLE ........... DESTROYED',
    'BOSTON ............. DESTROYED',
    'MOSCOW ............ DESTROYED',
    'ST PETERSBURG ..... DESTROYED',
    'NOVOSIBIRSK ....... DESTROYED',
    'VOLGOGRAD ......... DESTROYED'
  ];

  var WARNING_MESSAGES = [
    'WARNING: MISSILE LAUNCH DETECTED',
    'ICBM TRAJECTORIES CALCULATED',
    'IMPACT ESTIMATED: 27 MINUTES'
  ];

  /* ----------------------------------------------------------
     playNuclearWar(container) — main entry point
     ---------------------------------------------------------- */
  function playNuclearWar(container) {
    container.innerHTML = '';
    container.classList.add('nuke-overlay');

    // Build internal DOM
    var textLayer = document.createElement('div');
    textLayer.className = 'nuke-text-layer';
    container.appendChild(textLayer);

    var canvas = document.createElement('canvas');
    canvas.className = 'nuke-canvas';
    container.appendChild(canvas);

    var uiLayer = document.createElement('div');
    uiLayer.className = 'nuke-ui-layer';
    container.appendChild(uiLayer);

    function sizeCanvas() {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    }
    sizeCanvas();
    window.addEventListener('resize', sizeCanvas);

    var ctx = canvas.getContext('2d');

    // Run phases sequentially
    phase1Warning(textLayer, function () {
      textLayer.style.display = 'none';
      canvas.style.display = 'block';
      phase2Map(ctx, canvas, function () {
        phase3Report(uiLayer, function () {
          phase4Final(uiLayer, container);
        });
      });
    });
  }

  /* ----------------------------------------------------------
     PHASE 1 — Warning text sequence
     ---------------------------------------------------------- */
  function phase1Warning(textLayer, onDone) {
    textLayer.innerHTML = '';
    var idx = 0;

    function showNext() {
      if (idx >= WARNING_MESSAGES.length) {
        setTimeout(onDone, 600);
        return;
      }
      var line = document.createElement('div');
      line.className = 'nuke-warning-line';
      line.textContent = WARNING_MESSAGES[idx];
      textLayer.appendChild(line);
      idx++;
      setTimeout(showNext, 900);
    }
    showNext();
  }

  /* ----------------------------------------------------------
     PHASE 2 — World map + missile arcs
     ---------------------------------------------------------- */
  function phase2Map(ctx, canvas, onDone) {
    var w = canvas.width;
    var h = canvas.height;
    var allMissiles = MISSILES_USSR_TO_US.concat(MISSILES_US_TO_USSR);
    var totalArcs = allMissiles.length;
    var arcProgress = new Array(totalArcs); // 0-1 progress per arc
    for (var i = 0; i < totalArcs; i++) arcProgress[i] = 0;
    var impacts = []; // { x, y, radius, maxRadius, alpha, color }
    var startTime = performance.now();
    var PHASE_DURATION = 9000; // 9 seconds
    var ARC_STAGGER = PHASE_DURATION * 0.6 / totalArcs; // stagger start times
    var ARC_DRAW_TIME = 2200;

    function drawMap() {
      ctx.strokeStyle = '#00cc33';
      ctx.lineWidth = 1.2;
      ctx.globalAlpha = 0.5;
      var keys = Object.keys(CONTINENTS);
      for (var c = 0; c < keys.length; c++) {
        var pts = CONTINENTS[keys[c]];
        ctx.beginPath();
        ctx.moveTo(pts[0][0] * w, pts[0][1] * h);
        for (var p = 1; p < pts.length; p++) {
          ctx.lineTo(pts[p][0] * w, pts[p][1] * h);
        }
        ctx.closePath();
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    function drawGrid() {
      ctx.strokeStyle = '#003d10';
      ctx.lineWidth = 0.5;
      ctx.globalAlpha = 0.3;
      for (var gx = 0; gx < w; gx += w / 20) {
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke();
      }
      for (var gy = 0; gy < h; gy += h / 12) {
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    function getArcPoint(missile, t) {
      var x0 = missile.from[0] * w;
      var y0 = missile.from[1] * h;
      var x1 = missile.to[0] * w;
      var y1 = missile.to[1] * h;
      var cx = (x0 + x1) / 2;
      var cy = Math.min(y0, y1) - h * 0.18; // arc peak above
      // Quadratic bezier
      var mt = 1 - t;
      var x = mt * mt * x0 + 2 * mt * t * cx + t * t * x1;
      var y = mt * mt * y0 + 2 * mt * t * cy + t * t * y1;
      return { x: x, y: y };
    }

    function drawArcs(elapsed) {
      for (var i = 0; i < totalArcs; i++) {
        var arcStart = i * ARC_STAGGER;
        var arcElapsed = elapsed - arcStart;
        if (arcElapsed < 0) continue;

        var progress = Math.min(arcElapsed / ARC_DRAW_TIME, 1);
        arcProgress[i] = progress;

        var missile = allMissiles[i];
        var isUS = i >= MISSILES_USSR_TO_US.length;

        // Draw arc trail
        ctx.beginPath();
        ctx.strokeStyle = isUS ? '#ffaa00' : '#00ff41';
        ctx.lineWidth = 1.8;
        ctx.shadowColor = isUS ? '#ffaa00' : '#00ff41';
        ctx.shadowBlur = 6;

        var steps = Math.floor(progress * 60);
        for (var s = 0; s <= steps; s++) {
          var t = s / 60;
          var pt = getArcPoint(missile, t);
          if (s === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Draw warhead dot at tip
        if (progress < 1) {
          var tip = getArcPoint(missile, progress);
          ctx.beginPath();
          ctx.fillStyle = '#ffffff';
          ctx.arc(tip.x, tip.y, 3, 0, Math.PI * 2);
          ctx.fill();
        }

        // Launch site marker
        ctx.beginPath();
        ctx.fillStyle = isUS ? '#ffaa00' : '#ff3333';
        ctx.arc(missile.from[0] * w, missile.from[1] * h, 3, 0, Math.PI * 2);
        ctx.fill();

        // Impact when arc completes
        if (progress >= 1 && !missile._impacted) {
          missile._impacted = true;
          impacts.push({
            x: missile.to[0] * w,
            y: missile.to[1] * h,
            radius: 0,
            maxRadius: 30 + Math.random() * 20,
            alpha: 1,
            phase: 0 // 0=expanding white, 1=red, 2=fading
          });
        }
      }
    }

    function drawImpacts() {
      for (var i = impacts.length - 1; i >= 0; i--) {
        var imp = impacts[i];
        imp.radius += 1.5;
        if (imp.radius > imp.maxRadius) {
          imp.alpha -= 0.03;
        }
        if (imp.alpha <= 0) {
          impacts.splice(i, 1);
          continue;
        }

        ctx.beginPath();
        var gradient = ctx.createRadialGradient(
          imp.x, imp.y, 0,
          imp.x, imp.y, imp.radius
        );
        if (imp.radius < imp.maxRadius * 0.5) {
          gradient.addColorStop(0, 'rgba(255,255,255,' + imp.alpha + ')');
          gradient.addColorStop(1, 'rgba(255,100,100,' + (imp.alpha * 0.5) + ')');
        } else {
          gradient.addColorStop(0, 'rgba(255,50,50,' + (imp.alpha * 0.8) + ')');
          gradient.addColorStop(1, 'rgba(255,0,0,0)');
        }
        ctx.fillStyle = gradient;
        ctx.arc(imp.x, imp.y, imp.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function drawHeader(elapsed) {
      ctx.fillStyle = '#00ff41';
      ctx.font = '14px "Courier New", monospace';
      ctx.textAlign = 'left';
      ctx.globalAlpha = 0.8;
      ctx.fillText('NORAD GLOBAL DEFENSE NETWORK', 10, 20);
      ctx.fillText('TRACKING: ' + totalArcs + ' ICBM TRAJECTORIES', 10, 38);
      var blink = Math.floor(elapsed / 500) % 2 === 0;
      if (blink) {
        ctx.fillStyle = '#ff3333';
        ctx.fillText('⚠ DEFCON 1 — NUCLEAR ATTACK IN PROGRESS', 10, 56);
      }
      ctx.globalAlpha = 1;
      ctx.textAlign = 'start';
    }

    var animId;
    function frame() {
      var elapsed = performance.now() - startTime;

      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#000a00';
      ctx.fillRect(0, 0, w, h);

      drawGrid();
      drawMap();
      drawHeader(elapsed);
      drawArcs(elapsed);
      drawImpacts();

      if (elapsed < PHASE_DURATION) {
        animId = requestAnimationFrame(frame);
      } else {
        // Let remaining impacts finish
        setTimeout(onDone, 1200);
      }
    }
    animId = requestAnimationFrame(frame);
  }

  /* ----------------------------------------------------------
     PHASE 3 — Damage report + casualty counter
     ---------------------------------------------------------- */
  function phase3Report(uiLayer, onDone) {
    uiLayer.innerHTML = '';
    uiLayer.style.display = 'flex';
    uiLayer.className = 'nuke-ui-layer nuke-report';

    var header = document.createElement('div');
    header.className = 'nuke-report-header';
    header.textContent = '▌ DAMAGE ASSESSMENT REPORT ▐';
    uiLayer.appendChild(header);

    var list = document.createElement('div');
    list.className = 'nuke-city-list';
    uiLayer.appendChild(list);

    var casualtyLine = document.createElement('div');
    casualtyLine.className = 'nuke-casualty-counter';
    casualtyLine.textContent = 'ESTIMATED CASUALTIES: 0';
    uiLayer.appendChild(casualtyLine);

    var cityIdx = 0;
    var targetCasualties = 150000000;
    var currentCasualties = 0;
    var casualtyInterval;

    function showNextCity() {
      if (cityIdx >= DESTROYED_CITIES.length) {
        // Start casualty counter
        startCasualtyCounter();
        return;
      }
      var line = document.createElement('div');
      line.className = 'nuke-city-line';
      line.textContent = DESTROYED_CITIES[cityIdx];
      list.appendChild(line);
      cityIdx++;
      setTimeout(showNextCity, 250);
    }

    function startCasualtyCounter() {
      var step = Math.floor(targetCasualties / 80);
      casualtyInterval = setInterval(function () {
        currentCasualties += step + Math.floor(Math.random() * step * 0.5);
        if (currentCasualties >= targetCasualties) {
          currentCasualties = targetCasualties;
          clearInterval(casualtyInterval);
          setTimeout(onDone, 1500);
        }
        casualtyLine.textContent = 'ESTIMATED CASUALTIES: ' + currentCasualties.toLocaleString();
      }, 30);
    }

    showNextCity();
  }

  /* ----------------------------------------------------------
     PHASE 4 — WarGames final quote + play again
     ---------------------------------------------------------- */
  function phase4Final(uiLayer, container) {
    uiLayer.innerHTML = '';
    uiLayer.className = 'nuke-ui-layer nuke-final';

    var quotes = [
      'A STRANGE GAME.',
      'THE ONLY WINNING MOVE IS NOT TO PLAY.',
      '',
      'HOW ABOUT A NICE GAME OF CHESS?'
    ];

    var quoteContainer = document.createElement('div');
    quoteContainer.className = 'nuke-quote-container';
    uiLayer.appendChild(quoteContainer);

    var idx = 0;
    function showNextQuote() {
      if (idx >= quotes.length) {
        setTimeout(showPlayAgain, 1200);
        return;
      }
      var line = document.createElement('div');
      line.className = 'nuke-quote-line';
      if (quotes[idx] === '') {
        line.innerHTML = '&nbsp;';
      } else {
        typeText(line, quotes[idx], 60, function () {
          idx++;
          setTimeout(showNextQuote, 800);
        });
        quoteContainer.appendChild(line);
        return;
      }
      quoteContainer.appendChild(line);
      idx++;
      setTimeout(showNextQuote, 400);
    }

    function showPlayAgain() {
      var btn = document.createElement('button');
      btn.className = 'nuke-play-again';
      btn.textContent = 'PLAY AGAIN';
      btn.addEventListener('click', function () {
        container.remove();
        window.location.reload();
      });
      uiLayer.appendChild(btn);
    }

    showNextQuote();
  }

  /* ----------------------------------------------------------
     UTIL: typewriter effect
     ---------------------------------------------------------- */
  function typeText(el, text, speed, onDone) {
    var i = 0;
    function tick() {
      if (i < text.length) {
        el.textContent += text[i];
        i++;
        setTimeout(tick, speed);
      } else if (onDone) {
        onDone();
      }
    }
    tick();
  }

  /* ----------------------------------------------------------
     PUBLIC API
     ---------------------------------------------------------- */
  window.Animations = {
    updateLaunchStages: updateLaunchStages,
    playNuclearWar: playNuclearWar
  };
})();
