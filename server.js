const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

// Connect to MongoDB
const MONGODB_URI = 'mongodb+srv://landonduvall09_db_user:puO3oEU7dercmoQz@bmc-study-cluster.pkjrcrm.mongodb.net/bmc-study-buddy?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Define Message Schema
const messageSchema = new mongoose.Schema({
  room: String,
  user: String,
  text: String,
  timestamp: { type: Date, default: Date.now },
  isPrivate: { type: Boolean, default: false }
});

const Message = mongoose.model('Message', messageSchema);

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

  // Group chat messages
  socket.on('send-message', async (data) => {
    // Save to MongoDB
    const message = new Message({
      room: data.room,
      user: data.user,
      text: data.text,
      timestamp: new Date()
    });
    await message.save();

    // Send to clients
    io.to(data.room).emit('receive-message', {
      room: data.room,
      user: data.user,
      text: data.text,
      timestamp: Date.now()
    });
  });

  // Private messages
  socket.on('private-message', async (data) => {
    const { to, from, text, room } = data;
    
    // Save to MongoDB
    const message = new Message({
      room: room,
      user: from,
      text: text,
      timestamp: new Date(),
      isPrivate: true
    });
    await message.save();
    
    // Find the recipient's socket
    const recipientSocketId = nameToSocket.get(to);
    
    if (recipientSocketId) {
      // Send to recipient
      io.to(recipientSocketId).emit('receive-message', {
        room: room,
        user: from,
        text: text,
        timestamp: Date.now(),
        isPrivate: true
      });
      
      // Send back to sender
      socket.emit('receive-message', {
        room: room,
        user: from,
        text: text,
        timestamp: Date.now(),
        isPrivate: true
      });
    } else {
      socket.emit('receive-message', {
        room: 'System',
        user: 'System',
        text: `User ${to} is not online`,
        timestamp: Date.now()
      });
    }
  });

  // Get message history
  socket.on('get-message-history', async (room) => {
    const messages = await Message.find({ room })
      .sort('timestamp')
      .limit(100);
    
    socket.emit('message-history', {
      room: room,
      messages: messages.map(m => ({
        user: m.user,
        text: m.text,
        timestamp: m.timestamp.getTime()
      }))
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