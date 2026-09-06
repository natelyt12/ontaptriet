/**
 * Module: Điều phối chuyển màn hình (scripts/screen-switcher.js)
 * Chịu trách nhiệm:
 * - Điều phối Fade Out giữa các Màn hình Lớp Lớn (menu, quiz, result, history, settings)
 * - Quản lý tập trung Animation Lock (DropdownAnimationLock)
 * - Đảm bảo tính nhất quán của thời gian chuyển cảnh (220ms)
 * - Để ngỏ cho từng màn hình tự do quản lý hiệu ứng Stagger nội bộ của riêng mình
 */

const ScreenSwitcher = {
    screenIds: [
        "menu-screen",
        "quiz-screen",
        "result-screen",
        "history-screen",
        "history-detail-screen",
        "settings-screen"
    ],

    /**
     * Chuyển đổi mượt mà từ màn hình hiện tại sang targetScreenId
     * @param {string} targetScreenId - ID của phần tử màn hình đích
     * @param {Object} [options]
     * @param {Function} [options.onBeforeFade] - Async/Sync callback trước khi fade (vd: tải dữ liệu, set header)
     * @param {Function} [options.onShow] - Callback khi màn hình mới vừa hiển thị (display: block)
     * @param {boolean} [options.fadeIn] - Có áp dụng hiệu ứng pureFadeIn cho màn hình mới không (mặc định: false)
     * @param {boolean} [options.autoUnlock] - Tự động mở khóa sau khi chuyển xong (mặc định: true)
     * @param {number} [options.fadeDuration] - Thời gian fade out (ms, mặc định: 350)
     */
    async to(targetScreenId, options = {}) {
        if (typeof DropdownAnimationLock !== "undefined" && DropdownAnimationLock && DropdownAnimationLock.isLocked) {
            return false;
        }
        if (typeof DropdownAnimationLock !== "undefined" && DropdownAnimationLock) {
            DropdownAnimationLock.lock();
        }

        const {
            onBeforeFade,
            onShow,
            fadeIn = false,
            autoUnlock = true,
            fadeDuration = 350
        } = options;

        const allScreens = ScreenSwitcher.screenIds
            .map(id => document.getElementById(id))
            .filter(Boolean);

        const visibleScreens = allScreens.filter(el => el.id !== targetScreenId && el.style.display !== "none");

        try {
            if (typeof onBeforeFade === "function") {
                await onBeforeFade();
            }

            if (visibleScreens.length > 0) {
                visibleScreens.forEach(el => el.classList.add("quiz-fade-out-only"));
            }

            const delay = visibleScreens.length > 0 ? fadeDuration : 0;

            setTimeout(() => {
                try {
                    visibleScreens.forEach(el => {
                        el.style.display = "none";
                        el.classList.remove("quiz-fade-out-only");
                    });

                    const target = document.getElementById(targetScreenId);
                    if (target) {
                        target.style.display = "block";
                        target.classList.remove("quiz-fade-out-only");

                        if (fadeIn) {
                            target.classList.add("menu-fade-in-only");
                            setTimeout(() => {
                                target.classList.remove("menu-fade-in-only");
                            }, 380);
                        }
                    }

                    if (typeof onShow === "function") {
                        onShow(target);
                    }

                    if (autoUnlock && typeof DropdownAnimationLock !== "undefined" && DropdownAnimationLock) {
                        if (fadeIn) {
                            setTimeout(() => {
                                DropdownAnimationLock.unlock();
                            }, 380);
                        } else {
                            DropdownAnimationLock.unlock();
                        }
                    }
                } catch (innerErr) {
                    console.error("ScreenSwitcher: Lỗi khi hiển thị màn hình đích:", innerErr);
                    if (typeof DropdownAnimationLock !== "undefined" && DropdownAnimationLock) {
                        DropdownAnimationLock.unlock();
                    }
                }
            }, delay);

            return true;
        } catch (err) {
            console.error("ScreenSwitcher: Lỗi trong quá trình chuyển cảnh:", err);
            visibleScreens.forEach(el => el.classList.remove("quiz-fade-out-only"));
            if (typeof DropdownAnimationLock !== "undefined" && DropdownAnimationLock) {
                DropdownAnimationLock.unlock();
            }
            throw err;
        }
    }
};
