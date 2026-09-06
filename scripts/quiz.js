// --- LOGIC ĐIỀU KHIỂN & NGHIỆP VỤ BÀI THI (QUIZ LOGIC) ---

/**
 * Tải và chuẩn bị bộ câu hỏi cho bài thi
 * @param {string} subjectKey - Key của môn học trong appConfig ('ktctMLN', 'ktmt',...)
 * @param {string|number} chapterVal - 'all' hoặc index của chương
 * @param {string|number} limit - 'all' hoặc số lượng câu (25, 50,...)
 * @returns {Promise<Array>} - Mảng câu hỏi đã được shuffle và chuẩn bị xong
 */
/**
 * Tải toàn bộ câu hỏi gốc của môn và chương (không xáo trộn)
 */
async function fetchAllSubjectQuestions(subjectKey, chapterVal = "all") {
    const subjectData = appConfig[subjectKey];
    if (!subjectData) {
        throw new Error(`Không tìm thấy cấu hình cho môn: ${subjectKey}`);
    }

    let allQuestions = [];

    if (subjectData.type === "json") {
        // Nạp dữ liệu định dạng JSON
        const fileInfo = subjectData.files[chapterVal === "all" ? 0 : chapterVal] || subjectData.files[0];
        const res = await fetch(`${subjectData.path}/${fileInfo.file}`);
        const jsonData = await res.json();
        allQuestions = parseJsonQuestions(jsonData);
    } else {
        // Nạp dữ liệu định dạng TXT
        let rawTexts = [];
        if (chapterVal === "all") {
            const promises = subjectData.files.map(f => fetch(`${subjectData.path}/${f.file}`).then(r => r.text()));
            rawTexts = await Promise.all(promises);
        } else {
            const fileInfo = subjectData.files[chapterVal];
            const res = await fetch(`${subjectData.path}/${fileInfo.file}`);
            const text = await res.text();
            rawTexts = [text];
        }

        rawTexts.forEach(text => {
            allQuestions = allQuestions.concat(parseQuestions(text));
        });
        allQuestions.forEach((q, idx) => {
            q.id = idx + 1;
        });
    }

    return allQuestions;
}

/**
 * Tải và chuẩn bị bộ câu hỏi cho bài thi
 * @param {string} subjectKey - Key của môn học trong appConfig ('ktctMLN', 'ktmt',...)
 * @param {string|number} chapterVal - 'all' hoặc index của chương
 * @param {string|number} limit - 'all' hoặc số lượng câu (25, 50,...)
 * @param {boolean} isRandom - true: xáo trộn ngẫu nhiên; false: ôn theo dải câu hỏi
 * @param {number} rangeFrom - Câu bắt đầu (1-indexed)
 * @param {number} rangeTo - Câu kết thúc (1-indexed)
 * @returns {Promise<Array>} - Mảng câu hỏi đã sẵn sàng
 */
async function loadQuizQuestions(subjectKey, chapterVal = "all", limit = "all", isRandom = true, rangeFrom = 1, rangeTo = 25) {
    const subjectData = appConfig[subjectKey];
    if (!subjectData) {
        throw new Error(`Không tìm thấy cấu hình cho môn: ${subjectKey}`);
    }

    currentSubjectName = subjectData.name;
    currentChapterName = chapterVal === "all" 
        ? "Tất cả" 
        : (subjectData.files[chapterVal] ? subjectData.files[chapterVal].name : "Tuỳ chọn");

    const allQuestions = await fetchAllSubjectQuestions(subjectKey, chapterVal);

    if (allQuestions.length === 0) {
        throw new Error("Không tìm thấy câu hỏi nào trong dữ liệu!");
    }

    if (isRandom) {
        // Chế độ: Xáo trộn ngẫu nhiên toàn bộ đề
        shuffleArray(allQuestions);
        allQuestions.forEach(q => shuffleQuestionOptions(q));

        if (limit !== "all" && parseInt(limit) > 0) {
            currentQuestions = allQuestions.slice(0, parseInt(limit));
        } else {
            currentQuestions = allQuestions;
        }
    } else {
        // Chế độ: Ôn tập theo phạm vi từ câu ... đến câu ...
        const total = allQuestions.length;
        let from = parseInt(rangeFrom, 10);
        let to = parseInt(rangeTo, 10);

        if (isNaN(from) || from < 1) from = 1;
        if (isNaN(to) || to < 1) to = 1;

        if (from > to) {
            const temp = from;
            from = to;
            to = temp;
        }

        if (from > total) from = total;
        if (to > total) to = total;

        // Trích xuất lát cắt câu hỏi theo đúng thứ tự gốc trong đề cương
        currentQuestions = allQuestions.slice(from - 1, to);

        // Xáo trộn vị trí A/B/C/D của mỗi câu để đảm bảo khách quan
        currentQuestions.forEach(q => shuffleQuestionOptions(q));
    }

    // Reset trạng thái bắt đầu
    currentQuestionIndex = 0;
    userScore = 0;
    userAnswersLog = [];

    return currentQuestions;
}

/**
 * Kiểm tra câu trả lời của người dùng cho câu hiện tại
 * @param {number} selectedIndex - Chỉ số đáp án người dùng chọn (0, 1, 2, 3)
 * @returns {Object} - Kết quả kiểm tra { isCorrect, correctIndex, selectedIndex }
 */
function submitAnswer(selectedIndex) {
    const qData = currentQuestions[currentQuestionIndex];
    if (!qData) {
        throw new Error("Không tìm thấy câu hỏi hiện tại");
    }

    const isCorrect = selectedIndex === qData.correctAnswer;

    if (isCorrect) {
        userScore++;
    } else {
        userAnswersLog.push({
            id: qData.id,
            question: qData.question,
            selected: qData.options[selectedIndex] || "",
            correct: qData.options[qData.correctAnswer] || qData.correctText || "",
        });
    }

    return {
        isCorrect: isCorrect,
        correctIndex: qData.correctAnswer,
        selectedIndex: selectedIndex,
        userScore: userScore,
        totalAnswered: currentQuestionIndex + 1,
        totalQuestions: currentQuestions.length
    };
}

/**
 * Lấy kết quả tổng kết bài thi và tự động lưu lịch sử
 * @returns {Object} - Thông tin kết quả { score10, correctCount, totalCount, mistakes }
 */
function getQuizResult() {
    const total = currentQuestions.length;
    const score10 = total > 0 ? ((userScore / total) * 10).toFixed(1) : "0.0";

    // Lưu vào lịch sử
    if (typeof saveHistory === 'function') {
        saveHistory(score10, userScore, total, currentSubjectName, currentChapterName, userAnswersLog);
    }

    return {
        score10: score10,
        score10Display: score10.replace(".", ","),
        correctCount: userScore,
        totalCount: total,
        mistakes: [...userAnswersLog],
        subjectName: currentSubjectName,
        chapterName: currentChapterName
    };
}

/**
 * Reset hoàn toàn trạng thái bài thi
 */
function resetQuizState() {
    currentQuestions = [];
    currentQuestionIndex = 0;
    userScore = 0;
    userAnswersLog = [];
    currentSubjectName = "";
    currentChapterName = "";
}
