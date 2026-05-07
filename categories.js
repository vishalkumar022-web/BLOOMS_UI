// ============================================================================
// 🌐 1. SETUP AUR SECURITY CHECK
// ============================================================================
const BASE_URL = "https://blog-management-system-blooms-2.onrender.com";

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
const pageSize = 6;        
let isSearching = false;   
let searchText = "";       

// ============================================================================
// 🟢 3. API CALLING FUNCTIONS (GET CATEGORIES)
// ============================================================================
async function getCategories() {
    showLoader(true); 
    try {
        const liveToken = checkTokenLive(); if(!liveToken) return;

        const url = `${BASE_URL}/api/Category/all?page=0&size=50`; 
        const response = await fetch(url, { method: "GET", headers: { "Authorization": "Bearer " + liveToken } });
        const data = await response.json();
        showLoader(false); 

        if (data.success === true && data.data.length > 0) {
            printCategoriesOnScreen(data.data); 
            printPaginationButtons(data.data.length); 
            
            // 🚨 FIX: Jasoos ko jagao!
            highlightFocusedCard(); 
        } else {
            document.getElementById("categories-grid").innerHTML = "<h3 style='grid-column: 1 / -1; text-align:center;'>Bhai, koi category nahi mili!</h3>";
            document.getElementById("pagination-container").innerHTML = ""; 
        }
    } catch (error) {
        showLoader(false);
    }
}

async function getSearchedCategories() {
    showLoader(true);
    try {
        const liveToken = checkTokenLive(); if(!liveToken) return;

        const url = `${BASE_URL}/api/Category/search?title=${encodeURIComponent(searchText)}&page=${currentPage}&size=${pageSize}`;
        const response = await fetch(url, { method: "GET", headers: { "Authorization": "Bearer " + liveToken } });
        const data = await response.json();
        showLoader(false);

        if (data.success === true && data.data.length > 0) {
            printCategoriesOnScreen(data.data); 
            printPaginationButtons(data.data.length); 
            
            // 🚨 FIX: Jasoos ko jagao!
            highlightFocusedCard(); 
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

function fetchDecider() {
    if (isSearching === true) getSearchedCategories();
    else getCategories();
}

// ============================================================================
// 🎨 4. HTML BANAKAR SCREEN PAR CHHAPNA
// ============================================================================
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
        
        // 🚨 NAYA LOGIC: SCROLLABLE READ MORE (Overlap Fix)
        if (fullDescription.length > 100) {
            let shortDescription = fullDescription.substring(0, 100) + "...";
            finalDescriptionHtml = `
                <p id="short-desc-${cat.id}" class="category-desc">
                    ${shortDescription} 
                    <a href="javascript:void(0);" onclick="showFullDesc('${cat.id}')" class="read-more-link">Read More</a>
                </p>
                <div id="full-desc-${cat.id}" class="category-desc scrollable-desc" style="display:none;">
                    ${fullDescription} 
                    <br><br>
                    <a href="javascript:void(0);" onclick="showShortDesc('${cat.id}')" class="read-more-link">Show Less</a>
                </div>
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

        // 🚨 NAYA: Har dabbe ko ek special HTML id di hai (`id="card-${cat.id}"`) taaki jasoos dhundh sake
        const completeCard = `
            <div class="category-card" id="card-${cat.id}">
                ${cardHeaderHtml}
                ${metaHtml} 
                ${cardImageHtml}
                ${cardBodyHtml}
            </div>
        `;
        allHtml += completeCard; 
    }

    document.getElementById("categories-grid").innerHTML = allHtml;
}

// ============================================================================
// 🚨 5. JASOOS (THE HIGHLIGHT / AUTO-SCROLL MAGIC FOR CATEGORY)
// ============================================================================
// 🤔 Kyu banaya?: Jab user subcategories.html ke modal se click karke aaye, 
// toh ye URL check karega aur usi dabbe par scroll karke neeli light jala dega.
// ============================================================================
// 🚨 5. JASOOS (THE HIGHLIGHT / AUTO-SCROLL MAGIC FOR CATEGORY)
// ============================================================================
function highlightFocusedCard() {
    // 1. URL me check karo ki kya "?focusId=kuch_ID" likha hai?
    const urlParams = new URLSearchParams(window.location.search);
    const focusId = urlParams.get('focusId');

    // Agar URL me ID mili hai, tabhi aage badho
    if (focusId) {
        
        // 🚨 NAYA FIX: setTimeout lagaya! 
        // Browser ko screen par dabbe draw karne ka thoda time de rahe hain (300 milliseconds / 0.3 second)
        setTimeout(() => {
            
            // 2. Wo dabba dhundho jiska ID url me aayi ID se match hota hai
            const targetCard = document.getElementById("card-" + focusId);
            
            if (targetCard) {
                // 3. Page ko smoothly waha tak sarka do (Auto-Scroll)
                targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                
                // 4. Us dabbe par ek special CSS class (glowing-card) laga do jisse wo chamakne lage
                targetCard.classList.add("glowing-card");
                
                // 5. 2.5 second (2500 ms) ke baad class hata do, taaki chamakna band ho jaye
                setTimeout(() => {
                    targetCard.classList.remove("glowing-card");
                }, 2500);
            } else {
                console.log("Bhai, Dabba abhi bhi nahi mila screen par!");
            }
            
        }, 300); // <-- Ye raha 300 milliseconds ka wait time. Ye magic ki tarah kaam karega!
    }
}

// ============================================================================
// ⏭️ 6. PAGINATION (Search Only)
// ============================================================================
function printPaginationButtons(currentCount) {
    const paginationContainer = document.getElementById("pagination-container");
    paginationContainer.innerHTML = ""; 

    if (isSearching === false) { return; }
    
    const btnDiv = document.createElement("div");
    btnDiv.style = "display:flex; justify-content:space-between; margin-top: 30px; margin-bottom: 40px; width: 100%; grid-column: 1 / -1;";

    const prevBtn = document.createElement("button");
    prevBtn.innerText = "⬅️ Previous";
    prevBtn.style = `padding: 10px 20px; cursor: pointer; border:none; color:white; border-radius:5px; font-weight:bold; background: ${currentPage === 0 ? '#ccc' : '#0a66c2'};`;
    if (currentPage === 0) { prevBtn.disabled = true; } 
    else { prevBtn.onclick = () => { currentPage--; fetchDecider(); }; }

    const pageText = document.createElement("span");
    pageText.innerText = `Page ${currentPage + 1}`;
    pageText.style = "align-self: center; font-weight: bold; color: #666;";

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
// ⚙️ 7. LISTENERS & HELPERS 
// ============================================================================
function showFullDesc(catId) { document.getElementById('short-desc-' + catId).style.display = 'none'; document.getElementById('full-desc-' + catId).style.display = 'block'; }
function showShortDesc(catId) { document.getElementById('full-desc-' + catId).style.display = 'none'; document.getElementById('short-desc-' + catId).style.display = 'block'; }

document.getElementById("search-input").addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
        event.preventDefault(); 
        let userInput = this.value.trim();
        if (userInput !== "") { isSearching = true; searchText = userInput; currentPage = 0; fetchDecider(); } 
        else { resetSearch(); }
    }
});

function resetSearch() {
    document.getElementById("search-input").value = ""; 
    isSearching = false; searchText = ""; currentPage = 0; fetchDecider();
}

function showLoader(show) { document.getElementById("loading").style.display = show ? "block" : "none"; }
document.getElementById("logout-btn").addEventListener("click", function() { localStorage.clear(); window.location.replace("login.html"); });

// ============================================================================
// 🪟 8. POP-UP (MODAL) LOGIC (100% FIXED)
// ============================================================================
async function openSubcategoryModal(categoryId, categoryTitle) {
    const modalTitle = document.getElementById("modal-category-title");
    const subListContainer = document.getElementById("subcategory-list-container");
    const subModalOverlay = document.getElementById("subcategory-modal");
    const subModalLoader = document.getElementById("subcategory-loader");

    modalTitle.innerText = `Subcategories under "${categoryTitle}"`; 
    subListContainer.innerHTML = ""; 
    subModalOverlay.classList.add("show"); 
    subModalLoader.style.display = "block"; 

    try {
        const liveToken = checkTokenLive(); if(!liveToken) return;

        const url = `${BASE_URL}/api/Category/subcategories?categoryId=${categoryId}`;
        const response = await fetch(url, { method: "GET", headers: { "Authorization": "Bearer " + liveToken } });
        const data = await response.json();
        
        subModalLoader.style.display = "none"; 

        if (data.success === true && data.data.length > 0) {
           let listHtml = "";
            for (let subcat of data.data) {
                listHtml += `
                    <li>
                        <a href="subcategories.html?focusId=${subcat.subCategoryId}" class="subcat-link-item" style="text-decoration:none; display:block; padding:12px 15px; border-bottom:1px solid #f0f0f0; transition:0.2s;">
                            <div class="subcat-name" style="font-size: 16px; font-weight: bold; color: #000;">
                                <i class="fa-solid fa-tags" style="color:#0a66c2;"></i> ${subcat.subCategoryTittle}
                            </div>
                            <div class="subcat-id" style="font-size: 13px; font-weight: bold; color: #0a66c2; margin-top: 5px; margin-left: 24px;">
                                ID :- ${subcat.subCategoryId}
                            </div>
                        </a>
                    </li>
                `;
            }
            subListContainer.innerHTML = listHtml; 
        } else {
            subListContainer.innerHTML = "<p style='text-align:center; padding: 20px; color:#888;'>No subcategories found for this category.</p>";
        }

    } catch (error) {
        subModalLoader.style.display = "none"; 
        subListContainer.innerHTML = "<p style='text-align:center; padding: 20px; color:#ef4444;'>Failed to load subcategories. Server Error!</p>";
    }
}

function closeSubcategoryModal() { document.getElementById("subcategory-modal").classList.remove("show"); }
window.addEventListener('click', function(event) {
    if (event.target === document.getElementById("subcategory-modal")) { closeSubcategoryModal(); }
});


// 👤 PROFILE BUTTON WALA MAGIC
// 1. Pehle hum HTML se us "profile-btn" wali ID ko pakdenge
document.getElementById("profile-btn").addEventListener("click", function() {
    // 2. Phir hum browser ko bolenge ki "Bhai, naya page kholo: profile.html"
    window.location.href = "profile.html";
});




// ============================================================================
// 🎬 9. APP START
// ============================================================================
if (checkTokenLive()) {
    fetchDecider();
}