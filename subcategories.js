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
const pageSize = 6;        // Search ke liye 6 dabbe per page
let isSearching = false;   
let searchText = "";       

// ============================================================================
// 🟢 3. API CALLING FUNCTIONS (GET SUBCATEGORIES)
// ============================================================================

// A. Normal Subcategories Fetch
async function getSubCategories() {
    showLoader(true); 
    try {
        const liveToken = checkTokenLive(); if(!liveToken) return;

        // API used: /api/SubCategory/all
        const url = `${BASE_URL}/api/SubCategory/all?page=0&size=50`; 
        const response = await fetch(url, { method: "GET", headers: { "Authorization": "Bearer " + liveToken } });
        const data = await response.json();
        showLoader(false); 

        if (data.success === true && data.data.length > 0) {
            printSubCategoriesOnScreen(data.data);  
            printPaginationButtons(data.data.length); 
            
            // 🚨 JASOOS: Saare dabbe banne ke baad, check karo kya humein kisi par focus karna hai?
            highlightFocusedCard(); 
        } else {
            document.getElementById("subcategories-grid").innerHTML = "<h3 style='grid-column: 1 / -1; text-align:center;'>Bhai, koi subcategory nahi mili!</h3>";
            document.getElementById("pagination-container").innerHTML = ""; 
        }
    } catch (error) {
        showLoader(false);
    }
}

// B. Search Ki Hui Subcategories
async function getSearchedSubCategories() {
    showLoader(true);
    try {
        const liveToken = checkTokenLive(); if(!liveToken) return;

        // API used: /api/SubCategory/search
        const url = `${BASE_URL}/api/SubCategory/search?title=${encodeURIComponent(searchText)}&page=${currentPage}&size=${pageSize}`;
        const response = await fetch(url, { method: "GET", headers: { "Authorization": "Bearer " + liveToken } });
        const data = await response.json();
        showLoader(false);

        if (data.success === true && data.data.length > 0) {
            printSubCategoriesOnScreen(data.data); 
            printPaginationButtons(data.data.length); 
        } else {
            document.getElementById("subcategories-grid").innerHTML = `
                <div style="grid-column: 1 / -1; text-align:center; padding:30px;">
                    <h3>Bhai, "${searchText}" naam se koi Subcategory nahi mili 😔</h3>
                    <button onclick="resetSearch()" style="margin-top:15px; padding:10px 20px; background:#0a66c2; color:white; border:none; border-radius:5px; cursor:pointer;">⬅️ Back to All Subcategories</button>
                </div>
            `;
            document.getElementById("pagination-container").innerHTML = "";
        }
    } catch (error) {
        showLoader(false);
    }
}

function fetchDecider() {
    if (isSearching === true) getSearchedSubCategories();
    else getSubCategories();
}

// ============================================================================
// 🎨 4. HTML BANAKAR SCREEN PAR CHHAPNA (The Builder)
// ============================================================================
function printSubCategoriesOnScreen(subCategoryArray) {
    let allHtml = "";

    if (isSearching === true) {
        allHtml += `
            <div style="grid-column: 1 / -1; margin-bottom: 20px; padding: 15px; background: white; border-radius: 10px; box-shadow: 0 0 0 1px rgba(0,0,0,0.05);">
                <button onclick="resetSearch()" style="padding: 8px 15px; background: #666; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">
                    ⬅️ Back to All Subcategories
                </button>
                <h3 style="margin-top: 15px; color: #333;">Search Results for: "<span style="color:#0a66c2;">${searchText}</span>"</h3>
            </div>
        `;
    }

    for (let subcat of subCategoryArray) {
        
        let timeString = "Just now"; 
        if (subcat.createdDTTM) {
            let dateObj = new Date(subcat.createdDTTM);
            timeString = dateObj.toLocaleDateString() + ", " + dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        }

        let subcatStatus = subcat.status ? subcat.status.toUpperCase() : "PUBLISHED";
        
        // Backend variable matches Category exactly? Let's check SubCategoryResponse.
        let creatorIdFromBackend = subcat.createdBy || subcat.subCategoryId; 
        let creatorPicUrl = `https://ui-avatars.com/api/?name=${creatorIdFromBackend}&background=random`;

        // 🚨 NAYA: Button ab Category details kholne ko bolega
        let showCategoryBtnHtml = `<button class="show-sub-btn" onclick="openCategoryModal('${subcat.categoryId}')">Category</button>`;

        let cardHeaderHtml = `
            <div class="card-header">
                <div style="display:flex; align-items:center;">
                    <img src="${creatorPicUrl}" class="author-pic">
                    <div class="author-info">
                        <h4><a href="viewprofile.html?userId=${creatorIdFromBackend}" style="text-decoration:none; color:#000; transition:color 0.2s;" onmouseover="this.style.color='#0a66c2'" onmouseout="this.style.color='#000'">Author ID: ${creatorIdFromBackend.substring(0,8)}</a></h4>
                        <p>${timeString} • ${subcatStatus}</p> 
                    </div>
                </div>
                <div>${showCategoryBtnHtml}</div> 
            </div>
        `;

        // Dabba ID change to SubCategory ID
        let metaHtml = `
            <div class="category-id-box">
                <strong>SubCategory ID :-</strong> ${subcat.subCategoryId}
            </div>
        `;

        let imgSource = subcat.subCategoryUrl ? subcat.subCategoryUrl : "https://via.placeholder.com/400x250?text=No+Image+Available";
        let cardImageHtml = `<img src="${imgSource}" class="category-img" alt="${subcat.subCategoryTittle}">`;

        let statusBadgeHtml = `<span class="status-badge">Active</span>`;

        let fullDescription = subcat.subCategoryDesc;
        let finalDescriptionHtml = "";
        
        if (fullDescription && fullDescription.length > 100) {
            let shortDescription = fullDescription.substring(0, 100) + "...";
            finalDescriptionHtml = `
                <p id="short-desc-${subcat.subCategoryId}" class="category-desc">
                    ${shortDescription} 
                    <a href="javascript:void(0);" onclick="showFullDesc('${subcat.subCategoryId}')" class="read-more-link">Read More</a>
                </p>
                <p id="full-desc-${subcat.subCategoryId}" class="category-desc" style="display:none;">
                    ${fullDescription} 
                    <a href="javascript:void(0);" onclick="showShortDesc('${subcat.subCategoryId}')" class="read-more-link">Show Less</a>
                </p>
            `;
        } else {
            finalDescriptionHtml = `<p class="category-desc">${fullDescription}</p>`;
        }

        let cardBodyHtml = `
            <div class="category-body">
                <h2 class="category-title">${subcat.subCategoryTittle} ${statusBadgeHtml}</h2>
                ${finalDescriptionHtml}
            </div>
        `;

        // 🚨 NAYA: Har dabbe ko ek special HTML id di hai (`id="card-${subcat.subCategoryId}"`)
        // Jisse humara Jasoos auto-scroll karte waqt isko dhundh sake
        const completeCard = `
            <div class="category-card" id="card-${subcat.subCategoryId}">
                ${cardHeaderHtml}
                ${metaHtml}
                ${cardImageHtml}
                ${cardBodyHtml}
            </div>
        `;
        allHtml += completeCard; 
    }

    document.getElementById("subcategories-grid").innerHTML = allHtml;
}


// ============================================================================
// 🚨 5. JASOOS (THE HIGHLIGHT / AUTO-SCROLL MAGIC)
// ============================================================================
// 🤔 Kyu banaya?: Jab user pichle page se click karke yaha aaye, toh ye URL check karega,
// aur usi dabbe par page scroll karke 'Neeli Light' jala dega.
function highlightFocusedCard() {
    // 1. URL me check karo ki kya "?focusId=kuch_ID" likha hai?
    const urlParams = new URLSearchParams(window.location.search);
    const focusId = urlParams.get('focusId');

    if (focusId) {
        // 2. Wo dabba dhundho jiska ID url me aayi ID se match hota hai
        const targetCard = document.getElementById("card-" + focusId);
        
        if (targetCard) {
            // 3. Page ko smoothly waha tak sarka do (Auto-Scroll)
            targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // 4. Us dabbe par ek special CSS class (glowing-card) laga do jisse wo chamakne lage
            targetCard.classList.add("glowing-card");

            // 5. 2 second ke baad class hata do, taaki chamakna band ho jaye
            setTimeout(() => {
                targetCard.classList.remove("glowing-card");
            }, 2500);
        }
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
// ⚙️ 7. LISTENERS & HELPERS (Readmore, Search)
// ============================================================================
function showFullDesc(id) { document.getElementById('short-desc-' + id).style.display = 'none'; document.getElementById('full-desc-' + id).style.display = 'block'; }
function showShortDesc(id) { document.getElementById('full-desc-' + id).style.display = 'none'; document.getElementById('short-desc-' + id).style.display = 'block'; }

document.getElementById("search-input").addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
        event.preventDefault(); 
        let userInput = this.value.trim();
        if (userInput !== "") {
            isSearching = true; searchText = userInput; currentPage = 0; fetchDecider();
        } else {
            resetSearch(); 
        }
    }
});

function resetSearch() {
    document.getElementById("search-input").value = ""; 
    isSearching = false; searchText = ""; currentPage = 0; fetchDecider();
}

function showLoader(show) { document.getElementById("loading").style.display = show ? "block" : "none"; }
document.getElementById("logout-btn").addEventListener("click", function() { localStorage.clear(); window.location.replace("login.html"); });


// ============================================================================
// 🪟 8. CATEGORY WALA POP-UP (MODAL) LOGIC 
// 🔗 API: GET /api/Category/id?categoryId={id}
// 🤔 Kyu banaya?: Subcategory ke andar user uske "Bap" (Parent Category) ki ID aur Name dekh sake.
// ============================================================================

async function openCategoryModal(categoryId) {
    const detailsContainer = document.getElementById("category-details-container");
    const modalOverlay = document.getElementById("parent-category-modal");
    const modalLoader = document.getElementById("category-loader");

    detailsContainer.innerHTML = ""; 
    modalOverlay.classList.add("show"); 
    modalLoader.style.display = "block"; 

    try {
        const liveToken = checkTokenLive(); if(!liveToken) return;

        // 🔗 Hit your backend API: GET /api/Category/id?categoryId=...
        const url = `${BASE_URL}/api/Category/id?categoryId=${categoryId}`;
        const response = await fetch(url, { method: "GET", headers: { "Authorization": "Bearer " + liveToken } });
        const data = await response.json();
        
        modalLoader.style.display = "none"; 

        if (data.success === true && data.data) {
            let cat = data.data;
            // 🚨 NAYA LOGIC: Parent Category ka naam aur ID bold/blue style me dikhao!
            detailsContainer.innerHTML = `
                <div style="background: #f3f9ff; padding: 15px; border-radius: 8px; border: 1px solid #cce5ff;">
                    <div style="font-size: 18px; font-weight: bold; color: #000; margin-bottom: 5px;">
                        <i class="fa-solid fa-layer-group" style="color:#0a66c2;"></i> ${cat.title}
                    </div>
                    <div style="font-size: 14px; font-weight: bold; color: #0a66c2; font-family: monospace;">
                        ID :- ${cat.id}
                    </div>
                    <div style="font-size: 13px; color: #555; margin-top: 10px; line-height: 1.5;">
                        ${cat.desc ? cat.desc.substring(0,100) + '...' : 'No description.'}
                    </div>
                </div>
            `;
        } else {
            detailsContainer.innerHTML = "<p style='text-align:center; padding: 20px; color:#888;'>Category details not found.</p>";
        }

    } catch (error) {
        modalLoader.style.display = "none"; 
        detailsContainer.innerHTML = "<p style='text-align:center; padding: 20px; color:#ef4444;'>Failed to load Category. Server Error!</p>";
    }
}

function closeCategoryModal() { document.getElementById("parent-category-modal").classList.remove("show"); }
window.addEventListener('click', function(event) {
    if (event.target === document.getElementById("parent-category-modal")) { closeCategoryModal(); }
});

// ============================================================================
// 🎬 9. APP START
// ============================================================================
if (checkTokenLive()) {
    fetchDecider();
}