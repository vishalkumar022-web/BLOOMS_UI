// =========================================================================
// 🌐 BASE URL SETTING (Tera Live Backend Link)
// =========================================================================
// Ise humne ek constant bana liya hai taaki kal ko link badle toh sirf yahan change karna pade.
const BASE_URL = "https://blog-management-system-blooms-2.onrender.com";


// =========================================================================
// 🚀 LOGIC 1: PROFILE IMAGE PREVIEW (LIVE PHOTO DIKHANA)
// =========================================================================
const urlInput = document.getElementById('reg-profile-url'); 
const previewImg = document.getElementById('preview-img');   

if (urlInput && previewImg) {
    urlInput.addEventListener('input', function() {
        const url = urlInput.value.trim();
        if (url) {
            previewImg.src = url; 
        } else {
            previewImg.src = 'https://via.placeholder.com/100?text=No+Image';
        }
    });
    previewImg.addEventListener('error', function() {
        previewImg.src = 'https://via.placeholder.com/100?text=Invalid+URL';
    });
}


// =========================================================================
// 👁️ LOGIC 2: PASSWORD SHOW / HIDE (AANKH WALA BUTTON)
// =========================================================================
function setupPasswordToggle(toggleIconId, passwordInputId) {
    const toggleIcon = document.getElementById(toggleIconId);
    const passwordInput = document.getElementById(passwordInputId);

    if (toggleIcon && passwordInput) {
        toggleIcon.addEventListener('click', function() {
            if (passwordInput.type === "password") {
                passwordInput.type = "text";
                toggleIcon.classList.remove('fa-eye');
                toggleIcon.classList.add('fa-eye-slash');
            } else {
                passwordInput.type = "password";
                toggleIcon.classList.remove('fa-eye-slash');
                toggleIcon.classList.add('fa-eye');
            }
        });
    }
}
setupPasswordToggle('toggle-reg-password', 'reg-password'); 
setupPasswordToggle('toggle-login-password', 'login-password'); 
setupPasswordToggle('toggle-reset-password', 'reset-new-password');


// =========================================================================
// 🚫 LOGIC 3: ADMIN REDIRECT (ADMIN KO REGISTER SE ROKNA)
// =========================================================================
const roleSelect = document.getElementById('reg-role');
if (roleSelect) {
    roleSelect.addEventListener('change', function() {
        if (this.value === 'admin') {
            alert("ADMIN cannot register again.\nPlease login directly by registered phone number.\nIf you do not know about password go to forgotten password option.");
            window.location.href = "login.html";
        }
    });
}


// =========================================================================
// 🔥 LOGIC 4: API INTEGRATION (FRONTEND SE BACKEND DATA BHEJNA)
// =========================================================================

// ---------------------------------------------------------
// A. REGISTER FORM SUBMIT (Data ko DB me save karna)
// ---------------------------------------------------------
const registerForm = document.getElementById('register-form');

if (registerForm) {
    registerForm.addEventListener('submit', async function(event) {
        event.preventDefault(); // Page refresh roko

        // 🟢 NAYA: Button ka text change karke user ko rukne bolo
        const submitBtn = registerForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerText;
        submitBtn.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> Creating Account...";
        submitBtn.disabled = true;

        // 1. Dabba (JSON body) taiyar karo HTML se data utha kar
        const requestBody = {
            userId: document.getElementById('reg-userid').value,
            userName: document.getElementById('reg-username').value,
            email: document.getElementById('reg-email').value,
            name: document.getElementById('reg-name').value,
            profileUrl: document.getElementById('reg-profile-url').value,
            
            // 🟢 NAYA LOGIC: Ye dono naye data backend bhej rahe hain
            profileBackgroundUrl: document.getElementById('reg-bg-url').value, 
            aboutMe: document.getElementById('reg-about').value, 
            
            password: document.getElementById('reg-password').value,
            phoneNumber: document.getElementById('reg-phone').value,
            role: document.getElementById('reg-role').value
        };

        try {
            // 2. Delivery Boy (Fetch) ko bhejo
            const response = await fetch(BASE_URL + "/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" }, 
                body: JSON.stringify(requestBody) 
            });

            const data = await response.json();

            // 3. Success ya Error check karo
            if (data.success === true) {
                alert("🎉 Success: " + data.message); 
                window.location.href = "login.html"; // Login page par bhej do
            } else {
                alert("❌ Error: " + data.message); 
            }
        } catch (error) {
            alert("⚠️ Server down hai ya internet nahi chal raha!");
        } finally {
            // Button wapas theek kardo
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });
}


// ---------------------------------------------------------
// B. LOGIN FORM SUBMIT (Token lana aur LocalStorage me rakhna)
// ---------------------------------------------------------
const loginForm = document.getElementById('login-form');

if (loginForm) {
    loginForm.addEventListener('submit', async function(event) {
        event.preventDefault();

    // NAYA: Button ko pakdo aur text badlo
        const loginBtn = loginForm.querySelector('button[type="submit"]');
        loginBtn.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> Please wait, checking details...";
        loginBtn.disabled = true; // Button disable kar do taaki user baar-baar na dabaye        

        const requestBody = {
            phoneNumber: document.getElementById('login-phone').value,
            password: document.getElementById('login-password').value
        };

        try {
            const response = await fetch(BASE_URL + "/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestBody)
            });

            const data = await response.json();

            if (data.success === true) {
                alert("🎉 " + data.message);
                
                // 🔥 THE MAGIC: Token aur User ki details browser ke batue me save kar li
                localStorage.setItem("token", data.data.token);
                localStorage.setItem("role", data.data.role);
                localStorage.setItem("userName", data.data.userName);
                localStorage.setItem("userId", data.data.userId);
                
                // Login ke baad Dashboard/Home page par bhejna (Abhi ke liye alert)
                alert("Ab tu andar aa gaya hai! (Dashboard par redirect hoga)");
                window.location.href = "dashboard.html"; // Tere dashboard ka naam likh dena
            } else {
                alert("❌ Login Failed: " + data.message); // Galat password
            }
        } catch (error) {
            alert("⚠️ Server down hai ya internet nahi chal raha!");
        }
    });
}


// ---------------------------------------------------------
// C. FORGOT PASSWORD (OTP Bhejna aur Verify Karna)
// ---------------------------------------------------------
const forgotForm = document.getElementById('forgot-form');
const otpModal = document.getElementById('otp-modal');
const closeModalBtn = document.getElementById('close-modal');
const forgotEmailInput = document.getElementById('forgot-email'); 
const resetEmailInput = document.getElementById('reset-email');   
const resetForm = document.getElementById('reset-form');
const forgotpasswordBtn = document.querySelector('.forgotten-password'); 

// Login page ke 'Forgot Password' button se navigate karana
if (forgotpasswordBtn) {
    forgotpasswordBtn.addEventListener('click', function() {
        window.location.href = "forgot.html";
    });
}

// 1. Send OTP Logic
if (forgotForm) {
    forgotForm.addEventListener('submit', async function(event) {
        event.preventDefault(); 
        const userEmail = forgotEmailInput.value;

        try {
            // Swagger ke hisaab se Send-OTP me data JSON body me nahi, URL me Query Parameter ki tarah jata hai (?email=...)
            const response = await fetch(BASE_URL + "/api/auth/forgot/send-otp?email=" + encodeURIComponent(userEmail), {
                method: "POST"
            });

            const data = await response.json();

            if (data.success === true) {
                alert("✉️ " + data.message); 
                
                // Pop-up kholne ka logic
                resetEmailInput.value = userEmail; // Email khud fill kar diya
                otpModal.classList.add('show');
            } else {
                alert("❌ " + data.message); // Email nahi mila toh
            }
        } catch (error) {
            alert("⚠️ Error sending OTP. Server down hai!");
        }
    });

    // Close Pop-up
    closeModalBtn.addEventListener('click', function() {
        otpModal.classList.remove('show');
    });
    window.addEventListener('click', function(event) {
        if (event.target === otpModal) {
            otpModal.classList.remove('show');
        }
    });

    // 2. Reset Password Logic (Pop-up submit hone par)
    resetForm.addEventListener('submit', async function(event) {
        event.preventDefault(); 

        const requestBody = {
            email: document.getElementById('reset-email').value,
            otp: document.getElementById('reset-otp').value,
            newPassword: document.getElementById('reset-new-password').value
        };

        try {
            const response = await fetch(BASE_URL + "/api/auth/forgot/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestBody)
            });

            const data = await response.json();

            if (data.success === true) {
                alert("✅ " + data.message + "\nAb naye password se login karo!");
                window.location.href = "login.html"; // Wapas login bhej do
            } else {
                alert("❌ " + data.message); // Galat OTP
            }
        } catch (error) {
            alert("⚠️ Server down hai!");
        }
    });
}

// ===== TASK 2: REGISTRATION FORM FILE UPLOAD TO BASE64 =====
(function() {
    function setupImageUpload(fileInputId, nameDisplayId, urlInputId, previewImgId) {
        const fileInput = document.getElementById(fileInputId);
        const nameDisplay = document.getElementById(nameDisplayId);
        const urlInput = document.getElementById(urlInputId);
        const previewImg = previewImgId ? document.getElementById(previewImgId) : null;

        if (fileInput && nameDisplay && urlInput) {
            fileInput.addEventListener('change', function(e) {
                const file = e.target.files[0];
                if (file) {
                    nameDisplay.textContent = file.name;
                    
                    if (file.size > 1024 * 1024) { 
                        alert("Please select an image smaller than 1MB.");
                        fileInput.value = "";
                        nameDisplay.textContent = "No file chosen";
                        return;
                    }

                    const reader = new FileReader();
                    reader.onloadend = function() {
                        const base64String = reader.result;
                        urlInput.value = base64String;
                        if (previewImg) {
                            previewImg.src = base64String;
                        }
                    };
                    reader.readAsDataURL(file);
                } else {
                    nameDisplay.textContent = "No file chosen";
                }
            });
        }
    }

    setupImageUpload('reg-profile-file', 'reg-profile-name', 'reg-profile-url', 'preview-img');
    setupImageUpload('reg-bg-file', 'reg-bg-name', 'reg-bg-url', null);
})();