// ============================================================================
// 🌐 1. GLOBAL VARIABLES & SECURITY
// ============================================================================
const BASE_URL = "https://blog-management-system-blooms-2.onrender.com";

let myUserId = "";
let myFollowingList = [];

let currentPage = 0;       
const pageSize = 7;       
let isSearching = false;   
let searchText = ""; 
let currentModalData = []; 

// 🛡️ Security Guard: Bina login ke bhagao
function checkTokenLive() {
    const t = localStorage.getItem("token");
    if (!t) { window.location.replace("login.html"); return false; }
    return t; 
}

// ============================================================================
// 🎬 2. MASTER RUN
// ============================================================================
async function masterRun() {
    if(checkTokenLive()) {
        await loadProfilePage(); 
    }
}
masterRun(); 

// ============================================================================
// 👤 3. LOAD MY PROFILE (Fast Fetch)
// ============================================================================
async function loadProfilePage() {
    try {
        const liveToken = checkTokenLive(); if(!liveToken) return;

        // 1. Apna basic data laao
        const res = await fetch(BASE_URL + "/api/User/me", { method: "GET", headers: { "Authorization": "Bearer " + liveToken }});
        const data = await res.json();

        if (data.success) {
            const user = data.data;
            myUserId = user.userId;
            
            document.getElementById("my-username").innerText = user.userName;
            document.getElementById("my-role").innerText = user.role.toUpperCase();
            document.getElementById("my-fullname").innerText = user.name || "No Name Provided";
            document.getElementById("my-profile-pic").src = user.profileUrl || `https://ui-avatars.com/api/?name=${user.name || 'User'}&background=0a66c2&color=fff&size=150`;

            document.getElementById("count-followers").innerText = user.followerCount || 0;
            document.getElementById("count-following").innerText = user.followingCount || 0;

            // 2. Tabs fill karo (Data Pipe format me hai)
            renderTabContent("content-blogs", user.myCreatedBlogs, "blogs", "No Blogs Posted Yet");
            renderTabContent("content-categories", user.myCreatedCategories, "categories", "No Categories Created");
            renderTabContent("content-subcategories", user.myCreatedSubCategories, "subcategories", "No Subcategories Created");

            // 3. Following list laao (Search button k liye)
            const fRes = await fetch(`${BASE_URL}/api/connection/following?userId=${myUserId}`, { method: "GET", headers: { "Authorization": "Bearer " + liveToken } });
            const fData = await fRes.json();
            if(fData.success) myFollowingList = fData.data.map(p => p.userId);

            formatAboutMe(user.aboutMe, "my-about-me");
        }
    } catch (e) { 
        console.log("Me load failed", e); 
        // 🚨 NAYA: Agar error aaye toh "loading..." na atke
        document.getElementById("my-username").innerText = "Error";
        document.getElementById("my-fullname").innerText = "Failed to load data. Please refresh.";
    }
}

// 📖 Profile page wala about me (Read more on 80 chars)
function formatAboutMe(text, elementId) {
    const container = document.getElementById(elementId);
    if (!text) { container.innerHTML = "I'm using Blooms! 🌿"; container.classList.remove("scrollable-desc", "open-bio"); return; }
    
    if (text.length > 80) {
        let shortText = text.substring(0, 80) + "...";
        container.classList.add("scrollable-desc"); // Base class for styling
        container.classList.remove("open-bio"); // Shuru me band rakho
        
        container.innerHTML = `<span id="${elementId}-text">${shortText}</span> <a href="javascript:void(0)" id="${elementId}-btn" style="color:#0a66c2; font-weight:bold; text-decoration:none; margin-left:5px;">Read More</a>`;
        
        document.getElementById(`${elementId}-btn`).onclick = function() {
            let btn = document.getElementById(`${elementId}-btn`);
            let txtSpan = document.getElementById(`${elementId}-text`);
            if (btn.innerText === "Read More") { 
                txtSpan.innerText = text; 
                container.classList.add("open-bio"); // 🚨 Class add ki, CSS isko scrollbar dega
                btn.innerText = "Show Less";
            } else { 
                txtSpan.innerText = shortText; 
                container.classList.remove("open-bio"); // 🚨 Class remove ki, scrollbar gayab
                btn.innerText = "Read More"; 
                container.scrollTop = 0; 
            }
        };
    } else { 
        container.innerText = text; 
        container.classList.remove("scrollable-desc", "open-bio"); 
    }
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-item').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.content-grid').forEach(content => content.classList.remove('active'));
    document.getElementById(`tab-${tabName}`).classList.add('active');
    document.getElementById(`content-${tabName}`).classList.add('active');
}

// ============================================================================
// 🎨 4. RENDER TAB CONTENT (Pipe Decoder + Bold ID + Date Time)
// ============================================================================
function renderTabContent(containerId, listData, type, emptyMessage) {
    const container = document.getElementById(containerId);
    let html = "";
    
    if (listData && listData.length > 0) {
        for (let rawData of listData) {
            if(!rawData) continue; // Safety check
            
            // Backend se aane wale pipe (|) wale data ko kaatna
            let parts = rawData.split("|");
            
            let title = parts[0] || "Untitled";
            let id = parts[1] || "No_ID";
            let imgUrl = (parts[2] && parts[2] !== "null" && parts[2] !== "") ? parts[2] : "https://via.placeholder.com/200x120?text=No+Image";
            let description = (parts[3] && parts[3] !== "null") ? parts[3] : "No description available.";
            let status = (parts[4] && parts[4] !== "null") ? parts[4] : "UNKNOWN";
            let rawTime = parts[5]; 

            // 🏷️ Specific ID Label (Bold me)
            let idLabelHtml = "";
            if(type === "blogs") idLabelHtml = `<strong>Blog ID: </strong> <span style="color:#333;">${id.substring(0,8)}   • <strong>${status}</strong></span>`;
            else if(type === "categories") idLabelHtml = `<strong>Category ID: </strong> <span style="color:#333;">${id.substring(0,8)}   • ${status}</span>`;
            else if(type === "subcategories") idLabelHtml = `<strong>Subcat ID: </strong> <span style="color:#333;">${id.substring(0,8)}   • ${status}</span>`;

            // 🕒 Date aur Time Set karna
            let timeString = "Recently";
            if (rawTime && rawTime !== "null") {
                let dtParts = rawTime.split('T');
                let date = dtParts[0];
                let time = dtParts[1] ? dtParts[1].substring(0, 5) : "";
                timeString = `${date} at ${time}`;
            }

            // 🚨 THE MAIN FIX: Read More Logic Cards ke liye 
            // Ab ye height zero nahi karega, balki do alag-alag div banayega
            let shortDesc = description;
            let readMoreBtnHtml = "";
            
            if(description.length > 60) {
                shortDesc = description.substring(0, 60) + "...";
                readMoreBtnHtml = `<a href="javascript:void(0);" onclick="toggleCardReadMore('${id}', event)" style="color:#0a66c2; font-weight:bold; text-decoration:none; font-size:11px; float:right; margin-top:4px;">Read More</a>`;
            }

            // Card ka HTML Design
            html += `
                <div class="profile-item-card" style="background: white; border: 1px solid #dbdbdb; border-radius: 8px; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                    <img src="${imgUrl}" style="width: 100%; height: 120px; object-fit: cover; border-bottom: 1px solid #efefef;" onerror="this.src='https://via.placeholder.com/200x120?text=Error'" loading="lazy" decoding="async">
                    
                    <div class="card-info" style="padding: 12px; flex-grow: 1; display: flex; flex-direction: column;">
                        
                        <div style="font-size:10px; color:#0a66c2; margin-bottom:5px; word-break: break-all;">
                            ${idLabelHtml}
                        </div>
                        
                        <h3 style="font-size: 15px; color: #262626; margin-bottom: 5px;">${title}</h3>
                        
                        <div id="short-desc-${id}" style="font-size:12px; color:#555; line-height:1.4;">
                            ${shortDesc} ${readMoreBtnHtml}
                        </div>
                        
                        <div id="full-desc-${id}" style="display:none; font-size:12px; color:#555; line-height:1.4; max-height:80px; padding-right:5px; overflow-y:auto;">
                            ${description} <br>
                            <a href="javascript:void(0);" onclick="toggleCardReadMore('${id}', event)" style="color:#0a66c2; font-weight:bold; text-decoration:none; float:right; margin-top:4px;">Show Less</a>
                        </div>
                        
                        <div style="font-size: 10px; color: #888; margin-top: 10px; padding-top: 8px; border-top: 1px solid #efefef;">
                            <i class="fa-solid fa-clock"></i> Created: ${timeString}
                        </div>
                    </div>

                    <div class="card-actions" style="display: flex; border-top: 1px solid #efefef; background: #fafafa;">
                        <button onclick="handleEdit('${id}', '${type}')" style="flex: 1; padding: 10px; border: none; background: transparent; color:#0a66c2; font-weight:bold; cursor:pointer; font-size:12px; border-right:1px solid #eee; transition: 0.2s;">
                            <i class="fa-solid fa-pencil"></i> Edit
                        </button>
                        <button onclick="handleDelete('${id}', '${type}', '${title}')" style="flex: 1; padding: 10px; border: none; background: transparent; color:#ed4956; font-weight:bold; cursor:pointer; font-size:12px; transition: 0.2s;">
                            <i class="fa-solid fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            `;
        }
    } else { 
        html = `<p style="grid-column: 1 / -1; text-align:center; color:#888; padding: 40px;">${emptyMessage}</p>`; 
    }
    container.innerHTML = html;
}

// 🚨 Card ka readmore toggle (Show/Hide scrollbar block)
function toggleCardReadMore(id, event) {
    event.preventDefault();
    let shortDiv = document.getElementById(`short-desc-${id}`);
    let fullDiv = document.getElementById(`full-desc-${id}`);
    
    if (shortDiv.style.display === "none") {
        shortDiv.style.display = "block";
        fullDiv.style.display = "none";
    } else {
        shortDiv.style.display = "none";
        fullDiv.style.display = "block";
    }
}

// ============================================================================
// 🗑️ 5. DELETE & EDIT ACTIONS (Fast)
// ============================================================================
async function handleDelete(itemId, type, itemTitle) {
    let agree = confirm(`⚠️ ALERT!\n\nKya tum sach me "${itemTitle}" ko delete karna chahte ho?\nYe action wapas nahi liya ja sakta!`);
    if (agree) {
        try {
            const token = checkTokenLive(); if(!token) return;
            let apiUrl = "";
            if (type === "blogs") apiUrl = `${BASE_URL}/api/BLog?blogId=${itemId}`;
            else if (type === "categories") apiUrl = `${BASE_URL}/api/Category?categoryId=${itemId}`;
            else if (type === "subcategories") apiUrl = `${BASE_URL}/api/SubCategory?subCategoryId=${itemId}`;

            const res = await fetch(apiUrl, { method: "DELETE", headers: { "Authorization": "Bearer " + token } });
            const data = await res.json();

            if (data.success) { alert(`✅ Success! "${itemTitle}" delete ho gaya.`); window.location.reload(); } 
            else { alert("❌ Delete Failed: " + data.message); }
        } catch (e) { alert("Server error!"); }
    }
}

// 🚨 FAST EDIT: Koi bhari bharkam modal nahi, seedha naye page par URL parameters ke sath bhej do
function handleEdit(itemId, type) {
    window.location.href = `edit-content.html?id=${itemId}&type=${type}`;
}

// ============================================================================
// 🔍 6. MAIN SEARCH LOGIC 
// ============================================================================
document.getElementById("search-input").addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
        event.preventDefault(); 
        let userInput = this.value.trim();
        if (userInput !== "") {
            isSearching = true; searchText = userInput; currentPage = 0;
            document.getElementById("profile-view").style.display = "none";
            document.getElementById("search-view").style.display = "block";
            document.getElementById("search-keyword").innerText = searchText;
            getSearchedUsers();
        } else { resetSearch(); }
    }
});

function resetSearch() {
    document.getElementById("search-input").value = ""; 
    isSearching = false; searchText = ""; currentPage = 0;
    document.getElementById("search-view").style.display = "none";
    document.getElementById("profile-view").style.display = "block";
}

async function getSearchedUsers() {
    try {
        const liveToken = checkTokenLive(); if(!liveToken) return;
        const url = `${BASE_URL}/api/User/search?name=${encodeURIComponent(searchText)}&page=${currentPage}&size=${pageSize}`;
        const response = await fetch(url, { method: "GET", headers: { "Authorization": "Bearer " + liveToken } });
        const data = await response.json();

        if (data.success && data.data.length > 0) {
            printUsersOnScreen(data.data);
            printUserPagination(data.data.length);
        } else {
            document.getElementById("users-grid").innerHTML = `<div style="grid-column:1/-1; text-align:center; padding: 40px; background:#fff; border-radius:10px;"><h3>Sorry bhai, "${searchText}" naam ka koi user nahi mila! 😔</h3></div>`;
            document.getElementById("pagination-container").innerHTML = "";
        }
    } catch (e) { document.getElementById("users-grid").innerHTML = `<div style="grid-column:1/-1; text-align:center; padding: 40px; background:#fff; border-radius:10px;"><h3 style="color:red;">Server connection failed! 🔌</h3></div>`; }
}

function printUsersOnScreen(usersArray) {
    let html = "";
    for(let user of usersArray) {
        if(user.userId === myUserId) continue; 
        let pic = user.profileUrl || `https://ui-avatars.com/api/?name=${user.userName}&background=random`;
        let isFollowing = myFollowingList.includes(user.userId);
        let btnHtml = isFollowing 
            ? `<button class="follow-btn-small btn-grey-outline" onclick="actionFromSearch('${user.userId}', 'unfollow', event)"><i class="fa-solid fa-check"></i> Unfollow</button>`
            : `<button class="follow-btn-small btn-blue-outline" onclick="actionFromSearch('${user.userId}', 'follow', event)"><i class="fa-solid fa-plus"></i> Follow</button>`;

        let bioText = user.aboutMe ? user.aboutMe : "I'm using Blooms! 🌿";
        if (bioText.length > 120) { bioText = bioText.substring(0, 120) + "..."; }

        html += `
            <a href="viewprofile.html?userId=${user.userId}" class="user-search-card" style="text-decoration:none; color:inherit;">
                <img src="${pic}" class="user-search-pic" alt="dp" loading="lazy" decoding="async">
                <div class="user-search-info">
                    <strong>${user.userName}</strong>
                    <p class="user-fullname">${user.name || 'User'}</p>
                    <p class="user-short-bio">${bioText}</p> 
                </div>
                <div style="flex-shrink: 0; z-index: 10;">${btnHtml}</div>
            </a>
        `;
    }
    document.getElementById("users-grid").innerHTML = html;
}

function printUserPagination(currentCount) {
    const cont = document.getElementById("pagination-container");
    let html = `<div style="display:flex; justify-content:space-between; margin-top:20px; width:100%;">`;
    if(currentPage === 0) html += `<button disabled style="padding:10px 20px; background:#ccc; border:none; border-radius:5px;">⬅️ Previous</button>`;
    else html += `<button onclick="currentPage--; getSearchedUsers();" style="padding:10px 20px; background:#0a66c2; color:white; border:none; border-radius:5px; cursor:pointer;">⬅️ Previous</button>`;
    html += `<span style="font-weight:bold; align-self:center;">Page ${currentPage+1}</span>`;
    if(currentCount < pageSize) html += `<button disabled style="padding:10px 20px; background:#ccc; border:none; border-radius:5px;">Next ➡️</button>`;
    else html += `<button onclick="currentPage++; getSearchedUsers();" style="padding:10px 20px; background:#0a66c2; color:white; border:none; border-radius:5px; cursor:pointer;">Next ➡️</button>`;
    html += `</div>`;
    cont.innerHTML = html;
}

async function actionFromSearch(targetId, action, event) {
    event.preventDefault(); event.stopPropagation();
    const liveToken = checkTokenLive(); if(!liveToken) return; 
    try {
        await fetch(`${BASE_URL}/api/connection/${action}?targetUserId=${targetId}`, { method: "POST", headers: { "Authorization": "Bearer " + liveToken }});
        if (action === 'follow') { myFollowingList.push(targetId); } else { myFollowingList = myFollowingList.filter(id => id !== targetId); }
        if (isSearching) getSearchedUsers(); else renderFollowList(currentModalData); 
    } catch(e) { alert("Action failed!"); }
}

// ============================================================================
// 🪟 7. FOLLOW MODAL & OTHERS
// ============================================================================
async function openFollowModal(type) {
    document.getElementById("follow-modal-title").innerText = type;
    document.getElementById("modal-search-input").value = ""; 
    document.getElementById("follow-list-container").innerHTML = "";
    document.getElementById("follow-modal").classList.add("show");
    document.getElementById("follow-loader").style.display = "block";

    try {
        const liveToken = checkTokenLive(); if(!liveToken) return;
        const url = `${BASE_URL}/api/connection/${type}?userId=${myUserId}`;
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

let debounceTimer;
document.getElementById("modal-search-input").addEventListener("input", function(e) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        let query = e.target.value.toLowerCase();
        let filteredList = currentModalData.filter(person => person.userName.toLowerCase().includes(query) || (person.name && person.name.toLowerCase().includes(query)));
        renderFollowList(filteredList);
    }, 300);
});

function renderFollowList(list) {
    let html = "";
    for (let person of list) {
        let pic = person.profileUrl || `https://ui-avatars.com/api/?name=${person.userName}&background=random`;
        let isFollowing = myFollowingList.includes(person.userId);
        let btnHtml = isFollowing 
            ? `<button onclick="actionFromSearch('${person.userId}', 'unfollow', event)" style="padding:6px 15px; border-radius:8px; background:#fafafa; border:1px solid #ccc; font-weight:bold; color:#555; cursor:pointer; font-size:12px;">Unfollow</button>`
            : `<button onclick="actionFromSearch('${person.userId}', 'follow', event)" style="padding:6px 15px; border-radius:8px; background:#0a66c2; color:white; border:none; font-weight:bold; cursor:pointer; font-size:12px;">Follow</button>`;

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

// ============================================================================
// ➕ 8. CREATE POST WALE MODALS
// ============================================================================
function openModal(modalId) { 
    document.getElementById(modalId).classList.add("show"); 
    if(modalId === 'create-subcategory-modal' || modalId === 'create-blog-modal') { loadCategoriesForDropdown(); }
}
function closeModal(modalId) { document.getElementById(modalId).classList.remove("show"); }

async function loadCategoriesForDropdown() {
    try {
        const token = checkTokenLive(); if(!token) return;
        const res = await fetch(`${BASE_URL}/api/Category/all?page=0&size=100`, { headers: { "Authorization": "Bearer " + token }});
        const data = await res.json();
        if (data.success) {
            let optionsHtml = `<option value="">Select Category</option>`;
            data.data.forEach(cat => { optionsHtml += `<option value="${cat.id}">${cat.title} (ID: ${cat.id.substring(0,8)})</option>`; });
            document.getElementById("subcat-parent-id").innerHTML = optionsHtml;
            document.getElementById("blog-cat-id").innerHTML = optionsHtml;
        }
    } catch(e) {}
}

async function loadSubcategoriesForDropdown(categoryId) {
    const subcatDropdown = document.getElementById("blog-subcat-id");
    subcatDropdown.innerHTML = `<option value="">Loading...</option>`;
    if(!categoryId) { subcatDropdown.innerHTML = `<option value="">Select Subcategory</option>`; return; }
    try {
        const token = checkTokenLive(); if(!token) return;
        const res = await fetch(`${BASE_URL}/api/Category/subcategories?categoryId=${categoryId}`, { headers: { "Authorization": "Bearer " + token }});
        const data = await res.json();
        if (data.success && data.data.length > 0) {
            let optionsHtml = `<option value="">Select Subcategory</option>`;
            data.data.forEach(sub => { optionsHtml += `<option value="${sub.subCategoryId}">${sub.subCategoryTittle} (ID: ${sub.subCategoryId.substring(0,8)})</option>`; });
            subcatDropdown.innerHTML = optionsHtml;
        } else { subcatDropdown.innerHTML = `<option value="">No subcategories found</option>`; }
    } catch(e) { subcatDropdown.innerHTML = `<option value="">Error</option>`; }
}

async function submitCategory() {
    const token = checkTokenLive(); if(!token) return;
    const body = { title: document.getElementById("cat-title").value, desc: document.getElementById("cat-desc").value, categoryUrl: document.getElementById("cat-img").value, userId: myUserId };
    if(!body.title || !body.desc) return alert("Title and Description are required!");
    const res = await fetch(`${BASE_URL}/api/Category`, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token }, body: JSON.stringify(body) });
    const data = await res.json();
    if(data.success) { alert("Category Sent to Admin For Review! ✅"); window.location.reload(); } else alert("Error: " + data.message);
}

async function submitSubCategory() {
    const token = checkTokenLive(); if(!token) return;
    const body = { categoryId: document.getElementById("subcat-parent-id").value, subCategoryTittle: document.getElementById("subcat-title").value, subCategoryDesc: document.getElementById("subcat-desc").value, subCategoryUrl: document.getElementById("subcat-img").value, userId: myUserId };
    if(!body.categoryId || !body.subCategoryTittle) return alert("Category and Title required!");
    const res = await fetch(`${BASE_URL}/api/SubCategory`, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token }, body: JSON.stringify(body) });
    const data = await res.json();
    if(data.success) { alert("SubCategory Sent to Admin For Review! ✅"); window.location.reload(); } else alert("Error: " + data.message);
}

async function submitBlog() {
    const token = checkTokenLive(); if(!token) return;
    const body = { blogTitle: document.getElementById("blog-title").value, blogDescription: document.getElementById("blog-desc").value, blogContent: document.getElementById("blog-content").value, blogImageUrl: document.getElementById("blog-img").value, blogCategoryId: document.getElementById("blog-cat-id").value, blogSubcategoryId: document.getElementById("blog-subcat-id").value, userId: myUserId };
    if(!body.blogTitle || !body.blogCategoryId || !body.blogContent) return alert("Title, Category, and Content required!");
    const res = await fetch(`${BASE_URL}/api/BLog`, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token }, body: JSON.stringify(body) });
    const data = await res.json();
    if(data.success) { alert("Blog Sent to Admin For Review! ✅"); window.location.reload(); } else alert("Error: " + data.message);
}

// Window click to close modals
window.addEventListener('click', function(event) { 
    if (event.target === document.getElementById("follow-modal")) closeModal('follow-modal'); 
    if (event.target === document.getElementById("create-category-modal")) closeModal('create-category-modal'); 
    if (event.target === document.getElementById("create-subcategory-modal")) closeModal('create-subcategory-modal'); 
    if (event.target === document.getElementById("create-blog-modal")) closeModal('create-blog-modal'); 
});

document.getElementById("logout-btn").addEventListener("click", function() { localStorage.clear(); window.location.replace("login.html"); });

// ============================================================================
// 📱 9. RESPONSIVE & PERFORMANCE OPTIMIZATIONS
// ============================================================================

// Debounce utility function for performance optimization
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Hamburger Menu Toggle for Mobile
const mobileMenuBtn = document.getElementById("mobile-menu-btn");
const navMenu = document.getElementById("nav-menu");

if (mobileMenuBtn && navMenu) {
    mobileMenuBtn.addEventListener("click", function() {
        navMenu.classList.toggle("active");
    });
}

/* =======================================================
   Mobile Search Bar Focus Effect
   ======================================================= */
const searchInput = document.querySelector('.search-box input, .search-input, input[type="search"], input[type="text"]');
if (searchInput) {
  searchInput.addEventListener('focus', () => {
    searchInput.parentElement.style.border = '1.5px solid #1a73e8';
    searchInput.parentElement.style.background = '#ffffff';
    searchInput.parentElement.style.boxShadow = '0 0 0 3px rgba(26,115,232,0.15)';
  });
  searchInput.addEventListener('blur', () => {
    searchInput.parentElement.style.border = '1.5px solid #d0d0d0';
    searchInput.parentElement.style.background = '#f0f2f5';
    searchInput.parentElement.style.boxShadow = 'none';
  });
}

// ===== TASK 1: HAMBURGER MENU COMPACT DROPDOWN LOGIC =====
(function() {
    const hamburgerBtn = document.querySelector('.hamburger-menu, .hamburger-btn, button[class*="hamburger"], #mobile-menu-btn');
    const navDropdown = document.querySelector('.nav-right, #nav-menu');
    
    if (hamburgerBtn && navDropdown) {
        // Clone and replace button to remove old event listeners if any
        const newHamburgerBtn = hamburgerBtn.cloneNode(true);
        hamburgerBtn.parentNode.replaceChild(newHamburgerBtn, hamburgerBtn);
        
        let overlayDiv = null;

        function closeMenu() {
            navDropdown.classList.remove('active');
            if (overlayDiv) {
                overlayDiv.remove();
                overlayDiv = null;
            }
        }

        newHamburgerBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            const isActive = navDropdown.classList.toggle('active');
            
            if (isActive) {
                if (!overlayDiv) {
                    overlayDiv = document.createElement('div');
                    overlayDiv.className = 'mobile-menu-overlay';
                    document.body.appendChild(overlayDiv);
                    
                    overlayDiv.addEventListener('click', closeMenu);
                }
            } else {
                closeMenu();
            }
        });

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') closeMenu();
        });

        const navLinks = navDropdown.querySelectorAll('.nav-item, a, button');
        navLinks.forEach(link => {
            link.addEventListener('click', closeMenu);
        });
    }
})();

// ===== TASK 3: CHAT NOTIFICATION POLLING (WHATSAPP STYLE) =====
(function() {
    let unreadPollInterval = null;

    async function fetchUnreadCounts() {
        const liveToken = localStorage.getItem("token");
        const myUserId = localStorage.getItem("userId");
        if (!liveToken || !myUserId) return;

        try {
            const BASE_URL = "https://blog-management-system-blooms-2.onrender.com";
            const response = await fetch(`${BASE_URL}/api/chat/unread-counts?userId=${myUserId}`, {
                headers: { "Authorization": "Bearer " + liveToken }
            });
            const data = await response.json();
            
            if (data && data.success && data.data) {
                let totalUnread = 0;
                const unreadCountsMap = data.data;
                
                for (let key in unreadCountsMap) {
                    totalUnread += unreadCountsMap[key];
                }
                
                localStorage.setItem("blooms_unread_counts", totalUnread);
                updateChatNotificationBadge();
            }
        } catch (error) {
            console.log("Error fetching unread counts:", error);
        }
    }

    function updateChatNotificationBadge() {
        const totalUnread = parseInt(localStorage.getItem("blooms_unread_counts") || "0", 10);
        
        // Update Desktop/Mobile Nav Icon
        const chatNavItems = document.querySelectorAll('.nav-item[href="chat.html"], .nav-item[onclick*="chat.html"]');
        
        chatNavItems.forEach(item => {
            let badge = item.querySelector('.nav-notification-badge');
            if (totalUnread > 0) {
                if (!badge) {
                    badge = document.createElement('span');
                    badge.className = 'nav-notification-badge';
                    item.style.position = 'relative'; // Ensure positioning
                    item.appendChild(badge);
                }
                badge.textContent = totalUnread > 99 ? '99+' : totalUnread;
            } else {
                if (badge) badge.remove();
            }
        });

        // Update Hamburger Menu Icon
        const hamburgerBtn = document.querySelector('.hamburger-menu, .hamburger-btn, #mobile-menu-btn');
        if (hamburgerBtn) {
            let dot = hamburgerBtn.querySelector('.hamburger-notification-dot');
            if (totalUnread > 0) {
                if (!dot) {
                    dot = document.createElement('span');
                    dot.className = 'hamburger-notification-dot';
                    hamburgerBtn.style.position = 'relative';
                    hamburgerBtn.appendChild(dot);
                }
            } else {
                if (dot) dot.remove();
            }
        }
    }

    // Initialize polling
    if (localStorage.getItem("token")) {
        updateChatNotificationBadge(); // Initial UI update from localStorage
        fetchUnreadCounts(); // Immediate fetch
        unreadPollInterval = setInterval(fetchUnreadCounts, 5000); // Poll every 5s
    }

    // Make updateChatNotificationBadge globally available if needed
    window.updateChatNotificationBadge = updateChatNotificationBadge;
})();