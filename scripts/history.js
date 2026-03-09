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

    // Giới hạn tối đa 3 lượt (xóa phần tử cũ nhất ở cuối)
    if (historyList.length > 3) {
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
        clearBtnCopy.className = "mac-btn-secondary";
        clearBtnCopy.style.cssText = "width: 100%; color: #fff; border-color: rgba(255, 255, 255, 0.2); margin-top: auto;";
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
        recordDiv.style.cssText = "background: rgba(255,255,255,0.05); padding: 15px; border-radius: 12px; margin-bottom: 20px; border: 1px solid rgba(255,255,255,0.1);";

        // Phần Header của Record
        const headerHtml = `
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px;">
                <div>
                    <h4 style="margin: 0; color: #fff; font-size: 16px;">Lần ${historyList.length - idx} - ${record.date}</h4>
                    <p style="margin: 4px 0 0 0; font-size: 13px; color: rgba(255,255,255,0.7)">${record.subject} | ${record.chapter}</p>
                </div>
                <div style="text-align: right">
                    <span style="font-size: 20px; font-weight: bold; color: ${record.score >= 5 ? '#4ade80' : '#f87171'}">${record.score}</span>
                    <p style="margin: 0; font-size: 12px; color: gray">${record.correct}/${record.total} câu</p>
                </div>
            </div>
        `;

        let mistakesHtml = `<details style="margin-bottom: 10px; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.05);">`;
        mistakesHtml += `<summary style="padding: 12px; font-size: 14px; font-weight: bold; cursor: pointer; user-select: none; outline: none; display: flex; flex-direction: row-reverse; justify-content: space-between; align-items: center; color: rgba(255,255,255,0.8);">Chi tiết câu sai <span style="font-size: 10px; color: gray;">(Bấm để xem)</span></summary>`;
        mistakesHtml += `<div style="padding: 0 12px 12px 12px; border-top: 1px solid rgba(255,255,255,0.05); margin-top: 5px;">`;

        if (!record.mistakes || record.mistakes.length === 0) {
            mistakesHtml += `<p style="color: #4ade80; font-size: 13px; text-align: center; margin: 10px 0;">Tất cả đều đúng! 🌟</p>`;
        } else {
            record.mistakes.forEach((mistake, mIdx) => {
                mistakesHtml += `
                    <div class="review-item" style="margin-bottom: 10px; padding: 12px; background: rgba(255,255,255,0.02); border-left: 4px solid rgba(255,255,255,0.1);">
                        <p style="margin: 0 0 8px; font-size: 13.5px; line-height: 1.4;"><strong>Câu sai:</strong> ${mistake.question}</p>
                        <p style="margin: 0 0 5px; font-size: 13px; color: #f87171">❌ Chọn: ${mistake.selected}</p>
                        <p style="margin: 0; font-size: 13px; color: #4ade80">✅ Đáp án: ${mistake.correct}</p>
                    </div>
                `;
            });
        }
        
        mistakesHtml += `</div></details>`;

        recordDiv.innerHTML = headerHtml + mistakesHtml;
        container.appendChild(recordDiv);
    });
}
