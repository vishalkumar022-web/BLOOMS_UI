const BASE_URL = "https://blog-management-system-blooms-2.onrender.com";

// 1. Security Check
function checkTokenLive() {
    const t = localStorage.getItem("token");
    if (!t) { window.location.replace("login.html"); return false; }
    return t; 
}

// 2. URL Se ID aur Type Pakadna
const urlParams = new URLSearchParams(window.location.search);
const itemId = urlParams.get('id');
const itemType = urlParams.get('type'); 

if(!itemId || !itemType) {
    alert("Invalid Link! Wapas profile par jaa rahe hain."); 
    window.location.href = "profile.html";
}

document.getElementById("page-title-type").innerText = itemType.toUpperCase();

// 🚨 JADOO: Backend se aaya poora data hum isme save karke rakhenge!
let originalData = null; 

// 3. Pencil Click (Dabba Unlock Karna)
function unlock(id) {
    const input = document.getElementById(id);
    input.disabled = false;
    input.focus();
    input.parentElement.style.background = "#fff";
    input.parentElement.style.borderColor = "#0a66c2";
}

// 4. File Upload (Local Image ko Link/Base64 me badalna)
function handleFileUpload(inputElement, textInputId, infoId) {
    const file = inputElement.files[0];
    const infoText = document.getElementById(infoId);

    if (file) {
        if (file.size > 1024 * 1024) { alert("File 1MB se badi nahi honi chahiye bhai!"); inputElement.value = ""; return; }
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

// ============================================================================
// 📥 5. LOAD DATA (Brute Force Method - 100% Guaranteed Data Aayega)
// ============================================================================
async function loadData() {
    const token = checkTokenLive(); if(!token) return;

    try {
        if(itemType === "categories") {
            // SARI categories mangwao aur apni wali dhoondh lo
            const res = await fetch(`${BASE_URL}/api/Category/all?page=0&size=1000`, { headers: { "Authorization": "Bearer " + token }});
            const data = await res.json();
            if(data.success) {
                originalData = data.data.find(c => c.id === itemId);
                if(originalData) {
                    document.getElementById("edit-title").value = originalData.title || "";
                    document.getElementById("edit-img").value = originalData.categoryUrl || "";
                    document.getElementById("edit-desc").value = originalData.desc || "";
                } else { alert("Data nahi mila bhai!"); }
            }
        } 
        else if(itemType === "subcategories") {
            // SARI subcategories mangwao aur apni wali dhoondh lo
            const res = await fetch(`${BASE_URL}/api/SubCategory/all?page=0&size=1000`, { headers: { "Authorization": "Bearer " + token }});
            const data = await res.json();
            if(data.success) {
                originalData = data.data.find(s => s.subCategoryId === itemId);
                if(originalData) {
                    document.getElementById("edit-title").value = originalData.subCategoryTittle || "";
                    document.getElementById("edit-img").value = originalData.subCategoryUrl || "";
                    document.getElementById("edit-desc").value = originalData.subCategoryDesc || "";
                } else { alert("Data nahi mila bhai!"); }
            }
        }
        else if(itemType === "blogs") {
            document.getElementById("blog-extra-fields").style.display = "block";
            
            // SAARE blogs mangwao aur apna wala dhoondh lo
            const res = await fetch(`${BASE_URL}/api/BLog?page=0&size=1000`, { headers: { "Authorization": "Bearer " + token }});
            const data = await res.json();
            if(data.success) {
                originalData = data.data.find(b => b.blogId === itemId);
                if(originalData) {
                    document.getElementById("edit-title").value = originalData.title || "";
                    document.getElementById("edit-img").value = originalData.blogImageUrl || "";
                    document.getElementById("edit-desc").value = originalData.description || "";
                    document.getElementById("edit-content").value = originalData.content || "";
                    
                    await loadCategories(); 
                    document.getElementById("edit-blog-cat").value = originalData.categoryId || "";
                    await loadSubcategories(originalData.categoryId);
                    document.getElementById("edit-blog-subcat").value = originalData.subCategoryId || "";
                } else { alert("Data nahi mila bhai!"); }
            }
        }
    } catch(e) { console.log("Failed to load existing data", e); }
}

async function loadCategories() {
    const token = checkTokenLive(); if(!token) return;
    try {
        const res = await fetch(`${BASE_URL}/api/Category/all?page=0&size=100`, { headers: { "Authorization": "Bearer " + token }});
        const data = await res.json();
        if(data.success) {
            let html = `<option value="">Select Category</option>`;
            data.data.forEach(c => html += `<option value="${c.id}">${c.title}</option>`);
            document.getElementById("edit-blog-cat").innerHTML = html;
        }
    } catch(e){}
}

async function loadSubcategories(catId) {
    if(!catId) return;
    const token = checkTokenLive(); if(!token) return;
    try {
        const res = await fetch(`${BASE_URL}/api/Category/subcategories?categoryId=${catId}`, { headers: { "Authorization": "Bearer " + token }});
        const data = await res.json();
        if(data.success) {
            let html = `<option value="">Select Subcategory</option>`;
            data.data.forEach(s => html += `<option value="${s.subCategoryId}">${s.subCategoryTittle}</option>`);
            document.getElementById("edit-blog-subcat").innerHTML = html;
        }
    } catch(e){}
}

// ============================================================================
// 🚨 6. SAVE CHANGES (100% FIXED - Sirf badla hua data update hoga)
// ============================================================================
async function saveChanges() {
    const token = checkTokenLive(); if(!token) return;
    
    // Agar page load hone me time laga aur originalData khali hai, toh roko
    if(!originalData) {
        alert("Bhai thoda ruko, purana data load ho raha hai!");
        return;
    }
    
    // 🚨 BUTTON MAGIC: Click hote hi sabse pehle button "Saving..." dikhayega
    const saveBtn = document.querySelector('.save-btn');
    const originalBtnText = saveBtn.innerHTML;
    saveBtn.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> Saving Data...";
    saveBtn.disabled = true;

    try {
        let apiUrl = "";
        // 🚨 MAIN MAGIC: Hum 'body' ko 'originalData' bana rahe hain. 
        // Isse jo data tumne edit nahi kiya wo waisa hi rahega, gayab nahi hoga!
        let body = { ...originalData }; 

        if (itemType === "categories") {
            apiUrl = `${BASE_URL}/api/Category`;
            body.title = document.getElementById("edit-title").value;
            body.categoryUrl = document.getElementById("edit-img").value;
            body.desc = document.getElementById("edit-desc").value;
        } 
        else if (itemType === "subcategories") {
            apiUrl = `${BASE_URL}/api/SubCategory`;
            body.subCategoryTittle = document.getElementById("edit-title").value;
            body.subCategoryUrl = document.getElementById("edit-img").value;
            body.subCategoryDesc = document.getElementById("edit-desc").value;
        } 
        else if (itemType === "blogs") {
            apiUrl = `${BASE_URL}/api/BLog`;
            // Blog me backend 2 alag naam maangta hai (kabhi title, kabhi blogTitle), 
            // hum dono naam update kar denge taaki backend confuse na ho!
            body.title = document.getElementById("edit-title").value; 
            body.blogTitle = document.getElementById("edit-title").value; 
            
            body.blogImageUrl = document.getElementById("edit-img").value;
            
            body.description = document.getElementById("edit-desc").value;
            body.blogDescription = document.getElementById("edit-desc").value;
            
            body.content = document.getElementById("edit-content").value; 
            body.blogContent = document.getElementById("edit-content").value; 
            
            body.categoryId = document.getElementById("edit-blog-cat").value;
            body.blogCategoryId = document.getElementById("edit-blog-cat").value;
            
            body.subCategoryId = document.getElementById("edit-blog-subcat").value;
            body.blogSubcategoryId = document.getElementById("edit-blog-subcat").value;
        }

        // Backend ko request bhejo
        const res = await fetch(apiUrl, {
            method: "PUT",
            headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
            body: JSON.stringify(body)
        });
        
        const data = await res.json();
        
        if(data.success) {
            alert("✅ Updated Successfully! Your changes are saved.");
            window.location.href = "profile.html"; 
        } else {
            alert("❌ Failed to update: " + data.message);
            // Error aayi toh button wapas pehle jaisa kardo
            saveBtn.innerHTML = originalBtnText;
            saveBtn.disabled = false;
        }
    } catch(e) { 
        alert("⚠️ Server Error on Update! Please try again."); 
        console.error(e);
        // Error aayi toh button wapas pehle jaisa kardo
        saveBtn.innerHTML = originalBtnText;
        saveBtn.disabled = false;
    }
}

// Script run start
loadData();