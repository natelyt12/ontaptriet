// 1. Hàm làm sạch text (xóa khoảng trắng thừa, xuống dòng thừa)
function cleanText(str) {
    return str ? str.trim().replace(/\s+/g, " ") : "";
}

// 2. Hàm chính: Parse text thô thành mảng câu hỏi
function parseQuestions(rawText) {
    const questions = [];

    // Tách các câu hỏi dựa trên pattern bắt đầu chung
    const rawBlocks = rawText.split(/Câu hỏi \d+\r?\nKhông trả lời/);

    rawBlocks.forEach((block, index) => {
        if (!block.trim()) return;

        try {
            // A. Tách nội dung câu hỏi
            const questionPart = block.split("Đoạn văn câu hỏi")[1].split(/Câu hỏi \d+Select one:/)[0];
            const questionText = cleanText(questionPart);

            // B. Tách các đáp án 
            const optionsPart = block.split(/Câu hỏi \d+Select one:/)[1].split("Phản hồi")[0];
            const optionMatches = [...optionsPart.matchAll(/([a-d])\.\s+([\s\S]*?)(?=(\n[a-d]\.)|$)/g)];

            const options = [];
            optionMatches.forEach((match) => {
                options.push(cleanText(match[2])); 
            });

            // C. Tách đáp án đúng
            const feedbackPart = block.split("The correct answer is:")[1];
            const correctText = cleanText(feedbackPart);

            let correctIndex = -1;
            options.forEach((opt, idx) => {
                if (opt === correctText || opt.includes(correctText)) {
                    correctIndex = idx;
                }
            });

            if (questionText && options.length > 0) {
                questions.push({
                    id: index,
                    question: questionText,
                    options: options,
                    correctAnswer: correctIndex, 
                    correctText: correctText, 
                });
            }
        } catch (e) {
            console.warn(`Lỗi khi parse câu hỏi thứ ${index}:`, e);
        }
    });

    return questions;
}

// Hàm trộn mảng (Fisher-Yates Shuffle) - Để random câu hỏi
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}
