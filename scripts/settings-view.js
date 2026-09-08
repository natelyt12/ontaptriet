/**
 * Module: Giao diện Cài đặt (scripts/settings-view.js)
 * Chịu trách nhiệm:
 * - Tweak tiêu đề Ontaptriet v2 ở top-center nhận label tùy chỉnh với animation fadeout / fadein
 * - Điều hướng giữa Menu chính và Màn hình Cài đặt
 * - Khởi tạo các sự kiện cho nút Cài đặt, Đổi giao diện, và Quay lại
 */

/**
 * Chuyển từ Menu chính sang Màn hình Cài đặt (ẩn title top-center)
 */
function showSettingsScreen() {
    ScreenSwitcher.to("settings-screen", {
        autoUnlock: false,
        onBeforeFade: () => {
            const brandHeader = document.getElementById("brand-header");
            if (brandHeader) {
                brandHeader.classList.add("fade-out");
            }
        },
        onShow: (settingsScreen) => {
            // Kích hoạt animation trồi lên tuần tự cho các dòng cài đặt
            const items = settingsScreen.querySelectorAll(".settings-container > *");
            items.forEach((item, idx) => {
                item.classList.remove("quiz-item-enter");
                item.style.animationDelay = `${0.05 + idx * 0.05}s`;
                void item.offsetWidth;
                item.classList.add("quiz-item-enter");
            });

            setTimeout(() => {
                items.forEach(item => {
                    item.classList.remove("quiz-item-enter");
                    item.style.animationDelay = "";
                });
                if (DropdownAnimationLock) {
                    DropdownAnimationLock.unlock();
                }
            }, 600);
        }
    });
}

/**
 * Trở về Menu chính từ Màn hình Cài đặt (hiện lại title top-center)
 */
function returnToMenuFromSettings() {
    // Đóng dropdown font nếu đang mở
    if (typeof InlineDropdown !== "undefined" && typeof InlineDropdown.closeAll === "function") {
        InlineDropdown.closeAll();
    }

    ScreenSwitcher.to("menu-screen", {
        fadeIn: true,
        autoUnlock: true,
        onShow: () => {
            const brandHeader = document.getElementById("brand-header");
            if (brandHeader) {
                brandHeader.classList.remove("fade-out");
            }
        }
    });
}

/**
 * Khởi tạo sự kiện cho Màn hình Cài đặt
 */
function initSettingsView() {
    const settingsBtn = document.getElementById("settings-btn");
    const settingsBackBtn = document.getElementById("settings-back-btn");
    const themeBtn = document.getElementById("theme-toggle-btn");

    if (settingsBtn) {
        settingsBtn.onmousedown = (e) => {
            if (e && e.button !== 0) return;
            showSettingsScreen();
        };
    }

    if (settingsBackBtn) {
        settingsBackBtn.onmousedown = (e) => {
            if (e && e.button !== 0) return;
            returnToMenuFromSettings();
        };
    }

    if (themeBtn) {
        themeBtn.onmousedown = (e) => {
            if (e && e.button !== 0) return;
            if (typeof toggleTheme === "function") {
                toggleTheme();
            }
        };
    }

    const lwBtn = document.getElementById("lw-toggle-btn");
    if (lwBtn) {
        lwBtn.onmousedown = (e) => {
            if (e && e.button !== 0) return;
            if (typeof toggleLiveWallpaper === "function") {
                toggleLiveWallpaper();
            }
        };
    }
}

