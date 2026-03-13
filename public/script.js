const socket = io();

(function() {
    // ---------- COURSE DATA ----------
    const courseCategories = {
      "ENGLISH": [ "Honors: English 2", "Honors: English 3", "Yearbook Productions", "College Prep: English 1", "College Prep: English 2", "College Prep: English 3 Advanced", "English 4", "Dual Enrollment: ENG 101", "ENG 102", "ENG 205", "Electives: Young Adult Literature", "Poetry", "Contemporary Literature" ],
      "MATHEMATICS": [ "Honors: Algebra 2", "Honors: Geometry", "Honors: Pre-Calculus", "College Prep: Algebra 1", "Algebra 2 Advanced", "Geometry Advanced", "Precalculus Advanced", "Probability & Statistics", "Dual Enrollment: MAT 110", "MAT 111", "MAT 120", "MAT 140", "MAT 141" ],
      "SCIENCE": [ "Honors: Biology 1", "Chemistry 1", "Physics 1", "College Prep: Integrated Science", "Biology 1 Advanced", "Anatomy & Physiology", "Dual Enrollment: BIO 101", "BIO 102", "BIO 210", "BIO 211", "CHM 110", "CHM 111", "PHY 201" ],
      "SOCIAL STUDIES": [ "Honors: Modern World History", "US History & Constitution", "US Government", "Economics", "College Prep: Human Geography", "Dual Enrollment: HIS 104", "HIS 105", "HIS 201", "HIS 202", "PSC 201", "GEO 101" ],
      "ARTS": [ "College Prep: Art 1", "Art 2", "Art 3", "Dual Enrollment: ART 101", "MUS 105", "THE 101" ],
      "WORLD LANGUAGES": [ "College Prep: Spanish 1", "Spanish 2", "Spanish 3 Advanced", "Dual Enrollment: SPA 101", "SPA 102" ],
      "PHYSICAL EDUCATION": [ "Physical Education 1", "Physical Education 2" ],
      "TECHNOLOGY": [ "Web Page Design", "Introduction to Programming", "Image Editing", "Introduction to AI", "Personal Finance" ],
      "ELECTIVES": [ "SAT Prep", "Senior Project", "Freshman Success", "Teacher Cadet", "Dual Enrollment: PSY 201", "PSY 203", "SOC 101" ]
    };

    // ---------- GLOBAL STATE ----------
    let currentUser = null;
    let currentChannel = 'Global Lounge';
    let friendsModeActive = false;
    let notifications = [];
    let messageReactions = {};
    let typingTimer;
    let nextMessageId = 100;
    
    let pomodoroTimer = {
      timeLeft: 25 * 60,
      isRunning: false,
      mode: 'work',
      interval: null,
      workTime: 25 * 60,
      breakTime: 5 * 60
    };

    // User database
    const users = [
      { 
        id: 1,
        name: 'Landon Duvall', 
        email: 'student_duvala82@bmcchs.org', 
        grade: '11th Grade', 
        classes: ['Honors: Algebra 2', 'Honors: Biology 1'], 
        password: 'bmcstudybuddy',
        friends: [],
        avatar: 'https://codehs.com/uploads/6d229f3dd4f00f97da18b41ab82003e9',
        status: 'online',
        studyGroups: []
      },
      { 
        id: 2,
        name: 'Zach Burgdorf', 
        email: 'student_burgza45@bmcchs.org', 
        grade: '11th Grade', 
        classes: ['College Prep: English 1', 'College Prep: Biology 1 Advanced'], 
        password: 'bmcstudy buddy',
        friends: [],
        avatar: 'https://codehs.com/uploads/9a479d7f74e17c5c22bdf2c742db83e1',
        status: 'online',
        studyGroups: []
      },
      { 
        id: 3,
        name: 'Jaxon Maddox', 
        email: 'jaxonmad66@bmcchs.org', 
        grade: '9th Grade', 
        classes: ['Honors: English 3', 'Dual Enrollment: MAT 140'], 
        password: 'bmcstudybuddy',
        friends: [],
        avatar: 'https://codehs.com/uploads/479f3258c745682680edfaf33457102f',
        status: 'online',
        studyGroups: []
      }
    ];

    // Messages storage
    const messages = {
      'Global Lounge': [
        { id: 1, sender: 'System', text: 'Welcome to Global Lounge! 👋', timestamp: Date.now(), reactions: [] }
      ],
      'Friends Lounge': [
        { id: 2, sender: 'System', text: 'Welcome to Friends Lounge! Meet people from all grades.', timestamp: Date.now(), reactions: [] }
      ]
    };

    // DOM Elements
    const sections = document.querySelectorAll('.section');
    const navLinks = document.querySelectorAll('.nav-links a');
    const dashboardNav = document.getElementById('dashboard-nav-link');
    const resourcesNav = document.getElementById('resources-nav-link');
    const userNameSpan = document.getElementById('current-user-name');
    const messageFeed = document.getElementById('message-feed');
    const channelHeader = document.getElementById('current-channel-header');
    const chatInput = document.getElementById('chat-input');
    const typingIndicator = document.getElementById('typing-indicator');
    const onlineListEl = document.getElementById('online-list');
    const onlineCount = document.getElementById('online-count');
    const channelListEl = document.getElementById('channel-list');
    const classListEl = document.getElementById('class-list');
    const dmListEl = document.getElementById('dm-list');
    const courseContainer = document.getElementById('course-checkboxes-container');
    const friendsToggleIcon = document.getElementById('friends-toggle');
    const toastContainer = document.getElementById('toast-container');
    const searchInput = document.getElementById('global-search');
    const searchResults = document.getElementById('search-results');

    // Initialize Emoji Picker
    function initEmojiPicker() {
      if (window.EmojiMart) {
        const picker = new EmojiMart.Picker({
          onSelect: (emoji) => {
            chatInput.value += emoji.native;
            toggleEmojiPicker();
          },
          theme: document.body.classList.contains('light-theme') ? 'light' : 'dark',
          set: 'apple'
        });
        document.getElementById('emoji-picker').appendChild(picker);
      }
    }

    // Toast notifications
    function showToast(message, type = 'info') {
      const toast = document.createElement('div');
      toast.className = `toast ${type}`;
      toast.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        <span>${message}</span>
      `;
      toastContainer.appendChild(toast);
      
      setTimeout(() => {
        toast.remove();
      }, 3000);
    }

    // Build course checkboxes
    function buildCourseCheckboxes() {
      if (!courseContainer) return;
      courseContainer.innerHTML = '';
      for (let cat in courseCategories) {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'category-group';
        const title = document.createElement('div');
        title.className = 'category-title';
        title.innerText = cat;
        groupDiv.appendChild(title);
        
        courseCategories[cat].forEach(course => {
          const item = document.createElement('div');
          item.className = 'checkbox-item';
          const cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.value = course;
          cb.id = 'cb_' + course.replace(/[^a-zA-Z0-9]/g, '_');
          const label = document.createElement('label');
          label.htmlFor = cb.id;
          label.innerText = course;
          item.appendChild(cb);
          item.appendChild(label);
          groupDiv.appendChild(item);
        });
        courseContainer.appendChild(groupDiv);
      }
    }
    buildCourseCheckboxes();

    // Theme toggle with persistence
    window.toggleTheme = function() {
      document.body.classList.toggle('light-theme');
      const icon = document.getElementById('theme-toggle');
      icon.classList.toggle('fa-sun');
      icon.classList.toggle('fa-moon');
      localStorage.setItem('theme', document.body.classList.contains('light-theme') ? 'light' : 'dark');
      
      const pickerContainer = document.getElementById('emoji-picker');
      pickerContainer.innerHTML = '';
      initEmojiPicker();
    };

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      document.body.classList.add('light-theme');
      document.getElementById('theme-toggle').classList.replace('fa-sun', 'fa-moon');
    }

    // Friends mode toggle
    window.toggleFriendsMode = function() {
      if (!currentUser) {
        showToast('Please log in first', 'warning');
        return;
      }
      friendsModeActive = !friendsModeActive;
      friendsToggleIcon.style.color = friendsModeActive ? '#ff69b4' : 'var(--text-secondary)';
      buildChannelList();
      showToast(friendsModeActive ? 'Friends mode activated' : 'Friends mode deactivated', 'success');
    };

    // Navigation
    window.showSection = function(sectionId) {
      sections.forEach(sec => sec.classList.remove('active-section'));
      document.getElementById(sectionId + '-section').classList.add('active-section');
      
      navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.dataset.section === sectionId) {
          link.classList.add('active');
        }
      });

      if (sectionId === 'dashboard' && currentUser) {
        buildChannelList();
        loadChannel(currentChannel);
      }
    };

    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const sec = link.dataset.section;
        if ((sec === 'dashboard' || sec === 'resources') && !currentUser) {
          showToast('Please log in first', 'warning');
          showSection('join');
          return;
        }
        showSection(sec);
      });
    });

    // Zoom MEET FUNCTIONS
    window.createZoomMeet = function() {
      if (!currentUser) {
        showToast('Please log in first', 'warning');
        return;
      }
      
      // Open Zoom Meet in a new tab
      window.open('https://us04web.zoom.us/join?ampDeviceId=42297dc2-af74-4236-a935-814d7c9d7474&ampSessionId=1773318717839', '_blank');
      
      // Ask for the meeting code
      const meetCode = prompt('Enter the Zoom Meet code (the part after https://https://us04web.zoom.us/join?ampDeviceId=42297dc2-af74-4236-a935-814d7c9d7474&ampSessionId=1773318717839/):', 'abc-defg-hij');
      
      if (meetCode) {
        // Clean up the code
        let cleanCode = meetCode.trim();
        if (cleanCode.includes('https://us04web.zoom.us/join?ampDeviceId=42297dc2-af74-4236-a935-814d7c9d7474&ampSessionId=1773318717839/')) {
          cleanCode = cleanCode.split('https://us04web.zoom.us/join?ampDeviceId=42297dc2-af74-4236-a935-814d7c9d7474&ampSessionId=1773318717839/')[1].split('?')[0].split('#')[0];
        }
        cleanCode = cleanCode.replace(/\s+/g, '');
        
        if (cleanCode) {
          const meetLink = `https://us04web.zoom.us/join?ampDeviceId=42297dc2-af74-4236-a935-814d7c9d7474&ampSessionId=1773318717839/${cleanCode}`;
          
          // Create a styled meet message
          const meetMessage = {
            id: nextMessageId++,
            sender: currentUser.name,
            text: `📹 Zoom Meet session started!`,
            meetCode: cleanCode,
            meetLink: meetLink,
            timestamp: Date.now(),
            reactions: [],
            isMeetLink: true,
            isVideo: true
          };
          
          if (!messages[currentChannel]) messages[currentChannel] = [];
          messages[currentChannel].push(meetMessage);
          renderMessages(messages[currentChannel]);
          
          showToast('Zoom Meet code shared!', 'success');
          notifyChannelUsers(currentChannel, `${currentUser.name} started a Zoom Meet! Code: ${cleanCode}`);
        }
      }
    };

    window.scheduleCall = function() {
      if (!currentUser) {
        showToast('Please log in first', 'warning');
        return;
      }
      
      const dateTime = prompt('Enter date and time for the call (e.g., "Tomorrow 3:00 PM"):');
      if (!dateTime) return;
      
      const meetCode = prompt('Enter the Zoom Meet code you will use:', 'abc-defg-hij');
      if (!meetCode) return;
      
      const cleanCode = meetCode.trim().replace(/\s+/g, '');
      const meetLink = `https://us04web.zoom.us/join?ampDeviceId=42297dc2-af74-4236-a935-814d7c9d7474&ampSessionId=1773318717839/${cleanCode}`;
      
      const scheduleMsg = {
        id: nextMessageId++,
        sender: currentUser.name,
        text: `📅 Scheduled a Zoom Meet for ${dateTime}!`,
        meetCode: cleanCode,
        meetLink: meetLink,
        scheduledTime: dateTime,
        timestamp: Date.now(),
        reactions: [],
        isMeetLink: true,
        isScheduled: true
      };
      
      if (!messages[currentChannel]) messages[currentChannel] = [];
      messages[currentChannel].push(scheduleMsg);
      renderMessages(messages[currentChannel]);
      showToast(`Meet scheduled for ${dateTime}`, 'success');
      saveToCalendar(dateTime, cleanCode, meetLink);
    };

    window.showUpcomingCalls = function() {
      const calendar = JSON.parse(localStorage.getItem('bmc_calendar') || '[]');
      if (calendar.length === 0) {
        showToast('No upcoming calls scheduled', 'info');
        return;
      }
      
      let message = '📅 Upcoming Zoom Meets:\n';
      calendar.forEach(call => {
        message += `\n${call.dateTime} - Code: ${call.meetCode}`;
      });
      
      showToast(message, 'info');
    };

    function saveToCalendar(dateTime, meetCode, meetLink) {
      const calendar = JSON.parse(localStorage.getItem('bmc_calendar') || '[]');
      calendar.push({
        id: Date.now(),
        dateTime: dateTime,
        meetCode: meetCode,
        link: meetLink,
        channel: currentChannel,
        createdBy: currentUser.name,
        timestamp: Date.now()
      });
      localStorage.setItem('bmc_calendar', JSON.stringify(calendar));
    }

    function notifyChannelUsers(channel, message) {
      const notificationMsg = {
        id: nextMessageId++,
        sender: '🔔 System',
        text: message,
        timestamp: Date.now(),
        reactions: [],
        isNotification: true
      };
      
      if (!messages[channel]) messages[channel] = [];
      messages[channel].push(notificationMsg);
      renderMessages(messages[channel]);
      showToast(message, 'info');
    }

    function playNotificationSound() {
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.1);
      } catch (e) {
        console.log('Audio not supported');
      }
    }

    // Build channel list
    function buildChannelList() {
      if (!currentUser) return;

      let channels = ['Global Lounge', 'Announcements'];
      const gradeChannel = `${currentUser.grade} Channel`;
      channels.push(gradeChannel);
      
      if (!messages[gradeChannel]) {
        messages[gradeChannel] = [{ 
          id: nextMessageId++,
          sender: 'System', 
          text: `Welcome, ${currentUser.grade} students! 📚`, 
          timestamp: Date.now(),
          reactions: []
        }];
      }

      if (friendsModeActive) {
        channels.push('Friends Lounge');
        if (!messages['Friends Lounge']) {
          messages['Friends Lounge'] = [{ 
            id: nextMessageId++,
            sender: 'System', 
            text: 'Welcome to Friends Lounge! 👥', 
            timestamp: Date.now(),
            reactions: []
          }];
        }
      }

      channelListEl.innerHTML = '';
      channels.forEach(ch => {
        const li = document.createElement('li');
        li.className = 'channel-item' + (ch === currentChannel ? ' active' : '');
        li.setAttribute('data-channel', ch);
        li.innerHTML = `<i class="fas fa-hashtag"></i> ${ch}`;
        li.addEventListener('click', () => switchToChannel(ch));
        channelListEl.appendChild(li);
      });

      classListEl.innerHTML = '';
      if (currentUser.classes && currentUser.classes.length > 0) {
        currentUser.classes.forEach(cls => {
          if (!messages[cls]) {
            messages[cls] = [{ 
              id: nextMessageId++,
              sender: 'System', 
              text: `Welcome to the ${cls} study group! 📖`, 
              timestamp: Date.now(),
              reactions: []
            }];
          }
          const li = document.createElement('li');
          li.className = 'class-item' + (cls === currentChannel ? ' active' : '');
          li.setAttribute('data-channel', cls);
          li.innerHTML = `<i class="fas fa-book"></i> ${cls}`;
          li.addEventListener('click', () => switchToChannel(cls));
          classListEl.appendChild(li);
        });
      }

      dmListEl.innerHTML = '';
      const user = users.find(u => u.email === currentUser.email);
      if (user && user.friends && user.friends.length > 0) {
        user.friends.forEach(friendName => {
          const dmKey = `dm:${friendName}`;
          if (!messages[dmKey]) {
            messages[dmKey] = [{ 
              id: nextMessageId++,
              sender: 'System', 
              text: `Private conversation with ${friendName}`, 
              timestamp: Date.now(),
              reactions: []
            }];
          }
          const li = document.createElement('li');
          li.className = 'dm-item' + (currentChannel === dmKey ? ' active' : '');
          li.setAttribute('data-channel', dmKey);
          li.innerHTML = `<i class="fas fa-user"></i> ${friendName}`;
          li.addEventListener('click', () => switchToChannel(dmKey));
          dmListEl.appendChild(li);
        });
      } else {
        dmListEl.innerHTML = '<li style="color: var(--text-secondary); padding: 0.5rem;">Add friends to start chatting</li>';
      }

      const studyGroupList = document.getElementById('study-group-list');
      if (studyGroupList) {
        studyGroupList.innerHTML = '';
        const studyGroups = ['Math Study Group', 'Science Study Group', 'History Study Group'];
        studyGroups.forEach(group => {
          const li = document.createElement('li');
          li.className = 'channel-item';
          li.innerHTML = `<i class="fas fa-users"></i> ${group}`;
          li.addEventListener('click', () => showToast('Study group feature coming soon!', 'info'));
          studyGroupList.appendChild(li);
        });
      }
    }

    function switchToChannel(ch) {
      currentChannel = ch;
      document.querySelectorAll('.channel-item, .class-item, .dm-item').forEach(el => el.classList.remove('active'));
      const activeItem = [...document.querySelectorAll('.channel-item, .class-item, .dm-item')].find(el => el.dataset.channel === ch);
      if (activeItem) activeItem.classList.add('active');
      loadChannel(ch);
      
      // Tell server we joined this room
      socket.emit('join-room', { room: ch });
    }

    function loadChannel(channel) {
      let displayName = channel;
      if (channel.startsWith('dm:')) {
        displayName = channel.substring(3);
      }
      document.getElementById('channel-name').innerText = displayName;

      if (!messages[channel]) {
        messages[channel] = [{ 
          id: nextMessageId++,
          sender: 'System', 
          text: `Welcome to ${displayName}!`, 
          timestamp: Date.now(),
          reactions: []
        }];
      }
      renderMessages(messages[channel]);

      let online = [];
      if (channel === 'Global Lounge') {
        online = users.map(u => u.name);
      } else if (channel === 'Friends Lounge') {
        online = users.filter(u => u.friends?.includes(currentUser?.name)).map(u => u.name);
      } else if (channel.endsWith(' Channel')) {
        const grade = channel.split(' ')[0];
        online = users.filter(u => u.grade === grade).map(u => u.name);
      } else if (channel.startsWith('dm:')) {
        const friendName = channel.substring(3);
        online = [currentUser.name, friendName];
      } else {
        online = users.filter(u => u.classes.includes(channel)).map(u => u.name);
      }
      
      renderOnlineUsers(online);
    }

    // renderMessages function with Zoom Meet styling
    function renderMessages(msgs) {
      messageFeed.innerHTML = '';
      msgs.slice().reverse().forEach(msg => {
        const div = document.createElement('div');
        div.className = 'message' + (msg.sender === currentUser?.name ? ' own-message' : '') + (msg.isMeetLink ? ' meet-message' : '');
        
        const time = new Date(msg.timestamp).toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        });

        let content = '';
        
        // Handle Zoom Meet messages
        if (msg.isMeetLink) {
          if (msg.isScheduled) {
            content = `<div>
              <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                <i class="fas fa-calendar" style="color: #ffc107; font-size: 1.5rem;"></i>
                <strong style="font-size: 1.1rem;">Scheduled Zoom Meet</strong>
              </div>
              <p style="margin-bottom: 5px;">Time: <strong>${msg.scheduledTime}</strong></p>
              <p style="margin-bottom: 5px;">Meeting Code:</p>
              <div class="meet-code">${msg.meetCode}</div>
              <a href="${msg.meetLink}" target="_blank" class="meet-link-btn">
                <i class="fab fa-zoom"></i> Join Zoom Meet
              </a>
            </div>`;
          } else {
            content = `<div>
              <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                <i class="fas fa-video" style="color: var(--google-blue); font-size: 1.5rem;"></i>
                <strong style="font-size: 1.1rem;">Zoom Meet Started!</strong>
              </div>
              <p style="margin-bottom: 5px;">Meeting Code:</p>
              <div class="meet-code">${msg.meetCode}</div>
              <a href="${msg.meetLink}" target="_blank" class="meet-link-btn">
                <i class="fab fa-zoom"></i> Join Zoom Meet
              </a>
            </div>`;
          }
        } else {
          // Regular message
          content = msg.text;
        }

        let reactionsHtml = '';
        if (msg.reactions && msg.reactions.length > 0) {
          const reactionCounts = {};
          msg.reactions.forEach(r => {
            reactionCounts[r.emoji] = (reactionCounts[r.emoji] || 0) + 1;
          });
          
          reactionsHtml = '<div class="reactions">';
          for (let emoji in reactionCounts) {
            reactionsHtml += `<span class="reaction-badge" onclick="addReaction(${msg.id}, '${emoji}')">${emoji} ${reactionCounts[emoji]}</span>`;
          }
          reactionsHtml += '</div>';
        }

        div.innerHTML = `
          <div class="meta">
            <span class="sender">${msg.sender}</span>
            <span class="time">${time}</span>
            ${msg.isMeetLink ? '<span style="background: var(--google-blue); color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.7rem; margin-left: 5px; font-weight: bold;">MEET</span>' : ''}
            ${msg.isScheduled ? '<span style="background: #ffc107; color: black; padding: 2px 8px; border-radius: 12px; font-size: 0.7rem; margin-left: 5px; font-weight: bold;">SCHEDULED</span>' : ''}
          </div>
          <div>${content}</div>
          ${reactionsHtml}
        `;

        if (content.includes('<img') && !content.includes('onclick')) {
          div.querySelector('img')?.addEventListener('click', (e) => {
            const modal = document.getElementById('image-modal');
            const modalImg = document.getElementById('modal-image');
            modalImg.src = e.target.src;
            modal.classList.add('active');
          });
        }

        messageFeed.appendChild(div);
      });
    }

    function renderOnlineUsers(usersList) {
      onlineListEl.innerHTML = '';
      usersList.forEach(name => {
        const li = document.createElement('li');
        const user = users.find(u => u.name === name);
        
        li.innerHTML = `
          <span class="name">
            <span class="online-dot">●</span>
            <img src="${user?.avatar || 'https://i.pravatar.cc/150?img=' + Math.floor(Math.random() * 10)}" 
                 style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover;">
            ${name}
          </span>
        `;

        if (currentUser && name !== currentUser.name) {
          const currentUserObj = users.find(u => u.email === currentUser.email);
          if (!currentUserObj.friends.includes(name)) {
            const addIcon = document.createElement('i');
            addIcon.className = 'fas fa-user-plus add-friend';
            addIcon.title = 'Add friend';
            addIcon.onclick = (e) => {
              e.stopPropagation();
              addFriend(name);
            };
            li.appendChild(addIcon);
          }
        }
        onlineListEl.appendChild(li);
      });
      onlineCount.innerText = usersList.length;
    }

    function addFriend(friendName) {
      if (!currentUser) return;
      
      const current = users.find(u => u.email === currentUser.email);
      const friend = users.find(u => u.name === friendName);
      
      if (!current || !friend) return;
      if (current.friends.includes(friendName)) {
        showToast('Already friends!', 'info');
        return;
      }

      current.friends.push(friendName);
      friend.friends.push(currentUser.name);
      currentUser.friends = current.friends;
      
      buildChannelList();
      showToast(`You are now friends with ${friendName}! 🎉`, 'success');
    }

    window.addReaction = function(messageId, emoji) {
      if (!currentUser) return;
      
      const msg = messages[currentChannel].find(m => m.id === messageId);
      if (msg) {
        if (!msg.reactions) msg.reactions = [];
        msg.reactions.push({
          user: currentUser.name,
          emoji: emoji,
          timestamp: Date.now()
        });
        renderMessages(messages[currentChannel]);
      }
    };

    window.sendMessage = function() {
      if (!currentUser) {
        showToast('Please log in to send messages', 'warning');
        return;
      }

      const text = chatInput.value.trim();
      if (!text) return;

      // Send message through socket
      socket.emit('send-message', {
        room: currentChannel,
        user: currentUser.name,
        text: text
      });

      chatInput.value = '';
      typingIndicator.innerText = '';
    };

    function getRandomReply() {
      const replies = [
        "Great point! 👍",
        "Thanks for sharing!",
        "Let's study together sometime",
        "Has anyone started the homework?",
        "This is really helpful!",
        "💯 agree",
        "Can you explain that again?"
      ];
      return replies[Math.floor(Math.random() * replies.length)];
    }

    chatInput?.addEventListener('input', () => {
      if (!currentUser) return;
      typingIndicator.innerText = `${currentUser.name} is typing...`;
      clearTimeout(typingTimer);
      typingTimer = setTimeout(() => {
        typingIndicator.innerText = '';
      }, 1200);
    });

    chatInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    document.getElementById('file-input')?.addEventListener('change', (e) => {
      const files = Array.from(e.target.files);
      if (files.length > 0 && currentUser) {
        files.forEach(file => {
          if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
              const msg = {
                id: nextMessageId++,
                sender: currentUser.name,
                text: `<img src="${e.target.result}" style="max-width: 200px; border-radius: 8px; cursor: pointer;" onclick="showImageModal(this.src)">`,
                timestamp: Date.now(),
                reactions: []
              };
              messages[currentChannel].push(msg);
              renderMessages(messages[currentChannel]);
            };
            reader.readAsDataURL(file);
          } else {
            const msg = {
              id: nextMessageId++,
              sender: currentUser.name,
              text: `📎 Uploaded: ${file.name}`,
              timestamp: Date.now(),
              reactions: []
            };
            messages[currentChannel].push(msg);
            renderMessages(messages[currentChannel]);
          }
        });
        showToast(`${files.length} file(s) uploaded`, 'success');
      }
    });

    window.showImageModal = function(src) {
      const modal = document.getElementById('image-modal');
      const modalImg = document.getElementById('modal-image');
      modalImg.src = src;
      modal.classList.add('active');
    };

    window.toggleEmojiPicker = function() {
      const picker = document.getElementById('emoji-picker');
      picker.classList.toggle('active');
    };

    window.handleSearch = function(query) {
      if (!query || query.length < 2) {
        searchResults.style.display = 'none';
        return;
      }

      const results = [];
      
      for (let channel in messages) {
        messages[channel].forEach(msg => {
          if (msg.text.toLowerCase().includes(query.toLowerCase())) {
            results.push({
              type: 'message',
              channel: channel,
              content: msg.text.substring(0, 50) + '...',
              sender: msg.sender,
              time: new Date(msg.timestamp).toLocaleDateString()
            });
          }
        });
      }

      users.forEach(user => {
        if (user.name.toLowerCase().includes(query.toLowerCase())) {
          results.push({
            type: 'user',
            name: user.name,
            grade: user.grade
          });
        }
      });

      if (results.length > 0) {
        searchResults.innerHTML = results.map(r => {
          if (r.type === 'message') {
            return `<div class="search-result-item" onclick="jumpToMessage('${r.channel}')">
                      <i class="fas fa-comment"></i> ${r.content}
                      <small>${r.sender} · ${r.time}</small>
                    </div>`;
          } else {
            return `<div class="search-result-item" onclick="startDM('${r.name}')">
                      <i class="fas fa-user"></i> ${r.name}
                      <small>${r.grade}</small>
                    </div>`;
          }
        }).join('');
        searchResults.style.display = 'block';
      } else {
        searchResults.style.display = 'none';
      }
    };

    // Pomodoro Timer
    window.startPomodoro = function() {
      if (pomodoroTimer.isRunning) return;
      
      pomodoroTimer.isRunning = true;
      pomodoroTimer.interval = setInterval(() => {
        if (pomodoroTimer.timeLeft > 0) {
          pomodoroTimer.timeLeft--;
          updatePomodoroDisplay();
        } else {
          if (pomodoroTimer.mode === 'work') {
            pomodoroTimer.mode = 'break';
            pomodoroTimer.timeLeft = pomodoroTimer.breakTime;
            document.getElementById('pomodoro-phase').innerText = 'Break Time ☕';
            showToast('Time for a break!', 'info');
          } else {
            pomodoroTimer.mode = 'work';
            pomodoroTimer.timeLeft = pomodoroTimer.workTime;
            document.getElementById('pomodoro-phase').innerText = 'Work Time 📚';
            showToast('Break over! Back to work!', 'info');
          }
        }
      }, 1000);
    };

    window.pausePomodoro = function() {
      pomodoroTimer.isRunning = false;
      clearInterval(pomodoroTimer.interval);
    };

    window.resetPomodoro = function() {
      pausePomodoro();
      pomodoroTimer.mode = 'work';
      pomodoroTimer.timeLeft = pomodoroTimer.workTime;
      document.getElementById('pomodoro-phase').innerText = 'Work Time 📚';
      updatePomodoroDisplay();
    };

    function updatePomodoroDisplay() {
      const minutes = Math.floor(pomodoroTimer.timeLeft / 60);
      const seconds = pomodoroTimer.timeLeft % 60;
      const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      
      if (document.getElementById('pomodoro-display')) {
        document.getElementById('pomodoro-display').innerText = timeString;
      }
      if (document.getElementById('pomodoro-display-home')) {
        document.getElementById('pomodoro-display-home').innerText = timeString;
      }
    }

    window.showPomodoroModal = function() {
      document.getElementById('pomodoro-modal').classList.add('active');
      updatePomodoroDisplay();
    };

    window.closePomodoroModal = function() {
      document.getElementById('pomodoro-modal').classList.remove('active');
    };

    // Auth functions
    window.showLoginForm = function() {
      document.getElementById('login-form').style.display = 'block';
      document.getElementById('register-form').style.display = 'none';
      document.getElementById('forgot-form').style.display = 'none';
    };

    window.showRegisterForm = function() {
      document.getElementById('login-form').style.display = 'none';
      document.getElementById('register-form').style.display = 'block';
      document.getElementById('forgot-form').style.display = 'none';
    };

    window.showForgotPassword = function() {
      document.getElementById('login-form').style.display = 'none';
      document.getElementById('register-form').style.display = 'none';
      document.getElementById('forgot-form').style.display = 'block';
    };

    window.handleLogin = function() {
      const email = document.getElementById('login-email').value.trim();
      const pwd = document.getElementById('login-password').value.trim();
      const remember = document.getElementById('remember-me').checked;

      const user = users.find(u => u.email === email && u.password === pwd);
      
      if (user) {
        currentUser = { 
          name: user.name, 
          email: user.email, 
          grade: user.grade, 
          classes: user.classes, 
          friends: user.friends,
          avatar: user.avatar
        };
        
        if (remember) {
          localStorage.setItem('bmc_user', JSON.stringify(currentUser));
        } else {
          sessionStorage.setItem('bmc_user', JSON.stringify(currentUser));
        }
        
        document.getElementById('login-error').innerText = '';
        showToast(`Welcome back, ${user.name}! 🎉`, 'success');
        afterLogin();
      } else {
        document.getElementById('login-error').innerText = 'Invalid email or password';
        showToast('Login failed', 'error');
      }
    };

    window.handleRegister = function() {
      const name = document.getElementById('reg-name').value.trim();
      const email = document.getElementById('reg-email').value.trim();
      const grade = document.getElementById('reg-grade').value;
      const checkboxes = document.querySelectorAll('#course-checkboxes-container input[type="checkbox"]:checked');
      const selectedClasses = Array.from(checkboxes).map(cb => cb.value);
      const pwd = document.getElementById('reg-password').value.trim();
      const confirmPwd = document.getElementById('reg-confirm-password').value.trim();

      if (!name || !email || !pwd || selectedClasses.length === 0) {
        document.getElementById('register-error').innerText = 'Please fill all fields and select at least one class';
        return;
      }

      if (!email.endsWith('@bmcchs.org')) {
        document.getElementById('register-error').innerText = 'Must use school email (@bmcchs.org)';
        return;
      }

      if (pwd.length < 8) {
        document.getElementById('register-error').innerText = 'Password must be at least 8 characters';
        return;
      }

      if (pwd !== confirmPwd) {
        document.getElementById('register-error').innerText = 'Passwords do not match';
        return;
      }

      if (users.find(u => u.email === email)) {
        document.getElementById('register-error').innerText = 'Email already exists';
        return;
      }

      const newUser = { 
        id: users.length + 1,
        name, 
        email, 
        grade, 
        classes: selectedClasses, 
        password: pwd, 
        friends: [],
        avatar: `https://i.pravatar.cc/150?img=${users.length + 1}`,
        status: 'online',
        studyGroups: []
      };
      
      users.push(newUser);
      currentUser = { 
        name, 
        email, 
        grade, 
        classes: selectedClasses, 
        friends: [],
        avatar: newUser.avatar
      };
      
      localStorage.setItem('bmc_user', JSON.stringify(currentUser));
      document.getElementById('register-error').innerText = '';
      showToast('Registration successful! 🎉', 'success');
      afterLogin();
    };

    window.handleForgotPassword = function() {
      const email = document.getElementById('forgot-email').value.trim();
      const user = users.find(u => u.email === email);
      
      if (user) {
        document.getElementById('forgot-success').innerText = 'Password reset link sent to your email!';
        document.getElementById('forgot-error').innerText = '';
        showToast('Reset link sent! Check your email', 'success');
      } else {
        document.getElementById('forgot-error').innerText = 'Email not found';
        showToast('Email not found', 'error');
      }
    };

    function afterLogin() {
      userNameSpan.innerText = currentUser.name;
      friendsToggleIcon.style.color = 'var(--text-secondary)';
      
      dashboardNav.style.display = 'inline-block';
      resourcesNav.style.display = 'inline-block';
      
      buildChannelList();
      loadChannel('Global Lounge');
      showSection('dashboard');
      
      notifications.push({
        user: 'System',
        message: `Welcome to BMC Study Buddy, ${currentUser.name}!`,
        timestamp: Date.now()
      });

      // Tell server user joined
      socket.emit('user-join', { name: currentUser.name });
      socket.emit('join-room', { room: 'Global Lounge' });
    }

    window.logout = function() {
      currentUser = null;
      friendsModeActive = false;
      friendsToggleIcon.style.color = 'var(--text-secondary)';
      
      localStorage.removeItem('bmc_user');
      sessionStorage.removeItem('bmc_user');
      
      dashboardNav.style.display = 'none';
      resourcesNav.style.display = 'none';
      
      showSection('home');
      showToast('Logged out successfully', 'info');
    };

    window.uploadResource = function() {
      const title = document.getElementById('resource-title')?.value;
      const type = document.getElementById('resource-type')?.value;
      const file = document.getElementById('resource-file')?.files[0];

      if (!title || !file) {
        showToast('Please fill all fields', 'warning');
        return;
      }

      showToast('Resource uploaded successfully!', 'success');
      
      document.getElementById('resource-title').value = '';
      document.getElementById('resource-file').value = '';
    };

    window.showNotifications = function() {
      if (notifications.length === 0) {
        showToast('No new notifications', 'info');
      } else {
        notifications.forEach(notif => {
          showToast(notif.message, 'info');
        });
      }
    };

    window.createChannel = function() {
      const channelName = prompt('Enter channel name:');
      if (channelName && currentUser) {
        if (!messages[channelName]) {
          messages[channelName] = [{
            id: nextMessageId++,
            sender: 'System',
            text: `Welcome to ${channelName}!`,
            timestamp: Date.now(),
            reactions: []
          }];
          buildChannelList();
          showToast(`Channel ${channelName} created`, 'success');
        } else {
          showToast('Channel already exists', 'warning');
        }
      }
    };

    window.createStudyGroup = function() {
      showToast('Study group creation coming soon!', 'info');
    };

    window.startNewDM = function() {
      const friendName = prompt('Enter friend\'s name:');
      if (friendName) {
        const friend = users.find(u => u.name === friendName);
        if (friend) {
          addFriend(friendName);
        } else {
          showToast('User not found', 'error');
        }
      }
    };

    window.startDM = function(friendName) {
      addFriend(friendName);
      switchToChannel(`dm:${friendName}`);
      searchResults.style.display = 'none';
      if (searchInput) searchInput.value = '';
    };

    window.jumpToMessage = function(channel) {
      switchToChannel(channel);
      searchResults.style.display = 'none';
      if (searchInput) searchInput.value = '';
    };

    window.refreshClasses = function() {
      buildChannelList();
      showToast('Classes refreshed', 'success');
    };

    window.showChannelInfo = function() {
      showToast(`Channel: ${currentChannel}`, 'info');
    };

    const savedUser = localStorage.getItem('bmc_user') || sessionStorage.getItem('bmc_user');
    if (savedUser) {
      try {
        currentUser = JSON.parse(savedUser);
        const exists = users.find(u => u.email === currentUser.email);
        if (exists) {
          afterLogin();
        } else {
          localStorage.removeItem('bmc_user');
          sessionStorage.removeItem('bmc_user');
        }
      } catch (e) {
        console.error('Error loading saved user:', e);
      }
    }

    initEmojiPicker();

    window.onclick = function(event) {
      if (event.target.classList.contains('modal')) {
        event.target.classList.remove('active');
      }
    };

    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        document.getElementById('global-search')?.focus();
      }
      if (e.ctrlKey && e.key === 'm') {
        e.preventDefault();
        toggleFriendsMode();
      }
      if (e.ctrlKey && e.key === 'p') {
        e.preventDefault();
        showPomodoroModal();
      }
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal.active').forEach(modal => {
          modal.classList.remove('active');
        });
        document.getElementById('emoji-picker')?.classList.remove('active');
        document.getElementById('search-results').style.display = 'none';
      }
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-bar')) {
        document.getElementById('search-results').style.display = 'none';
      }
    });

    // Socket.io event listeners
    socket.on('connect', () => {
      console.log('Connected to server');
    });

    socket.on('receive-message', (data) => {
      if (data.room === currentChannel) {
        if (!messages[data.room]) messages[data.room] = [];
        messages[data.room].push({
          id: nextMessageId++,
          sender: data.user,
          text: data.text,
          timestamp: data.timestamp,
          reactions: []
        });
        renderMessages(messages[data.room]);
      }
    });

    socket.on('user-list', (userList) => {
      const onlineNames = userList.map(u => u.name);
      renderOnlineUsers(onlineNames);
    });

    console.log('BMC Study Buddy with Zoom Meet integration loaded!');
})();