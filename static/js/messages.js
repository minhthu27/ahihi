document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const conversationsList = document.getElementById('conversations-list');
    const messagesContainer = document.getElementById('messages-container');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const emptyState = document.getElementById('empty-state');
    const conversationView = document.getElementById('conversation-view');
    const newConversationBtn = document.getElementById('new-conversation-btn');
    const startNewMessageBtn = document.getElementById('start-new-message-btn');
    const newConversationModal = document.getElementById('new-conversation-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const userSearchInput = document.getElementById('user-search-input');
    const usersList = document.getElementById('users-list');
    const searchInput = document.getElementById('search-input');

    // State
    let currentUser = null;
    let conversations = [];
    let currentConversation = null;
    let messages = [];
    let users = [];
    let darkMode = localStorage.getItem('dark_mode') === 'true';

    // Apply dark mode if enabled
    if (darkMode) {
        document.body.classList.add('dark-mode');
    }

    // Initialize
    init();

    // Functions
    function init() {
        // Load current user
        applyTheme();
        loadCurrentUser();
        
        // Load conversations
        loadConversations();
        
        // Setup event listeners
        setupEventListeners();
    }
    function applyTheme() {
        const isDarkMode = localStorage.getItem("dark_mode") === "true"
        if (isDarkMode) {
            document.body.classList.add("dark-mode")
        } else {
            document.body.classList.remove("dark-mode")
        }
    }
    function loadConversations() {
        conversationsList.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p>Loading conversations...</p>
            </div>
        `;

        const token = localStorage.getItem('auth_token');
        if (!token) {
            conversationsList.innerHTML = `
                <div class="empty-conversations">
                    <p>Please log in to view conversations.</p>
                </div>
            `;
            return;
        }

        fetch('/api/messages/conversations', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
            .then(response => {
                if (!response.ok) {
                    if (response.status === 401) {
                        throw new Error('Unauthorized: Please log in again.');
                    }
                    throw new Error(`HTTP error ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                conversations = data.conversations || [];
                if (conversations.length === 0) {
                    conversationsList.innerHTML = `
                        <div class="empty-conversations">
                            <p>No conversations yet.</p>
                        </div>
                    `;
                } else {
                    renderConversations();
                }
            })
            .catch(error => {
                console.error('Error loading conversations:', error);
                conversationsList.innerHTML = `
                    <div class="empty-conversations">
                        <p>${error.message}</p>
                    </div>
                `;
            });
    }

    function loadCurrentUser() {
        // In a real app, you would fetch this from your API
        // For demo purposes, we'll use a mock user
        currentUser = {
            _id: 'user1',
            username: 'johndoe',
            fullname: 'John Doe',
            avatar: 'https://randomuser.me/api/portraits/men/32.jpg'
        };
    }

    function loadUsers() {
        const token = localStorage.getItem('auth_token');
        if (!token) {
            usersList.innerHTML = `
                <div class="empty-users">
                    <p>Please log in to view users.</p>
                </div>
            `;
            return;
        }

        usersList.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p>Loading users...</p>
            </div>
        `;

        fetch('/api/messages/users', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
            .then(response => {
                if (!response.ok) {
                    if (response.status === 401) {
                        throw new Error('Unauthorized: Please log in again.');
                    }
                    throw new Error(`HTTP error ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                users = data.users || [];
                if (users.length === 0) {
                    usersList.innerHTML = `
                        <div class="empty-users">
                            <p>No users found. Follow some users to start messaging.</p>
                        </div>
                    `;
                } else {
                    renderUsers();
                }
            })
            .catch(error => {
                console.error('Error loading users:', error);
                usersList.innerHTML = `
                    <div class="empty-users">
                        <p>${error.message}</p>
                    </div>
                `;
            });

        userSearchInput.addEventListener('input', function() {
            const query = this.value.toLowerCase();
            console.log('Search query:', query); // Debug
            fetch(`/api/messages/users?q=${encodeURIComponent(query)}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                }
            })
                .then(response => {
                    console.log('Response status:', response.status); // Debug
                    if (!response.ok) {
                        throw new Error('Failed to fetch users');
                    }
                    return response.json();
                })
                .then(data => {
                    console.log('Fetched users:', data); // Debug
                    users = data.users || [];
                    renderUsers();
                })
                .catch(error => {
                    console.error('Error searching users:', error);
                });
        });
    }

    function loadMessages(conversationId) {
        messagesContainer.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p>Loading messages...</p>
            </div>
        `;

        const token = localStorage.getItem('auth_token');
        if (!token) {
            messagesContainer.innerHTML = `
                <div class="empty-messages">
                    <p>Please log in to view messages.</p>
                </div>
            `;
            return;
        }

        fetch(`/api/messages/conversations/${conversationId}/messages`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
            .then(response => {
                if (!response.ok) {
                    if (response.status === 401) {
                        throw new Error('Unauthorized: Please log in again.');
                    } else if (response.status === 404) {
                        throw new Error('Conversation not found.');
                    }
                    throw new Error(`HTTP error ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                messages = data.messages || [];
                if (messages.length === 0) {
                    messagesContainer.innerHTML = `
                        <div class="empty-messages">
                            <p>No messages yet. Start the conversation!</p>
                        </div>
                    `;
                } else {
                    renderMessages();
                }
            })
            .catch(error => {
                console.error('Error loading messages:', error);
                messagesContainer.innerHTML = `
                    <div class="empty-messages">
                        <p>${error.message}</p>
                    </div>
                `;
            });
    }

    function renderConversations() {
    if (!conversations.length) {
        conversationsList.innerHTML = `
            <div class="empty-conversations">
                <p>No conversations yet</p>
            </div>
        `;
        return;
    }

    conversationsList.innerHTML = '';

    conversations.forEach(conversation => {
        // Find the other participant (not the current user)
        const otherParticipant = conversation.participant;


        // Skip if there’s no other participant (self-conversation)
        if (!otherParticipant) {
            return;
        }

        const lastMessage = conversation.lastMessage ? conversation.lastMessage.content : 'No messages yet';
        const lastMessageTime = conversation.lastMessage ? formatTimeAgo(new Date(conversation.lastMessage.createdAt)) : '';

        const conversationElement = document.createElement('div');
        conversationElement.className = 'conversation-item';
        conversationElement.dataset.id = conversation._id;

        conversationElement.innerHTML = `
            <div class="avatar">
                <img src="${otherParticipant.avatar}" alt="${otherParticipant.fullname}">
            </div>
            <div class="conversation-details">
                <div class="conversation-header-row">
                    <span class="conversation-name">${otherParticipant.fullname}</span>
                    <span class="conversation-time">${lastMessageTime}</span>
                </div>
                <p class="conversation-preview">${lastMessage}</p>
            </div>
            ${conversation.unreadCount > 0 ? `<div class="unread-badge">${conversation.unreadCount}</div>` : ''}
        `;

        conversationElement.addEventListener('click', () => {
            selectConversation(conversation._id);
        });

        conversationsList.appendChild(conversationElement);
    });
}

    function renderMessages() {
        if (!messages.length) {
            messagesContainer.innerHTML = `
                <div class="empty-messages">
                    <p>No messages yet. Start the conversation!</p>
                </div>
            `;
            return;
        }

        messagesContainer.innerHTML = '';

        // Group messages by date
        const groupedMessages = groupMessagesByDate(messages);

        // Render messages by date
        Object.keys(groupedMessages).forEach(date => {
            const dateElement = document.createElement('div');
            dateElement.className = 'message-date';
            dateElement.innerHTML = `<span>${formatDate(new Date(date))}</span>`;
            messagesContainer.appendChild(dateElement);

            groupedMessages[date].forEach(message => {
                const isOutgoing = message.sender._id === currentUser._id;

                const messageElement = document.createElement('div');
                messageElement.className = `message ${isOutgoing ? 'outgoing' : 'incoming'}`;

                let statusHtml = '';
                if (isOutgoing) {
                    if (message.isRead) {
                        statusHtml = '<span class="message-status"><i class="fas fa-check-double"></i></span>';
                    } else if (message.isDelivered) {
                        statusHtml = '<span class="message-status"><i class="fas fa-check"></i></span>';
                    }
                }

                messageElement.innerHTML = `
                    ${!isOutgoing ? `
                        <div class="avatar">
                            <img src="${message.sender.avatar}" alt="${message.sender.fullname}">
                        </div>
                    ` : ''}
                    <div class="message-bubble">
                        <div class="message-text">${message.content}</div>
                        <div class="message-meta">
                            <span class="message-time">${formatTime(new Date(message.createdAt))}</span>
                            ${statusHtml}
                        </div>
                    </div>
                    ${isOutgoing ? `
                        <div class="avatar">
                            <img src="${message.receiver.avatar}" alt="${message.receiver.fullname}">
                        </div>
                    ` : ''}
                `;

                messagesContainer.appendChild(messageElement);
            });
        });

        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function renderUsers() {
        if (!users.length) {
            usersList.innerHTML = `
                <div class="empty-users">
                    <p>No users found</p>
                </div>
            `;
            return;
        }

        usersList.innerHTML = '';

        users.forEach(user => {
            const userElement = document.createElement('div');
            userElement.className = 'user-item';
            userElement.dataset.id = user._id;

            userElement.innerHTML = `
                <div class="avatar">
                    <img src="${user.avatar}" alt="${user.fullname}">
                </div>
                <div class="user-info">
                    <h4>${user.fullname}</h4>
                    <p>@${user.username}</p>
                </div>
            `;

            userElement.addEventListener('click', () => {
                startConversation(user._id);
            });

            usersList.appendChild(userElement);
        });
    }

    function selectConversation(conversationId) {
        // Update UI
        const conversationItems = document.querySelectorAll('.conversation-item');
        conversationItems.forEach(item => {
            item.classList.remove('active');
            if (item.dataset.id === conversationId) {
                item.classList.add('active');

                // Remove unread badge
                const unreadBadge = item.querySelector('.unread-badge');
                if (unreadBadge) {
                    unreadBadge.remove();
                }
            }
        });

        // Show conversation view
        emptyState.style.display = 'none';
        conversationView.style.display = 'flex';

        // On mobile, show messages panel
        if (window.innerWidth <= 768) {
            document.getElementById('conversations-panel').style.display = 'none';
            document.getElementById('messages-panel').classList.add('active');
        }

        // Set current conversation
        currentConversation = conversations.find(c => c._id === conversationId);

        // Update conversation header
        updateConversationHeader();

        // Load messages
        loadMessages(conversationId);

        // Enable message input
        messageInput.disabled = false;
        messageInput.focus();
    }

    function updateConversationHeader() {
        if (!currentConversation) return;

        const otherParticipant = currentConversation.participant;


        const conversationHeader = document.getElementById('conversation-header');
        conversationHeader.innerHTML = `
            ${window.innerWidth <= 768 ? `
                <button class="icon-button back-button" id="back-button">
                    <i class="fas fa-arrow-left"></i>
                </button>
            ` : ''}
            <div class="avatar">
                <img src="${otherParticipant.avatar}" alt="${otherParticipant.fullname}">
            </div>
            <div class="user-info">
                <h3>${otherParticipant.fullname}</h3>
                <p>@${otherParticipant.username}</p>
            </div>
            <div class="header-actions">
                <button class="icon-button">
                    <i class="fas fa-phone"></i>
                </button>
                <button class="icon-button">
                    <i class="fas fa-video"></i>
                </button>
                <button class="icon-button">
                    <i class="fas fa-info-circle"></i>
                </button>
            </div>
        `;

        // Setup back button for mobile
        const backButton = document.getElementById('back-button');
        if (backButton) {
            backButton.addEventListener('click', () => {
                document.getElementById('conversations-panel').style.display = 'flex';
                document.getElementById('messages-panel').classList.remove('active');
            });
        }
    }

    function startConversation(userId) {
        const token = localStorage.getItem('auth_token');
        if (!token) {
            alert('Please log in to start a conversation.');
            return;
        }

        // Check if conversation already exists client-side
        let existingConversation = conversations.find(c => c.participant && c.participant._id === userId);

        if (existingConversation) {
            selectConversation(existingConversation._id);
            closeModal();
            return;
        }

        // Create a new conversation
        fetch('/api/messages/conversations', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ receiverId: userId })
        })
            .then(response => {
                console.log('Response status:', response.status); // Debug
                if (!response.ok) {
                    if (response.status === 401) {
                        throw new Error('Unauthorized: Please log in again.');
                    }
                    throw new Error(`HTTP error ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('New conversation data:', data); // Debug
                const newConversation = {
                    _id: data.conversation._id,
                    participant: data.conversation.participants.find(p => p._id !== currentUser._id),
                    lastMessage: null,
                    unreadCount: 0
                };
                if (!newConversation.participant) {
                    console.error('No valid participant found in new conversation:', data);
                    alert('Failed to start conversation: Invalid participant data.');
                    return;
                }
                conversations.push(newConversation);
                renderConversations();
                selectConversation(newConversation._id);
                closeModal();
            })
            .catch(error => {
                console.error('Error starting conversation:', error);
                alert(error.message);
            });
    }

    function sendMessage() {
        if (!currentConversation || !messageInput.value.trim()) return;

        const content = messageInput.value.trim();
        const token = localStorage.getItem('auth_token');
        if (!token) {
            alert('Please log in to send messages.');
            return;
        }

        // Determine receiverId (the other participant in the conversation)
        const receiverId = currentConversation.participants;

        fetch(`/api/messages/conversations/${currentConversation._id}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                content,
                receiverId // Include receiverId in the payload
            })
        })
            .then(response => {
                if (!response.ok) {
                    if (response.status === 401) {
                        throw new Error('Unauthorized: Please log in again.');
                    } else if (response.status === 404) {
                        throw new Error('Conversation not found.');
                    }
                    throw new Error(`HTTP error ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                const newMessage = data.message;
                messages.push(newMessage);

                // Update conversation's lastMessage
                currentConversation.lastMessage = {
                    _id: newMessage._id,
                    content: newMessage.content,
                    sender: { _id: currentUser._id },
                    createdAt: newMessage.createdAt
                };

                // Move conversation to top
                const index = conversations.findIndex(c => c._id === currentConversation._id);
                if (index > 0) {
                    const [conversation] = conversations.splice(index, 1);
                    conversations.unshift(conversation);
                }

                // Render messages and conversations
                renderMessages();
                renderConversations();

                // Clear input
                messageInput.value = '';
                messageInput.style.height = 'auto';
                sendButton.disabled = true;
            })
            .catch(error => {
                console.error('Error sending message:', error);
                alert(error.message);
            });
    }

    function openModal() {
        newConversationModal.classList.add('active');
        loadUsers();
        
        // Focus search input
        setTimeout(() => {
            userSearchInput.focus();
        }, 300);
    }

    function closeModal() {
        newConversationModal.classList.remove('active');
    }

    function setupEventListeners() {
        // Message input
        messageInput.addEventListener('input', function() {
            // Auto resize
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
            
            // Enable/disable send button
            sendButton.disabled = this.value.trim() === '';
        });
        
        // Send button
        sendButton.addEventListener('click', sendMessage);
        
        // Send on Enter (without Shift)
        messageInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!sendButton.disabled) {
                    sendMessage();
                }
            }
        });
        
        // New conversation button
        newConversationBtn.addEventListener('click', openModal);
        startNewMessageBtn.addEventListener('click', openModal);
        
        // Close modal button
        closeModalBtn.addEventListener('click', closeModal);
        
        // Close modal when clicking outside
        newConversationModal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal();
            }
        });
        
        // User search
        userSearchInput.addEventListener('input', function() {
            const query = this.value.toLowerCase();
            
            const userItems = document.querySelectorAll('.user-item');
            userItems.forEach(item => {
                const name = item.querySelector('h4').textContent.toLowerCase();
                const username = item.querySelector('p').textContent.toLowerCase();
                
                if (name.includes(query) || username.includes(query)) {
                    item.style.display = 'flex';
                } else {
                    item.style.display = 'none';
                }
            });
        });
        
        // Conversation search
        searchInput.addEventListener('input', function() {
            const query = this.value.toLowerCase();
            
            const conversationItems = document.querySelectorAll('.conversation-item');
            conversationItems.forEach(item => {
                const name = item.querySelector('.conversation-name').textContent.toLowerCase();
                const preview = item.querySelector('.conversation-preview').textContent.toLowerCase();
                
                if (name.includes(query) || preview.includes(query)) {
                    item.style.display = 'flex';
                } else {
                    item.style.display = 'none';
                }
            });
        });
        
        // Window resize
        window.addEventListener('resize', function() {
            if (window.innerWidth > 768) {
                document.getElementById('conversations-panel').style.display = 'flex';
                
                if (currentConversation) {
                    document.getElementById('messages-panel').classList.add('active');
                } else {
                    document.getElementById('messages-panel').classList.remove('active');
                }
            }
        });
    }

    // Helper functions
    function groupMessagesByDate(messages) {
        const grouped = {};
        
        messages.forEach(message => {
            const date = new Date(message.createdAt).toDateString();
            
            if (!grouped[date]) {
                grouped[date] = [];
            }
            
            grouped[date].push(message);
        });
        
        return grouped;
    }

    function formatTimeAgo(date) {
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);
        
        if (diffInSeconds < 60) {
            return 'Just now';
        }
        
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) {
            return `${diffInMinutes}m`;
        }
        
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) {
            return `${diffInHours}h`;
        }
        
        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 7) {
            return `${diffInDays}d`;
        }
        
        return date.toLocaleDateString();
    }

    function formatDate(date) {
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        
        if (date.toDateString() === today) {
            return 'Today';
        } else if (date.toDateString() === yesterday) {
            return 'Yesterday';
        } else {
            return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
        }
    }

    function formatTime(date) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
});