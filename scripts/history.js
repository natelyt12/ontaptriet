// QUẢN LÝ LỊCH SỬ

// Tên khóa lưu trong localStorage
const HISTORY_KEY = "ontaptriet_history_v2";

// Hàm lấy lịch sử từ localStorage
function getHistory() {
    const data = localStorage.getItem(HISTORY_KEY);
    return data ? JSON.parse(data) : [];
}

// Hàm lưu lịch sử mới
function saveHistory(score10, correctCount, totalCount, subjectName, chapterName, mistakes) {
    const historyList = getHistory();
    
    // Tạo record mới
    const newRecord = {
        id: Date.now(), // timestamp dùng làm id
        date: new Date().toLocaleString("vi-VN"),
        subject: subjectName,
        chapter: chapterName,
        score: score10,
        correct: correctCount,
        total: totalCount,
        mistakes: mistakes // Mảng lưu các câu sai giống userAnswersLog
    };

    // Thêm vào đầu danh sách
    historyList.unshift(newRecord);

    // Giới hạn tối đa 5 lượt (xóa phần tử cũ nhất ở cuối)
    if (historyList.length > 5) {
        historyList.pop();
    }

    // Lưu lại vào storage
    localStorage.setItem(HISTORY_KEY, JSON.stringify(historyList));
}

// Xử lý nút "Xem lịch sử làm bài"
document.getElementById("history-btn").addEventListener("click", () => {
    // Generate markup luôn mới nhất
    renderHistoryScreen();

    // Check nếu PC thì văng cửa sổ mới, mobile thì dọn dẹp trang chủ
    if (window.matchMedia("(min-width: 1024px)").matches) {
        const container = document.createElement("div");
        container.style.cssText = "padding-top: 5px; height: 100%; display: flex; flex-direction: column;";
        
        const scrollArea = document.createElement("div");
        scrollArea.style.cssText = "flex: 1; overflow-y: auto; padding-right: 5px; margin-bottom: 15px;";
        
        // Clone HTML của lịch sử đang chìm trong DOM
        const historyContentHtml = document.getElementById("history-content").innerHTML;
        scrollArea.innerHTML = historyContentHtml;

        const clearBtnCopy = document.createElement("button");
        clearBtnCopy.className = "mac-btn-secondary clear-history-btn-ui";
        clearBtnCopy.innerHTML = "Xóa toàn bộ lịch sử";
        clearBtnCopy.onclick = () => {
            appConfirm("Bạn có chắc muốn xóa toàn bộ lịch sử ôn tập không?", () => {
                localStorage.removeItem(HISTORY_KEY);
                scrollArea.innerHTML = '<p style="text-align:center; color:gray; font-style:italic">Chưa có lịch sử làm bài nào.</p>';
                clearBtnCopy.style.display = 'none';
                renderHistoryScreen();
            });
        };

        if (getHistory().length === 0) {
            clearBtnCopy.style.display = "none";
        }

        container.appendChild(scrollArea);
        container.appendChild(clearBtnCopy);

        // Sinh Window quản lý Drag & Zoom
        createAppWindow("Lịch sử làm bài", container, 600, 680);
    } else {
        // Mobile UI behavior
        menuScreen.style.display = "none";
        historyScreen.style.display = "block";
    }
});

// Xử lý nút "Quay lại" trong màn hình lịch sử (Mobile)
document.getElementById("history-back-btn").addEventListener("click", () => {
    historyScreen.style.display = "none";
    menuScreen.style.display = "block";
});

// Xử lý nút "Xóa lịch sử" (Mobile/Trang chủ)
document.getElementById("clear-history-btn").addEventListener("click", () => {
    appConfirm("Bạn có chắc muốn xóa toàn bộ lịch sử ôn tập không?", () => {
        localStorage.removeItem(HISTORY_KEY);
        renderHistoryScreen();
    });
});

// Hàm hiển thị danh sách lịch sử
function renderHistoryScreen() {
    const container = document.getElementById("history-content");
    const historyList = getHistory();

    container.innerHTML = "";

    if (historyList.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:gray; font-style:italic">Chưa có lịch sử làm bài nào.</p>';
        document.getElementById("clear-history-btn").style.display = "none";
        return;
    }

    document.getElementById("clear-history-btn").style.display = "block";

    historyList.forEach((record, idx) => {
        const recordDiv = document.createElement("div");
        recordDiv.className = "history-record-card";

        // Phần Header của Record
        const headerHtml = `
            <div class="history-card-header">
                <div>
                    <h4 class="history-card-title">Lần ${historyList.length - idx} - ${record.date}</h4>
                    <p class="history-card-subtitle">${record.subject} | ${record.chapter}</p>
                </div>
                <div style="text-align: right">
                    <span class="history-card-score" style="color: ${record.score >= 5 ? 'var(--correct-text)' : 'var(--wrong-text)'}">${record.score}</span>
                    <p class="history-card-stats">${record.correct}/${record.total} câu</p>
                </div>
            </div>
        `;

        let mistakesHtml = `<details class="history-mistakes-details">`;
        mistakesHtml += `<summary class="history-mistakes-summary">Chi tiết câu sai <span class="summary-hint">(Bấm để xem)</span></summary>`;
        mistakesHtml += `<div class="history-mistakes-content">`;

        if (!record.mistakes || record.mistakes.length === 0) {
            mistakesHtml += `<p style="color: #4ade80; font-size: 13px; text-align: center; margin: 10px 0;">Tất cả đều đúng! 🌟</p>`;
        } else {
            record.mistakes.forEach((mistake, mIdx) => {
                mistakesHtml += `
                    <div class="review-item history-review-item">
                        <p class="history-mistake-q"><strong>Câu sai:</strong> ${mistake.question}</p>
                        <p class="review-wrong">❌ Chọn: ${mistake.selected}</p>
                        <p class="review-correct">✅ Đáp án: ${mistake.correct}</p>
                    </div>
                `;
            });
        }
        
        mistakesHtml += `</div></details>`;

        recordDiv.innerHTML = headerHtml + mistakesHtml;
        container.appendChild(recordDiv);
    });
}
