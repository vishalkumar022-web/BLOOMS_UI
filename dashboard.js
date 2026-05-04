// ============================================================================
// 🌐 1. SETUP AUR SECURITY CHECK
// ============================================================================
const BASE_URL = "https://blog-management-system-blooms-2.onrender.com";

// Har action se pehle Token check karne wala function (Live Security)
function checkTokenLive() {
    const liveToken = localStorage.getItem("token");
    if (!liveToken) {
        alert("You are never allowed to access this function because of an expired/missing token! 🛑");
        window.location.replace("login.html");
        return false; 
    }
    return liveToken; 
}

const initialToken = localStorage.getItem("token");
const myUserName = localStorage.getItem("userName"); 

if (!initialToken) {
    document.body.style.display = "none"; 
    alert("Bhai, bina login ke entry mana hai! 🛑");
    window.location.replace("login.html"); 
}


// ============================================================================
// 📦 2. GLOBAL VARIABLES
// ============================================================================
let currentPage = 0;       
const pageSize = 5;        // Search result me ek page par 5 blogs aayenge
let isSearching = false;   
let searchText = "";       

let myUserId = "";         
let myFollowingList = [];  
let currentLoadedBlogs = []; 


// // ============================================================================
// 👤 3. PROFILE AUR FOLLOWING LIST MANGWANE WALA FUNCTION
// ============================================================================
async function loadMyProfile() {
    try {
        const liveToken = checkTokenLive(); if(!liveToken) return;

        const response = await fetch(BASE_URL + "/api/User/me", {
            method: "GET",
            headers: { "Authorization": "Bearer " + liveToken }
        });
        const data = await response.json();

        if (data.success === true) {
            const user = data.data;
            myUserId = user.userId; 
            
            // 1. Basic Details
            document.getElementById("sidebar-name").innerText = user.name || user.userName;
            document.getElementById("sidebar-role").innerText = user.role.toUpperCase() + " • Java Developer"; 
            document.getElementById("sidebar-userid").innerText = "ID: " + user.userId.substring(0,8);
            
            // 2. Profile DP Set Karna
            if (user.profileUrl) {
                const imgElement = document.getElementById("sidebar-profile-img");
                imgElement.src = user.profileUrl;
                imgElement.onerror = function() {
                    this.src = `https://ui-avatars.com/api/?name=${user.name || 'User'}&background=0a66c2&color=fff&size=150`;
                };
            }

            // 🟢 3. NAYA LOGIC: Background Image Set Karna
            if (user.profileBackgroundUrl) {
                // CSS background-image property ko JS se badal rahe hain
                document.getElementById("sidebar-bg-img").style.backgroundImage = `url('${user.profileBackgroundUrl}')`;
            }

            // 🟢 4. NAYA LOGIC: About Me Set Karna
            if (user.aboutMe) {
                document.getElementById("sidebar-about").innerText = `"${user.aboutMe}"`;
            } else {
                document.getElementById("sidebar-about").innerText = "No bio added yet. Tell us about yourself!";
            }

            // 5. Following List Mangwana
            const followResponse = await fetch(`${BASE_URL}/api/connection/following?userId=${myUserId}`, {
                method: "GET", headers: { "Authorization": "Bearer " + liveToken }
            });
            const followData = await followResponse.json();
            
            if(followData.success === true) {
                myFollowingList = followData.data.map(person => person.userId);
            }

        } else {
            localStorage.clear();
            alert("Bhai, tera session expire ho gaya hai. Dobara login kar!");
            window.location.replace("login.html");
        }
    } catch (error) {
        document.getElementById("sidebar-name").innerText = "Error Loading";
    }
}

// ============================================================================
// 🟢 4. BLOGS FETCH KARNE WALE FUNCTIONS
// ============================================================================
async function getNormalBlogs() {
    showLoader(true); 
    try {
        const liveToken = checkTokenLive(); if(!liveToken) return;

        // 🚨 NAYA LOGIC: Normal page ke liye hum ek hi baar me zyada blogs (size=50) mangwayenge, 
        // taaki user bina rukawat scroll kar sake. Yahan page hamesha 0 rahega.
        const url = `${BASE_URL}/api/BLog?page=0&size=50`; 
        const response = await fetch(url, { method: "GET", headers: { "Authorization": "Bearer " + liveToken } });
        const data = await response.json();
        showLoader(false); 

        if (data.success === true && data.data.length > 0) {
            currentLoadedBlogs = data.data; 
            printBlogsOnScreen(data.data);  
            // Yahan se bhi printPaginationButtons call hoga, 
            // par uske andar ka if(isSearching === false) usko rok dega!
            printPaginationButtons(data.data.length); 
        } else {
            document.getElementById("blog-feed").innerHTML = "<p style='text-align:center;'>Bhai, koi blog nahi mila!</p>";
        }
    } catch (error) {
        showLoader(false);
    }
}

async function getSearchedBlogs() {
    showLoader(true);
    try {
        const liveToken = checkTokenLive(); if(!liveToken) return;

        // Search me hum page size 5 rakhenge taaki Pagination chal sake
        const url = `${BASE_URL}/api/BLog/search?title=${encodeURIComponent(searchText)}&page=${currentPage}&size=${pageSize}`;
        const response = await fetch(url, { method: "GET", headers: { "Authorization": "Bearer " + liveToken } });
        const data = await response.json();
        showLoader(false);

        if (data.success === true && data.data.length > 0) {
            currentLoadedBlogs = data.data; 
            printBlogsOnScreen(data.data); 
            printPaginationButtons(data.data.length); // Yahan pagination button print hoga
        } else {
            document.getElementById("blog-feed").innerHTML = `
                <div style="text-align:center; padding:30px;">
                    <h3>Bhai, "${searchText}" naam se koi blog nahi mila 😔</h3>
                    <button onclick="resetSearch()" style="margin-top:15px; padding:10px; background:#0a66c2; color:white; border:none; border-radius:5px; cursor:pointer;">⬅️ Go Back to Main Feed</button>
                </div>
            `;
        }
    } catch (error) {
        showLoader(false);
    }
}

function fetchDecider() {
    if (isSearching === true) getSearchedBlogs();
    else getNormalBlogs();
}


// ============================================================================
// 🎨 5. HTML BANAKAR SCREEN PAR CHHAPNA
// ============================================================================
function printBlogsOnScreen(blogArray) {
    let allHtml = "";

    // Search Mode ON hai, toh Back button dikhao
    if (isSearching === true) {
        allHtml += `
            <div style="margin-bottom: 20px; padding: 15px; background: white; border-radius: 10px; box-shadow: 0 0 0 1px rgba(0,0,0,0.05), 0 2px 4px rgba(0,0,0,0.08);">
                <button onclick="resetSearch()" style="padding: 8px 15px; background: #666; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">
                    ⬅️ Back to Normal Feed
                </button>
                <h3 style="margin-top: 15px; color: #333;">Search Results for: "<span style="color:#0a66c2;">${searchText}</span>"</h3>
            </div>
        `;
    }

    for (let blog of blogArray) {
        let category = blog.categoryName || "General";
        let subCategory = blog.subCategoryName || "Updates";

        let timeString = "Just now"; 
        if (blog.createdDTTM) {
            let dateObj = new Date(blog.createdDTTM);
            timeString = dateObj.toLocaleDateString() + ", " + dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        }

        let shortContent = blog.content;
        let fullContentHtml = "";
        if (blog.content.length > 150) {
            shortContent = blog.content.substring(0, 150) + "...";
            fullContentHtml = `
                <p id="short-text-${blog.blogId}" class="blog-desc">${shortContent} <a href="javascript:void(0);" onclick="showFullText('${blog.blogId}')" style="color:#0a66c2; font-weight:600; text-decoration:none;">Read more</a></p>
                <p id="full-text-${blog.blogId}" class="blog-desc" style="display:none;">${blog.content} <a href="javascript:void(0);" onclick="showShortText('${blog.blogId}')" style="color:#0a66c2; font-weight:600; text-decoration:none;">Show less</a></p>
            `;
        } else {
            fullContentHtml = `<p class="blog-desc">${blog.content}</p>`;
        }

        let isLikedByMe = blog.likedByUsers.includes(myUserName); 
        let likeIconColor = isLikedByMe ? "#28a745" : "#666"; 
        let likeText = isLikedByMe ? "Liked" : "Like";
        let likedByNamesText = blog.likedByUsers.length > 0 ? blog.likedByUsers.join(", ") : "Be the first to like!";

        let followBtnHtml = "";
        if (blog.authorId !== myUserId) {
            let isFollowing = myFollowingList.includes(blog.authorId);
            if (isFollowing) {
                followBtnHtml = `<button onclick="unfollowUser('${blog.authorId}')" style="padding:4px 15px; font-weight:bold; font-size:13px; border-radius:20px; background:transparent; border:1px solid #666; color:#666; cursor:pointer;">Unfollow</button>`;
            } else {
                followBtnHtml = `<button onclick="followUser('${blog.authorId}')" style="padding:4px 15px; font-weight:bold; font-size:13px; border-radius:20px; background:#0a66c2; border:none; color:white; cursor:pointer;">+ Follow</button>`;
            }
        }

        const card = `
            <div class="blog-card">
                <div class="card-header" style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <div style="display:flex; align-items:center;">
                        <img src="https://ui-avatars.com/api/?name=${blog.authorId}&background=random" class="author-pic">
                        <div class="author-info">
                            <h4><a href="viewprofile.html?userId=${blog.authorId}" style="text-decoration:none; color:#000; transition:color 0.2s;" onmouseover="this.style.color='#0a66c2'" onmouseout="this.style.color='#000'">Author ID: ${blog.authorId.substring(0,8)}</a></h4>
                            <p>${timeString} • ${blog.status }</p> 
                        </div>
                    </div>
                    <div>${followBtnHtml}</div> 
                </div>

                <div class="blog-meta">
                    <span>ID: ${blog.blogId.substring(0,8)}...</span>
                    <span>${category} • ${subCategory}</span>
                </div>

                <!-- 🟢 NAYA LOGIC: Asli image URL dikhao. Agar user ne image nahi dali hai, toh default "No Image" dikhao jisse UI na fite -->
            <img src="${blog.blogImageUrl || 'https://via.placeholder.com/800x400?text=No+Image+Available'}" class="blog-image">

                <div class="card-body">
                    <h2 class="blog-title">${blog.title}</h2>
                    <p style="font-size: 15px; color: #666; margin-bottom: 10px; font-weight:500;">${blog.description}</p>
                    ${fullContentHtml} 
                </div>
                
                <div class="card-footer" style="flex-direction: column;">
                    <p style="font-size: 12px; color: #666; margin-bottom: 10px; padding: 0 10px;">
                        Liked by: <span style="font-weight:bold; color:#0a66c2; cursor:pointer;" onclick="openLikesModal('${blog.blogId}')">${likedByNamesText.substring(0, 50)}${likedByNamesText.length > 50 ? '...' : ''}</span>
                    </p>
                    
                    <div style="display: flex; width: 100%;">
                        <button class="action-btn" onclick="toggleLike('${blog.blogId}')" style="color: ${likeIconColor}; font-weight:bold;">
                            <i class="fa-solid fa-thumbs-up"></i> ${likeText} (${blog.likeCount})
                        </button>
                        <button class="action-btn" onclick="openCommentsModal('${blog.blogId}')">
                            <i class="fa-regular fa-comment-dots"></i> Comment (${blog.commentCount})
                        </button>
                    </div>
                </div>
            </div>
        `;
        allHtml = allHtml + card;
    }

    document.getElementById("blog-feed").innerHTML = allHtml;
}


// ============================================================================
// ⚡ 6. ACTIONS (Like, Comment, Follow) -> HAR ACTION PE TOKEN CHECK!
// ============================================================================

async function toggleLike(blogId) {
    const liveToken = checkTokenLive(); if(!liveToken) return;

    try {
        const response = await fetch(`${BASE_URL}/api/blog/like?blogId=${blogId}`, {
            method: "POST", headers: { "Authorization": "Bearer " + liveToken }
        });
        const data = await response.json();
        if (data.success === true) {
            alert("Blog liked/unliked successfully! 👍"); 
            fetchDecider(); 
        } else { alert(data.message); }
    } catch (error) { alert("Like karne me error aaya!"); }
}

async function submitModalComment() {
    const liveToken = checkTokenLive(); if(!liveToken) return; 

    const blogId = document.getElementById("modal-blog-id").value;
    const inputElement = document.getElementById("modal-comment-input");
    const commentText = inputElement.value.trim();

    if (commentText === "") { alert("Bhai, khali comment thodi post hoga!"); return; }

    try {
        const url = `${BASE_URL}/api/blog/comment?blogId=${blogId}&text=${encodeURIComponent(commentText)}`;
        const response = await fetch(url, { method: "POST", headers: { "Authorization": "Bearer " + liveToken } });
        const data = await response.json();
        
        if (data.success === true) {
            alert("Comment posted successfully! 💬");
            inputElement.value = ""; 
            closeModal("comments-modal"); 
            fetchDecider(); 
        } else { alert("Error: " + data.message); }
    } catch (error) { alert("Server error!"); }
}

async function followUser(targetUserId) {
    const liveToken = checkTokenLive(); if(!liveToken) return; 

    try {
        const response = await fetch(`${BASE_URL}/api/connection/follow?targetUserId=${targetUserId}`, {
            method: "POST", headers: { "Authorization": "Bearer " + liveToken }
        });
        const data = await response.json();
        if (data.success) {
            alert("Successfully followed! ✅"); 
            myFollowingList.push(targetUserId); 
            fetchDecider(); 
        } else { alert(data.message); }
    } catch (error) { alert("Follow karne me error aa gaya bhai!"); }
}

async function unfollowUser(targetUserId) {
    const liveToken = checkTokenLive(); if(!liveToken) return; 

    try {
        const response = await fetch(`${BASE_URL}/api/connection/unfollow?targetUserId=${targetUserId}`, {
            method: "POST", headers: { "Authorization": "Bearer " + liveToken }
        });
        const data = await response.json();
        if (data.success) {
            alert("Successfully unfollowed! ❌"); 
            myFollowingList = myFollowingList.filter(id => id !== targetUserId); 
            fetchDecider(); 
        } else { alert(data.message); }
    } catch (error) { alert("Unfollow karne me error aa gaya bhai!"); }
}


// ============================================================================
// 🪟 7. MODALS (Pop-ups)
// ============================================================================
function openLikesModal(blogId) {
    const blog = currentLoadedBlogs.find(b => b.blogId === blogId);
    let html = "";
    if (blog && blog.likedByUsers.length > 0) {
        for (let user of blog.likedByUsers) {
            html += `<div class="list-item-box"><strong style="color:#0a66c2;">${user}</strong></div>`;
        }
    } else {
        html = "<p style='text-align:center; color:#888;'>No likes yet.</p>";
    }
    document.getElementById("likes-list-container").innerHTML = html;
    document.getElementById("likes-modal").classList.add("show"); 
}

function openCommentsModal(blogId) {
    const blog = currentLoadedBlogs.find(b => b.blogId === blogId);
    let html = "";
    if (blog && blog.comments.length > 0) {
        for (let c of blog.comments) {
            html += `<div class="list-item-box" style="background:#f9f9f9; border-radius:8px; margin-bottom:8px;">
                        <strong style="font-size:14px;">${c.userName || 'Anonymous'}</strong>
                        <p style="font-size:13px; color:#555; margin-top:2px;">${c.commentText}</p>
                     </div>`;
        }
    } else {
        html = "<p style='text-align:center; color:#888;'>No comments yet. Start the conversation!</p>";
    }
    document.getElementById("comments-list-container").innerHTML = html;
    document.getElementById("modal-blog-id").value = blogId; 
    document.getElementById("comments-modal").classList.add("show"); 
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove("show");
}


// ============================================================================
// ⏭️ 8. PAGINATION (Next/Prev Buttons) - 🚨 FIX: Sirf Search Par Chalega!
// ============================================================================
function printPaginationButtons(blogsCount) {
    // 🚨 NAYA LOGIC: Agar normal page hai (Search mode OFF hai), toh yahin se laut jao.
    // Isse normal page par Previous/Next button banega hi nahi!
    if (isSearching === false) {
        return; 
    }
    
    // Yahan se aage ka code sirf SEARCH result aane par hi chalega
    const feedContainer = document.getElementById("blog-feed");
    const btnDiv = document.createElement("div");
    btnDiv.style = "display:flex; justify-content:space-between; margin-top: 20px; margin-bottom: 40px;";

    // Previous Button
    const prevBtn = document.createElement("button");
    prevBtn.innerText = "⬅️ Previous";
    prevBtn.style = `padding: 10px 20px; cursor: pointer; border:none; color:white; border-radius:5px; font-weight:bold; background: ${currentPage === 0 ? '#ccc' : '#0a66c2'};`;
    
    if (currentPage === 0) {
        prevBtn.disabled = true;
    } else {
        prevBtn.onclick = () => { 
            currentPage--; 
            fetchDecider(); 
        };
    }

    // Page Number Dikhana
    const pageText = document.createElement("span");
    pageText.innerText = `Page ${currentPage + 1}`;
    pageText.style = "align-self: center; font-weight: bold; color: #666;";

    // Next Button
    const nextBtn = document.createElement("button");
    nextBtn.innerText = "Next ➡️";
    nextBtn.style = `padding: 10px 20px; cursor: pointer; border:none; color:white; border-radius:5px; font-weight:bold; background: ${blogsCount < pageSize ? '#ccc' : '#0a66c2'};`;
    
    if (blogsCount < pageSize) {
        nextBtn.disabled = true;
    } else {
        nextBtn.onclick = () => { 
            currentPage++; 
            fetchDecider(); 
        };
    }

    btnDiv.appendChild(prevBtn);
    btnDiv.appendChild(pageText);
    btnDiv.appendChild(nextBtn);
    
    feedContainer.appendChild(btnDiv);
    window.scrollTo({ top: 0, behavior: 'smooth' }); 
}


// ============================================================================
// ⚙️ 9. LISTENERS AUR HELPERS
// ============================================================================

function showFullText(blogId) {
    document.getElementById('short-text-' + blogId).style.display = 'none';
    document.getElementById('full-text-' + blogId).style.display = 'block';
}

function showShortText(blogId) {
    document.getElementById('full-text-' + blogId).style.display = 'none';
    document.getElementById('short-text-' + blogId).style.display = 'block';
}

document.getElementById("search-input").addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
        event.preventDefault(); 
        let userInput = this.value.trim();
        if (userInput !== "") {
            isSearching = true; 
            searchText = userInput; 
            currentPage = 0; // Naye search me page 0 se shuru hoga
            fetchDecider();
        } else {
            resetSearch(); 
        }
    }
});

// Wapas Normal Feed Par Aana
function resetSearch() {
    document.getElementById("search-input").value = "";
    isSearching = false; 
    searchText = ""; 
    currentPage = 0; // Wapas pehle page par aao
    fetchDecider();
}

function showLoader(show) { document.getElementById("loading").style.display = show ? "block" : "none"; }

document.getElementById("logout-btn").addEventListener("click", function() { 
    localStorage.clear(); 
    window.location.replace("login.html"); 
});

// ============================================================================
// 🎬 10. APP START 
// ============================================================================
async function startApp() {
    showLoader(true);
    await loadMyProfile(); 
    fetchDecider();        
}
startApp();