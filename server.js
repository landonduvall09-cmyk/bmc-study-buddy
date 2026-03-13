const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

const users = new Map();
const nameToSocket = new Map();

// Message persistence
let savedMessages = {};
try {
  const data = fs.readFileSync('./messages.json', 'utf8');
  savedMessages = JSON.parse(data);
  console.log('Loaded saved messages');
} catch (err) {
  console.log('No existing messages file, starting fresh');
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('user-join', (data) => {
    const { name } = data;
    users.set(socket.id, { name, socketId: socket.id });
    nameToSocket.set(name, socket.id);
    
    const userList = Array.from(users.values()).map(u => ({ name: u.name, socketId: u.socketId }));
    io.emit('user-list', userList);
  });

  socket.on('join-room', (data) => {
    socket.join(data.room);
  });

  socket.on('send-message', (data) => {
    io.to(data.room).emit('receive-message', {
      room: data.room,
      user: data.user,
      text: data.text,
      timestamp: Date.now()
    });
    
    // Save message to file
    if (!savedMessages[data.room]) savedMessages[data.room] = [];
    savedMessages[data.room].push({
      user: data.user,
      text: data.text,
      timestamp: Date.now()
    });
    fs.writeFileSync('./messages.json', JSON.stringify(savedMessages, null, 2));
  });

  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    if (user) {
      nameToSocket.delete(user.name);
      users.delete(socket.id);
      const userList = Array.from(users.values()).map(u => ({ name: u.name, socketId: u.socketId }));
      io.emit('user-list', userList);
    }
  });
});

server.listen(3000, () => {
  console.log('Server running at http://localhost:3000');
});