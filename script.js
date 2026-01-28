// script.js

// 1. Hàm làm sạch text (xóa khoảng trắng thừa, xuống dòng thừa)
function cleanText(str) {
    return str ? str.trim().replace(/\s+/g, " ") : "";
}

// 2. Hàm chính: Parse text thô thành mảng câu hỏi
function parseQuestions(rawText) {
    const questions = [];

    // Tách các câu hỏi dựa trên pattern bắt đầu chung
    // Dựa vào file mẫu: "Câu hỏi [số]\nKhông trả lời"
    const rawBlocks = rawText.split(/Câu hỏi \d+\r?\nKhông trả lời/);

    rawBlocks.forEach((block, index) => {
        // Bỏ qua block rỗng (thường là phần đầu file)
        if (!block.trim()) return;

        try {
            // A. Tách nội dung câu hỏi
            // Lấy text giữa "Đoạn văn câu hỏi" và "Select one"
            const questionPart = block.split("Đoạn văn câu hỏi")[1].split(/Câu hỏi \d+Select one:/)[0];
            const questionText = cleanText(questionPart);

            // B. Tách các đáp án (Option)
            // Tìm phần text chứa các đáp án (từ sau Select one đến Phản hồi)
            const optionsPart = block.split(/Câu hỏi \d+Select one:/)[1].split("Phản hồi")[0];

            // Regex để bắt a., b., c., d.
            // Logic: Tìm chữ cái + dấu chấm, lấy nội dung cho đến khi gặp chữ cái tiếp theo hoặc hết chuỗi
            const optionMatches = [...optionsPart.matchAll(/([a-d])\.\s+([\s\S]*?)(?=(\n[a-d]\.)|$)/g)];

            const options = [];
            optionMatches.forEach((match) => {
                options.push(cleanText(match[2])); // match[2] là nội dung đáp án
            });

            // C. Tách đáp án đúng
            const feedbackPart = block.split("The correct answer is:")[1];
            const correctText = cleanText(feedbackPart);

            // Tìm index của đáp án đúng trong mảng options
            // Vì file text chỉ cho string đáp án (VD: "Nông nghiệp") chứ không cho "d."
            // Nên ta phải so sánh string để tìm ra index (0, 1, 2, 3)
            let correctIndex = -1;
            options.forEach((opt, idx) => {
                // So sánh tương đối (contains) hoặc chính xác
                if (opt === correctText || opt.includes(correctText)) {
                    correctIndex = idx;
                }
            });

            // Chỉ push nếu lấy đủ dữ liệu
            if (questionText && options.length > 0) {
                questions.push({
                    id: index,
                    question: questionText,
                    options: options,
                    correctAnswer: correctIndex, // Lưu index (0=a, 1=b...)
                    correctText: correctText, // Lưu text gốc để debug nếu cần
                });
            }
        } catch (e) {
            console.warn(`Lỗi khi parse câu hỏi thứ ${index}:`, e);
            // Có thể bỏ qua câu lỗi hoặc log ra để sửa file text
        }
    });

    return questions;
}

// --- PHẦN 2: CẤU HÌNH & QUẢN LÝ DỮ LIỆU ---

// 1. Cấu hình danh sách môn và file (Bạn phải tự khai báo đúng tên file trong folder)
const appConfig = {
    ktctMLN: {
        name: "Kinh tế chính trị Mác - Lênin",
        path: "baitap/ktctMLN",
        files: [
            { name: "Chương 1", file: "chuong1.txt" },
            { name: "Chương 2", file: "chuong2.txt" },
            { name: "Chương 3", file: "chuong3.txt" },
            { name: "Chương 4", file: "chuong4.txt" },
            { name: "Chương 5", file: "chuong5.txt" },
            { name: "Chương 6", file: "chuong6.txt" },
        ],
    },
    // Bạn có thể thêm môn khác vào đây theo cấu trúc tương tự
    pldc: {
        name: "Pháp luật đại cương",
        path: "baitap/PLDC",
        files: [
            { name: "Chương 1", file: "chuong1.txt" },
            { name: "Chương 2", file: "chuong2.txt" },
            { name: "Chương 3", file: "chuong3.txt" },
            { name: "Chương 4", file: "chuong4.txt" },
            { name: "Chương 5", file: "chuong5.txt" },
            { name: "Chương 6", file: "chuong6.txt" },
            { name: "Chương 7", file: "chuong7.txt" },
            { name: "Chương 8", file: "chuong8.txt" },
            { name: "Chương 9", file: "chuong9.txt" },
            { name: "Chương 10", file: "chuong10.txt" },
            { name: "Chương 11", file: "chuong11.txt" },
        ],
    },
};

// Biến toàn cục lưu trạng thái
let currentQuestions = []; // Danh sách câu hỏi sau khi lọc/trộn
let currentQuestionIndex = 0;
let userScore = 0;
let userAnswersLog = []; // Lưu lịch sử chọn để review

// DOM Elements
const menuScreen = document.getElementById("menu-screen");
const quizScreen = document.getElementById("quiz-screen");
const resultScreen = document.getElementById("result-screen");
const subjectSelect = document.getElementById("subject-select");
const chapterSelect = document.getElementById("chapter-select");

// --- HÀM KHỞI TẠO MENU ---
function initMenu() {
    setTimeout(() => {
        document.querySelector(".wallpaper").style.opacity = "1";
    }, 500);
    setTimeout(() => {
        document.getElementById("app-window").classList.remove("closing");
    }, 2000);
    // 1. Render danh sách môn
    for (const key in appConfig) {
        const option = document.createElement("option");
        option.value = key;
        option.textContent = appConfig[key].name;
        subjectSelect.appendChild(option);
    }

    // 2. Bắt sự kiện thay đổi môn để load chương
    subjectSelect.addEventListener("change", loadChapters);

    // Load chương cho môn mặc định ban đầu
    loadChapters();
}

function loadChapters() {
    const subjectKey = subjectSelect.value;
    const chapters = appConfig[subjectKey].files;

    chapterSelect.innerHTML = '<option value="all">Ôn tập tất cả các chương</option>';

    chapters.forEach((chap, index) => {
        const option = document.createElement("option");
        option.value = index; // Lưu index trong mảng files
        option.textContent = chap.name;
        chapterSelect.appendChild(option);
    });
}

// --- HÀM XỬ LÝ KHI BẤM BẮT ĐẦU ---
document.getElementById("start-btn").addEventListener("click", async () => {
    const subjectKey = subjectSelect.value;
    const chapterVal = chapterSelect.value;
    const limit = document.querySelector('input[name="limit"]:checked').value;
    const subjectData = appConfig[subjectKey];

    let rawDataList = [];

    try {
        // Logic tải file
        if (chapterVal === "all") {
            // Tải tất cả file của môn đó
            const promises = subjectData.files.map((file) => fetch(`${subjectData.path}/${file.file}`).then((res) => res.text()));
            rawDataList = await Promise.all(promises);
        } else {
            // Tải 1 file cụ thể
            const fileInfo = subjectData.files[chapterVal];
            const response = await fetch(`${subjectData.path}/${fileInfo.file}`);
            const text = await response.text();
            rawDataList = [text];
        }

        // Parse và gộp tất cả câu hỏi
        let allQuestions = [];
        rawDataList.forEach((text) => {
            allQuestions = allQuestions.concat(parseQuestions(text));
        });

        if (allQuestions.length === 0) {
            await macAlert("Không tìm thấy câu hỏi nào! Kiểm tra lại file text.");
            return;
        }

        // Xáo trộn câu hỏi (Shuffle)
        shuffleArray(allQuestions);

        // Cắt số lượng câu hỏi theo yêu cầu
        if (limit !== "all") {
            currentQuestions = allQuestions.slice(0, parseInt(limit));
        } else {
            currentQuestions = allQuestions;
        }

        // Reset trạng thái và chuyển màn hình
        startQuiz();
    } catch (error) {
        console.error(error);
        await macAlert("Lỗi khi tải dữ liệu: " + error.message);
    }
});

// Hàm trộn mảng (Fisher-Yates Shuffle) - Để random câu hỏi
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// Hàm bắt đầu vào màn hình Quiz
function startQuiz() {
    currentQuestionIndex = 0;
    userScore = 0;
    userAnswersLog = [];

    menuScreen.style.display = "none";
    quizScreen.style.display = "block";

    // Cập nhật tổng số câu
    document.getElementById("total-q-num").innerText = currentQuestions.length;

    // Gọi hàm hiển thị câu hỏi đầu tiên (sẽ viết ở bước sau)
    renderQuestion();
}

function renderQuestion() {
    const qData = currentQuestions[currentQuestionIndex];

    // 1. Cập nhật giao diện số câu
    document.getElementById("current-q-num").innerText = currentQuestionIndex + 1;
    document.getElementById("q-text").innerText = qData.question;

    // 2. Xóa các đáp án cũ
    const optionsContainer = document.getElementById("options-container");
    optionsContainer.innerHTML = "";

    // 3. Reset các nút chức năng
    document.getElementById("next-btn").style.display = "none";
    document.getElementById("feedback").innerText = "";

    // 4. Tạo nút bấm cho từng đáp án
    qData.options.forEach((optText, index) => {
        const btn = document.createElement("button");
        btn.className = "option-btn";
        // Thêm A, B, C, D cho đẹp
        const label = String.fromCharCode(65 + index); // 65 là mã ASCII của 'A'
        btn.innerText = `${label}. ${optText}`;

        // Gắn sự kiện click
        btn.onclick = () => checkAnswer(index, btn);

        optionsContainer.appendChild(btn);
    });
}

function checkAnswer(selectedIndex, selectedBtn) {
    const qData = currentQuestions[currentQuestionIndex];
    const optionsContainer = document.getElementById("options-container");
    const allBtns = optionsContainer.querySelectorAll(".option-btn");

    // 1. Vô hiệu hóa tất cả các nút (không cho chọn lại)
    allBtns.forEach((btn) => (btn.disabled = true));

    // 2. Kiểm tra đúng sai
    const isCorrect = selectedIndex === qData.correctAnswer;

    if (isCorrect) {
        // Nếu đúng: Tô xanh nút đã chọn
        selectedBtn.classList.add("correct");
        userScore++;
        document.getElementById("feedback").innerText = "Chính xác! 🎉";
        document.getElementById("feedback").style.color = "green";
    } else {
        // Nếu sai: Tô đỏ nút đã chọn VÀ Tô xanh nút đúng
        selectedBtn.classList.add("wrong");
        allBtns[qData.correctAnswer].classList.add("correct");
        document.getElementById("feedback").innerText = "Sai rồi";
        document.getElementById("feedback").style.color = "red";
    }

    // 3. Lưu log để xem lại (Nếu sai)
    if (!isCorrect) {
        userAnswersLog.push({
            question: qData.question,
            selected: qData.options[selectedIndex],
            correct: qData.options[qData.correctAnswer],
            id: qData.id,
        });
    }

    // 4. Hiện nút Next hoặc Kết thúc
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
}

// --- PHẦN 4: KẾT QUẢ & XEM LẠI ---

function finishQuiz() {
    quizScreen.style.display = "none";
    resultScreen.style.display = "block";

    // 1. Tính toán điểm số
    const total = currentQuestions.length;
    const score10 = (userScore / total) * 10;

    document.getElementById("final-score-10").innerText = score10.toFixed(1).replace(".", ",");

    // 2. Render danh sách câu sai
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
                <p style="color: red">❌ Bạn chọn: ${item.selected}</p>
                <p class="review-correct">✅ Đáp án đúng: ${item.correct}</p>
            `;
            reviewContainer.appendChild(div);
        });
    }

    // 3. (Optional) Gọi hàm lưu lịch sử tại đây nếu muốn
    saveHistory(score10.toFixed(1), userScore, total);
}

// Xử lý nút quay về trang chủ (trong màn hình Quiz)
document.getElementById("back-home-btn").addEventListener("click", async () => {
    const isConfirmed = await macConfirm("Quay lại menu?", "Kết quả ôn tập của bạn sẽ không được lưu lại.");
    if (isConfirmed) {
        location.reload(); // Cách đơn giản nhất để reset app
    }
});

const redBtn = document.getElementById("close-btn");

redBtn.addEventListener("click", () => {
    localStorage.setItem("easter_egg_active", "true");
    document.getElementById("app-window").classList.add("closing");
    setTimeout(() => {
        window.close();
    }, 1000);
});

/**
 * HỆ THỐNG MAC MODAL (Mượt mà hơn với Expo Animation)
 */
function showModal(title, message, isConfirm = false) {
    return new Promise((resolve) => {
        const overlay = document.getElementById("mac-modal-overlay");
        const titleEl = document.getElementById("mac-modal-title");
        const messageEl = document.getElementById("mac-modal-message");
        const okBtn = document.getElementById("mac-modal-ok");
        const cancelBtn = document.getElementById("mac-modal-cancel");

        titleEl.innerText = title;
        messageEl.innerText = message;
        cancelBtn.style.display = isConfirm ? "block" : "none";

        // Show modal with animation
        overlay.style.display = "flex";
        setTimeout(() => overlay.classList.add("active"), 10);

        const cleanup = (result) => {
            // Hiệu ứng Expo khi đóng
            overlay.classList.remove("active");
            overlay.classList.add("closing");

            setTimeout(() => {
                overlay.style.display = "none";
                overlay.classList.remove("closing");
                okBtn.removeEventListener("click", onOk);
                cancelBtn.removeEventListener("click", onCancel);
                resolve(result);
            }, 400); // Đợi animation đóng hoàn tất
        };

        const onOk = () => cleanup(true);
        const onCancel = () => cleanup(false);

        okBtn.addEventListener("click", onOk);
        cancelBtn.addEventListener("click", onCancel);
    });
}

async function macAlert(message) {
    return await showModal("Thông báo", message, false);
}

async function macConfirm(title, message) {
    return await showModal(title, message, true);
}

// --- PHẦN 6: DRAGGABLE WINDOW (PC ONLY) ---
if (window.matchMedia("(min-width: 1024px)").matches) {
    // B. DRAGGABLE WINDOW LOGIC
    const appWindow = document.getElementById("app-window");
    const titleBar = document.querySelector(".title-bar");

    let isDragging = false;
    let startX,
        startY,
        initialTranslateX = 0,
        initialTranslateY = 0;

    // Hàm lấy giá trị translate hiện tại (vì chúng ta dùng transform để di chuyển)
    function getTranslateValues(element) {
        const style = window.getComputedStyle(element);
        const matrix = new WebKitCSSMatrix(style.transform);
        return { x: matrix.m41, y: matrix.m42 };
    }

    titleBar.addEventListener("mousedown", (e) => {
        // Chỉ kéo khi nhấn chuột trái
        if (e.button !== 0) return;

        isDragging = true;

        // Lấy vị trí chuột bắt đầu
        startX = e.clientX;
        startY = e.clientY;

        // Lấy vị trí cửa sổ hiện tại (nếu đã kéo trước đó)
        const currentTransform = getTranslateValues(appWindow);
        initialTranslateX = currentTransform.x;
        initialTranslateY = currentTransform.y;

        // Thêm class để (có thể) thay đổi style khi đang kéo
        appWindow.style.transition = "none"; // Tắt animation để kéo không bị lag
    });

    document.addEventListener("mousemove", (e) => {
        if (!isDragging) return;

        e.preventDefault(); // Ngăn chặn bôi đen text khi kéo

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        // Di chuyển cửa sổ
        appWindow.style.transform = `translate(${initialTranslateX + dx}px, ${initialTranslateY + dy}px)`;
    });

    document.addEventListener("mouseup", () => {
        if (isDragging) {
            isDragging = false;
            appWindow.style.transition = "all 0.3s ease"; // Bật lại animation cho mượt các hiệu ứng khác
        }
    });
}

// --- QUẢN LÝ HÌNH NỀN (LOGIC MỚI) ---
function initWallpaper() {
    // 1. Kiểm tra xem người dùng có vừa bấm nút tắt cửa sổ không
    const isSpecialMode = localStorage.getItem("easter_egg_active");

    if (isSpecialMode === "true") {
        // === CHẾ ĐỘ ĐẶC BIỆT (Chỉ hiện 1 lần) ===
        console.log("⚠️ Special Mode Activated!");

        // Load ảnh đặc biệt (Bạn nhớ kiếm ảnh 'special.jpg' bỏ vào folder wall nhé)
        // Gợi ý: Kiếm ảnh "Blue Screen of Death" hoặc "Broken Screen"
        const specialPath = "wall/wee.jpg";
        document.documentElement.style.setProperty("--bg-wallpaper", `url('${specialPath}')`);

        // QUAN TRỌNG: Xóa ngay dấu hiệu này đi
        // Để lần reload tiếp theo (F5 lần nữa) sẽ quay về bình thường
        localStorage.removeItem("easter_egg_active");
    } else {
        // === CHẾ ĐỘ BÌNH THƯỜNG (Random) ===
        const totalImages = 11; // Số lượng ảnh bạn có
        const randomNum = Math.floor(Math.random() * totalImages) + 1;
        const wallpaperPath = `wall/macos (${randomNum})_output.jpg`;

        document.documentElement.style.setProperty("--bg-wallpaper", `url('${wallpaperPath}')`);
    }
}

// Chạy hàm khởi tạo ngay
initWallpaper();

// Khởi chạy
initMenu();
