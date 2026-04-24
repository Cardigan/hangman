// chat.js — Real-time chat panel for WOPR terminal
(function () {
  'use strict';

  var _socket = null;
  var _chatMessages = null;

  function escapeHTML(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  function init(socket) {
    _socket = socket;
    _chatMessages = document.getElementById('chat-messages');

    socket.on('chatMessage', function (data) {
      addMessage({ username: data.username, message: data.message, type: 'player' });
    });

    socket.on('systemMessage', function (data) {
      addMessage({ username: 'SYSTEM', message: data.message, type: 'system' });
    });

    socket.on('hackerMessage', function (data) {
      addMessage({ username: 'СССР', message: data.message, type: 'hacker' });
    });

    socket.on('guessResult', function (data) {
      addGuessMessage(data.username, data.letter, data.hit);
    });
  }

  function addMessage(data) {
    if (!_chatMessages) return;

    var el = document.createElement('div');
    var safeUser = escapeHTML(data.username || '');
    var safeMsg = escapeHTML(data.message || '');

    switch (data.type) {
      case 'system':
        el.className = 'system-message';
        el.innerHTML = '[SYSTEM] ' + safeMsg;
        break;
      case 'hacker':
        el.className = 'hacker-message';
        el.innerHTML = '[СССР] ' + safeMsg;
        break;
      case 'guess':
        el.className = 'guess-message';
        el.innerHTML = safeMsg;
        break;
      case 'player':
      default:
        el.className = 'player-message';
        el.innerHTML = '[' + safeUser + '] ' + safeMsg;
        break;
    }

    _chatMessages.appendChild(el);
    _chatMessages.scrollTop = _chatMessages.scrollHeight;
  }

  function addSystemMessage(message) {
    addMessage({ username: 'SYSTEM', message: message, type: 'system' });
  }

  function addGuessMessage(username, letter, hit) {
    var safeUser = escapeHTML(username || '');
    var safeLetter = escapeHTML((letter || '').toUpperCase());
    var result = hit ? 'HIT!' : 'MISS!';
    var text = '[' + safeUser + '] GUESSED: ' + safeLetter + ' \u2014 ' + result;
    addMessage({ message: text, type: 'guess' });
  }

  function clearMessages() {
    if (_chatMessages) {
      _chatMessages.innerHTML = '';
    }
  }

  function updateRoomCode(code) {
    var roomInfo = document.getElementById('room-info');
    if (roomInfo) {
      var display = code ? code.split('').join(' ') : '_ _ _ _';
      roomInfo.innerHTML = '<span class="room-label">ACCESS CODE</span>' +
        '<span class="room-code">' + display + '</span>' +
        '<span class="room-copy-hint">[ CLICK TO COPY ]</span>';
      roomInfo.setAttribute('data-code', code || '');
    }
  }

  window.Chat = {
    init: init,
    addMessage: addMessage,
    addSystemMessage: addSystemMessage,
    addGuessMessage: addGuessMessage,
    clearMessages: clearMessages,
    updateRoomCode: updateRoomCode
  };
})();
