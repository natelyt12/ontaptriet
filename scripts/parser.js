// --- THUẬT TOÁN XỬ LÝ & BÓC TÁCH DỮ LIỆU CÂU HỎI ---

// 1. Hàm làm sạch chuỗi (xóa khoảng trắng thừa, ký tự xuống dòng lộn xộn)
function cleanText(str) {
    return str ? str.trim().replace(/\s+/g, " ") : "";
}

// 2. Parse dữ liệu text thô (Format từ hệ thống web Moodle)
function parseQuestions(rawText) {
    const questions = [];
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

// 3. Chuẩn hóa dữ liệu từ nguồn JSON
function parseJsonQuestions(jsonData) {
    if (!Array.isArray(jsonData)) return [];
    
    return jsonData.map((item, index) => {
        // Hỗ trợ cả 2 dạng options: mảng chuỗi ['A', 'B'] hoặc mảng object [{label, text, isCorrect}]
        let options = [];
        let correctIndex = -1;
        let correctText = item.correctText || "";

        if (Array.isArray(item.options)) {
            if (typeof item.options[0] === 'string') {
                options = item.options;
                correctIndex = item.correctAnswer !== undefined ? item.correctAnswer : -1;
            } else if (typeof item.options[0] === 'object') {
                options = item.options.map((opt, idx) => {
                    if (opt.isCorrect) {
                        correctIndex = idx;
                        correctText = opt.text;
                    }
                    return opt.text;
                });
            }
        }

        return {
            id: item.id !== undefined ? item.id : (index + 1),
            question: item.question,
            options: options,
            correctAnswer: correctIndex,
            correctText: correctText
        };
    });
}

// 4. Hàm trộn mảng (Fisher-Yates Shuffle)
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// 5. Hàm xáo trộn vị trí các đáp án trong câu hỏi nhưng vẫn giữ đúng index đáp án chuẩn
function shuffleQuestionOptions(question) {
    if (question.correctAnswer !== -1 && question.options && question.options.length > 0) {
        const correctOptText = question.options[question.correctAnswer];
        shuffleArray(question.options);
        question.correctAnswer = question.options.indexOf(correctOptText);
    }
}
