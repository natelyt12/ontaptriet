document.getElementById("exam-mode-btn").addEventListener("click", () => {
    const subjectKey = subjectSelect.value;
    const chapterVal = chapterSelect.value;
    const limitInput = document.querySelector('input[name="limit"]:checked');
    const limit = limitInput ? limitInput.value : "25";
    const subjectData = appConfig[subjectKey];

    let finalLimit = limit;
    if (limit === "5") {
        finalLimit = "25";
        const radio25 = document.querySelector('input[name="limit"][value="25"]');
        if (radio25) radio25.checked = true;
    } else if (limit === "all") {
        finalLimit = "50";
        const radio50 = document.querySelector('input[name="limit"][value="50"]');
        if (radio50) radio50.checked = true;
    }

    const subjectName = subjectData.name;
    const chapterName = chapterVal === "all" ? "Tất cả các chương" : subjectData.files[chapterVal].name;
    const questionLimitText = finalLimit === "all" ? "Tất cả" : finalLimit;

    const confirmHTML = `
        <div style="padding: 0px 10px 5px; line-height: 1.6;">
            <p style="margin: -5px 0 15px; color: var(--text-main); font-size: 13.5px; font-weight: 500;">Xác nhận cấu hình bài kiểm tra của bạn:</p>
            <div style="background: rgba(255,255,255,0.03); padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; border: 1px solid var(--border-subtle); display: flex; flex-direction: column; gap: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 8px;">
                    <span style="color: var(--text-sub); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap; margin-top: 2px;">Môn học</span>
                    <span style="font-weight: 600; font-size: 13px; text-align: right;">${subjectName}</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 8px;">
                    <span style="color: var(--text-sub); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap; margin-top: 2px;">Chương</span>
                    <span style="font-weight: 600; font-size: 13px; text-align: right;">${chapterName}</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 8px;">
                    <span style="color: var(--text-sub); font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap;">Số lượng câu</span>
                    <span style="font-weight: 600; font-size: 13px; text-align: right;">${questionLimitText}</span>
                </div>
                <div style="margin-top: 5px; padding-top: 5px; display: flex; gap: 8px; align-items: center;">
                    <span style="font-size: 14px;">📝</span>
                    <p style="margin: 0; font-size: 11px; color: var(--text-sub); font-style: italic; line-height: 1.4;">
                        Lưu ý: Chế độ bài kiểm tra sẽ tự động điều chỉnh số câu để tối ưu việc ôn luyện.
                    </p>
                </div>
            </div>
            <div class="modal-buttons" style="border-top: none; padding: 0; gap: 10px; flex-direction: row; display: flex;">
                <button class="mac-btn-secondary small" id="exam-review-btn" style="flex: 1; margin: 0; padding: 8px;">Xem lại</button>
                <button class="mac-btn-primary small" id="exam-start-confirm-btn" style="flex: 1; margin: 0; padding: 8px;">Bắt đầu</button>
            </div>
        </div>
    `;

    const confirmWin = createAppWindow("Xác nhận Bài kiểm tra", confirmHTML, 400, "auto");

    const closeWin = (win) => {
        const target = win || confirmWin;
        const currentTransform = window.getComputedStyle(target).transform;
        const isMobile = window.innerWidth <= 720;
        const outTransform = isMobile ? "scale(0.95)" : `${currentTransform} scale(0.95)`;
        target.animate([
            { transform: isMobile ? "scale(1)" : `${currentTransform} scale(1)`, opacity: 1 },
            { transform: outTransform, opacity: 0 }
        ], { duration: 300, easing: "cubic-bezier(0.23, 1, 0.32, 1)", fill: "forwards" });
        setTimeout(() => target.remove(), 300);
    };

    confirmWin.querySelector("#exam-review-btn").onclick = () => closeWin();

    confirmWin.querySelector("#exam-start-confirm-btn").onclick = (e) => {
        const confirmBtn = e.currentTarget;
        confirmBtn.disabled = true; // Vô hiệu hóa ngay lập tức

        const allWindows = document.querySelectorAll(".mac-window");
        allWindows.forEach(win => {
            const currentTransform = window.getComputedStyle(win).transform;
            const isMobile = window.innerWidth <= 720;
            const outTransform = isMobile ? "scale(0.95)" : `${currentTransform} scale(0.95)`;
            win.animate([
                { transform: isMobile ? "scale(1)" : `${currentTransform} scale(1)`, opacity: 1 },
                { transform: outTransform, opacity: 0 }
            ], { duration: 300, easing: "cubic-bezier(0.23, 1, 0.32, 1)" });
            setTimeout(() => {
                if (win.id === "app-window") {
                    win.style.display = "none";
                    prepareExamData(subjectKey, chapterVal, finalLimit);
                } else {
                    win.remove();
                }
            }, 300);
        });
    };
});

// Biến toàn cục cho chế độ bài kiểm tra
let examQuestions = [];
let examUserAnswers = [];
let examControlWin = null;

async function prepareExamData(subjectKey, chapterVal, limit) {
    const subjectData = appConfig[subjectKey];
    let rawDataList = [];

    try {
        if (chapterVal === "all") {
            const promises = subjectData.files.map(f => fetch(`${subjectData.path}/${f.file}`).then(res => res.text()));
            rawDataList = await Promise.all(promises);
        } else {
            const f = subjectData.files[chapterVal];
            const res = await fetch(`${subjectData.path}/${f.file}`);
            const text = await res.text();
            rawDataList = [text];
        }

        let allQuestionsRaw = [];
        rawDataList.forEach(text => {
            allQuestionsRaw = allQuestionsRaw.concat(parseQuestions(text));
        });

        shuffleArray(allQuestionsRaw);

        // Mix answer options
        allQuestionsRaw.forEach(q => {
            if (q.correctAnswer !== -1) {
                const correctOptText = q.options[q.correctAnswer];
                shuffleArray(q.options);
                q.correctAnswer = q.options.indexOf(correctOptText);
            }
        });

        if (limit !== "all") {
            examQuestions = allQuestionsRaw.slice(0, parseInt(limit));
        } else {
            examQuestions = allQuestionsRaw;
        }

        examUserAnswers = new Array(examQuestions.length).fill(null);

        currentSubjectName = subjectData.name;
        currentChapterName = chapterVal === "all" ? "Tất cả các chương" : subjectData.files[chapterVal].name;

        launchExamMode();
    } catch (e) {
        console.error("Lỗi chuẩn bị dữ liệu thi:", e);
        alert("Không thể tải dữ liệu bài kiểm tra. Vui lòng thử lại.");
        location.reload();
    }
}

function launchExamMode() {
    // 0. Dọn dẹp bản cũ nếu còn tồn tại (Fix bug lặp lại 2-3 lần)
    const existingOverlay = document.getElementById("exam-fullscreen-overlay");
    if (existingOverlay) existingOverlay.remove();

    const examOverlay = document.createElement("div");
    examOverlay.id = "exam-fullscreen-overlay";
    examOverlay.className = "full-screen-exam";

    examOverlay.innerHTML = `
        <div class="exam-grid-container" id="exam-grid-container"></div>
        <div class="exam-content-wrapper fade-in" style="display: none;">
            <div id="exam-questions-list">
                <!-- Các câu hỏi sẽ được render ở đây -->
            </div>
        </div>
    `;

    document.body.appendChild(examOverlay);

    // Zoom in
    requestAnimationFrame(() => {
        examOverlay.classList.add("active");
    });

    setTimeout(() => {
        const contentWrapper = examOverlay.querySelector(".exam-content-wrapper");
        contentWrapper.style.display = "block";

        // Hiện nội dung mượt mà
        requestAnimationFrame(() => {
            contentWrapper.classList.add("show");
        });

        renderExamQuestions();
        createExamControlWindow();
    }, 800);
}

function createExamControlWindow() {
    const controlHTML = `
        <div class="exam-control-body">
            <div class="exam-sidebar-title">Tiến độ</div>
            <div class="exam-status-grid" id="exam-status-grid">
                <!-- Status dots -->
            </div>
            <div class="exam-control-buttons">
                <button class="mac-btn-primary" id="exam-win-submit" style="margin-top: 10px;">Nộp bài</button>
                <button class="mac-btn-secondary small" id="exam-win-exit" style="margin-top: 5px;">Thoát</button>
            </div>
        </div>
    `;

    // Tạo cửa sổ điều khiển bằng function gốc
    examControlWin = createAppWindow("Điều khiển Thi", controlHTML, 200, "auto");
    examControlWin.classList.add("exam-control-window");

    // Chỉnh vị trí sang bên phải màn hình
    if (window.innerWidth > 720) {
        examControlWin.style.left = "100px";
    }

    // Vô hiệu hóa nút đóng (ẩn đi)
    const closeBtn = examControlWin.querySelector(".win-close-btn");
    if (closeBtn) closeBtn.style.display = "none";

    // Re-render status dots vào cửa sổ mới
    renderStatusGrid();

    // Event listeners
    const subBtn = examControlWin.querySelector("#exam-win-submit");
    const exitBtn = examControlWin.querySelector("#exam-win-exit");

    subBtn.onclick = () => {
        subBtn.disabled = true;
        exitBtn.disabled = true;
        submitExam(() => {
            if (examControlWin) {
                subBtn.disabled = false;
                exitBtn.disabled = false;
            }
        });
    };

    exitBtn.onclick = () => {
        appConfirm("Thoát chế độ bài kiểm tra và hủy kết quả?", () => {
            closeExamFullscreen();
        });
    };
}

function renderExamQuestions() {
    const listContainer = document.getElementById("exam-questions-list");
    listContainer.innerHTML = "";

    examQuestions.forEach((q, qIdx) => {
        const qDiv = document.createElement("div");
        qDiv.className = "exam-question-item";
        qDiv.id = `q-item-${qIdx}`;

        qDiv.innerHTML = `
            <div class="exam-q-text">Câu ${qIdx + 1}: ${q.question}</div>
            <div class="exam-options-grid">
                ${q.options.map((opt, oIdx) => `
                    <button class="option-btn" id="opt-${qIdx}-${oIdx}" onclick="selectExamOption(${qIdx}, ${oIdx})">
                        ${String.fromCharCode(65 + oIdx)}. ${opt}
                    </button>
                `).join("")}
            </div>
        `;
        listContainer.appendChild(qDiv);
    });
}

function renderStatusGrid() {
    const grid = document.getElementById("exam-status-grid");
    if (!grid) return;
    grid.innerHTML = "";

    examQuestions.forEach((_, idx) => {
        const dot = document.createElement("div");
        dot.className = `status-dot ${examUserAnswers[idx] !== null ? 'completed' : ''}`;
        dot.id = `status-dot-${idx}`;
        dot.innerText = idx + 1;
        dot.onclick = () => {
            const el = document.getElementById(`q-item-${idx}`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        };
        grid.appendChild(dot);
    });
}

function selectExamOption(qIdx, oIdx) {
    examUserAnswers[qIdx] = oIdx;

    // UI Của câu hỏi
    const qItem = document.getElementById(`q-item-${qIdx}`);
    if (qItem) {
        qItem.querySelectorAll(".option-btn").forEach(b => b.classList.remove("selected"));
        const selectedBtn = document.getElementById(`opt-${qIdx}-${oIdx}`);
        if (selectedBtn) selectedBtn.classList.add("selected");
    }

    // UI của sidebar
    const dot = document.getElementById(`status-dot-${qIdx}`);
    if (dot) dot.classList.add("completed");
}

function submitExam(onCancel) {
    const unselected = examUserAnswers.filter(a => a === null).length;
    let confirmMsg = "Bạn có chắc chắn muốn nộp bài?";
    if (unselected > 0) {
        confirmMsg = `Bạn còn ${unselected} câu chưa làm. Vẫn muốn nộp bài chứ?`;
    }

    appConfirm(confirmMsg, () => {
        const gridContainer = document.getElementById("exam-grid-container");
        const listContainer = document.getElementById("exam-questions-list");
        const items = listContainer.querySelectorAll(".exam-question-item");
        const overlay = document.getElementById("exam-fullscreen-overlay");
        if (!items.length || !gridContainer) return;

        // 0. Đóng cửa sổ điều khiển và tất cả các cửa sổ phụ khác ngay lập tức
        const allWin = document.querySelectorAll(".mac-window");
        allWin.forEach(win => {
            const closeBtn = win.querySelector(".win-close-btn");
            if (closeBtn) closeBtn.click();
            else win.remove();
        });
        examControlWin = null;

        // 1. Nhảy thẳng lên đầu
        overlay.scrollTo({ top: 0, behavior: "auto" });

        // 2. Tính toán cấu hình linh hoạt theo số câu
        const total = items.length;
        // 25 câu -> 5 cột, 50 câu -> 7 cột
        const numCols = total > 35 ? 7 : (total > 5 ? 5 : 2);
        const gap = 8;

        gridContainer.innerHTML = "";
        gridContainer.classList.add("visible");

        const columns = [];
        for (let i = 0; i < numCols; i++) {
            const col = document.createElement("div");
            col.className = "exam-grid-column";
            col.style.gap = gap + "px";
            gridContainer.appendChild(col);
            columns.push({ element: col, height: 0 });
        }

        // 3. Tính toán Scale Factor tối ưu để "fit" màn hình
        const gridWidth = gridContainer.offsetWidth;
        const targetColWidth = (gridWidth - (gap * (numCols - 1))) / numCols;
        const originalWidth = items[0].offsetWidth;
        let scaleFactor = targetColWidth / originalWidth;

        // Kiểm tra chiều cao dự kiến, nếu quá dài thì thu nhỏ tiếp
        let totalEstHeight = 0;
        items.forEach(item => totalEstHeight += item.offsetHeight * scaleFactor);
        const avgColHeight = totalEstHeight / numCols;
        const maxHeight = gridContainer.offsetHeight * 0.9; // Giới hạn 90% chiều cao grid

        if (avgColHeight > maxHeight) {
            scaleFactor *= (maxHeight / avgColHeight); // Thu nhỏ thêm để vừa chiều dọc
        }

        // 4. Xây dựng Grid Placeholders
        items.forEach((item, index) => {
            const shortestCol = columns.reduce((min, col) => col.height < min.height ? col : min, columns[0]);
            const slot = document.createElement("div");
            slot.className = "exam-slot-placeholder";
            slot.id = `slot-${index}`;

            // Tạm thời set chiều cao ước lượng, sẽ fix chính xác sau khi đo thực tế
            const tempHeight = item.offsetHeight * scaleFactor;
            slot.style.height = `${tempHeight}px`;

            shortestCol.element.appendChild(slot);
            shortestCol.height += tempHeight + gap;
        });

        // 5. Tính toán chính xác tuyệt đối sau khi Render (Fix lỗi thừa width)
        requestAnimationFrame(() => {
            setTimeout(() => {
                const firstSlot = document.getElementById("slot-0");
                if (!firstSlot) return;

                const realSlotWidth = firstSlot.getBoundingClientRect().width;
                const accurateScale = realSlotWidth / items[0].offsetWidth;

                items.forEach((item, idx) => {
                    const slot = document.getElementById(`slot-${idx}`);
                    if (!slot) return;

                    const itemRect = item.getBoundingClientRect();
                    const slotRect = slot.getBoundingClientRect();

                    slot.style.height = (item.offsetHeight * accurateScale) + "px";

                    const deltaX = slotRect.left - itemRect.left;
                    const deltaY = slotRect.top - itemRect.top;

                    setTimeout(() => {
                        item.style.zIndex = (1000 + idx).toString();
                        item.style.transition = "all 1.6s cubic-bezier(0.65, 0, 0.35, 1)";
                        item.style.transformOrigin = "top left";
                        item.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(${accurateScale})`;
                        item.style.pointerEvents = "none";
                        item.style.background = "rgba(255, 255, 255, 0.05)";
                    }, idx * 15);
                });

                // 6. BÙM! Sau 1s cất cánh xong thì hiện kết quả (Lần này chuẩn màu Mac)
                const totalFlightTime = (items.length * 15) + 1600 + 1000;
                setTimeout(() => {
                    items.forEach((item, idx) => {
                        const qData = examQuestions[idx];
                        const userAns = examUserAnswers[idx];
                        const correctAns = qData.correctAnswer;

                        const allBtns = item.querySelectorAll(".option-btn");

                        allBtns.forEach((btn, bIdx) => {
                            // Gỡ bỏ màu vàng của trạng thái đang chọn
                            btn.classList.remove("selected");

                            if (bIdx === correctAns) {
                                // Nếu là đáp án đúng -> Xanh
                                btn.classList.add("correct");
                            } else if (bIdx === userAns) {
                                // Nếu người dùng chọn sai -> Đỏ
                                btn.classList.add("wrong");
                            }
                        });

                        // Hiệu ứng hiện kết quả mượt mà cho toàn bộ ô Pinterest
                        item.style.transition = "all 0.6s ease";
                        if (userAns !== null && userAns === correctAns) {
                            // ĐÚNG: Xanh lá mờ
                            item.style.background = "rgba(48, 209, 88, 0.15)";
                            item.style.borderColor = "rgba(48, 209, 88, 0.4)";
                        } else {
                            // SAI HOẶC CHƯA CHỌN: Đỏ mờ
                            item.style.background = "rgba(255, 69, 58, 0.15)";
                            item.style.borderColor = "rgba(255, 69, 58, 0.4)";
                        }

                        // 7. Sau đó 1s mới mờ nội dung đi (Hiệu ứng Heatmap)
                        setTimeout(() => {
                            const qText = item.querySelector(".exam-q-text");
                            const qOptions = item.querySelector(".exam-options-grid");
                            if (qText) {
                                qText.style.transition = "opacity 0.8s ease";
                                qText.style.opacity = "0";
                            }
                            if (qOptions) {
                                qOptions.style.transition = "opacity 0.8s ease";
                                qOptions.style.opacity = "0";
                            }
                        }, 1800);
                    });

                    const heatmapDoneTime = 1000 + 800 + 1800;
                    setTimeout(() => {
                        calculateExamResults();
                    }, heatmapDoneTime);
                }, totalFlightTime);
            }, 100);
        });
    }, onCancel);
}

function calculateExamResults() {
    currentQuestions = examQuestions;
    userScore = 0;
    userAnswersLog = [];

    examQuestions.forEach((q, idx) => {
        const userChoice = examUserAnswers[idx];
        if (userChoice === q.correctAnswer) {
            userScore++;
        } else {
            userAnswersLog.push({
                question: q.question,
                selected: userChoice !== null ? q.options[userChoice] : "Chưa trả lời",
                correct: q.options[q.correctAnswer]
            });
        }
    });

    // Tính điểm hệ 10
    const finalGrade = (userScore / examQuestions.length) * 10;

    // Chạy hiệu ứng số điểm trước khi thoát
    showAnimatedScore(finalGrade, () => {
        closeExamFullscreen(false);
    });
}

function showAnimatedScore(finalScore, callback) {
    const overlay = document.createElement("div");
    overlay.className = "score-anim-overlay";
    overlay.style.zIndex = "999999";
    overlay.innerHTML = `
        <div class="score-impact-card">
            <div class="score-subtitle">Điểm của bạn</div>
            <h1 class="score-num-big" id="score-counter">0</h1>
        </div>
        <div class="score-review-list" id="score-review-list"></div>
        <div class="score-footer" id="score-footer">
            <button class="mac-btn-primary" id="score-finish-btn" style="border-radius: 25px; font-weight: 600;">Quay lại Trang chủ</button>
        </div>
    `;
    document.body.appendChild(overlay);

    const finishBtn = overlay.querySelector("#score-finish-btn");
    finishBtn.onclick = () => {
        overlay.style.opacity = "0";
        setTimeout(() => {
            overlay.remove();
            if (callback) callback();
        }, 500);
    };

    // Vô hiệu hóa/Xóa bảng điều khiển thi ngay lập tức khi hiện điểm
    if (examControlWin) {
        examControlWin.remove();
        examControlWin = null;
    }

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            overlay.classList.add("active");
            const card = overlay.querySelector(".score-impact-card");
            if (!card) return;

            // 1. Bay từ dưới lên trung tâm (Expo Out)
            setTimeout(() => {
                card.classList.add("centered");
            }, 50);

            // 2. Chạy số từ 0 lên
            setTimeout(() => {
                const counterEl = document.getElementById("score-counter");
                if (!counterEl) return;

                const duration = 1000; // 1 giây chạy số
                const startTime = performance.now();

                function animateNumber(now) {
                    const elapsed = now - startTime;
                    const progress = Math.min(elapsed / duration, 1);

                    const easeProgress = 1 - Math.pow(1 - progress, 3);
                    const current = easeProgress * finalScore;

                    counterEl.innerText = finalScore % 1 === 0 ? Math.round(current) : current.toFixed(1);

                    if (progress < 1) {
                        requestAnimationFrame(animateNumber);
                    } else {
                        // 3. Zoom nhỏ lại tạo cảm giác đập xuống (Slam)
                        setTimeout(() => {
                            card.classList.add("slammed");

                            // 4. Move to Top
                            setTimeout(() => {
                                card.classList.add("to-top");

                                // 5. Lần lượt hiện các câu sai (Review Phase trên overlay)
                                setTimeout(() => {
                                    revealIncorrectQuestionsOnOverlay();

                                    // 6. Hiện nút Thoát
                                    setTimeout(() => {
                                        document.getElementById("score-footer").classList.add("visible");
                                    }, 1000);
                                }, 600);
                            }, 800);
                        }, 400);
                    }
                }
                requestAnimationFrame(animateNumber);
            }, 1000);
        });
    });
}

function revealIncorrectQuestionsOnOverlay() {
    const list = document.getElementById("score-review-list");
    if (!list) return;
    list.classList.add("visible");

    // Lấy dữ liệu từ userAnswersLog đã được tính toán ở calculateExamResults
    userAnswersLog.forEach((item, idx) => {
        setTimeout(() => {
            const card = document.createElement("div");
            card.className = "score-review-card";
            card.innerHTML = `
                <div class="score-review-q">${idx + 1}. ${item.question}</div>
                <div class="score-review-ans yours"><b>Bạn chọn:</b> ${item.selected}</div>
                <div class="score-review-ans correct"><b>Đáp án đúng:</b> ${item.correct}</div>
            `;
            list.appendChild(card);
        }, idx * 150);
    });
}

function closeExamFullscreen(showResult = false) {
    const examOverlay = document.getElementById("exam-fullscreen-overlay");
    const appWin = document.getElementById("app-window");
    const quizScreenElement = document.getElementById("quiz-screen");
    const menuScreen = document.getElementById("menu-screen");

    // Đóng cửa sổ điều khiển
    if (examControlWin) {
        examControlWin.remove();
        examControlWin = null;
    }

    examOverlay.classList.remove("active");

    setTimeout(() => {
        const quizContainer = document.querySelector("#app-window .window-content");
        if (quizContainer && quizScreenElement) {
            quizContainer.appendChild(quizScreenElement);
        }

        quizScreenElement.style.display = "none";

        if (showResult) {
            finishQuiz();
            appWin.style.display = "flex";
        } else {
            menuScreen.style.display = "block";
            const titleEl = document.querySelector(".window-title");
            if (titleEl) titleEl.innerText = "App này dùng để qua môn";
            appWin.style.display = "flex";
        }

        const currentTransform = window.getComputedStyle(appWin).transform;
        const anim = appWin.animate([
            { transform: `${currentTransform} scale(0.95)`, opacity: 0 },
            { transform: `${currentTransform} scale(1)`, opacity: 1 }
        ], { duration: 300, easing: "cubic-bezier(0.23, 1, 0.32, 1)" });

        anim.onfinish = () => {
            appWin.style.opacity = "1";
            appWin.style.transform = "none";
        };

        examOverlay.remove();
    }, 800);
}
