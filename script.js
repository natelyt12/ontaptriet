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

// --- CANVAS BACKGROUND LOGIC ---
const canvas = document.getElementById("bg-canvas");
const ctx = canvas.getContext("2d");
let animationId = null;
let particles = [];
let bgMode = localStorage.getItem("bg_mode") || "snow"; // Lưu chế độ bg người dùng chọn

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// Fade in canvas khi load
window.addEventListener("load", () => {
    canvas.style.opacity = "1";
    setBG(bgMode);
});

function toggleBGMenu() {
    document.getElementById("bg-menu").classList.toggle("hidden");
}

// Cập nhật hàm setBG để nhận diện 2 hiệu ứng mới
function setBG(mode) {
    bgMode = mode;
    localStorage.setItem("bg_mode", mode);
    if (animationId) cancelAnimationFrame(animationId);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles = [];

    if (mode === "snow") initSnow();
    else if (mode === "dots") initDots();
    else if (mode === "stars") initStars();
    else if (mode === "matrix") initMatrix(); // Mới
    else if (mode === "fireflies") initFireflies(); // Mới

    document.getElementById("bg-menu").classList.add("hidden");
}

// 1. Hiệu ứng Tuyết rơi chéo 30 độ
function initSnow() {
    for (let i = 0; i < 100; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            r: Math.random() * 3 + 1,
            d: Math.random() * 1 + 0.5, // tốc độ
        });
    }
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
        ctx.beginPath();
        for (let p of particles) {
            ctx.moveTo(p.x, p.y);
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2, true);
            // Di chuyển chéo
            p.y += p.d;
            p.x += p.d * 0.5; // Tạo góc nghiêng ~30 độ
            if (p.y > canvas.height) (p.y = -10), (p.x = Math.random() * canvas.width);
            if (p.x > canvas.width) p.x = 0;
        }
        ctx.fill();
        animationId = requestAnimationFrame(draw);
    }
    draw();
}

// 2. Hiệu ứng Liên kết hạt (Neural Network)
function initDots() {
    for (let i = 0; i < 80; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
        });
    }
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "rgba(201, 209, 217, 0.5)";
        for (let i = 0; i < particles.length; i++) {
            let p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
            if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
            ctx.fillRect(p.x, p.y, 2, 2);

            for (let j = i + 1; j < particles.length; j++) {
                let p2 = particles[j];
                let dist = Math.hypot(p.x - p2.x, p.y - p2.y);
                if (dist < 100) {
                    ctx.strokeStyle = `rgba(139, 148, 158, ${1 - dist / 100})`;
                    ctx.lineWidth = 0.5;
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.stroke();
                }
            }
        }
        animationId = requestAnimationFrame(draw);
    }
    draw();
}

// 3. Hiệu ứng Vũ trụ (Starfield - Ý tưởng thêm)
function initStars() {
    for (let i = 0; i < 400; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            z: Math.random() * canvas.width,
        });
    }
    function draw() {
        ctx.fillStyle = "#0d1117";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        for (let p of particles) {
            p.z -= 2;
            if (p.z <= 0) p.z = canvas.width;
            let x = (p.x - canvas.width / 2) * (canvas.width / p.z) + canvas.width / 2;
            let y = (p.y - canvas.height / 2) * (canvas.width / p.z) + canvas.height / 2;
            let s = (1 - p.z / canvas.width) * 3;
            ctx.fillStyle = "white";
            ctx.fillRect(x, y, s, s);
        }
        animationId = requestAnimationFrame(draw);
    }
    draw();
}

// 4. Hiệu ứng Matrix Rain (Mưa mã rơi)
// 4. Hiệu ứng Matrix Rain - Phiên bản White & Slow
function initMatrix() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$+-*/=%\"'#&_(),.;:?!\\|{}<>[]^~".split("");
    const fontSize = 14;
    const columns = canvas.width / fontSize;
    const drops = [];

    for (let i = 0; i < columns; i++) drops[i] = 1;

    // Biến điều khiển tốc độ
    let lastTime = 0;
    const fps = 50; // Số càng nhỏ thì càng chậm (15-20 là đẹp)
    const nextFrameTime = 1000 / fps;

    function draw(timestamp) {
        // Tính toán thời gian giữa các khung hình để kiểm soát tốc độ
        const deltaTime = timestamp - lastTime;

        if (deltaTime > nextFrameTime) {
            // Tạo hiệu ứng mờ dần (màu nền của GitHub)
            ctx.fillStyle = "rgba(13, 17, 23, 0.15)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Đổi màu sang Trắng (với độ mờ 0.8 để không quá chói)
            ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
            ctx.font = fontSize + "px monospace";

            for (let i = 0; i < drops.length; i++) {
                const text = chars[Math.floor(Math.random() * chars.length)];
                ctx.fillText(text, i * fontSize, drops[i] * fontSize);

                // Reset khi rơi hết màn hình
                if (drops[i] * fontSize > canvas.height && Math.random() > 0.98) {
                    drops[i] = 0;
                }
                drops[i]++;
            }
            lastTime = timestamp;
        }

        animationId = requestAnimationFrame(draw);
    }

    animationId = requestAnimationFrame(draw);
}

// 5. Hiệu ứng Digital Fireflies (Đom đóm kỹ thuật số)
function initFireflies() {
    for (let i = 0; i < 50; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            s: Math.random() * 2 + 1,
            speedX: (Math.random() - 0.5) * 0.5,
            speedY: (Math.random() - 0.5) * 0.5,
            a: Math.random(), // Alpha (độ mờ)
            t: Math.random() * 100, // Time offset để hiệu ứng lung linh không bị trùng
        });
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (let p of particles) {
            p.x += p.speedX;
            p.y += p.speedY;
            p.t += 0.02;

            // Hiệu ứng lung linh (flickering) bằng hàm Sin
            let currentAlpha = Math.abs(Math.sin(p.t)) * p.a;

            ctx.beginPath();
            let gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.s * 4);
            gradient.addColorStop(0, `rgba(139, 148, 158, ${currentAlpha})`);
            gradient.addColorStop(1, `rgba(13, 17, 23, 0)`);

            ctx.fillStyle = gradient;
            ctx.arc(p.x, p.y, p.s * 4, 0, Math.PI * 2);
            ctx.fill();

            // Reset khi ra khỏi màn hình
            if (p.x < 0) p.x = canvas.width;
            if (p.x > canvas.width) p.x = 0;
            if (p.y < 0) p.y = canvas.height;
            if (p.y > canvas.height) p.y = 0;
        }
        animationId = requestAnimationFrame(draw);
    }
    draw();
}
