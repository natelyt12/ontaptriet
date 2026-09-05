/**
 * Module: Giao diện Cài đặt (scripts/settings-view.js)
 * Chịu trách nhiệm:
 * - Tweak tiêu đề Ontaptriet v2 ở top-center nhận label tùy chỉnh với animation fadeout / fadein
 * - Điều hướng giữa Menu chính và Màn hình Cài đặt
 * - Khởi tạo các sự kiện cho nút Cài đặt, Đổi giao diện, và Quay lại
 */

let DEFAULT_BRAND_TITLE = 'Ontaptriet <span class="brand-version">v2</span>';

/**
 * Cập nhật tiêu đề ở top-center với hiệu ứng fadeout và fadein mượt mà
 * @param {string} content - Nội dung HTML hoặc chữ mới (mặc định là Ontaptriet v2)
 * @param {function} [onDone] - Callback khi animation hoàn tất
 */
function setBrandTitle(content = DEFAULT_BRAND_TITLE, onDone) {
    const container = document.getElementById("brand-title-content") || document.querySelector("#brand-header .brand-title");
    if (!container) {
        if (typeof onDone === "function") onDone();
        return;
    }

    if (container.innerHTML.trim() === content.trim()) {
        if (typeof onDone === "function") onDone();
        return;
    }

    // 1. Fade out tiêu đề hiện tại
    container.classList.remove("brand-fade-in");
    container.classList.add("brand-fade-out");

    setTimeout(() => {
        // 2. Thay đổi nội dung
        container.innerHTML = content;
        container.classList.remove("brand-fade-out");
        container.classList.add("brand-fade-in");

        // 3. Dọn class fade-in sau khi hoàn tất
        setTimeout(() => {
            container.classList.remove("brand-fade-in");
            if (typeof onDone === "function") onDone();
        }, 220);
    }, 180);
}

/**
 * Chuyển từ Menu chính sang Màn hình Cài đặt
 */
function showSettingsScreen() {
    if (DropdownAnimationLock && DropdownAnimationLock.isLocked) return;
    if (DropdownAnimationLock) {
        DropdownAnimationLock.lock();
    }

    // Đổi tiêu đề top-center thành "Cài đặt" với hiệu ứng fade
    setBrandTitle("Cài đặt");

    const menuScreen = document.getElementById("menu-screen");
    const settingsScreen = document.getElementById("settings-screen");

    if (menuScreen) {
        menuScreen.classList.add("quiz-fade-out-only");
    }

    setTimeout(() => {
        if (menuScreen) {
            menuScreen.style.display = "none";
            menuScreen.classList.remove("quiz-fade-out-only");
        }

        if (settingsScreen) {
            settingsScreen.style.display = "block";

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
            }, 600);
        }

        if (DropdownAnimationLock) {
            DropdownAnimationLock.unlock();
        }
    }, 220);
}

/**
 * Trở về Menu chính từ Màn hình Cài đặt
 */
function returnToMenuFromSettings() {
    if (DropdownAnimationLock && DropdownAnimationLock.isLocked) return;

    // Đóng dropdown font nếu đang mở
    if (typeof InlineDropdown !== "undefined" && typeof InlineDropdown.closeAll === "function") {
        InlineDropdown.closeAll();
    }

    if (DropdownAnimationLock) {
        DropdownAnimationLock.lock();
    }

    // Trả lại tiêu đề mặc định Ontaptriet v2
    setBrandTitle(DEFAULT_BRAND_TITLE);

    const menuScreen = document.getElementById("menu-screen");
    const settingsScreen = document.getElementById("settings-screen");

    if (settingsScreen) {
        settingsScreen.classList.add("quiz-fade-out-only");
    }

    setTimeout(() => {
        if (settingsScreen) {
            settingsScreen.style.display = "none";
            settingsScreen.classList.remove("quiz-fade-out-only");
        }

        if (menuScreen) {
            menuScreen.style.display = "block";
            menuScreen.classList.add("menu-fade-in-only");
            setTimeout(() => {
                menuScreen.classList.remove("menu-fade-in-only");
            }, 300);
        }

        if (DropdownAnimationLock) {
            DropdownAnimationLock.unlock();
        }
    }, 220);
}

/**
 * Khởi tạo sự kiện cho Màn hình Cài đặt
 */
function initSettingsView() {
    const settingsBtn = document.getElementById("settings-btn");
    const settingsBackBtn = document.getElementById("settings-back-btn");
    const themeBtn = document.getElementById("theme-toggle-btn");

    if (settingsBtn) {
        settingsBtn.onclick = () => {
            showSettingsScreen();
        };
    }

    if (settingsBackBtn) {
        settingsBackBtn.onclick = () => {
            returnToMenuFromSettings();
        };
    }

    if (themeBtn) {
        themeBtn.onclick = () => {
            if (typeof toggleTheme === "function") {
                toggleTheme();
            }
        };
    }

    const lwBtn = document.getElementById("lw-toggle-btn");
    if (lwBtn) {
        lwBtn.onclick = () => {
            if (typeof toggleLiveWallpaper === "function") {
                toggleLiveWallpaper();
            }
        };
    }
}

