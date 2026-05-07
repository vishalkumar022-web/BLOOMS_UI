// ============================================================================
// 🌐 1. SETUP AUR SECURITY CHECK
// ============================================================================
const BASE_URL = "https://blog-management-system-blooms-2.onrender.com";

function checkTokenLive() {
    const liveToken = localStorage.getItem("token");
    if (!liveToken) {
        window.location.replace("login.html");
        return false; 
    }
    return liveToken; 
}

// Global Variables
let myUserId = ""; 
let targetUserId = ""; // Jisko hum dekh rahe hain
let iAmFollowingThisUser = false; // Status check karne ke liye

// ============================================================================
// 🕵️‍♂️ 2. GET TARGET ID FROM URL (Jasoos)
// ============================================================================
// JS ka URLSearchParams address bar (link) ko padhta hai
const urlParams = new URLSearchParams(window.location.search);
// Wo url me se '?userId=...' ke aage ka hissa pakad leta hai
targetUserId = urlParams.get('userId');

// Agar kisine direct page khol liya bina ID ke, toh dashboard bhejo
if (!targetUserId) {
    alert("Bhai, kiska profile dekhna hai? ID hi missing hai!");
    window.location.href = "dashboard.html";
}

// ============================================================================
// 👤 3. MERI KHUD KI ID MANGWANA (Taaki Follow status check kar saku)
// ============================================================================
async function loadMyOwnId() {
    const liveToken = checkTokenLive(); if(!liveToken) return;
    try {
        const response = await fetch(BASE_URL + "/api/User/me", { method: "GET", headers: { "Authorization": "Bearer " + liveToken }});
        const data = await response.json();
        if (data.success) {
            myUserId = data.data.userId;
            
            // Bacchon wala check: Agar maine galti se khud ke upar click kar diya, toh apni asli profile par bhej do!
            if (myUserId === targetUserId) {
                window.location.href = "profile.html";
            }
        }
    } catch(e) { console.error(e); }
}

// ============================================================================
// 🧑‍💻 4. TARGET USER KA DATA MANGWANA
// ============================================================================
async function loadTargetUserProfile() {
    const liveToken = checkTokenLive(); if(!liveToken) return;
    try {
        // 🚨 NAYA API HIT (Jo Step 1 me Java me banwaya tha)
        const response = await fetch(`${BASE_URL}/api/User/otherUser?userId=${targetUserId}`, {
            method: "GET", headers: { "Authorization": "Bearer " + liveToken }
        });
        const data = await response.json();

        if (data.success) {
            const user = data.data;
            
            // HTML dabbo me data bharna
            document.getElementById("other-username").innerText = user.userName;
            document.getElementById("other-role").innerText = user.role ? user.role.toUpperCase() : "USER";
            document.getElementById("other-fullname").innerText = user.name || "No Name Provided";
            document.getElementById("other-about-me").innerText = user.aboutMe ? user.aboutMe : "I'm using Blooms! 🌿";
            document.getElementById("other-profile-pic").src = user.profileUrl || `https://ui-avatars.com/api/?name=${user.userName}&background=random&size=150`;

            document.getElementById("other-followers").innerText = user.followerCount || 0;
            document.getElementById("other-following").innerText = user.followingCount || 0;

            // Tabs me user ka content daalna
            renderTabContent("content-blogs", user.myCreatedBlogs, "fa-newspaper", "No Blogs Posted Yet");
            renderTabContent("content-categories", user.myCreatedCategories, "fa-layer-group", "No Categories Created");
            renderTabContent("content-subcategories", user.myCreatedSubCategories, "fa-tags", "No Subcategories Created");
        }
    } catch(e) { console.error("Profile load fail", e); }
}

// ============================================================================
// 🤝 5. FOLLOW BUTTON STATUS CHECK
// ============================================================================
async function checkFollowStatus() {
    const liveToken = checkTokenLive(); if(!liveToken) return;
    try {
        // Meri following list mangwao
        const response = await fetch(`${BASE_URL}/api/connection/following?userId=${myUserId}`, {
            method: "GET", headers: { "Authorization": "Bearer " + liveToken }
        });
        const data = await response.json();
        
        if (data.success) {
            // Check karo ki kya 'data.data' wali list me targetUserId exist karta hai?
            const followingList = data.data.map(person => person.userId);
            iAmFollowingThisUser = followingList.includes(targetUserId);
            
            // Button ki designing update karo status ke hisaab se
            const btn = document.getElementById("dynamic-follow-btn");
            btn.style.display = "block"; // Button ab dikhega
            
            if (iAmFollowingThisUser) {
                btn.innerText = "Unfollow";
                btn.style.backgroundColor = "transparent";
                btn.style.border = "1px solid #666";
                btn.style.color = "#666";
            } else {
                btn.innerText = "+ Follow";
                btn.style.backgroundColor = "#0a66c2";
                btn.style.border = "none";
                btn.style.color = "white";
            }
        }
    } catch (e) { console.error(e); }
}

// ============================================================================
// ⚡ 6. FOLLOW / UNFOLLOW ACTION
// ============================================================================
document.getElementById("dynamic-follow-btn").addEventListener("click", async function() {
    const liveToken = checkTokenLive(); if(!liveToken) return;
    
    // Agar pehle se follow kar raha hu, toh Unfollow wali API chalao
    if (iAmFollowingThisUser) {
        try {
            await fetch(`${BASE_URL}/api/connection/unfollow?targetUserId=${targetUserId}`, {
                method: "POST", headers: { "Authorization": "Bearer " + liveToken }
            });
            alert("Unfollowed successfully! ❌");
        } catch(e){}
    } 
    // Nahi toh Follow wali API chalao
    else {
        try {
            await fetch(`${BASE_URL}/api/connection/follow?targetUserId=${targetUserId}`, {
                method: "POST", headers: { "Authorization": "Bearer " + liveToken }
            });
            alert("Followed successfully! ✅");
        } catch(e){}
    }
    
    // Page ko turant reload mar do taaki buttons aur followers count naya dikhe!
    window.location.reload();
});

// ============================================================================
// 🎨 7. TABS LOGIC (Same as profile)
// ============================================================================
function switchTab(tabName) {
    document.querySelectorAll('.tab-item').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.content-grid').forEach(content => content.classList.remove('active'));
    document.getElementById(`tab-${tabName}`).classList.add('active');
    document.getElementById(`content-${tabName}`).classList.add('active');
}

function renderTabContent(containerId, listData, iconClass, emptyMessage) {
    const container = document.getElementById(containerId);
    let html = "";
    if (listData && listData.length > 0) {
        for (let itemTitle of listData) {
            html += `<div class="mini-card" style="background: white; border: 1px solid #dbdbdb; border-radius: 8px; padding: 20px; text-align: center;"><i class="fa-solid ${iconClass}" style="font-size: 30px; color: #0a66c2; margin-bottom: 10px;"></i><h3 style="font-size: 16px; color: #262626;">${itemTitle}</h3></div>`;
        }
    } else { html = `<p style="grid-column: 1 / -1; text-align:center; color:#888; padding: 40px;">${emptyMessage}</p>`; }
    container.innerHTML = html;
}

// ============================================================================
// 🎬 8. MASTER RUN (Sequence me functions chalana)
// ============================================================================
async function startApp() {
    await loadMyOwnId(); // Pehle apni ID laao
    await loadTargetUserProfile(); // Fir us bande ki profile laao
    await checkFollowStatus(); // Uske baad button ko set karo
}

if(checkTokenLive()) startApp();