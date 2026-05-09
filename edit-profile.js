const BASE_URL = "https://blog-management-system-blooms-2.onrender.com";

// Security check
function checkTokenLive() {
    const t = localStorage.getItem("token");
    if (!t) { window.location.replace("login.html"); return false; }
    return t; 
}

// Pencil icon logic (Unlock field)
function unlock(id) {
    const input = document.getElementById(id);
    input.disabled = false; 
    input.focus(); 
    input.style.border = "1px solid #0a66c2"; 
    input.parentElement.style.background = "#fff"; 
}

// ============================================================================
// 🖼️ NAYA: CROPPER JS LOGIC (Photo adjust karne ke liye)
// ============================================================================
let cropperInstance = null;
let currentTargetInputId = ""; // Kahan base64 save karna hai (ep-pic ya ep-bg)
let currentTargetInfoId = "";  // Kahan success message dikhana hai

// Jab user "Add from file" par click karke photo chunta hai
function openCropper(inputElement, textInputId, infoId, cropRatio) {
    const file = inputElement.files[0];
    if (!file) return;

    if (file.size > 1024 * 1024 * 2) { 
        alert("Bhai, file bohot badi hai! 2MB se chhoti photo lagao.");
        inputElement.value = ""; return;
    }

    currentTargetInputId = textInputId;
    currentTargetInfoId = infoId;
    document.getElementById(infoId).innerText = "Opening editor...";

    const reader = new FileReader();
    reader.onloadend = function() {
        // Modal kholo
        const modal = document.getElementById("cropper-modal");
        const image = document.getElementById("image-to-crop");
        
        image.src = reader.result;
        modal.classList.add("show");

        // Agar purana cropper khula tha toh delete karo
        if(cropperInstance) { cropperInstance.destroy(); }

        // Naya Cropper start karo
        cropperInstance = new Cropper(image, {
            aspectRatio: cropRatio, // Profile pic ke liye 1 (Square), BG ke liye 16/9
            viewMode: 1, // Photo ke bahar crop area na jaye
            autoCropArea: 1,
            background: false, // Piche ka jali wala design hatane ke liye
        });
    }
    reader.readAsDataURL(file);
}

// Modal band karna
function closeCropperModal() {
    document.getElementById("cropper-modal").classList.remove("show");
    if(cropperInstance) { cropperInstance.destroy(); cropperInstance = null; }
    if(currentTargetInfoId) document.getElementById(currentTargetInfoId).innerText = "";
}

// Jab user "Apply Photo" dabaye
function applyCrop() {
    if(!cropperInstance) return;

    // Cropper se final kati hui photo nikalo
    const canvas = cropperInstance.getCroppedCanvas({
        width: currentTargetInputId === 'ep-pic' ? 400 : 800, // Profile k liye choti, BG k liye badi quality
        height: currentTargetInputId === 'ep-pic' ? 400 : 450,
    });

    // Base64 me badlo
    const base64Data = canvas.toDataURL('image/jpeg', 0.8);

    // Asli input dabbe me link bhar do
    const urlInput = document.getElementById(currentTargetInputId);
    urlInput.value = base64Data; 
    urlInput.disabled = false; 
    urlInput.style.border = "1px solid #28a745"; // Green success border
    
    // Status text update karo
    const infoText = document.getElementById(currentTargetInfoId);
    infoText.innerText = "Photo Adjusted & Uploaded! ✅";
    infoText.style.color = "#28a745";

    // Modal band kar do
    closeCropperModal();
}

// ============================================================================
// 👤 LOAD CURRENT DATA
// ============================================================================
async function loadData() {
    try {
        const token = checkTokenLive(); if(!token) return;
        const res = await fetch(BASE_URL + "/api/User/me", { headers: { "Authorization": "Bearer " + token }});
        const data = await res.json();
        
        if(data.success) {
            const u = data.data;
            document.getElementById("ep-name").value = u.name || "";
            document.getElementById("ep-username").value = u.userName || "";
            document.getElementById("ep-phone").value = u.phoneNumber || "";
            document.getElementById("ep-email").value = u.email || ""; 
            document.getElementById("ep-pic").value = u.profileUrl || "";
            document.getElementById("ep-bg").value = u.profileBackgroundUrl || "";
            document.getElementById("ep-about").value = u.aboutMe || "";
        }
    } catch(e) { console.log("Error loading me data"); }
}

// ============================================================================
// 💾 SAVE PROFILE
// ============================================================================
async function saveProfile() {
    const saveBtn = document.querySelector('.save-btn');
    const originalBtnText = saveBtn.innerHTML;
    saveBtn.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> Saving...";
    saveBtn.disabled = true;

    try {
        const token = checkTokenLive(); if(!token) return;
        
        const body = {
            name: document.getElementById("ep-name").value.trim(),
            userName: document.getElementById("ep-username").value.trim(),
            phoneNumber: document.getElementById("ep-phone").value.trim(),
            email: document.getElementById("ep-email").value.trim(), 
            profileUrl: document.getElementById("ep-pic").value.trim(),
            profileBackgroundUrl: document.getElementById("ep-bg").value.trim(),
            aboutMe: document.getElementById("ep-about").value.trim()
        };

        if(!body.userName || !body.name) {
            saveBtn.innerHTML = originalBtnText; saveBtn.disabled = false;
            return alert("Username and Name are mandatory!");
        }

        const res = await fetch(BASE_URL + "/api/User", {
            method: "PUT",
            headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
            body: JSON.stringify(body)
        });
        
        const data = await res.json();
        
        if(data.success === true) {
            alert("Profile Updated Successfully! 🎉");
            window.location.href = "profile.html"; 
        } else {
            console.error("Backend Error Response:", data);
            let errorMsg = data.message || "Failed to update profile.";
            alert(`Bhai, gadbad ho gayi! Server bol raha hai: \n⚠️ "${errorMsg}"`);
            saveBtn.innerHTML = originalBtnText; saveBtn.disabled = false;
        }
    } catch (error) { 
        console.error("Fetch Error:", error);
        alert("Server Crash ho gaya ya network nahi hai!"); 
        saveBtn.innerHTML = originalBtnText; saveBtn.disabled = false;
    }
}

loadData();