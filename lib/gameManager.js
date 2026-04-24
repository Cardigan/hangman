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

    const room = {
      roomCode,
      players: {},
      createdAt: new Date()
    };

    this.rooms.set(roomCode, room);
    return { roomCode, room };
  }

  joinRoom(roomCode, username, socketId) {
    const room = this.rooms.get(roomCode);
    if (!room) {
      return { error: 'Room not found' };
    }

    const word = getRandomWord().toUpperCase();
    const player = {
      username,
      word,
      guessedLetters: [],
      correctLetters: [],
      wrongGuesses: 0,
      launchStage: 0,
      status: 'playing'
    };

    room.players[socketId] = player;
    return { player };
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

    if (player.status !== 'playing') {
      return { error: 'Game is over for this player' };
    }

    const normalized = String(letter).toUpperCase();
    if (!/^[A-Z]$/.test(normalized)) {
      return { error: 'Invalid letter' };
    }

    if (player.guessedLetters.includes(normalized)) {
      return { error: 'Letter already guessed' };
    }

    player.guessedLetters.push(normalized);

    const hit = player.word.includes(normalized);
    let gameOver = false;
    let won = false;

    if (hit) {
      player.correctLetters.push(normalized);
      // Check if all unique letters in the word have been guessed
      const uniqueLetters = [...new Set(player.word.split(''))];
      if (uniqueLetters.every((l) => player.correctLetters.includes(l))) {
        player.status = 'won';
        gameOver = true;
        won = true;
      }
    } else {
      player.wrongGuesses++;
      player.launchStage = Math.min(player.wrongGuesses, MAX_WRONG);
      if (player.launchStage >= MAX_WRONG) {
        player.status = 'lost';
        gameOver = true;
      }
    }

    return {
      hit,
      letter: normalized,
      player: {
        username: player.username,
        guessedLetters: player.guessedLetters,
        correctLetters: player.correctLetters,
        wrongGuesses: player.wrongGuesses,
        launchStage: player.launchStage,
        launchStageName: player.launchStage > 0
          ? LAUNCH_STAGES[player.launchStage - 1]
          : null,
        status: player.status,
        maskedWord: this._maskWord(player),
        word: gameOver ? player.word : undefined
      },
      gameOver,
      won
    };
  }

  _maskWord(player) {
    return player.word
      .split('')
      .map((ch) => (player.correctLetters.includes(ch) ? ch : null));
  }

  getPlayerState(roomCode, socketId) {
    const room = this.rooms.get(roomCode);
    if (!room) return null;

    const player = room.players[socketId];
    if (!player) return null;

    return {
      username: player.username,
      maskedWord: this._maskWord(player),
      guessedLetters: player.guessedLetters,
      correctLetters: player.correctLetters,
      wrongGuesses: player.wrongGuesses,
      launchStage: player.launchStage,
      launchStageName: player.launchStage > 0
        ? LAUNCH_STAGES[player.launchStage - 1]
        : null,
      status: player.status,
      wordLength: player.word.length,
      word: player.status !== 'playing' ? player.word : undefined
    };
  }

  getAllPlayersState(roomCode) {
    const room = this.rooms.get(roomCode);
    if (!room) return null;

    const states = {};
    for (const [sid, player] of Object.entries(room.players)) {
      states[sid] = {
        username: player.username,
        maskedWord: this._maskWord(player),
        guessedLetters: player.guessedLetters,
        correctLetters: player.correctLetters,
        wrongGuesses: player.wrongGuesses,
        launchStage: player.launchStage,
        launchStageName: player.launchStage > 0
          ? LAUNCH_STAGES[player.launchStage - 1]
          : null,
        status: player.status,
        wordLength: player.word.length,
        word: player.status !== 'playing' ? player.word : undefined
      };
    }
    return states;
  }

  getRoomPublicState(roomCode) {
    const room = this.rooms.get(roomCode);
    if (!room) return null;

    return {
      roomCode: room.roomCode,
      players: this.getAllPlayersState(roomCode),
      createdAt: room.createdAt
    };
  }
}

module.exports = { GameManager, LAUNCH_STAGES };
