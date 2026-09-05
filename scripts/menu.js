/**
 * Module: Giao diện Menu chính (scripts/menu.js)
 * Chịu trách nhiệm:
 * - Chọn môn học, chương học qua dropdown
 * - Chọn chế độ ôn tập: Random cả đề (checkbox [X] / [   ]) hoặc theo phạm vi
 * - Chọn số lượng câu hỏi (khi Random bật)
 * - Nhập phạm vi câu từ... đến... (khi Random tắt)
 * - Nút Bắt đầu, Xem lịch sử, Đổi giao diện
 * - Khởi chạy bài thi (animation chuyển từ Menu sang Quiz)
 */

// Các biến lưu trạng thái lựa chọn bài thi
let selectedSubjectKey = "ktmt";
let selectedChapterVal = "all";
let selectedLimit = "25";

// Trạng thái chế độ ngẫu nhiên hoặc theo phạm vi
let isRandomQuestions = true;
let rangeFromVal = 1;
let rangeToVal = 25;
let currentAvailableTotal = 249;

// Các instance của Dropdown component
let subjectDropdown = null;
let chapterDropdown = null;

/**
 * Khởi tạo Menu chính
 */
function initMenu() {
    // 1. Khởi tạo Component Dropdown Môn học
    subjectDropdown = new InlineDropdown({
        containerId: "dropdown-subject",
        initialText: appConfig[selectedSubjectKey] ? appConfig[selectedSubjectKey].name : "",
        getItems: () => {
            return Object.keys(appConfig).map(key => ({
                key: key,
                name: appConfig[key].name
            }));
        },
        onSelect: (itemData) => {
            selectedSubjectKey = itemData.key;
            selectedChapterVal = "all";

            // Khi đổi môn, reset chương về "Tất cả"
            if (chapterDropdown) {
                const chapContainer = document.getElementById("dropdown-chapter");
                if (chapContainer) chapContainer.classList.remove("has-selection");
                chapterDropdown.setValueText("Tất cả", true);
            }
            updateAvailableCount();
        }
    });

    // 2. Khởi tạo Component Dropdown Chương học
    chapterDropdown = new InlineDropdown({
        containerId: "dropdown-chapter",
        initialText: "Tất cả",
        getItems: () => {
            const subjectData = appConfig[selectedSubjectKey];
            if (!subjectData) return [];
            return [
                { value: "all", name: "Tất cả" },
                ...(subjectData.files || []).map((f, idx) => ({ value: idx, name: f.name }))
            ];
        },
        onSelect: (itemData) => {
            selectedChapterVal = itemData.value;
            updateAvailableCount();
        }
    });

    // 3. Khởi tạo checkbox Random cả đề
    initRandomToggle();

    // 4. Khởi tạo bộ chọn số lượng câu
    initLimitSelector();

    // 5. Khởi tạo ô nhập phạm vi ôn thi
    initRangeInputs();

    // 6. Khởi tạo sự kiện nút Bắt đầu, Xem lịch sử và Chuyển đổi giao diện
    initActionButtons();

    // 7. Khởi tạo Giao diện Cài đặt
    if (typeof initSettingsView === "function") {
        initSettingsView();
    }

    // 8. Khởi tạo Component Dropdown Chọn Font
    if (typeof initFontDropdown === "function") {
        initFontDropdown();
    }

    // 9. Khởi tạo sự kiện cho thanh status bar ở dưới cùng
    if (typeof initStatusBar === "function") {
        initStatusBar();
    }

    // Tự động cập nhật số lượng câu tối đa
    updateAvailableCount();
}

/**
 * Chuyển đổi giữa chế độ Random cả đề và Theo phạm vi
 */
function initRandomToggle() {
    const toggleBtn = document.getElementById("random-toggle-btn");
    const rowLimit = document.getElementById("row-limit");
    const rowRange = document.getElementById("row-range");

    if (!toggleBtn) return;

    toggleBtn.addEventListener("click", () => {
        if (DropdownAnimationLock && DropdownAnimationLock.isLocked) return;

        isRandomQuestions = !isRandomQuestions;

        if (isRandomQuestions) {
            toggleBtn.classList.add("active");
            if (rowLimit) {
                rowLimit.style.display = "flex";
                rowLimit.classList.add("menu-fade-in-only");
            }
            if (rowRange) {
                rowRange.style.display = "none";
            }
        } else {
            toggleBtn.classList.remove("active");
            if (rowLimit) {
                rowLimit.style.display = "none";
            }
            if (rowRange) {
                rowRange.style.display = "flex";
                rowRange.classList.add("menu-fade-in-only");
                updateAvailableCount();
            }
        }
    });
}

/**
 * Khởi tạo ô nhập phạm vi ôn luyện từ câu ... đến câu ...
 */
function initRangeInputs() {
    const fromInput = document.getElementById("range-from");
    const toInput = document.getElementById("range-to");

    if (fromInput) {
        fromInput.addEventListener("input", () => {
            const val = parseInt(fromInput.value, 10);
            if (!isNaN(val) && val >= 1) {
                rangeFromVal = val;
            }
        });
        fromInput.addEventListener("blur", () => {
            if (isNaN(parseInt(fromInput.value, 10)) || parseInt(fromInput.value, 10) < 1) {
                fromInput.value = "1";
                rangeFromVal = 1;
            }
        });
    }

    if (toInput) {
        toInput.addEventListener("input", () => {
            const val = parseInt(toInput.value, 10);
            if (!isNaN(val) && val >= 1) {
                rangeToVal = val;
            }
        });
        toInput.addEventListener("blur", () => {
            let val = parseInt(toInput.value, 10);
            if (isNaN(val) || val < 1) {
                val = Math.min(25, currentAvailableTotal);
                toInput.value = val.toString();
                rangeToVal = val;
            }
        });
    }
}

/**
 * Cập nhật số lượng câu hỏi tối đa dựa trên môn và chương đang chọn
 */
async function updateAvailableCount() {
    const hintEl = document.getElementById("range-total-hint");
    const toInput = document.getElementById("range-to");
    const fromInput = document.getElementById("range-from");

    try {
        if (typeof fetchAllSubjectQuestions === "function") {
            const questions = await fetchAllSubjectQuestions(selectedSubjectKey, selectedChapterVal);
            if (Array.isArray(questions) && questions.length > 0) {
                currentAvailableTotal = questions.length;
            }
        }
    } catch (e) {
        console.warn("Không thể tính tổng số câu hỏi:", e);
    }

    if (hintEl) {
        hintEl.textContent = `/ ${currentAvailableTotal} câu`;
    }

    if (toInput) {
        toInput.max = currentAvailableTotal;
        if (parseInt(toInput.value, 10) > currentAvailableTotal) {
            toInput.value = currentAvailableTotal.toString();
            rangeToVal = currentAvailableTotal;
        }
    }
    if (fromInput) {
        fromInput.max = currentAvailableTotal;
    }
}

/**
 * Bộ chọn số lượng câu (Custom Limit Selector)
 */
function initLimitSelector() {
    const choices = document.querySelectorAll(".limit-choice");
    choices.forEach(choice => {
        choice.addEventListener("click", () => {
            if (DropdownAnimationLock && DropdownAnimationLock.isLocked) return;
            choices.forEach(c => c.classList.remove("active"));
            choice.classList.add("active");
            selectedLimit = choice.getAttribute("data-value");
        });
    });
}

/**
 * Sự kiện nút Bắt đầu, Xem lịch sử và Chuyển đổi giao diện
 */
function initActionButtons() {
    const startBtn = document.getElementById("start-btn");
    const historyBtn = document.getElementById("history-btn");
    const themeBtn = document.getElementById("theme-toggle-btn");

    if (startBtn) {
        startBtn.onclick = () => {
            startQuiz();
        };
    }

    if (historyBtn) {
        historyBtn.onclick = () => {
            if (DropdownAnimationLock && DropdownAnimationLock.isLocked) return;
            if (typeof showHistoryScreen === "function") {
                showHistoryScreen();
            }
        };
    }

    if (themeBtn) {
        themeBtn.onclick = () => {
            if (typeof toggleTheme === "function") {
                toggleTheme();
            }
        };
    }

    // Áp dụng theme đã lưu ngay khi khởi tạo
    if (typeof applyTheme === "function") {
        applyTheme(currentTheme, false);
    }
}

/**
 * Bắt đầu bài thi: Tải dữ liệu, animation thoát menu chính, hiển thị quiz
 */
async function startQuiz() {
    if (DropdownAnimationLock && DropdownAnimationLock.isLocked) return;
    DropdownAnimationLock.lock();

    try {
        // 0. Fadeout title Ontaptriet & copyright ở góc dưới
        const brandHeader = document.getElementById("brand-header");
        if (brandHeader) {
            brandHeader.classList.add("fade-out");
        }
        const copyright = document.getElementById("site-copyright");
        if (copyright) {
            copyright.classList.add("fade-out");
        }

        // 1. Tải và chuẩn bị bộ câu hỏi theo đúng chế độ đã chọn
        await loadQuizQuestions(
            selectedSubjectKey,
            selectedChapterVal,
            selectedLimit,
            isRandomQuestions,
            rangeFromVal,
            rangeToVal
        );

        // 2. Fade out cả cụm menu chính tại chỗ (không trượt)
        const menuScreen = document.getElementById("menu-screen");
        if (menuScreen) {
            menuScreen.classList.add("quiz-fade-out-only");
        }

        // 3. Sau khi menu chính fade out (220ms), hiển thị quiz và trượt status bar lên từ cạnh dưới
        setTimeout(() => {
            const quizScreen = document.getElementById("quiz-screen");

            if (menuScreen) {
                menuScreen.style.display = "none";
                menuScreen.classList.remove("quiz-fade-out-only");
            }

            if (quizScreen) {
                quizScreen.style.display = "block";
                if (typeof renderCurrentQuestion === "function") {
                    renderCurrentQuestion();
                }
            }

            // Thanh status bar di chuyển từ dưới cạnh màn hình lên cùng nhịp với câu hỏi
            const statusBar = document.getElementById("quiz-status-bar");
            if (statusBar) {
                statusBar.classList.add("active");
            }
            if (typeof resetBackBtnState === "function") {
                resetBackBtnState();
            }
        }, 220);
    } catch (err) {
        console.error("Lỗi khi tải bài thi:", err);
        alert("Không thể tải bài thi: " + err.message);
        DropdownAnimationLock.unlock();
    }
}
