/* ============================================================
   AUDIO MODULE — Procedural suspense music & typing SFX
   ============================================================ */
(function () {
  'use strict';

  var ctx = null;
  var masterGain = null;
  var musicStarted = false;
  var currentStage = 0;

  // Oscillator nodes for music layers
  var droneOsc1 = null;
  var droneOsc2 = null;
  var droneGain = null;
  var lfoOsc = null;
  var lfoGain = null;
  var pulseOsc = null;
  var pulseGain = null;
  var highOsc = null;
  var highGain = null;
  var dissonanceOsc = null;
  var dissonanceGain = null;

  function getContext() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    return ctx;
  }

  /* ----------------------------------------------------------
     MUSIC — Procedural ambient drone
     ---------------------------------------------------------- */
  function startMusic() {
    if (musicStarted) return;
    var c = getContext();
    if (!c) return;
    musicStarted = true;

    masterGain = c.createGain();
    masterGain.gain.value = 0.15;
    masterGain.connect(c.destination);

    // Drone layer 1 — low bass
    droneOsc1 = c.createOscillator();
    droneOsc1.type = 'sawtooth';
    droneOsc1.frequency.value = 55; // A1
    droneGain = c.createGain();
    droneGain.gain.value = 0.3;

    var droneFilter = c.createBiquadFilter();
    droneFilter.type = 'lowpass';
    droneFilter.frequency.value = 200;
    droneFilter.Q.value = 2;

    droneOsc1.connect(droneFilter);
    droneFilter.connect(droneGain);
    droneGain.connect(masterGain);
    droneOsc1.start();

    // Drone layer 2 — fifth above for depth
    droneOsc2 = c.createOscillator();
    droneOsc2.type = 'sine';
    droneOsc2.frequency.value = 82.4; // E2
    var drone2Gain = c.createGain();
    drone2Gain.gain.value = 0.15;
    droneOsc2.connect(drone2Gain);
    drone2Gain.connect(masterGain);
    droneOsc2.start();

    // LFO for slow pulsing
    lfoOsc = c.createOscillator();
    lfoOsc.type = 'sine';
    lfoOsc.frequency.value = 0.15; // very slow
    lfoGain = c.createGain();
    lfoGain.gain.value = 0.1;
    lfoOsc.connect(lfoGain);
    lfoGain.connect(droneGain.gain);
    lfoOsc.start();

    // Heartbeat pulse layer (starts silent)
    pulseOsc = c.createOscillator();
    pulseOsc.type = 'sine';
    pulseOsc.frequency.value = 40;
    pulseGain = c.createGain();
    pulseGain.gain.value = 0;

    var pulseFilter = c.createBiquadFilter();
    pulseFilter.type = 'lowpass';
    pulseFilter.frequency.value = 100;

    pulseOsc.connect(pulseFilter);
    pulseFilter.connect(pulseGain);
    pulseGain.connect(masterGain);
    pulseOsc.start();

    // Schedule heartbeat pulses
    scheduleHeartbeat();

    // High tension layer (starts silent)
    highOsc = c.createOscillator();
    highOsc.type = 'triangle';
    highOsc.frequency.value = 440;
    highGain = c.createGain();
    highGain.gain.value = 0;

    var highFilter = c.createBiquadFilter();
    highFilter.type = 'bandpass';
    highFilter.frequency.value = 800;
    highFilter.Q.value = 5;

    highOsc.connect(highFilter);
    highFilter.connect(highGain);
    highGain.connect(masterGain);
    highOsc.start();

    // Dissonance layer (starts silent)
    dissonanceOsc = c.createOscillator();
    dissonanceOsc.type = 'sawtooth';
    dissonanceOsc.frequency.value = 58.27; // Bb1 — dissonant with A
    dissonanceGain = c.createGain();
    dissonanceGain.gain.value = 0;

    var dissFilter = c.createBiquadFilter();
    dissFilter.type = 'lowpass';
    dissFilter.frequency.value = 300;

    dissonanceOsc.connect(dissFilter);
    dissFilter.connect(dissonanceGain);
    dissonanceGain.connect(masterGain);
    dissonanceOsc.start();
  }

  var heartbeatInterval = null;

  function scheduleHeartbeat() {
    if (heartbeatInterval) return;
    heartbeatInterval = setInterval(function () {
      if (!ctx || !pulseGain || currentStage < 3) return;

      var now = ctx.currentTime;
      var rate = currentStage >= 5 ? 0.25 : 0.4;
      var vol = Math.min(0.3, 0.08 * (currentStage - 2));

      // Double beat pattern (lub-dub)
      pulseGain.gain.setValueAtTime(0, now);
      pulseGain.gain.linearRampToValueAtTime(vol, now + 0.04);
      pulseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      pulseGain.gain.linearRampToValueAtTime(vol * 0.7, now + rate);
      pulseGain.gain.exponentialRampToValueAtTime(0.001, now + rate + 0.12);
    }, currentStage >= 5 ? 600 : 900);
  }

  /* ----------------------------------------------------------
     SET INTENSITY — Ramp tension with launch stages
     ---------------------------------------------------------- */
  function setIntensity(stage) {
    currentStage = stage;
    if (!ctx || !musicStarted) return;
    var now = ctx.currentTime;
    var ramp = 0.5;

    // Master volume increases slightly
    if (masterGain) {
      var vol = 0.15 + stage * 0.02;
      masterGain.gain.linearRampToValueAtTime(Math.min(vol, 0.35), now + ramp);
    }

    // LFO speed increases
    if (lfoOsc) {
      lfoOsc.frequency.linearRampToValueAtTime(0.15 + stage * 0.08, now + ramp);
    }
    if (lfoGain) {
      lfoGain.gain.linearRampToValueAtTime(0.1 + stage * 0.03, now + ramp);
    }

    // Drone pitch rises slightly with tension
    if (droneOsc1) {
      droneOsc1.frequency.linearRampToValueAtTime(55 + stage * 3, now + ramp);
    }

    // Stage 3+: heartbeat pulse
    if (stage >= 3 && pulseGain) {
      // Restart heartbeat with new timing
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
      scheduleHeartbeat();
    }

    // Stage 5+: high tension and dissonance
    if (highGain) {
      var highVol = stage >= 5 ? 0.04 + (stage - 5) * 0.03 : 0;
      highGain.gain.linearRampToValueAtTime(highVol, now + ramp);
    }
    if (highOsc && stage >= 5) {
      highOsc.frequency.linearRampToValueAtTime(440 + (stage - 5) * 110, now + ramp);
    }

    if (dissonanceGain) {
      var dissVol = stage >= 5 ? 0.05 + (stage - 5) * 0.04 : 0;
      dissonanceGain.gain.linearRampToValueAtTime(dissVol, now + ramp);
    }

    // Stage 7: climactic
    if (stage >= 7) {
      if (masterGain) masterGain.gain.linearRampToValueAtTime(0.4, now + ramp);
      if (lfoOsc) lfoOsc.frequency.linearRampToValueAtTime(1.5, now + ramp);
      if (droneOsc1) droneOsc1.frequency.linearRampToValueAtTime(80, now + ramp);
    }
  }

  /* ----------------------------------------------------------
     TYPING SOUND — CRT teletype click
     ---------------------------------------------------------- */
  function playTyping() {
    var c = getContext();
    if (!c) return;

    var now = c.currentTime;

    // Short noise burst filtered to sound like a keyclick
    var bufferSize = c.sampleRate * 0.03; // 30ms
    var buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    var data = buffer.getChannelData(0);
    for (var i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3);
    }

    var noise = c.createBufferSource();
    noise.buffer = buffer;

    var filter = c.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 3000 + Math.random() * 1000;
    filter.Q.value = 2;

    var clickGain = c.createGain();
    clickGain.gain.setValueAtTime(0.12, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    noise.connect(filter);
    filter.connect(clickGain);
    clickGain.connect(c.destination);
    noise.start(now);
    noise.stop(now + 0.04);
  }

  /* ----------------------------------------------------------
     PUBLIC API
     ---------------------------------------------------------- */
  window.AudioModule = {
    startMusic: startMusic,
    setIntensity: setIntensity,
    playTyping: playTyping
  };
})();
