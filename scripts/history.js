// --- QUẢN LÝ LỊCH SỬ ÔN TẬP (LOCAL STORAGE) ---

const HISTORY_KEY = "ontaptriet_history_v2";

// 1. Lấy danh sách lịch sử từ localStorage
function getHistory() {
    try {
        const data = localStorage.getItem(HISTORY_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error("Lỗi đọc lịch sử từ storage:", e);
        return [];
    }
}

// 2. Lưu lượt làm bài mới
function saveHistory(score10, correctCount, totalCount, subjectName, chapterName, mistakes) {
    try {
        const historyList = getHistory();
        
        const newRecord = {
            id: Date.now(),
            date: new Date().toLocaleString("vi-VN"),
            subject: subjectName,
            chapter: chapterName,
            score: score10,
            correct: correctCount,
            total: totalCount,
            mistakes: mistakes || [] // Danh sách câu sai: [{ question, selected, correct, id }]
        };

        // Thêm vào đầu danh sách
        historyList.unshift(newRecord);

        // Giới hạn tối đa 10 lượt làm gần nhất
        if (historyList.length > 10) {
            historyList.splice(10);
        }

        localStorage.setItem(HISTORY_KEY, JSON.stringify(historyList));
        return newRecord;
    } catch (e) {
        console.error("Lỗi lưu lịch sử vào storage:", e);
    }
}

// 3. Xóa toàn bộ lịch sử
function clearHistory() {
    try {
        localStorage.removeItem(HISTORY_KEY);
        return true;
    } catch (e) {
        console.error("Lỗi xóa lịch sử:", e);
        return false;
    }
}
