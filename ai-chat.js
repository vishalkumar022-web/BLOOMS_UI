const BASE_URL = "https://blog-management-system-blooms-2.onrender.com";

// Security Check
function checkTokenLive() {
    const t = localStorage.getItem("token");
    if (!t) { window.location.replace("login.html"); return false; }
    return t; 
}

// Logout 
document.getElementById("logout-btn").addEventListener("click", function() { 
    localStorage.clear(); window.location.replace("login.html"); 
});

// Initial Setup
if (!checkTokenLive()) {
    document.body.style.display = "none";
}

const chatMessagesArea = document.getElementById("chat-messages");
const userInputField = document.getElementById("ai-user-input");
const sendBtn = document.getElementById("ai-send-btn");

// Enter key press listener
userInputField.addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        sendAiMessage();
    }
});

function appendMessage(text, sender) {
    const rowDiv = document.createElement("div");
    rowDiv.className = `message-row ${sender}`;
    
    const bubbleDiv = document.createElement("div");
    bubbleDiv.className = `message-bubble ${sender}`;
    
    // Convert basic markdown to HTML for better readability
    let formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formattedText = formattedText.replace(/\n/g, '<br>');

    bubbleDiv.innerHTML = formattedText;
    
    rowDiv.appendChild(bubbleDiv);
    chatMessagesArea.appendChild(rowDiv);
    
    // Auto-scroll to bottom
    chatMessagesArea.scrollTop = chatMessagesArea.scrollHeight;
}

function showLoadingIndicator() {
    const rowDiv = document.createElement("div");
    rowDiv.className = `message-row bot`;
    rowDiv.id = "ai-loading-indicator";
    
    const bubbleDiv = document.createElement("div");
    bubbleDiv.className = `message-bubble bot`;
    bubbleDiv.innerHTML = `<span class="typing-indicator"><i class="fa-solid fa-circle-notch fa-spin"></i> Scanning live database...</span>`;
    
    rowDiv.appendChild(bubbleDiv);
    chatMessagesArea.appendChild(rowDiv);
    chatMessagesArea.scrollTop = chatMessagesArea.scrollHeight;
}

function hideLoadingIndicator() {
    const loader = document.getElementById("ai-loading-indicator");
    if (loader) {
        loader.remove();
    }
}

async function sendAiMessage() {
    const liveToken = checkTokenLive(); 
    if(!liveToken) return;

    const queryText = userInputField.value.trim();
    if (queryText === "") return;

    // 1. Show user message
    appendMessage(queryText, "user");
    userInputField.value = "";
    userInputField.disabled = true;
    sendBtn.disabled = true;

    // 2. Show loading spinner
    showLoadingIndicator();

    try {
        // 3. Make request to RAG Backend API
        const response = await fetch(`${BASE_URL}/api/rag/chat`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + liveToken
            },
            body: JSON.stringify({ query: queryText })
        });

        const data = await response.json();
        
        // 4. Hide loading and show response
        hideLoadingIndicator();
        
        if (data.success === true) {
            // API returns Map<String, String> mapped to "answer"
            appendMessage(data.data.answer, "bot");
        } else {
            appendMessage("⚠️ Error: " + data.message, "bot");
        }
    } catch (error) {
        hideLoadingIndicator();
        appendMessage("❌ Network Error: Backend is down or unreachable.", "bot");
        console.error(error);
    } finally {
        userInputField.disabled = false;
        sendBtn.disabled = false;
        userInputField.focus();
    }
}

// ============================================================================
// 📱 9. RESPONSIVE & PERFORMANCE OPTIMIZATIONS
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