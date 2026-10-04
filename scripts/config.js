// --- CẤU HÌNH & QUẢN LÝ DỮ LIỆU ---

// 0. Phiên bản ứng dụng toàn cục (Global Version Index)
// Chỉ cần đổi số phiên bản tại đây (ví dụ "2.2"), toàn bộ giao diện sẽ tự động cập nhật
const APP_VERSION = "2.7.1";

function getAppVersion() {
    const v = String(APP_VERSION).trim();
    return v.startsWith("v") ? v : `v${v}`;
}

// Tự động đồng bộ số phiên bản vào tất cả các thẻ hiển thị (.brand-version)
function applyAppVersion() {
    const versionStr = getAppVersion();
    document.querySelectorAll(".brand-version, [data-app-version]").forEach(el => {
        el.textContent = versionStr;
    });
}

if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", applyAppVersion);
    } else {
        applyAppVersion();
    }
}

// 1. Cấu hình danh sách môn học và nguồn dữ liệu
const appConfig = {
    ktmt: {
        name: "Kiến trúc máy tính",
        type: "json", // Dạng JSON đã chuẩn hóa
        path: "baitap/ktmt",
        files: [
            { name: "Lý thuyết (209 câu)", file: "de_cuong_ktmt_lythuyet.json" },
            { name: "Tính toán (40 câu)", file: "de_cuong_ktmt_tinhtoan.json" },
        ],
    },

};

// 2. Biến toàn cục lưu trạng thái làm bài
let currentQuestions = [];      // Danh sách câu hỏi của lượt ôn tập
let currentQuestionIndex = 0;   // Vị trí câu hỏi hiện tại
let userScore = 0;              // Số câu trả lời đúng
let userAnswersLog = [];        // Lịch sử chi tiết (câu hỏi, đáp án đã chọn, đáp án đúng)

// 3. Thông tin môn và chương đang được chọn
let currentSubjectName = "";
let currentChapterName = "";
