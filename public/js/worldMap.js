/* ============================================================
   WOPR WORLD MAP — Background Canvas
   Green wireframe world map display behind launch stages
   ============================================================ */
(function () {
  'use strict';

  var canvas = null;
  var ctx = null;
  var animFrameId = null;
  var currentStage = 0;

  // City coordinates in normalized [0-1] space (Mercator-ish)
  var CITIES = [
    { name: 'WASHINGTON', x: 0.235, y: 0.38, side: 'us' },
    { name: 'NEW YORK',  x: 0.26,  y: 0.36, side: 'us' },
    { name: 'LONDON',    x: 0.47,  y: 0.30, side: 'nato' },
    { name: 'MOSCOW',    x: 0.57,  y: 0.28, side: 'ussr' },
    { name: 'BEIJING',   x: 0.77,  y: 0.37, side: 'ussr' }
  ];

  // Threat lines between US and USSR cities (shown at higher stages)
  var THREAT_LINES = [
    { from: 0, to: 3 }, // DC -> Moscow
    { from: 1, to: 3 }, // NYC -> Moscow
    { from: 0, to: 4 }, // DC -> Beijing
    { from: 3, to: 2 }, // Moscow -> London
    { from: 3, to: 0 }  // Moscow -> DC (return)
  ];

  // Simplified continent outlines as arrays of [x, y] in 0-1 normalized coords
  var CONTINENTS = {
    northAmerica: [
      [0.10,0.18],[0.13,0.15],[0.17,0.13],[0.20,0.12],[0.22,0.14],
      [0.25,0.15],[0.27,0.18],[0.28,0.22],[0.30,0.25],[0.29,0.28],
      [0.27,0.30],[0.26,0.33],[0.25,0.36],[0.23,0.38],[0.21,0.40],
      [0.20,0.43],[0.19,0.45],[0.18,0.47],[0.17,0.48],[0.16,0.47],
      [0.15,0.45],[0.14,0.43],[0.13,0.42],[0.11,0.40],[0.10,0.38],
      [0.09,0.35],[0.07,0.33],[0.06,0.30],[0.05,0.27],[0.06,0.24],
      [0.07,0.22],[0.08,0.20],[0.10,0.18]
    ],
    southAmerica: [
      [0.22,0.50],[0.24,0.48],[0.27,0.49],[0.29,0.51],[0.30,0.54],
      [0.31,0.57],[0.31,0.60],[0.30,0.64],[0.29,0.68],[0.28,0.72],
      [0.27,0.76],[0.25,0.80],[0.24,0.82],[0.23,0.84],[0.22,0.82],
      [0.21,0.78],[0.20,0.74],[0.19,0.70],[0.19,0.66],[0.20,0.62],
      [0.20,0.58],[0.21,0.54],[0.22,0.50]
    ],
    europe: [
      [0.45,0.22],[0.47,0.20],[0.49,0.19],[0.51,0.20],[0.53,0.22],
      [0.54,0.24],[0.53,0.27],[0.52,0.30],[0.51,0.33],[0.50,0.35],
      [0.48,0.37],[0.47,0.38],[0.46,0.37],[0.44,0.35],[0.43,0.33],
      [0.44,0.30],[0.44,0.27],[0.45,0.24],[0.45,0.22]
    ],
    africa: [
      [0.45,0.40],[0.47,0.38],[0.49,0.39],[0.52,0.40],[0.54,0.42],
      [0.55,0.45],[0.56,0.50],[0.57,0.55],[0.56,0.60],[0.55,0.65],
      [0.54,0.70],[0.52,0.73],[0.50,0.75],[0.48,0.74],[0.46,0.72],
      [0.44,0.68],[0.43,0.63],[0.42,0.58],[0.42,0.53],[0.43,0.48],
      [0.44,0.44],[0.45,0.40]
    ],
    asia: [
      [0.55,0.18],[0.58,0.15],[0.62,0.13],[0.66,0.14],[0.70,0.15],
      [0.74,0.16],[0.78,0.18],[0.82,0.20],[0.85,0.22],[0.87,0.25],
      [0.88,0.28],[0.87,0.32],[0.85,0.35],[0.83,0.38],[0.80,0.40],
      [0.77,0.42],[0.74,0.43],[0.71,0.42],[0.68,0.40],[0.65,0.38],
      [0.62,0.37],[0.60,0.35],[0.58,0.33],[0.56,0.30],[0.55,0.27],
      [0.54,0.24],[0.55,0.20],[0.55,0.18]
    ],
    australia: [
      [0.80,0.62],[0.83,0.60],[0.86,0.61],[0.88,0.63],[0.90,0.66],
      [0.90,0.69],[0.89,0.72],[0.87,0.74],[0.85,0.75],[0.82,0.74],
      [0.80,0.72],[0.79,0.69],[0.78,0.66],[0.79,0.64],[0.80,0.62]
    ]
  };

  /* ----------------------------------------------------------
     INIT — Create canvas and start animation
     ---------------------------------------------------------- */
  function init() {
    var container = document.getElementById('launch-status');
    if (!container || canvas) return;

    canvas = document.createElement('canvas');
    canvas.id = 'world-map-canvas';
    canvas.className = 'world-map-canvas';
    container.appendChild(canvas);

    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
    animate();
  }

  /* ----------------------------------------------------------
     RESIZE — Fit canvas to container
     ---------------------------------------------------------- */
  function resize() {
    if (!canvas || !canvas.parentElement) return;
    var rect = canvas.parentElement.getBoundingClientRect();
    var dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /* ----------------------------------------------------------
     SET STAGE — Update escalation level (0-7)
     ---------------------------------------------------------- */
  function setStage(stage) {
    currentStage = stage || 0;
  }

  /* ----------------------------------------------------------
     ANIMATION LOOP
     ---------------------------------------------------------- */
  function animate() {
    draw(performance.now());
    animFrameId = requestAnimationFrame(animate);
  }

  /* ----------------------------------------------------------
     DRAW — Main render function
     ---------------------------------------------------------- */
  function draw(time) {
    if (!ctx || !canvas) return;
    var w = parseFloat(canvas.style.width) || canvas.width;
    var h = parseFloat(canvas.style.height) || canvas.height;
    if (w === 0 || h === 0) return;

    ctx.clearRect(0, 0, w, h);

    drawGrid(w, h, time);
    drawContinents(w, h);
    drawCities(w, h, time);

    if (currentStage >= 2) {
      drawThreatLines(w, h, time);
    }
  }

  /* ----------------------------------------------------------
     GRID — Lat/Long lines
     ---------------------------------------------------------- */
  function drawGrid(w, h) {
    ctx.strokeStyle = 'rgba(0, 255, 65, 0.04)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();

    // Longitude lines
    var lonStep = w / 12;
    for (var x = lonStep; x < w; x += lonStep) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }

    // Latitude lines
    var latStep = h / 8;
    for (var y = latStep; y < h; y += latStep) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }

    ctx.stroke();

    // Equator slightly brighter
    ctx.strokeStyle = 'rgba(0, 255, 65, 0.07)';
    ctx.beginPath();
    ctx.moveTo(0, h * 0.5);
    ctx.lineTo(w, h * 0.5);
    ctx.stroke();
  }

  /* ----------------------------------------------------------
     CONTINENTS — Wireframe outlines
     ---------------------------------------------------------- */
  function drawContinents(w, h) {
    var alpha = 0.12 + (currentStage * 0.01);
    ctx.strokeStyle = 'rgba(0, 255, 65, ' + Math.min(alpha, 0.22) + ')';
    ctx.lineWidth = 1;
    ctx.lineJoin = 'round';

    var keys = Object.keys(CONTINENTS);
    for (var k = 0; k < keys.length; k++) {
      var pts = CONTINENTS[keys[k]];
      if (pts.length < 2) continue;

      ctx.beginPath();
      ctx.moveTo(pts[0][0] * w, pts[0][1] * h);
      for (var i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i][0] * w, pts[i][1] * h);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }

  /* ----------------------------------------------------------
     CITIES — Blinking dots with pulsing rings
     ---------------------------------------------------------- */
  function drawCities(w, h, time) {
    for (var i = 0; i < CITIES.length; i++) {
      var city = CITIES[i];
      var cx = city.x * w;
      var cy = city.y * h;

      // Determine color based on escalation
      var color = getCityColor(city, time);

      // Pulsing ring
      var pulse = (Math.sin(time * 0.002 + i * 1.5) + 1) * 0.5;
      var ringRadius = 3 + pulse * 6;
      var ringAlpha = 0.08 + pulse * 0.06;

      ctx.beginPath();
      ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
      ctx.strokeStyle = color.replace(/[\d.]+\)$/, (ringAlpha) + ')');
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Blinking dot
      var blink = Math.sin(time * 0.003 + i * 2.1);
      var dotAlpha = blink > -0.3 ? 0.4 + (blink + 0.3) * 0.3 : 0.1;

      ctx.beginPath();
      ctx.arc(cx, cy, 2, 0, Math.PI * 2);
      ctx.fillStyle = color.replace(/[\d.]+\)$/, dotAlpha + ')');
      ctx.fill();

      // City label (very subtle)
      if (w > 300) {
        ctx.font = '7px monospace';
        ctx.fillStyle = color.replace(/[\d.]+\)$/, '0.18)');
        ctx.fillText(city.name, cx + 5, cy - 4);
      }
    }
  }

  /* ----------------------------------------------------------
     CITY COLOR — Escalates green -> amber -> red
     ---------------------------------------------------------- */
  function getCityColor(city, time) {
    if (currentStage >= 6) {
      return 'rgba(255, 51, 51, 1.0)'; // red
    }
    if (currentStage >= 4) {
      // Amber for opponent side cities, green for own
      if (city.side === 'ussr') return 'rgba(255, 170, 0, 1.0)';
      return 'rgba(255, 170, 0, 1.0)';
    }
    if (currentStage >= 2) {
      if (city.side === 'ussr') return 'rgba(255, 170, 0, 1.0)';
      return 'rgba(0, 255, 65, 1.0)';
    }
    return 'rgba(0, 255, 65, 1.0)';
  }

  /* ----------------------------------------------------------
     THREAT LINES — Arcing lines between US/USSR cities
     ---------------------------------------------------------- */
  function drawThreatLines(w, h, time) {
    var numLines = Math.min(THREAT_LINES.length, Math.floor((currentStage - 1) / 1));
    if (numLines <= 0) return;

    for (var i = 0; i < numLines; i++) {
      var tl = THREAT_LINES[i];
      var from = CITIES[tl.from];
      var to = CITIES[tl.to];

      var x1 = from.x * w;
      var y1 = from.y * h;
      var x2 = to.x * w;
      var y2 = to.y * h;

      // Animated dash offset
      var dashPhase = (time * 0.05 + i * 200) % 40;

      // Arc control point (above the line midpoint)
      var cpx = (x1 + x2) / 2;
      var cpy = Math.min(y1, y2) - 20 - (Math.abs(x2 - x1) * 0.15);

      var lineAlpha;
      var lineColor;
      if (currentStage >= 6) {
        lineAlpha = 0.25 + Math.sin(time * 0.005 + i) * 0.1;
        lineColor = 'rgba(255, 51, 51, ' + lineAlpha + ')';
      } else if (currentStage >= 4) {
        lineAlpha = 0.15 + Math.sin(time * 0.003 + i) * 0.05;
        lineColor = 'rgba(255, 170, 0, ' + lineAlpha + ')';
      } else {
        lineAlpha = 0.10 + Math.sin(time * 0.003 + i) * 0.04;
        lineColor = 'rgba(0, 255, 65, ' + lineAlpha + ')';
      }

      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 0.8;
      ctx.setLineDash([6, 4]);
      ctx.lineDashOffset = -dashPhase;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.quadraticCurveTo(cpx, cpy, x2, y2);
      ctx.stroke();

      ctx.setLineDash([]);
    }
  }

  /* ----------------------------------------------------------
     DESTROY — Cleanup
     ---------------------------------------------------------- */
  function destroy() {
    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
    window.removeEventListener('resize', resize);
    if (canvas && canvas.parentElement) {
      canvas.parentElement.removeChild(canvas);
    }
    canvas = null;
    ctx = null;
    currentStage = 0;
  }

  /* ----------------------------------------------------------
     PUBLIC API
     ---------------------------------------------------------- */
  window.WorldMap = {
    init: init,
    setStage: setStage,
    destroy: destroy,
    resize: resize
  };
})();
