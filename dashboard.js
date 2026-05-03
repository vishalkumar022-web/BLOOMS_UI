const BASE_URL = "https://blog-management-system-blooms-2.onrender.com";
const token = localStorage.getItem("token");

// 1. SECURITY CHECK (Ticket hai ya nahi?)
if (!token) {
    alert("Bhai, bina login ke entry mana hai! 🛑");
    window.location.href = "login.html";
}

// 2. LOGOUT LOGIC
document.getElementById("logout-btn").addEventListener("click", function() {
    localStorage.clear();
    window.location.href = "login.html";
});

document.getElementById("profile-btn").addEventListener("click", function() {
    // Jab tu my profile page banayega
    window.location.href = "myprofile.html"; 
});

// ==========================================
// 3. FETCH MY PROFILE (LEFT SIDEBAR UPDATE KARNA)
// ==========================================
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
            
            // Naam, role aur ID HTML me dalna
            document.getElementById("sidebar-name").innerText = user.name || user.userName;
            document.getElementById("sidebar-role").innerText = user.role.toUpperCase() + " • Java Developer"; 
            document.getElementById("sidebar-userid").innerText = "User ID: " + user.userId.substring(0,10) + "...";
            
            // ✅ FIX: Profile Image ka jugaad (agar URL mili hai toh lagao)
            if (user.profileUrl) {
                const imgElement = document.getElementById("sidebar-profile-img");
                imgElement.src = user.profileUrl;
                
                // Agar user ne koi aisi link daal di jo photo nahi hai, toh automatically ek Pyaara sa Avatar ban jayega
                imgElement.onerror = function() {
                    this.src = `https://ui-avatars.com/api/?name=${user.name || 'User'}&background=0a66c2&color=fff&size=150`;
                };
            }
        }
    } catch (error) {
        console.log("Profile load nahi ho payi.");
    }
}


// ==========================================
// 4. FETCH BLOGS 
// ==========================================
async function fetchAndShowBlogs() {
    const feedContainer = document.getElementById("blog-feed");
    const loader = document.getElementById("loading");

    try {
        const response = await fetch(BASE_URL + "/api/BLog?page=0&size=10", {
            method: "GET",
            headers: {
                "Authorization": "Bearer " + token, 
                "Content-Type": "application/json"
            }
        });

        const data = await response.json();
        loader.style.display = "none";

        if (data.success === true && data.data.length > 0) {
            let allBlogsHTML = ""; 

            // Ek-ek blog ko padho
            for (let blog of data.data) {
                
                const randomBlogImage = `https://picsum.photos/seed/${blog.blogId}/800/400`;
                const authorPic = `https://ui-avatars.com/api/?name=${blog.authorId}&background=random`;
                const category = blog.categoryName ? blog.categoryName : "General";
                const subCategory = blog.subCategoryName ? blog.subCategoryName : "Updates";

                const singleBlogCard = `
                    <div class="blog-card">
                        <div class="card-header">
                            <img src="${authorPic}" alt="Author" class="author-pic">
                            <div class="author-info">
                                <h4>Author ID: ${blog.authorId.substring(0,8)}...</h4>
                                <p>Just now • Published</p>
                            </div>
                        </div>

                        <div class="blog-meta">
                            <span>ID: ${blog.blogId.substring(0,8)}...</span>
                            <span>${category} • ${subCategory}</span>
                        </div>

                        <img src="${randomBlogImage}" alt="Blog Cover" class="blog-image">

                        <div class="card-body">
                            <h2 class="blog-title">${blog.title}</h2>
                            <p class="blog-desc">${blog.description}</p>
                            <p style="font-size: 14px; color: #555; margin-top:10px;">${blog.content.substring(0, 150)}... <a href="#" style="color:#0a66c2; text-decoration:none; font-weight:600;">Read more</a></p>
                        </div>

                        <div class="card-footer">
                            <button class="action-btn" onclick="alert('Like clicked!')">
                                <i class="fa-regular fa-thumbs-up"></i> Like (${blog.likeCount})
                            </button>
                            <button class="action-btn" onclick="alert('Comment clicked!')">
                                <i class="fa-regular fa-comment-dots"></i> Comment (${blog.commentCount})
                            </button>
                        </div>
                    </div>
                `;
                allBlogsHTML += singleBlogCard;
            }

            feedContainer.innerHTML = allBlogsHTML;

        } else {
            feedContainer.innerHTML = "<p style='text-align:center;'>No blogs found. Start writing!</p>";
        }

    } catch (error) {
        loader.innerHTML = "❌ Failed to load blogs. Server error!";
    }
}

// Dono functions ko start kar do
loadMyProfile();
fetchAndShowBlogs();