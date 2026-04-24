const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const { GameManager } = require('./lib/gameManager');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const gameManager = new GameManager();

// Serve static files from public/
app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
  console.log(`[connect] ${socket.id}`);

  socket.on('createRoom', ({ username }, cb) => {
    const { roomCode } = gameManager.createRoom(username);
    const result = gameManager.joinRoom(roomCode, username, socket.id);

    if (result.error) {
      if (typeof cb === 'function') cb({ error: result.error });
      return;
    }

    socket.join(roomCode);
    socket.data.roomCode = roomCode;
    socket.data.username = username;

    console.log(`[createRoom] ${username} created room ${roomCode}`);
    if (typeof cb === 'function') {
      cb({
        roomCode,
        gameState: gameManager.getRoomPublicState(roomCode),
        playerState: gameManager.getPlayerState(roomCode, socket.id)
      });
    }
  });

  socket.on('joinRoom', ({ roomCode, username }, cb) => {
    const result = gameManager.joinRoom(roomCode, username, socket.id);

    if (result.error) {
      console.log(`[joinRoom] ${roomCode}: ${result.error}`);
      if (typeof cb === 'function') cb({ error: result.error });
      return;
    }

    socket.join(roomCode);
    socket.data.roomCode = roomCode;
    socket.data.username = username;

    const publicState = gameManager.getRoomPublicState(roomCode);
    io.to(roomCode).emit('playerJoined', { username, gameState: publicState });
    console.log(`[joinRoom] ${username} joined room ${roomCode}`);
    if (typeof cb === 'function') {
      cb({
        success: true,
        gameState: publicState,
        playerState: gameManager.getPlayerState(roomCode, socket.id)
      });
    }
  });

  socket.on('guess', ({ letter }) => {
    const { roomCode, username } = socket.data;
    if (!roomCode) return;

    const result = gameManager.makeGuess(roomCode, socket.id, letter);
    if (result.error) {
      socket.emit('guessError', { error: result.error });
      return;
    }

    console.log(`[guess] ${username} guessed "${letter}" in room ${roomCode} — ${result.hit ? 'HIT' : 'MISS'}`);

    io.to(roomCode).emit('guessResult', {
      username,
      ...result,
      gameState: gameManager.getRoomPublicState(roomCode)
    });
  });

  socket.on('getGameState', (_, cb) => {
    const { roomCode } = socket.data;
    if (!roomCode) {
      if (typeof cb === 'function') cb({ error: 'Not in a room' });
      return;
    }
    if (typeof cb === 'function') {
      cb({
        gameState: gameManager.getRoomPublicState(roomCode),
        playerState: gameManager.getPlayerState(roomCode, socket.id)
      });
    }
  });

  socket.on('chatMessage', ({ message }) => {
    const { roomCode, username } = socket.data;
    if (!roomCode) return;

    console.log(`[chat] ${username}@${roomCode}: ${message}`);
    io.to(roomCode).emit('chatMessage', { username, message });
  });

  socket.on('disconnect', () => {
    const { roomCode, username } = socket.data;
    console.log(`[disconnect] ${socket.id} (${username || 'unknown'})`);

    if (roomCode) {
      const removed = gameManager.removePlayer(roomCode, socket.id);
      if (removed) {
        const publicState = gameManager.getRoomPublicState(roomCode);
        if (publicState) {
          io.to(roomCode).emit('playerLeft', { username, gameState: publicState });
        }
        console.log(`[cleanup] removed ${username} from room ${roomCode}`);
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Shall we play a game? Listening on http://localhost:${PORT}`);
});
