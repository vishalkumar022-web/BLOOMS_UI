const BASE_URL = "https://blog-management-system-blooms-2.onrender.com";

function checkTokenLive() {
    const t = localStorage.getItem("token");
    if (!t) { window.location.replace("login.html"); return false; }
    return t; 
}

// 1. URL Se Data Pakadna (Jasoos)
const urlParams = new URLSearchParams(window.location.search);
const itemId = urlParams.get('id');
const itemType = urlParams.get('type'); // 'blogs', 'categories', ya 'subcategories'

if(!itemId || !itemType) {
    alert("Invalid Link!"); window.location.href = "profile.html";
}

document.getElementById("edit-type-title").innerText = itemType.toUpperCase();
document.getElementById("edit-item-id").value = itemId;
document.getElementById("edit-item-type").value = itemType;

// 2. Pencil Click (Unlock)
function unlock(id) {
    const input = document.getElementById(id);
    input.disabled = false;
    input.focus();
    input.parentElement.style.background = "#fff";
    input.parentElement.style.borderColor = "#0a66c2";
}

// 3. File Upload (Base64 Converter)
function handleFileUpload(inputElement, textInputId, infoId) {
    const file = inputElement.files[0];
    const infoText = document.getElementById(infoId);

    if (file) {
        if (file.size > 1024 * 1024) { alert("File > 1MB is not allowed."); inputElement.value = ""; return; }
        infoText.innerText = "Processing...";
        const reader = new FileReader();
        reader.onloadend = function() {
            const urlInput = document.getElementById(textInputId);
            urlInput.value = reader.result; 
            urlInput.disabled = false; 
            urlInput.parentElement.style.borderColor = "#28a745"; 
            infoText.innerText = "File Uploaded! ✅";
            infoText.style.color = "#28a745";
        }
        reader.readAsDataURL(file);
    }
}

// 4. Data Load Karna (GET API)
async function loadData() {
    const token = checkTokenLive(); if(!token) return;

    try {
        let apiUrl = "";
        if(itemType === "categories") apiUrl = `${BASE_URL}/api/Category/id?categoryId=${itemId}`;
        else if(itemType === "subcategories") apiUrl = `${BASE_URL}/api/SubCategory/id?subcategoryId=${itemId}`;
        else if(itemType === "blogs") apiUrl = `${BASE_URL}/api/BLog/id?blogId=${itemId}`; // Assuming this API exists

        const res = await fetch(apiUrl, { method: "GET", headers: { "Authorization": "Bearer " + token }});
        const data = await res.json();

        if(data.success) {
            const item = data.data;
            if(itemType === "categories") {
                document.getElementById("edit-title").value = item.title;
                document.getElementById("edit-img").value = item.categoryUrl;
                document.getElementById("edit-desc").value = item.desc;
            } 
            else if(itemType === "subcategories") {
                document.getElementById("edit-title").value = item.subCategoryTittle;
                document.getElementById("edit-img").value = item.subCategoryUrl;
                document.getElementById("edit-desc").value = item.subCategoryDesc;
            }
            else if(itemType === "blogs") {
                document.getElementById("edit-blog-dropdowns").style.display = "flex";
                document.getElementById("edit-blog-content-area").style.display = "block";
                
                document.getElementById("edit-title").value = item.title;
                document.getElementById("edit-img").value = item.blogImageUrl;
                document.getElementById("edit-desc").value = item.description;
                document.getElementById("edit-content-full").value = item.content;
                
                await loadCategories(); // dropdown bharne k liye
                document.getElementById("edit-blog-cat-id").value = item.categoryId;
                await loadSubcategoriesForEditModal(item.categoryId);
                document.getElementById("edit-blog-subcat-id").value = item.subCategoryId;
            }
        }
    } catch(e) { console.log("Failed to load existing data"); }
}

// 5. Dropdown Loaders (For Blogs)
async function loadCategories() {
    const token = checkTokenLive(); if(!token) return;
    const res = await fetch(`${BASE_URL}/api/Category/all?page=0&size=100`, { headers: { "Authorization": "Bearer " + token }});
    const data = await res.json();
    if(data.success) {
        let html = `<option value="">Select Category</option>`;
        data.data.forEach(c => html += `<option value="${c.id}">${c.title}</option>`);
        document.getElementById("edit-blog-cat-id").innerHTML = html;
    }
}

async function loadSubcategoriesForEditModal(catId) {
    if(!catId) return;
    const token = checkTokenLive(); if(!token) return;
    const res = await fetch(`${BASE_URL}/api/Category/subcategories?categoryId=${catId}`, { headers: { "Authorization": "Bearer " + token }});
    const data = await res.json();
    if(data.success) {
        let html = `<option value="">Select Subcategory</option>`;
        data.data.forEach(s => html += `<option value="${s.subCategoryId}">${s.subCategoryTittle}</option>`);
        document.getElementById("edit-blog-subcat-id").innerHTML = html;
    }
}

// 6. SAVE CHANGES (PUT API)
async function submitEditChanges() {
    const token = checkTokenLive(); if(!token) return;
    
    let apiUrl = "";
    let body = { userId: localStorage.getItem("userId") || "" }; // Need user ID if required by backend

    if (itemType === "categories") {
        apiUrl = `${BASE_URL}/api/Category`;
        body.id = itemId;
        body.title = document.getElementById("edit-title").value;
        body.categoryUrl = document.getElementById("edit-img").value;
        body.desc = document.getElementById("edit-desc").value;
    } else if (itemType === "subcategories") {
        apiUrl = `${BASE_URL}/api/SubCategory`;
        body.subCategoryId = itemId;
        body.subCategoryTittle = document.getElementById("edit-title").value;
        body.subCategoryUrl = document.getElementById("edit-img").value;
        body.subCategoryDesc = document.getElementById("edit-desc").value;
    } else if (itemType === "blogs") {
        apiUrl = `${BASE_URL}/api/BLog`;
        body.blogId = itemId;
        body.blogTitle = document.getElementById("edit-title").value;
        body.blogImageUrl = document.getElementById("edit-img").value;
        body.blogDescription = document.getElementById("edit-desc").value;
        body.blogContent = document.getElementById("edit-content-full").value;
        body.blogCategoryId = document.getElementById("edit-blog-cat-id").value;
        body.blogSubcategoryId = document.getElementById("edit-blog-subcat-id").value;
    }

    try {
        const res = await fetch(apiUrl, {
            method: "PUT",
            headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
            body: JSON.stringify(body)
        });
        const data = await res.json();
        
        if(data.success) {
            alert("Updated Successfully! ✅");
            window.location.href = "profile.html"; // Wapas bhej do
        } else {
            alert("Failed: " + data.message);
        }
    } catch(e) { alert("Server Error on Update!"); }
}

loadData();