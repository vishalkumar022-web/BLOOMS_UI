// ============================================================================
// 🌐 1. GLOBAL VARIABLES & SECURITY
// ============================================================================
const BASE_URL = "https://blog-management-system-blooms-2.onrender.com";

let myUserId = "";
let myFollowingList = [];

// 🚨 Search ke variables (7 items per page as requested)
let currentPage = 0;       
const pageSize = 7;       
let isSearching = false;   
let searchText = ""; 

// Modal live search ke liye list
let currentModalData = []; 

function checkTokenLive() {
    const t = localStorage.getItem("token");
    if (!t) { window.location.replace("login.html"); return false; }
    return t; 
}

// ============================================================================
// 👤 2. LOAD PROFILE & ABOUT ME MAGIC
// ============================================================================
async function loadProfilePage() {
    try {
        const liveToken = checkTokenLive(); if(!liveToken) return;

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

            renderTabContent("content-blogs", user.myCreatedBlogs, "fa-newspaper", "No Blogs Posted Yet");
            renderTabContent("content-categories", user.myCreatedCategories, "fa-layer-group", "No Categories Created");
            renderTabContent("content-subcategories", user.myCreatedSubCategories, "fa-tags", "No Subcategories Created");

            const fRes = await fetch(`${BASE_URL}/api/connection/following?userId=${myUserId}`, { method: "GET", headers: { "Authorization": "Bearer " + liveToken } });
            const fData = await fRes.json();
            if(fData.success) myFollowingList = fData.data.map(p => p.userId);

            // 🚨 JADOO: Read More / Scrollbar logic call karna
            formatAboutMe(user.aboutMe, "my-about-me");
        }
    } catch (e) { console.log("Profile load failed", e); }
}

// 🤔 Ye function About Me lamba hone par Read More lagata hai aur scrollbar lata hai!
function formatAboutMe(text, elementId) {
    const container = document.getElementById(elementId);
    if (!text) {
        container.innerHTML = "I'm using Blooms! 🌿";
        container.classList.remove("scrollable-desc"); 
        return;
    }
    
    // Agar bio 80 words se lamba hai toh
    if (text.length > 80) {
        let shortText = text.substring(0, 80) + "...";
        container.classList.remove("scrollable-desc"); // Pehle scroll hatao
        
        container.innerHTML = `
            <span id="${elementId}-text">${shortText}</span>
            <a href="javascript:void(0)" id="${elementId}-btn" style="color:#0a66c2; font-weight:bold; text-decoration:none; margin-left:5px;">Read More</a>
        `;
        
        // Read More dabane par kya ho?
        document.getElementById(`${elementId}-btn`).onclick = function() {
            let btn = document.getElementById(`${elementId}-btn`);
            let txtSpan = document.getElementById(`${elementId}-text`);
            
            if (btn.innerText === "Read More") {
                txtSpan.innerText = text; // Poora padhao
                container.classList.add("scrollable-desc"); // 🚨 Scrollbar lagao!
                btn.innerText = "Show Less";
            } else {
                txtSpan.innerText = shortText; // Wapas chhota karo
                container.classList.remove("scrollable-desc"); // 🚨 Scrollbar hatao!
                btn.innerText = "Read More";
                container.scrollTop = 0; 
            }
        };
    } else {
        container.innerText = text;
        container.classList.remove("scrollable-desc");
    }
}

function renderTabContent(containerId, listData, iconClass, emptyMessage) {
    const container = document.getElementById(containerId);
    let html = "";
    if (listData && listData.length > 0) {
        for (let itemTitle of listData) {
            html += `<div class="mini-card"><i class="fa-solid ${iconClass}"></i><h3>${itemTitle}</h3></div>`;
        }
    } else { html = `<p style="grid-column: 1 / -1; text-align:center; color:#888; padding: 40px;">${emptyMessage}</p>`; }
    container.innerHTML = html;
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-item').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.content-grid').forEach(content => content.classList.remove('active'));
    document.getElementById(`tab-${tabName}`).classList.add('active');
    document.getElementById(`content-${tabName}`).classList.add('active');
}

// ============================================================================
// 🔍 3. MAIN SEARCH LOGIC (Blank Screen Fix + Pagination)
// ============================================================================
document.getElementById("search-input").addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
        event.preventDefault(); 
        let userInput = this.value.trim();
        if (userInput !== "") {
            isSearching = true; searchText = userInput; currentPage = 0;
            // 🚨 Naya HTML structure use kar rahe hain
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
            // 🚨 FIX: Jab search empty ho toh user ko message dikhao!
            document.getElementById("users-grid").innerHTML = `<div style="grid-column:1/-1; text-align:center; padding: 40px; background:#fff; border-radius:10px;"><h3>Sorry bhai, "${searchText}" naam ka koi user nahi mila! 😔</h3></div>`;
            document.getElementById("pagination-container").innerHTML = "";
        }
    } catch (e) { 
        document.getElementById("users-grid").innerHTML = `<div style="grid-column:1/-1; text-align:center; padding: 40px; background:#fff; border-radius:10px;"><h3 style="color:red;">Server connection failed! 🔌</h3></div>`;
    }
}

// ============================================================================
// 🚨 NAYA: SEARCH RESULTS LinkedIn Style format me print karna (Clickable Profiles)
// 🤔 Kyu banaya?: Search Result professional list ki tarah dekhe aur har userclickable ho.
// Main page profile pe About me ReadMore work krta rhega.
// ============================================================================
function printUsersOnScreen(usersArray) {
    let html = "";
    // Loop (Loop lagaya pore users ke result pe)
    for(let user of usersArray) {
        if(user.userId === myUserId) continue; // Khud ko result me mat dikhao

        // User photo, agr nai hai toh dummy photo
        let pic = user.profileUrl || `https://ui-avatars.com/api/?name=${user.userName}&background=random`;
        let isFollowing = myFollowingList.includes(user.userId);
        
        // 🚨 NAYA BUTTON DESIGN (defined in profile.css)
        // Screenshot me jaise outline wale professional button hain
        let btnHtml = isFollowing 
            ? `<button class="follow-btn-small btn-grey-outline" onclick="actionFromSearch('${user.userId}', 'unfollow', event)"><i class="fa-solid fa-check"></i> Unfollow</button>`
            : `<button class="follow-btn-small btn-blue-outline" onclick="actionFromSearch('${user.userId}', 'follow', event)"><i class="fa-solid fa-plus"></i> Follow</button>`;

        // ====================================================================
        // 🚨 USER KA POINT: Search result user info k 'About Me' ko truncate karna (Kaatna)
        // Agr about me 120 character se bada hai toh kat kar '...' lagao
        // (Iska asar profile main page wale readmore k scrollbar pe nahi parega)
        // ====================================================================
        let bioText = user.aboutMe ? user.aboutMe : "I'm using Blooms! 🌿";
        if (bioText.length > 120) {
            bioText = bioText.substring(0, 120) + "..."; // 120 character ke baad kat diya
        }

        // Exact Professional format (Same as LinkedIn screenshot look)
        // NAYA: Poore card ko Anchor Link (<a>) ke andar daal diya Navigation k liye targetUser id ke sath
        html += `
            <a href="viewprofile.html?userId=${user.userId}" class="user-search-card" style="text-decoration:none; color:inherit;">
                <img src="${pic}" class="user-search-pic" alt="dp">
                
                <div class="user-search-info">
                    <strong>${user.userName}</strong>
                    <p class="user-fullname">${user.name || 'User'}</p>
                    <p class="user-short-bio">${bioText}</p> 
                </div>
                
                <div style="flex-shrink: 0; z-index: 10;">
                    ${btnHtml}
                </div>
            </a>
        `;
    }
    // Saara data HTML dabbe me bhar do
    document.getElementById("users-grid").innerHTML = html;
}


function printUserPagination(currentCount) {
    const cont = document.getElementById("pagination-container");
    let html = `<div style="display:flex; justify-content:space-between; margin-top:20px; width:100%;">`;
    
    if(currentPage === 0) html += `<button disabled style="padding:10px 20px; background:#ccc; border:none; border-radius:5px;">⬅️ Previous</button>`;
    else html += `<button onclick="currentPage--; getSearchedUsers();" style="padding:10px 20px; background:#0a66c2; color:white; border:none; border-radius:5px; cursor:pointer;">⬅️ Previous</button>`;
    
    html += `<span style="font-weight:bold; align-self:center;">Page ${currentPage+1}</span>`;
    
    // Page Size 7 fixed hai global variables me
    if(currentCount < pageSize) html += `<button disabled style="padding:10px 20px; background:#ccc; border:none; border-radius:5px;">Next ➡️</button>`;
    else html += `<button onclick="currentPage++; getSearchedUsers();" style="padding:10px 20px; background:#0a66c2; color:white; border:none; border-radius:5px; cursor:pointer;">Next ➡️</button>`;
    
    html += `</div>`;
    cont.innerHTML = html;
}

// ============================================================================
// 🤝 4. ACTION FROM MAIN SEARCH OR MODAL (Follow/Unfollow API)
// ============================================================================
async function actionFromSearch(targetId, action, event) {
    event.preventDefault(); // Button dabaane par link open hone se roko
    event.stopPropagation();

    const liveToken = checkTokenLive(); if(!liveToken) return; 
    try {
        await fetch(`${BASE_URL}/api/connection/${action}?targetUserId=${targetId}`, { method: "POST", headers: { "Authorization": "Bearer " + liveToken }});
        
        // List local memory me update karo
        if (action === 'follow') { myFollowingList.push(targetId); } 
        else { myFollowingList = myFollowingList.filter(id => id !== targetId); }
        
        // Jo screen open hai (Modal ya Search), usko turant refresh karo
        if (isSearching) getSearchedUsers();
        else renderFollowList(currentModalData); 

    } catch(e) { alert("Action failed!"); }
}

// ============================================================================
// 🪟 5. FOLLOW MODAL (Live Search + Buttons)
// ============================================================================
async function openFollowModal(type) {
    document.getElementById("follow-modal-title").innerText = type;
    document.getElementById("modal-search-input").value = ""; // search khali
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
            currentModalData = data.data; // Live search ke liye database save kiya
            renderFollowList(currentModalData);
        } else {
            currentModalData = [];
            document.getElementById("follow-list-container").innerHTML = `<p style="text-align:center; color:#888; padding:30px;">No ${type} found.</p>`;
        }
    } catch (error) { document.getElementById("follow-loader").style.display = "none"; }
}

// 🚨 LIVE SEARCH in Modal: User type karega aur list wahi ke wahi chhoti ho jayegi
document.getElementById("modal-search-input").addEventListener("input", function(e) {
    let query = e.target.value.toLowerCase();
    let filteredList = currentModalData.filter(person => 
        person.userName.toLowerCase().includes(query) || 
        (person.name && person.name.toLowerCase().includes(query))
    );
    renderFollowList(filteredList);
});

// Modal ke andar list chhapna
function renderFollowList(list) {
    let html = "";
    for (let person of list) {
        let pic = person.profileUrl || `https://ui-avatars.com/api/?name=${person.userName}&background=random`;
        let isFollowing = myFollowingList.includes(person.userId);
        
        // 🚨 NAYA: Button wahi Insta style (actionFromSearch function use karke)
        let btnHtml = isFollowing 
            ? `<button onclick="actionFromSearch('${person.userId}', 'unfollow', event)" style="padding:6px 15px; border-radius:8px; background:#fafafa; border:1px solid #ccc; font-weight:bold; color:#555; cursor:pointer; font-size:12px;">Unfollow</button>`
            : `<button onclick="actionFromSearch('${person.userId}', 'follow', event)" style="padding:6px 15px; border-radius:8px; background:#0a66c2; color:white; border:none; font-weight:bold; cursor:pointer; font-size:12px;">Follow</button>`;

        html += `
            <div class="list-user-box" style="display:flex; justify-content:space-between; align-items:center; padding:10px 15px; border-bottom:1px solid #f0f0f0;">
                <a href="viewprofile.html?userId=${person.userId}" style="text-decoration:none; display:flex; align-items:center; color:#333; flex:1;">
                    <img src="${pic}" style="width:44px; height:44px; border-radius:50%; margin-right:15px; object-fit:cover;">
                    <div style="display:flex; flex-direction:column;">
                        <strong style="font-size:14px; font-weight:600;">${person.userName}</strong>
                        <span style="font-size:12px; color:#888;">${person.name || 'User'}</span>
                    </div>
                </a>
                <div style="margin-left: 10px; z-index:10;">
                    ${btnHtml}
                </div>
            </div>
        `;
    }
    document.getElementById("follow-list-container").innerHTML = html || "<p style='text-align:center; padding:20px; color:#888;'>No matches found.</p>";
}

// ============================================================================
// ➕ 6. POST KARNE WALE MODALS (Category, Subcategory, Blog)
// ============================================================================
function openModal(modalId) { 
    document.getElementById(modalId).classList.add("show"); 
    if(modalId === 'create-subcategory-modal' || modalId === 'create-blog-modal') {
        loadCategoriesForDropdown();
    }
}
function closeModal(modalId) { document.getElementById(modalId).classList.remove("show"); }

async function loadCategoriesForDropdown() {
    try {
        const token = checkTokenLive(); if(!token) return;
        const res = await fetch(`${BASE_URL}/api/Category/all?page=0&size=100`, { headers: { "Authorization": "Bearer " + token }});
        const data = await res.json();
        if (data.success) {
            let optionsHtml = `<option value="">Select Category</option>`;
            data.data.forEach(cat => { optionsHtml += `<option value="${cat.id}">${cat.title}</option>`; });
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
            data.data.forEach(sub => { optionsHtml += `<option value="${sub.subCategoryId}">${sub.subCategoryTittle}</option>`; });
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

window.addEventListener('click', function(event) { if (event.target === document.getElementById("follow-modal")) { closeModal('follow-modal'); } });
document.getElementById("logout-btn").addEventListener("click", function() { localStorage.clear(); window.location.replace("login.html"); });

if (checkTokenLive()) loadProfilePage();