document.getElementById("start-btn").addEventListener("click", async () => {
    const subjectKey = subjectSelect.value;
    const chapterVal = chapterSelect.value;
    const limit = document.querySelector('input[name="limit"]:checked').value;
    const subjectData = appConfig[subjectKey];

    // Cập nhật thông tin cho phần lịch sử
    currentSubjectName = subjectData.name;
    currentChapterName = chapterVal === "all" ? "Tất cả các chương" : subjectData.files[chapterVal].name;

    let rawDataList = [];

    try {
        if (chapterVal === "all") {
            const promises = subjectData.files.map((file) => fetch(`${subjectData.path}/${file.file}`).then((res) => res.text()));
            rawDataList = await Promise.all(promises);
        } else {
            const fileInfo = subjectData.files[chapterVal];
            const response = await fetch(`${subjectData.path}/${fileInfo.file}`);
            const text = await response.text();
            rawDataList = [text];
        }

        let allQuestions = [];
        rawDataList.forEach((text) => {
            allQuestions = allQuestions.concat(parseQuestions(text));
        });

        if (allQuestions.length === 0) {
            alert("Không tìm thấy câu hỏi nào! Kiểm tra lại file text.");
            return;
        }

        shuffleArray(allQuestions);

        // Mix answer options
        allQuestions.forEach(q => {
            if (q.correctAnswer !== -1) {
                const correctOptText = q.options[q.correctAnswer];
                shuffleArray(q.options);
                q.correctAnswer = q.options.indexOf(correctOptText);
            }
        });

        if (limit !== "all") {
            currentQuestions = allQuestions.slice(0, parseInt(limit));
        } else {
            currentQuestions = allQuestions;
        }

        startQuiz();
    } catch (error) {
        console.error(error);
        alert("Lỗi khi tải dữ liệu: " + error.message);
    }
});

function startQuiz() {
    currentQuestionIndex = 0;
    userScore = 0;
    userAnswersLog = [];

    menuScreen.style.display = "none";
    quizScreen.style.display = "block";

    const titleEl = document.querySelector(".window-title");
    if (titleEl) {
        titleEl.innerText = currentSubjectName;
    }

    document.getElementById("total-q-num").innerText = currentQuestions.length;
    renderQuestion();
}

function renderQuestion() {
    const qData = currentQuestions[currentQuestionIndex];

    document.getElementById("current-q-num").innerText = currentQuestionIndex + 1;
    document.getElementById("q-text").innerText = qData.question;

    const optionsContainer = document.getElementById("options-container");
    optionsContainer.innerHTML = "";

    document.getElementById("next-btn").style.display = "none";
    document.getElementById("next-btn").classList.remove("tech-hover"); // Reset hover của nút Tiếp theo
    document.getElementById("feedback").innerText = "";
    currentFocusedOptionIndex = -1; // Reset focus khi sang câu mới

    qData.options.forEach((optText, index) => {
        const btn = document.createElement("button");
        btn.className = "option-btn";
        const label = String.fromCharCode(65 + index);
        btn.innerText = `${label}. ${optText}`;

        btn.onclick = () => checkAnswer(index, btn);

        optionsContainer.appendChild(btn);
    });
}

function checkAnswer(selectedIndex, selectedBtn) {
    const qData = currentQuestions[currentQuestionIndex];
    const optionsContainer = document.getElementById("options-container");
    const allBtns = optionsContainer.querySelectorAll(".option-btn");

    allBtns.forEach((btn) => (btn.disabled = true));

    const isCorrect = selectedIndex === qData.correctAnswer;

    if (isCorrect) {
        selectedBtn.classList.add("correct");
        userScore++;
    } else {
        selectedBtn.classList.add("wrong");
        allBtns[qData.correctAnswer].classList.add("correct");
    }

    if (!isCorrect) {
        userAnswersLog.push({
            question: qData.question,
            selected: qData.options[selectedIndex],
            correct: qData.options[qData.correctAnswer],
            id: qData.id,
        });
    }

    const nextBtn = document.getElementById("next-btn");
    nextBtn.style.display = "block";

    if (currentQuestionIndex === currentQuestions.length - 1) {
        nextBtn.innerText = "Xem kết quả 🏁";
        nextBtn.onclick = finishQuiz;
    } else {
        nextBtn.innerText = "Câu tiếp theo ➜";
        nextBtn.onclick = () => {
            currentQuestionIndex++;
            renderQuestion();
        };
    }

    // Tự động "hover" vào nút Tiếp theo để người dùng biết chỉ cần Enter
    nextBtn.classList.add("tech-hover");
}

function finishQuiz() {
    quizScreen.style.display = "none";
    resultScreen.style.display = "block";

    const total = currentQuestions.length;
    const score10 = (userScore / total) * 10;

    document.getElementById("final-score-10").innerText = score10.toFixed(1).replace(".", ",");

    const reviewContainer = document.getElementById("review-list");
    reviewContainer.innerHTML = "";

    if (userAnswersLog.length === 0) {
        reviewContainer.innerHTML = '<p style="text-align:center; color:green">Chúc mừng! Bạn đã trả lời đúng tất cả! 🌟</p>';
    } else {
        userAnswersLog.forEach((item, idx) => {
            const div = document.createElement("div");
            div.className = "review-item";
            div.innerHTML = `
                <p><strong>Câu ${idx + 1}:</strong> ${item.question}</p>
                <p class="review-wrong">❌ Bạn chọn: ${item.selected}</p>
                <p class="review-correct">✅ Đáp án đúng: ${item.correct}</p>
            `;
            reviewContainer.appendChild(div);
        });
    }

    // GỌI HÀM LƯU LỊCH SỬ THÊM MỚI Ở ĐÂY
    if (typeof saveHistory === 'function') {
        saveHistory(score10.toFixed(1), userScore, total, currentSubjectName, currentChapterName, userAnswersLog);
    }
}

function resetToMenu() {
    quizScreen.style.display = "none";
    resultScreen.style.display = "none";
    menuScreen.style.display = "block";

    const titleEl = document.querySelector(".window-title");
    if (titleEl) {
        titleEl.innerText = "App này dùng để qua môn";
    }

    currentQuestions = [];
    currentQuestionIndex = 0;
    userScore = 0;
    userAnswersLog = [];
    
    document.getElementById("options-container").innerHTML = "";
    document.getElementById("feedback").innerText = "";
    
    const nextBtn = document.getElementById("next-btn");
    if (nextBtn) nextBtn.style.display = "none";
}

document.getElementById("back-home-btn").addEventListener("click", () => {
    appConfirm("Quay lại menu?\n\nKết quả ôn tập của bạn sẽ không được lưu lại.", () => {
        resetToMenu();
    });
});

// --- HỆ THỐNG ĐIỀU HƯỚNG BẰNG BÀN PHÍM ---
window.addEventListener("keydown", (e) => {
    // Chỉ hoạt động khi đang ở màn hình Quiz
    if (quizScreen.style.display !== "block") return;

    const optionsContainer = document.getElementById("options-container");
    const allBtns = Array.from(optionsContainer.querySelectorAll(".option-btn"));
    const nextBtn = document.getElementById("next-btn");

    // 1. Phím Escape - Thoát
    if (e.key === "Escape") {
        document.getElementById("back-home-btn").click();
        return;
    }

    // 2. Nếu đã chọn đáp án rồi (nút Tiếp theo đang hiện)
    if (nextBtn.style.display === "block") {
        if (e.key === "Enter") {
            nextBtn.click();
        }
        return; // Không cho phép chọn lại bằng phím mũi tên
    }

    // 3. Nếu chưa chọn đáp án - Điều hướng các option
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();

        if (allBtns.length === 0) return;

        if (e.key === "ArrowDown" || e.key === "ArrowRight") {
            currentFocusedOptionIndex++;
            if (currentFocusedOptionIndex >= allBtns.length) currentFocusedOptionIndex = 0;
        } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
            currentFocusedOptionIndex--;
            if (currentFocusedOptionIndex < 0) currentFocusedOptionIndex = allBtns.length - 1;
        }

        // Cập nhật trạng thái hover giả lập
        allBtns.forEach((btn, idx) => {
            if (idx === currentFocusedOptionIndex) {
                btn.classList.add("tech-hover");
                btn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } else {
                btn.classList.remove("tech-hover");
            }
        });
    }

    // 4. Phím Enter - Chọn đáp án đang focus
    if (e.key === "Enter" && currentFocusedOptionIndex !== -1) {
        if (allBtns[currentFocusedOptionIndex] && !allBtns[currentFocusedOptionIndex].disabled) {
            allBtns[currentFocusedOptionIndex].click();
        }
    }
});
