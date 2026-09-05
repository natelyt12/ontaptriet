/**
 * Module: Giao diện Kết quả bài thi (scripts/result-view.js)
 * Chịu trách nhiệm:
 * - Hiển thị điểm số bài thi thang điểm 10 và số câu đúng
 * - Nút "Làm lại ›" (Primary Action: Font bold)
 * - Nút "Về menu chính" (Secondary Action: Font italic)
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
    }

    // Ẩn status bar ở dưới cùng khi kết thúc bài thi
    const statusBar = document.getElementById("quiz-status-bar");
    if (statusBar) {
        statusBar.classList.remove("active");
    }
    if (typeof resetBackBtnState === "function") {
        resetBackBtnState();
    }

    const res = typeof getQuizResult === "function" ? getQuizResult() : {
        score10Display: "0.0",
        correctCount: 0,
        totalCount: 0,
        subjectName: "",
        chapterName: ""
    };

    targetEl.innerHTML = `
        <div class="result-container quiz-item-enter" style="animation-delay: 0.05s;">
            <div class="quiz-question">
                <strong class="question-number">Hoàn thành bài thi!</strong>
                <span class="question-text">${res.subjectName} (${res.chapterName})</span>
            </div>
            <div style="font-size: var(--uniform-size); line-height: 1.6; margin-bottom: 24px;">
                Điểm số: <strong style="font-size: 26px;">${res.score10Display}</strong> / 10<br/>
                Số câu trả lời đúng: <strong>${res.correctCount} / ${res.totalCount}</strong> câu
            </div>
            <div class="menu-actions" style="margin-top: 24px; padding-top: 14px;">
                <button id="retry-btn" class="btn-action btn-primary"><span class="btn-label">Làm lại</span> <span class="btn-arrow">›</span></button>
                <button id="back-menu-btn" class="btn-action btn-secondary">Về menu chính</button>
            </div>
        </div>
    `;

    // Mở khóa pointer-events cho màn hình kết quả
    if (DropdownAnimationLock) {
        DropdownAnimationLock.unlock();
    }

    const retryBtn = document.getElementById("retry-btn");
    if (retryBtn) {
        retryBtn.onclick = () => {
            currentQuestionIndex = 0;
            userScore = 0;
            userAnswersLog = [];
            if (resultScreen) {
                resultScreen.style.display = "none";
                resultScreen.innerHTML = "";
            }
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

