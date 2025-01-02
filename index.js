const express = require('express');
const { createServer } = require('node:http');
const { join } = require('node:path');
const { Server } = require('socket.io');

const app = express();
const server = createServer(app);
const io = new Server(server);

// Store public keys for each room
const roomKeys = {};

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'index.html'));
});

app.get('/rooms/:room', (req, res) => {
  res.sendFile(join(__dirname, 'index.html'));
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('join room', ({ room, publicKey }) => {
    // Join the room
    socket.join(room);

    // Initialize the room's public key storage if not present
    if (!roomKeys[room]) {
      roomKeys[room] = {};
    }

    // Store the new user's public key
    roomKeys[room][socket.id] = publicKey;

    console.log(`User ${socket.id} joined room ${room} with public key.`);

    // Notify the new user about all existing public keys in the room
    const existingKeys = Object.entries(roomKeys[room])
      .filter(([id]) => id !== socket.id) // Exclude the current user
      .map(([id, key]) => ({ id, publicKey: key }));
    socket.emit('existing public keys', existingKeys);

    // Notify all other users in the room about the new user's public key
    socket.to(room).emit('public key', { id: socket.id, publicKey });
  });

  socket.on('chat message', ({ room, encryptedMessage }) => {
    io.to(room).emit('chat message', { id: socket.id, encryptedMessage });
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);

    // Remove the user's key from the room
    for (const room in roomKeys) {
      if (roomKeys[room][socket.id]) {
        delete roomKeys[room][socket.id];
        // Notify the other users in the room
        io.to(room).emit('user left', socket.id);
      }
    }
  });
});

server.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});