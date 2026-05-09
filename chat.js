const BASE_URL = "https://blog-management-system-blooms-2.onrender.com";

// Security
function checkTokenLive() {
    const t = localStorage.getItem("token");
    if (!t) { window.location.replace("login.html"); return false; }
    return t; 
}

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
    
    const myPic = localStorage.getItem("profileUrl");
    if(myPic && myPic !== "null") document.getElementById("my-chat-profile-pic").src = myPic;
    else document.getElementById("my-chat-profile-pic").src = `https://ui-avatars.com/api/?name=${localStorage.getItem("userName") || 'Me'}&background=0a66c2&color=fff`;

    await loadAllUsers();
    connectWebSocket(); 
}

// Default Users (Recent/All)
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

// 🚨 NAYA: Left Search Bar (API INTEGRATION) 🚨
let searchTimeout;
document.getElementById("search-user-input").addEventListener("input", function(e) {
    clearTimeout(searchTimeout);
    let query = e.target.value.trim();
    
    // Agar search khali hai toh wapas purani list dikhao
    if(query === "") { renderUsersList(allUsersList); return; }

    // 500ms ka wait (Debounce) taaki har letter type hone par turant API hit na ho
    searchTimeout = setTimeout(async () => {
        try {
            const token = checkTokenLive();
            document.getElementById("users-list-container").innerHTML = "<p style='text-align:center; padding:20px;'><i class='fa-solid fa-spinner fa-spin'></i> Searching...</p>";
            
            // Backend API hit kar rahe hain user search ke liye
            const res = await fetch(`${BASE_URL}/api/User/search?name=${encodeURIComponent(query)}&page=0&size=50`, {
                headers: { "Authorization": "Bearer " + token }
            });
            const data = await res.json();

            if (data.success && data.data.length > 0) {
                let filtered = data.data.filter(u => u.userId !== myUserId);
                renderUsersList(filtered);
            } else {
                document.getElementById("users-list-container").innerHTML = `<p style='text-align:center; padding:20px; color:#888;'>No user found with "${query}"</p>`;
            }
        } catch (error) {
            document.getElementById("users-list-container").innerHTML = "<p style='text-align:center; color:red;'>Search failed.</p>";
        }
    }, 500);
});

function renderUsersList(users) {
    let html = "";
    users.forEach(user => {
        let pic = user.profileUrl || `https://ui-avatars.com/api/?name=${user.userName}&background=random`;
        let name = user.name || user.userName;
        html += `
            <div class="user-item" id="user-li-${user.userId}" onclick="openChatWindow('${user.userId}', '${name}', '${pic}')">
                <img src="${pic}" alt="DP">
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
// 2. CHAT WINDOW & RIGHT SEARCH BAR
// ============================================================================
function openChatWindow(userId, name, pic) {
    targetUserId = userId;
    document.getElementById("empty-chat-state").style.display = "none";
    document.getElementById("active-chat-window").style.display = "flex";
    document.getElementById("target-user-name").innerText = name;
    document.getElementById("target-user-pic").src = pic;
    document.getElementById("main-chat-container").classList.add("chat-active");

    document.querySelectorAll(".user-item").forEach(el => el.classList.remove("active"));
    const activeItem = document.getElementById(`user-li-${userId}`);
    if(activeItem) activeItem.classList.add("active");

    // Right search bar band aur khali kar do
    document.getElementById("in-chat-search").value = "";
    document.getElementById("in-chat-search").style.display = "none";

    loadPreviousMessages(userId);
}

function closeChatMobile() { document.getElementById("main-chat-container").classList.remove("chat-active"); targetUserId = ""; }

// 🚨 NAYA: Right In-Chat Search Logic
function toggleInChatSearch() {
    let searchBox = document.getElementById("in-chat-search");
    if (searchBox.style.display === "none" || searchBox.style.display === "") {
        searchBox.style.display = "block";
        searchBox.focus();
    } else {
        searchBox.style.display = "none";
        searchBox.value = "";
        // Reset filter
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
    // Hide date separators during search to avoid clutter
    document.querySelectorAll(".date-separator").forEach(ds => ds.style.display = query === "" ? "block" : "none");
});

// ============================================================================
// 3. DATE FORMATTER HELPER (WhatsApp Style)
// ============================================================================
function formatChatDate(dateString) {
    const msgDate = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (msgDate.toDateString() === today.toDateString()) return "Today";
    if (msgDate.toDateString() === yesterday.toDateString()) return "Yesterday";
    
    // Warna "12 May 2026"
    return msgDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ============================================================================
// 4. SEND & RECEIVE MESSAGES 
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
                let msgDateObj = new Date(msg.timestamp);
                let currentDateLabel = formatChatDate(msg.timestamp);
                let timeStr = msgDateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                
                // 🚨 DATE SEPARATOR LOGIC
                if (currentDateLabel !== lastDateLabel) {
                    let dateDiv = document.createElement("div");
                    dateDiv.className = "date-separator";
                    dateDiv.innerHTML = `<span>${currentDateLabel}</span>`;
                    chatContainer.appendChild(dateDiv);
                    lastDateLabel = currentDateLabel;
                }

                let isSentByMe = (msg.senderId === myUserId);
                let type = isSentByMe ? 'sent' : 'received';
                
                // 🚨 TICKS LOGIC (History wale messages double blue tick)
                let tickStatus = isSentByMe ? "double-blue" : "none";
                
                appendMessageToUI(msg.content, type, timeStr, tickStatus);
            });
        }
    } catch(e) { console.error("Failed to load history", e); }
}

document.getElementById("message-input").addEventListener("keypress", function(e) {
    if (e.key === "Enter") sendMessage();
});

async function sendMessage() {
    const input = document.getElementById("message-input");
    const text = input.value.trim();
    if (text === "" || !targetUserId) return;

    // Current time
    const now = new Date();
    let timeStr = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    // UI me turant chapna with SINGLE GREY TICK (Kyunki abhi just bheja hai)
    appendMessageToUI(text, "sent", timeStr, "single-grey");
    input.value = "";

    try {
        const token = checkTokenLive();
        await fetch(`${BASE_URL}/api/chat/send`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
            body: JSON.stringify({ targetUserId: targetUserId, content: text })
        });
    } catch (e) { console.error("Failed to send message", e); }
}

// Naya parameter "tickStatus" add kiya hai
function appendMessageToUI(text, type, time, tickStatus = "none") {
    const container = document.getElementById("messages-container");
    const msgDiv = document.createElement("div");
    msgDiv.className = `msg-box msg-${type}`; 
    
    let tickHtml = "";
    if (type === "sent") {
        if (tickStatus === "single-grey") tickHtml = `<span class="msg-tick tick-grey"><i class="fa-solid fa-check"></i></span>`;
        else if (tickStatus === "double-blue") tickHtml = `<span class="msg-tick tick-blue"><i class="fa-solid fa-check-double"></i></span>`;
    }

    msgDiv.innerHTML = `
        ${text}
        <div style="float: right; margin-top: 5px; margin-left: 15px; display:flex; align-items:center;">
            <span class="msg-time" style="float:none; margin:0;">${time}</span>
            ${tickHtml}
        </div>
    `;
    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight; 
}

// ============================================================================
// 5. WEBSOCKET CONNECTION
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
                // Jab doosre bande se naya message aaye
                const msgDate = new Date(receivedMsg.timestamp);
                let timeStr = msgDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                appendMessageToUI(receivedMsg.content, "received", timeStr, "none");
            } else {
                let userLi = document.getElementById(`user-li-${receivedMsg.senderId}`);
                if(userLi) {
                    userLi.querySelector('.user-item-last-msg').innerText = "🟢 New message!";
                    userLi.querySelector('.user-item-last-msg').style.color = "#25d366"; 
                    userLi.querySelector('.user-item-last-msg').style.fontWeight = "bold";
                }
            }
        });
    }, function(error) {
        console.error("❌ STOMP error: ", error);
        setTimeout(connectWebSocket, 5000); 
    });
}

initChat();