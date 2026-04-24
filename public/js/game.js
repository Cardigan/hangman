// game.js — Game state rendering for WOPR terminal
(function () {
  'use strict';

  var _socket = null;

  function init(socket, gameState, playerState) {
    _socket = socket;

    if (playerState) {
      renderPlayerState(playerState);
    }

    socket.on('guessResult', function (data) {
      if (data.player) renderPlayerState(data.player);
      if (data.gameState) renderOtherPlayers(data.gameState, socket.id);
    });

    socket.on('playerJoined', function (data) {
      if (data.gameState) renderOtherPlayers(data.gameState, socket.id);
    });

    socket.on('playerLeft', function (data) {
      if (data.gameState) renderOtherPlayers(data.gameState, socket.id);
    });
  }

  function renderPlayerState(state) {
    if (typeof WordDisplay !== 'undefined' && WordDisplay.update) {
      WordDisplay.update(state);
    }
    if (typeof Animations !== 'undefined' && Animations.updateLaunchStages) {
      Animations.updateLaunchStages(state.launchStage || 0);
    }
  }

  function renderOtherPlayers(gameState, mySocketId) {
    var container = document.getElementById('other-players');
    if (!container || !gameState || !gameState.players) return;

    container.innerHTML = '';
    for (var sid in gameState.players) {
      if (sid === mySocketId) continue;
      var p = gameState.players[sid];
      var el = document.createElement('div');
      el.className = 'other-player';
      el.textContent = p.username + ': ' + (p.maskedWord || '') +
        ' [' + (p.wrongGuesses || 0) + ' WRONG]';
      container.appendChild(el);
    }
  }

  window.Game = {
    init: init
  };
})();
