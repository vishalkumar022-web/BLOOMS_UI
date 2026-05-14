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