// ============================================================================
// 🌐 1. SETUP & SECURITY
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

let myUserId = ""; // Global variable to store my ID

// ============================================================================
// 👤 2. LOAD PROFILE DATA (The Main Engine)
// 🤔 Kyu banaya?: Page load hote hi backend se saari detail mangwane ke liye
// ============================================================================
async function loadProfilePage() {
    try {
        const liveToken = checkTokenLive(); if(!liveToken) return;

        // Backend ke User Controller ka "/me" API hit kiya
        const response = await fetch(BASE_URL + "/api/User/me", {
            method: "GET", headers: { "Authorization": "Bearer " + liveToken }
        });
        const data = await response.json();

        if (data.success === true) {
            const user = data.data;
            myUserId = user.userId;
            
            // 1. HEADER DATA BHARO
            document.getElementById("my-username").innerText = user.userName;
            document.getElementById("my-role").innerText = user.role.toUpperCase();
            document.getElementById("my-fullname").innerText = user.name || "No Name Provided";
            
            let aboutText = user.aboutMe ? user.aboutMe : "I'm using Blooms! 🌿";
            document.getElementById("my-about-me").innerText = aboutText;

            // Profile Photo
            if (user.profileUrl) {
                document.getElementById("my-profile-pic").src = user.profileUrl;
            } else {
                document.getElementById("my-profile-pic").src = `https://ui-avatars.com/api/?name=${user.name || 'User'}&background=0a66c2&color=fff&size=150`;
            }

            // Stats (Count)
            document.getElementById("count-followers").innerText = user.followerCount || 0;
            document.getElementById("count-following").innerText = user.followingCount || 0;

            // 2. TABS DATA BHARO (My Created Lists)
            // Backend UserResponse me myCreatedBlogs, myCreatedCategories lists bhej raha hai
            renderTabContent("content-blogs", user.myCreatedBlogs, "fa-newspaper", "No Blogs Posted Yet");
            renderTabContent("content-categories", user.myCreatedCategories, "fa-layer-group", "No Categories Created");
            renderTabContent("content-subcategories", user.myCreatedSubCategories, "fa-tags", "No Subcategories Created");

        }
    } catch (error) {
        console.error("Error loading profile:", error);
    }
}

// ============================================================================
// 🎨 3. TAB SWITCHING LOGIC (Instagram Jaisa)
// ============================================================================
function switchTab(tabName) {
    // 1. Sabhi tabs se 'active' class hatao (Kaali line hatao)
    document.querySelectorAll('.tab-item').forEach(tab => tab.classList.remove('active'));
    // 2. Sabhi content grid ko chhupao
    document.querySelectorAll('.content-grid').forEach(content => content.classList.remove('active'));

    // 3. Jispe click kiya, usko 'active' karo (Dikhao)
    document.getElementById(`tab-${tabName}`).classList.add('active');
    document.getElementById(`content-${tabName}`).classList.add('active');
}

// Helper: Lists ko dabbo (cards) me badalne ke liye
function renderTabContent(containerId, listData, iconClass, emptyMessage) {
    const container = document.getElementById(containerId);
    let html = "";

    if (listData && listData.length > 0) {
        // Agar data hai, toh har ek item ke liye ek chota card banao
        for (let itemTitle of listData) {
            html += `
                <div class="mini-card">
                    <i class="fa-solid ${iconClass}"></i>
                    <h3>${itemTitle}</h3>
                </div>
            `;
        }
    } else {
        // Agar khali hai toh message dikhao (Poori grid width lekar)
        html = `<p style="grid-column: 1 / -1; text-align:center; color:#888; padding: 40px;">${emptyMessage}</p>`;
    }
    container.innerHTML = html;
}

// ============================================================================
// 🪟 4. MODALS LOGIC (Followers / Following / Create Post)
// ============================================================================

// A. Create Post Buttons (Temporary Alert for now)
function openCreateModal(type) {
    // Agle step me hum isko asali form me badlenge!
    alert(`Bhai, '${type.toUpperCase()}' banane wala form/modal agle step me banayenge! Tu ekdum sahi track par hai.`);
}

// B. Follow/Following List API Call
async function openFollowModal(type) {
    // type ya toh 'followers' hoga ya 'following'
    document.getElementById("follow-modal-title").innerText = type;
    document.getElementById("follow-list-container").innerHTML = "";
    document.getElementById("follow-modal").classList.add("show");
    document.getElementById("follow-loader").style.display = "block";

    try {
        const liveToken = checkTokenLive(); if(!liveToken) return;

        // 🔗 API hit karo: /api/connection/followers?userId=...
        const url = `${BASE_URL}/api/connection/${type}?userId=${myUserId}`;
        const response = await fetch(url, { method: "GET", headers: { "Authorization": "Bearer " + liveToken } });
        const data = await response.json();
        
        document.getElementById("follow-loader").style.display = "none";

        if (data.success && data.data.length > 0) {
            let html = "";
            // Loop through connection list
            for (let person of data.data) {
                let pic = person.profileUrl || `https://ui-avatars.com/api/?name=${person.userName}&background=random`;
                html += `
                    <div class="list-user-box">
                        <img src="${pic}" alt="dp">
                        <div style="display:flex; flex-direction:column;">
                            <strong>${person.userName}</strong>
                            <span style="font-size:12px; color:#888;">${person.name || 'User'}</span>
                        </div>
                    </div>
                `;
            }
            document.getElementById("follow-list-container").innerHTML = html;
        } else {
            document.getElementById("follow-list-container").innerHTML = `<p style="text-align:center; color:#888; padding:20px;">No ${type} found.</p>`;
        }
    } catch (error) {
        document.getElementById("follow-loader").style.display = "none";
        document.getElementById("follow-list-container").innerHTML = "<p style='color:red; text-align:center;'>Error loading list!</p>";
    }
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove("show");
}
window.addEventListener('click', function(event) {
    if (event.target === document.getElementById("follow-modal")) { closeModal('follow-modal'); }
});

// Logout
document.getElementById("logout-btn").addEventListener("click", function() { 
    localStorage.clear(); 
    window.location.replace("login.html"); 
});

// ============================================================================
// 🎬 5. START THE PAGE
// ============================================================================
if (checkTokenLive()) {
    loadProfilePage();
}