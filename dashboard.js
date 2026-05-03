const BASE_URL = "https://blog-management-system-blooms-2.onrender.com";

// =========================================================
// 🛑 STRICT SECURITY CHECK
// =========================================================
const token = localStorage.getItem("token");

if (!token) {
    document.body.style.display = "none"; 
    alert("Bhai, bina login ke entry mana hai! 🛑");
    window.location.replace("login.html"); 
}

// GLOBAL VARIABLES
let currentPage = 0;       
const pageSize = 5;        
let isSearching = false;   
let searchText = "";       

// =========================================================
// 👤 FETCH MY PROFILE (WITH ERROR HANDLING)
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

        if (data.success === true) {
            const user = data.data;
            document.getElementById("sidebar-name").innerText = user.name || user.userName;
            document.getElementById("sidebar-role").innerText = user.role.toUpperCase() + " • Java Developer"; 
            document.getElementById("sidebar-userid").innerText = "ID: " + user.userId.substring(0,8);
            
            if (user.profileUrl) {
                const imgElement = document.getElementById("sidebar-profile-img");
                imgElement.src = user.profileUrl;
                imgElement.onerror = function() {
                    this.src = `https://ui-avatars.com/api/?name=${user.name || 'User'}&background=0a66c2&color=fff&size=150`;
                };
            }
        } else {
            // 🚨 NAYA LOGIC: Agar token expire ho gaya ho toh batua saaf karo aur login par bhejo!
            localStorage.clear();
            alert("Bhai, tera session expire ho gaya hai. Dobara login kar!");
            window.location.replace("login.html");
        }
    } catch (error) {
        document.getElementById("sidebar-name").innerText = "Error Loading";
    }
}


// =========================================================
// 🟢 NORMAL BLOGS FETCH KARNA
// =========================================================
async function getNormalBlogs() {
    showLoader(true); 
    try {
        const url = `${BASE_URL}/api/BLog?page=${currentPage}&size=50`; // Normal feed par zyada blogs layenge (size=50)
        const response = await fetch(url, {
            method: "GET",
            headers: { "Authorization": "Bearer " + token }
        });
        const data = await response.json();
        showLoader(false); 

        if (data.success === true && data.data.length > 0) {
            printBlogsOnScreen(data.data); 
            printPaginationButtons(data.data.length); // Isme maine rok laga di hai (sirf search me dikhega)
        } else {
            document.getElementById("blog-feed").innerHTML = "<p style='text-align:center;'>Bhai, koi blog nahi mila!</p>";
        }
    } catch (error) {
        showLoader(false);
        document.getElementById("blog-feed").innerHTML = "<p style='text-align:center;'>Server se connection toot gaya!</p>";
    }
}


// =========================================================
// 🔵 SEARCH WALE BLOGS FETCH KARNA
// =========================================================
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
            printPaginationButtons(data.data.length); // Search me Next/Prev aayega
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


// =========================================================
// 🎨 HTML BANANA AUR SCREEN PAR DIKHANA (Date & Time Fixed)
// =========================================================
function printBlogsOnScreen(blogArray) {
    let allHtml = "";

    for (let blog of blogArray) {
        
        let category = blog.categoryName;
        if (category == null) { category = "General"; }

        let subCategory = blog.subCategoryName;
        if (subCategory == null) { subCategory = "Updates"; }

        // 🕒 NAYA LOGIC: DATE AUR TIME SET KARNA
        let timeString = "Just now"; // Default agar time na aaye
        if (blog.createdDTTM) {
            // Backend se aayi hui date ko readable format me badalna
            let dateObj = new Date(blog.createdDTTM);
            // Example output: "5/3/2026, 02:30 PM"
            timeString = dateObj.toLocaleDateString() + ", " + dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        }

        const card = `
            <div class="blog-card">
                <div class="card-header">
                    <img src="https://ui-avatars.com/api/?name=${blog.authorId}&background=random" class="author-pic">
                    <div class="author-info">
                        <h4>Author ID: ${blog.authorId.substring(0,8)}</h4>
                        <p>${timeString} • Published</p> <!-- 🕒 YAHAN DATE AUR TIME AAYEGA -->
                    </div>
                </div>

                <div class="blog-meta">
                    <span>ID: ${blog.blogId.substring(0,8)}...</span>
                    <span>${category} • ${subCategory}</span>
                </div>

                <img src="https://picsum.photos/seed/${blog.blogId}/800/400" class="blog-image">

                <div class="card-body">
                    <h2 class="blog-title">${blog.title}</h2>
                    <p class="blog-desc">${blog.description}</p>
                    <p style="font-size: 14px; color: #555; margin-top:10px;">
                        ${blog.content.substring(0, 150)}... <a href="#" style="color:#0a66c2;">Read more</a>
                    </p>
                </div>
                
                <div class="card-footer">
                    <button class="action-btn" onclick="alert('Like feature coming soon!')">
                        <i class="fa-regular fa-thumbs-up"></i> Like (${blog.likeCount})
                    </button>
                    <button class="action-btn" onclick="alert('Comment feature coming soon!')">
                        <i class="fa-regular fa-comment-dots"></i> Comment (${blog.commentCount})
                    </button>
                </div>
            </div>
        `;
        allHtml = allHtml + card;
    }

    document.getElementById("blog-feed").innerHTML = allHtml;
}


// =========================================================
// ⏭️ PREVIOUS / NEXT BUTTONS BANANA
// =========================================================
function printPaginationButtons(blogsCount) {
    
    // 🚨 NAYA LOGIC: Agar search nahi ho raha, toh pagination dikhana hi nahi hai!
    if (isSearching === false) {
        return; // Function ko yahin rok do
    }

    const feedContainer = document.getElementById("blog-feed");
    const btnDiv = document.createElement("div");
    btnDiv.style = "display:flex; justify-content:space-between; margin-bottom: 40px;";

    // 1. Previous Button
    const prevBtn = document.createElement("button");
    prevBtn.innerText = "⬅️ Previous";
    prevBtn.style = "padding: 10px; cursor: pointer; border:none; color:white; border-radius:5px;";
    
    if (currentPage === 0) {
        prevBtn.style.background = "#ccc"; 
        prevBtn.disabled = true;
    } else {
        prevBtn.style.background = "#0a66c2"; 
        prevBtn.onclick = function() {
            currentPage = currentPage - 1; 
            fetchDecider(); 
        };
    }

    // 2. Next Button
    const nextBtn = document.createElement("button");
    nextBtn.innerText = "Next ➡️";
    nextBtn.style = "padding: 10px; cursor: pointer; border:none; color:white; border-radius:5px;";
    
    if (blogsCount < pageSize) {
        nextBtn.style.background = "#ccc";
        nextBtn.disabled = true;
    } else {
        nextBtn.style.background = "#0a66c2";
        nextBtn.onclick = function() {
            currentPage = currentPage + 1; 
            fetchDecider(); 
        };
    }

    btnDiv.appendChild(prevBtn);
    btnDiv.appendChild(nextBtn);
    feedContainer.appendChild(btnDiv);

    window.scrollTo({ top: 0, behavior: 'smooth' });
}


// =========================================================
// 🔀 DECIDER FUNCTION 
// =========================================================
function fetchDecider() {
    if (isSearching === true) {
        getSearchedBlogs();
    } else {
        getNormalBlogs();
    }
}


// =========================================================
// 🔍 SEARCH BOX KA EVENT LISTENER
// =========================================================
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

function resetSearch() {
    document.getElementById("search-input").value = "";
    isSearching = false; 
    searchText = "";
    currentPage = 0;
    fetchDecider();
}


// =========================================================
// 🛠️ HELPER FUNCTIONS
// =========================================================
function showLoader(show) {
    if (show) {
        document.getElementById("loading").style.display = "block";
    } else {
        document.getElementById("loading").style.display = "none";
    }
}

document.getElementById("logout-btn").addEventListener("click", function() {
    localStorage.clear();
    window.location.replace("login.html");
});


// 🚀 START THE APP!
loadMyProfile(); 
fetchDecider();