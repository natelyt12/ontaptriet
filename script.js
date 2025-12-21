let allQuestions = [];
let currentQuiz = [];
let currentIndex = 0;
let score = 0;
let selectedMode = "";

/**
 * HÀM PARSER CẢI TIẾN
 * Xử lý lỗi split không nhận diện được câu hỏi và lỗi lặp từ khóa
 */
function parseRawText(text, chapterNum) {
    const questions = [];

    // 1. CHUẨN HÓA: Thay thế các loại xuống dòng khác nhau (\r\n) thành \n để dễ xử lý
    const normalizedText = text.replace(/\r\n/g, "\n");

    /**
     * 2. CHIẾN THUẬT SPLIT MỚI:
     * Tách dựa trên cụm "Câu hỏi [số]" nằm ngay trên "Không trả lời".
     * Sử dụng \s+ để chấp nhận mọi loại khoảng trắng/xuống dòng.
     * (?=...) là Lookahead để không làm mất dữ liệu tiêu đề.
     */
    const segments = normalizedText.split(/(?=(?:\\s*)?Câu hỏi\s+\d+\s+Không trả lời)/i);

    console.group(`📂 Chương ${chapterNum}: Tìm thấy ${segments.length} đoạn thô.`);

    segments.forEach((segment, index) => {
        // Chỉ xử lý đoạn có chứa đáp án để loại bỏ header rác
        if (segment.includes("The correct answer is:")) {
            // a. Trích xuất Số câu hỏi (Dùng để xóa phần lặp lại sau này)
            const idMatch = segment.match(/Câu hỏi\s+(\d+)/i);
            const qNum = idMatch ? idMatch[1] : null;

            // b. Lấy nội dung Câu hỏi (Nằm sau "Đoạn văn câu hỏi" và trước "Select one:")
            let questionContent = "";
            const startQ = segment.indexOf("Đoạn văn câu hỏi");
            const endQ = segment.indexOf("Select one:");

            if (startQ !== -1 && endQ !== -1) {
                let rawQ = segment.substring(startQ + "Đoạn văn câu hỏi".length, endQ);

                // DỌN DẸP NỘI DUNG:
                // - Xóa các tag
                // - Xóa cụm "Câu hỏi X" bị lặp lại (dựa trên qNum vừa tìm được)
                questionContent = rawQ.replace(new RegExp(`Câu hỏi\\s*${qNum}`, "gi"), "").trim();
            }

            // c. Lấy các Lựa chọn (Nằm sau "Select one:" và trước "Phản hồi")
            const options = [];
            const startOpt = segment.indexOf("Select one:");
            const endOpt = segment.indexOf("Phản hồi");

            if (startOpt !== -1 && endOpt !== -1) {
                const optSection = segment.substring(startOpt, endOpt);
                // Tìm các mẫu: a. [nội dung] ... b. [nội dung]
                const matches = optSection.match(/[a-d]\.\n?([\s\S]*?)(?=\n[a-d]\.|\nPhản hồi|$)/g);
                if (matches) {
                    matches.forEach((m) => {
                        options.push(m.replace(/^[a-d]\.\n?/, "").trim());
                    });
                }
            }

            // d. Lấy Đáp án đúng (Nằm sau "The correct answer is:")
            let answer = "";
            const answerMatch = segment.match(/The correct answer is:\s*(.*)/i);
            if (answerMatch) {
                answer = answerMatch[1].trim();
            }

            // Kiểm tra dữ liệu cuối cùng
            if (questionContent && options.length > 0 && answer) {
                questions.push({
                    chapter: chapterNum,
                    qNum: qNum,
                    question: questionContent,
                    options: options,
                    answer: answer,
                });
            } else {
                console.warn(`⚠️ Câu hỏi index ${index} bị thiếu thông tin:`, { questionContent, optionsCount: options.length, answer });
            }
        }
    });

    console.log(`✅ Import thành công ${questions.length} câu hỏi.`);
    console.groupEnd();
    return questions;
}

/**
 * TẢI DỮ LIỆU
 */
async function loadData() {
    const files = ["chuong1.txt", "chuong2.txt", "chuong3.txt"];
    for (let i = 0; i < files.length; i++) {
        try {
            const response = await fetch(`baitap/${files[i]}`);
            const text = await response.text();
            allQuestions = [...allQuestions, ...parseRawText(text, i + 1)];
        } catch (err) {
            console.error(`Lỗi tải file ${files[i]}:`, err);
        }
    }
}

/**
 * CÁC HÀM ĐIỀU KHIỂN (Giữ nguyên logic menu của bạn)
 */

// Chuyển màn hình
function switchScreen(toId) {
    document.querySelectorAll('section').forEach(s => s.classList.add('hidden'));
    document.getElementById(toId).classList.remove('hidden');
}

function showChapterSelection() { switchScreen('chapter-screen'); }

function goBack(toId) { switchScreen(toId); }

function selectMode(mode) {
    selectedMode = mode;
    switchScreen('limit-screen');
}

function showChapterSelection() {
    document.getElementById("menu-screen").classList.add("hidden");
    document.getElementById("chapter-screen").classList.remove("hidden");
}

function goBack(toId) {
    switchScreen(toId);
}

function selectMode(mode) {
    selectedMode = mode;
    document.getElementById("menu-screen").classList.add("hidden");
    document.getElementById("chapter-screen").classList.add("hidden");
    document.getElementById("limit-screen").classList.remove("hidden");
}

function startQuiz(limit) {
    let pool = selectedMode === "all" ? [...allQuestions] : allQuestions.filter((q) => q.chapter == selectedMode);

    // Xáo trộn (Shuffle)
    pool.sort(() => Math.random() - 0.5);

    currentQuiz = limit === 0 || limit > pool.length ? pool : pool.slice(0, limit);
    currentIndex = 0;
    score = 0;

    document.getElementById("limit-screen").classList.add("hidden");
    document.getElementById("quiz-screen").classList.remove("hidden");
    renderQuestion();
}

function renderQuestion() {
    const q = currentQuiz[currentIndex];
    document.getElementById("progress").innerText = `Câu ${currentIndex + 1}/${currentQuiz.length} (Chương ${q.chapter})`;
    document.getElementById("question-text").innerText = q.question;

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
    const correct = currentQuiz[currentIndex].answer;
    const all = document.querySelectorAll(".option");
    all.forEach((el) => (el.style.pointerEvents = "none"));

    if (selected.trim() === correct.trim()) {
        element.classList.add("correct");
        score++;
    } else {
        element.classList.add("wrong");
        all.forEach((el) => {
            if (el.innerText.trim() === correct.trim()) el.classList.add("correct");
        });
    }
    document.getElementById("score-live").innerText = `Đúng: ${score}`;
    document.getElementById("next-btn").classList.remove("hidden");
}

function nextQuestion() {
    currentIndex++;
    if (currentIndex < currentQuiz.length) renderQuestion();
    else showResult();
}

function showResult() {
    document.getElementById("quiz-screen").classList.add("hidden");
    document.getElementById("result-screen").classList.remove("hidden");
    document.getElementById("final-score").innerText = `Bạn đạt ${score}/${currentQuiz.length} điểm!`;
}

window.onload = loadData;
/**
 * 2. TẢI DỮ LIỆU TỪ FILE
 */
async function loadAllData() {
    const chapters = [
        { path: "baitap/chuong1.txt", id: 1 },
        { path: "baitap/chuong2.txt", id: 2 },
        { path: "baitap/chuong3.txt", id: 3 },
    ];

    for (const ch of chapters) {
        try {
            const response = await fetch(ch.path);
            if (!response.ok) throw new Error("Không tìm thấy file");
            const data = await response.text();
            const parsed = parseRawText(data, ch.id);
            allQuestions = [...allQuestions, ...parsed];
        } catch (err) {
            console.error(`Lỗi tải chương ${ch.id}:`, err);
        }
    }
    console.log("Hệ thống đã sẵn sàng với " + allQuestions.length + " câu hỏi.");
}

/**
 * 3. LOGIC ĐIỀU KHIỂN GIAO DIỆN
 */
function showChapterSelection() {
    document.getElementById("menu-screen").classList.add("hidden");
    document.getElementById("chapter-screen").classList.remove("hidden");
}

function selectMode(mode) {
    selectedMode = mode;
    document.getElementById("menu-screen").classList.add("hidden");
    document.getElementById("chapter-screen").classList.add("hidden");
    document.getElementById("limit-screen").classList.remove("hidden");
}

function startQuiz(limit) {
    // 1. Lọc câu hỏi theo chế độ đã chọn
    let pool = selectedMode === "all" ? [...allQuestions] : allQuestions.filter((q) => q.chapter == selectedMode);

    // 2. Trộn ngẫu nhiên toàn bộ danh sách (Fisher-Yates Shuffle)
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    // 3. Lấy số lượng câu theo yêu cầu
    currentQuiz = limit === 0 || limit > pool.length ? pool : pool.slice(0, limit);

    // Reset trạng thái
    currentIndex = 0;
    score = 0;

    // Chuyển màn hình
    document.getElementById("limit-screen").classList.add("hidden");
    document.getElementById("quiz-screen").classList.remove("hidden");
    renderQuestion();
}

function renderQuestion() {
    const q = currentQuiz[currentIndex];

    // Cập nhật tiến độ và câu hỏi
    document.getElementById("progress").innerText = `Câu ${currentIndex + 1} / ${currentQuiz.length} (Chương ${q.chapter})`;
    document.getElementById("question-text").innerText = q.question;

    // Hiển thị các lựa chọn
    const container = document.getElementById("options-container");
    container.innerHTML = "";

    q.options.forEach((opt) => {
        const div = document.createElement("div");
        div.className = "option";
        div.innerText = opt;
        div.onclick = () => handleSelection(div, opt);
        container.appendChild(div);
    });

    document.getElementById("next-btn").classList.add("hidden");
}

function handleSelection(element, selectedText) {
    const correct = currentQuiz[currentIndex].answer;
    const allOptions = document.querySelectorAll(".option");

    // Khóa không cho chọn lại
    allOptions.forEach((el) => (el.style.pointerEvents = "none"));

    if (selectedText.trim() === correct.trim()) {
        element.classList.add("correct");
        score++;
    } else {
        element.classList.add("wrong");
        // Hiển thị đáp án đúng để người dùng học
        allOptions.forEach((el) => {
            if (el.innerText.trim() === correct.trim()) {
                el.classList.add("correct");
            }
        });
    }

    document.getElementById("score-live").innerText = `Đúng: ${score}`;
    document.getElementById("next-btn").classList.remove("hidden");
}

function nextQuestion() {
    currentIndex++;
    if (currentIndex < currentQuiz.length) {
        renderQuestion();
    } else {
        showFinalResult();
    }
}

function showFinalResult() {
    document.getElementById("quiz-screen").classList.add("hidden");
    document.getElementById("result-screen").classList.remove("hidden");
    document.getElementById("final-score").innerText = `Bạn đã hoàn thành bài ôn tập!\nSố câu đúng: ${score} / ${currentQuiz.length}`;
}

// Khởi chạy hệ thống khi vào trang
window.onload = loadAllData;
