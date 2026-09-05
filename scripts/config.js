// --- CẤU HÌNH & QUẢN LÝ DỮ LIỆU ---

// 1. Cấu hình danh sách môn học và nguồn dữ liệu
const appConfig = {
    ktmt: {
        name: "Kiến trúc máy tính",
        type: "json", // Dạng JSON đã chuẩn hóa
        path: "baitap/ktmt",
        files: [
            { name: "Đề cương ôn tập (249 câu)", file: "de_cuong_ktmt.json" },
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
