// --- ENTRY POINT (MAIN SCRIPT) ---

document.addEventListener("DOMContentLoaded", () => {
    // Chạy màn hình loading ASCII (/ \ -) trong 2s
    startInitialLoader();

    // Khởi tạo hình nền động (nếu đã bật)
    if (typeof initLiveWallpaper === "function") {
        initLiveWallpaper();
    }

    // Khởi tạo các sự kiện cho Menu tĩnh
    initMenu();


    // Khởi tạo các Easter Eggs (nếu có)
    if (typeof initEasterEggs === "function") {
        initEasterEggs();
    }
});