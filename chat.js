const BASE_URL = "https://blog-management-system-blooms-2.onrender.com";

// Security
function checkTokenLive() {
    const t = localStorage.getItem("token");
    if (!t) { window.location.replace("login.html"); return false; }
    return t; 
}

// Logout Logic
document.getElementById("logout-btn").addEventListener("click", function() { 
    localStorage.clear(); window.location.replace("login.html"); 
});

// Global Variables
let myUserId = localStorage.getItem("userId") || "";
let targetUserId = ""; 
let allUsersList = []; 
let stompClient = null; 

// ============================================================================
// 1. PAGE LOAD AUR USERS FETCH KARNA
// ============================================================================
async function initChat() {
    if(!checkTokenLive()) return;

    localStorage.removeItem('blooms_unread_counts');
    if(typeof refreshNotificationDot === "function") refreshNotificationDot();
    
    // 🚨 THE FIX: Seedha backend se apni real photo aur naam mangwa rahe hain!
    try {
        const token = checkTokenLive();
        const meRes = await fetch(BASE_URL + "/api/User/me", { headers: { "Authorization": "Bearer " + token }});
        const meData = await meRes.json();
        
        if(meData.success) {
            const u = meData.data;
            document.getElementById("my-chat-username").innerText = u.name || u.userName || "Me";
            
            if(u.profileUrl && u.profileUrl !== "null" && u.profileUrl !== "") {
                document.getElementById("my-chat-profile-pic").src = u.profileUrl;
            } else {
                document.getElementById("my-chat-profile-pic").src = `https://ui-avatars.com/api/?name=${u.userName || 'Me'}&background=0a66c2&color=fff`;
            }
        }
    } catch(e) { 
        console.log("Failed to load my own pic", e); 
        // Fallback agar backend time le
        document.getElementById("my-chat-profile-pic").src = `https://ui-avatars.com/api/?name=${localStorage.getItem("userName") || 'Me'}&background=0a66c2&color=fff`;
    }

    await loadAllUsers();
    connectWebSocket(); 
}
async function loadAllUsers() {
    try {
        const token = checkTokenLive();
        const res = await fetch(`${BASE_URL}/api/User/all?page=0&size=100`, { headers: { "Authorization": "Bearer " + token }});
        const data = await res.json();
        
        if (data.success && data.data) {
            allUsersList = data.data.filter(u => u.userId !== myUserId);
            renderUsersList(allUsersList);
        } else {
            document.getElementById("users-list-container").innerHTML = "<p style='text-align:center; padding:20px; color:#888;'>No users found.</p>";
        }
    } catch(e) {
        document.getElementById("users-list-container").innerHTML = "<p style='text-align:center; padding:20px; color:red;'>Failed to connect to server!</p>";
    }
}

// 🚨 API Search for users
let searchTimeout;
document.getElementById("search-user-input").addEventListener("input", function(e) {
    clearTimeout(searchTimeout);
    let query = e.target.value.trim();
    if(query === "") { renderUsersList(allUsersList); return; }

    searchTimeout = setTimeout(async () => {
        try {
            const token = checkTokenLive();
            document.getElementById("users-list-container").innerHTML = "<p style='text-align:center; padding:20px;'><i class='fa-solid fa-spinner fa-spin'></i> Searching...</p>";
            const res = await fetch(`${BASE_URL}/api/User/search?name=${encodeURIComponent(query)}&page=0&size=50`, { headers: { "Authorization": "Bearer " + token } });
            const data = await res.json();
            if (data.success && data.data.length > 0) {
                let filtered = data.data.filter(u => u.userId !== myUserId);
                renderUsersList(filtered);
            } else {
                document.getElementById("users-list-container").innerHTML = `<p style='text-align:center; padding:20px; color:#888;'>No user found with "${query}"</p>`;
            }
        } catch (error) { document.getElementById("users-list-container").innerHTML = "<p style='text-align:center; color:red;'>Search failed.</p>"; }
    }, 500);
});

function renderUsersList(users) {
    let html = "";
    users.forEach(user => {
        let pic = user.profileUrl || `https://ui-avatars.com/api/?name=${user.userName}&background=random`;
        let name = user.name || user.userName;
        html += `
            <div class="user-item" id="user-li-${user.userId}" onclick="openChatWindow('${user.userId}', '${name}', '${pic}')">
                <img src="${pic}" alt="DP" loading="lazy" decoding="async">
                <div class="user-item-details">
                    <h4 class="user-item-name">${name}</h4>
                    <p class="user-item-last-msg">Tap to chat</p>
                </div>
            </div>
        `;
    });
    document.getElementById("users-list-container").innerHTML = html || "<p style='text-align:center; padding:20px; color:#888;'>No users available.</p>";
}

// ============================================================================
// CHAT WINDOW & PROFILE REDIRECT
// ============================================================================
function openChatWindow(userId, name, pic) {
    targetUserId = userId;
    document.getElementById("empty-chat-state").style.display = "none";

    const counts = JSON.parse(localStorage.getItem('blooms_unread_counts') || '{}');
    delete counts[userId];
    localStorage.setItem('blooms_unread_counts', JSON.stringify(counts));
    if(typeof refreshNotificationDot === "function") refreshNotificationDot();
    document.getElementById("active-chat-window").style.display = "flex";
    document.getElementById("target-user-name").innerText = name;
    document.getElementById("target-user-pic").src = pic;
    document.getElementById("main-chat-container").classList.add("chat-active");

    // 🚨 FIX: Redirect to viewprofile.html when clicking on Header Info
    document.getElementById("chat-header-info").onclick = function(e) {
        // Agar mobile back button dabaya hai toh redirect mat karo
        if(e.target.classList.contains("back-btn-mobile")) return;
        window.location.href = `viewprofile.html?userId=${userId}`;
    };

    document.querySelectorAll(".user-item").forEach(el => el.classList.remove("active"));
    const activeItem = document.getElementById(`user-li-${userId}`);
    if(activeItem) activeItem.classList.add("active");

    document.getElementById("in-chat-search").value = "";
    document.getElementById("in-chat-search").style.display = "none";
    document.getElementById("emoji-picker").style.display = "none";

    loadPreviousMessages(userId);
}

function closeChatMobile(event) { 
    event.stopPropagation(); // Profile pe redirect hone se rokne k liye
    document.getElementById("main-chat-container").classList.remove("chat-active"); 
    targetUserId = ""; 
}

// In-Chat Search
function toggleInChatSearch() {
    let searchBox = document.getElementById("in-chat-search");
    if (searchBox.style.display === "none" || searchBox.style.display === "") {
        searchBox.style.display = "block"; searchBox.focus();
    } else {
        searchBox.style.display = "none"; searchBox.value = "";
        document.querySelectorAll(".msg-box").forEach(msg => msg.style.display = "block");
        document.querySelectorAll(".date-separator").forEach(ds => ds.style.display = "block");
    }
}

document.getElementById("in-chat-search").addEventListener("input", function(e) {
    let query = e.target.value.toLowerCase();
    document.querySelectorAll(".msg-box").forEach(msg => {
        if(msg.innerText.toLowerCase().includes(query)) msg.style.display = "block";
        else msg.style.display = "none";
    });
    document.querySelectorAll(".date-separator").forEach(ds => ds.style.display = query === "" ? "block" : "none");
});

// ============================================================================
// EMOJI & PHOTO UPLOAD
// ============================================================================
function toggleEmojiPicker() {
    let picker = document.getElementById("emoji-picker");
    picker.style.display = (picker.style.display === "none" || picker.style.display === "") ? "flex" : "none";
}

function addEmoji(emoji) {
    let input = document.getElementById("message-input");
    input.value += emoji;
    input.focus();
}

function sendImageMessage(inputElement) {
    const file = inputElement.files[0];
    if (!file) return;
    if (file.size > 1024 * 1024) { alert("Bhai, photo 1MB se chhoti honi chahiye!"); inputElement.value = ""; return; }

    const reader = new FileReader();
    reader.onloadend = function() {
        const base64Img = reader.result;
        // 🚨 NAYA: Class add ki jisse photo choti ho jayegi
        const imgHtml = `<img src="${base64Img}" class="chat-shared-img" alt="Shared Image">`;
        sendActualMessageToBackend(imgHtml);
        inputElement.value = ""; 
        document.getElementById("emoji-picker").style.display = "none";
    }
    reader.readAsDataURL(file);
}

// Date Formatter
function formatChatDate(dateString) {
    let safeDateString = dateString;
    if(!safeDateString.endsWith("Z")) safeDateString += "Z";
    
    const msgDate = new Date(safeDateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (msgDate.toDateString() === today.toDateString()) return "Today";
    if (msgDate.toDateString() === yesterday.toDateString()) return "Yesterday";
    return msgDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ============================================================================
// SEND & RECEIVE MESSAGES 
// ============================================================================
async function loadPreviousMessages(targetId) {
    const chatContainer = document.getElementById("messages-container");
    chatContainer.innerHTML = "<p style='text-align:center; color:#888; font-size:12px; margin-top:20px; margin-bottom:20px;'><i class='fa-solid fa-lock'></i> Messages are end-to-end encrypted.</p>";

    try {
        const token = checkTokenLive();
        const res = await fetch(`${BASE_URL}/api/chat/history?targetUserId=${targetId}`, { headers: { "Authorization": "Bearer " + token } });
        const data = await res.json();

        if (data.success && data.data && data.data.length > 0) {
            let lastDateLabel = "";

            data.data.forEach(msg => {
                let safeTimestamp = msg.timestamp;
                if(!safeTimestamp.endsWith("Z")) safeTimestamp += "Z";
                
                let msgDateObj = new Date(safeTimestamp);
                let currentDateLabel = formatChatDate(msg.timestamp);
                let timeStr = msgDateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                
                if (currentDateLabel !== lastDateLabel) {
                    let dateDiv = document.createElement("div");
                    dateDiv.className = "date-separator";
                    dateDiv.innerHTML = `<span>${currentDateLabel}</span>`;
                    chatContainer.appendChild(dateDiv);
                    lastDateLabel = currentDateLabel;
                }

                let isSentByMe = (msg.senderId === myUserId);
                let type = isSentByMe ? 'sent' : 'received';
                let tickStatus = isSentByMe ? "double-blue" : "none";
                
                appendMessageToUI(msg.content, type, timeStr, tickStatus);
            });
        }
    } catch(e) { console.error("Failed to load history", e); }
}

document.getElementById("message-input").addEventListener("keypress", function(e) {
    if (e.key === "Enter") sendTextMessage();
});

function sendTextMessage() {
    const input = document.getElementById("message-input");
    const text = input.value.trim();
    if (text === "" || !targetUserId) return;
    
    input.value = "";
    document.getElementById("emoji-picker").style.display = "none";
    sendActualMessageToBackend(text);
}

async function sendActualMessageToBackend(content) {
    const now = new Date();
    let timeStr = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    appendMessageToUI(content, "sent", timeStr, "single-grey");

    try {
        const token = checkTokenLive();
        await fetch(`${BASE_URL}/api/chat/send`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
            body: JSON.stringify({ targetUserId: targetUserId, content: content })
        });
    } catch (e) { console.error("Failed to send message", e); }
}

function appendMessageToUI(content, type, time, tickStatus = "none") {
    const container = document.getElementById("messages-container");
    const msgDiv = document.createElement("div");
    msgDiv.className = `msg-box msg-${type}`; 
    
    let tickHtml = "";
    if (type === "sent") {
        if (tickStatus === "single-grey") tickHtml = `<span class="msg-tick tick-grey"><i class="fa-solid fa-check"></i></span>`;
        else if (tickStatus === "double-blue") tickHtml = `<span class="msg-tick tick-blue"><i class="fa-solid fa-check-double"></i></span>`;
    }

    msgDiv.innerHTML = `
        ${content}
        <div style="float: right; margin-top: 5px; margin-left: 15px; display:flex; align-items:center;">
            <span class="msg-time" style="float:none; margin:0;">${time}</span>
            ${tickHtml}
        </div>
    `;
    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight; 
}

// ============================================================================
// WEBSOCKET CONNECTION
// ============================================================================
function connectWebSocket() {
    let socket = new SockJS(`${BASE_URL}/ws`); 
    stompClient = Stomp.over(socket);
    stompClient.debug = null; 
    const token = checkTokenLive();

    stompClient.connect({ "Authorization": "Bearer " + token }, function (frame) {
        console.log('✅ Connected to WebSockets!');
        
        stompClient.subscribe(`/topic/messages/${myUserId}`, function (message) {
            const receivedMsg = JSON.parse(message.body);
            
            if (receivedMsg.senderId === targetUserId) {
                let safeTimestamp = receivedMsg.timestamp;
                if(!safeTimestamp.endsWith("Z")) safeTimestamp += "Z";
                
                const msgDate = new Date(safeTimestamp);
                let timeStr = msgDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                appendMessageToUI(receivedMsg.content, "received", timeStr, "none");
            } else {
                let userLi = document.getElementById(`user-li-${receivedMsg.senderId}`);
                if(userLi) {
                    userLi.querySelector('.user-item-last-msg').innerText = "🟢 New message!";
                    userLi.querySelector('.user-item-last-msg').style.color = "#25d366"; 
                    userLi.querySelector('.user-item-last-msg').style.fontWeight = "bold";
                }
                // Mark unread in localStorage
                const counts = JSON.parse(localStorage.getItem('blooms_unread_counts') || '{}');
                counts[receivedMsg.senderId] = (counts[receivedMsg.senderId] || 0) + 1;
                localStorage.setItem('blooms_unread_counts', JSON.stringify(counts));
                if(typeof refreshNotificationDot === "function") refreshNotificationDot();
            }
        });
    }, function(error) {
        console.error("❌ STOMP error: ", error);
        setTimeout(connectWebSocket, 5000); 
    });
}

initChat();

// ============================================================================
// 📱 RESPONSIVE OPTIMIZATIONS
// ============================================================================

// Hamburger Menu Toggle for Mobile
const mobileMenuBtn = document.getElementById("mobile-menu-btn");
const navMenu = document.getElementById("nav-menu");

if (mobileMenuBtn && navMenu) {
    mobileMenuBtn.addEventListener("click", function() {
        navMenu.classList.toggle("active");
    });
}

// ===== HAMBURGER FIX FOR THIS PAGE =====
(function() {
  function initHamburger() {
    const hamburger = document.querySelector(
      '.hamburger-menu, .hamburger-btn, ' +
      'button[class*="hamburger"]'
    );
    const navMenu = document.querySelector(
      '.nav-right, .nav-links, .nav-menu, ' +
      'nav ul, .navbar-menu'
    );
    if (!hamburger || !navMenu) return;

    // Remove any old listeners by cloning
    const newHamburger = hamburger.cloneNode(true);
    hamburger.parentNode.replaceChild(
      newHamburger, hamburger
    );

    newHamburger.addEventListener('click', 
    function(e) {
      e.stopPropagation();
      navMenu.classList.toggle('active');
      
      // Overlay
      let overlay = document.getElementById(
        'nav-overlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'nav-overlay';
        overlay.style.cssText = 
          'position:fixed;top:0;left:0;' +
          'width:100%;height:100%;' +
          'background:rgba(0,0,0,0.3);' +
          'z-index:999;display:none;';
        document.body.appendChild(overlay);
        overlay.addEventListener('click', 
        function() {
          navMenu.classList.remove('active');
          overlay.style.display = 'none';
        });
      }
      
      if (navMenu.classList.contains('active')) {
        overlay.style.display = 'block';
      } else {
        overlay.style.display = 'none';
      }
    });

    document.addEventListener('keydown', 
    function(e) {
      if (e.key === 'Escape') {
        navMenu.classList.remove('active');
        const ov = document.getElementById(
          'nav-overlay');
        if (ov) ov.style.display = 'none';
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded', initHamburger);
  } else {
    initHamburger();
  }
})();
// ===== END HAMBURGER FIX =====

// ===== CHAT DOT NOTIFICATION =====
function refreshNotificationDot() {
  const counts = JSON.parse(
    localStorage.getItem('blooms_unread_counts') 
    || '{}'
  );
  const hasUnread = Object.values(counts)
    .some(v => v > 0);

  // Desktop: Chat nav icon
  const chatNavLink = document.querySelector(
    'a[href="chat.html"], ' +
    '.nav-item[data-page="chat"], ' +
    'a[href*="chat"]:not([href*="ai"])'
  );
  if (chatNavLink) {
    chatNavLink.style.position = 'relative';
    let dot = chatNavLink.querySelector(
      '.chat-notification-dot');
    if (hasUnread && !dot) {
      dot = document.createElement('span');
      dot.className = 'chat-notification-dot';
      chatNavLink.appendChild(dot);
    } else if (!hasUnread && dot) {
      dot.remove();
    }
  }

  // Mobile: Hamburger button dot
  const hamburger = document.querySelector(
    '.hamburger-menu, .hamburger-btn, ' +
    'button[class*="hamburger"]'
  );
  if (hamburger) {
    hamburger.style.position = 'relative';
    let dot = hamburger.querySelector(
      '.chat-notification-dot');
    if (hasUnread && !dot) {
      dot = document.createElement('span');
      dot.className = 'chat-notification-dot';
      hamburger.appendChild(dot);
    } else if (!hasUnread && dot) {
      dot.remove();
    }
  }
}

refreshNotificationDot();
setInterval(refreshNotificationDot, 4000);
// ===== END CHAT DOT NOTIFICATION =====