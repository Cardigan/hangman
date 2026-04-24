// main.js — Client entry point: join flow, input routing, game state sync
(function () {
  'use strict';

  var socket = io();
  var mySocketId = null;
  var gameState = null;
  var playerState = null;
  var roomCode = null;
  var username = null;
  var mode = 'create';

  // DOM refs
  var joinOverlay = document.getElementById('join-overlay');
  var gameContainer = document.getElementById('game-container');
  var usernameInput = document.getElementById('username-input');
  var roomCodeInput = document.getElementById('room-code-input');
  var roomCodeGroup = document.getElementById('room-code-group');
  var createRoomBtn = document.getElementById('create-room-btn');
  var joinRoomBtn = document.getElementById('join-room-btn');
  var connectBtn = document.getElementById('connect-btn');
  var gameInput = document.getElementById('game-input');
  var sendBtn = document.getElementById('send-btn');

  // --- Join Flow ---

  joinOverlay.style.display = '';
  gameContainer.style.display = 'none';

  createRoomBtn.addEventListener('click', function () {
    mode = 'create';
    roomCodeGroup.classList.add('hidden');
    createRoomBtn.classList.add('selected');
    joinRoomBtn.classList.remove('selected');
    connectBtn.textContent = 'CREATE & CONNECT';
  });

  joinRoomBtn.addEventListener('click', function () {
    mode = 'join';
    roomCodeGroup.classList.remove('hidden');
    joinRoomBtn.classList.add('selected');
    createRoomBtn.classList.remove('selected');
    connectBtn.textContent = 'CONNECT';
    roomCodeInput.focus();
  });

  connectBtn.addEventListener('click', function () {
    username = (usernameInput.value || '').trim();
    if (!username) {
      alert('ENTER A CALLSIGN');
      return;
    }

    if (mode === 'create') {
      socket.emit('createRoom', { username: username }, function (res) {
        if (res && res.roomCode) {
          onConnected(res.roomCode, res.gameState, res.playerState);
        } else {
          alert('FAILED TO CREATE ROOM');
        }
      });
    } else {
      var code = (roomCodeInput.value || '').trim().toUpperCase();
      if (!code) {
        alert('ENTER A ROOM CODE');
        return;
      }
      socket.emit('joinRoom', { roomCode: code, username: username }, function (res) {
        if (res && res.success !== false) {
          onConnected(res.roomCode || code, res.gameState, res.playerState);
        } else {
          alert(res && res.message ? res.message : 'FAILED TO JOIN ROOM');
        }
      });
    }
  });

  function onConnected(code, gs, ps) {
    roomCode = code;
    gameState = gs;
    playerState = ps;
    mySocketId = socket.id;

    joinOverlay.style.display = 'none';
    gameContainer.style.display = '';

    if (window.Chat) {
      Chat.init(socket);
      Chat.updateRoomCode(roomCode);
      Chat.addSystemMessage('CONNECTED TO NORAD DEFENSE NETWORK');
    }

    updateAllDisplays(gameState, playerState);
  }

  // --- Input Routing ---

  function handleInput() {
    var text = (gameInput.value || '').trim();
    if (!text) return;

    var guessMatch = text.match(/^\?([A-Za-z])$/);
    if (guessMatch) {
      socket.emit('guess', { letter: guessMatch[1].toUpperCase() });
    } else {
      socket.emit('chatMessage', { message: text });
    }

    gameInput.value = '';
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
    playerState = data.player || playerState;

    if (window.Chat) {
      Chat.addGuessMessage(data.username, data.letter, data.hit);
    }

    updateAllDisplays(gameState, playerState);

    if (data.gameOver) {
      var msg = data.won ? 'LAUNCH SEQUENCE ABORTED — WORD DECODED' : 'LAUNCH CONFIRMED — DETONATION IMMINENT';
      if (window.Chat) Chat.addSystemMessage(msg);
    }
  });

  socket.on('playerJoined', function (data) {
    if (data.gameState) gameState = data.gameState;
    if (window.Chat) Chat.addSystemMessage(data.username + ' HAS CONNECTED');
    updateAllDisplays(gameState, playerState);
  });

  socket.on('playerLeft', function (data) {
    if (data.gameState) gameState = data.gameState;
    if (window.Chat) Chat.addSystemMessage(data.username + ' HAS DISCONNECTED');
    updateAllDisplays(gameState, playerState);
  });

  // --- Display Helper ---

  function updateAllDisplays(gs, ps) {
    if (window.Game && typeof Game.updateLaunchSequence === 'function') {
      Game.updateLaunchSequence(gs, ps);
    }
    if (window.WordDisplay && typeof WordDisplay.update === 'function') {
      WordDisplay.update(gs, ps);
    }
  }

  // --- Export ---

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
    if (e.key === 'Enter') connectBtn.click();
  });
  roomCodeInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') connectBtn.click();
  });

  // Default to create mode
  createRoomBtn.click();

  window.Main = {
    socket: socket,
    get mySocketId() { return mySocketId; },
    get gameState() { return gameState; },
    get roomCode() { return roomCode; },
    get username() { return username; }
  };
})();
