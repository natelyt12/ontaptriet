/**
 * Module: Giao diện Cài đặt (scripts/settings-view.js)
 * Chịu trách nhiệm:
 * - Tweak tiêu đề Ontaptriet v2 ở top-center nhận label tùy chỉnh với animation fadeout / fadein
 * - Điều hướng giữa Menu chính và Màn hình Cài đặt
 * - Khởi tạo các sự kiện cho nút Cài đặt, Đổi giao diện, và Quay lại
 */

let settingsPreviousScreen = "menu-screen";

/**
 * Chuyển từ màn hình bất kỳ sang Màn hình Cài đặt (ẩn title top-center và status bar nếu cần)
 */
function showSettingsScreen(fromScreen = "menu-screen") {
    settingsPreviousScreen = fromScreen;
    
    const backLabel = document.getElementById("settings-back-label");
    if (backLabel) {
        backLabel.textContent = (fromScreen === "quiz-screen") ? "Quay lại bài làm" : "Về menu chính";
    }

    ScreenSwitcher.to("settings-screen", {
        autoUnlock: false,
        onBeforeFade: () => {
            const brandHeader = document.getElementById("brand-header");
            if (brandHeader) {
                brandHeader.classList.add("fade-out");
            }
            if (fromScreen === "quiz-screen") {
                const statusBar = document.getElementById("quiz-status-bar");
                if (statusBar) statusBar.classList.remove("active");
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
 * Trở về màn hình trước đó từ Màn hình Cài đặt
 */
function returnToMenuFromSettings() {
    // Đóng dropdown font ngay lập tức (không delay 220ms) để fade-out bắt đầu liền tay
    if (typeof InlineDropdown !== "undefined" && typeof InlineDropdown.closeAllImmediate === "function") {
        InlineDropdown.closeAllImmediate();
    }

    ScreenSwitcher.to(settingsPreviousScreen, {
        fadeIn: true,
        autoUnlock: true,
        onShow: () => {
            if (settingsPreviousScreen !== "quiz-screen") {
                const brandHeader = document.getElementById("brand-header");
                if (brandHeader) {
                    brandHeader.classList.remove("fade-out");
                }
            } else {
                const statusBar = document.getElementById("quiz-status-bar");
                if (statusBar) statusBar.classList.add("active");
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

