const BASE_URL = "https://blog-management-system-blooms-2.onrender.com";

// security check (bachhon wala)
function checkTokenLive() {
    const t = localStorage.getItem("token");
    if (!t) { window.location.replace("login.html"); return false; }
    return t; 
}

// 1. Pencil icon logic (Unlock field)
function unlock(id) {
    // tune bola tha pencil hit karte hi enable ho jaye
    const input = document.getElementById(id);
    input.disabled = false; // Taala kholo
    input.focus(); // Cursor andar daalo
    input.style.border = "1px solid #0a66c2"; // Border blue kar do taaki pata chale editable hai
    input.parentElement.style.background = "#fff"; // Background safed
}

// ============================================================================
// 🚨 2. FILE UPLOAD LOGIC (Brute Force Base64)
// 🤔 Kyu banaya?: Local system se photo utha kar use Base64 text me badalne ke liye
// ============================================================================
function handleFileUpload(inputElement, textInputId, infoId) {
    const file = inputElement.files[0];
    const infoText = document.getElementById(infoId);

    if (file) {
        // Brute Force: Agar file badi hai toh mana kar do (Optional par accha UX hai)
        if (file.size > 1024 * 1024) { // 1MB limit for testing
            alert("Bhai, file bohot badi hai! 1MB se chhoti photo lagao taaki server fat na jaye.");
            inputElement.value = ""; return;
        }

        infoText.innerText = "Processing File: " + file.name + "...";

        // JS ka purana "FileReader" tool uthaya
        const reader = new FileReader();
        
        // Jadoo: Jab reader photo padh le, tab kya karna hai?
        reader.onloadend = function() {
            // reader.result me photo ka lamba Base64 text hai.
            // Usko hum URL wale text box (ep-pic ya ep-bg) me bhar denge.
            const urlInput = document.getElementById(textInputId);
            urlInput.value = reader.result; 
            
            // Text box ko enable bhi kar do taaki user dekh sake ki text aa gaya
            urlInput.disabled = false; 
            urlInput.style.border = "1px solid #28a745"; // Green border (success)
            
            infoText.innerText = "File Uploaded from system! ✅";
            infoText.style.color = "#28a745";
        }

        // Action: Reader ko bolo ki photo ko "Data URL" (Base64) me padho!
        reader.readAsDataURL(file);
    }
}

// ============================================================================
// 👤 3. LOAD CURRENT DATA
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
            document.getElementById("ep-email").value = u.email || ""; // Error test ke liye
            document.getElementById("ep-pic").value = u.profileUrl || "";
            document.getElementById("ep-bg").value = u.profileBackgroundUrl || "";
            document.getElementById("ep-about").value = u.aboutMe || "";
        }
    } catch(e) { console.log("Error loading me data"); }
}

// ============================================================================
// 💾 4. SAVE PROFILE (Backend Error Catching)
// ============================================================================
async function saveProfile() {
    try {
        const token = checkTokenLive(); if(!token) return;
        
        // Brute Force: Pura naya data body me bharo
        const body = {
            name: document.getElementById("ep-name").value.trim(),
            userName: document.getElementById("ep-username").value.trim(),
            phoneNumber: document.getElementById("ep-phone").value.trim(),
            email: document.getElementById("ep-email").value.trim(), // API need to support this
            profileUrl: document.getElementById("ep-pic").value.trim(),
            profileBackgroundUrl: document.getElementById("ep-bg").value.trim(),
            aboutMe: document.getElementById("ep-about").value.trim()
        };

        // Basic Check
        if(!body.userName || !body.name) return alert("Username and Name are mandatory!");

        // PUT API chalayi
        const res = await fetch(BASE_URL + "/api/User", {
            method: "PUT",
            headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
            body: JSON.stringify(body)
        });
        
        const data = await res.json();
        
        // ====================================================================
        // 🚨 NAYA LOGIC: BACKEND ERROR KO CATCH KARNA
        // 🤔 Kyu banaya?: Taaki registered phone/email ka error user ko dikhe
        // ====================================================================
        if(data.success === true) {
            // Success! Makkhan.
            alert("Profile Updated Successfully! 🎉");
            window.location.href = "profile.html"; 
        } else {
            // 🚨 JADOO: Backend se aane wala failure response catch kiya!
            // data.message me Backend tera friendly error bhejta hai: "Email already registered" ya "Phone registered"
            // Hum usko ekdum badhiya alert me user ko dikhayenge.
            console.error("Backend Error Response:", data);
            
            // Bacchon wala check: Agar message khali hai toh general fail bolo
            let errorMsg = data.message || "Failed to update profile due to registered phone/email Clash.";
            
            // User ko friendly manner me bataya
            alert(`Bhai, gadbad ho gayi! Server bol raha hai: \n⚠️ "${errorMsg}" \n\nKripya sahi detail dalein.`);
        }

    } catch (error) { 
        console.error("Fetch Error:", error);
        alert("Server Crash ho gaya ya network nahi hai! Dubara try karo."); 
    }
}

loadData(); 