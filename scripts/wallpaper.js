/**
 * Module: Quản lý Hình nền động Live Wallpaper (scripts/wallpaper.js)
 * Chịu trách nhiệm:
 * - Lưu/đọc trạng thái bật/tắt live wallpaper từ LocalStorage
 * - Video lặp vô tận (loop) trong suốt phiên truy cập
 * - Chọn tuần tự (linear theo lượt) qua từng video mỗi lần chuyển/tải lại trang (tương tự như ascii loader)
 * - Hiển thị ở mức opacity 0.18 rất nhẹ nhàng, tinh tế và không che khuất chữ
 */

const LW_STORAGE_KEY = "ontaptriet_live_wallpaper";
const LW_ORDER_KEY = "ontaptriet_wallpaper_order";
const LW_INDEX_KEY = "ontaptriet_wallpaper_idx";

const LW_TOTAL = 10;
const LW_VIDEOS = Array.from({ length: LW_TOTAL }, (_, i) => `lw/${i + 1}.mp4`);

let isLwEnabled = localStorage.getItem(LW_STORAGE_KEY) === "on";

// Thuật toán Cycle Shuffle: Xáo trộn danh sách theo vòng, hết lượt đảo lại đảm bảo video đầu != video cuối cũ
function getNextCycledWallpaperIndex() {
    function shuffleArray(arr, lastItem = null) {
        const copy = [...arr];
        for (let i = copy.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        if (lastItem !== null && copy.length > 1 && copy[0] === lastItem) {
            const swapIdx = Math.floor(Math.random() * (copy.length - 1)) + 1;
            [copy[0], copy[swapIdx]] = [copy[swapIdx], copy[0]];
        }
        return copy;
    }

    let order = null;
    try {
        order = JSON.parse(localStorage.getItem(LW_ORDER_KEY));
    } catch (e) { }

    let idx = parseInt(localStorage.getItem(LW_INDEX_KEY), 10);

    if (!Array.isArray(order) || order.length !== LW_TOTAL || isNaN(idx)) {
        order = shuffleArray(Array.from({ length: LW_TOTAL }, (_, i) => i), null);
        idx = 0;
    } else {
        idx++;
        if (idx >= order.length) {
            const lastItem = order[order.length - 1];
            order = shuffleArray(order, lastItem);
            idx = 0;
        }
    }

    localStorage.setItem(LW_ORDER_KEY, JSON.stringify(order));
    localStorage.setItem(LW_INDEX_KEY, idx.toString());

    return order[idx];
}

const currentLwIndex = getNextCycledWallpaperIndex();
const currentLwVideoSrc = LW_VIDEOS[currentLwIndex];

/**
 * Áp dụng trạng thái video (play / pause / load) và cập nhật nhãn trong Cài đặt
 */
function applyLiveWallpaper(enabled, animateLabel = false, save = true) {
    isLwEnabled = enabled;
    if (save) {
        localStorage.setItem(LW_STORAGE_KEY, enabled ? "on" : "off");
    }

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
    applyLiveWallpaper(!isLwEnabled, true, true);
}

/**
 * Khởi tạo hình nền động khi tải trang
 */
function initLiveWallpaper() {
    const video = document.getElementById("live-wallpaper-video");
    if (video) {
        video.loop = true;
    }
    applyLiveWallpaper(isLwEnabled, false, false);
}


