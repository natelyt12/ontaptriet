const currentVersion = "1.5.1";

// --- QUẢN LÝ PHIÊN BẢN ---
function updateVersionUI() {
    const versionElements = document.querySelectorAll("#app-version-text");
    versionElements.forEach(el => {
        el.textContent = currentVersion;
    });
}

// --- QUẢN LÝ HÌNH NỀN ---
function initWallpaper() {
    const bgVideo = document.getElementById("bg-video");

    // Tự động play hình nền video trên mọi thiết bị
    if (bgVideo) {
        bgVideo.play().catch(e => console.log("Trình duyệt chặn autoplay video:", e));
    }
}

// Chạy hàm khởi tạo khi trang tải xong
document.addEventListener("DOMContentLoaded", () => {
    updateVersionUI();
    initWallpaper();
    initMenu();
});

document.addEventListener("DOMContentLoaded", () => {
    const themeToggleBtn = document.getElementById("theme-toggle");
    const themeIcon = document.getElementById("theme-icon");
    
    // Load saved theme
    const savedTheme = localStorage.getItem("app_theme") || "dark";
    if (savedTheme === "light") {
        document.body.classList.add("light-mode");
        if(themeIcon) themeIcon.textContent = "🌙";
    }

    if (themeToggleBtn && themeIcon) {
        themeToggleBtn.addEventListener("click", () => {
            document.body.classList.toggle("light-mode");
            const isLight = document.body.classList.contains("light-mode");
            localStorage.setItem("app_theme", isLight ? "light" : "dark");
            themeIcon.textContent = isLight ? "🌙" : "☀️";
        });
    }

    // Focus Mode Logic
    const focusToggleBtn = document.getElementById("focus-toggle");
    const focusIcon = document.getElementById("focus-icon");
    
    const savedFocus = localStorage.getItem("app_focus") === "true";
    if (savedFocus) {
        document.body.classList.add("focus-mode");
        if(focusIcon) focusIcon.textContent = "👁️";
    }

    if (focusToggleBtn && focusIcon) {
        focusToggleBtn.addEventListener("click", () => {
            document.body.classList.toggle("focus-mode");
            const isFocus = document.body.classList.contains("focus-mode");
            localStorage.setItem("app_focus", isFocus);
            focusIcon.textContent = isFocus ? "👁️" : "🎯";
        });
    }
});