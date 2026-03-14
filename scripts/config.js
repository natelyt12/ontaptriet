// --- CẤU HÌNH & QUẢN LÝ DỮ LIỆU ---
const APP_VERSION = "1.5";

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
};

// Biến toàn cục lưu trạng thái
let currentQuestions = []; // Danh sách câu hỏi sau khi lọc/trộn
let currentQuestionIndex = 0;
let userScore = 0;
let userAnswersLog = []; // Lưu lịch sử chọn để review

// Thông tin môn bộ được chọn lúc làm
let currentSubjectName = "";
let currentChapterName = "";
let currentFocusedOptionIndex = -1; // Chỉ mục câu hỏi đang được tập trung (phím mũi tên)

// DOM Elements toàn cục
const menuScreen = document.getElementById("menu-screen");
const quizScreen = document.getElementById("quiz-screen");
const resultScreen = document.getElementById("result-screen");
const historyScreen = document.getElementById("history-screen");
const subjectSelect = document.getElementById("subject-select");
const chapterSelect = document.getElementById("chapter-select");
