const socket = io({
  transports: ['polling']
});

// Global state
let currentUser = null;
let currentChannel = 'Global Lounge';
let messages = {};
let onlineUsers = [];

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const mainApp = document.getElementById('main-app');
const loginBtn = document.getElementById('login-btn');
const usernameInput = document.getElementById('username-input');
const currentUserSpan = document.getElementById('current-user');
const channelsList = document.getElementById('channels-list');
const messagesContainer = document.getElementById('messages-container');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const onlineUsersList = document.getElementById('online-users-list');

// Available channels
const channels = [
  'Global Lounge',
  'Mathematics', 
  'Science',
  'English',
  'History',
  'Study Group 1',
  'Study Group 2'
];

// Check for saved user
const savedUser = localStorage.getItem('bmc_user');
if (savedUser) {
  try {
    const userData = JSON.parse(savedUser);
    currentUser = userData.name;
    showMainApp();
  } catch (e) {
    console.error('Error loading user');
  }
}

// Login
loginBtn.addEventListener('click', () => {
  const name = usernameInput.value.trim();
  if (name) {
    currentUser = name;
    localStorage.setItem('bmc_user', JSON.stringify({ name }));
    
    socket.emit('user-join', { name });
    showMainApp();
  }
});

function showMainApp() {
  loginScreen.style.display = 'none';
  mainApp.style.display = 'flex';
  currentUserSpan.textContent = currentUser;
  
  // Load channels
  renderChannels();
  
  // Join default channel
  switchChannel('Global Lounge');
}

function renderChannels() {
  channelsList.innerHTML = '';
  channels.forEach(channel => {
    const li = document.createElement('li');
    li.textContent = channel;
    li.className = channel === currentChannel ? 'active' : '';
    li.addEventListener('click', () => switchChannel(channel));
    channelsList.appendChild(li);
  });
}

function switchChannel(channel) {
  currentChannel = channel;
  renderChannels();
  
  // Leave all rooms and join new one
  socket.emit('join-room', { room: channel });
  
  // Request message history
  socket.emit('get-message-history', channel);
  
  // Clear and show messages
  messagesContainer.innerHTML = '';
  
  // Show existing messages for this channel
  if (messages[channel]) {
    renderMessages(messages[channel]);
  }
}

// Send message
function sendMessage() {
  const text = messageInput.value.trim();
  if (!text || !currentUser) return;
  
  const messageData = {
    room: currentChannel,
    user: currentUser,
    text: text
  };
  
  socket.emit('send-message', messageData);
  messageInput.value = '';
}

sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendMessage();
});

// Render messages
function renderMessages(msgs) {
  if (!msgs || msgs.length === 0) {
    messagesContainer.innerHTML = '<div class="no-messages">No messages yet</div>';
    return;
  }
  
  messagesContainer.innerHTML = '';
  msgs.forEach(msg => {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${msg.sender === currentUser ? 'own-message' : ''}`;
    
    const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    msgDiv.innerHTML = `
      <div class="message-header">
        <span class="message-sender">${msg.sender}</span>
        <span class="message-time">${time}</span>
      </div>
      <div class="message-text">${msg.text}</div>
    `;
    
    messagesContainer.appendChild(msgDiv);
  });
  
  // Scroll to bottom
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Render online users
function renderOnlineUsers(users) {
  onlineUsers = users;
  onlineUsersList.innerHTML = '';
  
  if (users.length === 0) {
    onlineUsersList.innerHTML = '<li>No users online</li>';
    return;
  }
  
  users.forEach(user => {
    const li = document.createElement('li');
    li.className = user === currentUser ? 'current-user' : '';
    li.innerHTML = `
      <span class="user-dot"></span>
      ${user} ${user === currentUser ? '(you)' : ''}
    `;
    onlineUsersList.appendChild(li);
  });
}

// Socket event listeners
socket.on('connect', () => {
  console.log('Connected to server');
  
  // Re-join if we have a user
  if (currentUser) {
    socket.emit('user-join', { name: currentUser });
    socket.emit('join-room', { room: currentChannel });
  }
});

socket.on('receive-message', (data) => {
  if (data.room === currentChannel) {
    if (!messages[data.room]) messages[data.room] = [];
    
    const newMsg = {
      sender: data.user,
      text: data.text,
      timestamp: data.timestamp
    };
    
    messages[data.room].push(newMsg);
    renderMessages(messages[data.room]);
  } else {
    // Store for later
    if (!messages[data.room]) messages[data.room] = [];
    messages[data.room].push({
      sender: data.user,
      text: data.text,
      timestamp: data.timestamp
    });
  }
});

socket.on('user-list', (userList) => {
  renderOnlineUsers(userList.map(u => u.name));
});

socket.on('message-history', (data) => {
  if (data.room === currentChannel && data.messages && data.messages.length > 0) {
    messages[data.room] = data.messages.map(msg => ({
      sender: msg.user,
      text: msg.text,
      timestamp: msg.timestamp
    }));
    renderMessages(messages[data.room]);
  }
});

// Basic CSS to add to style.css
const style = document.createElement('style');
style.textContent = `
  .message.own-message {
    background-color: #e3f2fd;
    margin-left: 20%;
  }
  .message {
    background-color: #f5f5f5;
    padding: 10px;
    margin: 5px 0;
    border-radius: 8px;
    max-width: 80%;
  }
  .message-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 5px;
    font-size: 0.9em;
  }
  .message-sender {
    font-weight: bold;
    color: #1976d2;
  }
  .message-time {
    color: #666;
  }
  .message-text {
    word-wrap: break-word;
  }
  .no-messages {
    text-align: center;
    color: #999;
    padding: 20px;
  }
  .user-dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    background-color: #4caf50;
    border-radius: 50%;
    margin-right: 8px;
  }
  .current-user {
    font-weight: bold;
    color: #1976d2;
  }
  #online-users-list li {
    display: flex;
    align-items: center;
    padding: 5px 0;
  }
`;
document.head.appendChild(style);