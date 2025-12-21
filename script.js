let allQuestions = [];
let currentQuiz = [];
let currentIndex = 0;
let score = 0;
let selectedMode = "";
let wrongQuestions = []; // Lưu các câu làm sai để xem lại

// 1. Parser (Giữ nguyên logic cực mạnh của bạn)
function parseRawText(text, chapterNum) {
    const questions = [];
    const normalizedText = text.replace(/\r\n/g, "\n");
    const segments = normalizedText.split(/(?=(?:\\s*)?Câu hỏi\s+\d+\s+Không trả lời)/i);

    segments.forEach((segment) => {
        if (segment.includes("The correct answer is:")) {
            const idMatch = segment.match(/Câu hỏi\s+(\d+)/i);
            const qNum = idMatch ? idMatch[1] : null;

            let questionContent = "";
            const startQ = segment.indexOf("Đoạn văn câu hỏi");
            const endQ = segment.indexOf("Select one:");

            if (startQ !== -1 && endQ !== -1) {
                let rawQ = segment.substring(startQ + "Đoạn văn câu hỏi".length, endQ);
                questionContent = rawQ.replace(new RegExp(`Câu hỏi\\s*${qNum}`, "gi"), "").trim();
            }

            const options = [];
            const startOpt = segment.indexOf("Select one:");
            const endOpt = segment.indexOf("Phản hồi");

            if (startOpt !== -1 && endOpt !== -1) {
                const optSection = segment.substring(startOpt, endOpt);
                const matches = optSection.match(/[a-d]\.\n?([\s\S]*?)(?=\n[a-d]\.|\nPhản hồi|$)/g);
                if (matches) {
                    matches.forEach((m) => {
                        options.push(m.replace(/^[a-d]\.\n?/, "").trim());
                    });
                }
            }

            let answer = "";
            const answerMatch = segment.match(/The correct answer is:\s*(.*)/i);
            if (answerMatch) answer = answerMatch[1].trim();

            if (questionContent && options.length > 0 && answer) {
                questions.push({ chapter: chapterNum, question: questionContent, options: options, answer: answer });
            }
        }
    });
    return questions;
}

// 2. LocalStorage Logic
function saveToHistory(grade10, total, mode) {
    let history = JSON.parse(localStorage.getItem("quiz_history") || "[]");
    const newEntry = {
        date: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + " " + new Date().toLocaleDateString("vi-VN"),
        grade: grade10,
        mode: mode === "all" ? "Tất cả" : "Chương " + mode,
    };

    history.unshift(newEntry);
    history = history.slice(0, 2);
    localStorage.setItem("quiz_history", JSON.stringify(history));
    displayHistory();
}

function displayHistory() {
    const history = JSON.parse(localStorage.getItem("quiz_history") || "[]");
    const container = document.getElementById("history-container");
    const list = document.getElementById("history-list");

    if (history.length > 0) {
        container.classList.remove("hidden");
        list.innerHTML = history
            .map(
                (item) => `
            <div class="history-item">
                <span>${item.mode} <small class="text-muted" style="font-size:10px">${item.date}</small></span>
                <span style="font-weight:bold">${item.grade}</span>
            </div>
        `
            )
            .join("");
    }
}

// 3. Quiz Control Logic
async function loadData() {
    const files = ["chuong1.txt", "chuong2.txt", "chuong3.txt"];
    for (let i = 0; i < files.length; i++) {
        try {
            const response = await fetch(`baitap/${files[i]}`);
            const text = await response.text();
            allQuestions = [...allQuestions, ...parseRawText(text, i + 1)];
        } catch (err) {
            console.error(err);
        }
    }
    displayHistory();
}

function switchScreen(toId) {
    document.querySelectorAll("section").forEach((s) => s.classList.add("hidden"));
    document.getElementById(toId).classList.remove("hidden");
}

function startQuiz(limit) {
    let pool = selectedMode === "all" ? [...allQuestions] : allQuestions.filter((q) => q.chapter == selectedMode);
    pool.sort(() => Math.random() - 0.5);
    currentQuiz = limit === 0 || limit > pool.length ? pool : pool.slice(0, limit);
    currentIndex = 0;
    score = 0;
    wrongQuestions = [];
    switchScreen("quiz-screen");
    renderQuestion();
}

function renderQuestion() {
    const q = currentQuiz[currentIndex];
    document.getElementById("progress").innerText = `Câu ${currentIndex + 1} / ${currentQuiz.length}`;
    document.getElementById("question-text").innerText = q.question;
    document.getElementById("score-live").innerText = `Đúng: ${score}`;

    const container = document.getElementById("options-container");
    container.innerHTML = "";
    q.options.forEach((opt) => {
        const div = document.createElement("div");
        div.className = "option";
        div.innerText = opt;
        div.onclick = () => checkAnswer(div, opt);
        container.appendChild(div);
    });
    document.getElementById("next-btn").classList.add("hidden");
}

function checkAnswer(element, selected) {
    const q = currentQuiz[currentIndex];
    const correct = q.answer;
    const all = document.querySelectorAll(".option");
    all.forEach((el) => (el.style.pointerEvents = "none"));

    if (selected.trim() === correct.trim()) {
        element.classList.add("correct");
        score++;
    } else {
        element.classList.add("wrong");
        // Lưu câu sai
        wrongQuestions.push({
            question: q.question,
            selected: selected,
            correct: correct,
        });
        all.forEach((el) => {
            if (el.innerText.trim() === correct.trim()) el.classList.add("correct");
        });
    }
    document.getElementById("next-btn").classList.remove("hidden");
}

function nextQuestion() {
    currentIndex++;
    if (currentIndex < currentQuiz.length) renderQuestion();
    else showResult();
}

function showResult() {
    switchScreen("result-screen");

    const total = currentQuiz.length;
    const percent = Math.round((score / total) * 100);

    // Tính điểm hệ 10 và làm tròn 1 chữ số thập phân
    const grade10 = ((score / total) * 10).toFixed(1);

    // Đổ dữ liệu vào giao diện
    document.getElementById("final-percent").innerText = `${percent}%`;

    // Hiển thị: "Điểm: 8.5 (17/20)"
    document.getElementById("final-ratio").innerText = `Điểm: ${grade10} (${score}/${total})`;

    document.getElementById("final-score").innerText = `Bạn đã hoàn thành bài ôn tập.`;

    // Hiển thị nút xem lại nếu có câu sai
    if (wrongQuestions.length > 0) {
        document.getElementById("review-btn").classList.remove("hidden");
    } else {
        document.getElementById("review-btn").classList.add("hidden");
    }

    // Lưu lịch sử (Lưu cả điểm hệ 10 vào lịch sử cho oai)
    saveToHistory(grade10, total, selectedMode);
}

function toggleReview() {
    const list = document.getElementById("wrong-answers-list");
    const container = document.getElementById("wrong-items-container");

    if (list.classList.contains("hidden")) {
        list.classList.remove("hidden");
        container.innerHTML = wrongQuestions
            .map(
                (q, i) => `
            <div class="wrong-item">
                <span class="q-txt">${i + 1}. ${q.question}</span>
                <div class="your-ans">✖ Bạn chọn: ${q.selected}</div>
                <div class="correct-ans">✔ Đáp án đúng: ${q.correct}</div>
            </div>
        `
            )
            .join("");
        document.getElementById("review-btn").innerText = "Ẩn câu làm sai";
    } else {
        list.classList.add("hidden");
        document.getElementById("review-btn").innerText = "Xem câu làm sai";
    }
}

function showChapterSelection() {
    switchScreen("chapter-screen");
}
function selectMode(mode) {
    selectedMode = mode;
    switchScreen("limit-screen");
}
function goBack(id) {
    switchScreen(id);
}

window.onload = loadData;
