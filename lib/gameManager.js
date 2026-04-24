const { getRandomWord } = require('./wordList');

const LAUNCH_STAGES = [
  'SAFETY DISENGAGED',
  'TARGETING LOCKED',
  'PRIMER READY',
  'PREFLIGHT CHECKED',
  'WARHEAD ARMED',
  'READY TO FIRE',
  'MISSILE LAUNCHED'
];

const MAX_WRONG = 7;

class GameManager {
  constructor() {
    this.rooms = new Map();
  }

  _generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  createRoom(hostUsername) {
    let roomCode = this._generateRoomCode();
    while (this.rooms.has(roomCode)) {
      roomCode = this._generateRoomCode();
    }

    const word = getRandomWord().toUpperCase();
    const room = {
      roomCode,
      word,
      guessedLetters: [],
      correctLetters: [],
      wrongGuesses: 0,
      launchStage: 0,
      status: 'playing',
      players: {},
      createdAt: new Date()
    };

    this.rooms.set(roomCode, room);
    console.log(`[room] Created room ${roomCode} (word: ${word})`);
    return { roomCode, room };
  }

  joinRoom(roomCode, username, socketId) {
    const room = this.rooms.get(roomCode);
    if (!room) {
      return { error: 'Room not found' };
    }

    room.players[socketId] = { username };
    return { success: true, username };
  }

  getRoom(roomCode) {
    return this.rooms.get(roomCode) || null;
  }

  removePlayer(roomCode, socketId) {
    const room = this.rooms.get(roomCode);
    if (!room) return;

    const player = room.players[socketId];
    delete room.players[socketId];

    if (Object.keys(room.players).length === 0) {
      this.rooms.delete(roomCode);
    }

    return player;
  }

  makeGuess(roomCode, socketId, letter) {
    const room = this.rooms.get(roomCode);
    if (!room) return { error: 'Room not found' };

    const player = room.players[socketId];
    if (!player) return { error: 'Player not found' };

    if (room.status !== 'playing') {
      return { error: 'Game is over' };
    }

    const normalized = String(letter).toUpperCase();
    if (!/^[A-Z]$/.test(normalized)) {
      return { error: 'Invalid letter' };
    }

    if (room.guessedLetters.includes(normalized)) {
      return { error: 'Letter already guessed' };
    }

    room.guessedLetters.push(normalized);

    const hit = room.word.includes(normalized);
    let gameOver = false;
    let won = false;

    if (hit) {
      room.correctLetters.push(normalized);
      const uniqueLetters = [...new Set(room.word.split(''))];
      if (uniqueLetters.every((l) => room.correctLetters.includes(l))) {
        room.status = 'won';
        gameOver = true;
        won = true;
      }
    } else {
      room.wrongGuesses++;
      room.launchStage = Math.min(room.wrongGuesses, MAX_WRONG);
      if (room.launchStage >= MAX_WRONG) {
        room.status = 'lost';
        gameOver = true;
      }
    }

    return {
      hit,
      letter: normalized,
      guessedBy: player.username,
      gameOver,
      won
    };
  }

  _maskWord(room) {
    return room.word
      .split('')
      .map((ch) => (room.correctLetters.includes(ch) ? ch : null));
  }

  getRoomPublicState(roomCode) {
    const room = this.rooms.get(roomCode);
    if (!room) return null;

    const playerList = Object.entries(room.players).map(([sid, p]) => ({
      socketId: sid,
      username: p.username
    }));

    return {
      roomCode: room.roomCode,
      maskedWord: this._maskWord(room),
      guessedLetters: room.guessedLetters,
      correctLetters: room.correctLetters,
      wrongGuesses: room.wrongGuesses,
      launchStage: room.launchStage,
      launchStageName: room.launchStage > 0
        ? LAUNCH_STAGES[room.launchStage - 1]
        : null,
      status: room.status,
      wordLength: room.word.length,
      word: room.status !== 'playing' ? room.word : undefined,
      players: playerList
    };
  }

  // Keep for backward compat — now just returns room state
  getPlayerState(roomCode, socketId) {
    return this.getRoomPublicState(roomCode);
  }
}

module.exports = { GameManager, LAUNCH_STAGES };
