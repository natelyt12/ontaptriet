/**
 * Module: Giao diện Kết quả bài thi (scripts/result-view.js)
 * Chịu trách nhiệm:
 * - Hiển thị điểm số bài thi thang điểm 10 và số câu đúng
 * - Hiển thị danh sách các câu trả lời sai kèm câu hỏi và toàn bộ đáp án
 * - Tô màu đỏ cho đáp án người dùng chọn sai, màu xanh gạch chân cho đáp án đúng
 * - Hiệu ứng Stagger trồi lên tuần tự cho từng khối và từng câu sai
 * - Nút "Làm lại ›" và "Về menu chính"
 */

function renderQuizResult() {
    const quizScreen = document.getElementById("quiz-screen");
    const resultScreen = document.getElementById("result-screen");
    const targetEl = resultScreen || quizScreen;
    if (!targetEl) return;

    if (quizScreen && resultScreen) {
        quizScreen.style.display = "none";
        quizScreen.innerHTML = "";
        resultScreen.style.display = "block";
        resultScreen.classList.remove("quiz-fade-out-only");
    }

    // Ẩn status bar ở dưới cùng khi kết thúc bài thi
    const statusBar = document.getElementById("quiz-status-bar");
    if (statusBar) {
        statusBar.classList.remove("active");
    }
    if (typeof resetBackBtnState === "function") {
        resetBackBtnState();
    }

    // Khóa click trong lúc đang chạy animation stagger
    if (DropdownAnimationLock) {
        DropdownAnimationLock.lock();
    }

    const res = typeof getQuizResult === "function" ? getQuizResult() : {
        score10Display: "0.0",
        correctCount: 0,
        totalCount: 0,
        mistakes: [],
        subjectName: "",
        chapterName: ""
    };

    const mistakes = Array.isArray(res.mistakes) ? res.mistakes : [];
    const prefixes = ["A", "B", "C", "D", "E", "F"];

    // Tính toán animation delay stagger
    let currentDelay = 0.04;
    const stepDelay = 0.05;

    const summaryDelay = currentDelay;
    currentDelay += stepDelay;

    const mistakesHeaderDelay = currentDelay;
    currentDelay += stepDelay;

    // Render HTML danh sách câu sai
    let mistakesHtml = "";
    if (mistakes.length === 0) {
        mistakesHtml = `
            <div class="mistakes-empty-congrats quiz-item-enter" style="animation-delay: ${currentDelay.toFixed(2)}s;">
                Xuất sắc! Bạn đã trả lời đúng toàn bộ câu hỏi.
            </div>
        `;
        currentDelay += stepDelay;
    } else {
        const itemsHtml = mistakes.map((item, idx) => {
            // Giới hạn max delay stagger để không bị trễ quá lâu nếu sai nhiều câu
            const itemDelay = Math.min(0.75, currentDelay + idx * stepDelay);

            // Render danh sách options
            let optionsHtml = "";
            if (Array.isArray(item.options) && item.options.length > 0) {
                optionsHtml = item.options.map((opt, optIdx) => {
                    const isWrongSelected = optIdx === item.selectedIndex;
                    const isCorrectAnswer = optIdx === item.correctIndex;
                    let optClass = "mistake-option";
                    if (isWrongSelected) optClass += " answer-wrong";
                    if (isCorrectAnswer) optClass += " answer-correct-revealed";

                    return `
                        <div class="${optClass}">
                            <span class="option-prefix">${prefixes[optIdx] || ""}.</span>
                            <span class="option-text">${opt}</span>
                        </div>
                    `;
                }).join("");
            } else {
                // Fallback nếu thiếu danh sách options
                optionsHtml = `
                    <div class="mistake-option answer-wrong">
                        <span class="option-prefix">✕ Đã chọn:</span> <span class="option-text">${item.selected || "(Chưa chọn)"}</span>
                    </div>
                    <div class="mistake-option answer-correct-revealed">
                        <span class="option-prefix">✓ Đáp án đúng:</span> <span class="option-text">${item.correct || ""}</span>
                    </div>
                `;
            }

            const qNum = item.questionNumber || (idx + 1);

            return `
                <div class="mistake-item quiz-item-enter" style="animation-delay: ${itemDelay.toFixed(2)}s;">
                    <div class="mistake-question">
                        <strong class="question-number">Câu ${qNum}:</strong>
                        <span class="question-text">${item.question}</span>
                    </div>
                    <div class="mistake-options">
                        ${optionsHtml}
                    </div>
                </div>
            `;
        }).join("");

        currentDelay += Math.min(mistakes.length, 10) * stepDelay;

        mistakesHtml = `
            <div class="mistakes-list">
                ${itemsHtml}
            </div>
        `;
    }

    const actionsDelay = (currentDelay + 0.04).toFixed(2);

    targetEl.innerHTML = `
        <div class="result-container">
            <!-- 1. Tóm tắt điểm số -->
            <div class="result-summary-card quiz-item-enter" style="animation-delay: ${summaryDelay.toFixed(2)}s;">
                <div class="quiz-question">
                    <strong class="question-number">Hoàn thành bài thi!</strong>
                    <span class="question-text">${res.subjectName} (${res.chapterName})</span>
                </div>
                <div class="result-score-line">
                    Điểm số: <strong style="font-size: 26px;">${res.score10Display}</strong> / 10<br/>
                    Số câu trả lời đúng: <strong>${res.correctCount} / ${res.totalCount}</strong> câu
                </div>
            </div>

            <!-- 2. Danh sách các câu làm sai -->
            <div class="mistakes-section">
                <div class="mistakes-header quiz-item-enter" style="animation-delay: ${mistakesHeaderDelay.toFixed(2)}s;">
                    <span class="mistakes-title">Các câu trả lời sai:</span>
                    <span class="mistakes-count">${mistakes.length} câu</span>
                </div>
                ${mistakesHtml}
            </div>

            <!-- 3. Nút thao tác điều hướng -->
            <div class="menu-actions quiz-item-enter" style="animation-delay: ${actionsDelay}s; margin-top: 20px; padding-top: 14px;">
                <button id="retry-btn" class="btn-action btn-primary"><span class="btn-label">Làm lại</span> <span class="btn-arrow">›</span></button>
                <button id="back-menu-btn" class="btn-action btn-secondary">Về menu chính</button>
            </div>
        </div>
    `;

    // Tính tổng thời gian animation trôi qua để dọn dẹp class và mở khóa
    const totalDurationMs = Math.round((parseFloat(actionsDelay) + 0.38) * 1000 + 40);

    setTimeout(() => {
        targetEl.querySelectorAll(".quiz-item-enter").forEach(el => {
            el.classList.remove("quiz-item-enter");
            el.style.animationDelay = "";
        });
        if (DropdownAnimationLock) {
            DropdownAnimationLock.unlock();
        }
    }, totalDurationMs);

    const retryBtn = document.getElementById("retry-btn");
    if (retryBtn) {
        retryBtn.onclick = () => {
            currentQuestionIndex = 0;
            userScore = 0;
            userAnswersLog = [];
            if (typeof startQuiz === "function") {
                startQuiz();
            }
        };
    }

    const backMenuBtn = document.getElementById("back-menu-btn");
    if (backMenuBtn) {
        backMenuBtn.onclick = () => {
            if (typeof returnToMenu === "function") {
                returnToMenu();
            }
        };
    }
}
