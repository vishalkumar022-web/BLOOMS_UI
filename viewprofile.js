// ============================================================================
// 🌐 1. GLOBAL VARIABLES & SETUP
// ============================================================================
const BASE_URL = "https://blog-management-system-blooms-2.onrender.com";

function checkTokenLive() {
    const liveToken = localStorage.getItem("token");
    if (!liveToken) { window.location.replace("login.html"); return false; }
    return liveToken; 
}

// Global Variables
let myUserId = ""; 
let targetUserId = ""; // Jiska profile hum dekh rahe hain
let iAmFollowingThisUser = false; 
let myFollowingList = []; 
let currentModalData = [];

// URL se Target User ki ID nikalna
const urlParams = new URLSearchParams(window.location.search);
targetUserId = urlParams.get('userId');

if (!targetUserId) {
    alert("User ID is missing in URL!");
    window.location.href = "dashboard.html";
}

// ============================================================================
// 🎬 2. MASTER RUN
// ============================================================================
async function masterRun() {
    if(checkTokenLive()) {
        await loadMyOwnId(); 
        await loadTargetUserProfile(); 
        await checkFollowStatus(); 
    }
}
masterRun();

// ============================================================================
// 👤 3. LOAD IDS & CHECK FOLLOW STATUS
// ============================================================================
async function loadMyOwnId() {
    const liveToken = checkTokenLive(); if(!liveToken) return;
    try {
        const response = await fetch(BASE_URL + "/api/User/me", { method: "GET", headers: { "Authorization": "Bearer " + liveToken }});
        const data = await response.json();
        if (data.success) {
            myUserId = data.data.userId;
            if (myUserId === targetUserId) { window.location.href = "profile.html"; }
        }

        // Apni following list mangwa lo modal k liye
        const fRes = await fetch(`${BASE_URL}/api/connection/following?userId=${myUserId}`, { method: "GET", headers: { "Authorization": "Bearer " + liveToken } });
        const fData = await fRes.json();
        if(fData.success) myFollowingList = fData.data.map(p => p.userId);

    } catch(e) { console.error(e); }
}

async function loadTargetUserProfile() {
    const liveToken = checkTokenLive(); if(!liveToken) return;
    try {
        const response = await fetch(`${BASE_URL}/api/User/otherUser?userId=${targetUserId}`, {
            method: "GET", headers: { "Authorization": "Bearer " + liveToken }
        });
        const data = await response.json();

        if (data.success) {
            const user = data.data;
            
            document.getElementById("other-username").innerText = user.userName;
            document.getElementById("other-role").innerText = user.role ? user.role.toUpperCase() : "USER";
            document.getElementById("other-fullname").innerText = user.name || "No Name Provided";
            formatAboutMe(user.aboutMe, "other-about-me");
            document.getElementById("other-profile-pic").src = user.profileUrl || `https://ui-avatars.com/api/?name=${user.userName}&background=random&size=150`;

            document.getElementById("other-followers").innerText = user.followerCount || 0;
            document.getElementById("other-following").innerText = user.followingCount || 0;

            // 🚨 NAYA: Naya Pipe Decoder Render call (Bina Edit/Delete Button Ke)
            renderTabContent("content-blogs", user.myCreatedBlogs, "blogs", "No Blogs Posted Yet");
            renderTabContent("content-categories", user.myCreatedCategories, "categories", "No Categories Created");
            renderTabContent("content-subcategories", user.myCreatedSubCategories, "subcategories", "No Subcategories Created");
        }
    } catch(e) { console.error("Profile load fail", e); }
}

async function checkFollowStatus() {
    if(myFollowingList.includes(targetUserId)) { iAmFollowingThisUser = true; }
    
    const btn = document.getElementById("dynamic-follow-btn");
    btn.style.display = "block"; 
    
    if (iAmFollowingThisUser) {
        btn.innerHTML = `<i class="fa-solid fa-check"></i> Following`;
        btn.style.backgroundColor = "transparent";
        btn.style.border = "1px solid #666";
        btn.style.color = "#666";
    } else {
        btn.innerHTML = `<i class="fa-solid fa-plus"></i> Follow`;
        btn.style.backgroundColor = "#0a66c2";
        btn.style.border = "none";
        btn.style.color = "white";
    }
}

document.getElementById("dynamic-follow-btn").addEventListener("click", async function() {
    const liveToken = checkTokenLive(); if(!liveToken) return;
    let endpoint = iAmFollowingThisUser ? "unfollow" : "follow";
    
    try {
        await fetch(`${BASE_URL}/api/connection/${endpoint}?targetUserId=${targetUserId}`, { method: "POST", headers: { "Authorization": "Bearer " + liveToken } });
        alert(iAmFollowingThisUser ? "Unfollowed successfully! ❌" : "Followed successfully! ✅");
        window.location.reload();
    } catch(e){}
});

// ============================================================================
// 🎨 4. NAYA: 4-COLUMN TAB CARDS RENDER ENGINE (For Other Users)
// 🤔 Kyu banaya?: Taaki dusre ki profile par naya CSS design (4 column) aur 
// naya Data (Pipe Decoder) theek se dikhe, Bina Edit/Delete ke!
// ============================================================================
function renderTabContent(containerId, listData, type, emptyMessage) {
    const container = document.getElementById(containerId);
    let html = "";
    
    if (listData && listData.length > 0) {
        for (let rawData of listData) {
            
            // Pipe Decoder
            let parts = rawData.split("|");
            
            let rawTitle = parts[0] || "Untitled";
            let rawId = parts[1] || "No_ID";
            let imgUrl = (parts[2] && parts[2] !== "null" && parts[2] !== "") ? parts[2] : "https://via.placeholder.com/200x120?text=No+Image";
            let rawDescription = (parts[3] && parts[3] !== "null") ? parts[3] : "No description available.";
            let rawCreatedDTTM = parts[5]; 

            // Bold IDs
            let idLabelHtml = "";
            if(type === "blogs") idLabelHtml = `<strong>Blog ID: ${rawId}</strong>`;
            else if(type === "categories") idLabelHtml = `<strong>Category ID: ${rawId}</strong>`;
            else if(type === "subcategories") idLabelHtml = `<strong>Subcategory ID: ${rawId}</strong>`;
            
            // Date formatting
            let formattedDateHtml = "";
            if(rawCreatedDTTM && rawCreatedDTTM !== "null") {
                let dtParts = rawCreatedDTTM.split('T');
                let date = dtParts[0];
                let time = dtParts[1] ? dtParts[1].substring(0, 5) : ""; 
                formattedDateHtml = `<i class="fa-solid fa-clock"></i> Created: ${date} at ${time}`;
            } else {
                formattedDateHtml = `<i class="fa-solid fa-clock"></i> Created: Recently`;
            }

            // FIX 2 - Read More only when content is long
            const WORD_LIMIT = 20;
            let words = rawDescription.split(/\s+/).filter(w => w.length > 0);
            
            let isLong = words.length > WORD_LIMIT;
            let displayDesc = isLong ? words.slice(0, WORD_LIMIT).join(" ") + "..." : rawDescription;
            let descUniqueId = `desc-other-${type}-${rawId.substring(0,5)}`;

            let safeFullDesc = encodeURIComponent(rawDescription);
            let safeShortDesc = encodeURIComponent(displayDesc);
            
            let readMoreBtnHtml = isLong ? `<a href="javascript:void(0)" onclick="toggleCardReadMore('${descUniqueId}', event)" style="color:#0a66c2; font-weight:bold; text-decoration:none; font-size:11px; display:block; text-align:right; margin-top:4px;">Read More</a>` : "";

            // 🚨 NAYA HTML: Bina Edit/Delete, Identical to profile.js styling, No Likes/Comments
            html += `
                <div class="profile-item-card" style="background: white; border: 1px solid #dbdbdb; border-radius: 8px; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                    <img src="${imgUrl}" style="width: 100%; height: 120px; object-fit: cover; border-bottom: 1px solid #efefef;" onerror="this.src='https://via.placeholder.com/200x120?text=Image+Load+Error'" loading="lazy" decoding="async">
                    
                    <div class="card-info" style="padding: 12px; flex-grow: 1; display: flex; flex-direction: column;">
                        
                        <div style="font-size:10px; color:#0a66c2; margin-bottom:5px; word-break: break-all;">
                            ${idLabelHtml}
                        </div>
                        
                        <h3 style="font-size: 15px; color: #262626; margin-bottom: 5px;">${rawTitle}</h3>
                        
                        <div id="${descUniqueId}" data-full="${safeFullDesc}" data-short="${safeShortDesc}" style="font-size:12px; color:#555; line-height:1.4; max-height:40px; overflow-y:hidden; transition: max-height 0.3s ease;">
                            ${displayDesc}
                        </div>
                        ${readMoreBtnHtml}
                        
                        <div style="font-size: 10px; color: #888; margin-top: auto; padding-top: 8px; border-top: 1px solid #efefef;">
                            ${formattedDateHtml}
                        </div>
                    </div>
                </div>
            `;
        }
    } else { 
        html = `<p style="grid-column: 1 / -1; text-align:center; color:#888; padding: 40px;">${emptyMessage}</p>`; 
    }
    container.innerHTML = html;
}

// Card ka readmore toggle
function toggleCardReadMore(descId, event) {
    if (event) event.stopPropagation();
    const descDabba = document.getElementById(descId);
    const trigger = event.target; 
    
    let fullText = decodeURIComponent(descDabba.getAttribute("data-full"));
    let shortText = decodeURIComponent(descDabba.getAttribute("data-short"));

    if (descDabba.classList.contains("open")) {
        descDabba.classList.remove("open");
        descDabba.innerHTML = shortText;
        descDabba.style.maxHeight = "40px";
        descDabba.style.overflowY = "hidden";
        trigger.innerText = "Read More";
    } else {
        descDabba.classList.add("open");
        descDabba.innerHTML = fullText;
        descDabba.style.maxHeight = "120px";
        descDabba.style.overflowY = "auto";
        trigger.innerText = "Show Less";
    }
}

// ============================================================================
// 🪟 5. FOLLOW MODAL LOGIC FOR TARGET USER
// ============================================================================
async function openFollowModal(type) {
    document.getElementById("follow-modal-title").innerText = type;
    document.getElementById("modal-search-input").value = ""; 
    document.getElementById("follow-list-container").innerHTML = "";
    document.getElementById("follow-modal").classList.add("show");
    document.getElementById("follow-loader").style.display = "block";

    try {
        const liveToken = checkTokenLive(); if(!liveToken) return;
        const url = `${BASE_URL}/api/connection/${type}?userId=${targetUserId}`;
        const response = await fetch(url, { method: "GET", headers: { "Authorization": "Bearer " + liveToken } });
        const data = await response.json();
        
        document.getElementById("follow-loader").style.display = "none";
        if (data.success && data.data.length > 0) {
            currentModalData = data.data; 
            renderFollowList(currentModalData);
        } else {
            currentModalData = [];
            document.getElementById("follow-list-container").innerHTML = `<p style="text-align:center; color:#888; padding:30px;">No ${type} found.</p>`;
        }
    } catch (error) { document.getElementById("follow-loader").style.display = "none"; }
}

document.getElementById("modal-search-input").addEventListener("input", function(e) {
    let query = e.target.value.toLowerCase();
    let filteredList = currentModalData.filter(person => person.userName.toLowerCase().includes(query) || (person.name && person.name.toLowerCase().includes(query)));
    renderFollowList(filteredList);
});

function renderFollowList(list) {
    let html = "";
    for (let person of list) {
        let pic = person.profileUrl || `https://ui-avatars.com/api/?name=${person.userName}&background=random`;
        let isFollowing = myFollowingList.includes(person.userId);
        
        let btnHtml = isFollowing 
            ? `<button onclick="actionFromModal('${person.userId}', 'unfollow', event)" style="padding:6px 15px; border-radius:8px; background:#fafafa; border:1px solid #ccc; font-weight:bold; color:#555; cursor:pointer; font-size:12px;">Unfollow</button>`
            : `<button onclick="actionFromModal('${person.userId}', 'follow', event)" style="padding:6px 15px; border-radius:8px; background:#0a66c2; color:white; border:none; font-weight:bold; cursor:pointer; font-size:12px;">Follow</button>`;

        if(person.userId === myUserId) btnHtml = ""; 

        html += `
            <div class="list-user-box" style="display:flex; justify-content:space-between; align-items:center; padding:10px 15px; border-bottom:1px solid #f0f0f0;">
                <a href="viewprofile.html?userId=${person.userId}" style="text-decoration:none; display:flex; align-items:center; color:#333; flex:1;">
                    <img src="${pic}" style="width:44px; height:44px; border-radius:50%; margin-right:15px; object-fit:cover;" loading="lazy" decoding="async">
                    <div style="display:flex; flex-direction:column;">
                        <strong style="font-size:14px; font-weight:600;">${person.userName}</strong>
                        <span style="font-size:12px; color:#888;">${person.name || 'User'}</span>
                    </div>
                </a>
                <div style="margin-left: 10px; z-index:10;">${btnHtml}</div>
            </div>
        `;
    }
    document.getElementById("follow-list-container").innerHTML = html || "<p style='text-align:center; padding:20px; color:#888;'>No matches found.</p>";
}

async function actionFromModal(actionUserId, action, event) {
    event.preventDefault(); event.stopPropagation();
    const liveToken = checkTokenLive(); if(!liveToken) return; 
    try {
        await fetch(`${BASE_URL}/api/connection/${action}?targetUserId=${actionUserId}`, { method: "POST", headers: { "Authorization": "Bearer " + liveToken }});
        if (action === 'follow') { myFollowingList.push(actionUserId); } 
        else { myFollowingList = myFollowingList.filter(id => id !== actionUserId); }
        renderFollowList(currentModalData); 
        if(actionUserId === targetUserId) { window.location.reload(); }
    } catch(e) { alert("Action failed!"); }
}


// About me Formatter (For Target User)
function formatAboutMe(text, elementId) {
    const container = document.getElementById(elementId);
    if (!text) { container.innerHTML = "I'm using Blooms! 🌿"; container.classList.remove("scrollable-desc"); return; }
    if (text.length > 80) {
        let shortText = text.substring(0, 80) + "...";
        container.classList.remove("scrollable-desc"); 
        container.innerHTML = `<span id="${elementId}-text">${shortText}</span> <a href="javascript:void(0)" id="${elementId}-btn" style="color:#0a66c2; font-weight:bold; text-decoration:none; margin-left:5px;">Read More</a>`;
        document.getElementById(`${elementId}-btn`).onclick = function() {
            let btn = document.getElementById(`${elementId}-btn`);
            let txtSpan = document.getElementById(`${elementId}-text`);
            if (btn.innerText === "Read More") { txtSpan.innerText = text; container.classList.add("scrollable-desc"); btn.innerText = "Show Less";
            } else { txtSpan.innerText = shortText; container.classList.remove("scrollable-desc"); btn.innerText = "Read More"; container.scrollTop = 0; }
        };
    } else { container.innerText = text; container.classList.remove("scrollable-desc"); }
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-item').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.content-grid').forEach(content => content.classList.remove('active'));
    document.getElementById(`tab-${tabName}`).classList.add('active');
    document.getElementById(`content-${tabName}`).classList.add('active');
}

// Modals Dummy Logic
async function openBlogLikesModal(blogId, event) {
    if(event) event.stopPropagation();
    document.getElementById("likes-list-container").innerHTML = "<p style='text-align:center; padding:20px; color:#888;'><i class='fa-solid fa-heart' style='color:#e0245e;'></i> Vishal Kumar<br><i class='fa-solid fa-heart' style='color:#e0245e;'></i> Aman Sarkar</p>";
    document.getElementById("likes-modal").classList.add("show");
}
async function openBlogCommentsModal(blogId, event) {
    if(event) event.stopPropagation();
    document.getElementById("comments-list-container").innerHTML = "<p style='text-align:center; padding:20px; color:#888;'>Nice Blog!<br>Good Work.</p>";
    document.getElementById("comments-modal").classList.add("show");
}
function closeModal(modalId) { document.getElementById(modalId).classList.remove("show"); }
window.addEventListener('click', function(event) { 
    if (event.target === document.getElementById("follow-modal")) closeModal('follow-modal'); 
    if (event.target === document.getElementById("likes-modal")) closeModal('likes-modal'); 
    if (event.target === document.getElementById("comments-modal")) closeModal('comments-modal'); 
});

// ============================================================================
// 📱 6. RESPONSIVE & PERFORMANCE OPTIMIZATIONS
// ============================================================================

// Hamburger Menu Toggle for Mobile
const mobileMenuBtn = document.getElementById("mobile-menu-btn");
const navMenu = document.getElementById("nav-menu");

if (mobileMenuBtn && navMenu) {
    mobileMenuBtn.addEventListener("click", function() {
        navMenu.classList.toggle("active");
    });
}