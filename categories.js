// ============================================================================
// 🌐 1. SETUP AUR SECURITY CHECK
// ============================================================================
const BASE_URL = "https://blog-management-system-blooms-2.onrender.com";

// Same security check as Dashboard to ensure only logged in users access
function checkTokenLive() {
    const liveToken = localStorage.getItem("token");
    if (!liveToken) {
        alert("Session expired! Please login again. 🛑");
        window.location.replace("login.html");
        return false; 
    }
    return liveToken; 
}

// ============================================================================
// 📦 2. GLOBAL VARIABLES
// ============================================================================
let currentPage = 0;       
const pageSize = 6;        // 3-3 ke 2 rows par page (Total 6 dabbe per page)
let isSearching = false;   
let searchText = "";       

// ============================================================================
// 🟢 3. API CALLING FUNCTIONS (GET CATEGORIES)
// ============================================================================

// A. Normal Categories Fetch (Infinite Scroll Jaisa)
async function getCategories() {
    showLoader(true); 
    try {
        const liveToken = checkTokenLive(); if(!liveToken) return;

        // API used: GET /api/Category/all?page=0&size=50 (Page 0 fix)
        // Taaki user normally saari categories bina page fite scroll kar sake
        const url = `${BASE_URL}/api/Category/all?page=0&size=50`; 
        const response = await fetch(url, { method: "GET", headers: { "Authorization": "Bearer " + liveToken } });
        const data = await response.json();
        showLoader(false); 

        if (data.success === true && data.data.length > 0) {
            printCategoriesOnScreen(data.data); //  Print categories on screen function call ;


            printPaginationButtons(data.data.length); // Yahan bhi paginate call hoga, par ander jaakar band ho jayega kyunki search off hai
        } else {
            document.getElementById("categories-grid").innerHTML = "<h3 style='grid-column: 1 / -1; text-align:center;'>Bhai, koi category nahi mili!</h3>";
            document.getElementById("pagination-container").innerHTML = ""; 
        }
    } catch (error) {
        showLoader(false);
        document.getElementById("categories-grid").innerHTML = "<p style='grid-column: 1 / -1; text-align:center;'>Server Error!</p>";
    }
}

// B. Search Ki Hui Categories Fetch (PAGINATED 6)
async function getSearchedCategories() {
    showLoader(true);
    try {
        const liveToken = checkTokenLive(); if(!liveToken) return;

        // API used: GET /api/Category/search?title=...&page=...&size=6
        // Taaki searched results me 6-6 per page dikhein aur pagination kaam kare
        const url = `${BASE_URL}/api/Category/search?title=${encodeURIComponent(searchText)}&page=${currentPage}&size=${pageSize}`;
        const response = await fetch(url, { method: "GET", headers: { "Authorization": "Bearer " + liveToken } });
        const data = await response.json();
        showLoader(false);

        if (data.success === true && data.data.length > 0) {
            printCategoriesOnScreen(data.data); 
            printPaginationButtons(data.data.length); // Search mode me ye buttons active rahenge
        } else {
            document.getElementById("categories-grid").innerHTML = `
                <div style="grid-column: 1 / -1; text-align:center; padding:30px;">
                    <h3>Bhai, "${searchText}" naam se koi Category nahi mili 😔</h3>
                    <button onclick="resetSearch()" style="margin-top:15px; padding:10px 20px; background:#0a66c2; color:white; border:none; border-radius:5px; cursor:pointer;">⬅️ Back to All Categories</button>
                </div>
            `;
            document.getElementById("pagination-container").innerHTML = "";
        }
    } catch (error) {
        showLoader(false);
    }
}

// C. Decision maker for which API to call
function fetchDecider() {
    if (isSearching === true) getSearchedCategories();
    else getCategories();
}


function printCategoriesOnScreen(categoryArray) {
    let allHtml = "";

    if (isSearching === true) {
        allHtml += `
            <div style="grid-column: 1 / -1; margin-bottom: 20px; padding: 15px; background: white; border-radius: 10px; box-shadow: 0 0 0 1px rgba(0,0,0,0.05);">
                <button onclick="resetSearch()" style="padding: 8px 15px; background: #666; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">
                    ⬅️ Back to All Categories
                </button>
                <h3 style="margin-top: 15px; color: #333;">Search Results for: "<span style="color:#0a66c2;">${searchText}</span>"</h3>
            </div>
        `;
    }

    for (let cat of categoryArray) {
        
        let timeString = "Just now"; 
        if (cat.createdDTTM) {
            let dateObj = new Date(cat.createdDTTM);
            timeString = dateObj.toLocaleDateString() + ", " + dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        }

        let catStatus = cat.status ? cat.status.toUpperCase() : "PUBLISHED";
        let creatorIdFromBackend = cat.createdByUserId || cat.id; 
        let creatorPicUrl = `https://ui-avatars.com/api/?name=${creatorIdFromBackend}&background=random`;

        let showSubBtnHtml = `<button class="show-sub-btn" onclick="openSubcategoryModal('${cat.id}', '${cat.title}')">Subcategories</button>`;

        let cardHeaderHtml = `
            <div class="card-header">
                <div style="display:flex; align-items:center;">
                    <img src="${creatorPicUrl}" class="author-pic">
                    <div class="author-info">
                        <h4><a href="viewprofile.html?userId=${creatorIdFromBackend}" style="text-decoration:none; color:#000; transition:color 0.2s;" onmouseover="this.style.color='#0a66c2'" onmouseout="this.style.color='#000'">Author ID: ${creatorIdFromBackend.substring(0,8)}</a></h4>
                        <p>${timeString} • ${catStatus}</p> 
                    </div>
                </div>
                <div>${showSubBtnHtml}</div> 
            </div>
        `;

        // ====================================================================
        // 🚨 NAYA LOGIC: CATEGORY ID WALA DABBA (Full ID for user convenience)
        // ====================================================================
        // Isme hum cat.id.substring() use NAHI kar rahe, directly pura cat.id de rahe hain.
        let metaHtml = `
            <div class="category-id-box">
                <strong>Category ID :-</strong> ${cat.id}
            </div>
        `;

        let imgSource = cat.categoryUrl ? cat.categoryUrl : "https://via.placeholder.com/400x250?text=No+Image+Available";
        let cardImageHtml = `<img src="${imgSource}" class="category-img" alt="${cat.title}">`;

        let statusBadgeHtml = `<span class="status-badge">Active</span>`;
        let fullDescription = cat.desc;
        let finalDescriptionHtml = "";
        
        if (fullDescription.length > 100) {
            let shortDescription = fullDescription.substring(0, 100) + "...";
            finalDescriptionHtml = `
                <p id="short-desc-${cat.id}" class="category-desc">
                    ${shortDescription} 
                    <a href="javascript:void(0);" onclick="showFullDesc('${cat.id}')" class="read-more-link">Read More</a>
                </p>
                <p id="full-desc-${cat.id}" class="category-desc" style="display:none;">
                    ${fullDescription} 
                    <a href="javascript:void(0);" onclick="showShortDesc('${cat.id}')" class="read-more-link">Show Less</a>
                </p>
            `;
        } else {
            finalDescriptionHtml = `<p class="category-desc">${fullDescription}</p>`;
        }

        let cardBodyHtml = `
            <div class="category-body">
                <h2 class="category-title">${cat.title} ${statusBadgeHtml}</h2>
                ${finalDescriptionHtml}
            </div>
        `;

        const completeCard = `
            <div class="category-card">
                ${cardHeaderHtml}
                ${metaHtml} <!-- Full Category ID Print Hogi -->
                ${cardImageHtml}
                ${cardBodyHtml}
            </div>
        `;
        allHtml += completeCard; 
    }

    document.getElementById("categories-grid").innerHTML = allHtml;
}

// ============================================================================
// ⏭️ 5. PAGINATION (Next/Prev Buttons) - ONLY FOR SEARCH
// ============================================================================
// 🤔 Kyu banaya?: Taaki jab search ho tabhi page 1, 2, 3 dikhein, main page par user bas scroll kare.
function printPaginationButtons(currentCount) {
    const paginationContainer = document.getElementById("pagination-container");
    paginationContainer.innerHTML = ""; 

    // THE SECURITY GUARD: Agar user normally categories dekh rha hai (isSearching off hai),
    // toh wapas jaao. Main page par Previous/Next banega hi nahi, feed infinite scroll lgegi!
    if (isSearching === false) {
        return; 
    }
    
    const btnDiv = document.createElement("div");
    btnDiv.style = "display:flex; justify-content:space-between; margin-top: 30px; margin-bottom: 40px; width: 100%; grid-column: 1 / -1;";

    // Previous Button logic
    const prevBtn = document.createElement("button");
    prevBtn.innerText = "⬅️ Previous";
    prevBtn.style = `padding: 10px 20px; cursor: pointer; border:none; color:white; border-radius:5px; font-weight:bold; background: ${currentPage === 0 ? '#ccc' : '#0a66c2'};`;
    if (currentPage === 0) { prevBtn.disabled = true; } 
    else { prevBtn.onclick = () => { currentPage--; fetchDecider(); }; }

    const pageText = document.createElement("span");
    pageText.innerText = `Page ${currentPage + 1}`;
    pageText.style = "align-self: center; font-weight: bold; color: #666;";

    // Next Button logic
    const nextBtn = document.createElement("button");
    nextBtn.innerText = "Next ➡️";
    nextBtn.style = `padding: 10px 20px; cursor: pointer; border:none; color:white; border-radius:5px; font-weight:bold; background: ${currentCount < pageSize ? '#ccc' : '#0a66c2'};`;
    if (currentCount < pageSize) { nextBtn.disabled = true; } 
    else { nextBtn.onclick = () => { currentPage++; fetchDecider(); }; }

    btnDiv.appendChild(prevBtn);
    btnDiv.appendChild(pageText);
    btnDiv.appendChild(nextBtn);
    
    paginationContainer.appendChild(btnDiv);
    window.scrollTo({ top: 0, behavior: 'smooth' }); 
}


// ============================================================================
// ⚙️ 6. LISTENERS & HELPERS (Readmore, Search)
// ============================================================================

// Read more functions (Brute force: get ID, hide short tag, show full tag)
function showFullDesc(catId) {
    document.getElementById('short-desc-' + catId).style.display = 'none';
    document.getElementById('full-desc-' + catId).style.display = 'block';
}

function showShortDesc(catId) {
    document.getElementById('full-desc-' + catId).style.display = 'none';
    document.getElementById('short-desc-' + catId).style.display = 'block';
}

// Navbar search input enter press listener (Active Category search API)
document.getElementById("search-input").addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
        event.preventDefault(); // Stop form from auto-submitting
        let userInput = this.value.trim();
        if (userInput !== "") {
            isSearching = true; // Turn ON search mode
            searchText = userInput; // Save search text
            currentPage = 0; // Reset pagination to first page
            fetchDecider();
        } else {
            resetSearch(); // If input is empty, reset to "Show all" mode
        }
    }
});

// Wapas "Show All Categories" mode me jane ke liye (Main page fetch karega)
function resetSearch() {
    document.getElementById("search-input").value = ""; // Clear input box
    isSearching = false; // Turn OFF search mode
    searchText = ""; // Clear search text
    currentPage = 0; 
    fetchDecider();
}

function showLoader(show) { document.getElementById("loading").style.display = show ? "block" : "none"; }

document.getElementById("logout-btn").addEventListener("click", function() { 
    localStorage.clear(); 
    window.location.replace("login.html"); 
});


// ============================================================================
// 🪟 7. NAYA: POP-UP (MODAL) LOGIC (Show Subcategories)
// 🔗 API: GET /api/Category/subcategories?categoryId={id}
//🤔 Kyu banaya?: Taaki jab user 'Subcategories' button dabaye, toh is particular category
//   ke under ke saare subcategories backend se load ho hoker popup me dikhein.
// ============================================================================



// 🤔 Kyu banaya?: Ye main function hai jo "Show Subcategory" button dabaane par chalega.
// 0-Level brute force: modal kholo -> ID pakdo -> API hit karo -> Response list popup me chappo

// ============================================================================
// 🪟 7. NAYA: POP-UP (MODAL) LOGIC (100% FIXED)
// ============================================================================

async function openSubcategoryModal(categoryId, categoryTitle) {
    // 🚨 NAYA FIX: Button dabte hi HTML se taza-taza (fresh) elements uthao
    const modalTitle = document.getElementById("modal-category-title");
    const subListContainer = document.getElementById("subcategory-list-container");
    const subModalOverlay = document.getElementById("subcategory-modal");
    const subModalLoader = document.getElementById("subcategory-loader");

    modalTitle.innerText = `Subcategories under "${categoryTitle}"`; 
    subListContainer.innerHTML = ""; 
    subModalOverlay.classList.add("show"); // Popup khol do
    subModalLoader.style.display = "block"; // Loader ghuma do

    try {
        const liveToken = checkTokenLive(); if(!liveToken) return;

        const url = `${BASE_URL}/api/Category/subcategories?categoryId=${categoryId}`;
        const response = await fetch(url, { 
            method: "GET", 
            headers: { "Authorization": "Bearer " + liveToken } 
        });
        
        const data = await response.json();
        subModalLoader.style.display = "none"; // Loader band

        if (data.success === true && data.data.length > 0) {
           let listHtml = "";
            for (let subcat of data.data) {
                // 🚨 NAYA LOGIC: Name aur ID dono ko BOLD kar diya hai.
                // ID ka color blue kar diya hai taaki alag se chamke aur copy karne me aasaani ho.
                listHtml += `
                    <li>
                        <a href="subcategories.html?focusId=${subcat.subCategoryId}" class="subcat-link-item" style="text-decoration:none; display:block; padding:12px 15px; border-bottom:1px solid #f0f0f0; transition:0.2s;">
                            
                            <!-- Subcategory ka Naam (Bada aur Bold) -->
                            <div class="subcat-name" style="font-size: 16px; font-weight: bold; color: #000;">
                                <i class="fa-solid fa-tags" style="color:#0a66c2;"></i> ${subcat.subCategoryTittle}
                            </div>
                            
                            <!-- Subcategory ki ID (Bold, Blue aur thodi choti) -->
                            <div class="subcat-id" style="font-size: 13px; font-weight: bold; color: #0a66c2; margin-top: 5px; margin-left: 24px;">
                                ID :- ${subcat.subCategoryId}
                            </div>
                            
                        </a>
                    </li>
                `;
            }
            subListContainer.innerHTML = listHtml; 

        } 
        else {
            subListContainer.innerHTML = "<p style='text-align:center; padding: 20px; color:#888;'>No subcategories found for this category.</p>";
        }

    } catch (error) {
        subModalLoader.style.display = "none"; 
        subListContainer.innerHTML = "<p style='text-align:center; padding: 20px; color:#ef4444;'>Failed to load subcategories. Server Error!</p>";
    }
}

// 🚨 NAYA FIX: Close function ko ekdum direct aur simple kar diya
function closeSubcategoryModal() {
    // Button dabte hi direct ID dhundho aur class 'show' hata do
    document.getElementById("subcategory-modal").classList.remove("show"); 
}

// 🚨 NAYA FIX: Popup ke bahar click karne par band hone wala logic
window.addEventListener('click', function(event) {
    let modal = document.getElementById("subcategory-modal");
    // Agar mouse ka click modal-content ke bahar (kaale parde par) hua hai, toh band kar do
    if (event.target === modal) {
        closeSubcategoryModal();
    }
});

// ============================================================================
// 🎬 8. APP START
// ============================================================================
if (checkTokenLive()) {
    fetchDecider();
}
// ============================================================================
// 🎬 8. APP START (MAIN LOOP)
// ============================================================================
if (checkTokenLive()) {
    // Shuru me categories loading
    fetchDecider();
}