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
// 🟢 3. API CALLING FUNCTIONS (GET SUBCATEGORIES)
// ============================================================================
async function getSubCategories() {
    showLoader(true); 
    try {
        const liveToken = checkTokenLive(); if(!liveToken) return;

        const url = `${BASE_URL}/api/SubCategory/all?page=0&size=50`; 
        const response = await fetch(url, { method: "GET", headers: { "Authorization": "Bearer " + liveToken } });
        const data = await response.json();
        showLoader(false); 

        if (data.success === true && data.data.length > 0) {
            printSubCategoriesOnScreen(data.data);  
            printPaginationButtons(data.data.length); 
            highlightFocusedCard(); 
        } else {
            document.getElementById("subcategories-grid").innerHTML = "<h3 style='grid-column: 1 / -1; text-align:center;'>Bhai, koi subcategory nahi mili!</h3>";
            document.getElementById("pagination-container").innerHTML = ""; 
        }
    } catch (error) { showLoader(false); }
}

async function getSearchedSubCategories() {
    showLoader(true);
    try {
        const liveToken = checkTokenLive(); if(!liveToken) return;

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
    } catch (error) { showLoader(false); }
}

function fetchDecider() {
    if (isSearching === true) getSearchedSubCategories();
    else getSubCategories();
}

// ============================================================================
// 🎨 4. HTML BANAKAR SCREEN PAR CHHAPNA
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
        let creatorIdFromBackend = subcat.createdBy || subcat.subCategoryId; 
        let creatorPicUrl = `https://ui-avatars.com/api/?name=${creatorIdFromBackend}&background=random`;

        let showCategoryBtnHtml = `<button class="show-sub-btn" onclick="openCategoryModal('${subcat.categoryId}')">Category</button>`;

        let cardHeaderHtml = `
            <div class="card-header">
                <div style="display:flex; align-items:center;">
                    <img src="${creatorPicUrl}" class="author-pic" loading="lazy" decoding="async">
                    <div class="author-info">
                        <h4><a href="viewprofile.html?userId=${creatorIdFromBackend}" style="text-decoration:none; color:#000; transition:color 0.2s;" onmouseover="this.style.color='#0a66c2'" onmouseout="this.style.color='#000'">Author ID: ${creatorIdFromBackend.substring(0,8)}</a></h4>
                        <p>${timeString} • ${subcatStatus}</p> 
                    </div>
                </div>
                <div>${showCategoryBtnHtml}</div> 
            </div>
        `;

        let metaHtml = `
            <div class="category-id-box">
                <strong>SubCategory ID :-</strong> ${subcat.subCategoryId}
            </div>
        `;

        let imgSource = subcat.subCategoryUrl ? subcat.subCategoryUrl : "https://via.placeholder.com/400x250?text=No+Image+Available";
        let cardImageHtml = `<img src="${imgSource}" class="category-img" alt="${subcat.subCategoryTittle}" loading="lazy" decoding="async">`;

        let statusBadgeHtml = `<span class="status-badge">Active</span>`;

        // 🚨 NAYA LOGIC: SCROLLABLE READ MORE (Overlap Fix)
        let fullDescription = subcat.subCategoryDesc;
        let finalDescriptionHtml = "";
        
        if (fullDescription && fullDescription.length > 100) {
            let shortDescription = fullDescription.substring(0, 100) + "...";
            finalDescriptionHtml = `
                <p id="short-desc-${subcat.subCategoryId}" class="category-desc">
                    ${shortDescription} 
                    <a href="javascript:void(0);" onclick="showFullDesc('${subcat.subCategoryId}')" class="read-more-link">Read More</a>
                </p>
                <div id="full-desc-${subcat.subCategoryId}" class="category-desc scrollable-desc" style="display:none;">
                    ${fullDescription} 
                    <br><br>
                    <a href="javascript:void(0);" onclick="showShortDesc('${subcat.subCategoryId}')" class="read-more-link">Show Less</a>
                </div>
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
// 🚨 5. JASOOS (THE HIGHLIGHT / AUTO-SCROLL MAGIC FOR SUBCATEGORY)
// ============================================================================
// ============================================================================
// 🚨 5. JASOOS (THE HIGHLIGHT / AUTO-SCROLL MAGIC FOR SUBCATEGORY)
// ============================================================================
function highlightFocusedCard() {
    const urlParams = new URLSearchParams(window.location.search);
    const focusId = urlParams.get('focusId');

    if (focusId) {
        // 🚨 Yahan bhi 300ms ka wait lagayenge, taaki Subcategory ki photos bhi aaram se load ho jayein
        setTimeout(() => {
            const targetCard = document.getElementById("card-" + focusId);
            
            if (targetCard) {
                targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                targetCard.classList.add("glowing-card");
                
                setTimeout(() => {
                    targetCard.classList.remove("glowing-card");
                }, 2500);
            }
        }, 300); // 0.3 second wait for Image layout shift fix
    }
}

// ============================================================================
// ⏭️ 6. PAGINATION
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
    if (currentPage === 0) { prevBtn.disabled = true; } else { prevBtn.onclick = () => { currentPage--; fetchDecider(); }; }

    const pageText = document.createElement("span");
    pageText.innerText = `Page ${currentPage + 1}`;
    pageText.style = "align-self: center; font-weight: bold; color: #666;";

    const nextBtn = document.createElement("button");
    nextBtn.innerText = "Next ➡️";
    nextBtn.style = `padding: 10px 20px; cursor: pointer; border:none; color:white; border-radius:5px; font-weight:bold; background: ${currentCount < pageSize ? '#ccc' : '#0a66c2'};`;
    if (currentCount < pageSize) { nextBtn.disabled = true; } else { nextBtn.onclick = () => { currentPage++; fetchDecider(); }; }

    btnDiv.appendChild(prevBtn);
    btnDiv.appendChild(pageText);
    btnDiv.appendChild(nextBtn);
    
    paginationContainer.appendChild(btnDiv);
    window.scrollTo({ top: 0, behavior: 'smooth' }); 
}

// ============================================================================
// ⚙️ 7. LISTENERS & HELPERS
// ============================================================================
function showFullDesc(id) { document.getElementById('short-desc-' + id).style.display = 'none'; document.getElementById('full-desc-' + id).style.display = 'block'; }
function showShortDesc(id) { document.getElementById('full-desc-' + id).style.display = 'none'; document.getElementById('short-desc-' + id).style.display = 'block'; }

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
// 🪟 8. CATEGORY WALA POP-UP (MODAL) LOGIC 
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

        const url = `${BASE_URL}/api/Category/id?categoryId=${categoryId}`;
        const response = await fetch(url, { method: "GET", headers: { "Authorization": "Bearer " + liveToken } });
        const data = await response.json();
        
        modalLoader.style.display = "none"; 

        if (data.success === true && data.data) {
            let cat = data.data;
            // 🚨 FIX: Poore dabbe ko <a href="..."> tag ke andar daal diya jisme focusId bhej rahe hain!
            detailsContainer.innerHTML = `
                <a href="categories.html?focusId=${cat.id}" class="subcat-link-item" style="text-decoration:none; display:block; padding:15px; border-radius:8px; border:1px solid #cce5ff; background:#f3f9ff; transition:0.2s;">
                    <div style="font-size: 18px; font-weight: bold; color: #000; margin-bottom: 5px;">
                        <i class="fa-solid fa-layer-group" style="color:#0a66c2;"></i> ${cat.title}
                    </div>
                    <div style="font-size: 14px; font-weight: bold; color: #0a66c2; font-family: monospace;">
                        ID :- ${cat.id}
                    </div>
                    <div style="font-size: 13px; color: #555; margin-top: 10px; line-height: 1.5;">
                        ${cat.desc ? cat.desc.substring(0,100) + '...' : 'No description.'}
                    </div>
                </a>
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

// ============================================================================
// 📱 10. RESPONSIVE & PERFORMANCE OPTIMIZATIONS
// ============================================================================

// Debounce utility function for performance optimization
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Optimized Search Handler (Debounced)
const handleSearch = debounce(function(userInput) {
    if (userInput !== "") {
        isSearching = true;
        searchText = userInput;
        currentPage = 0;
        fetchDecider();
    } else {
        resetSearch();
    }
}, 300);

// Hamburger Menu Toggle for Mobile
const mobileMenuBtn = document.getElementById("mobile-menu-btn");
const navMenu = document.getElementById("nav-menu");

if (mobileMenuBtn && navMenu) {
    mobileMenuBtn.addEventListener("click", function() {
        navMenu.classList.toggle("active");
    });
}

/* =======================================================
   Mobile Search Bar Focus Effect
   ======================================================= */
const searchInput = document.querySelector('.search-box input, .search-input, input[type="search"], input[type="text"]');
if (searchInput) {
  searchInput.addEventListener('focus', () => {
    searchInput.parentElement.style.border = '1.5px solid #1a73e8';
    searchInput.parentElement.style.background = '#ffffff';
    searchInput.parentElement.style.boxShadow = '0 0 0 3px rgba(26,115,232,0.15)';
  });
  searchInput.addEventListener('blur', () => {
    searchInput.parentElement.style.border = '1.5px solid #d0d0d0';
    searchInput.parentElement.style.background = '#f0f2f5';
    searchInput.parentElement.style.boxShadow = 'none';
  });
}

// ===== TASK 1: HAMBURGER MENU COMPACT DROPDOWN LOGIC =====
(function() {
    const hamburgerBtn = document.querySelector('.hamburger-menu, .hamburger-btn, button[class*="hamburger"], #mobile-menu-btn');
    const navDropdown = document.querySelector('.nav-right, #nav-menu');
    
    if (hamburgerBtn && navDropdown) {
        // Clone and replace button to remove old event listeners if any
        const newHamburgerBtn = hamburgerBtn.cloneNode(true);
        hamburgerBtn.parentNode.replaceChild(newHamburgerBtn, hamburgerBtn);
        
        let overlayDiv = null;

        function closeMenu() {
            navDropdown.classList.remove('active');
            if (overlayDiv) {
                overlayDiv.remove();
                overlayDiv = null;
            }
        }

        newHamburgerBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            const isActive = navDropdown.classList.toggle('active');
            
            if (isActive) {
                if (!overlayDiv) {
                    overlayDiv = document.createElement('div');
                    overlayDiv.className = 'mobile-menu-overlay';
                    document.body.appendChild(overlayDiv);
                    
                    overlayDiv.addEventListener('click', closeMenu);
                }
            } else {
                closeMenu();
            }
        });

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') closeMenu();
        });

        const navLinks = navDropdown.querySelectorAll('.nav-item, a, button');
        navLinks.forEach(link => {
            link.addEventListener('click', closeMenu);
        });
    }
})();

// ===== TASK 3: CHAT NOTIFICATION POLLING (WHATSAPP STYLE) =====
(function() {
    let unreadPollInterval = null;

    async function fetchUnreadCounts() {
        const liveToken = localStorage.getItem("token");
        const myUserId = localStorage.getItem("userId");
        if (!liveToken || !myUserId) return;

        try {
            const BASE_URL = "https://blog-management-system-blooms-2.onrender.com";
            const response = await fetch(`${BASE_URL}/api/chat/unread-counts?userId=${myUserId}`, {
                headers: { "Authorization": "Bearer " + liveToken }
            });
            const data = await response.json();
            
            if (data && data.success && data.data) {
                let totalUnread = 0;
                const unreadCountsMap = data.data;
                
                for (let key in unreadCountsMap) {
                    totalUnread += unreadCountsMap[key];
                }
                
                localStorage.setItem("blooms_unread_counts", totalUnread);
                updateChatNotificationBadge();
            }
        } catch (error) {
            console.log("Error fetching unread counts:", error);
        }
    }

    function updateChatNotificationBadge() {
        const totalUnread = parseInt(localStorage.getItem("blooms_unread_counts") || "0", 10);
        
        // Update Desktop/Mobile Nav Icon
        const chatNavItems = document.querySelectorAll('.nav-item[href="chat.html"], .nav-item[onclick*="chat.html"]');
        
        chatNavItems.forEach(item => {
            let badge = item.querySelector('.nav-notification-badge');
            if (totalUnread > 0) {
                if (!badge) {
                    badge = document.createElement('span');
                    badge.className = 'nav-notification-badge';
                    item.style.position = 'relative'; // Ensure positioning
                    item.appendChild(badge);
                }
                badge.textContent = totalUnread > 99 ? '99+' : totalUnread;
            } else {
                if (badge) badge.remove();
            }
        });

        // Update Hamburger Menu Icon
        const hamburgerBtn = document.querySelector('.hamburger-menu, .hamburger-btn, #mobile-menu-btn');
        if (hamburgerBtn) {
            let dot = hamburgerBtn.querySelector('.hamburger-notification-dot');
            if (totalUnread > 0) {
                if (!dot) {
                    dot = document.createElement('span');
                    dot.className = 'hamburger-notification-dot';
                    hamburgerBtn.style.position = 'relative';
                    hamburgerBtn.appendChild(dot);
                }
            } else {
                if (dot) dot.remove();
            }
        }
    }

    // Initialize polling
    if (localStorage.getItem("token")) {
        updateChatNotificationBadge(); // Initial UI update from localStorage
        fetchUnreadCounts(); // Immediate fetch
        unreadPollInterval = setInterval(fetchUnreadCounts, 5000); // Poll every 5s
    }

    // Make updateChatNotificationBadge globally available if needed
    window.updateChatNotificationBadge = updateChatNotificationBadge;
})();