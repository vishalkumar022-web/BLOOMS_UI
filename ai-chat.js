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

// ===== NOTIFICATION DOT SYSTEM =====
function updateNotificationDot() {
  const counts = JSON.parse(
    localStorage.getItem('blooms_unread') || '{}'
  );
  const hasUnread = Object.values(counts)
    .some(function(v) { return v > 0; });

  // ---- Desktop: Chat nav icon ----
  // Find chat link in navbar (not ai-chat link)
  const allNavLinks = document.querySelectorAll(
    'nav a, .navbar a, header a'
  );
  let chatLink = null;
  allNavLinks.forEach(function(link) {
    const href = link.getAttribute('href') || '';
    if (href.includes('chat') && 
        !href.includes('ai-chat')) {
      chatLink = link;
    }
  });

  if (chatLink) {
    chatLink.style.position = 'relative';
    chatLink.style.display = 'inline-flex';
    let dot = chatLink.querySelector(
      '.bloom-notif-dot'
    );
    if (hasUnread) {
      if (!dot) {
        dot = document.createElement('span');
        dot.className = 'bloom-notif-dot';
        chatLink.appendChild(dot);
      }
    } else {
      if (dot) dot.remove();
    }
  }

  // ---- Mobile: Hamburger icon ----
  const hamburger = document.querySelector(
    '.hamburger-menu, .hamburger-btn, ' +
    'button[class*="hamburger"]'
  );
  if (hamburger) {
    hamburger.style.position = 'relative';
    let dot = hamburger.querySelector(
      '.bloom-notif-dot'
    );
    if (hasUnread) {
      if (!dot) {
        dot = document.createElement('span');
        dot.className = 'bloom-notif-dot';
        hamburger.appendChild(dot);
      }
    } else {
      if (dot) dot.remove();
    }
  }
}

// Run on load and every 3 seconds
updateNotificationDot();
setInterval(updateNotificationDot, 3000);

// Also update when localStorage changes
// (works across browser tabs)
window.addEventListener('storage', function(e) {
  if (e.key === 'blooms_unread') {
    updateNotificationDot();
  }
});
// ===== END NOTIFICATION DOT SYSTEM =====

// ===== HAMBURGER FINAL FIX (ai-chat page) =====
window.addEventListener('load', function() {
  setTimeout(function() {
    const hamburger = document.querySelector(
      '.hamburger-menu, .hamburger-btn, ' +
      'button[class*="hamburger"]'
    );
    const navMenu = document.querySelector(
      '.nav-right, .nav-links, ' +
      '.nav-menu, nav ul'
    );

    if (!hamburger || !navMenu) {
      console.warn('Hamburger: elements not found');
      return;
    }

    // Remove ALL old listeners safely
    const freshBtn = hamburger.cloneNode(true);
    hamburger.parentNode.replaceChild(
      freshBtn, hamburger
    );

    freshBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      navMenu.classList.toggle('active');

      let overlay = document.getElementById(
        'bloom-nav-overlay'
      );
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'bloom-nav-overlay';
        overlay.style.cssText =
          'position:fixed;top:0;left:0;width:100%;' +
          'height:100%;background:rgba(0,0,0,0.3);' +
          'z-index:99997;display:none;';
        document.body.appendChild(overlay);
        overlay.addEventListener('click', function(){
          navMenu.classList.remove('active');
          overlay.style.display = 'none';
        });
      }

      overlay.style.display =
        navMenu.classList.contains('active')
        ? 'block' : 'none';
    });

    document.addEventListener('keydown', function(e){
      if (e.key === 'Escape') {
        navMenu.classList.remove('active');
        const ov = document.getElementById(
          'bloom-nav-overlay'
        );
        if (ov) ov.style.display = 'none';
      }
    });

    console.log('Hamburger initialized on ai-chat page');
  }, 800);
});
// ===== END HAMBURGER FINAL FIX =====