const BASE_URL = "https://blog-management-system-blooms-2.onrender.com";

// =========================================================
// 🛑 STRICT SECURITY CHECK (Sabse Upar)
// =========================================================
const token = localStorage.getItem("token");

if (!token) {
    // 1. Poori body gayab kar do taaki dashboard ek second ke liye bhi na dikhe
    document.body.style.display = "none"; 
    
    // 2. Alert dikhao
    alert("Bhai, bina login ke entry mana hai! 🛑");
    
    // 3. Wapas login par phek do (replace use kiya taaki user 'Back' dabakar wapas na aa sake)
    window.location.replace("login.html"); 
}


// =========================================================
// 📦 GLOBAL VARIABLES (Jo poore page me use honge)
// =========================================================
let currentPage = 0;       // Page number 0 se start hota hai
const pageSize = 5;        // Ek baar me 5 blog
let isSearching = false;   // Kya user abhi search kar raha hai? (True/False)
let searchText = "";       // User ne kya search kiya?


// =========================================================
// 🟢 FUNCTION 1: NORMAL BLOGS FETCH KARNA
// =========================================================
async function getNormalBlogs() {
    showLoader(true); // Ghoomne wala icon on karo

    try {
        const url = `${BASE_URL}/api/BLog?page=${currentPage}&size=${pageSize}`;
        const response = await fetch(url, {
            method: "GET",
            headers: { "Authorization": "Bearer " + token }
        });
        const data = await response.json();
        
        showLoader(false); // Ghoomne wala icon off karo

        if (data.success === true && data.data.length > 0) {
            printBlogsOnScreen(data.data); // Blogs ko screen par chapo
            printPaginationButtons(data.data.length); // Next/Prev buttons banao
        } else {
            document.getElementById("blog-feed").innerHTML = "<p style='text-align:center;'>Bhai, koi blog nahi mila!</p>";
        }
    } catch (error) {
        showLoader(false);
        alert("Server se connection toot gaya!");
    }
}


// =========================================================
// 🔵 FUNCTION 2: SEARCH WALE BLOGS FETCH KARNA
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
            printPaginationButtons(data.data.length); 
        } else {
            document.getElementById("blog-feed").innerHTML = `
                <div style="text-align:center; padding:30px;">
                    <h3>Bhai, "${searchText}" naam se koi blog nahi mila 😔</h3>
                    <button onclick="resetSearch()" style="margin-top:15px; padding:10px; background:#0a66c2; color:white; border:none; cursor:pointer;">Go Back</button>
                </div>
            `;
        }
    } catch (error) {
        showLoader(false);
        alert("Search kaam nahi kar raha!");
    }
}


// =========================================================
// 🎨 FUNCTION 3: HTML BANANA AUR SCREEN PAR DIKHANA
// =========================================================
function printBlogsOnScreen(blogArray) {
    let allHtml = "";

    // Array me se ek-ek blog nikalo
    for (let blog of blogArray) {
        
        // Agar category null hai toh "General" likh do
        let category = blog.categoryName;
        if (category == null) { category = "General"; }

        let subCategory = blog.subCategoryName;
        if (subCategory == null) { subCategory = "Updates"; }

        // HTML Dabba (Card)
        const card = `
            <div class="blog-card">
                <div class="card-header">
                    <img src="https://ui-avatars.com/api/?name=${blog.authorId}&background=random" class="author-pic">
                    <div class="author-info">
                        <h4>Author ID: ${blog.authorId.substring(0,8)}</h4>
                        <p>Published</p>
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
            </div>
        `;
        allHtml = allHtml + card;
    }

    // Ek saath poora HTML container me daal do
    document.getElementById("blog-feed").innerHTML = allHtml;
}


// =========================================================
// ⏭️ FUNCTION 4: PREVIOUS / NEXT BUTTONS BANANA
// =========================================================
function printPaginationButtons(blogsCount) {
    const feedContainer = document.getElementById("blog-feed");

    // Ek naya div banao jisme buttons honge
    const btnDiv = document.createElement("div");
    btnDiv.style = "display:flex; justify-content:space-between; margin-bottom: 40px;";

    // 1. Previous Button
    const prevBtn = document.createElement("button");
    prevBtn.innerText = "⬅️ Previous";
    prevBtn.style = "padding: 10px; cursor: pointer; border:none; color:white; border-radius:5px;";
    
    // Agar page 0 hai, toh pichhe nahi jaa sakte
    if (currentPage === 0) {
        prevBtn.style.background = "#ccc"; // Grey (Disabled)
        prevBtn.disabled = true;
    } else {
        prevBtn.style.background = "#0a66c2"; // Blue (Active)
        prevBtn.onclick = function() {
            currentPage = currentPage - 1; // Page kam karo
            fetchDecider(); // Wapas API hit karo
        };
    }

    // 2. Next Button
    const nextBtn = document.createElement("button");
    nextBtn.innerText = "Next ➡️";
    nextBtn.style = "padding: 10px; cursor: pointer; border:none; color:white; border-radius:5px;";
    
    // Agar blogs 5 se kam aaye hain, matlab agla page hai hi nahi
    if (blogsCount < pageSize) {
        nextBtn.style.background = "#ccc";
        nextBtn.disabled = true;
    } else {
        nextBtn.style.background = "#0a66c2";
        nextBtn.onclick = function() {
            currentPage = currentPage + 1; // Page badhao
            fetchDecider(); // Wapas API hit karo
        };
    }

    // Buttons ko div me dalo, aur us div ko feed ke neeche dalo
    btnDiv.appendChild(prevBtn);
    btnDiv.appendChild(nextBtn);
    feedContainer.appendChild(btnDiv);

    // Page badalte hi screen ko upar scroll kar do
    window.scrollTo({ top: 0, behavior: 'smooth' });
}


// =========================================================
// 🔀 DECIDER FUNCTION (Ye tay karega ki kya lana hai)
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
        event.preventDefault(); // Page reload roko
        
        let userInput = this.value.trim();
        
        if (userInput !== "") {
            isSearching = true; // Search mode ON
            searchText = userInput;
            currentPage = 0; // Search humesha page 0 se shuru hoga
            fetchDecider();
        } else {
            resetSearch(); // Agar khali Enter mara toh sab normal kar do
        }
    }
});

// Search ko wapas normal karne ka function
function resetSearch() {
    document.getElementById("search-input").value = "";
    isSearching = false; // Search mode OFF
    searchText = "";
    currentPage = 0;
    fetchDecider();
}


// =========================================================
// 🛠️ HELPER FUNCTIONS
// =========================================================

// Loader (Ghoomne wala chakkar) on/off karne ke liye
function showLoader(show) {
    if (show) {
        document.getElementById("loading").style.display = "block";
    } else {
        document.getElementById("loading").style.display = "none";
    }
}

// LOGOUT
document.getElementById("logout-btn").addEventListener("click", function() {
    localStorage.clear();
    window.location.replace("login.html");
});


// 🚀 START THE APP!
fetchDecider(); // Jaise hi page load hoga, ye sabse pehle normal blogs le aayega