// =========================================================
// 🌐 1. SERVER ADDRESS AUR SECURITY CHECK
// =========================================================
const BASE_URL = "https://blog-management-system-blooms-2.onrender.com";
const token = localStorage.getItem("token");

// Bina token walo ko direct bahar phekne ka logic
if (!token) {
    document.body.style.display = "none"; 
    alert("Bhai, bina login ke entry mana hai! 🛑");
    window.location.replace("login.html"); 
}

// =========================================================
// 📦 2. GLOBAL VARIABLES (Poore app me use hone wale)
// =========================================================
let currentPage = 0;       // Page 0 se shuru hoga
const pageSize = 5;        // Ek page pe kitne blog
let isSearching = false;   // Kya user search kar raha hai?
let searchText = "";       // Search dabe me kya likha hai?


// =========================================================
// 👤 3. PROFILE FETCH KARNE KA FUNCTION
// =========================================================
async function loadMyProfile() {
    try {
        const response = await fetch(BASE_URL + "/api/User/me", {
            method: "GET",
            headers: {
                "Authorization": "Bearer " + token,
                "Content-Type": "application/json"
            }
        });

        const data = await response.json();

        // Agar token expire nahi hua hai toh data set karo
        if (data.success === true) {
            const user = data.data;
            document.getElementById("sidebar-name").innerText = user.name || user.userName;
            document.getElementById("sidebar-role").innerText = user.role.toUpperCase() + " • Java Developer"; 
            document.getElementById("sidebar-userid").innerText = "ID: " + user.userId.substring(0,8);
            
            // Profile image set karna (Fail hone par default image)
            if (user.profileUrl) {
                const imgElement = document.getElementById("sidebar-profile-img");
                imgElement.src = user.profileUrl;
                imgElement.onerror = function() {
                    this.src = `https://ui-avatars.com/api/?name=${user.name || 'User'}&background=0a66c2&color=fff&size=150`;
                };
            }
        } else {
            // Agar token expire ho gaya toh batua saaf karo
            localStorage.clear();
            alert("Bhai, tera session expire ho gaya hai. Dobara login kar!");
            window.location.replace("login.html");
        }
    } catch (error) {
        document.getElementById("sidebar-name").innerText = "Error Loading";
    }
}


// =========================================================
// 🟢 4. API CALLING FUNCTIONS (DATA MANGWANA)
// =========================================================

// A. Normal Blogs (Feed) mangwane ke liye
async function getNormalBlogs() {
    showLoader(true); 
    try {
        const url = `${BASE_URL}/api/BLog?page=${currentPage}&size=50`; // 50 blogs aayenge
        const response = await fetch(url, {
            method: "GET",
            headers: { "Authorization": "Bearer " + token }
        });
        const data = await response.json();
        showLoader(false); 

        if (data.success === true && data.data.length > 0) {
            printBlogsOnScreen(data.data); // Screen pe chapo
            printPaginationButtons(data.data.length); // Pagination check karo
        } else {
            document.getElementById("blog-feed").innerHTML = "<p style='text-align:center;'>Bhai, koi blog nahi mila!</p>";
        }
    } catch (error) {
        showLoader(false);
        document.getElementById("blog-feed").innerHTML = "<p style='text-align:center;'>Server se connection toot gaya!</p>";
    }
}

// B. Search kiye hue blogs mangwane ke liye
async function getSearchedBlogs() {
    showLoader(true);
    try {
        const url = `${BASE_URL}/api/BLog/search?title=${encodeURIComponent(searchText)}&page=${currentPage}&size=${pageSize}`;
        const response = await fetch(url, {
            method: "GET",
            headers: { "Authorization": "Bearer " + token }
        });
        const data = await response.json();
        showLoader(false);

        if (data.success === true && data.data.length > 0) {
            printBlogsOnScreen(data.data); 
            printPaginationButtons(data.data.length); 
        } else {
            document.getElementById("blog-feed").innerHTML = `
                <div style="text-align:center; padding:30px;">
                    <h3>Bhai, "${searchText}" naam se koi blog nahi mila 😔</h3>
                    <button onclick="resetSearch()" style="margin-top:15px; padding:10px; background:#0a66c2; color:white; border:none; border-radius:5px; cursor:pointer;">Go Back</button>
                </div>
            `;
        }
    } catch (error) {
        showLoader(false);
    }
}

// C. Decider (Faisla karne wala ki Normal lana hai ya Search wala)
function fetchDecider() {
    if (isSearching === true) {
        getSearchedBlogs();
    } else {
        getNormalBlogs();
    }
}


// =========================================================
// 🎨 5. UI GENERATION (HTML BANANA)
// =========================================================
function printBlogsOnScreen(blogArray) {
    let allHtml = "";

    // Loop chalakar har ek blog ka HTML banana
    for (let blog of blogArray) {
        
        let category = blog.categoryName || "General";
        let subCategory = blog.subCategoryName || "Updates";

        // Date Format karna
        let timeString = "Just now"; 
        if (blog.createdDTTM) {
            let dateObj = new Date(blog.createdDTTM);
            timeString = dateObj.toLocaleDateString() + ", " + dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        }

        // 🟢 READ MORE LOGIC: Agar content lamba hai toh 2 hisso me baato
        let shortContent = blog.content;
        let fullContentHtml = "";
        
        if (blog.content.length > 150) {
            shortContent = blog.content.substring(0, 150) + "...";
            fullContentHtml = `
                <!-- Chhota Text -->
                <p id="short-text-${blog.blogId}" class="blog-desc">
                    ${shortContent} 
                    <a href="javascript:void(0);" onclick="showFullText('${blog.blogId}')" style="color:#0a66c2; font-weight:600; text-decoration:none;">Read more</a>
                </p>
                <!-- Pura Text (Pehle chhupa rahega) -->
                <p id="full-text-${blog.blogId}" class="blog-desc" style="display:none;">
                    ${blog.content} 
                    <a href="javascript:void(0);" onclick="showShortText('${blog.blogId}')" style="color:#0a66c2; font-weight:600; text-decoration:none;">Show less</a>
                </p>
            `;
        } else {
            fullContentHtml = `<p class="blog-desc">${blog.content}</p>`;
        }

        // 🟢 COMMENTS LOGIC: Purane comments dikhane ka HTML
        let commentsListHtml = "";
        if (blog.comments && blog.comments.length > 0) {
            for (let c of blog.comments) {
                commentsListHtml += `
                    <div style="background:#f3f2ef; padding:8px 12px; border-radius:8px; margin-bottom:8px;">
                        <strong style="font-size:13px; color:#000;">${c.userName || 'Anonymous'}</strong>
                        <p style="font-size:13px; color:#555; margin-top:3px;">${c.commentText}</p>
                    </div>
                `;
            }
        } else {
            commentsListHtml = "<p style='font-size:12px; color:#888; text-align:center;'>No comments yet. Be the first to comment!</p>";
        }

        // FINAL CARD HTML
        const card = `
            <div class="blog-card">
                <div class="card-header">
                    <img src="https://ui-avatars.com/api/?name=${blog.authorId}&background=random" class="author-pic">
                    <div class="author-info">
                        <h4>Author ID: ${blog.authorId.substring(0,8)}</h4>
                        <p>${timeString} • Published</p> 
                    </div>
                </div>

                <div class="blog-meta">
                    <span>ID: ${blog.blogId.substring(0,8)}...</span>
                    <span>${category} • ${subCategory}</span>
                </div>

                <img src="https://picsum.photos/seed/${blog.blogId}/800/400" class="blog-image">

                <div class="card-body">
                    <h2 class="blog-title">${blog.title}</h2>
                    <p style="font-size: 15px; color: #666; margin-bottom: 10px; font-weight:500;">${blog.description}</p>
                    
                    <!-- Read More / Show Less Wala Text Yahan Aayega -->
                    ${fullContentHtml}
                </div>
                
                <div class="card-footer">
                    <button class="action-btn" onclick="toggleLike('${blog.blogId}')">
                        <i class="fa-regular fa-thumbs-up"></i> Like (${blog.likeCount})
                    </button>
                    <button class="action-btn" onclick="toggleCommentSection('${blog.blogId}')">
                        <i class="fa-regular fa-comment-dots"></i> Comment (${blog.commentCount})
                    </button>
                </div>

                <!-- 💬 COMMENT SECTION (Dabba) -->
                <div id="comment-section-${blog.blogId}" style="display:none; padding: 15px; border-top: 1px solid #ebebeb;">
                    <div style="max-height: 200px; overflow-y: auto; margin-bottom:15px; padding-right:5px;">
                        ${commentsListHtml}
                    </div>
                    <div style="display:flex; gap:10px;">
                        <input type="text" id="comment-input-${blog.blogId}" placeholder="Write a comment..." 
                            style="flex:1; padding:10px 15px; border-radius:20px; border:1px solid #ccc; outline:none; font-size:13px;">
                        <button onclick="postComment('${blog.blogId}')" 
                            style="background:#0a66c2; color:white; border:none; padding:8px 20px; border-radius:20px; cursor:pointer; font-weight:600;">
                            Post
                        </button>
                    </div>
                </div>

            </div>
        `;
        allHtml = allHtml + card;
    }

    document.getElementById("blog-feed").innerHTML = allHtml;
}


// =========================================================
// ⚡ 6. INTERACTIVE FEATURES (Read More, Like, Comment)
// =========================================================

// A. Pura Text Dikhao (Read More click hone par)
function showFullText(blogId) {
    document.getElementById('short-text-' + blogId).style.display = 'none';
    document.getElementById('full-text-' + blogId).style.display = 'block';
}

// B. Text Chhupao (Show Less click hone par)
function showShortText(blogId) {
    document.getElementById('full-text-' + blogId).style.display = 'none';
    document.getElementById('short-text-' + blogId).style.display = 'block';
}

// C. Like Button Dbana
async function toggleLike(blogId) {
    try {
        const url = `${BASE_URL}/api/blog/like?blogId=${blogId}`;
        const response = await fetch(url, {
            method: "POST",
            headers: { "Authorization": "Bearer " + token }
        });
        const data = await response.json();
        
        if (data.success === true) {
            fetchDecider(); // Page refresh karo taaki naya count dikhe
        } else {
            alert(data.message);
        }
    } catch (error) {
        alert("Like karne me error aaya!");
    }
}

// D. Comment Section Kholna / Band Karna
function toggleCommentSection(blogId) {
    const section = document.getElementById('comment-section-' + blogId);
    if (section.style.display === "none") {
        section.style.display = "block";
    } else {
        section.style.display = "none";
    }
}

// E. Naya Comment Post Karna
async function postComment(blogId) {
    const inputElement = document.getElementById('comment-input-' + blogId);
    const commentText = inputElement.value.trim();

    if (commentText === "") {
        alert("Bhai, kuch likh toh do!");
        return;
    }

    try {
        const url = `${BASE_URL}/api/blog/comment?blogId=${blogId}&text=${encodeURIComponent(commentText)}`;
        const response = await fetch(url, {
            method: "POST",
            headers: { "Authorization": "Bearer " + token }
        });
        const data = await response.json();
        
        if (data.success === true) {
            fetchDecider(); // Page refresh karo taaki naya comment list me dikhe
        } else {
            alert("Error: " + data.message);
        }
    } catch (error) {
        alert("Server error, comment post nahi hua!");
    }
}


// =========================================================
// ⏭️ 7. PAGINATION (Search ke liye Previous/Next)
// =========================================================
function printPaginationButtons(blogsCount) {
    if (isSearching === false) return; // Sirf search me dikhega

    const feedContainer = document.getElementById("blog-feed");
    const btnDiv = document.createElement("div");
    btnDiv.style = "display:flex; justify-content:space-between; margin-bottom: 40px;";

    // Previous Button
    const prevBtn = document.createElement("button");
    prevBtn.innerText = "⬅️ Previous";
    prevBtn.style = "padding: 10px; cursor: pointer; border:none; color:white; border-radius:5px;";
    
    if (currentPage === 0) {
        prevBtn.style.background = "#ccc"; 
        prevBtn.disabled = true;
    } else {
        prevBtn.style.background = "#0a66c2"; 
        prevBtn.onclick = function() {
            currentPage--; 
            fetchDecider(); 
        };
    }

    // Next Button
    const nextBtn = document.createElement("button");
    nextBtn.innerText = "Next ➡️";
    nextBtn.style = "padding: 10px; cursor: pointer; border:none; color:white; border-radius:5px;";
    
    if (blogsCount < pageSize) {
        nextBtn.style.background = "#ccc";
        nextBtn.disabled = true;
    } else {
        nextBtn.style.background = "#0a66c2";
        nextBtn.onclick = function() {
            currentPage++; 
            fetchDecider(); 
        };
    }

    btnDiv.appendChild(prevBtn);
    btnDiv.appendChild(nextBtn);
    feedContainer.appendChild(btnDiv);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}


// =========================================================
// 🛠️ 8. EVENT LISTENERS & HELPERS
// =========================================================

// Search par 'Enter' dabane ka logic
document.getElementById("search-input").addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
        event.preventDefault(); 
        let userInput = this.value.trim();
        
        if (userInput !== "") {
            isSearching = true; 
            searchText = userInput;
            currentPage = 0; 
            fetchDecider();
        } else {
            resetSearch(); 
        }
    }
});

// Search reset karna
function resetSearch() {
    document.getElementById("search-input").value = "";
    isSearching = false; 
    searchText = "";
    currentPage = 0;
    fetchDecider();
}

// Loader dikhana/chupana
function showLoader(show) {
    document.getElementById("loading").style.display = show ? "block" : "none";
}

// Logout karna
document.getElementById("logout-btn").addEventListener("click", function() {
    localStorage.clear();
    window.location.replace("login.html");
});


// =========================================================
// 🚀 APP START
// =========================================================
loadMyProfile(); 
fetchDecider();