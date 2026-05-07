// ============================================================================
// 🌐 1. SETUP & SECURITY (Backend ka address aur Token check)
// ============================================================================
const BASE_URL = "https://blog-management-system-blooms-2.onrender.com";

// Global Variables (Pore page me kahin bhi inko use kar sakte hain)
let myUserId = "";         // Meri khud ki ID yahan save hogi
let myFollowingList = [];  // Main kis-kis ko follow karta hu, uski list

// Search ke Variables (Pagination ke liye)
let currentPage = 0;       
const pageSize = 10;       // Ek page par 10 users aayenge
let isSearching = false;   
let searchText = ""; 

// Jasoos: Check karta hai ki user login hai ya nahi
function checkTokenLive() {
    const t = localStorage.getItem("token");
    if (!t) { 
        window.location.replace("login.html"); // Token nahi hai toh login pe bhagao
        return false; 
    }
    return t; 
}


// ============================================================================
// 👤 2. LOAD PROFILE (Page khulte hi meri saari details lana)
// ============================================================================
async function loadProfilePage() {
    try {
        const liveToken = checkTokenLive(); if(!liveToken) return;

        // Backend se "/me" API hit karke apna data mangwaya
        const res = await fetch(BASE_URL + "/api/User/me", { method: "GET", headers: { "Authorization": "Bearer " + liveToken }});
        const data = await res.json();

        if (data.success) {
            const user = data.data;
            myUserId = user.userId; // Meri ID save kar li
            
            // HTML ke dabbon me backend ka data bhara
            document.getElementById("my-username").innerText = user.userName;
            document.getElementById("my-role").innerText = user.role.toUpperCase();
            document.getElementById("my-fullname").innerText = user.name || "No Name Provided";
            document.getElementById("my-about-me").innerText = user.aboutMe ? user.aboutMe : "I'm using Blooms! 🌿";
            
            // Photo set karna (Agar nahi hai toh dummy lagao)
            document.getElementById("my-profile-pic").src = user.profileUrl || `https://ui-avatars.com/api/?name=${user.name || 'User'}&background=0a66c2&color=fff&size=150`;

            // Follower aur Following ki ginti (Count) set karna
            document.getElementById("count-followers").innerText = user.followerCount || 0;
            document.getElementById("count-following").innerText = user.followingCount || 0;

            // Niche wale tabs (Blogs, Categories, Subcat) me data bharna
            renderTabContent("content-blogs", user.myCreatedBlogs, "fa-newspaper", "No Blogs Posted Yet");
            renderTabContent("content-categories", user.myCreatedCategories, "fa-layer-group", "No Categories Created");
            renderTabContent("content-subcategories", user.myCreatedSubCategories, "fa-tags", "No Subcategories Created");

            // Chupke se Following list bhi mangwa li taaki pata chale kisko unfollow/follow dikhana hai
            const fRes = await fetch(`${BASE_URL}/api/connection/following?userId=${myUserId}`, { method: "GET", headers: { "Authorization": "Bearer " + liveToken } });
            const fData = await fRes.json();
            if(fData.success) {
                // Sirf IDs nikal kar ek list me daal di
                myFollowingList = fData.data.map(p => p.userId); 
            }
        }
    } catch (e) { alert("Error loading profile data!"); }
}

// Ye function tabs ke andar chhote-chhote dabbe banata hai
function renderTabContent(containerId, listData, iconClass, emptyMessage) {
    const container = document.getElementById(containerId);
    let html = "";
    if (listData && listData.length > 0) {
        for (let itemTitle of listData) {
            html += `<div class="mini-card"><i class="fa-solid ${iconClass}"></i><h3>${itemTitle}</h3></div>`;
        }
    } else { 
        html = `<p style="grid-column: 1 / -1; text-align:center; color:#888; padding: 40px;">${emptyMessage}</p>`; 
    }
    container.innerHTML = html;
}

// Instagram jaise Tab change karne wala function
function switchTab(tabName) {
    document.querySelectorAll('.tab-item').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.content-grid').forEach(content => content.classList.remove('active'));
    document.getElementById(`tab-${tabName}`).classList.add('active');
    document.getElementById(`content-${tabName}`).classList.add('active');
}


// ============================================================================
// 🔍 3. SEARCH USERS LOGIC (Navbar me user search karna)
// ============================================================================
document.getElementById("search-input").addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
        event.preventDefault(); 
        let userInput = this.value.trim();
        if (userInput !== "") {
            isSearching = true; searchText = userInput; currentPage = 0;
            // Apna profile chhupao aur Search wala dabba dikhao
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
    // Search dabba chhupao aur wapas Apna Profile dikhao
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
            document.getElementById("users-grid").innerHTML = "<h3 style='grid-column:1/-1; text-align:center;'>No users found! 😔</h3>";
            document.getElementById("pagination-container").innerHTML = "";
        }
    } catch (e) { alert("Search failed!"); }
}

function printUsersOnScreen(usersArray) {
    let html = "";
    for(let user of usersArray) {
        if(user.userId === myUserId) continue; // Khud ko search result me mat dikhao

        let pic = user.profileUrl || `https://ui-avatars.com/api/?name=${user.userName}&background=random`;
        let isFollowing = myFollowingList.includes(user.userId);
        
        // Agar pehle se follow karte hain, toh unfollow button dikhao, nahi toh Follow button
        let btnHtml = isFollowing 
            ? `<button class="follow-btn-small btn-grey" onclick="unfollowUser('${user.userId}')">Unfollow</button>`
            : `<button class="follow-btn-small btn-blue" onclick="followUser('${user.userId}')">+ Follow</button>`;

        // Search list me bhi dusre user ke naam par click karke viewprofile khol sakte hain
        html += `
            <div class="user-search-card">
                <div style="display:flex; align-items:center;">
                    <img src="${pic}" class="user-search-pic">
                    <div class="user-search-info">
                        <h3><a href="viewprofile.html?userId=${user.userId}" style="text-decoration:none; color:#000;">${user.userName}</a></h3>
                        <p>${user.name || 'User'}</p>
                    </div>
                </div>
                <div>${btnHtml}</div>
            </div>
        `;
    }
    document.getElementById("users-grid").innerHTML = html;
}

// User search ke niche wala Previous/Next button logic
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


// ============================================================================
// 🤝 4. REAL FOLLOW / UNFOLLOW API (Alert hta ke Asli action laga diya)
// ============================================================================
async function followUser(targetUserId) {
    const liveToken = checkTokenLive(); if(!liveToken) return; 
    try {
        const response = await fetch(`${BASE_URL}/api/connection/follow?targetUserId=${targetUserId}`, {
            method: "POST", headers: { "Authorization": "Bearer " + liveToken }
        });
        const data = await response.json();
        if (data.success) {
            myFollowingList.push(targetUserId); // Apni local list me update karo
            // Agar search khula hai toh usko refresh karo, nahi toh profile refresh karo
            if(isSearching) getSearchedUsers(); else loadProfilePage(); 
        } 
    } catch (error) { alert("Follow failed!"); }
}

async function unfollowUser(targetUserId) {
    const liveToken = checkTokenLive(); if(!liveToken) return; 
    try {
        const response = await fetch(`${BASE_URL}/api/connection/unfollow?targetUserId=${targetUserId}`, {
            method: "POST", headers: { "Authorization": "Bearer " + liveToken }
        });
        const data = await response.json();
        if (data.success) {
            myFollowingList = myFollowingList.filter(id => id !== targetUserId); // Local list se hatao
            if(isSearching) getSearchedUsers(); else loadProfilePage();
        }
    } catch (error) { alert("Unfollow failed!"); }
}


// ============================================================================
// 🪟 5. FOLLOWERS / FOLLOWING MODAL (Jo tune naya manga tha)
// ============================================================================
// 🤔 Kyu banaya?: Jab tu Followers ya Following text par click karega, tab ye Popup khulega
async function openFollowModal(type) {
    // 1. Modal ka Naam change karo (Followers / Following)
    document.getElementById("follow-modal-title").innerText = type;
    document.getElementById("follow-list-container").innerHTML = "";
    
    // 2. Modal ko screen par dikhao
    document.getElementById("follow-modal").classList.add("show");
    document.getElementById("follow-loader").style.display = "block";

    try {
        const liveToken = checkTokenLive(); if(!liveToken) return;

        // 3. Backend se list mango
        const url = `${BASE_URL}/api/connection/${type}?userId=${myUserId}`;
        const response = await fetch(url, { method: "GET", headers: { "Authorization": "Bearer " + liveToken } });
        const data = await response.json();
        
        document.getElementById("follow-loader").style.display = "none";

        if (data.success && data.data.length > 0) {
            let html = "";
            for (let person of data.data) {
                let pic = person.profileUrl || `https://ui-avatars.com/api/?name=${person.userName}&background=random`;
                
                // 🚨 NAYA LOGIC WALA ANCHOR TAG <a>
                // href me viewprofile.html diya hai jisme uss bande ki ID bhej rahe hain
                // CSS inline likh di hai taaki ekdum Insta jaisa hover effect aur line dikhe
                html += `
                    <a href="viewprofile.html?userId=${person.userId}" style="text-decoration:none; display:flex; align-items:center; padding:12px 15px; border-bottom:1px solid #f0f0f0; color:#333;">
                        <img src="${pic}" style="width:44px; height:44px; border-radius:50%; margin-right:15px; object-fit:cover;">
                        <div style="display:flex; flex-direction:column;">
                            <strong style="font-size:14px; font-weight:600;">${person.userName}</strong>
                            <span style="font-size:12px; color:#888;">${person.name || 'User'}</span>
                        </div>
                    </a>
                `;
            }
            document.getElementById("follow-list-container").innerHTML = html;
        } else {
            // Agar koi follower/following nahi hai
            document.getElementById("follow-list-container").innerHTML = `<p style="text-align:center; color:#888; padding:30px;">No ${type} found.</p>`;
        }
    } catch (error) {
        document.getElementById("follow-loader").style.display = "none";
        document.getElementById("follow-list-container").innerHTML = "<p style='color:red; text-align:center; padding:20px;'>Error loading list!</p>";
    }
}


// ============================================================================
// ➕ 6. POST KARNE WALE MODALS (Blog, Category, Subcategory)
// ============================================================================
function openModal(modalId) { 
    document.getElementById(modalId).classList.add("show"); 
    // Agar Blog ya Subcategory modal khula hai, toh pehle Categories ki dropdown bharni padegi
    if(modalId === 'create-subcategory-modal' || modalId === 'create-blog-modal') {
        loadCategoriesForDropdown();
    }
}
function closeModal(modalId) { 
    document.getElementById(modalId).classList.remove("show"); 
}

// 🪄 Dropdown me Categories ko database se laakar bharna
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
    } catch(e) { console.log("Failed to load categories"); }
}

// 🪄 Category chunne par uski Subcategories ko dropdown me bharna
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
        } else {
            subcatDropdown.innerHTML = `<option value="">No subcategories found</option>`;
        }
    } catch(e) { subcatDropdown.innerHTML = `<option value="">Error</option>`; }
}

// ---------------- Asli Post APIs ----------------
async function submitCategory() {
    const token = checkTokenLive(); if(!token) return;
    const body = {
        title: document.getElementById("cat-title").value,
        desc: document.getElementById("cat-desc").value,
        categoryUrl: document.getElementById("cat-img").value,
        userId: myUserId 
    };
    if(!body.title || !body.desc) return alert("Title and Description are required!");

    const res = await fetch(`${BASE_URL}/api/Category`, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token }, body: JSON.stringify(body) });
    const data = await res.json();
    if(data.success) { alert("Category Sent to Admin For Review! ✅"); closeModal('create-category-modal'); loadProfilePage(); }
    else alert("Error: " + data.message);
}

async function submitSubCategory() {
    const token = checkTokenLive(); if(!token) return;
    const body = {
        categoryId: document.getElementById("subcat-parent-id").value,
        subCategoryTittle: document.getElementById("subcat-title").value,
        subCategoryDesc: document.getElementById("subcat-desc").value,
        subCategoryUrl: document.getElementById("subcat-img").value,
        userId: myUserId
    };
    if(!body.categoryId || !body.subCategoryTittle) return alert("Category and Title required!");

    const res = await fetch(`${BASE_URL}/api/SubCategory`, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token }, body: JSON.stringify(body) });
    const data = await res.json();
    if(data.success) { alert("SubCategory Sent to Admin For Review! ✅"); closeModal('create-subcategory-modal'); loadProfilePage(); }
    else alert("Error: " + data.message);
}

async function submitBlog() {
    const token = checkTokenLive(); if(!token) return;
    const body = {
        blogTitle: document.getElementById("blog-title").value,
        blogDescription: document.getElementById("blog-desc").value,
        blogContent: document.getElementById("blog-content").value,
        blogImageUrl: document.getElementById("blog-img").value,
        blogCategoryId: document.getElementById("blog-cat-id").value,
        blogSubcategoryId: document.getElementById("blog-subcat-id").value,
        userId: myUserId
    };
    if(!body.blogTitle || !body.blogCategoryId || !body.blogContent) return alert("Title, Category, and Content required!");

    const res = await fetch(`${BASE_URL}/api/BLog`, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token }, body: JSON.stringify(body) });
    const data = await res.json();
    if(data.success) { alert("Blog Sent to Admin For Review! ✅"); closeModal('create-blog-modal'); loadProfilePage(); }
    else alert("Error: " + data.message);
}


// ============================================================================
// ⚙️ 7. UTILS & LISTENERS
// ============================================================================
// Modal ke bahar click karne par modal band ho jaye
window.addEventListener('click', function(event) {
    if (event.target === document.getElementById("follow-modal")) { closeModal('follow-modal'); }
});

// Logout Button Logic
document.getElementById("logout-btn").addEventListener("click", function() { 
    localStorage.clear(); 
    window.location.replace("login.html"); 
});

// Profile page reload hote hi sabse pehle kya chalana hai?
if (checkTokenLive()) {
    loadProfilePage();
}