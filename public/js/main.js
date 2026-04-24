// main.js — Client entry point: join flow, input routing, game state sync
(function () {
  'use strict';

  function boot() {
    var socket = io();
    var mySocketId = null;
  var gameState = null;
  var roomCode = null;
  var username = null;

  // DOM refs
  var joinOverlay = document.getElementById('join-overlay');
  var gameContainer = document.getElementById('game-container');
  var usernameInput = document.getElementById('username-input');
  var roomCodeInput = document.getElementById('room-code-input');
  var roomCodeGroup = document.getElementById('room-code-group');
  var createRoomBtn = document.getElementById('create-room-btn');
  var joinRoomBtn = document.getElementById('join-room-btn');
  var gameInput = document.getElementById('game-input');
  var sendBtn = document.getElementById('send-btn');
  var userCounter = 1;

  // --- Join Flow ---

  joinOverlay.style.display = '';
  gameContainer.style.display = 'none';

  function getUsername() {
    var name = (usernameInput.value || '').trim();
    if (!name) {
      name = 'USER ' + String(userCounter++).padStart(3, '0');
    }
    return name;
  }

  createRoomBtn.addEventListener('click', function () {
    username = getUsername();
    socket.emit('createRoom', { username: username }, function (res) {
      if (res && res.roomCode) {
        onConnected(res.roomCode, res.gameState);
      } else {
        alert('FAILED TO CREATE ROOM');
      }
    });
  });

  joinRoomBtn.addEventListener('click', function () {
    if (roomCodeGroup.classList.contains('hidden')) {
      roomCodeGroup.classList.remove('hidden');
      roomCodeInput.focus();
      return;
    }
    var code = (roomCodeInput.value || '').trim().toUpperCase();
    if (!code) {
      alert('ENTER A ROOM CODE');
      return;
    }
    username = getUsername();
    socket.emit('joinRoom', { roomCode: code, username: username }, function (res) {
      if (res && res.success !== false) {
        onConnected(res.roomCode || code, res.gameState);
      } else {
        alert(res && res.error ? res.error : 'FAILED TO JOIN ROOM');
      }
    });
  });

  function onConnected(code, gs) {
    roomCode = code;
    gameState = gs;
    mySocketId = socket.id;

    joinOverlay.style.display = 'none';
    gameContainer.style.display = '';

    gameInput.focus();

    if (window.Chat) {
      Chat.init(socket);
      Chat.updateRoomCode(roomCode);
      Chat.addSystemMessage('CONNECTED TO NORAD DEFENSE NETWORK');
    }

    if (window.Game) {
      Game.init(socket, gameState);
    }
    if (window.WordDisplay) {
      WordDisplay.init();
    }

    updateAllDisplays(gameState);
  }

  // --- Input Routing ---

  function handleInput() {
    var text = (gameInput.value || '').trim();
    if (!text) return;

    if (/^[A-Za-z]$/.test(text)) {
      socket.emit('guess', { letter: text.toUpperCase() });
    } else if (text.startsWith('?') && /^[A-Za-z]$/.test(text.slice(1))) {
      socket.emit('guess', { letter: text.slice(1).toUpperCase() });
    } else {
      socket.emit('chatMessage', { message: text });
    }

    gameInput.value = '';
    gameInput.focus();
  }

  gameInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleInput();
    }
  });

  sendBtn.addEventListener('click', function () {
    handleInput();
  });

  // --- Game State Handling ---

  socket.on('guessResult', function (data) {
    gameState = data.gameState || gameState;

    if (window.Chat) {
      Chat.addGuessMessage(data.username, data.letter, data.hit);
    }

    updateAllDisplays(gameState);

    if (data.gameOver) {
      var msg = data.won ? 'LAUNCH SEQUENCE ABORTED — WORD DECODED' : 'LAUNCH CONFIRMED — DETONATION IMMINENT';
      if (window.Chat) Chat.addSystemMessage(msg);
      if (window.Game) {
        if (data.won) {
          Game.showWinScreen();
        } else {
          if (window.Game && Game.setRevealWord) Game.setRevealWord(data.gameState.word || '???');
          Game.showLoseScreen();
        }
      }
    }
  });

  socket.on('playerJoined', function (data) {
    if (data.gameState) gameState = data.gameState;
    if (window.Chat) Chat.addSystemMessage(data.username + ' HAS CONNECTED');
    updateAllDisplays(gameState);
  });

  socket.on('playerLeft', function (data) {
    if (data.gameState) gameState = data.gameState;
    if (window.Chat) Chat.addSystemMessage(data.username + ' HAS DISCONNECTED');
    updateAllDisplays(gameState);
  });

  socket.on('guessError', function (data) {
    if (window.Chat) Chat.addSystemMessage('ERROR: ' + (data.error || 'UNKNOWN ERROR'));
  });

  // --- Display Helper ---

  function updateAllDisplays(gs) {
    if (window.Game && typeof Game.updateLaunchSequence === 'function') {
      Game.updateLaunchSequence(gs);
    }
    if (window.WordDisplay && typeof WordDisplay.update === 'function') {
      WordDisplay.update(gs);
    }
  }

  // Copy room code on click
  document.getElementById('room-info').addEventListener('click', function () {
    var code = this.getAttribute('data-code');
    if (!code) return;
    if (navigator.clipboard) {
      var self = this;
      navigator.clipboard.writeText(code).then(function () {
        if (window.Chat) Chat.addSystemMessage('ROOM CODE COPIED TO CLIPBOARD');
        self.classList.add('copied');
        setTimeout(function () { self.classList.remove('copied'); }, 1500);
      });
    }
  });

  // Enter key in join overlay
  usernameInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') createRoomBtn.click();
  });
  roomCodeInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') joinRoomBtn.click();
  });

  window.Main = {
    socket: socket,
    get mySocketId() { return mySocketId; },
    get gameState() { return gameState; },
    get roomCode() { return roomCode; },
    get username() { return username; }
  };

  } // end boot()

  // If io is already loaded (local socket.io served), boot immediately.
  // Otherwise wait for CDN fallback to load it.
  if (typeof io !== 'undefined') {
    boot();
  } else {
    window.__ioReady = boot;
  }
})();
