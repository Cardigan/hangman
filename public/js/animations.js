// animations.js — Launch stage animations for WOPR terminal
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

  window.Animations = {
    updateLaunchStages: updateLaunchStages
  };
})();
