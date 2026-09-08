/**
 * Module: Giao diện Làm bài thi (scripts/quiz-view.js)
 * Chịu trách nhiệm:
 * - Render câu hỏi, tiền tố A/B/C/D, animation trượt lên tuần tự (Expo Out)
 * - Xử lý click chọn đáp án (đúng: SVG border sweep; sai: rung nhẹ)
 * - Nút "Câu tiếp theo ›" / "Xem kết quả ›" fade từ phải sang
 * - Chuyển câu mượt mà (Expo In trượt lên, Expo Out trồi lên)
 * - Thanh Status Bar ở đáy và nút Quay lại (xác nhận 2 bước)
 * - Điều hướng về Menu chính
 */

let isBackConfirming = false;
let backResetTimer = null;
let copyResetTimer = null;

/**
 * Quản lý trạng thái nút quay lại ở status bar dưới cùng
 */
function resetBackBtnState() {
    isBackConfirming = false;
    clearTimeout(backResetTimer);
    const backBtn = document.getElementById("quiz-back-btn");
    const viewport = document.getElementById("quiz-back-viewport");
    if (backBtn) backBtn.classList.remove("confirming");
    if (viewport) {
        const currentSpan = viewport.querySelector(".label-text-current");
        const currentText = currentSpan ? currentSpan.textContent.trim() : viewport.textContent.trim();
        if (currentText !== "Quay lại") {
            if (typeof animateLabelRoll === "function") {
                animateLabelRoll(viewport, "Quay lại");
            } else {
                viewport.innerHTML = `<span class="label-text-current">Quay lại</span>`;
            }
        }
    } else if (backBtn) {
        const label = backBtn.querySelector(".back-label");
        if (label) label.textContent = "Quay lại";
    }
}

/**
 * Reset nhãn nút copy câu hỏi về trạng thái ban đầu
 */
function resetCopyBtnState() {
    clearTimeout(copyResetTimer);
    const copyViewport = document.getElementById("quiz-copy-viewport");
    if (copyViewport) {
        const currentSpan = copyViewport.querySelector(".label-text-current");
        if (currentSpan && currentSpan.textContent.trim() !== "Copy câu hỏi này") {
            if (typeof animateLabelRoll === "function") {
                animateLabelRoll(copyViewport, "Copy câu hỏi này");
            } else {
                copyViewport.innerHTML = `<span class="label-text-current">Copy câu hỏi này</span>`;
            }
        }
    }
}

/**
 * Sao chép văn bản vào clipboard với fallback hỗ trợ mọi trình duyệt
 */
async function copyTextToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (e) {
            // Chuyển sang fallback bên dưới
        }
    }
    try {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "-9999px";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand("copy");
        document.body.removeChild(textArea);
        return successful;
    } catch (err) {
        console.error("Lỗi khi sao chép:", err);
        return false;
    }
}

/**
 * Định dạng nội dung câu hỏi và các đáp án để copy (không bao gồm tiền tố "Câu XX")
 */
function formatQuestionForCopy(qData) {
    if (!qData) return "";
    let questionText = (qData.question || "").trim();
    // Loại bỏ tiền tố "Câu XX:", "Câu XX.", "Câu XX -", "Câu XX " nếu có sẵn trong dữ liệu gốc
    questionText = questionText.replace(/^câu\s*\d+[\s:.-]*/i, "").trim();

    const prefixes = ["A", "B", "C", "D", "E", "F", "G", "H"];
    const optionsText = (qData.options || []).map((opt, idx) => {
        const prefix = prefixes[idx] || String.fromCharCode(65 + idx);
        let text = (opt || "").trim();
        // Loại bỏ tiền tố A., B., a., b. nếu dữ liệu gốc đã gắn sẵn
        text = text.replace(/^[a-z]\.\s*/i, "").trim();
        return `${prefix}. ${text}`;
    });

    if (optionsText.length > 0) {
        return `${questionText}\n${optionsText.join("\n")}`;
    }
    return questionText;
}

/**
 * Xử lý sự kiện khi bấm nút Copy câu hỏi
 */
async function handleCopyCurrentQuestion() {
    if (!currentQuestions || !currentQuestions[currentQuestionIndex]) return;
    const qData = currentQuestions[currentQuestionIndex];
    const textToCopy = formatQuestionForCopy(qData);
    if (!textToCopy) return;

    const success = await copyTextToClipboard(textToCopy);
    if (success) {
        const copyViewport = document.getElementById("quiz-copy-viewport");
        if (copyViewport) {
            clearTimeout(copyResetTimer);
            if (typeof animateLabelRoll === "function") {
                animateLabelRoll(copyViewport, "Đã copy!");
            } else {
                copyViewport.innerHTML = `<span class="label-text-current">Đã copy!</span>`;
            }

            copyResetTimer = setTimeout(() => {
                resetCopyBtnState();
            }, 2000);
        }
    }
}

function initStatusBar() {
    const backBtn = document.getElementById("quiz-back-btn");
    const backViewport = document.getElementById("quiz-back-viewport");
    if (backBtn) {
        backBtn.addEventListener("mousedown", (e) => {
            if (e.button !== undefined && e.button !== 0) return;
            if (!isBackConfirming) {
                isBackConfirming = true;
                backBtn.classList.add("confirming");
                if (backViewport && typeof animateLabelRoll === "function") {
                    animateLabelRoll(backViewport, "Xác nhận");
                } else {
                    const label = backBtn.querySelector(".back-label") || backViewport;
                    if (label) label.textContent = "Xác nhận";
                }

                clearTimeout(backResetTimer);
                backResetTimer = setTimeout(resetBackBtnState, 4000);
            } else {
                resetBackBtnState();
                resetCopyBtnState();
                returnToMenu();
            }
        });
    }

    const copyBtn = document.getElementById("quiz-copy-btn");
    if (copyBtn) {
        copyBtn.addEventListener("mousedown", (e) => {
            if (e.button !== undefined && e.button !== 0) return;
            handleCopyCurrentQuestion();
        });
    }
}

/**
 * Render câu hỏi hiện tại theo đúng format yêu cầu
 */
function renderCurrentQuestion() {
    const quizScreen = document.getElementById("quiz-screen");
    if (!quizScreen) return;

    resetCopyBtnState();

    const qData = currentQuestions[currentQuestionIndex];
    if (!qData) {
        quizScreen.innerHTML = `
            <div class="quiz-container">
                <div class="quiz-question">Đã hoàn thành tất cả câu hỏi!</div>
            </div>
        `;
        return;
    }

    const prefixes = ["A", "B", "C", "D", "E", "F"];
    const isLast = currentQuestionIndex === currentQuestions.length - 1;

    // Cập nhật chỉ số câu trên thanh Status Bar ở dưới cùng trang
    const statusIndexEl = document.getElementById("quiz-index-text");
    if (statusIndexEl) {
        statusIndexEl.textContent = `${currentQuestionIndex + 1}/${currentQuestions.length}`;
    }

    // Render HTML câu hỏi, các đáp án, và hàng nút câu tiếp theo
    quizScreen.innerHTML = `
        <div class="quiz-container">
            <div class="quiz-question quiz-item-enter" style="animation-delay: 0.04s;">
                <strong class="question-number">Câu ${currentQuestionIndex + 1}:</strong>
                <span class="question-text">${qData.question}</span>
            </div>
            <div class="quiz-options">
                ${qData.options.map((opt, idx) => `
                    <div class="quiz-option quiz-item-enter" data-index="${idx}" style="animation-delay: ${0.09 + idx * 0.05}s;">
                        <span class="option-prefix">${prefixes[idx] || ""}.</span> ${opt}
                    </div>
                `).join("")}
            </div>
            <div class="quiz-next-row quiz-item-enter" style="animation-delay: ${0.09 + qData.options.length * 0.05}s;">
                <button id="quiz-next-btn" class="btn-quiz-next">
                    <span class="btn-label">${isLast ? "Xem kết quả" : "Câu tiếp theo"}</span> <span class="btn-arrow">›</span>
                </button>
            </div>
        </div>
    `;

    // Khóa pointer-events trong lúc câu hỏi và các đáp án đang trượt lên
    if (DropdownAnimationLock) {
        DropdownAnimationLock.lock();
    }

    // Dọn sạch class animation enter và mở khóa pointer events sau khi animation trượt lên hoàn tất
    setTimeout(() => {
        quizScreen.querySelectorAll(".quiz-item-enter").forEach(item => {
            item.classList.remove("quiz-item-enter");
            item.style.animationDelay = "";
        });
        if (DropdownAnimationLock) {
            DropdownAnimationLock.unlock();
        }
    }, 700);

    // Gắn sự kiện click vào các đáp án (chỉ cho phép chọn 1 lần)
    const optionsContainer = quizScreen.querySelector(".quiz-options");
    const optionEls = quizScreen.querySelectorAll(".quiz-option");
    const nextBtn = quizScreen.querySelector("#quiz-next-btn");
    let hasAnswered = false;

    optionEls.forEach(el => {
        el.addEventListener("mousedown", (e) => {
            if (e.button !== undefined && e.button !== 0) return;
            if (hasAnswered) return;
            hasAnswered = true;

            // Khóa toàn bộ các lựa chọn ngay lập tức
            if (optionsContainer) {
                optionsContainer.classList.add("quiz-answered");
            }

            const selectedIdx = parseInt(el.getAttribute("data-index"), 10);
            const result = submitAnswer(selectedIdx);

            if (result.isCorrect) {
                el.classList.remove("quiz-item-enter");
                el.classList.remove("answer-wrong");
                el.classList.add("answer-correct");

                // Quét border màu xanh lá theo chiều kim đồng hồ bắt đầu từ góc trên bên trái và giữ nguyên
                const oldSvg = el.querySelector(".border-sweep-svg");
                if (oldSvg) oldSvg.remove();

                const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                svg.setAttribute("class", "border-sweep-svg");
                svg.innerHTML = `<rect x="0" y="0" width="100%" height="100%" pathLength="100" class="border-sweep-rect" />`;
                el.appendChild(svg);
            } else {
                // Đáp án sai: rung 4 phía rất nhẹ nhàng và giữ nguyên màu đỏ
                el.classList.remove("quiz-item-enter");
                el.classList.remove("answer-wrong");
                void el.offsetWidth; // Reflow kích hoạt lại animation rung
                el.classList.add("answer-wrong");

                // Khi chọn sai: đáp án đúng chuyển xanh lá và có border dưới quét từ trái qua phải
                if (result.correctIndex !== undefined && optionEls[result.correctIndex]) {
                    const correctEl = optionEls[result.correctIndex];
                    correctEl.classList.remove("quiz-item-enter");
                    correctEl.classList.remove("answer-correct");
                    void correctEl.offsetWidth; // Reflow kích hoạt animation
                    correctEl.classList.add("answer-correct-revealed");
                }
            }

            // Hiện nút "Câu tiếp theo ›" fade từ phải qua trái
            if (nextBtn) {
                nextBtn.classList.add("show-from-right");
            }
        });
    });

    // Bấm nút "Câu tiếp theo ›" để chuyển câu
    if (nextBtn) {
        let isNavigatingNext = false;
        nextBtn.addEventListener("mousedown", (e) => {
            if (e.button !== undefined && e.button !== 0) return;
            if (isNavigatingNext) return;
            isNavigatingNext = true;
            transitionToNextQuestion();
        });
    }
}

/**
 * Chuyển sang câu hỏi tiếp theo
 */
function transitionToNextQuestion() {
    const quizScreen = document.getElementById("quiz-screen");
    if (!quizScreen) {
        currentQuestionIndex++;
        if (currentQuestionIndex < currentQuestions.length) {
            renderCurrentQuestion();
        } else if (typeof renderQuizResult === "function") {
            renderQuizResult();
        }
        return;
    }

    const questionEl = quizScreen.querySelector(".quiz-question");
    const optionEls = Array.from(quizScreen.querySelectorAll(".quiz-option"));
    const nextRowEl = quizScreen.querySelector(".quiz-next-row");

    const items = [];
    if (questionEl) items.push(questionEl);
    items.push(...optionEls);
    if (nextRowEl) items.push(nextRowEl);

    if (items.length === 0) {
        currentQuestionIndex++;
        if (currentQuestionIndex < currentQuestions.length) {
            renderCurrentQuestion();
        } else if (typeof renderQuizResult === "function") {
            renderQuizResult();
        }
        return;
    }

    if (DropdownAnimationLock) {
        DropdownAnimationLock.lock();
    }

    // Từng dòng trượt lên trên và fadeout tuần tự từ trên xuống dưới (Expo In)
    const stepDelay = 0.05;
    items.forEach((item, idx) => {
        item.style.setProperty("animation-delay", `${idx * stepDelay}s`, "important");
        item.classList.add("quiz-item-exit");
    });

    const totalExitDuration = Math.round((items.length - 1) * stepDelay * 1000 + 280 + 40);
    setTimeout(() => {
        currentQuestionIndex++;
        if (currentQuestionIndex < currentQuestions.length) {
            renderCurrentQuestion();
        } else if (typeof renderQuizResult === "function") {
            renderQuizResult();
        }
    }, totalExitDuration);
}

/**
 * Trở về màn hình Menu chính từ bài thi hoặc kết quả
 */
function returnToMenu() {
    ScreenSwitcher.to("menu-screen", {
        fadeIn: true,
        autoUnlock: true,
        onBeforeFade: () => {
            const statusBar = document.getElementById("quiz-status-bar");
            if (statusBar) {
                statusBar.classList.remove("active");
            }
            resetBackBtnState();
            resetCopyBtnState();
        },
        onShow: (menuScreen) => {
            const quizScreen = document.getElementById("quiz-screen");
            if (quizScreen) {
                quizScreen.innerHTML = "";
            }
            const resultScreen = document.getElementById("result-screen");
            if (resultScreen) {
                resultScreen.innerHTML = "";
            }

            const brandHeader = document.getElementById("brand-header");
            if (brandHeader) {
                brandHeader.classList.remove("fade-out");
            }

            const copyright = document.getElementById("site-copyright");
            if (copyright) {
                copyright.classList.remove("fade-out");
            }

            if (menuScreen) {
                const rows = menuScreen.querySelectorAll(".menu-row, .menu-actions");
                rows.forEach(r => {
                    r.classList.remove("menu-exit");
                    r.style.animationDelay = "";
                });
            }
        }
    });
}

