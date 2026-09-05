/**
 * Module: Quản lý Hình nền động Live Wallpaper (scripts/wallpaper.js)
 * Chịu trách nhiệm:
 * - Lưu/đọc trạng thái bật/tắt live wallpaper từ LocalStorage
 * - Video lặp vô tận (loop) trong suốt phiên truy cập
 * - Chọn tuần tự (linear theo lượt) qua từng video mỗi lần chuyển/tải lại trang (tương tự như ascii loader)
 * - Hiển thị ở mức opacity 0.18 rất nhẹ nhàng, tinh tế và không che khuất chữ
 */

const LW_STORAGE_KEY = "ontaptriet_live_wallpaper";
const LW_INDEX_STORAGE_KEY = "ontaptriet_last_wallpaper_index";

const LW_TOTAL = 10;
const LW_VIDEOS = Array.from({ length: LW_TOTAL }, (_, i) => `lw/${i + 1}.mp4`);

let isLwEnabled = localStorage.getItem(LW_STORAGE_KEY) !== "off";

// Luân phiên chọn video tuần tự theo lượt mỗi lần tải trang (như ascii spinner)
let lastIdx = parseInt(localStorage.getItem(LW_INDEX_STORAGE_KEY), 10);
if (isNaN(lastIdx) || lastIdx < 0 || lastIdx >= LW_TOTAL) {
    lastIdx = -1;
}
const currentLwIndex = (lastIdx + 1) % LW_TOTAL;
localStorage.setItem(LW_INDEX_STORAGE_KEY, currentLwIndex.toString());

const currentLwVideoSrc = LW_VIDEOS[currentLwIndex];

/**
 * Áp dụng trạng thái video (play / pause / load) và cập nhật nhãn trong Cài đặt
 */
function applyLiveWallpaper(enabled, animateLabel = false) {
    isLwEnabled = enabled;
    localStorage.setItem(LW_STORAGE_KEY, enabled ? "on" : "off");

    const container = document.getElementById("live-wallpaper-container");
    const video = document.getElementById("live-wallpaper-video");
    const labelViewport = document.getElementById("lw-label-viewport");
    const targetText = enabled ? "Bật" : "Tắt";

    // Cập nhật nhãn text trong Settings với hiệu ứng cuộn
    if (labelViewport) {
        if (animateLabel && typeof animateLabelRoll === "function") {
            animateLabelRoll(labelViewport, targetText);
        } else {
            labelViewport.innerHTML = `<span class="label-text-current">${targetText}</span>`;
        }
    }

    if (!container || !video) return;

    const isDark = document.documentElement.getAttribute("data-theme") === "dark";

    if (enabled) {
        container.classList.add("active");
        if (isDark) {
            video.loop = true;
            if (!video.src || !video.src.includes(currentLwVideoSrc)) {
                video.src = currentLwVideoSrc;
            }
            video.play().catch(() => {});
        } else {
            video.pause();
        }
    } else {
        container.classList.remove("active");
        setTimeout(() => {
            if (!isLwEnabled) {
                video.pause();
            }
        }, 500);
    }
}

/**
 * Đồng bộ trạng thái phát video theo theme (Tự động pause video ở Light mode để tiết kiệm pin)
 */
function syncWallpaperWithTheme(theme) {
    const container = document.getElementById("live-wallpaper-container");
    const video = document.getElementById("live-wallpaper-video");
    if (!video || !container) return;

    if (theme === "dark" && isLwEnabled) {
        video.loop = true;
        if (!video.src || !video.src.includes(currentLwVideoSrc)) {
            video.src = currentLwVideoSrc;
        }
        video.play().catch(() => {});
        container.classList.add("active");
    } else {
        setTimeout(() => {
            const isDark = document.documentElement.getAttribute("data-theme") === "dark";
            if (!isDark) {
                video.pause();
            }
        }, 500);
    }
}

/**
 * Chuyển đổi trạng thái Bật / Tắt live wallpaper
 */
function toggleLiveWallpaper() {
    if (DropdownAnimationLock && DropdownAnimationLock.isLocked) return;
    applyLiveWallpaper(!isLwEnabled, true);
}

/**
 * Khởi tạo hình nền động khi tải trang
 */
function initLiveWallpaper() {
    const video = document.getElementById("live-wallpaper-video");
    if (video) {
        video.loop = true;
    }
    applyLiveWallpaper(isLwEnabled, false);
}


