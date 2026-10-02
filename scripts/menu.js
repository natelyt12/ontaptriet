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

    toggleBtn.addEventListener("mousedown", (e) => {
        if (e.button !== undefined && e.button !== 0) return;
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
 * Chuẩn hóa và kiểm tra tính hợp lệ của phạm vi câu hỏi (Từ câu ... đến câu ...)
 * - Không cho phép nhập vượt quá số câu tối đa (currentAvailableTotal)
 * - Không cho phép index câu đầu lớn hơn index câu cuối
 * @param {'from'|'to'|null} source - Nguồn gọi kiểm tra để ưu tiên giữ giá trị đang sửa
 */
function validateRangeInputs(source = null) {
    const fromInput = document.getElementById("range-from");
    const toInput = document.getElementById("range-to");
    if (!fromInput || !toInput) return;

    let fromVal = parseInt(fromInput.value, 10);
    let toVal = parseInt(toInput.value, 10);

    // 1. Kiểm tra giá trị rỗng hoặc nhỏ hơn 1
    if (isNaN(fromVal) || fromVal < 1) fromVal = 1;
    if (isNaN(toVal) || toVal < 1) toVal = 1;

    // 2. Không được vượt quá số câu tối đa hiện có
    if (fromVal > currentAvailableTotal) fromVal = currentAvailableTotal;
    if (toVal > currentAvailableTotal) toVal = currentAvailableTotal;

    // 3. Đảm bảo câu đầu không được lớn hơn câu cuối
    if (fromVal > toVal) {
        if (source === "from") {
            toVal = fromVal;
        } else if (source === "to") {
            fromVal = toVal;
        } else {
            toVal = fromVal;
        }
    }

    fromInput.value = fromVal.toString();
    toInput.value = toVal.toString();
    fromInput.max = currentAvailableTotal;
    toInput.max = currentAvailableTotal;

    rangeFromVal = fromVal;
    rangeToVal = toVal;
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
            if (!isNaN(val)) {
                if (val > currentAvailableTotal) {
                    fromInput.value = currentAvailableTotal.toString();
                    rangeFromVal = currentAvailableTotal;
                } else if (val >= 1) {
                    rangeFromVal = val;
                }
            }
        });
        fromInput.addEventListener("blur", () => {
            validateRangeInputs("from");
        });
        fromInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                fromInput.blur();
            }
        });
    }

    if (toInput) {
        toInput.addEventListener("input", () => {
            const val = parseInt(toInput.value, 10);
            if (!isNaN(val)) {
                if (val > currentAvailableTotal) {
                    toInput.value = currentAvailableTotal.toString();
                    rangeToVal = currentAvailableTotal;
                } else if (val >= 1) {
                    rangeToVal = val;
                }
            }
        });
        toInput.addEventListener("blur", () => {
            validateRangeInputs("to");
        });
        toInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                toInput.blur();
            }
        });
    }
}

/**
 * Cập nhật số lượng câu hỏi tối đa dựa trên môn và chương đang chọn
 */
async function updateAvailableCount() {
    const hintEl = document.getElementById("range-total-hint");

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

    validateRangeInputs(null);
}

/**
 * Bộ chọn số lượng câu (Custom Limit Selector)
 */
function initLimitSelector() {
    const choices = document.querySelectorAll(".limit-choice");
    choices.forEach(choice => {
        choice.addEventListener("mousedown", (e) => {
            if (e.button !== undefined && e.button !== 0) return;
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
        startBtn.onmousedown = (e) => {
            if (e && e.button !== 0) return;
            startQuiz();
        };
    }

    if (historyBtn) {
        historyBtn.onmousedown = (e) => {
            if (e && e.button !== 0) return;
            if (DropdownAnimationLock && DropdownAnimationLock.isLocked) return;
            if (typeof showHistoryScreen === "function") {
                showHistoryScreen();
            }
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

    // Áp dụng theme đã lưu ngay khi khởi tạo
    if (typeof applyTheme === "function") {
        applyTheme(currentTheme, false, false);
    }
}

/**
 * Bắt đầu bài thi: Tải dữ liệu song song với animation thoát menu, hiển thị quiz
 */
async function startQuiz() {
    try {
        // Close any open dropdowns immediately so they don't block or flash during the fade
        if (typeof InlineDropdown !== "undefined" && typeof InlineDropdown.closeAllImmediate === "function") {
            InlineDropdown.closeAllImmediate();
        }

        // Kick off data loading immediately — runs in parallel with the fade-out animation
        if (!isRandomQuestions) {
            validateRangeInputs(null);
        }
        const questionsPromise = loadQuizQuestions(
            selectedSubjectKey,
            selectedChapterVal,
            selectedLimit,
            isRandomQuestions,
            rangeFromVal,
            rangeToVal
        );

        await ScreenSwitcher.to("quiz-screen", {
            autoUnlock: false, // quiz-view manages its own animation lock after render
            onBeforeFade: () => {
                // Fade out header & copyright synchronously — no await, no delay
                const brandHeader = document.getElementById("brand-header");
                if (brandHeader) brandHeader.classList.add("fade-out");

                const copyright = document.getElementById("site-copyright");
                if (copyright) copyright.classList.add("fade-out");
            },
            onShow: async () => {
                // Wait for data to be ready (usually already done by the time fade completes)
                await questionsPromise;

                if (typeof renderCurrentQuestion === "function") {
                    renderCurrentQuestion();
                }

                const statusBar = document.getElementById("quiz-status-bar");
                if (statusBar) statusBar.classList.add("active");

                if (typeof resetBackBtnState === "function") {
                    resetBackBtnState();
                }
            }
        });
    } catch (err) {
        console.error("Lỗi khi tải bài thi:", err);
        alert("Không thể tải bài thi: " + err.message);
    }
}
