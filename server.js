const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

const users = new Map();
const nameToSocket = new Map();

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