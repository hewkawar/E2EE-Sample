const express = require('express');
const { createServer } = require('node:http');
const { join } = require('node:path');
const { Server } = require('socket.io');

const app = express();
const server = createServer(app);
const io = new Server(server);

// Track users in each room
const rooms = {};

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'index.html'));
});

app.get('/room/:room', (req, res) => {
  res.sendFile(join(__dirname, 'index.html'));
});

io.on('connection', (socket) => {
  socket.on('join room', ({ room, publicKey }) => {
    if (!rooms[room]) rooms[room] = [];

    // Check if the room is full
    if (rooms[room].length >= 2) {
      socket.emit('room full');
      return;
    }

    // Add user to the room
    rooms[room].push({ id: socket.id, publicKey });
    socket.join(room);

    console.log(`User ${socket.id} joined room ${room}`);

    // Notify the user of existing public keys in the room
    const existingPublicKeys = rooms[room]
      .filter((user) => user.id !== socket.id)
      .map((user) => ({ id: user.id, publicKey: user.publicKey }));
    socket.emit('existing public keys', existingPublicKeys);

    // Notify others in the room of the new user's public key
    socket.to(room).emit('public key', { id: socket.id, publicKey });

    // Handle user disconnect
    socket.on('disconnect', () => {
      rooms[room] = rooms[room].filter((user) => user.id !== socket.id);
      socket.to(room).emit('user left', socket.id);
      if (rooms[room].length === 0) {
        delete rooms[room];
      }
      console.log(`User ${socket.id} left room ${room}`);
    });

    // Handle chat messages
    socket.on('chat message', ({ room, encryptedMessage }) => {
      socket.to(room).emit('chat message', { id: socket.id, encryptedMessage });
    });
  });
});

server.listen(3000, () => {
  console.log('server running at http://localhost:3000');
});
